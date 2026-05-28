"use client";

import { useState, useMemo } from "react";
import { cn, formatUsd, formatPercent, formatRelativeTime, getEntityTypeColor } from "@/lib/utils";
import { PageHeader } from "@/components/domain/page-header";
import { EntityBadge } from "@/components/domain/entity-badge";
import { RiskScore } from "@/components/domain/risk-score";
import { PnlBadge } from "@/components/domain/pnl-badge";
import { EntityCard } from "@/components/entity/EntityCard";
import { mockEntities, type Entity } from "@/lib/mock/entities";
import {
  ArrowUpDown,
  LayoutGrid,
  List,
  Search,
  Filter,
  Star,
  X,
} from "lucide-react";

type SortKey = "totalValue" | "change24h" | "pnl7d" | "lastActive" | "name";
type SortDir = "asc" | "desc";

const entityTypes = ["Exchange", "Whale", "Fund", "Protocol", "Government", "Unknown"];
const chainOptions = ["ethereum", "bitcoin", "solana", "arbitrum", "optimism", "base"];

export default function EntitiesPage() {
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [chainFilter, setChainFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleType = (t: string) => {
    setTypeFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const toggleChain = (c: string) => {
    setChainFilter((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = [...mockEntities];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q))
      );
    }

    if (typeFilter.length > 0) {
      list = list.filter((e) => typeFilter.includes(e.type));
    }

    if (chainFilter.length > 0) {
      list = list.filter((e) => chainFilter.some((c) => e.chains.includes(c)));
    }

    list.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "lastActive") return mul * (new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime());
      return mul * (a[sortKey] - b[sortKey]);
    });

    return list;
  }, [search, typeFilter, chainFilter, sortKey, sortDir]);

  const sortHeaders: { key: SortKey; label: string; align?: string }[] = [
    { key: "name", label: "Entity" },
    { key: "totalValue", label: "Total Value", align: "text-right" },
    { key: "change24h", label: "24h Change", align: "text-right" },
    { key: "pnl7d", label: "7d PNL", align: "text-right" },
    { key: "lastActive", label: "Last Active", align: "text-right" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <PageHeader
        title="Entities"
        description="Browse and analyze onchain entities"
        actions={
          selected.size > 0 ? (
            <button className="flex items-center gap-1.5 rounded-md bg-accent-cyan/10 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/20 transition-colors">
              <Star className="h-3.5 w-3.5" />
              Watch {selected.size} Selected
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md bg-bg-surface px-3 py-2">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-text-muted hover:text-text-primary">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {entityTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                typeFilter.includes(t)
                  ? "text-text-primary"
                  : "bg-bg-elevated/50 text-text-muted hover:text-text-primary"
              )}
              style={
                typeFilter.includes(t)
                  ? { backgroundColor: getEntityTypeColor(t) + "20", color: getEntityTypeColor(t) }
                  : undefined
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {chainOptions.map((c) => (
            <button
              key={c}
              onClick={() => toggleChain(c)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-colors",
                chainFilter.includes(c)
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : "bg-bg-elevated/50 text-text-muted hover:text-text-primary"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setView("table")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "table" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "grid" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="overflow-x-auto rounded-lg border border-white/5 bg-bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(filtered.map((f) => f.slug)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                    className="accent-accent-cyan"
                  />
                </th>
                {sortHeaders.map((h) => (
                  <th
                    key={h.key}
                    onClick={() => toggleSort(h.key)}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted select-none",
                      h.align
                    )}
                  >
                    <span className={cn("inline-flex items-center gap-1", h.align === "text-right" && "flex-row-reverse")}>
                      {h.label}
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Risk</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Chains</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entity) => (
                <tr
                  key={entity.slug}
                  className="border-b border-white/[0.03] hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                  onClick={() => (window.location.href = `/entity/${entity.slug}`)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(entity.slug)}
                      onChange={() => toggleSelect(entity.slug)}
                      className="accent-accent-cyan"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <EntityBadge name={entity.name} type={entity.type} verified={entity.verified} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm text-text-primary">
                    {formatUsd(entity.totalValue)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <PnlBadge value={entity.change24h} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <PnlBadge value={entity.pnl7d} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-text-muted">
                    {formatRelativeTime(entity.lastActive)}
                  </td>
                  <td className="px-3 py-2.5">
                    <RiskScore score={entity.riskScore} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      {entity.chains.slice(0, 3).map((c) => (
                        <span key={c} className="rounded bg-bg-elevated px-1 py-0.5 text-[9px] uppercase text-text-muted">
                          {c}
                        </span>
                      ))}
                      {entity.chains.length > 3 && (
                        <span className="text-[9px] text-text-muted">+{entity.chains.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((entity) => (
            <div key={entity.slug} className="relative">
              <input
                type="checkbox"
                checked={selected.has(entity.slug)}
                onChange={() => toggleSelect(entity.slug)}
                className="absolute left-2 top-2 z-10 accent-accent-cyan"
              />
              <a href={`/entity/${entity.slug}`}>
                <EntityCard entity={entity} />
              </a>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-white/5 bg-bg-surface">
          <p className="text-sm text-text-muted">No entities match your filters</p>
        </div>
      )}
    </div>
  );
}
