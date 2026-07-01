"use client"

import { useState, useEffect } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface PackageStats {
  name: string
  ecosystem: string
  category: string
  downloads: number
  period: string
}

interface EcosystemSummary {
  ecosystem: string
  totalDownloads: number
  packageCount: number
  signal: string
}

interface DevActivity {
  packages: PackageStats[]
  ecosystemSummary: EcosystemSummary[]
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export default function DevActivityPage() {
  const [data, setData] = useState<DevActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/dev-activity')
        const d = await res.json()
        if (d.data) setData(d.data)
        setLoading(false)
      } catch { setLoading(false) }
    }
    fetchData()
  }, [])

  const maxDl = data?.packages[0]?.downloads ?? 1

  return (
    <NexusLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-accent-cyan">DEV ACTIVITY</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              npm download trends for crypto/blockchain packages — proxy for ecosystem growth
            </p>
          </div>
          <LiveDot status={loading ? 'stale' : 'live'} label />
        </div>

        {/* Ecosystem Summary */}
        {data && data.ecosystemSummary.length > 0 && (
          <Panel title="Ecosystem Summary" subtitle="Monthly downloads by ecosystem">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3">
              {data.ecosystemSummary.map((eco) => (
                <div key={eco.ecosystem} className="bg-bg-elevated rounded-lg p-3 border border-border-dim/30">
                  <p className="text-[10px] text-text-muted font-mono">{eco.ecosystem.toUpperCase()}</p>
                  <p className="text-lg font-mono font-bold">{fmtNum(eco.totalDownloads)}</p>
                  <p className="text-[9px] text-text-dim">{eco.packageCount} packages</p>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block ${
                    eco.signal === 'growing' ? 'bg-data-bull/20 text-data-bull' :
                    eco.signal === 'stable' ? 'bg-accent-amber/20 text-accent-amber' :
                    'bg-data-bear/20 text-data-bear'
                  }`}>{eco.signal}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Package Rankings */}
        {data && data.packages.length > 0 && (
          <Panel title="Package Rankings" subtitle={`${data.packages.length} tracked packages — monthly npm downloads`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border-dim">
                    <th className="text-left py-2 px-2 font-mono">#</th>
                    <th className="text-left py-2 px-2 font-mono">PACKAGE</th>
                    <th className="text-left py-2 px-2 font-mono">ECOSYSTEM</th>
                    <th className="text-left py-2 px-2 font-mono">CATEGORY</th>
                    <th className="text-right py-2 px-2 font-mono">DOWNLOADS</th>
                    <th className="text-left py-2 px-2 font-mono w-1/3">VOLUME</th>
                  </tr>
                </thead>
                <tbody>
                  {data.packages.map((pkg, i) => (
                    <tr key={pkg.name} className="border-b border-border-dim/30 hover:bg-bg-elevated">
                      <td className="py-2 px-2 text-text-dim">{i + 1}</td>
                      <td className="py-2 px-2 font-mono font-bold text-teal-vivid">{pkg.name}</td>
                      <td className="py-2 px-2">{pkg.ecosystem}</td>
                      <td className="py-2 px-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-raised text-text-muted">
                          {pkg.category}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{fmtNum(pkg.downloads)}</td>
                      <td className="py-2 px-2">
                        <div className="h-2 bg-bg-raised rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-cyan/60 rounded-full"
                            style={{ width: `${(pkg.downloads / maxDl) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Methodology */}
        <Panel title="Methodology" subtitle="How dev activity is measured">
          <div className="p-4 text-xs text-text-dim space-y-2">
            <p><strong className="text-text-primary">Data source:</strong> npm registry public API (api.npmjs.org) — monthly download counts.</p>
            <p><strong className="text-text-primary">Packages tracked:</strong> 17 crypto/blockchain packages across Ethereum, Solana, Polkadot, Cosmos, DeFi, Wallet, and Indexing ecosystems.</p>
            <p><strong className="text-text-primary">Signal:</strong> Growing npm downloads = more developers building = bullish for ecosystem. Declining = developers leaving.</p>
            <p><strong className="text-text-primary">Limitations:</strong> npm downloads include CI/CD bots. Trend over time is more meaningful than absolute numbers.</p>
          </div>
        </Panel>
      </div>
    </NexusLayout>
  )
}
