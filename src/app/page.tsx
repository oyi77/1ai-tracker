"use client"

import { useState, useEffect, useCallback } from "react"
import { TerminalShell } from "@/components/layout/TerminalShell"
import { TrendingUp, Layers, Globe, Activity, Newspaper, BarChart3, Target, Bell } from "lucide-react"

interface Ticker {
  symbol: string
  price: string
  change: string
  positive: boolean
}

interface NewsItem {
  id: string
  title: string
  sourceId: string
  publishedAt: string
  category: string
}

interface DeFiProtocol {
  name: string
  chain: string
  tvl: number
  change_1d: unknown
}

interface DiscoveredToken {
  symbol: string
  network: string
  priceUsd: number
  volume24h: number
  liquidity: number
  change24h: number
  rugScore: number
  badges: string[]
}

interface FearGreedData {
  value: number
  classification: string
}

type ActivePanel = 'overview' | 'news' | 'defi' | 'tokens' | 'derivatives' | 'macro' | 'entities' | 'alerts'

export default function TerminalPage() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [defi, setDeFi] = useState<DeFiProtocol[]>([])
  const [tokens, setTokens] = useState<DiscoveredToken[]>([])
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const fetchData = useCallback(async () => {
    const [priceRes, newsRes, defiRes, tokenRes, fgRes] = await Promise.allSettled([
      fetch('/api/v1/market/prices').then(r => r.json()),
      fetch('/api/v1/news?limit=20').then(r => r.json()),
      fetch('/api/v1/defi/tvl?limit=10').then(r => r.json()),
      fetch('/api/v1/tokens/discover?limit=10').then(r => r.json()),
      fetch('/api/v1/market/sentiment').then(r => r.json()),
    ])

    if (priceRes.status === 'fulfilled' && priceRes.value?.tickers) setTickers(priceRes.value.tickers)
    if (newsRes.status === 'fulfilled' && newsRes.value?.items) setNews(newsRes.value.items)
    if (defiRes.status === 'fulfilled' && defiRes.value?.protocols) setDeFi(defiRes.value.protocols)
    if (tokenRes.status === 'fulfilled' && tokenRes.value?.tokens) setTokens(tokenRes.value.tokens)
    if (fgRes.status === 'fulfilled' && fgRes.value?.fearGreed != null) setFearGreed(fgRes.value)

    setLastUpdate(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '1') setActivePanel('overview')
      if (e.key === '2') setActivePanel('news')
      if (e.key === '3') setActivePanel('defi')
      if (e.key === '4') setActivePanel('tokens')
      if (e.key === '5') setActivePanel('derivatives')
      if (e.key === '6') setActivePanel('macro')
      if (e.key === '7') setActivePanel('entities')
      if (e.key === '8') setActivePanel('alerts')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const fgColor = fearGreed ? (fearGreed.value >= 55 ? 'text-accent-green' : fearGreed.value >= 45 ? 'text-accent-amber' : 'text-accent-red') : 'text-text-dim'

  return (
    <TerminalShell>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Context Bar — Bloomberg style */}
        <div className="flex items-center gap-4 px-3 py-1.5 bg-bg-panel border-b border-border-dim text-[10px] font-mono">
          <span className="text-accent-green">● LIVE</span>
          <span className="text-text-dim">FG: <span className={fgColor}>{fearGreed?.value ?? '—'}</span></span>
          <span className="text-text-dim">|</span>
          <span className="text-text-dim">MODULES: <span className="text-accent-cyan">34</span></span>
          <span className="text-text-dim">|</span>
          <span className="text-text-dim">SOURCES: <span className="text-accent-cyan">60+</span></span>
          <span className="text-text-dim">|</span>
          <span className="text-text-dim">UPDATED: <span className="text-text-primary">{lastUpdate}</span></span>
          <span className="ml-auto text-text-muted">1-8: panels · /: search · ⌘K: commands</span>
        </div>

        {/* Panel Tabs */}
        <div className="flex items-center gap-0.5 px-3 py-1 bg-bg-deep border-b border-border-dim">
          {([
            { key: 'overview', label: 'OVERVIEW', icon: Activity, hotkey: '1' },
            { key: 'news', label: 'NEWS', icon: Newspaper, hotkey: '2' },
            { key: 'defi', label: 'DeFi', icon: Layers, hotkey: '3' },
            { key: 'tokens', label: 'TOKENS', icon: BarChart3, hotkey: '4' },
            { key: 'derivatives', label: 'DERIV', icon: TrendingUp, hotkey: '5' },
            { key: 'macro', label: 'MACRO', icon: Globe, hotkey: '6' },
            { key: 'entities', label: 'ENTITIES', icon: Target, hotkey: '7' },
            { key: 'alerts', label: 'ALERTS', icon: Bell, hotkey: '8' },
          ] as const).map(({ key, label, icon: Icon, hotkey }) => (
            <button
              key={key}
              onClick={() => setActivePanel(key)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                activePanel === key
                  ? 'bg-border-active text-text-primary'
                  : 'text-text-dim hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <Icon size={10} />
              {label}
              <span className="text-[8px] text-text-muted ml-0.5">{hotkey}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-pulse text-accent-cyan font-mono text-sm mb-2">LOADING DATA SOURCES...</div>
                <div className="text-text-dim text-xs">Connecting to 34 modules across 60+ feeds</div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              {activePanel === 'overview' && <OverviewPanel tickers={tickers} news={news} defi={defi} tokens={tokens} fearGreed={fearGreed} />}
              {activePanel === 'news' && <NewsPanel news={news} />}
              {activePanel === 'defi' && <DeFiPanel defi={defi} />}
              {activePanel === 'tokens' && <TokensPanel tokens={tokens} />}
              {activePanel === 'derivatives' && <DerivativesPanel />}
              {activePanel === 'macro' && <MacroPanel />}
              {activePanel === 'entities' && <EntitiesPanel />}
              {activePanel === 'alerts' && <AlertsPanel />}
            </div>
          )}
        </div>
      </div>
    </TerminalShell>
  )
}

// ═══ OVERVIEW PANEL — Bloomberg 4-quadrant layout ═══
function OverviewPanel({ tickers, news, defi, tokens, fearGreed }: {
  tickers: Ticker[]
  news: NewsItem[]
  defi: DeFiProtocol[]
  tokens: DiscoveredToken[]
  fearGreed: FearGreedData | null
}) {
  return (
    <div className="grid grid-cols-2 h-full">
      {/* Top-Left: Market Quotes */}
      <div className="border-r border-b border-border-dim overflow-auto p-2">
        <div className="text-[10px] font-mono text-accent-cyan mb-2 flex items-center gap-1">
          <BarChart3 size={10} /> MARKET QUOTES
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-text-muted">
              <th className="text-left py-0.5 font-mono">SYM</th>
              <th className="text-right py-0.5 font-mono">PRICE</th>
              <th className="text-right py-0.5 font-mono">CHG</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map(t => (
              <tr key={t.symbol} className="border-t border-border-dim/20 hover:bg-bg-elevated">
                <td className="py-0.5 font-mono font-bold text-text-primary">{t.symbol}</td>
                <td className="py-0.5 text-right font-mono">{t.price}</td>
                <td className={`py-0.5 text-right font-mono ${t.positive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {t.positive ? '▲' : '▼'} {t.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fearGreed && (
          <div className="mt-2 pt-2 border-t border-border-dim/30 text-[10px]">
            <span className="text-text-dim">FEAR/GREED: </span>
            <span className={`font-mono font-bold ${fearGreed.value >= 55 ? 'text-accent-green' : fearGreed.value >= 45 ? 'text-accent-amber' : 'text-accent-red'}`}>
              {fearGreed.value} {fearGreed.classification}
            </span>
          </div>
        )}
      </div>

      {/* Top-Right: DeFi + Token Discovery */}
      <div className="border-b border-border-dim overflow-auto p-2">
        <div className="text-[10px] font-mono text-accent-cyan mb-2 flex items-center gap-1">
          <Layers size={10} /> TOP DeFi BY TVL
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-text-muted">
              <th className="text-left py-0.5 font-mono">#</th>
              <th className="text-left py-0.5 font-mono">PROTOCOL</th>
              <th className="text-right py-0.5 font-mono">TVL</th>
              <th className="text-right py-0.5 font-mono">1D</th>
            </tr>
          </thead>
          <tbody>
            {defi.slice(0, 8).map((p, i) => (
              <tr key={p.name + i} className="border-t border-border-dim/20 hover:bg-bg-elevated">
                <td className="py-0.5 text-text-muted">{i + 1}</td>
                <td className="py-0.5 font-mono text-text-primary">{p.name}</td>
                <td className="py-0.5 text-right font-mono text-accent-green">${formatTvl(Number(p.tvl))}</td>
                <td className={`py-0.5 text-right font-mono ${Number(p.change_1d) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {formatChange(p.change_1d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom-Left: News Feed */}
      <div className="border-r border-border-dim overflow-auto p-2">
        <div className="text-[10px] font-mono text-accent-cyan mb-2 flex items-center gap-1">
          <Newspaper size={10} /> LIVE NEWS ({news.length})
        </div>
        <div className="space-y-1">
          {news.slice(0, 12).map(item => (
            <div key={item.id} className="py-1 border-b border-border-dim/20 hover:bg-bg-elevated cursor-pointer">
              <p className="text-[11px] text-text-primary leading-tight">{item.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-accent-cyan font-mono">{item.sourceId}</span>
                <span className="text-[9px] text-text-muted">{formatTimeAgo(item.publishedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-Right: Trending Tokens */}
      <div className="overflow-auto p-2">
        <div className="text-[10px] font-mono text-accent-cyan mb-2 flex items-center gap-1">
          <TrendingUp size={10} /> TRENDING TOKENS
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-text-muted">
              <th className="text-left py-0.5 font-mono">SYM</th>
              <th className="text-left py-0.5 font-mono">CHAIN</th>
              <th className="text-right py-0.5 font-mono">VOL</th>
              <th className="text-right py-0.5 font-mono">CHG</th>
              <th className="text-center py-0.5 font-mono">RUG</th>
            </tr>
          </thead>
          <tbody>
            {tokens.slice(0, 8).map((t, i) => (
              <tr key={t.symbol + i} className="border-t border-border-dim/20 hover:bg-bg-elevated">
                <td className="py-0.5 font-mono font-bold text-text-primary">{t.symbol}</td>
                <td className="py-0.5 text-accent-cyan">{t.network.toUpperCase()}</td>
                <td className="py-0.5 text-right font-mono">${formatNum(t.volume24h)}</td>
                <td className={`py-0.5 text-right font-mono ${t.change24h >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(1)}%
                </td>
                <td className="py-0.5 text-center">
                  <span className={`font-mono ${t.rugScore >= 70 ? 'text-accent-red' : t.rugScore >= 40 ? 'text-accent-amber' : 'text-accent-green'}`}>
                    {t.rugScore}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══ NEWS PANEL ═══
function NewsPanel({ news }: { news: NewsItem[] }) {
  const [filter, setFilter] = useState('all')
  const categories = [...new Set(news.map(n => n.category))].sort()
  const filtered = filter === 'all' ? news : news.filter(n => n.category === filter)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-dim">
        <span className="text-[10px] font-mono text-accent-cyan">NEWS FEED</span>
        <span className="text-[9px] text-text-muted">{news.length} articles</span>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setFilter('all')} className={`px-1.5 py-0.5 rounded text-[9px] border ${filter === 'all' ? 'bg-border-active border-border-active text-text-primary' : 'bg-bg-panel border-border-dim text-text-dim'}`}>ALL</button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)} className={`px-1.5 py-0.5 rounded text-[9px] border ${filter === c ? 'bg-border-active border-border-active text-text-primary' : 'bg-bg-panel border-border-dim text-text-dim'}`}>{c.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.map(item => (
          <div key={item.id} className="px-3 py-2 border-b border-border-dim/20 hover:bg-bg-elevated cursor-pointer">
            <p className="text-[11px] text-text-primary leading-tight">{item.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-accent-cyan font-mono">{item.sourceId}</span>
              <span className="text-[9px] text-text-muted">{formatTimeAgo(item.publishedAt)}</span>
              <span className="text-[9px] text-text-muted bg-bg-elevated px-1 rounded">{item.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══ DeFi PANEL ═══
function DeFiPanel({ defi }: { defi: DeFiProtocol[] }) {
  return (
    <div className="p-2">
      <div className="text-[10px] font-mono text-accent-cyan mb-2 flex items-center gap-1">
        <Layers size={10} /> DeFi PROTOCOLS — DeFiLlama
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-text-muted border-b border-border-dim">
            <th className="text-left py-1 px-2 font-mono">#</th>
            <th className="text-left py-1 px-2 font-mono">PROTOCOL</th>
            <th className="text-left py-1 px-2 font-mono">CHAIN</th>
            <th className="text-right py-1 px-2 font-mono">TVL</th>
            <th className="text-right py-1 px-2 font-mono">1D CHANGE</th>
          </tr>
        </thead>
        <tbody>
          {defi.map((p, i) => (
            <tr key={p.name + i} className="border-t border-border-dim/20 hover:bg-bg-elevated">
              <td className="py-1 px-2 text-text-muted">{i + 1}</td>
              <td className="py-1 px-2 font-mono text-text-primary font-bold">{p.name}</td>
              <td className="py-1 px-2 text-accent-cyan">{p.chain}</td>
              <td className="py-1 px-2 text-right font-mono text-accent-green">${formatTvl(Number(p.tvl))}</td>
              <td className={`py-1 px-2 text-right font-mono ${Number(p.change_1d) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {formatChange(p.change_1d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══ TOKENS PANEL ═══
function TokensPanel({ tokens }: { tokens: DiscoveredToken[] }) {
  return (
    <div className="p-2">
      <div className="text-[10px] font-mono text-accent-cyan mb-2 flex items-center gap-1">
        <TrendingUp size={10} /> TOKEN DISCOVERY — GeckoTerminal
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-text-muted border-b border-border-dim">
            <th className="text-left py-1 px-2 font-mono">SYM</th>
            <th className="text-left py-1 px-2 font-mono">CHAIN</th>
            <th className="text-right py-1 px-2 font-mono">PRICE</th>
            <th className="text-right py-1 px-2 font-mono">VOL 24H</th>
            <th className="text-right py-1 px-2 font-mono">LIQ</th>
            <th className="text-right py-1 px-2 font-mono">CHG</th>
            <th className="text-center py-1 px-2 font-mono">RUG</th>
            <th className="text-left py-1 px-2 font-mono">SIGNALS</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
            <tr key={t.symbol + i} className="border-t border-border-dim/20 hover:bg-bg-elevated">
              <td className="py-1 px-2 font-mono font-bold text-text-primary">{t.symbol}</td>
              <td className="py-1 px-2 text-accent-cyan">{t.network.toUpperCase()}</td>
              <td className="py-1 px-2 text-right font-mono">{t.priceUsd < 0.01 ? t.priceUsd.toFixed(6) : `$${t.priceUsd.toFixed(2)}`}</td>
              <td className="py-1 px-2 text-right font-mono">${formatNum(t.volume24h)}</td>
              <td className="py-1 px-2 text-right font-mono">${formatNum(t.liquidity)}</td>
              <td className={`py-1 px-2 text-right font-mono ${t.change24h >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(1)}%
              </td>
              <td className="py-1 px-2 text-center">
                <span className={`font-mono ${t.rugScore >= 70 ? 'text-accent-red' : t.rugScore >= 40 ? 'text-accent-amber' : 'text-accent-green'}`}>
                  {t.rugScore}
                </span>
              </td>
              <td className="py-1 px-2">
                <div className="flex flex-wrap gap-0.5">
                  {t.badges.map((b, j) => <span key={j} className="text-[8px] px-1 py-0.5 rounded bg-bg-elevated text-text-dim">{b}</span>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══ DERIVATIVES PANEL ═══
function DerivativesPanel() {
  return (
    <div className="p-4 text-center text-text-dim text-xs">
      <TrendingUp size={24} className="mx-auto mb-2 text-accent-cyan" />
      <p className="font-mono text-accent-cyan mb-1">DERIVATIVES DASHBOARD</p>
      <p>Hyperliquid + Binance + Bybit aggregated data</p>
      <p className="text-text-muted mt-1">Use /derivatives for full view</p>
    </div>
  )
}

// ═══ MACRO PANEL ═══
function MacroPanel() {
  return (
    <div className="p-4 text-center text-text-dim text-xs">
      <Globe size={24} className="mx-auto mb-2 text-accent-cyan" />
      <p className="font-mono text-accent-cyan mb-1">MACRO DASHBOARD</p>
      <p>FRED + World Bank + ECB + Fear & Greed</p>
      <p className="text-text-muted mt-1">Use /macro for full view</p>
    </div>
  )
}

// ═══ ENTITIES PANEL ═══
function EntitiesPanel() {
  return (
    <div className="p-4 text-center text-text-dim text-xs">
      <Target size={24} className="mx-auto mb-2 text-accent-cyan" />
      <p className="font-mono text-accent-cyan mb-1">ENTITY EXPLORER</p>
      <p>118 entities across 6 categories</p>
      <p className="text-text-muted mt-1">Use /entities for full view</p>
    </div>
  )
}

// ═══ ALERTS PANEL ═══
function AlertsPanel() {
  return (
    <div className="p-4 text-center text-text-dim text-xs">
      <Bell size={24} className="mx-auto mb-2 text-accent-cyan" />
      <p className="font-mono text-accent-cyan mb-1">ALERT TEMPLATES</p>
      <p>12 pre-built alert templates</p>
      <p className="text-text-muted mt-1">Use /alerts for full view</p>
    </div>
  )
}

// ═══ UTILITIES ═══
function formatTvl(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toFixed(0)
}

function formatNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toFixed(0)
}

function formatChange(v: unknown): string {
  const n = Number(v)
  if (isNaN(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function formatTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  } catch {
    return '—'
  }
}
