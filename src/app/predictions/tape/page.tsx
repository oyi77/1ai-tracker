"use client"

import { TerminalShell } from "@/components/layout/TerminalShell"

export default function PredictionsTapePage() {
  return (
    <TerminalShell>
      <div className="p-4">
        <h1 className="text-sm font-mono font-bold text-accent-cyan mb-4">PREDICTION TAPE</h1>
        <p className="text-text-dim text-xs">Real-time prediction market trade tape coming soon. Use /predictions for active markets.</p>
      </div>
    </TerminalShell>
  )
}
