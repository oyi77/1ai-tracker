"use client";

import { useState } from "react";
import { cn, formatUsd, formatNumber, formatPercent } from "@/lib/utils";
import { useApi } from "@/lib/hooks/use-api";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SectorToken {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
}

interface SectorData {
  id: string;
  name: string;
  tokens: SectorToken[];
  avgChange24h: number;
  totalMarketCap: number;
  topGainer: { name: string; symbol: string; change24h: number };
  topLoser: { name: string; symbol: string; change24h: number };
}

interface SectorsResponse {
  sectors: SectorData[];
  summary: {
    totalMarketCap: number;
    bestSector: string;
    worstSector: string;
  };
}

function changeColor(value: number): string {
  if (value >= 5) return "bg-emerald-500/30 text-emerald-400";
  if (value >= 2) return "bg-emerald-500/20 text-emerald-400";
  if (value >= 0) return "bg-emerald-500/10 text-emerald-400";
  if (value >= -2) return "bg-red-500/10 text-red-400";
  if (value >= -5) return "bg-red-500/20 text-red-400";
  return "bg-red-500/30 text-red-400";
}

function bgIntensity(value: number): string {
  const abs = Math.min(Math.abs(value), 10);
  const alpha = (abs / 10) * 0.25 + 0.05;
  if (value >= 0) {
    return `rgba(16, 185, 129, ${alpha})`;
  }
  return `rgba(239, 68, 68, ${alpha})`;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 bg-white/10 rounded" />
            <div className="h-6 w-20 bg-white/10 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-4 w-28 bg-white/10 rounded" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-3 w-16 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SectorHeatmap() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, loading, error } = useApi<SectorsResponse>("/v1/sectors", {
    refreshInterval: 120_000,
  });

  if (loading && !data) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load sector data
      </div>
    );
  }

  if (!data) return null;

  const { sectors, summary } = data;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
        <span className="text-white/60">Total Market Cap:</span>
        <span className="font-medium text-white">{formatUsd(summary.totalMarketCap)}</span>
        <span className="text-white/30">|</span>
        <span className="text-white/60">Best:</span>
        <span className="font-medium text-emerald-400">{summary.bestSector}</span>
        <span className="text-white/30">|</span>
        <span className="text-white/60">Worst:</span>
        <span className="font-medium text-red-400">{summary.worstSector}</span>
      </div>

      {/* Sector grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectors.map((sector) => {
          const isOpen = expanded === sector.id;
          return (
            <div
              key={sector.id}
              className="rounded-xl border border-white/10 overflow-hidden transition-all"
              style={{ backgroundColor: bgIntensity(sector.avgChange24h) }}
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : sector.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{sector.name}</h3>
                    <span className="text-xs text-white/50">
                      {sector.tokens.length} tokens
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-medium",
                        changeColor(sector.avgChange24h)
                      )}
                    >
                      {formatPercent(sector.avgChange24h)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-white/50" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/50" />
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-white/50">
                    MCap: <span className="text-white/80">{formatNumber(sector.totalMarketCap)}</span>
                  </span>
                  <div className="flex gap-4">
                    <span className="text-emerald-400">
                      ▲ {sector.topGainer.symbol} {formatPercent(sector.topGainer.change24h)}
                    </span>
                    <span className="text-red-400">
                      ▼ {sector.topLoser.symbol} {formatPercent(sector.topLoser.change24h)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded token list */}
              {isOpen && (
                <div className="border-t border-white/10 px-5 pb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/40 text-xs">
                        <th className="pb-2 pt-3 font-medium">Token</th>
                        <th className="pb-2 pt-3 font-medium text-right">Price</th>
                        <th className="pb-2 pt-3 font-medium text-right">24h</th>
                        <th className="pb-2 pt-3 font-medium text-right">MCap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sector.tokens.map((token) => (
                        <tr
                          key={token.symbol}
                          className="border-t border-white/5"
                        >
                          <td className="py-2">
                            <div className="font-medium text-white">{token.name}</div>
                            <div className="text-xs text-white/40">{token.symbol}</div>
                          </td>
                          <td className="py-2 text-right text-white/80">
                            {formatUsd(token.price)}
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                changeColor(token.change24h)
                              )}
                            >
                              {formatPercent(token.change24h)}
                            </span>
                          </td>
                          <td className="py-2 text-right text-white/60">
                            {formatNumber(token.marketCap)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
