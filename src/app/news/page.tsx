"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface NewsItem {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  summary?: string
  category?: string
  [key: string]: unknown
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')
  const [filterCategory, setFilterCategory] = useState('all')

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/news')
      const data = await res.json()

      if (data.items && Array.isArray(data.items)) {
        setNews(data.items.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          title: item.title as string,
          url: item.url as string,
          source: item.sourceId as string || 'Unknown',
          publishedAt: item.publishedAt as string,
          summary: item.summary as string || '',
          category: item.category as string || 'general',
        })))
      }
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchNews()
    const interval = setInterval(fetchNews, 60_000)
    return () => clearInterval(interval)
  }, [fetchNews])

  const filtered = filterCategory === 'all'
    ? news
    : news.filter(n => n.category === filterCategory)

  const categories = ['all', 'crypto', 'defi', 'tradfi', 'regulation', 'technology']

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">News Feed</h1>
            <p className="text-[11px] text-text-muted font-mono">Aggregated crypto news from 30+ sources</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="text-text-muted">Category:</span>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-2 py-1 rounded ${filterCategory === c ? 'bg-teal-dim/30 text-teal-vivid' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {c.toUpperCase()}
            </button>
          ))}
          <span className="ml-auto text-text-muted">{filtered.length} articles</span>
        </div>

        {/* News Feed */}
        <Panel
          title="Live News"
          subtitle="RSS feeds from CoinDesk, CoinTelegraph, Decrypt, The Block, etc."
          liveStatus={feedStatus}
          onRefresh={fetchNews}
          maxHeight={700}
        >
          <div className="space-y-0">
            {filtered.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 border-b border-bg-border/50 hover:bg-bg-raised/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-text-primary hover:text-teal-vivid transition-colors line-clamp-2">
                      {item.title}
                    </div>
                    {item.summary && (
                      <div className="text-[10px] text-text-muted mt-1 line-clamp-2">{item.summary}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-data-info">{item.source}</span>
                      {item.category && item.category !== 'general' && (
                        <span className="px-1 py-0 rounded bg-bg-raised text-[9px] font-mono text-text-muted">
                          {item.category}
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-text-muted">{item.publishedAt}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-text-muted text-[11px]">No news articles matching filter</div>
            )}
          </div>
        </Panel>
      </div>
    </NexusLayout>
  )
}
