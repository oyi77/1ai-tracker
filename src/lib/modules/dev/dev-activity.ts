// ─────────────────────────────────────────────────────────────
// Dev Activity Intelligence Module
// Tracks npm/PyPI download trends for crypto/blockchain packages
// Proxy for developer ecosystem growth
// Zero API keys — public npm/PyPI stats APIs
// ─────────────────────────────────────────────────────────────

export interface PackageStats {
  name: string
  ecosystem: string
  category: 'layer1' | 'defi' | 'tooling' | 'wallet' | 'infra'
  downloads: number
  period: string
}

export interface DevActivitySnapshot {
  packages: PackageStats[]
  ecosystemSummary: Array<{
    ecosystem: string
    totalDownloads: number
    packageCount: number
    signal: 'growing' | 'stable' | 'declining'
  }>
  timestamp: string
}

// Crypto/blockchain packages to track
const TRACKED_PACKAGES: Array<{ name: string; ecosystem: string; category: PackageStats['category'] }> = [
  // Ethereum
  { name: 'ethers', ecosystem: 'Ethereum', category: 'tooling' },
  { name: 'viem', ecosystem: 'Ethereum', category: 'tooling' },
  { name: 'wagmi', ecosystem: 'Ethereum', category: 'wallet' },
  { name: 'hardhat', ecosystem: 'Ethereum', category: 'tooling' },
  { name: '@ethereumjs/common', ecosystem: 'Ethereum', category: 'infra' },
  { name: 'web3', ecosystem: 'Ethereum', category: 'tooling' },
  // Solana
  { name: '@solana/web3.js', ecosystem: 'Solana', category: 'tooling' },
  { name: '@coral-xyz/anchor', ecosystem: 'Solana', category: 'tooling' },
  { name: '@metaplex-foundation/umi', ecosystem: 'Solana', category: 'infra' },
  // Polkadot
  { name: '@polkadot/api', ecosystem: 'Polkadot', category: 'tooling' },
  // Cosmos
  { name: '@cosmjs/stargate', ecosystem: 'Cosmos', category: 'tooling' },
  // DeFi
  { name: '@uniswap/v3-sdk', ecosystem: 'DeFi', category: 'defi' },
  { name: '@aave/contract-helpers', ecosystem: 'DeFi', category: 'defi' },
  // Wallet
  { name: '@rainbow-me/rainbowkit', ecosystem: 'Wallet', category: 'wallet' },
  { name: '@web3modal/ethers', ecosystem: 'Wallet', category: 'wallet' },
  // Indexing
  { name: '@subsquid/squid-sdk', ecosystem: 'Indexing', category: 'infra' },
  { name: 'subgraph', ecosystem: 'Indexing', category: 'infra' },
]

async function fetchNpmDownloads(pkgName: string): Promise<number> {
  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkgName)}`, {
      headers: { 'User-Agent': 'NEXUS-T/1.0' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return 0
    const data = await res.json() as { downloads?: number }
    return data.downloads ?? 0
  } catch { return 0 }
}

async function fetchPyPIDownloads(pkgName: string): Promise<number> {
  try {
    const res = await fetch(`https://pypistats.org/api/packages/${encodeURIComponent(pkgName)}/recent`, {
      headers: { 'User-Agent': 'NEXUS-T/1.0' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return 0
    const data = await res.json() as { data?: { last_month?: number } }
    return data.data?.last_month ?? 0
  } catch { return 0 }
}

export async function fetchDevActivity(): Promise<DevActivitySnapshot> {
  // Fetch all npm packages in parallel
  const results = await Promise.allSettled(
    TRACKED_PACKAGES.map(async (pkg) => {
      const downloads = await fetchNpmDownloads(pkg.name)
      return { ...pkg, downloads, period: 'last-month' } as PackageStats
    })
  )

  const packages = results
    .filter((r): r is PromiseFulfilledResult<PackageStats> => r.status === 'fulfilled' && r.value.downloads > 0)
    .map(r => r.value)
    .sort((a, b) => b.downloads - a.downloads)

  // Aggregate by ecosystem
  const ecosystemMap = new Map<string, { total: number; count: number }>()
  for (const pkg of packages) {
    const existing = ecosystemMap.get(pkg.ecosystem) ?? { total: 0, count: 0 }
    existing.total += pkg.downloads
    existing.count++
    ecosystemMap.set(pkg.ecosystem, existing)
  }

  const ecosystemSummary = Array.from(ecosystemMap.entries())
    .map(([ecosystem, stats]) => ({
      ecosystem,
      totalDownloads: stats.total,
      packageCount: stats.count,
      signal: stats.total > 1_000_000 ? 'growing' as const
        : stats.total > 100_000 ? 'stable' as const
        : 'declining' as const,
    }))
    .sort((a, b) => b.totalDownloads - a.totalDownloads)

  return {
    packages,
    ecosystemSummary,
    timestamp: new Date().toISOString(),
  }
}
