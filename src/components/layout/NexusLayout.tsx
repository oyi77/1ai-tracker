"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Coins, Building2, Zap, Bell,
  ChevronLeft, ChevronRight, Search, Globe,
  TrendingUp, BarChart3, Activity, Shield, Radio, Eye,
} from 'lucide-react'
import { LiveDot } from '../primitives/LiveDot'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/',              icon: LayoutDashboard },
  { label: 'Tokens',       href: '/tokens',        icon: Coins },
  { label: 'Entities',     href: '/entities',       icon: Building2 },
  { label: 'Smart Money',  href: '/smart-money',    icon: Zap },
  { label: 'Derivatives',  href: '/derivatives',    icon: TrendingUp },
  { label: 'DEX Monitor',  href: '/flows',          icon: Activity },
  { label: 'Mempool',      href: '/fear-greed',     icon: Radio },
  { label: 'Alerts',       href: '/alerts',         icon: Bell },
  { label: 'OSINT',        href: '/compare',        icon: Eye },
  { label: 'Macro',        href: '/macro',          icon: Globe },
  { label: 'PnL Tracker',  href: '/pnl',            icon: BarChart3 },
  { label: 'Status',       href: '/status',         icon: Shield },
]

interface NexusLayoutProps {
  children: React.ReactNode
}

export function NexusLayout({ children }: NexusLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [time, setTime] = useState('')
  const [wsStatus, setWsStatus] = useState<'live' | 'stale' | 'error'>('live')
  const pathname = usePathname()

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-bg-base text-text-primary overflow-hidden">
      {/* ── TopBar (48px) ── */}
      <header className="flex items-center justify-between px-3 border-b border-bg-border bg-bg-panel shrink-0" style={{ height: 48 }}>
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-teal-vivid font-bold text-[15px] font-mono tracking-tight">NEXUS</span>
            <span className="text-[9px] text-text-muted font-mono hidden sm:inline">v2.0</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-bg-raised border border-bg-border">
            <Search size={12} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search address, token, tx…"
              className="bg-transparent text-[11px] font-mono text-text-primary placeholder:text-text-muted outline-none w-48"
            />
            <kbd className="text-[9px] text-text-muted bg-bg-base px-1 rounded">⌘K</kbd>
          </div>
        </div>

        {/* Center: Global Ticker */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] font-mono">
          <span className="text-text-muted">BTC <span className="text-data-bull">$64,190</span></span>
          <span className="text-text-muted">ETH <span className="text-data-bull">$1,733</span></span>
          <span className="text-text-muted">SOL <span className="text-data-bull">$73.36</span></span>
          <span className="text-text-muted">DOM <span className="text-text-primary">54.2%</span></span>
          <span className="text-text-muted">FGI <span className="text-data-warn">47</span></span>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <LiveDot status={wsStatus} size={5} />
            <span className="text-text-muted hidden sm:inline">
              {wsStatus === 'live' ? 'LIVE' : wsStatus.toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] font-mono text-text-secondary tabular-nums">{time}</span>
          <button className="p-1.5 rounded hover:bg-bg-raised transition-colors">
            <Bell size={14} className="text-text-muted" />
          </button>
        </div>
      </header>

      {/* ── Main Area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── SideNav (220px / 48px collapsed) ── */}
        <nav
          className="flex flex-col border-r border-bg-border bg-bg-panel shrink-0 overflow-y-auto scrollbar-thin transition-all duration-200"
          style={{ width: collapsed ? 48 : 200 }}
        >
          {/* Nav Items */}
          <div className="flex-1 py-1">
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium transition-colors
                    ${isActive
                      ? 'bg-teal-dim/30 text-teal-vivid border-r-2 border-teal-vivid'
                      : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={14} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center py-2 border-t border-bg-border hover:bg-bg-raised transition-colors"
          >
            {collapsed ? <ChevronRight size={14} className="text-text-muted" /> : <ChevronLeft size={14} className="text-text-muted" />}
          </button>
        </nav>

        {/* ── MainContent ── */}
        <main className="flex-1 overflow-auto scrollbar-thin bg-bg-base">
          {children}
        </main>
      </div>
    </div>
  )
}
