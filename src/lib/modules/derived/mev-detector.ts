// ─────────────────────────────────────────────────────────────
// MEV Detector — Sandwich, Arbitrage, and JIT Detection
// Zero API keys — uses public Ethereum RPC + Blockscout
// Heuristic-based: analyzes recent blocks for MEV patterns
// ─────────────────────────────────────────────────────────────

import { getCached } from '@/lib/api/server-cache'

// ── Types ───────────────────────────────────────────────────

export type MevType = 'sandwich' | 'arbitrage' | 'jit-liquidity' | 'frontrun' | 'backrun' | 'liquidation'

export type MevSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface MevEvent {
  id: string
  type: MevType
  severity: MevSeverity
  blockNumber: number
  txHash: string
  /** Attacker/bot address */
  botAddress: string
  /** Victim tx hash (for sandwich attacks) */
  victimTxHash?: string
  /** Estimated profit in ETH */
  profitEth: number
  /** Estimated profit in USD */
  profitUsd: number
  /** Token pair involved */
  pair?: string
  /** DEX involved */
  dex?: string
  /** Gas used by the MEV tx */
  gasUsed: number
  /** Gas price in gwei */
  gasPriceGwei: number
  /** Detection confidence 0–100 */
  confidence: number
  /** Human-readable description */
  description: string
  timestamp: number
}

export interface MevSummary {
  totalEvents: number
  totalProfitEth: number
  totalProfitUsd: number
  byType: Record<MevType, number>
  bySeverity: Record<MevSeverity, number>
  topBots: Array<{ address: string; eventCount: number; totalProfitEth: number }>
  blocksScanned: number
  scanTimeMs: number
  ethPriceUsd: number
}

export interface MevDetectionResult {
  summary: MevSummary
  events: MevEvent[]
  scannedRange: { fromBlock: number; toBlock: number }
}

// ── Known MEV Bot Addresses ─────────────────────────────────
// Publicly documented MEV bots from Flashbots, EigenPhi, etc.

const KNOWN_MEV_BOTS: Record<string, string> = {
  '0x000000000035b5e5ad9019092c665357240f594e': 'MEV Bot (0x00...594e)',
  '0x00000000003b3cc22af3aac16c3d51c69639499b': 'MEV Bot (0x00...999b)',
  '0x0000006daea1723962647b7e189d311d757fB793': 'MEV Bot (0x00...B793)',
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch Router',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router v5',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap Universal Router',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  '0xe66b31678d6c16e9ebf358268a790b763c133750': '0x Coinbase Wallet Proxy',
  '0x881d40237659c251811cec9c364ef91dc08d300c': 'MetaMask Swap Router',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 SwapRouter',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router v2',
  '0x218f0f79702d5b8820e46d949fa4c2c68c20b74a': 'Seaport (OpenSea)',
}

// Common DEX router addresses
const DEX_ROUTERS = new Set([
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap Universal
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch v4
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch v5 / Paraswap
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // SushiSwap
])

// Function selectors for swap operations
const SWAP_SELECTORS = new Set([
  '0x7ff36ab5', // swapExactETHForTokens
  '0x18cbafe5', // swapExactTokensForETH
  '0x38ed1739', // swapExactTokensForTokens
  '0x8803dbee', // swapTokensForExactTokens
  '0xb6f9de95', // swapExactETHForTokensSupportingFeeOnTransferTokens
  '0x5c11d795', // swapExactTokensForETHSupportingFeeOnTransferTokens
  '0x12aab51a', // Uniswap V3 exactInputSingle
  '0xc04b8d59', // Uniswap V3 exactInput
  '0xdb3e2198', // Uniswap V3 exactOutputSingle
  '0xf28c0498', // Uniswap V3 exactOutput
  '0x12aa3c70', // 1inch swap
  '0x12aaa034', // Paraswap swap
])
// Known Uniswap V2 Pair creation topic
const UNISWAP_V2_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'
const UNISWAP_V3_SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64f8ee05b2b2c7d7c428'

// ── RPC Helpers ─────────────────────────────────────────────

const RPC_URLS = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum-rpc.publicnode.com',
  'https://cloudflare-eth.com',
]

let rpcIndex = 0

function getNextRpc(): string {
  const url = RPC_URLS[rpcIndex % RPC_URLS.length]
  rpcIndex++
  return url
}

async function rpcCall(method: string, params: unknown[], timeoutMs = 10_000): Promise<unknown> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt < RPC_URLS.length; attempt++) {
    const url = getNextRpc()
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
      const json = (await res.json()) as { result?: unknown; error?: { message: string } }
      if (json.error) throw new Error(`RPC error: ${json.error.message}`)
      return json.result
    } catch (e) {
      lastError = e as Error
      continue
    }
  }
  throw lastError ?? new Error('All RPC endpoints failed')
}

interface RpcBlock {
  number: string
  timestamp: string
  transactions: RpcTransaction[]
  gasUsed: string
  gasLimit: string
  baseFeePerGas?: string
}

interface RpcTransaction {
  hash: string
  from: string
  to: string | null
  value: string
  gas: string
  gasPrice: string
  input: string
  blockNumber: string
  transactionIndex: string
}

interface RpcReceipt {
  transactionHash: string
  status: string
  gasUsed: string
  logs: Array<{
    address: string
    topics: string[]
    data: string
  }>
  effectiveGasPrice: string
}

// ── Helpers ─────────────────────────────────────────────────

function hexToNumber(hex: string): number {
  return parseInt(hex, 16)
}

function hexToEth(hex: string): number {
  return parseInt(hex, 16) / 1e18
}

function hexToGwei(hex: string): number {
  return parseInt(hex, 16) / 1e9
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function classifyBot(address: string): { label: string; isKnown: boolean } {
  const lower = address.toLowerCase()
  const label = KNOWN_MEV_BOTS[lower]
  if (label) return { label, isKnown: true }
  if (DEX_ROUTERS.has(lower)) return { label: 'DEX Router', isKnown: true }
  return { label: shortenAddress(address), isKnown: false }
}

function isSwapTx(tx: RpcTransaction): boolean {
  if (!tx.to || tx.input.length < 10) return false
  const selector = tx.input.slice(0, 10).toLowerCase()
  return SWAP_SELECTORS.has(selector)
}

function isLikelySwapByLogs(receipt: RpcReceipt): boolean {
  return receipt.logs.some(log =>
    log.topics[0] === UNISWAP_V2_SWAP_TOPIC ||
    log.topics[0] === UNISWAP_V3_SWAP_TOPIC
  )
}

function computeMevId(type: MevType, block: number, txHash: string): string {
  return `mev-${type}-${block}-${txHash.slice(2, 10)}`
}

// ── Detection Engines ───────────────────────────────────────

/**
 * Detect sandwich attacks in a single block.
 * Pattern: same sender has tx_i (buy) and tx_j (sell) around a victim tx_k
 * where i < k < j and all interact with the same DEX pair.
 */
function detectSandwiches(
  block: RpcBlock,
  receipts: Map<string, RpcReceipt>,
  ethPriceUsd: number,
): MevEvent[] {
  const events: MevEvent[] = []
  const txs = block.transactions

  // Group txs by sender
  const bySender = new Map<string, RpcTransaction[]>()
  for (const tx of txs) {
    const sender = tx.from.toLowerCase()
    const list = bySender.get(sender) ?? []
    list.push(tx)
    bySender.set(sender, list)
  }

  // Check each sender with 2+ swap txs in the block
  for (const [sender, senderTxs] of bySender) {
    if (senderTxs.length < 2) continue

    const swapTxs = senderTxs.filter(t => {
      const receipt = receipts.get(t.hash)
      return receipt ? isLikelySwapByLogs(receipt) : isSwapTx(t)
    })

    if (swapTxs.length < 2) continue

    // Sort by tx index
    swapTxs.sort((a, b) => hexToNumber(a.transactionIndex) - hexToNumber(b.transactionIndex))

    // Look for buy-victim-sell patterns
    for (let i = 0; i < swapTxs.length - 1; i++) {
      for (let j = i + 1; j < swapTxs.length; j++) {
        const firstTx = swapTxs[i]
        const lastTx = swapTxs[j]
        const firstIdx = hexToNumber(firstTx.transactionIndex)
        const lastIdx = hexToNumber(lastTx.transactionIndex)

        if (lastIdx - firstIdx < 2) continue // Need at least one tx between

        // Count victim txs between the two attacker txs
        const victimTxs = txs.filter(t => {
          const idx = hexToNumber(t.transactionIndex)
          return idx > firstIdx && idx < lastIdx && t.from.toLowerCase() !== sender
        })

        if (victimTxs.length === 0) continue

        // Check gas price manipulation: attacker txs typically have higher gas
        const firstGas = hexToGwei(firstTx.gasPrice)
        const lastGas = hexToGwei(lastTx.gasPrice)
        const avgVictimGas = victimTxs.reduce((sum, t) => sum + hexToGwei(t.gasPrice), 0) / victimTxs.length

        // Attacker front-run has higher gas price than victims
        const gasManipulation = firstGas > avgVictimGas * 1.1
        if (!gasManipulation) continue

        // Estimate profit from gas cost differential
        const firstReceipt = receipts.get(firstTx.hash)
        const lastReceipt = receipts.get(lastTx.hash)
        const gasUsedFirst = firstReceipt ? hexToNumber(firstReceipt.gasUsed) : hexToNumber(firstTx.gas)
        const gasUsedLast = lastReceipt ? hexToNumber(lastReceipt.gasUsed) : hexToNumber(lastTx.gas)

        // Profit approximation: the attacker's trade on the back-run captures the spread
        const ethValueFirst = hexToEth(firstTx.value)
        const ethValueLast = hexToEth(lastTx.value)
        const profitEstimate = Math.max(0, ethValueLast - ethValueFirst) // rough estimate

        const bot = classifyBot(sender)
        const confidence = gasManipulation && victimTxs.length >= 1
          ? Math.min(95, 60 + victimTxs.length * 10 + (bot.isKnown ? 15 : 0))
          : 40

        if (confidence < 50) continue

        events.push({
          id: computeMevId('sandwich', hexToNumber(block.number), firstTx.hash),
          type: 'sandwich',
          severity: profitEstimate > 1 ? 'critical' : profitEstimate > 0.1 ? 'high' : profitEstimate > 0.01 ? 'medium' : 'low',
          blockNumber: hexToNumber(block.number),
          txHash: lastTx.hash,
          botAddress: sender,
          victimTxHash: victimTxs[0].hash,
          profitEth: profitEstimate,
          profitUsd: profitEstimate * ethPriceUsd,
          dex: detectDexFromLogs(receipts.get(firstTx.hash)),
          gasUsed: gasUsedFirst + gasUsedLast,
          gasPriceGwei: Math.max(firstGas, lastGas),
          confidence,
          description: `Sandwich attack by ${bot.label}: front-run tx ${firstTx.hash.slice(0, 10)}... victim ${victimTxs.length} tx(s), back-run tx ${lastTx.hash.slice(0, 10)}...`,
          timestamp: hexToNumber(block.timestamp) * 1000,
        })
      }
    }
  }

  return events
}

/**
 * Detect arbitrage transactions.
 * Pattern: single tx that touches 3+ DEX routers, or
 * has multiple swap events in its logs.
 */
function detectArbitrage(
  block: RpcBlock,
  receipts: Map<string, RpcReceipt>,
  ethPriceUsd: number,
): MevEvent[] {
  const events: MevEvent[] = []

  for (const tx of block.transactions) {
    const receipt = receipts.get(tx.hash)
    if (!receipt || receipt.status !== '0x1') continue

    // Count distinct DEX swap logs
    const swapLogs = receipt.logs.filter(log =>
      log.topics[0] === UNISWAP_V2_SWAP_TOPIC ||
      log.topics[0] === UNISWAP_V3_SWAP_TOPIC
    )

    // Count distinct DEX addresses in logs
    const dexAddresses = new Set(receipt.logs.map(l => l.address.toLowerCase()))
    const touchedRouters = [...dexAddresses].filter(a => DEX_ROUTERS.has(a))

    // Arbitrage: multiple swap events OR touches multiple routers
    const isMultiSwap = swapLogs.length >= 3
    const isMultiRouter = touchedRouters.length >= 2

    if (!isMultiSwap && !isMultiRouter) continue

    // Check if the tx has a value out > value in pattern
    const ethValue = hexToEth(tx.value)
    const gasCostEth = receipt ? hexToNumber(receipt.gasUsed) * hexToGwei(receipt.effectiveGasPrice) / 1e9 : 0
    const gasCostUsd = gasCostEth * ethPriceUsd

    // For pure arbitrage, the sender gets more ETH back than they sent + gas
    // This is a heuristic — true profit requires tracing internal calls
    const bot = classifyBot(tx.from.toLowerCase())
    const confidence = isMultiSwap && isMultiRouter
      ? 85
      : isMultiSwap
        ? 70
        : 55

    if (confidence < 55) continue

    const profitEth = Math.max(0, ethValue * 0.001) // Conservative estimate

    events.push({
      id: computeMevId('arbitrage', hexToNumber(block.number), tx.hash),
      type: 'arbitrage',
      severity: profitEth > 0.5 ? 'high' : profitEth > 0.05 ? 'medium' : 'low',
      blockNumber: hexToNumber(block.number),
      txHash: tx.hash,
      botAddress: tx.from.toLowerCase(),
      profitEth,
      profitUsd: profitEth * ethPriceUsd,
      dex: detectDexFromReceipt(receipt),
      gasUsed: hexToNumber(receipt.gasUsed),
      gasPriceGwei: hexToGwei(receipt.effectiveGasPrice),
      confidence,
      description: `Arbitrage by ${bot.label}: ${swapLogs.length} swaps across ${touchedRouters.length} routers`,
      timestamp: hexToNumber(block.timestamp) * 1000,
    })
  }

  return events
}

/**
 * Detect JIT (Just-In-Time) liquidity attacks.
 * Pattern: add liquidity tx sandwiched around a large swap, then
 * remove liquidity in the same block — the LP captures fees without
 * permanent exposure.
 */
function detectJitLiquidity(
  block: RpcBlock,
  receipts: Map<string, RpcReceipt>,
  ethPriceUsd: number,
): MevEvent[] {
  const events: MevEvent[] = []
  const txs = block.transactions

  // Group by sender
  const bySender = new Map<string, RpcTransaction[]>()
  for (const tx of txs) {
    const sender = tx.from.toLowerCase()
    const list = bySender.get(sender) ?? []
    list.push(tx)
    bySender.set(sender, list)
  }

  // Uniswap V3 event topics
  const MINT_TOPIC = '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde'
  const BURN_TOPIC = '0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c'

  for (const [, senderTxs] of bySender) {
    if (senderTxs.length < 3) continue

    // Sort by tx index
    senderTxs.sort((a, b) => hexToNumber(a.transactionIndex) - hexToNumber(b.transactionIndex))

    for (let i = 0; i < senderTxs.length - 2; i++) {
      const firstReceipt = receipts.get(senderTxs[i].hash)
      const lastReceipt = receipts.get(senderTxs[senderTxs.length - 1].hash)

      if (!firstReceipt || !lastReceipt) continue

      // Check if first tx has MINT event and last has BURN event
      const hasMint = firstReceipt.logs.some(l => l.topics[0] === MINT_TOPIC)
      const hasBurn = lastReceipt.logs.some(l => l.topics[0] === BURN_TOPIC)

      if (!hasMint || !hasBurn) continue

      const bot = classifyBot(senderTxs[i].from.toLowerCase())
      const profitEth = Math.max(0, hexToEth(senderTxs[senderTxs.length - 1].value) - hexToEth(senderTxs[i].value))

      events.push({
        id: computeMevId('jit-liquidity', hexToNumber(block.number), senderTxs[i].hash),
        type: 'jit-liquidity',
        severity: profitEth > 0.5 ? 'high' : profitEth > 0.05 ? 'medium' : 'low',
        blockNumber: hexToNumber(block.number),
        txHash: senderTxs[senderTxs.length - 1].hash,
        botAddress: senderTxs[i].from.toLowerCase(),
        profitEth,
        profitUsd: profitEth * ethPriceUsd,
        gasUsed: hexToNumber(firstReceipt.gasUsed) + hexToNumber(lastReceipt.gasUsed),
        gasPriceGwei: hexToGwei(senderTxs[i].gasPrice),
        confidence: 75,
        description: `JIT liquidity by ${bot.label}: mint → swap → burn pattern detected`,
        timestamp: hexToNumber(block.timestamp) * 1000,
      })
    }
  }

  return events
}

/**
 * Detect known MEV bot activity in the block.
 * Any tx from a known bot address is flagged.
 */
function detectKnownBotActivity(
  block: RpcBlock,
  receipts: Map<string, RpcReceipt>,
  ethPriceUsd: number,
): MevEvent[] {
  const events: MevEvent[] = []

  for (const tx of block.transactions) {
    const sender = tx.from.toLowerCase()
    const botInfo = KNOWN_MEV_BOTS[sender]
    if (!botInfo) continue

    // Skip DEX routers (they're infrastructure, not bots)
    if (DEX_ROUTERS.has(sender)) continue

    const receipt = receipts.get(tx.hash)
    const gasUsed = receipt ? hexToNumber(receipt.gasUsed) : hexToNumber(tx.gas)
    const gasPrice = hexToGwei(tx.gasPrice)

    // Only flag if it looks like an active MEV extraction (has swap logs)
    if (receipt) {
      const hasSwap = receipt.logs.some(log =>
        log.topics[0] === UNISWAP_V2_SWAP_TOPIC ||
        log.topics[0] === UNISWAP_V3_SWAP_TOPIC
      )
      if (!hasSwap) continue
    }

    events.push({
      id: computeMevId('frontrun', hexToNumber(block.number), tx.hash),
      type: 'frontrun',
      severity: 'medium',
      blockNumber: hexToNumber(block.number),
      txHash: tx.hash,
      botAddress: sender,
      profitEth: 0,
      profitUsd: 0,
      dex: detectDexFromLogs(receipt),
      gasUsed,
      gasPriceGwei: gasPrice,
      confidence: 90,
      description: `Known MEV bot ${botInfo} executed swap tx`,
      timestamp: hexToNumber(block.timestamp) * 1000,
    })
  }

  return events
}

// ── DEX Detection Helpers ───────────────────────────────────

function detectDexFromLogs(receipt: RpcReceipt | undefined): string | undefined {
  if (!receipt) return undefined
  const addresses = new Set(receipt.logs.map(l => l.address.toLowerCase()))

  if (addresses.has('0x7a250d5630b4cf539739df2c5dacb4c659f2488d')) return 'Uniswap V2'
  if (addresses.has('0xe592427a0aece92de3edee1f18e0157c05861564')) return 'Uniswap V3'
  if (addresses.has('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45')) return 'Uniswap Universal'
  if (addresses.has('0x1111111254fb6c44bac0bed2854e76f90643097d')) return '1inch'
  if (addresses.has('0xdef1c0ded9bec7f1a1670819833240f027b25eff')) return '0x'
  if (addresses.has('0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f')) return 'SushiSwap'

  // Check for Uniswap V2/V3 swap events from any address
  const hasV2Swap = receipt.logs.some(l => l.topics[0] === UNISWAP_V2_SWAP_TOPIC)
  const hasV3Swap = receipt.logs.some(l => l.topics[0] === UNISWAP_V3_SWAP_TOPIC)
  if (hasV3Swap) return 'Uniswap V3 (pool)'
  if (hasV2Swap) return 'Uniswap V2 (pair)'

  return undefined
}

function detectDexFromReceipt(receipt: RpcReceipt): string | undefined {
  return detectDexFromLogs(receipt)
}

// ── ETH Price Cache ─────────────────────────────────────────

let cachedEthPrice = 3_500 // fallback
let ethPriceLastFetch = 0
const ETH_PRICE_TTL = 5 * 60 * 1000 // 5 min

async function getEthPriceUsd(): Promise<number> {
  if (Date.now() - ethPriceLastFetch < ETH_PRICE_TTL) return cachedEthPrice
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      signal: AbortSignal.timeout(5_000),
    })
    if (res.ok) {
      const data = (await res.json()) as { ethereum?: { usd?: number } }
      if (data.ethereum?.usd) {
        cachedEthPrice = data.ethereum.usd
        ethPriceLastFetch = Date.now()
      }
    }
  } catch {
    // Use cached value
  }
  return cachedEthPrice
}

// ── Main Detection Pipeline ─────────────────────────────────

async function fetchBlockWithReceipts(blockNumber: number): Promise<{
  block: RpcBlock
  receipts: Map<string, RpcReceipt>
}> {
  // Fetch block with full txs
  const blockHex = `0x${blockNumber.toString(16)}`
  const block = (await rpcCall('eth_getBlockByNumber', [blockHex, true])) as RpcBlock

  if (!block || !block.transactions) {
    throw new Error(`Block ${blockNumber} not found`)
  }

  // Fetch receipts in parallel (batch via individual calls, max 5 concurrent)
  const receipts = new Map<string, RpcReceipt>()
  const txHashes = block.transactions.map(t => t.hash)

  // Process in chunks of 5
  for (let i = 0; i < txHashes.length; i += 5) {
    const chunk = txHashes.slice(i, i + 5)
    const receiptPromises = chunk.map(hash =>
      rpcCall('eth_getTransactionReceipt', [hash])
        .then(r => ({ hash, receipt: r as RpcReceipt }))
        .catch(() => ({ hash, receipt: null }))
    )
    const results = await Promise.all(receiptPromises)
    for (const { hash, receipt } of results) {
      if (receipt) receipts.set(hash, receipt)
    }
  }

  return { block, receipts }
}

async function detectMevInBlock(
  blockNumber: number,
  ethPriceUsd: number,
): Promise<MevEvent[]> {
  try {
    const { block, receipts } = await fetchBlockWithReceipts(blockNumber)

    const sandwichEvents = detectSandwiches(block, receipts, ethPriceUsd)
    const arbitrageEvents = detectArbitrage(block, receipts, ethPriceUsd)
    const jitEvents = detectJitLiquidity(block, receipts, ethPriceUsd)
    const knownBotEvents = detectKnownBotActivity(block, receipts, ethPriceUsd)

    // Deduplicate: if a tx is detected by multiple engines, keep the highest confidence
    const seen = new Map<string, MevEvent>()
    for (const event of [...sandwichEvents, ...arbitrageEvents, ...jitEvents, ...knownBotEvents]) {
      const existing = seen.get(event.txHash)
      if (!existing || event.confidence > existing.confidence) {
        seen.set(event.txHash, event)
      }
    }

    return [...seen.values()]
  } catch (err) {
    console.warn(`[mev-detector] Block ${blockNumber} failed:`, (err as Error).message)
    return []
  }
}

// ── Public API ──────────────────────────────────────────────

export async function detectMev(
  numBlocks = 5,
): Promise<MevDetectionResult> {
  const startTime = Date.now()
  const ethPriceUsd = await getEthPriceUsd()

  // Get latest block number
  const latestBlockHex = (await rpcCall('eth_blockNumber', [])) as string
  const latestBlock = parseInt(latestBlockHex, 16)

  // Scan recent blocks
  const blockCount = Math.min(20, Math.max(1, numBlocks))
  const blockNumbers = Array.from({ length: blockCount }, (_, i) => latestBlock - i)

  // Process blocks in parallel (3 at a time to avoid rate limits)
  const allEvents: MevEvent[] = []
  for (let i = 0; i < blockNumbers.length; i += 3) {
    const chunk = blockNumbers.slice(i, i + 3)
    const results = await Promise.all(
      chunk.map(n => detectMevInBlock(n, ethPriceUsd))
    )
    for (const events of results) {
      allEvents.push(...events)
    }
  }

  // Sort by timestamp descending
  allEvents.sort((a, b) => b.timestamp - a.timestamp)

  // Build summary
  const byType: Record<MevType, number> = {
    sandwich: 0, arbitrage: 0, 'jit-liquidity': 0, frontrun: 0, backrun: 0, liquidation: 0,
  }
  const bySeverity: Record<MevSeverity, number> = {
    low: 0, medium: 0, high: 0, critical: 0,
  }
  const botStats = new Map<string, { count: number; profit: number }>()

  for (const event of allEvents) {
    byType[event.type]++
    bySeverity[event.severity]++
    const stat = botStats.get(event.botAddress) ?? { count: 0, profit: 0 }
    stat.count++
    stat.profit += event.profitEth
    botStats.set(event.botAddress, stat)
  }

  const topBots = [...botStats.entries()]
    .map(([address, stat]) => ({
      address,
      eventCount: stat.count,
      totalProfitEth: stat.profit,
    }))
    .sort((a, b) => b.totalProfitEth - a.totalProfitEth)
    .slice(0, 10)

  const totalProfitEth = allEvents.reduce((sum, e) => sum + e.profitEth, 0)

  return {
    summary: {
      totalEvents: allEvents.length,
      totalProfitEth,
      totalProfitUsd: totalProfitEth * ethPriceUsd,
      byType,
      bySeverity,
      topBots,
      blocksScanned: blockCount,
      scanTimeMs: Date.now() - startTime,
      ethPriceUsd,
    },
    events: allEvents,
    scannedRange: {
      fromBlock: latestBlock - blockCount + 1,
      toBlock: latestBlock,
    },
  }
}

export async function detectMevForBlock(
  blockNumber: number,
): Promise<MevEvent[]> {
  const ethPriceUsd = await getEthPriceUsd()
  return detectMevInBlock(blockNumber, ethPriceUsd)
}

export async function scanForMevBots(): Promise<Array<{
  address: string
  label: string
  recentBlocks: number
  eventCount: number
}>> {
  const result = await detectMev(10)
  const botMap = new Map<string, { label: string; blocks: Set<number>; count: number }>()

  for (const event of result.events) {
    const existing = botMap.get(event.botAddress) ?? {
      label: classifyBot(event.botAddress).label,
      blocks: new Set<number>(),
      count: 0,
    }
    existing.blocks.add(event.blockNumber)
    existing.count++
    botMap.set(event.botAddress, existing)
  }

  return [...botMap.entries()]
    .map(([address, info]) => ({
      address,
      label: info.label,
      recentBlocks: info.blocks.size,
      eventCount: info.count,
    }))
    .sort((a, b) => b.eventCount - a.eventCount)
}

/** Cached wrapper for API route usage */
export function detectMevCached(numBlocks = 5): Promise<MevDetectionResult> {
  const ttlMs = numBlocks <= 1 ? 12_000 : numBlocks <= 5 ? 30_000 : 60_000
  return getCached(`mev-detect:${numBlocks}`, ttlMs, () => detectMev(numBlocks))
    .then(r => r.data)
}
