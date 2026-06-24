"use client"

import { useState } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { DegenScannerPageContent } from '../scanner/page'
import { DexMonitorPageContent } from '../dex/page'
import { TrendingCoinsPageContent } from '../trending/page'
import { RugcheckPageContent } from '../rugcheck/page'

const TABS = [
  { key: 'scanner', label: '🔍 Token Scanner', content: DegenScannerPageContent },
  { key: 'dex', label: '📊 DEX Monitor', content: DexMonitorPageContent },
  { key: 'trending', label: '🔥 Trending', content: TrendingCoinsPageContent },
  { key: 'rugcheck', label: '🛡 RugCheck', content: RugcheckPageContent },
] as const

type TabKey = typeof TABS[number]['key']

export default function TradingPage() {
  const [tab, setTab] = useState<TabKey>('scanner')
  const active = TABS.find(t => t.key === tab)!

  return (
    <NexusLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-bg-border bg-bg-panel shrink-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-[11px] font-mono rounded transition-colors ${tab === t.key ? 'bg-teal-vivid text-bg-base font-bold' : 'text-text-muted hover:text-text-primary hover:bg-bg-raised'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          <active.content />
        </div>
      </div>
    </NexusLayout>
  )
}
