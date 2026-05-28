"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { RiskScore } from "@/components/domain/risk-score";
import { cn, formatUsd, formatNumber, formatPercent } from "@/lib/utils";
import {
  Image as ImageIcon,
  Users,
  TrendingUp,
  Droplets,
  Search,
  ArrowUpDown,
} from "lucide-react";

interface NFTCollection {
  name: string;
  slug: string;
  floorPrice: number;
  volume24h: number;
  uniqueHolders: number;
  smartMoneyPercent: number;
  washTradeScore: number;
  change24h: number;
}

const mockCollections: NFTCollection[] = [
  { name: "Bored Ape Yacht Club", slug: "bored-ape-yacht-club", floorPrice: 28.5, volume24h: 1240, uniqueHolders: 6420, smartMoneyPercent: 12.4, washTradeScore: 15, change24h: 3.2 },
  { name: "Pudgy Penguins", slug: "pudgy-penguins", floorPrice: 14.2, volume24h: 890, uniqueHolders: 4820, smartMoneyPercent: 8.7, washTradeScore: 8, change24h: 7.1 },
  { name: "Azuki", slug: "azuki", floorPrice: 6.8, volume24h: 520, uniqueHolders: 5120, smartMoneyPercent: 15.2, washTradeScore: 22, change24h: -2.4 },
  { name: "CryptoPunks", slug: "cryptopunks", floorPrice: 42.0, volume24h: 2100, uniqueHolders: 3540, smartMoneyPercent: 22.1, washTradeScore: 5, change24h: 1.8 },
  { name: "Doodles", slug: "doodles", floorPrice: 2.1, volume24h: 180, uniqueHolders: 5200, smartMoneyPercent: 5.3, washTradeScore: 31, change24h: -5.6 },
  { name: "CloneX", slug: "clone-x", floorPrice: 1.8, volume24h: 140, uniqueHolders: 9820, smartMoneyPercent: 3.1, washTradeScore: 18, change24h: -1.2 },
  { name: "Moonbirds", slug: "moonbirds", floorPrice: 0.9, volume24h: 95, uniqueHolders: 6700, smartMoneyPercent: 7.8, washTradeScore: 42, change24h: -8.4 },
  { name: "DeGods", slug: "degods", floorPrice: 3.4, volume24h: 310, uniqueHolders: 3200, smartMoneyPercent: 11.5, washTradeScore: 12, change24h: 4.2 },
];

type SortKey = "floorPrice" | "volume24h" | "uniqueHolders" | "smartMoneyPercent" | "washTradeScore";

export default function NFTPage() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume24h");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = mockCollections
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * mul;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NFT Intelligence"
        description="Collection analytics, smart money tracking, and wash trade detection"
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Tracked Collections" value="2,840" icon={<ImageIcon className="h-4 w-4" />} />
        <StatCard label="Total Volume (24h)" value={formatUsd(48200000)} change={5.8} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Smart Money Wallets" value="1,240" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Wash Trade Alerts" value="38" change={-12} icon={<Droplets className="h-4 w-4" />} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-white/5 bg-bg-elevated pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
          />
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Collection</th>
                {([
                  ["floorPrice", "Floor Price"],
                  ["volume24h", "Volume 24h"],
                  ["uniqueHolders", "Holders"],
                  ["smartMoneyPercent", "Smart $ %"],
                  ["washTradeScore", "Wash Score"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                    onClick={() => toggleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">24h</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.slug}
                  className="border-b border-white/5 hover:bg-bg-elevated/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-text-muted">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/nft/${c.slug}`}
                      className="text-sm font-medium text-text-primary hover:text-accent-cyan transition-colors"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">
                    {c.floorPrice.toFixed(1)} ETH
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">
                    {formatUsd(c.volume24h * 3800)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">
                    {formatNumber(c.uniqueHolders)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "text-sm font-mono",
                      c.smartMoneyPercent >= 10 ? "text-accent-cyan" : "text-text-muted"
                    )}>
                      {c.smartMoneyPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RiskScore score={c.washTradeScore} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "text-sm font-mono",
                        c.change24h >= 0 ? "text-accent-green" : "text-danger"
                      )}
                    >
                      {formatPercent(c.change24h)}
                    </span>
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
