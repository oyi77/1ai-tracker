// ─────────────────────────────────────────────────────────────
// GET /api/v1/vimero — Proxy for VIMERO Terminal feed
// Caches for 60s, aggregates with our market data
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

const VIMERO_FEED = 'https://trackai.adanghdyt.com/api/feed'
let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 60_000

async function fetchVimeroFeed() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data
  const res = await fetch(VIMERO_FEED, {
    headers: { 'User-Agent': 'NEXUS-T/1.0' },
    signal: AbortSignal.timeout(15_000)
  })
  if (!res.ok) {
    if (cache) return cache.data
    throw new Error(`VIMERO API: ${res.status}`)
  }
  const data = await res.json()
  cache = { data, ts: Date.now() }
  return data
}

export async function GET() {
  try {
    const feed = await fetchVimeroFeed()
    return NextResponse.json(feed)
  } catch (err) {
    console.error('[vimero] Error:', err)
    return NextResponse.json({ error: String(err), items: [], top: [], count: 0 }, { status: 200 })
  }
}
