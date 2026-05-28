"use client";

import { use, useMemo } from "react";
import { cn, formatUsd, formatNumber } from "@/lib/utils";
import { getMarketDetail, CATEGORY_COLORS, generateTrades } from "@/lib/predictions/mock-data";
import { PageHeader } from "@/components/domain/page-header";
import { PriceHistoryChart } from "@/components/predictions/PriceHistoryChart";
import { OrderBook } from "@/components/predictions/OrderBook";
import { TradeFeed } from "@/components/predictions/TradeFeed";
import { TraderLeaderboard } from "@/components/predictions/TraderLeaderboard";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Zap,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function MarketDetailPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = use(params);
  const market = useMemo(() => getMarketDetail(marketId), [marketId]);
  const liveTrades = useMemo(() => generateTrades(30), []);

  if (!market) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary">Market not found</h2>
          <p className="mt-1 text-sm text-text-muted">The market you are looking for does not exist.</p>
          <Link href="/predictions" className="mt-4 inline-flex items-center gap-1 text-sm text-accent-cyan hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Explorer
          </Link>
        </div>
      </div>
    );
  }

  const isPositive = market.yesPrice > 0.5;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/predictions" className="hover:text-accent-cyan transition-colors">
          Predictions
        </Link>
        <span>/</span>
        <span className="text-text-primary">{market.title}</span>
      </div>

      <PageHeader
        title={market.title}
        description={market.description}
        actions={
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                color: CATEGORY_COLORS[market.category],
                backgroundColor: `${CATEGORY_COLORS[market.category]}15`,
              }}
            >
              {market.category}
            </span>
            <span className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              market.status === "Open"
                ? "bg-accent-green/15 text-accent-green"
                : market.status === "Resolved"
                  ? "bg-text-muted/15 text-text-muted"
                  : "bg-warning/15 text-warning"
            )}>
              {market.status}
            </span>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatBox label="Yes Price" value={`${(market.yesPrice * 100).toFixed(0)}%`} accent={isPositive ? "green" : "red"} />
        <StatBox label="No Price" value={`${(market.noPrice * 100).toFixed(0)}%`} accent={!isPositive ? "green" : "red"} />
        <StatBox label="Volume 24h" value={formatUsd(market.volume24h)} />
        <StatBox label="Total Volume" value={formatUsd(market.totalVolume)} />
        <StatBox label="Traders" value={formatNumber(market.traders)} />
        <StatBox label="End Date" value={market.endDate} />
      </div>

      {/* Main grid: chart + order book */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Price chart */}
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Price History</h2>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              90 days
            </div>
          </div>
          <PriceHistoryChart data={market.priceHistory} />
        </div>

        {/* Order book */}
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Order Book</h2>
            <span className="text-xs text-text-muted">Spread: {(market.orderBook.spread * 100).toFixed(0)}&cent;</span>
          </div>
          <OrderBook data={market.orderBook} />
        </div>
      </div>

      {/* Bottom grid: traders + trades + related */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top traders */}
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent-cyan" />
            <h2 className="text-sm font-semibold text-text-primary">Top Traders</h2>
          </div>
          <TraderLeaderboard traders={market.topTraders} />
        </div>

        {/* Trade feed */}
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold text-text-primary">Live Trades</h2>
          </div>
          <TradeFeed trades={liveTrades} className="max-h-[480px]" />
        </div>

        {/* Related + Smart Money */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* Related markets */}
          <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Related Markets</h2>
            <div className="flex flex-col gap-2">
              {market.relatedMarkets.map((rm) => (
                <Link
                  key={rm.id}
                  href={`/predictions/${rm.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-bg-elevated"
                >
                  <span className="truncate text-xs text-text-primary">{rm.title}</span>
                  <span className="shrink-0 text-xs font-mono text-accent-cyan">
                    {(rm.yesPrice * 100).toFixed(0)}&cent;
                  </span>
                </Link>
              ))}
              {market.relatedMarkets.length === 0 && (
                <p className="text-xs text-text-muted">No related markets.</p>
              )}
            </div>
          </div>

          {/* Smart money signal */}
          <div className="rounded-lg border border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-transparent p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-cyan" />
              <h2 className="text-sm font-semibold text-accent-cyan">Smart Money Signal</h2>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {market.topTraderEntity} has accumulated a large YES position over the past 48 hours.
              Their historical win rate on {market.category.toLowerCase()} markets is 74%.
              Average entry price: {((market.yesPrice - 0.05) * 100).toFixed(0)}&cent;.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-accent-green" />
                <span className="text-xs font-mono text-accent-green">Accumulating</span>
              </div>
              <span className="text-[10px] text-text-muted">Confidence: High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <div
        className={cn(
          "mt-1 text-lg font-mono font-semibold",
          accent === "green" && "text-accent-green",
          accent === "red" && "text-danger",
          !accent && "text-text-primary"
        )}
      >
        {value}
      </div>
    </div>
  );
}
