"use client";

import { useApi } from "@/lib/hooks/use-api";
import { cn, formatUsd, formatPercent } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Globe,
  BarChart3,
  Activity,
  Bitcoin,
  Gem,
  Fuel,
  CircleDollarSign,
  Minus,
} from "lucide-react";

// ─── Types (mirror the API response) ───────────────────────

interface ForexPair {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change24h?: number;
}

interface CommodityPrice {
  name: string;
  symbol: string;
  price: number;
  currency: string;
  change24h?: number;
}

interface CryptoData {
  btcPrice: number;
  ethPrice: number;
  totalMarketCap: number;
  btcDominance: number;
  fearGreed: number;
}

interface MarketOverviewData {
  forex: ForexPair[];
  commodities: CommodityPrice[];
  crypto: CryptoData;
  timestamp: string;
}

// ─── Helpers ───────────────────────────────────────────────

function ChangeBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
        positive
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-red-500/15 text-red-400"
      )}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {formatPercent(value)}
    </span>
  );
}

function DirectionArrow({ value }: { value?: number }) {
  if (value === undefined || value === null) return <Minus className="h-3.5 w-3.5 text-text-muted" />;
  return value >= 0 ? (
    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
  ) : (
    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
  );
}

function FearGreedGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const rotation = (clamped / 100) * 180 - 90; // -90 to +90 degrees
  const label =
    clamped <= 25
      ? "Extreme Fear"
      : clamped <= 45
        ? "Fear"
        : clamped <= 55
          ? "Neutral"
          : clamped <= 75
            ? "Greed"
            : "Extreme Greed";
  const color =
    clamped <= 25
      ? "text-red-400"
      : clamped <= 45
        ? "text-orange-400"
        : clamped <= 55
          ? "text-yellow-400"
          : clamped <= 75
            ? "text-emerald-400"
            : "text-green-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-12 w-24 overflow-hidden">
        {/* Gauge background arc */}
        <div className="absolute inset-0 rounded-t-full border-[6px] border-b-0 border-white/10" />
        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 h-10 w-0.5 origin-bottom bg-white/80"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        {/* Center dot */}
        <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
      </div>
      <span className={cn("text-lg font-bold tabular-nums", color)}>{clamped}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

// ─── Section Components ────────────────────────────────────

function CryptoSection({ data }: { data: CryptoData }) {
  const cards = [
    {
      label: "Bitcoin",
      symbol: "BTC",
      price: data.btcPrice,
      icon: <Bitcoin className="h-4 w-4 text-orange-400" />,
    },
    {
      label: "Ethereum",
      symbol: "ETH",
      price: data.ethPrice,
      icon: <Activity className="h-4 w-4 text-blue-400" />,
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-text-primary">Crypto</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.symbol}
            className="rounded-lg border border-white/5 bg-bg-elevated/50 p-3"
          >
            <div className="flex items-center gap-2">
              {c.icon}
              <span className="text-xs text-text-muted">{c.label}</span>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
              {formatUsd(c.price)}
            </p>
          </div>
        ))}
        {/* Market cap */}
        <div className="rounded-lg border border-white/5 bg-bg-elevated/50 p-3">
          <span className="text-xs text-text-muted">Total Market Cap</span>
          <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
            {formatUsd(data.totalMarketCap)}
          </p>
          <span className="text-xs text-text-muted">
            BTC Dom: {data.btcDominance.toFixed(1)}%
          </span>
        </div>
        {/* Fear & Greed */}
        <div className="flex items-center justify-center rounded-lg border border-white/5 bg-bg-elevated/50 p-3 sm:col-span-2 lg:col-span-1">
          <FearGreedGauge value={data.fearGreed} />
        </div>
      </div>
    </section>
  );
}

function ForexSection({ pairs }: { pairs: ForexPair[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-text-primary">Forex</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((p) => (
          <div
            key={p.pair}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-bg-elevated/50 p-3"
          >
            <div>
              <span className="text-sm font-medium text-text-primary">{p.pair}</span>
              <p className="text-lg font-semibold tabular-nums text-text-primary">
                {p.rate.toFixed(p.rate > 100 ? 2 : 4)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <DirectionArrow value={p.change24h} />
              {p.change24h !== undefined && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    p.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {formatPercent(p.change24h)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommoditiesSection({ items }: { items: CommodityPrice[] }) {
  const iconMap: Record<string, React.ReactNode> = {
    XAU: <CircleDollarSign className="h-4 w-4 text-yellow-400" />,
    XAG: <CircleDollarSign className="h-4 w-4 text-gray-300" />,
    CL: <Fuel className="h-4 w-4 text-amber-500" />,
    NG: <Fuel className="h-4 w-4 text-blue-300" />,
    BTC: <Bitcoin className="h-4 w-4 text-orange-400" />,
    ETH: <Activity className="h-4 w-4 text-blue-400" />,
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Gem className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-text-primary">Commodities</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <div
            key={c.symbol}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-bg-elevated/50 p-3"
          >
            <div className="flex items-center gap-2">
              {iconMap[c.symbol] ?? <Gem className="h-4 w-4 text-text-muted" />}
              <div>
                <span className="text-sm font-medium text-text-primary">{c.name}</span>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatUsd(c.price)}
                </p>
              </div>
            </div>
            <ChangeBadge value={c.change24h} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main Component ────────────────────────────────────────

export default function MarketOverview() {
  const { data, loading, error } = useApi<MarketOverviewData>(
    "/v1/market?section=all",
    { refreshInterval: 120_000 }
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse space-y-3">
            <div className="h-4 w-24 rounded bg-white/5" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-20 rounded-lg bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        Failed to load market data: {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <CryptoSection data={data.crypto} />
      {data.forex.length > 0 && <ForexSection pairs={data.forex} />}
      {data.commodities.length > 0 && <CommoditiesSection items={data.commodities} />}
      <p className="text-right text-xs text-text-muted">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
