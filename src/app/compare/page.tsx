"use client"

import { useState } from "react"
import { TerminalShell } from "@/components/layout/TerminalShell"

export default function ComparePage() {
  const [addresses, setAddresses] = useState("")
  const [results, setResults] = useState<Array<{ address: string; entity: string | null; txCount: number }>>([])
  const [loading, setLoading] = useState(false)

  const compare = async () => {
    const addrs = addresses.split(/[\s,]+/).filter(a => a.startsWith("0x"))
    if (addrs.length < 2) return
    setLoading(true)
    const res = await Promise.allSettled(
      addrs.map(a => fetch(`/api/v1/smart-money/wallet?address=${a}`).then(r => r.json()))
    )
    setResults(res.map((r, i) => ({
      address: addrs[i],
      entity: r.status === "fulfilled" ? r.value.entity?.label ?? null : null,
      txCount: r.status === "fulfilled" ? r.value.txCount ?? 0 : 0,
    })))
    setLoading(false)
  }

  return (
    <TerminalShell>
      <div className="p-4 space-y-4">
        <h1 className="text-sm font-mono font-bold text-accent-cyan">COMPARE WALLETS</h1>
        <textarea
          value={addresses}
          onChange={e => setAddresses(e.target.value)}
          placeholder="Paste 2+ ETH addresses, one per line or comma-separated"
          className="w-full h-32 bg-bg-panel border border-border-dim rounded p-3 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
        />
        <button onClick={compare} disabled={loading} className="px-4 py-1.5 bg-accent-cyan/20 text-accent-cyan text-xs font-mono rounded border border-accent-cyan/30 disabled:opacity-50">
          {loading ? "Comparing..." : "COMPARE"}
        </button>
        {results.length > 0 && (
          <table className="w-full text-xs">
            <thead><tr className="text-text-muted border-b border-border-dim"><th className="text-left py-2 px-2">ADDRESS</th><th className="text-left py-2 px-2">ENTITY</th><th className="text-right py-2 px-2">TX COUNT</th></tr></thead>
            <tbody>{results.map(r => <tr key={r.address} className="border-t border-border-dim/30"><td className="py-2 px-2 font-mono">{r.address.slice(0,10)}...</td><td className="py-2 px-2 text-accent-green">{r.entity ?? "Unknown"}</td><td className="py-2 px-2 text-right">{r.txCount}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </TerminalShell>
  )
}
