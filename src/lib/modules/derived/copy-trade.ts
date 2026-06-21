// ─────────────────────────────────────────────────────────────
// Copy Trading Signals — Track smart money moves in real-time
// Monitors top wallets and surfaces their swaps as signals
// ─────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

export interface CopyTradeSignal {
  id: string
  walletAddress: string
  walletLabel: string
  chain: string
  action: 'buy' | 'sell' | 'swap'
  tokenIn: string
  tokenOut: string
  amountUsd: number
  walletPnl?: number
  walletWinRate?: number
  confidence: number
  timestamp: Date
}

export interface CopyTradeConfig {
  minAmountUsd: number
  minWalletScore: number
  maxSignals: number
}

const DEFAULT_CONFIG: CopyTradeConfig = {
  minAmountUsd: 10_000,
  minWalletScore: 70,
  maxSignals: 50,
}

// In-memory signal store
const signals: CopyTradeSignal[] = []
const MAX_SIGNALS = 200

export function addCopyTradeSignal(signal: CopyTradeSignal): void {
  signals.unshift(signal)
  if (signals.length > MAX_SIGNALS) signals.pop()
}

export function getCopyTradeSignals(config: Partial<CopyTradeConfig> = {}): CopyTradeSignal[] {
  const { minAmountUsd, minWalletScore, maxSignals } = { ...DEFAULT_CONFIG, ...config }
  return signals
    .filter(s => s.amountUsd >= minAmountUsd && s.confidence >= minWalletScore / 100)
    .slice(0, maxSignals)
}

export function getSignalsByWallet(address: string): CopyTradeSignal[] {
  return signals.filter(s => s.walletAddress.toLowerCase() === address.toLowerCase())
}

export function getSignalsByChain(chain: string): CopyTradeSignal[] {
  return signals.filter(s => s.chain === chain)
}

export async function generateCopyTradeSignals(): Promise<CopyTradeSignal[]> {
  try {
    // Get smart money wallets with highest scores
    const smartWallets = await prisma.smartMoneyWallet.findMany({
      where: { score: { gte: DEFAULT_CONFIG.minWalletScore } },
      include: { wallet: true },
      orderBy: { score: 'desc' },
      take: 20,
    })

    const newSignals: CopyTradeSignal[] = []

    for (const sw of smartWallets) {
      // Get recent transactions for this wallet
      const recentTxs = await prisma.transaction.findMany({
        where: {
          walletId: sw.walletId,
          value: { gte: DEFAULT_CONFIG.minAmountUsd },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      })

      for (const tx of recentTxs) {
        const signal: CopyTradeSignal = {
          id: `copy-${tx.txHash || tx.id}`,
          walletAddress: sw.wallet.address,
          walletLabel: sw.wallet.labels?.[0] || 'Unknown Smart Money',
          chain: sw.wallet.chain,
          action: 'buy', // Transaction model doesn't have decodedType
          tokenIn: 'UNKNOWN',
          tokenOut: 'USD',
          amountUsd: tx.value,
          confidence: sw.score / 100,
          timestamp: tx.timestamp,
        }
        newSignals.push(signal)
        addCopyTradeSignal(signal)
      }
    }

    return newSignals
  } catch (err) {
    console.error('[CopyTrade] Failed to generate signals:', (err as Error).message)
    return []
  }
}

export function getSignalStats(): { total: number; byChain: Record<string, number>; avgAmount: number } {
  const byChain: Record<string, number> = {}
  let totalAmount = 0

  for (const s of signals) {
    byChain[s.chain] = (byChain[s.chain] || 0) + 1
    totalAmount += s.amountUsd
  }

  return {
    total: signals.length,
    byChain,
    avgAmount: signals.length > 0 ? totalAmount / signals.length : 0,
  }
}

export function resetCopyTradeStore(): void {
  signals.length = 0
}
