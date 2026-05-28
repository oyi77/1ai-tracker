"use client";

import { useState, useMemo } from "react";
import { cn, formatUsd, formatRelativeTime, getChainColor, getEntityTypeColor } from "@/lib/utils";
import { SignalStrength } from "./SignalStrength";
import type { SmartMoneyEvent, ActionType, EntityCategory } from "@/lib/mock-data";
import { chains, actionTypes, entityCategories } from "@/lib/mock-data";

interface SmartMoneyFeedProps {
  events: SmartMoneyEvent[];
}

const actionColors: Record<string, string> = {
  Accumulated: "text-accent-green",
  Exited: "text-danger",
  Bridged: "text-accent-cyan",
  Staked: "text-[#8B5CF6]",
  Unstaked: "text-warning",
  "Provided Liquidity": "text-accent-green",
  "Removed Liquidity": "text-danger",
  Swapped: "text-accent-cyan",
};

export function SmartMoneyFeed({ events }: SmartMoneyFeedProps) {
  const [chainFilter, setChainFilter] = useState<string>("All");
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [minUsd, setMinUsd] = useState<number>(0);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (chainFilter !== "All" && e.chain !== chainFilter) return false;
      if (actionFilter !== "All" && e.action !== actionFilter) return false;
      if (categoryFilter !== "All" && e.entityCategory !== categoryFilter) return false;
      if (e.usdValue < minUsd) return false;
      return true;
    });
  }, [events, chainFilter, actionFilter, categoryFilter, minUsd]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
        >
          <option value="All">All Chains</option>
          {chains.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
        >
          <option value="All">All Actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
        >
          <option value="All">All Categories</option>
          {entityCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min USD value"
          value={minUsd || ""}
          onChange={(e) => setMinUsd(Number(e.target.value) || 0)}
          className="w-40 rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-cyan"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-bg-elevated/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Token</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Chain</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">Signal</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((event) => (
              <tr
                key={event.id}
                className="border-b border-white/[0.03] transition-colors hover:bg-bg-elevated/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: getEntityTypeColor(event.entityCategory) }}
                    />
                    <span className="font-medium text-text-primary">{event.entity}</span>
                    <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                      {event.entityCategory}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("font-medium", actionColors[event.action] || "text-text-primary")}>
                    {event.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text-primary">{event.tokenSymbol}</span>
                  <span className="ml-1.5 text-xs text-text-muted">{event.token}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-mono text-text-primary">{formatUsd(event.usdValue)}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: getChainColor(event.chain) }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: getChainColor(event.chain) }}
                    />
                    {event.chain}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <SignalStrength walletCount={event.walletCount} />
                </td>
                <td className="px-4 py-3 text-right text-xs text-text-muted">
                  {formatRelativeTime(event.timestamp)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                  No events match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
