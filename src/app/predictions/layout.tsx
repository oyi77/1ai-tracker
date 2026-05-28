import { type ReactNode } from "react";

export default function PredictionsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-40 flex items-center gap-6 border-b border-white/5 bg-bg-primary/80 px-6 py-3 backdrop-blur-md">
        <a href="/predictions" className="text-sm font-semibold text-accent-cyan">
          Predictions
        </a>
        <a href="/predictions/tape" className="text-sm text-text-muted transition-colors hover:text-text-primary">
          Trade Tape
        </a>
        <a href="/predictions/leaderboard" className="text-sm text-text-muted transition-colors hover:text-text-primary">
          Leaderboard
        </a>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 animate-[live-dot_2s_ease-in-out_infinite] rounded-full bg-accent-green" />
          <span className="text-[10px] text-text-muted">LIVE</span>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
