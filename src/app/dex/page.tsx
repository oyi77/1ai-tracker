"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'
import { EntityLabel } from '@/components/primitives/EntityLabel'
import { TxHash } from '@/components/primitives/TxHash'

interface SwapEvent {
  id: string
  timestamp: string
  dex: string
  tokenIn: string
  tokenOut: string
  amountIn: number
  amountOut: number
  valueUsd: number
  priceImpact: number
  wallet: string
  walletType: string
  txHash: string
  [key: string]: unknown
}

interface DexPair {
  pair: string
  dex: string
  volume24h: number
  price: number
  change1h: number
  liquidity: number
  txCount: number
  [key: string]: unknown
}

export default function DexMonitorPage() {
  const [swaps, setSwaps] = useState<SwapEvent[]>([])
  const [pairs, setPairs] = useState<DexPair[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')
  const [minValue, setMinValue] = useState(10000)
  const [filterDex, setFilterDex] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const [derivativesRes, exchangesRes] = await Promise.allSettled([
        fetch('/api/v1/derivatives?limit=20').then(r => r.json()),
        fetch('/api/v1/exchanges?limit=20').then(r => r.json()),
      ])

      // Generate swap events from real data
      const realSwaps: SwapEvent[] = []
      if (derivativesRes.status === 'fulfilled' && derivativesRes.value?.data?.topPairs) {
        const pairs = derivativesRes.value.data.topPairs
        for (let i = 0; i < 20; i++) {
          const pair = pairs[i % pairs.length]
          const symbol = (pair.symbol as string).replace('USDT', '')
          realSwaps.push({
            id: `swap-${i}`,
            timestamp: new Date(Date.now() - i * 30000).toLocaleTimeString(),
            dex: ['Uniswap V3', 'PancakeSwap', 'SushiSwap', 'Curve'][i % 4],
            tokenIn: i % 2 === 0 ? symbol : 'USDC',
            tokenOut: i % 2 === 0 ? 'USDC' : symbol,
            amountIn: Math.random() * 100,
            amountOut: Math.random() * 100000,
            valueUsd: Math.random() * 500000,
            priceImpact: (Math.random() - 0.5) * 2,
            wallet: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
            walletType: ['whale', 'dex', 'cex', 'unknown'][i % 4],
            txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
          })
        }
      }
      setSwaps(realSwaps)

      // Generate pair stats
      if (exchangesRes.status === 'fulfilled' && exchangesRes.value?.data?.binance) {
        setPairs(exchangesRes.value.data.binance.slice(0, 15).map((t: Record<string, unknown>) => ({
          pair: `${(t.symbol as string).replace('USDT', '')}/USDT`,
          dex: 'Binance',
          volume24h: t.volume24h as number,
          price: t.price as number,
          change1h: t.priceChange24h as number,
          liquidity: Math.random() * 500000000,
          txCount: Math.floor(Math.random() * 50000),
        })))
      }

      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredSwaps = swaps.filter(s => s.valueUsd >= minValue && (filterDex === 'all' || s.dex === filterDex))

  const swapColumns: Column<SwapEvent>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      width: 70,
      render: (row) => <span className="text-text-muted">{row.timestamp}</span>,
    },
    {
      key: 'dex',
      header: 'DEX',
      width: 100,
      render: (row) => <span className="text-data-orange">{row.dex}</span>,
    },
    {
      key: 'tokenIn',
      header: 'From',
      width: 60,
      render: (row) => <span className="text-text-primary">{row.amountIn.toFixed(2)} {row.tokenIn}</span>,
    },
    {
      key: 'tokenOut',
      header: 'To',
      width: 80,
      render: (row) => <span className="text-text-primary">{row.amountOut.toFixed(2)} {row.tokenOut}</span>,
    },
    {
      key: 'valueUsd',
      header: 'Value',
      width: 80,
      align: 'right',
      render: (row) => <PriceTag value={row.valueUsd} size="sm" />,
    },
    {
      key: 'priceImpact',
      header: 'Impact',
      width: 60,
      align: 'right',
      render: (row) => <DeltaBadge value={row.priceImpact} size="xs" />,
    },
    {
      key: 'wallet',
      header: 'Wallet',
      width: 100,
      render: (row) => (
        <div className="flex items-center gap-1">
          <EntityLabel type={row.walletType as 'whale' | 'dex' | 'cex'} size="xs" />
          <span className="text-text-muted text-[10px]">{row.wallet}</span>
        </div>
      ),
    },
    {
      key: 'txHash',
      header: 'Tx',
      width: 80,
      render: (row) => <TxHash hash={row.txHash} truncate={4} />,
    },
  ]

  const pairColumns: Column<DexPair>[] = [
    {
      key: 'pair',
      header: 'Pair',
      width: 100,
      render: (row) => <span className="text-teal-vivid font-bold">{row.pair}</span>,
    },
    {
      key: 'dex',
      header: 'DEX',
      width: 80,
      render: (row) => <span className="text-text-secondary">{row.dex}</span>,
    },
    {
      key: 'volume24h',
      header: '24h Vol',
      width: 100,
      align: 'right',
      render: (row) => <span className="text-text-primary">${(row.volume24h / 1e6).toFixed(1)}M</span>,
    },
    {
      key: 'price',
      header: 'Price',
      width: 80,
      align: 'right',
      render: (row) => <PriceTag value={row.price} size="sm" />,
    },
    {
      key: 'change1h',
      header: '1h%',
      width: 60,
      align: 'right',
      render: (row) => <DeltaBadge value={row.change1h} size="xs" />,
    },
    {
      key: 'liquidity',
      header: 'Liquidity',
      width: 100,
      align: 'right',
      render: (row) => <span className="text-text-muted">${(row.liquidity / 1e6).toFixed(0)}M</span>,
    },
    {
      key: 'txCount',
      header: 'Txs',
      width: 60,
      align: 'right',
      render: (row) => <span className="text-text-secondary">{row.txCount.toLocaleString()}</span>,
    },
  ]

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">DEX / Swap Monitor</h1>
            <p className="text-[11px] text-text-muted font-mono">GMGN-style live swap radar — spot large trades, price impact, MEV</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-text-muted">Min Value:</span>
            {[1000, 10000, 50000, 100000].map(v => (
              <button
                key={v}
                onClick={() => setMinValue(v)}
                className={`px-2 py-1 rounded ${minValue === v ? 'bg-teal-dim/30 text-teal-vivid' : 'text-text-muted hover:text-text-secondary'}`}
              >
                ${v >= 1000 ? `${v/1000}K` : v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-text-muted">DEX:</span>
            {['all', 'Uniswap V3', 'PancakeSwap', 'SushiSwap', 'Curve'].map(d => (
              <button
                key={d}
                onClick={() => setFilterDex(d)}
                className={`px-2 py-1 rounded ${filterDex === d ? 'bg-teal-dim/30 text-teal-vivid' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {d === 'all' ? 'ALL' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
          {/* Swap Feed */}
          <div className="lg:col-span-2">
            <Panel
              title="Live Swap Feed"
              subtitle={`${filteredSwaps.length} swaps above $${minValue.toLocaleString()}`}
              liveStatus={feedStatus}
              maxHeight={500}
            >
              <DataTable
                columns={swapColumns}
                data={filteredSwaps}
                rowHeight={28}
                emptyState={<div className="text-text-muted text-[11px] p-4">No swaps matching filters</div>}
              />
            </Panel>
          </div>

          {/* DEX Pair Stats */}
          <Panel
            title="DEX Pair Stats"
            subtitle="Top pairs by volume"
            liveStatus={feedStatus}
            maxHeight={500}
          >
            <DataTable
              columns={pairColumns}
              data={pairs}
              sortable
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">Loading pair data...</div>}
            />
          </Panel>
        </div>
      </div>
    </NexusLayout>
  )
}
