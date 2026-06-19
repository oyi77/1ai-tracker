"use client"

import { useState, useEffect } from "react"
import { TerminalShell } from "@/components/layout/TerminalShell"
import { useParams } from "next/navigation"

export default function TokenPage() {
  const params = useParams()
  const address = params?.address as string
  const [data, setData] = useState<{ name?: string; symbol?: string; price?: number; volume24h?: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address) return
    fetch(`/api/v1/modules/fetch?module=geckoterminal&action=token&network=eth&address=${address}`)
      .then(r => r.json())
      .then(d => { setData(d.data?.attributes ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [address])

  return (
    <TerminalShell>
      <div className="p-4 space-y-4">
        <h1 className="text-sm font-mono font-bold text-accent-cyan">TOKEN</h1>
        <p className="text-xs font-mono text-text-dim">{address}</p>
        {loading ? <p className="text-text-dim text-xs">Loading from GeckoTerminal...</p> : data ? (
          <div className="bg-bg-panel border border-border-dim rounded p-4 space-y-2">
            <p className="text-lg font-mono text-text-primary">{data.symbol ?? "Unknown"}</p>
            <p className="text-xs text-text-dim">{data.name ?? ""}</p>
          </div>
        ) : <p className="text-text-dim text-xs">Token not found</p>}
      </div>
    </TerminalShell>
  )
}
