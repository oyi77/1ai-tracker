"use client"

import { TerminalShell } from "@/components/layout/TerminalShell"

export default function PredictionsLeaderboardPage() {
  return (
    <TerminalShell>
      <div className="p-4">
        <h1 className="text-sm font-mono font-bold text-accent-cyan mb-4">PREDICTION LEADERBOARD</h1>
        <p className="text-text-dim text-xs">Leaderboard data from Polymarket coming soon. Use /predictions for active markets.</p>
      </div>
    </TerminalShell>
  )
}
