"use client"
import { TerminalShell } from "@/components/layout/TerminalShell"
export default function FearGreedPage() {
  return <TerminalShell><div className="p-4"><h1 className="text-sm font-mono font-bold text-accent-cyan mb-4">FEAR & GREED INDEX</h1><p className="text-text-dim text-xs">Fear & Greed data is available on the main terminal page and via /api/v1/market/sentiment.</p></div></TerminalShell>
}
