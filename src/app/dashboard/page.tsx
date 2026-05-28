"use client";

import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { PnlBadge } from "@/components/domain/pnl-badge";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { LiveFeed, type FeedItem } from "@/components/ui/LiveFeed";
import { cn, formatUsd, formatNumber, formatPercent } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  Bell,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  GripVertical,
} from "lucide-react";

const mockFeedItems: FeedItem[] = [
  { id: "1", title: "Whale moved 5,000 ETH to Binance", description: "0x1a2b...3c4d transferred $12.4M", timestamp: new Date(Date.now() - 30000), type: "warning" },
  { id: "2", title: "Smart money bought PEPE", description: "3 wallets accumulated $2.1M worth", timestamp: new Date(Date.now() - 120000), type: "success" },
  { id: "3", title: "Bridge anomaly detected", description: "Unusual $45M flow from Arbitrum to Base", timestamp: new Date(Date.now() - 300000), type: "danger" },
  { id: "4", title: "New prediction market threshold", description: "Polymarket: Election > 80% probability", timestamp: new Date(Date.now() - 600000), type: "info" },
  { id: "5", title: "Large swap on Uniswap V3", description: "10M USDC swapped for ETH at $3,842", timestamp: new Date(Date.now() - 900000), type: "info" },
  { id: "6", title: "Smart money rotated to AAVE", description: "Known fund wallet moved $8M from COMP", timestamp: new Date(Date.now() - 1200000), type: "success" },
];

const topMovers = [
  { symbol: "PEPE", change: 24.5, price: "$0.0000142" },
  { symbol: "ARB", change: 12.3, price: "$1.42" },
  { symbol: "AAVE", change: 8.7, price: "$142.30" },
  { symbol: "LINK", change: -5.2, price: "$18.40" },
  { symbol: "UNI", change: -8.1, price: "$7.82" },
];

const activePositions = [
  { token: "ETH", entry: "$3,200", current: "$3,842", pnl: 20.06, size: "$24,000" },
  { token: "SOL", entry: "$98", current: "$142", pnl: 44.9, size: "$10,000" },
  { token: "ARB", entry: "$1.80", current: "$1.42", pnl: -21.11, size: "$5,000" },
];

function WidgetCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-white/5 bg-bg-surface overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {title}
        </h3>
        <GripVertical className="h-3.5 w-3.5 text-text-muted/40 cursor-grab" />
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Real-time onchain intelligence at a glance"
        actions={<ConnectionStatus connected label="Live" />}
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Portfolio Value" value={formatUsd(124850)} change={5.4} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Active Alerts" value="12" change={0} icon={<Bell className="h-4 w-4" />} />
        <StatCard label="Smart Money Signals" value="38" change={12.5} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Flow Volume (24h)" value={formatUsd(842000000)} change={-3.2} icon={<Activity className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <WidgetCard title="Market Overview" className="col-span-2">
          <div className="space-y-3">
            {["BTC", "ETH", "SOL"].map((sym) => (
              <div key={sym} className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">{sym}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-text-primary">
                    {sym === "BTC" ? "$67,420" : sym === "ETH" ? "$3,842" : "$142.30"}
                  </span>
                  <PnlBadge value={sym === "BTC" ? 2.1 : sym === "ETH" ? 3.4 : -1.2} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Movers">
          <div className="space-y-2">
            {topMovers.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-text-primary">{m.symbol}</span>
                  <span className="ml-2 text-xs font-mono text-text-muted">{m.price}</span>
                </div>
                <div className="flex items-center gap-1">
                  {m.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-accent-green" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-danger" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-mono",
                      m.change >= 0 ? "text-accent-green" : "text-danger"
                    )}
                  >
                    {formatPercent(m.change)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <WidgetCard title="Live Alert Feed" className="col-span-1">
          <LiveFeed items={mockFeedItems} maxHeight={320} />
        </WidgetCard>

        <WidgetCard title="Smart Money Activity" className="col-span-1">
          <div className="space-y-3">
            {[
              { action: "Bought", token: "ETH", amount: "$2.4M", wallet: "0xab12...cd34" },
              { action: "Sold", token: "DOGE", amount: "$800K", wallet: "0xef56...gh78" },
              { action: "Bought", token: "LINK", amount: "$1.1M", wallet: "0xij90...kl12" },
              { action: "Bridge", token: "USDC", amount: "$5M", wallet: "0xmn34...op56" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-mono rounded px-1.5 py-0.5",
                      item.action === "Bought"
                        ? "bg-accent-green/10 text-accent-green"
                        : item.action === "Sold"
                          ? "bg-danger/10 text-danger"
                          : "bg-accent-cyan/10 text-accent-cyan"
                    )}
                  >
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
        </WidgetCard>

        <WidgetCard title="Active Positions" className="col-span-1">
          <div className="space-y-3">
            {activePositions.map((pos) => (
              <div key={pos.token} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{pos.token}</p>
                  <p className="text-[10px] font-mono text-text-muted">
                    Entry {pos.entry} &middot; {pos.size}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-text-primary">{pos.current}</p>
                  <PnlBadge value={pos.pnl} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
