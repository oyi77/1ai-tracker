"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { PriceChart } from "@/components/tokens/PriceChart";
import { HolderBreakdown } from "@/components/tokens/HolderBreakdown";
import { cn, formatUsd, formatNumber, formatPercent, getChainColor } from "@/lib/utils";
import {
  ethCandlestick,
  smartMoneyMarkers,
  topHolders,
  exchangeFlows,
  liquidityPools,
} from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Tab = "overview" | "holders" | "flows" | "liquidity";

export default function TokenDetailPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "holders", label: "Holders" },
    { key: "flows", label: "Token Flows" },
    { key: "liquidity", label: "DEX Liquidity" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Link href="/tokens" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Tokens
        </Link>

        {/* Token header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated text-lg font-bold text-accent-cyan">
            ETH
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Ethereum (ETH)</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-xl text-text-primary">$3,600</span>
              <span className="font-mono text-sm text-accent-green">+2.40%</span>
              <span
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: getChainColor("Ethereum") }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getChainColor("Ethereum") }} />
                Ethereum
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <MiniStat label="Market Cap" value={formatUsd(432_000_000_000)} />
          <MiniStat label="24h Volume" value={formatUsd(18_500_000_000)} />
          <MiniStat label="SM Flow" value={formatUsd(42_000_000)} positive />
          <MiniStat label="SM Wallets" value="18" />
          <MiniStat label="Diamond Hands" value="68%" positive />
          <MiniStat label="Avg Hold" value="142d" />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-white/5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-b-2 border-accent-cyan text-accent-cyan"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Price Chart</h3>
                <PriceChart data={ethCandlestick} markers={smartMoneyMarkers} />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Holder Behavior</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-accent-green">Diamond Hands (6+ months)</span>
                        <span className="font-mono text-text-primary">68%</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                        <div className="h-full rounded-full bg-accent-green" style={{ width: "68%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-danger">Paper Hands (&lt;1 month)</span>
                        <span className="font-mono text-text-primary">18%</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                        <div className="h-full rounded-full bg-danger" style={{ width: "18%" }} />
                      </div>
                    </div>
                    <div className="pt-2 text-xs text-text-muted">
                      Average hold duration: <span className="font-mono text-text-primary">142 days</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-text-muted">Circulating Supply</span>
                      <div className="font-mono text-sm text-text-primary">120.2M ETH</div>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Total Supply</span>
                      <div className="font-mono text-sm text-text-primary">120.2M ETH</div>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Staked</span>
                      <div className="font-mono text-sm text-text-primary">34.5M ETH</div>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Burned (30d)</span>
                      <div className="font-mono text-sm text-text-primary">82,400 ETH</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "holders" && (
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Holder Distribution</h3>
              <HolderBreakdown
                distribution={{ top10: 35, top11to50: 25, top51to100: 15, retail: 25 }}
                topHolders={topHolders}
              />
            </div>
          )}

          {tab === "flows" && (
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">24h Token Flow Heatmap</h3>
              <div className="space-y-3">
                {exchangeFlows.map((ef) => {
                  const total = ef.inflow + ef.outflow;
                  const inflowPct = total > 0 ? (ef.inflow / total) * 100 : 50;
                  return (
                    <div key={ef.name} className="flex items-center gap-4">
                      <div className="w-28">
                        <div className="text-sm font-medium text-text-primary">{ef.name}</div>
                        <div className="text-[10px] text-text-muted">{ef.type}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex h-4 overflow-hidden rounded-full bg-bg-elevated">
                          <div className="bg-accent-green transition-all" style={{ width: `${inflowPct}%` }} />
                          <div className="bg-danger transition-all" style={{ width: `${100 - inflowPct}%` }} />
                        </div>
                      </div>
                      <div className="w-32 text-right">
                        <span className="text-xs font-mono text-accent-green">+{formatUsd(ef.inflow)}</span>
                        <span className="mx-1 text-text-muted">/</span>
                        <span className="text-xs font-mono text-danger">-{formatUsd(ef.outflow)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "liquidity" && (
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">DEX Liquidity Pools</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Pool</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">DEX</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">TVL</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">24h Vol</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Fee APY</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Top LP</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidityPools.map((pool) => (
                      <tr key={pool.name} className="border-b border-white/[0.03]">
                        <td className="px-3 py-2.5 font-medium text-text-primary">{pool.name}</td>
                        <td className="px-3 py-2.5 text-text-muted">{pool.dex}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-primary">{formatUsd(pool.tvl)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-primary">{formatUsd(pool.volume24h)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-accent-green">{pool.feeApy}%</td>
                        <td className="px-3 py-2.5 text-text-primary">{pool.topLp}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-primary">{pool.topLpShare}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <div className={cn("mt-0.5 font-mono text-sm font-medium", positive ? "text-accent-green" : "text-text-primary")}>
        {value}
      </div>
    </div>
  );
}
