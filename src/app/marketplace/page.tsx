"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { cn, formatUsd, formatRelativeTime, formatNumber } from "@/lib/utils";
import {
  Store,
  Trophy,
  FileText,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Star,
  Send,
} from "lucide-react";

type IntelStatus = "Pending" | "Verified" | "Rejected";
type Tab = "feed" | "bounties" | "leaderboard" | "submit" | "mine";

interface IntelPost {
  id: string;
  title: string;
  wallet: string;
  entity: string;
  evidence: string;
  reporter: string;
  reputation: number;
  upvotes: number;
  downvotes: number;
  status: IntelStatus;
  timestamp: Date;
}

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  deadline: Date;
  submissions: number;
  status: "open" | "closed";
}

const mockFeed: IntelPost[] = [
  { id: "1", title: "Wintermute linked to new wallet cluster", wallet: "0xab12...cd34", entity: "Wintermute", evidence: "On-chain fund flow analysis showing 15 linked wallets", reporter: "chain_sleuth", reputation: 94, upvotes: 42, downvotes: 3, status: "Verified", timestamp: new Date(Date.now() - 3600000) },
  { id: "2", title: "Alameda estate wallet moving funds", wallet: "0xef56...gh78", entity: "Alameda Research", evidence: "Dormant wallet activated after 18 months", reporter: "defi_detective", reputation: 87, upvotes: 38, downvotes: 5, status: "Verified", timestamp: new Date(Date.now() - 7200000) },
  { id: "3", title: "Suspected MEV bot operator identity", wallet: "0xij90...kl12", entity: "Unknown MEV Bot", evidence: "Gas pattern analysis + timing correlation", reporter: "mev_watcher", reputation: 72, upvotes: 21, downvotes: 8, status: "Pending", timestamp: new Date(Date.now() - 14400000) },
  { id: "4", title: "VC fund accumulation pattern", wallet: "0xmn34...op56", entity: "a16z Crypto", evidence: "Multiple wallets buying same tokens within 24h window", reporter: "vc_tracker", reputation: 65, upvotes: 15, downvotes: 4, status: "Pending", timestamp: new Date(Date.now() - 28800000) },
  { id: "5", title: "Exchange cold wallet rotation", wallet: "0xqr78...st90", entity: "Binance", evidence: "Standard quarterly rotation verified via Arkham", reporter: "chain_sleuth", reputation: 94, upvotes: 56, downvotes: 1, status: "Verified", timestamp: new Date(Date.now() - 43200000) },
];

const mockBounties: Bounty[] = [
  { id: "1", title: "Identify wallet cluster behind $50M USDT minting", description: "Trace the wallets involved in recent USDT minting events and link to known entities", reward: 5000, deadline: new Date(Date.now() + 604800000), submissions: 12, status: "open" },
  { id: "2", title: "Map DEX aggregator MEV extraction patterns", description: "Document MEV extraction by DEX aggregators over 30-day period", reward: 2500, deadline: new Date(Date.now() + 1209600000), submissions: 7, status: "open" },
  { id: "3", title: "Link dormant ICO wallets to current DeFi activity", description: "Find connections between 2017-era ICO wallets and active DeFi wallets", reward: 3000, deadline: new Date(Date.now() + 864000000), submissions: 5, status: "open" },
];

const mockLeaderboard = [
  { rank: 1, name: "chain_sleuth", submissions: 142, verified: 128, reputation: 94, earned: 24500 },
  { rank: 2, name: "defi_detective", submissions: 98, verified: 85, reputation: 87, earned: 18200 },
  { rank: 3, name: "whale_hunter", submissions: 76, verified: 62, reputation: 81, earned: 12800 },
  { rank: 4, name: "mev_watcher", submissions: 64, verified: 48, reputation: 72, earned: 9400 },
  { rank: 5, name: "vc_tracker", submissions: 51, verified: 38, reputation: 65, earned: 7200 },
];

const mySubmissions: IntelPost[] = [
  { ...mockFeed[0], status: "Verified" },
  { ...mockFeed[2], id: "6", status: "Pending" },
  { id: "7", title: "Rejected intel submission", wallet: "0xaaaa...bbbb", entity: "Unknown", evidence: "Insufficient evidence", reporter: "me", reputation: 72, upvotes: 2, downvotes: 12, status: "Rejected", timestamp: new Date(Date.now() - 86400000) },
];

function StatusBadge({ status }: { status: IntelStatus }) {
  const config = {
    Pending: { color: "text-warning", bg: "bg-warning/10", icon: <Clock className="h-3 w-3" /> },
    Verified: { color: "text-accent-green", bg: "bg-accent-green/10", icon: <CheckCircle className="h-3 w-3" /> },
    Rejected: { color: "text-danger", bg: "bg-danger/10", icon: <XCircle className="h-3 w-3" /> },
  };
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono", c.bg, c.color)}>
      {c.icon}
      {status}
    </span>
  );
}

function FeedTab() {
  return (
    <div className="space-y-3">
      {mockFeed.map((post) => (
        <div key={post.id} className="rounded-lg border border-white/5 bg-bg-surface p-4 hover:border-white/10 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-sm font-medium text-text-primary">{post.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-accent-cyan">{post.wallet}</span>
                <span className="text-xs text-text-muted">linked to</span>
                <span className="text-xs font-medium text-text-primary">{post.entity}</span>
              </div>
            </div>
            <StatusBadge status={post.status} />
          </div>
          <p className="text-xs text-text-muted mb-3">{post.evidence}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1 text-text-muted hover:text-accent-green transition-colors">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">{post.upvotes}</span>
                </button>
                <button className="flex items-center gap-1 text-text-muted hover:text-danger transition-colors">
                  <ThumbsDown className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">{post.downvotes}</span>
                </button>
              </div>
              <span className="text-[10px] text-text-muted">
                by <span className="text-accent-cyan">{post.reporter}</span>{" "}
                <Star className="inline h-3 w-3 text-warning" /> {post.reputation}
              </span>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {formatRelativeTime(post.timestamp)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BountiesTab() {
  return (
    <div className="space-y-3">
      {mockBounties.map((bounty) => (
        <div key={bounty.id} className="rounded-lg border border-white/5 bg-bg-surface p-4 hover:border-accent-cyan/20 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-text-primary">{bounty.title}</h4>
            <span className="flex items-center gap-1 rounded bg-accent-green/10 px-2 py-0.5 text-xs font-mono text-accent-green">
              <DollarSign className="h-3 w-3" />
              {formatUsd(bounty.reward)}
            </span>
          </div>
          <p className="text-xs text-text-muted mb-3">{bounty.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">
              {bounty.submissions} submissions
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              Expires {formatRelativeTime(bounty.deadline)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardTab() {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Reporter</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Submissions</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Verified</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Reputation</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Earned (USDC)</th>
          </tr>
        </thead>
        <tbody>
          {mockLeaderboard.map((entry) => (
            <tr key={entry.rank} className="border-b border-white/5 hover:bg-bg-elevated/50 transition-colors">
              <td className="px-4 py-3">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  entry.rank === 1 ? "bg-warning/20 text-warning" : entry.rank === 2 ? "bg-text-muted/20 text-text-muted" : entry.rank === 3 ? "bg-warning/10 text-warning" : "bg-bg-elevated text-text-muted"
                )}>
                  {entry.rank}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-medium text-accent-cyan">{entry.name}</td>
              <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">{entry.submissions}</td>
              <td className="px-4 py-3 text-right text-sm font-mono text-accent-green">{entry.verified}</td>
              <td className="px-4 py-3 text-right">
                <span className="flex items-center justify-end gap-1 text-sm font-mono text-warning">
                  <Star className="h-3 w-3" />
                  {entry.reputation}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">{formatUsd(entry.earned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubmitTab() {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-6 max-w-xl">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Submit Intel</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Wallet Address</label>
          <input
            type="text"
            placeholder="0x..."
            className="h-9 w-full rounded-lg border border-white/5 bg-bg-elevated px-3 text-sm font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Linked Entity</label>
          <input
            type="text"
            placeholder="e.g., Wintermute, Jump Trading"
            className="h-9 w-full rounded-lg border border-white/5 bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Title</label>
          <input
            type="text"
            placeholder="Brief description of the intel"
            className="h-9 w-full rounded-lg border border-white/5 bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Evidence</label>
          <textarea
            placeholder="Provide detailed evidence: tx hashes, flow analysis, screenshots, etc."
            rows={4}
            className="w-full rounded-lg border border-white/5 bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40 resize-none"
          />
        </div>
        <button className="flex h-9 items-center gap-2 rounded-lg bg-accent-cyan px-4 text-sm font-medium text-bg-primary hover:bg-accent-cyan/80 transition-colors">
          <Send className="h-4 w-4" />
          Submit Intel
        </button>
      </div>
    </div>
  );
}

function MySubmissionsTab() {
  return (
    <div className="space-y-3">
      {mySubmissions.map((sub) => (
        <div key={sub.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-bg-surface p-4">
          <div>
            <h4 className="text-sm font-medium text-text-primary">{sub.title}</h4>
            <p className="text-xs text-text-muted mt-0.5">{sub.entity} &middot; {formatRelativeTime(sub.timestamp)}</p>
          </div>
          <StatusBadge status={sub.status} />
        </div>
      ))}
    </div>
  );
}

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("feed");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Intel Feed", icon: <FileText className="h-4 w-4" /> },
    { id: "bounties", label: "Bounties", icon: <DollarSign className="h-4 w-4" /> },
    { id: "leaderboard", label: "Leaderboard", icon: <Trophy className="h-4 w-4" /> },
    { id: "submit", label: "Submit Intel", icon: <Plus className="h-4 w-4" /> },
    { id: "mine", label: "My Submissions", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intel Marketplace"
        description="Submit, verify, and trade onchain intelligence"
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Intel Posts" value="1,842" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Open Bounties" value="24" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Total Rewards" value={formatUsd(142000)} icon={<Trophy className="h-4 w-4" />} />
        <StatCard label="Active Reporters" value="342" change={8.2} icon={<Star className="h-4 w-4" />} />
      </div>

      <div className="flex gap-1 rounded-lg border border-white/5 bg-bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-bg-elevated text-text-primary"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "feed" && <FeedTab />}
      {tab === "bounties" && <BountiesTab />}
      {tab === "leaderboard" && <LeaderboardTab />}
      {tab === "submit" && <SubmitTab />}
      {tab === "mine" && <MySubmissionsTab />}
    </div>
  );
}
