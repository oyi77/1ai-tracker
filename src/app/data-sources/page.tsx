"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { cn } from "@/lib/utils";
import { Activity, CheckCircle, XCircle, RefreshCw, Database, Globe, Zap, TrendingUp, BarChart3, MessageSquare } from "lucide-react";

interface DataSource {
  name: string;
  category: string;
  available: boolean;
  details: Record<string, unknown>;
  latencyMs?: number;
}

interface DataSourcesResponse {
  sources: DataSource[];
  byCategory: Record<string, DataSource[]>;
  summary: { total: number; available: number; unavailable: number; coverage: string };
}

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  DeFi: TrendingUp,
  DEX: Zap,
  Market: BarChart3,
  Pricing: Activity,
  Social: MessageSquare,
  RPC: Database,
  Solana: Database,
  Explorer: Globe,
  Predictions: BarChart3,
  Bitcoin: Database,
  NFT: Globe,
};

const CATEGORY_COLORS: Record<string, string> = {
  DeFi: "text-blue-400",
  DEX: "text-green-400",
  Market: "text-yellow-400",
  Pricing: "text-cyan-400",
  Social: "text-purple-400",
  RPC: "text-orange-400",
  Solana: "text-purple-400",
  Explorer: "text-blue-400",
  Predictions: "text-pink-400",
  Bitcoin: "text-orange-400",
  NFT: "text-pink-400",
};

function StatusDot({ available }: { available: boolean }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", available ? "bg-green-500" : "bg-red-500")} />;
}

function SourceCard({ source }: { source: DataSource }) {
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-colors",
      source.available ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-bg-surface"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusDot available={source.available} />
          <span className="font-medium text-text-primary">{source.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted">{source.category}</span>
        </div>
        {source.latencyMs !== undefined && (
          <span className="text-xs text-text-secondary">{source.latencyMs}ms</span>
        )}
      </div>
      <div className="space-y-1">
        {Object.entries(source.details).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-text-secondary capitalize">{key.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
            <span className="text-text-primary font-mono text-xs">
              {typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? value.join(", ") || "—" : String(value ?? "—")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataSourcesPage() {
  const [data, setData] = useState<DataSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/data-sources");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <PageHeader title="Data Sources" description="Real-time status of all integrated data providers" />
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors text-sm"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400"><XCircle className="h-4 w-4" /><span>{error}</span></div>
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-center gap-2 mb-1"><Database className="h-4 w-4 text-blue-400" /><span className="text-sm text-text-secondary">Total</span></div>
                <span className="text-2xl font-bold text-text-primary">{data.summary.total}</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-green-400" /><span className="text-sm text-text-secondary">Available</span></div>
                <span className="text-2xl font-bold text-green-400">{data.summary.available}</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-center gap-2 mb-1"><XCircle className="h-4 w-4 text-red-400" /><span className="text-sm text-text-secondary">Offline</span></div>
                <span className="text-2xl font-bold text-red-400">{data.summary.unavailable}</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-center gap-2 mb-1"><Globe className="h-4 w-4 text-purple-400" /><span className="text-sm text-text-secondary">Coverage</span></div>
                <span className="text-2xl font-bold text-text-primary">{data.summary.coverage}</span>
              </div>
            </div>

            {/* By Category */}
            {Object.entries(data.byCategory).map(([category, sources]) => {
              const Icon = CATEGORY_ICONS[category] || Activity;
              const color = CATEGORY_COLORS[category] || "text-text-primary";
              return (
                <div key={category} className="mb-8">
                  <h2 className={cn("text-lg font-semibold mb-4 flex items-center gap-2", color)}>
                    <Icon className="h-5 w-5" />
                    {category}
                    <span className="text-xs font-normal text-text-muted ml-2">
                      {sources.filter((s) => s.available).length}/{sources.length} online
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sources.map((source) => (
                      <SourceCard key={source.name} source={source} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}
      </div>
    </div>
  );
}
