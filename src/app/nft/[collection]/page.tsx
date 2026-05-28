"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { PnlBadge } from "@/components/domain/pnl-badge";
import { RiskScore } from "@/components/domain/risk-score";
import { cn, formatUsd, formatNumber, formatPercent } from "@/lib/utils";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Droplets,
  Layers,
  Repeat,
} from "lucide-react";

const mockRarityDistribution = [
  { tier: "Common", count: 4200, pct: 42 },
  { tier: "Uncommon", count: 2800, pct: 28 },
  { tier: "Rare", count: 1500, pct: 15 },
  { tier: "Epic", count: 1000, pct: 10 },
  { tier: "Legendary", count: 500, pct: 5 },
];

const mockHolderConcentration = [
  { bracket: "1", wallets: 3200, pct: 52 },
  { bracket: "2-5", wallets: 1800, pct: 29 },
  { bracket: "6-20", wallets: 720, pct: 12 },
  { bracket: "21-100", wallets: 310, pct: 5 },
  { bracket: "100+", wallets: 90, pct: 2 },
];

const mockFlips = [
  { buyer: "0xab12...cd34", bought: 12.5, sold: 18.2, profit: 5.7, roi: 45.6, token: "#4521" },
  { buyer: "0xef56...gh78", bought: 8.0, sold: 14.1, profit: 6.1, roi: 76.3, token: "#1209" },
  { buyer: "0xij90...kl12", bought: 28.0, sold: 24.5, profit: -3.5, roi: -12.5, token: "#7834" },
  { buyer: "0xmn34...op56", bought: 15.2, sold: 22.8, profit: 7.6, roi: 50.0, token: "#901" },
  { buyer: "0xqr78...st90", bought: 6.5, sold: 9.2, profit: 2.7, roi: 41.5, token: "#3367" },
];

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = params.collection as string;
  const collectionName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/nft"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title={collectionName}
          description="Collection analytics and smart money intelligence"
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Floor Price" value="28.5 ETH" change={3.2} icon={<Layers className="h-4 w-4" />} />
        <StatCard label="Volume (24h)" value={formatUsd(4712000)} change={8.4} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Unique Holders" value="6,420" change={1.2} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Smart Money %" value="12.4%" icon={<Repeat className="h-4 w-4" />} />
        <StatCard label="Wash Score" value="15" icon={<Droplets className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
            Rarity Distribution
          </h3>
          <div className="space-y-3">
            {mockRarityDistribution.map((tier) => (
              <div key={tier.tier}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-primary">{tier.tier}</span>
                  <span className="text-xs font-mono text-text-muted">
                    {formatNumber(tier.count)} ({tier.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className="h-full rounded-full bg-accent-cyan transition-all"
                    style={{ width: `${tier.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
            Holder Concentration
          </h3>
          <div className="space-y-3">
            {mockHolderConcentration.map((h) => (
              <div key={h.bracket}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-primary">{h.bracket} NFTs</span>
                  <span className="text-xs font-mono text-text-muted">
                    {formatNumber(h.wallets)} wallets ({h.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className="h-full rounded-full bg-accent-green transition-all"
                    style={{ width: `${h.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Flip Profit Tracker
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Token</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Flipper</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Bought</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Sold</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Profit</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">ROI</th>
            </tr>
          </thead>
          <tbody>
            {mockFlips.map((flip, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-bg-elevated/50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-accent-cyan">{flip.token}</td>
                <td className="px-4 py-3 text-sm font-mono text-text-primary">{flip.buyer}</td>
                <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">{flip.bought} ETH</td>
                <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">{flip.sold} ETH</td>
                <td className="px-4 py-3 text-right">
                  <PnlBadge value={flip.roi} />
                </td>
                <td className="px-4 py-3 text-right text-sm font-mono text-text-muted">
                  {flip.profit > 0 ? "+" : ""}{flip.profit} ETH
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
