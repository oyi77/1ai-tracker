"use client"

import { useState } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'
import { useLiveFetch } from '@/lib/hooks/useLiveFetch'

interface NewsResponse { items: Array<{ id: string; title: string; url: string; sourceId: string; publishedAt: string; summary?: string; category?: string }> }

export default function NewsPage() {
  const { data, status, refresh } = useLiveFetch<NewsResponse>({ url: '/api/v1/news', interval: 60_000 })
  const [filter, setFilter] = useState('all')
  const news = data?.items || []
  const filtered = filter === 'all' ? news : news.filter(n => n.category === filter)

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">News Feed</h1>
            <p className="text-[11px] text-text-muted font-mono">30+ curated crypto RSS sources</p>
          </div>
          <LiveDot status={status} label />
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono">
          {['all', 'crypto', 'defi', 'tradfi', 'regulation'].map(c => (
            <button key={c} onClick={() => setFilter(c)} className={`px-2 py-1 rounded ${filter === c ? 'bg-teal-dim/30 text-teal-vivid' : 'text-text-muted hover:text-text-secondary'}`}>{c.toUpperCase()}</button>
          ))}
          <span className="ml-auto text-text-muted">{filtered.length} articles</span>
        </div>

        <Panel title="Live News" subtitle="RSS feeds" liveStatus={status} onRefresh={refresh} maxHeight={700}>
          {filtered.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 border-b border-bg-border/50 hover:bg-bg-raised/50 transition-colors">
              <div className="text-[12px] font-medium text-text-primary hover:text-teal-vivid transition-colors line-clamp-2">{item.title}</div>
              {item.summary && <div className="text-[10px] text-text-muted mt-1 line-clamp-2">{item.summary}</div>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-mono text-data-info">{item.sourceId}</span>
                {item.category && item.category !== 'general' && <span className="px-1 py-0 rounded bg-bg-raised text-[9px] font-mono text-text-muted">{item.category}</span>}
                <span className="text-[9px] font-mono text-text-muted">{item.publishedAt}</span>
              </div>
            </a>
          ))}
          {filtered.length === 0 && <div className="p-4 text-center text-text-muted text-[11px]">No articles</div>}
        </Panel>
      </div>
    </NexusLayout>
  )
}
