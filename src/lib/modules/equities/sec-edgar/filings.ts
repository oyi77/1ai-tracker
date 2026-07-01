/**
 * Module: SEC EDGAR Insider Trades (Form 4)
 * sourceType: public-api
 * upstreamProduct: SEC EDGAR
 * endpoint: www.sec.gov/cgi-bin/browse-edgar
 * discoveredVia: docs
 * lastVerified: 2026-06-20
 * UNOFFICIAL: uses SEC's public EDGAR RSS feed for Form 4 filings
 * fallbackFn: empty insider trades list
 *
 * Alpha signals: insider buying = confidence (especially cluster buying),
 * insider selling = caution. Form 4 RSS provides real-time filings.
 */

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../../types'
import { TTL } from '../../types'
import { cachedFetch } from '../../fetch-with-cache'

const BASE = 'https://www.sec.gov/cgi-bin/browse-edgar'

interface InsiderTrade {
  filingDate: string
  companyName: string
  ticker: string | null
  cik: string
  ownerName: string
  transactionType: string
  shares: number | null
  price: number | null
  value: number | null
  secForm: string
  link: string
}

interface InsiderTradesData {
  trades: InsiderTrade[]
  count: number
  timestamp: number
}

const SEC_UA = '1AI-NEXUS/1.0 (research@1ai-tracker.com)'

/** Parse ticker from an SEC document description line */
function extractTicker(desc: string): string | null {
  // Format: "ACCEL ENTERTAINMENT, INC. (Filer) CIK: 0001899127"
  const match = desc.match(/\(Filer\)/)
  if (!match) return null
  // Try to match a ticker in parentheses before "(Filer)"
  const before = desc.slice(0, match.index).trim()
  const tickerMatch = before.match(/\(([A-Z]{1,5})\)$/)
  return tickerMatch ? tickerMatch[1] : null
}

/** Parse shares / price from the transaction description */
function extractTransactionMeta(summary: string): { shares: number | null; price: number | null; value: number | null } {
  let shares: number | null = null
  let price: number | null = null
  let value: number | null = null

  // Try to find "n. shares at $n.nn"
  const sharesMatch = summary.match(/(\d+[,.]?\d*)\s*(?:shares?\s+at\s+\$?(\d+[,.]?\d*))/i)
  if (sharesMatch) {
    shares = parseFloat(sharesMatch[1].replace(/,/g, ''))
    if (sharesMatch[2]) price = parseFloat(sharesMatch[2].replace(/,/g, ''))
  }

  // Try to find total value
  const valueMatch = summary.match(/\$(\d+[,.]?\d*)/)
  if (valueMatch) {
    value = parseFloat(valueMatch[1].replace(/,/g, ''))
  }

  return { shares, price, value }
}

async function fetchInsiderTrades(_params: FetchParams): Promise<InsiderTradesData> {
  const url = `${BASE}?action=getcurrent&CIK=&type=4&company=&dateb=&owner=only&start=0&count=40&output=atom`

  const res = await fetch(url, {
    headers: {
      'User-Agent': SEC_UA,
      'Accept': 'application/xml,application/atom+xml,text/xml',
    },
    signal: AbortSignal.timeout(10_000),
  })
  const trades: InsiderTrade[] = []

  if (res.ok) {
    const xml = await res.text()

    // Parse entries via simple regex (no XML dep needed)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
    let entryMatch: RegExpExecArray | null

    while ((entryMatch = entryRegex.exec(xml)) !== null) {
      const entry = entryMatch[1]
      const title = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? ''
      const published = entry.match(/<published[^>]*>([\s\S]*?)<\/published>/)?.[1]?.trim() ?? ''
      const link = entry.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/)?.[1] ?? ''
      const summary = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.trim() ?? ''

      // Parse title: "Form 4 UNITED STATES STEEL CORP Filed: 2026-06-19"
      const formMatch = title.match(/Form\s+(\d+)/i)
      const secForm = formMatch ? formMatch[1] : '4'

      // Parse date from published or title
      const dateMatch = published.match(/^(\d{4}-\d{2}-\d{2})/)
      const filingDate = dateMatch ? dateMatch[1] : ''

      // Extract company name (before "(Filer)")
      const companyMatch = summary.match(/(.+?)\s*\(Filer\)/)
      const companyName = companyMatch ? companyMatch[1].trim() : title

      // Ticker
      const ticker = extractTicker(summary)

      // CIK
      const cikMatch = summary.match(/CIK:\s*(\d+)/)
      const cik = cikMatch ? cikMatch[1] : ''

      // Owner name
      const ownerMatch = summary.match(/(\w[\w\s.]+)\s+(?:is\s+)?(?:the|a\s+)?(?:Director|Officer|Beneficial|President|CEO|CFO|COO)/i)
      let ownerName = ownerMatch ? ownerMatch[1].trim() : ''
      if (!ownerName) {
        // Try alternate pattern: name at the beginning before "acquired" or "disposed"
        const nameFallback = summary.match(/^([A-Z][A-Z\s.]+?)\s+(?:acquired|disposed|sold|purchased)/i)
        if (nameFallback) ownerName = nameFallback[1].trim()
      }

      // Transaction type
      let transactionType = 'Unknown'
      if (/acquired|purchased|bought/i.test(summary)) transactionType = 'Buy'
      else if (/disposed|sold|gifted/i.test(summary)) transactionType = 'Sell'
      else if (/exercise|option/i.test(summary)) transactionType = 'Option Exercise'
      else if (/grant|award/i.test(summary)) transactionType = 'Grant/Award'

      // Shares/price/value
      const meta = extractTransactionMeta(summary)

      // Skip incomplete entries
      if (!filingDate && !companyName) continue

      trades.push({
        filingDate,
        companyName,
        ticker,
        cik,
        ownerName,
        transactionType,
        ...meta,
        secForm,
        link,
      })
    }
  }

  return { trades, count: trades.length, timestamp: Date.now() }
}

const secEdgarModule: DataModule = {
  id: 'sec-edgar',
  name: 'SEC EDGAR Insider Trades',
  category: 'equities',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'SEC EDGAR Form 4 insider trading filings — real-time RSS feed',
    upstreamProduct: 'SEC EDGAR',
    discoveredVia: 'docs',
    fragility: 'moderate',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const res = await fetch(`${BASE}?action=getcurrent&type=4&start=0&count=1&output=atom`, {
        headers: { 'User-Agent': SEC_UA },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0 }
    } catch (e) {
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('sec-edgar', params, TTL.MACRO_DATA, () => fetchInsiderTrades(params) as Promise<T>)
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return {
      data: { trades: [], count: 0, timestamp: Date.now() } as unknown as T,
      source: 'sec-edgar (empty fallback)', cached: false, timestamp: Date.now(), ttl: TTL.MACRO_DATA,
    }
  },
}

export default secEdgarModule
