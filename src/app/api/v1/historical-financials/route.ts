import { type NextRequest } from 'next/server'
import { apiJson } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

// SEC EDGAR XBRL financials proxy
// Browser can't call SEC EDGAR directly (User-Agent header is forbidden in browser fetch)
// This route proxies the request with the required User-Agent header

const COMPANIES: Record<string, { name: string; cik: string }> = {
  AAPL: { name: 'Apple', cik: '0000320193' },
  MSFT: { name: 'Microsoft', cik: '0000789019' },
  GOOGL: { name: 'Alphabet', cik: '0001652044' },
  AMZN: { name: 'Amazon', cik: '0001018724' },
  NVDA: { name: 'NVIDIA', cik: '0001045810' },
  META: { name: 'Meta', cik: '0001326801' },
  TSLA: { name: 'Tesla', cik: '0001318605' },
  JPM: { name: 'JPMorgan', cik: '0000019617' },
  V: { name: 'Visa', cik: '0001403161' },
  JNJ: { name: 'J&J', cik: '0000200406' },
  WMT: { name: 'Walmart', cik: '0000104169' },
  PG: { name: 'P&G', cik: '0000080424' },
  XOM: { name: 'Exxon', cik: '0000034088' },
  UNH: { name: 'UnitedHealth', cik: '0000731766' },
  HD: { name: 'Home Depot', cik: '0000354950' },
  DIS: { name: 'Disney', cik: '0001001039' },
  NFLX: { name: 'Netflix', cik: '0001065280' },
  BA: { name: 'Boeing', cik: '0000012927' },
  GS: { name: 'Goldman', cik: '0000886982' },
  BAC: { name: 'BofA', cik: '0000070858' },
}

interface FinancialData {
  period: string
  revenue: number | null
  netIncome: number | null
  totalAssets: number | null
  totalLiabilities: number | null
  totalEquity: number | null
  operatingCashFlow: number | null
  capitalExpenditure: number | null
  freeCashFlow: number | null
}

function extractAnnual(field: unknown): Map<string, number> {
  const result = new Map<string, number>()
  if (!field || typeof field !== 'object') return result
  const units = (field as Record<string, unknown>).units as Record<string, unknown> | undefined
  if (!units) return result
  const usd = units['USD'] as Array<{ end: string; val: number; form: string; fp: string }> | undefined
  if (!usd) return result
  for (const item of usd) {
    if (item.form !== '10-K' || item.fp !== 'FY') continue
    const year = item.end.slice(0, 4)
    if (!result.has(year)) result.set(year, item.val)
  }
  return result
}

async function fetchEdgarFinancials(cik: string): Promise<FinancialData[]> {
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
    headers: { 'User-Agent': '1ai-nexus/1.0 (contact@1ai-nexus.com)' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) return []

  const data = await res.json() as Record<string, unknown>
  const facts = data.facts as Record<string, unknown>
  const gaap = facts['us-gaap'] as Record<string, unknown> | undefined
  if (!gaap) return []

  // Revenue: companies use different GAAP field names — merge all to get full history
  const revenue = new Map<string, number>()
  for (const field of ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet']) {
    const m = extractAnnual(gaap[field])
    for (const [year, val] of m) {
      if (!revenue.has(year)) revenue.set(year, val)
    }
  }

  const netIncome = extractAnnual(gaap.NetIncomeLoss)
  const assets = extractAnnual(gaap.Assets)
  const liabilities = extractAnnual(gaap.Liabilities)

  // Equity: some companies use the long form
  const equityMap = extractAnnual(gaap.StockholdersEquity)
  const equityAlt = extractAnnual(gaap['StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'])
  const equity = equityMap.size > 0 ? equityMap : equityAlt

  // Cash flow: some companies use different field names
  const operatingCFMap = extractAnnual(gaap.OperatingCashFlow)
  const operatingCFAlt = extractAnnual(gaap.NetCashProvidedByUsedInOperatingActivities)
  const operatingCF = operatingCFMap.size > 0 ? operatingCFMap : operatingCFAlt

  const capexMap = extractAnnual(gaap.PaymentsToAcquirePropertyPlantAndEquipment)
  const capexAlt = extractAnnual(gaap.CapitalExpenditure)
  const capex = capexMap.size > 0 ? capexMap : capexAlt

  const years = new Set<string>()
  for (const map of [revenue, netIncome, assets, liabilities, equity, operatingCF, capex]) {
    for (const year of map.keys()) years.add(year)
  }

  const result: FinancialData[] = []
  for (const year of [...years].sort().reverse()) {
    result.push({
      period: year,
      revenue: revenue.get(year) ?? null,
      netIncome: netIncome.get(year) ?? null,
      totalAssets: assets.get(year) ?? null,
      totalLiabilities: liabilities.get(year) ?? null,
      totalEquity: equity.get(year) ?? null,
      operatingCashFlow: operatingCF.get(year) ?? null,
      capitalExpenditure: capex.get(year) ?? null,
      freeCashFlow: (operatingCF.get(year) ?? 0) - (capex.get(year) ?? 0) || null,
    })
  }
  return result
}

// Cache
const cache = new Map<string, { data: FinancialData[]; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const ticker = (searchParams.get('ticker') ?? 'AAPL').toUpperCase()
  const company = COMPANIES[ticker]
  if (!company) {
    return apiJson(null, { error: `Unknown ticker: ${ticker}. Supported: ${Object.keys(COMPANIES).join(', ')}`, status: 400 })
  }

  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return apiJson({ ticker, name: company.name, financials: cached.data }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  }

  try {
    const financials = await fetchEdgarFinancials(company.cik)
    cache.set(ticker, { data: financials, ts: Date.now() })
    return apiJson({ ticker, name: company.name, financials }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch (err) {
    return apiJson(null, { error: (err as Error).message, status: 502 })
  }
}
