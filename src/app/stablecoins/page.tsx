"use client"
import { TerminalShell } from "@/components/layout/TerminalShell"
export default function StablecoinsPage() {
  return <TerminalShell><div className="p-4"><h1 className="text-sm font-mono font-bold text-accent-cyan mb-4">STABLECOINS</h1><p className="text-text-dim text-xs">Stablecoin data available via DeFiLlama module. Use /defi for DeFi overview.</p></div></TerminalShell>
}
