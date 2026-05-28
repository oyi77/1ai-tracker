"use client";

import { use } from "react";
import { cn, formatUsd, formatPercent, formatRelativeTime, formatAddress, getChainColor, getEntityTypeColor } from "@/lib/utils";
import { PageHeader } from "@/components/domain/page-header";
import { EntityBadge } from "@/components/domain/entity-badge";
import { RiskScore } from "@/components/domain/risk-score";
import { PnlBadge } from "@/components/domain/pnl-badge";
import { WalletAddress } from "@/components/domain/wallet-address";
import { PortfolioTable } from "@/components/entity/PortfolioTable";
import { NetFlowChart } from "@/components/entity/NetFlowChart";
import { ConnectedEntitiesGraph } from "@/components/entity/ConnectedEntitiesGraph";
import {
  mockEntities,
  mockHoldings,
  mockNetFlows,
  mockTransactions,
  mockLabeledAddresses,
  mockConnectedEntities,
} from "@/lib/mock/entities";
import type { Transaction } from "@/lib/mock/entities";
import { useState, useMemo } from "react";
import { ArrowUpDown, ExternalLink, Search, Filter } from "lucide-react";

const chains = ["ethereum", "bitcoin", "solana", "arbitrum", "optimism", "base"];

function ChainStrip({ activeChains }: { activeChains: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {chains.map((chain) => {
        const active = activeChains.includes(chain);
        return (
          <span
            key={chain}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-colors",
              active
                ? "bg-bg-elevated text-text-primary"
                : "bg-bg-elevated/30 text-text-muted/40"
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: active ? getChainColor(chain) : "#333" }}
            />
            {chain}
          </span>
        );
      })}
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180;
  const color =
    clamped <= 30 ? "#00FF88" : clamped <= 70 ? "#FFB800" : "#FF3D6B";
  const level = clamped <= 30 ? "Low Risk" : clamped <= 70 ? "Medium Risk" : "High Risk";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="h-20 w-32">
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="#1A1D27"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
          opacity={0.8}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fill="#E8EAED"
          fontSize="20"
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          {clamped}
        </text>
      </svg>
      <span className="text-xs font-medium" style={{ color }}>
        {level}
      </span>
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (chainFilter !== "all" && tx.chain !== chainFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, chainFilter, typeFilter]);

  const typeColor = (type: string) => {
    switch (type) {
      case "inflow": return "text-accent-green bg-accent-green/10";
      case "outflow": return "text-danger bg-danger/10";
      case "swap": return "text-accent-cyan bg-accent-cyan/10";
      case "bridge": return "text-warning bg-warning/10";
      default: return "text-text-muted bg-bg-elevated";
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-1">
          <Filter className="h-3 w-3 text-text-muted" />
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="bg-transparent text-xs text-text-primary outline-none"
          >
            <option value="all">All Chains</option>
            <option value="ethereum">Ethereum</option>
            <option value="bitcoin">Bitcoin</option>
            <option value="solana">Solana</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="base">Base</option>
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-1">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent text-xs text-text-primary outline-none"
          >
            <option value="all">All Types</option>
            <option value="inflow">Inflow</option>
            <option value="outflow">Outflow</option>
            <option value="swap">Swap</option>
            <option value="bridge">Bridge</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Token</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Amount</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">USD Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Chain</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">From</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">To</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Time</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => (
              <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-bg-elevated/50 transition-colors">
                <td className="px-3 py-2.5">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", typeColor(tx.type))}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm font-medium text-text-primary">{tx.token}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm text-text-primary">
                  {tx.amount.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm text-text-primary">
                  {formatUsd(tx.usdValue)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getChainColor(tx.chain) }} />
                    <span className="text-xs text-text-muted capitalize">{tx.chain}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <WalletAddress address={tx.from} chain={tx.chain} chars={3} />
                </td>
                <td className="px-3 py-2.5">
                  <WalletAddress address={tx.to} chain={tx.chain} chars={3} />
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-text-muted">
                  {formatRelativeTime(tx.timestamp)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="font-mono text-xs text-accent-cyan hover:underline cursor-pointer">
                    {tx.hash}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EntityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const entity = mockEntities.find((e) => e.slug === slug);
  const holdings = mockHoldings[slug] ?? mockHoldings["binance"];
  const netFlows = mockNetFlows[slug] ?? mockNetFlows["binance"];
  const transactions = mockTransactions[slug] ?? mockTransactions["binance"];
  const labeledAddresses = mockLabeledAddresses[slug] ?? mockLabeledAddresses["binance"];
  const connectedEntities = mockConnectedEntities[slug] ?? mockConnectedEntities["binance"];

  if (!entity) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-text-muted">Entity not found: {slug}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{entity.logo}</span>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">{entity.name}</h1>
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: getEntityTypeColor(entity.type) + "20",
                  color: getEntityTypeColor(entity.type),
                }}
              >
                {entity.type}
              </span>
              {entity.verified && (
                <svg className="h-5 w-5 text-accent-cyan" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="mt-1 text-sm text-text-muted">{entity.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {entity.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Total Holdings</p>
          <p className="font-mono text-3xl font-bold text-text-primary">{formatUsd(entity.totalValue)}</p>
          <div className="mt-1 flex items-center justify-end gap-3">
            <div>
              <span className="text-xs text-text-muted">24h </span>
              <PnlBadge value={entity.change24h} />
            </div>
            <div>
              <span className="text-xs text-text-muted">7d </span>
              <PnlBadge value={entity.pnl7d} />
            </div>
          </div>
          <p className="mt-1 text-[10px] text-text-muted">Last active {formatRelativeTime(entity.lastActive)}</p>
        </div>
      </div>

      {/* Chain Strip */}
      <ChainStrip activeChains={entity.chains} />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Chains Active</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">{entity.chains.length}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Labeled Addresses</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">{labeledAddresses.length}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Connected Entities</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">{connectedEntities.length}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4 flex flex-col items-center">
          <p className="text-xs text-text-muted">Risk Score</p>
          <RiskGauge score={entity.riskScore} />
        </div>
      </div>

      {/* Portfolio */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Portfolio Breakdown</h2>
        <PortfolioTable holdings={holdings} />
      </div>

      {/* Net Flow */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">30-Day Net Flows</h2>
        <NetFlowChart data={netFlows} />
      </div>

      {/* Transaction History */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Transaction History</h2>
        <TransactionTable transactions={transactions} />
      </div>

      {/* Labeled Addresses */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Labeled Addresses</h2>
        <div className="space-y-4">
          {Object.entries(
            labeledAddresses.reduce(
              (acc, addr) => {
                (acc[addr.chain] ??= []).push(addr);
                return acc;
              },
              {} as Record<string, typeof labeledAddresses>
            )
          ).map(([chain, addrs]) => (
            <div key={chain}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getChainColor(chain) }} />
                <span className="text-xs font-medium uppercase text-text-muted">{chain}</span>
              </div>
              <div className="space-y-1">
                {addrs.map((addr) => (
                  <div
                    key={addr.address}
                    className="flex items-center justify-between rounded-md bg-bg-elevated/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-primary">{addr.label}</span>
                      <WalletAddress address={addr.address} chain={chain} chars={4} />
                    </div>
                    <span className="font-mono text-sm text-text-primary">{formatUsd(addr.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Entities */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Connected Entities</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ConnectedEntitiesGraph centerName={entity.name} connections={connectedEntities} />
          <div className="space-y-2">
            {connectedEntities.map((c) => (
              <div
                key={c.slug}
                className="flex items-center justify-between rounded-md bg-bg-elevated/50 px-3 py-2.5 hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getEntityTypeColor(c.type) }}
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.name}</p>
                    <p className="text-[10px] text-text-muted">{c.relationship}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-text-primary">{formatUsd(c.volume)}</p>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full bg-accent-cyan"
                      style={{ width: `${c.strength * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
