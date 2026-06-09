"use client";

import { cn } from "@/lib/utils";
import { useApi } from "@/lib/hooks/use-api";

interface Stablecoin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  deviation: number;
  pegStatus: string;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

interface StablecoinData {
  stablecoins: Stablecoin[];
  summary: {
    totalMarketCap: number;
    totalVolume24h: number;
    coinCount: number;
    depeggedCount: number;
    healthStatus: "HEALTHY" | "CAUTION" | "WARNING";
  };
}

function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function PegBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "ON PEG" && "bg-green-500/20 text-green-400",
        status === "SLIGHT DEPEG" && "bg-yellow-500/20 text-yellow-400",
        status === "DEPEG" && "bg-red-500/20 text-red-400"
      )}
    >
      {status}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 rounded-lg bg-neutral-800" />
      <div className="h-48 rounded-lg bg-neutral-800" />
      <div className="h-64 rounded-lg bg-neutral-800" />
    </div>
  );
}

export default function StablecoinPanel() {
  const { data, loading, error } = useApi<StablecoinData>(
    "/v1/stablecoins",
    { refreshInterval: 60_000 }
  );

  if (loading && !data) return <Skeleton />;
  if (error) return <div className="text-red-400 p-4">Error: {error}</div>;
  if (!data) return null;

  const { stablecoins, summary } = data;

  return (
    <div className="space-y-6">
      {/* Health Status Banner */}
      <div
        className={cn(
          "rounded-lg p-4 border",
          summary.healthStatus === "HEALTHY" && "border-green-500/30 bg-green-500/10",
          summary.healthStatus === "CAUTION" && "border-yellow-500/30 bg-yellow-500/10",
          summary.healthStatus === "WARNING" && "border-red-500/30 bg-red-500/10"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-full",
                summary.healthStatus === "HEALTHY" && "bg-green-400",
                summary.healthStatus === "CAUTION" && "bg-yellow-400",
                summary.healthStatus === "WARNING" && "bg-red-400"
              )}
            />
            <span className="text-lg font-semibold text-white">
              Stablecoin Health: {summary.healthStatus}
            </span>
          </div>
          <div className="flex gap-6 text-sm text-neutral-300">
            <span>
              Total Mcap: <span className="font-medium text-white">{formatLargeNumber(summary.totalMarketCap)}</span>
            </span>
            <span>
              24h Volume: <span className="font-medium text-white">{formatLargeNumber(summary.totalVolume24h)}</span>
            </span>
            <span>
              Tracked: <span className="font-medium text-white">{summary.coinCount}</span>
            </span>
            {summary.depeggedCount > 0 && (
              <span className="text-red-400 font-medium">
                {summary.depeggedCount} depegged
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Peg Health Section */}
      <div>
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Peg Health</h3>
        <div className="rounded-lg border border-neutral-800 divide-y divide-neutral-800">
          {stablecoins.map((coin) => (
            <div
              key={coin.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-mono font-semibold text-white w-14 shrink-0">
                  {coin.symbol}
                </span>
                <span className="text-sm text-neutral-400 truncate">
                  {coin.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-white tabular-nums w-24 text-right">
                  ${coin.price.toFixed(4)}
                </span>
                <PegBadge status={coin.pegStatus} />
                <span
                  className={cn(
                    "text-sm font-mono tabular-nums w-20 text-right",
                    coin.deviation < 0.5
                      ? "text-green-400"
                      : coin.deviation < 2
                        ? "text-yellow-400"
                        : "text-red-400"
                  )}
                >
                  {coin.deviation.toFixed(3)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supply & Volume Section */}
      <div>
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Supply &amp; Volume</h3>
        <div className="rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Market Cap
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Volume 24h
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Change 24h
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {stablecoins.map((coin) => (
                <tr key={coin.id} className="hover:bg-neutral-900/30">
                  <td className="px-4 py-2.5 text-sm font-mono font-semibold text-white">
                    {coin.symbol}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-right text-neutral-200 tabular-nums">
                    {formatLargeNumber(coin.marketCap)}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-right text-neutral-200 tabular-nums">
                    {formatLargeNumber(coin.volume24h)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-sm font-mono text-right tabular-nums",
                      coin.change24h >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {coin.change24h >= 0 ? "+" : ""}
                    {coin.change24h.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
