"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  LineChart,
  Grid3X3,
  TrendingUp,
  CircleDollarSign,
  Gauge,
  Building2,
  Zap,
  Rss,
  BarChart3,
  ImageIcon,
  GitBranch,
  Bell,
  Store,
  Database,
  Wallet,
  Coins,
  RefreshCw,
  Moon,
  FileText,
  Briefcase,
  Command,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  category: "Pages" | "Tokens" | "Actions";
  icon: LucideIcon;
  href?: string;
  shortcut?: string;
  action?: () => void;
}

const pages: PaletteItem[] = [
  { id: "dashboard", label: "Dashboard", category: "Pages", icon: LayoutDashboard, href: "/dashboard" },
  { id: "terminal", label: "Terminal", category: "Pages", icon: LineChart, href: "/terminal" },
  { id: "tokens", label: "Tokens", category: "Pages", icon: Coins, href: "/tokens" },
  { id: "sectors", label: "Sectors", category: "Pages", icon: Grid3X3, href: "/sectors" },
  { id: "defi", label: "DeFi", category: "Pages", icon: TrendingUp, href: "/defi" },
  { id: "stablecoins", label: "Stablecoins", category: "Pages", icon: CircleDollarSign, href: "/stablecoins" },
  { id: "fear-greed", label: "Fear & Greed", category: "Pages", icon: Gauge, href: "/fear-greed" },
  { id: "entities", label: "Entities", category: "Pages", icon: Building2, href: "/entities" },
  { id: "smart-money", label: "Smart Money", category: "Pages", icon: Zap, href: "/smart-money" },
  { id: "feeds", label: "News Feed", category: "Pages", icon: Rss, href: "/feeds" },
  { id: "predictions", label: "Predictions", category: "Pages", icon: BarChart3, href: "/predictions" },
  { id: "nft", label: "NFT Intel", category: "Pages", icon: ImageIcon, href: "/nft" },
  { id: "flows", label: "Cross-Chain Flows", category: "Pages", icon: GitBranch, href: "/flows" },
  { id: "alerts", label: "Alerts", category: "Pages", icon: Bell, href: "/alerts" },
  { id: "marketplace", label: "Marketplace", category: "Pages", icon: Store, href: "/marketplace" },
  { id: "data-sources", label: "Data Sources", category: "Pages", icon: Database, href: "/data-sources" },
  { id: "portfolio", label: "Portfolio", category: "Pages", icon: Briefcase, href: "/portfolio" },
  { id: "wallets", label: "Wallets", category: "Pages", icon: Wallet, href: "/wallets" },
];

const tokens: PaletteItem[] = [
  { id: "btc", label: "Bitcoin (BTC)", category: "Tokens", icon: Coins, href: "/token/bitcoin" },
  { id: "eth", label: "Ethereum (ETH)", category: "Tokens", icon: Coins, href: "/token/ethereum" },
  { id: "sol", label: "Solana (SOL)", category: "Tokens", icon: Coins, href: "/token/solana" },
  { id: "bnb", label: "BNB (BNB)", category: "Tokens", icon: Coins, href: "/token/binancecoin" },
  { id: "xrp", label: "XRP (XRP)", category: "Tokens", icon: Coins, href: "/token/ripple" },
  { id: "ada", label: "Cardano (ADA)", category: "Tokens", icon: Coins, href: "/token/cardano" },
  { id: "avax", label: "Avalanche (AVAX)", category: "Tokens", icon: Coins, href: "/token/avalanche-2" },
  { id: "doge", label: "Dogecoin (DOGE)", category: "Tokens", icon: Coins, href: "/token/dogecoin" },
];

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  const textLower = text.toLowerCase();
  if (textLower.includes(lower)) return true;

  let qi = 0;
  for (let ti = 0; ti < textLower.length && qi < lower.length; ti++) {
    if (textLower[ti] === lower[qi]) qi++;
  }
  return qi === lower.length;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems: PaletteItem[] = [
    ...pages,
    ...tokens,
    {
      id: "refresh",
      label: "Refresh Data",
      category: "Actions",
      icon: RefreshCw,
      shortcut: "⌘R",
      action: () => window.location.reload(),
    },
    {
      id: "theme",
      label: "Toggle Theme",
      category: "Actions",
      icon: Moon,
      shortcut: "⌘D",
      action: () => document.documentElement.classList.toggle("dark"),
    },
    {
      id: "api-docs",
      label: "View API Docs",
      category: "Actions",
      icon: FileText,
      href: "/data-sources",
    },
  ];

  const filtered = allItems.filter((item) => fuzzyMatch(query, item.label));

  const grouped = filtered.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const orderedCategories = ["Pages", "Tokens", "Actions"].filter(
    (c) => grouped[c]?.length
  );

  const flatItems: PaletteItem[] = [];
  for (const cat of orderedCategories) {
    flatItems.push(...grouped[cat]);
  }

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[activeIndex]) {
          handleSelect(flatItems[activeIndex]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatItems, activeIndex, handleSelect]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-white/10 bg-bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, pages, commands..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <kbd className="hidden items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-text-muted sm:inline-flex">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {flatItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {orderedCategories.map((category) => {
            const items = grouped[category];
            return (
              <div key={category}>
                <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {category}
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  const isActive = idx === activeIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-white/10 text-text-primary"
                          : "text-text-secondary hover:bg-white/5"
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(item)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-text-muted">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↑↓</kbd> navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↵</kbd> select
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">esc</kbd> close
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Command className="h-3 w-3" /> K to open
          </span>
        </div>
      </div>
    </div>
  );
}
