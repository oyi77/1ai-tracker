"use client"

import { TickerStrip } from "./TickerStrip"
import { LiveFeedPanel } from "./LiveFeedPanel"
import { AiAssistantPanel } from "@/components/terminal/AiAssistantPanel"

export function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-bg-deep text-text-primary overflow-hidden">
      {/* Line 1: Nav bar */}
      <nav className="flex items-center justify-between px-4 py-2 border-b border-border-dim bg-bg-panel">
        <div className="flex items-center gap-4">
          <span className="text-accent-green font-bold font-mono text-sm">▦ NEXUS</span>
          <div className="flex gap-1">
            {[
              { label: '1:TERMINAL', href: '/' },
              { label: '2:MARKET', href: '/tokens' },
              { label: '3:ONCHAIN', href: '/entities' },
              { label: '4:MACRO', href: '/macro' },
              { label: '5:NEWS', href: '/news' },
              { label: '6:DEFI', href: '/defi' },
            ].map(tab => (
              <a
                key={tab.href}
                href={tab.href}
                className="px-2 py-0.5 text-[11px] text-text-dim hover:text-text-primary hover:bg-bg-elevated rounded transition-colors font-mono"
              >
                {tab.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/settings/modules" className="text-text-dim hover:text-text-primary text-xs">
            ⚙ MODULES
          </a>
        </div>
      </nav>

      {/* Line 2: Ticker strip */}
      <TickerStrip />

      {/* Line 3: Main content — 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live feed */}
        <aside className="w-80 border-r border-border-dim bg-bg-panel flex flex-col shrink-0">
          <LiveFeedPanel />
        </aside>

        {/* Center: Main panel */}
        <main className="flex-1 overflow-auto bg-bg-deep">
          {children}
        </main>

        {/* Right: AI assistant panel */}
        <aside className="w-80 border-l border-border-dim bg-bg-panel flex flex-col shrink-0">
          <AiAssistantPanel />
        </aside>
      </div>
    </div>
  )
}
