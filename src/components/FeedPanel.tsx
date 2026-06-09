"use client";

import { useState } from "react";
import { useApi } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";
import {
  Rss,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Clock,
  Newspaper,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface FeedArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: string;
  credibility: "high" | "medium" | "low";
}

interface FeedStats {
  total: number;
  byCategory: Record<string, number>;
  byCredibility: Record<string, number>;
  byTier: Record<number, number>;
}

interface FeedsResponse {
  data: {
    articles: FeedArticle[];
    total: number;
    feedCount: number;
    stats?: FeedStats;
  };
}

// ─── Helpers ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  breaking: "Breaking",
  markets: "Markets",
  defi: "DeFi",
  nfts: "NFTs",
  regulation: "Regulation",
  technology: "Technology",
  opinion: "Opinion",
  onchain: "On-Chain",
};

const CATEGORY_COLORS: Record<string, string> = {
  breaking: "bg-red-500/20 text-red-400 border-red-500/30",
  markets: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  defi: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  nfts: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  regulation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  technology: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  opinion: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  onchain: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function CredibilityIcon({ level }: { level: "high" | "medium" | "low" }) {
  switch (level) {
    case "high":
      return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    case "medium":
      return <Shield className="w-3.5 h-3.5 text-amber-400" />;
    case "low":
      return <ShieldAlert className="w-3.5 h-3.5 text-red-400" />;
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diff = now - then;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Component ──────────────────────────────────────────────

const CATEGORIES = ["all", "breaking", "markets", "defi", "nfts", "regulation", "technology", "onchain"] as const;

export default function FeedPanel() {
  const [category, setCategory] = useState<string>("all");
  const [credibility, setCredibility] = useState<string>("all");

  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (credibility !== "all") params.set("credibility", credibility);
  params.set("limit", "40");
  params.set("stats", "true");
  const { data, loading: isLoading, error, refetch: refresh } = useApi<FeedsResponse["data"]>(
    `/v1/feeds?${params.toString()}`,
    { refreshInterval: 5 * 60_000 }
  );

  const articles = data?.articles ?? [];
  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Crypto News Feed</h2>
          {data && (
            <span className="text-xs text-zinc-500">
              {data.total} articles from {data.feedCount} sources
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                category === cat
                  ? "bg-white/10 text-white border-white/20"
                  : "text-zinc-400 border-transparent hover:text-zinc-200 hover:border-white/10"
              )}
            >
              {cat === "all" ? "All" : (CATEGORY_LABELS[cat] ?? cat)}
              {stats && cat !== "all" && stats.byCategory[cat] ? (
                <span className="ml-1 text-zinc-500">{stats.byCategory[cat]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Credibility filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-zinc-500">Trust:</span>
          {(["all", "high", "medium", "low"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setCredibility(level)}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-all",
                credibility === level
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !articles.length && (
        <div className="text-center py-8">
          <Newspaper className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Failed to load feeds</p>
          <button onClick={refresh} className="text-xs text-blue-400 hover:text-blue-300 mt-1">
            Retry
          </button>
        </div>
      )}

      {/* Articles */}
      <div className="space-y-2">
        {articles.map((article, i) => (
          <a
            key={`${article.link}-${i}`}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block group rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white line-clamp-2 transition-colors">
                  {article.title}
                </h3>

                {/* Description */}
                {article.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                    {article.description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 mt-2">
                  {/* Source + credibility */}
                  <div className="flex items-center gap-1">
                    <CredibilityIcon level={article.credibility} />
                    <span className="text-xs text-zinc-400 font-medium">{article.source}</span>
                  </div>

                  {/* Category badge */}
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                      CATEGORY_COLORS[article.category] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}
                  >
                    {CATEGORY_LABELS[article.category] ?? article.category}
                  </span>

                  {/* Time */}
                  {article.pubDate && (
                    <div className="flex items-center gap-1 text-zinc-600">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{timeAgo(article.pubDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* External link icon */}
              <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-0.5 transition-colors" />
            </div>
          </a>
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && !error && articles.length === 0 && (
        <div className="text-center py-8">
          <Newspaper className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No articles found</p>
          <p className="text-xs text-zinc-600 mt-1">Try changing the filters</p>
        </div>
      )}

      {/* Stats footer */}
      {stats && (
        <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-2 border-t border-white/5">
          <span>{stats.total} feeds configured</span>
          <div className="flex gap-3">
            <span className="text-emerald-600">{stats.byCredibility.high} high trust</span>
            <span className="text-amber-600">{stats.byCredibility.medium} medium</span>
            <span className="text-red-600">{stats.byCredibility.low} low</span>
          </div>
        </div>
      )}
    </div>
  );
}
