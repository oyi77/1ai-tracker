"use client";

import { useMemo } from "react";
import { generateTrades } from "@/lib/predictions/mock-data";
import { TradeFeed } from "@/components/predictions/TradeFeed";
import { PageHeader } from "@/components/domain/page-header";
import { Activity } from "lucide-react";

export default function TapePage() {
  const trades = useMemo(() => generateTrades(200), []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Live Trade Tape"
        description="Real-time streaming feed of all prediction market trades."
        actions={
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted">{trades.length} recent trades</span>
          </div>
        }
      />

      <div className="rounded-lg border border-white/5 bg-bg-surface">
        <TradeFeed trades={trades} autoScroll showFilters className="h-[calc(100vh-180px)]" />
      </div>
    </div>
  );
}
