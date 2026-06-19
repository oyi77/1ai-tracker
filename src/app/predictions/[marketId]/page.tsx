"use client"

import { TerminalShell } from "@/components/layout/TerminalShell"
import { useParams } from "next/navigation"

export default function PredictionMarketPage() {
  const params = useParams()
  const marketId = params?.marketId as string

  return (
    <TerminalShell>
      <div className="p-4">
        <h1 className="text-sm font-mono font-bold text-accent-cyan mb-2">PREDICTION MARKET</h1>
        <p className="text-xs font-mono text-text-dim mb-4">{marketId}</p>
        <p className="text-text-dim text-xs">Market detail view coming soon. Use /predictions for active markets from Polymarket.</p>
      </div>
    </TerminalShell>
  )
}
