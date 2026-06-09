"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { PnlBadge } from "@/components/domain/pnl-badge";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { LiveFeed, type FeedItem } from "@/components/ui/LiveFeed";
import { cn, formatUsd, formatNumber, formatPercent, formatAddress } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  Bell,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  GripVertical,
  RefreshCw,
  Database,
} from "lucide-react";
import Link from "next/link";

function WidgetCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-lg border border-white/5 bg-bg-surface overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</h3>
        <GripVertical className="h-3.5 w-3.5 text-text-muted/40 cursor-grab" />
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

// ─── Data hooks ─────────────────────────────────────────────

interface DashboardData {
  tokens: Array<{ symbol: string; name: string; price: number; change24h: number; volume24h: number }>;
  smartMoney: Array<{ action: string; token: string; amount: string; wallet: string; timestamp: string }>;
  alerts: FeedItem[];
  entities: Array<{ name: string; type: string; totalUsdValue: number }>;
  defiProtocols: Array<{ name: string; chain: string; tvl: number; tvlChange24h: number }>;
  stats: { wallets: number; entities: number; signals: number; protocols: number };
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    tokens: [],
    smartMoney: [],
    alerts: [],
    entities: [],
    defiProtocols: [],
    stats: { wallets: 0, entities: 0, signals: 0, protocols: 0 },
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tokensRes, smartRes, alertsRes, entitiesRes, defiRes] = await Promise.allSettled([
        fetch("/api/tokens?pageSize=5&sort=volume24h").then((r) => r.json()),
        fetch("/api/smart-money?limit=4").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json()),
        fetch("/api/entities?pageSize=5&sort=totalUsdValue").then((r) => r.json()),
        fetch("/api/defi?limit=5&sort=tvl").then((r) => r.json()),
      ]);

      const tokens = tokensRes.status === "fulfilled" ? (tokensRes.value.data || []) : [];
      const smartMoneyData = smartRes.status === "fulfilled" ? (smartRes.value.data || []) : [];
      const alertsData = alertsRes.status === "fulfilled" ? (alertsRes.value.data || []) : [];
      const entitiesData = entitiesRes.status === "fulfilled" ? (entitiesRes.value.data || []) : [];
      const defiData = defiRes.status === "fulfilled" ? (defiRes.value.data || []) : [];

      const feedItems: FeedItem[] = alertsData.slice(0, 6).map((a: Record<string, unknown>, i: number) => ({
        id: String(a.id ?? i),
        title: String(a.triggerType ?? "Alert"),
        description: String(a.conditions ?? "Custom alert triggered"),
        timestamp: new Date(String(a.lastFired ?? a.createdAt ?? Date.now())),
        type: (a.triggerType === "whale_transfer" ? "warning" : "info") as FeedItem["type"],
      }));

      const smartMoney = smartMoneyData.map((s: Record<string, unknown>) => ({
        action: String(s.category ?? "Signal"),
        token: String(s.score ?? ""),
        amount: `Score: ${Number(s.score ?? 0).toFixed(1)}`,
        wallet: formatAddress(String(s.walletId ?? "")),
        timestamp: String(s.addedAt ?? ""),
      }));

      setData({
        tokens: tokens.map((t: Record<string, unknown>) => ({
          symbol: String(t.symbol ?? ""),
          name: String(t.name ?? ""),
          price: Number(t.price ?? 0),
          change24h: Number(t.change24h ?? 0),
          volume24h: Number(t.volume24h ?? 0),
        })),
        smartMoney,
        alerts: feedItems.length > 0 ? feedItems : [
          { id: "default", title: "System Ready", description: "Add wallets and tokens to start tracking", timestamp: new Date(), type: "info" },
        ],
        entities: entitiesData.map((e: Record<string, unknown>) => ({
          name: String(e.name ?? ""),
          type: String(e.type ?? ""),
          totalUsdValue: Number(e.totalUsdValue ?? 0),
        })),
        defiProtocols: defiData.map((p: Record<string, unknown>) => ({
          name: String(p.name ?? ""),
          chain: String(p.chain ?? ""),
          tvl: Number(p.tvl ?? 0),
          tvlChange24h: Number(p.tvlChange24h ?? 0),
        })),
        stats: {
          wallets: tokensRes.status === "fulfilled" ? (tokensRes.value.meta?.total ?? 0) : 0,
          entities: entitiesRes.status === "fulfilled" ? (entitiesRes.value.meta?.total ?? 0) : 0,
          signals: smartRes.status === "fulfilled" ? (smartRes.value.meta?.total ?? 0) : 0,
          protocols: defiRes.status === "fulfilled" ? (defiRes.value.meta?.total ?? 0) : 0,
        },
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

// ─── Dashboard Page ─────────────────────────────────────────

export default function DashboardPage() {
  const { data, loading, refetch } = useDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Command Center"
          description="Real-time onchain intelligence at a glance"
          actions={<ConnectionStatus connected label="Live" />}
        />
        <div className="flex items-center gap-2">
          <Link
            href="/data-sources"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <Database className="h-3.5 w-3.5" />
            Sources
          </Link>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Tokens Tracked" value={String(data.stats.wallets || "—")} change={0} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Entities" value={String(data.stats.entities || "—")} change={0} icon={<Bell className="h-4 w-4" />} />
        <StatCard label="Smart Money Signals" value={String(data.stats.signals || "—")} change={0} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="DeFi Protocols" value={String(data.stats.protocols || "—")} change={0} icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Market + Top Movers */}
      <div className="grid grid-cols-3 gap-4">
        <WidgetCard title="Market Overview" className="col-span-2">
          {data.tokens.length > 0 ? (
            <div className="space-y-3">
              {data.tokens.map((t) => (
                <div key={t.symbol} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{t.symbol}</span>
                    <span className="ml-2 text-xs text-text-muted">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-text-primary">
                      {t.price > 0 ? formatUsd(t.price) : "—"}
                    </span>
                    <PnlBadge value={t.change24h} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">
              {loading ? "Loading tokens..." : "No tokens tracked yet. Run the seed script."}
            </p>
          )}
        </WidgetCard>

        <WidgetCard title="Top DeFi Protocols">
          {data.defiProtocols.length > 0 ? (
            <div className="space-y-2">
              {data.defiProtocols.slice(0, 5).map((p) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{p.name}</span>
                    <span className="ml-2 text-[10px] font-mono text-text-muted">{p.chain}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-text-primary">{formatNumber(p.tvl)}</span>
                    <PnlBadge value={p.tvlChange24h} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">
              {loading ? "Loading..." : "No DeFi data yet."}
            </p>
          )}
        </WidgetCard>
      </div>

      {/* Feed + Smart Money + Entities */}
      <div className="grid grid-cols-3 gap-4">
        <WidgetCard title="Live Alert Feed" className="col-span-1">
          <LiveFeed items={data.alerts} maxHeight={320} />
        </WidgetCard>

        <WidgetCard title="Smart Money Activity" className="col-span-1">
          {data.smartMoney.length > 0 ? (
            <div className="space-y-3">
              {data.smartMoney.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-mono rounded px-1.5 py-0.5",
                      item.action === "Bought" ? "bg-accent-green/10 text-accent-green"
                        : item.action === "Sold" ? "bg-danger/10 text-danger"
                        : "bg-accent-cyan/10 text-accent-cyan"
                    )}>
                      {item.action}
                    </span>
                    <span className="text-sm text-text-primary">{item.token}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-text-primary">{item.amount}</p>
                    <p className="text-[10px] font-mono text-text-muted">{item.wallet}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">
              {loading ? "Loading..." : "No smart money signals yet."}
            </p>
          )}
        </WidgetCard>

        <WidgetCard title="Top Entities" className="col-span-1">
          {data.entities.length > 0 ? (
            <div className="space-y-3">
              {data.entities.slice(0, 5).map((e) => (
                <div key={e.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{e.name}</p>
                    <p className="text-[10px] text-text-muted">{e.type}</p>
                  </div>
                  <span className="text-xs font-mono text-text-primary">{formatUsd(e.totalUsdValue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">
              {loading ? "Loading..." : "No entities tracked yet."}
            </p>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
