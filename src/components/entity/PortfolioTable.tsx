"use client";

import { useState, useMemo } from "react";
import { cn, formatUsd, formatNumber, formatPercent } from "@/lib/utils";
import { PnlBadge } from "@/components/domain/pnl-badge";
import type { TokenHolding } from "@/lib/mock/entities";
import { ArrowUpDown } from "lucide-react";

interface PortfolioTableProps {
  holdings: TokenHolding[];
  className?: string;
}

type SortKey = "token" | "amount" | "usdValue" | "percent" | "change24h";
type SortDir = "asc" | "desc";

export function PortfolioTable({ holdings, className }: PortfolioTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("usdValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "token") return mul * a.token.localeCompare(b.token);
      return mul * (a[sortKey] - b[sortKey]);
    });
  }, [holdings, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const headers: { key: SortKey; label: string; align?: string }[] = [
    { key: "token", label: "Token" },
    { key: "amount", label: "Amount", align: "text-right" },
    { key: "usdValue", label: "USD Value", align: "text-right" },
    { key: "percent", label: "%", align: "text-right" },
    { key: "change24h", label: "24h Change", align: "text-right" },
  ];

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {headers.map((h) => (
              <th
                key={h.key}
                onClick={() => toggleSort(h.key)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted select-none",
                  h.align
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {h.label}
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr
              key={h.symbol + h.chain}
              className="border-b border-white/[0.03] hover:bg-bg-elevated/50 transition-colors"
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{h.symbol}</span>
                  <span className="text-xs text-text-muted">{h.token}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm text-text-primary">
                {formatNumber(h.amount)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm text-text-primary">
                {formatUsd(h.usdValue)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm text-text-muted">
                {h.percent.toFixed(1)}%
              </td>
              <td className="px-3 py-2.5 text-right">
                <PnlBadge value={h.change24h} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
