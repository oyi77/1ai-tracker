"use client"

import { useState, useEffect } from "react"
import { TerminalShell } from "@/components/layout/TerminalShell"
import { useParams } from "next/navigation"

export default function WalletPage() {
  const params = useParams()
  const address = params?.address as string
  const [data, setData] = useState<{ entity: { label: string; category: string } | null; txCount: number; tokenTransferCount: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address) return
    fetch(`/api/v1/smart-money/wallet?address=${address}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [address])

  return (
    <TerminalShell>
      <div className="p-4 space-y-4">
        <h1 className="text-sm font-mono font-bold text-accent-cyan">WALLET PROFILER</h1>
        <p className="text-xs font-mono text-text-dim">{address}</p>
        {loading ? <p className="text-text-dim text-xs">Loading...</p> : data && (
          <div className="bg-bg-panel border border-border-dim rounded p-4 space-y-2">
            {data.entity ? (
              <p className="text-lg font-mono text-accent-green">{data.entity.label} <span className="text-xs text-text-dim">({data.entity.category})</span></p>
            ) : <p className="text-text-dim text-xs">Unknown entity</p>}
            <p className="text-xs text-text-dim">Transactions: <span className="text-text-primary font-mono">{data.txCount}</span></p>
            <p className="text-xs text-text-dim">Token transfers: <span className="text-text-primary font-mono">{data.tokenTransferCount}</span></p>
          </div>
        )}
      </div>
    </TerminalShell>
  )
}
