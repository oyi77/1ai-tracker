"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { cn } from "@/lib/utils";
import {
  LineChart,
  BarChart3,
  Activity,
  ChevronDown,
  Loader2,
} from "lucide-react";

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
];

type Tab = "technical" | "macro";

interface TechnicalSignal {
  indicator: string;
  value: string;
  signal: "Buy" | "Sell" | "Neutral";
}

interface MacroIndicator {
  name: string;
  value: string;
  change: string;
  impact: "Positive" | "Negative" | "Neutral";
}

export default function TerminalPage() {
  const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("technical");
  const [ohlcvLoading, setOhlcvLoading] = useState(false);
  const [macroLoading, setMacroLoading] = useState(false);
  const [technicalSignals, setTechnicalSignals] = useState<TechnicalSignal[]>([]);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);

  const fetchOhlcv = useCallback(async () => {
    setOhlcvLoading(true);
    try {
      const res = await fetch(`/api/v1/ohlcv?coin=${selectedCoin.id}`);
      if (res.ok) {
        const data = await res.json();
        setTechnicalSignals(data.signals ?? []);
      }
    } catch {
      // endpoint may not exist yet — use placeholder data
      setTechnicalSignals([
        { indicator: "RSI (14)", value: "62.4", signal: "Buy" },
        { indicator: "MACD", value: "1.23", signal: "Buy" },
        { indicator: "EMA Cross (50/200)", value: "Golden Cross", signal: "Buy" },
        { indicator: "Bollinger Bands", value: "Upper Band", signal: "Sell" },
        { indicator: "Stochastic", value: "78.5", signal: "Neutral" },
        { indicator: "ADX", value: "34.2", signal: "Neutral" },
      ]);
    } finally {
      setOhlcvLoading(false);
    }
  }, [selectedCoin.id]);

  const fetchMacro = useCallback(async () => {
    setMacroLoading(true);
    try {
      const res = await fetch("/api/v1/macro");
      if (res.ok) {
        const data = await res.json();
        setMacroIndicators(data.indicators ?? []);
      }
    } catch {
      setMacroIndicators([
        { name: "Fed Funds Rate", value: "4.50%", change: "0.00%", impact: "Neutral" },
        { name: "CPI (YoY)", value: "2.8%", change: "-0.2%", impact: "Positive" },
        { name: "DXY (Dollar Index)", value: "104.2", change: "+0.3%", impact: "Negative" },
        { name: "10Y Treasury Yield", value: "4.25%", change: "+0.05%", impact: "Negative" },
        { name: "BTC Dominance", value: "58.4%", change: "+1.2%", impact: "Neutral" },
        { name: "Total Crypto Market Cap", value: "$3.2T", change: "+2.8%", impact: "Positive" },
      ]);
    } finally {
      setMacroLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOhlcv();
  }, [fetchOhlcv]);

  useEffect(() => {
    fetchMacro();
  }, [fetchMacro]);

  const signalColor = (s: string) => {
    if (s === "Buy" || s === "Positive") return "text-green-400";
    if (s === "Sell" || s === "Negative") return "text-red-400";
    return "text-yellow-400";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terminal"
        description="OHLCV charts, technical analysis, and macro indicators"
        actions={
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary hover:bg-white/10 transition-colors"
            >
              {selectedCoin.symbol}
              <ChevronDown className="h-4 w-4 text-text-muted" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-white/10 bg-bg-surface py-1 shadow-xl">
                {COINS.map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => {
                      setSelectedCoin(coin);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/5",
                      coin.id === selectedCoin.id
                        ? "text-text-primary bg-white/5"
                        : "text-text-secondary"
                    )}
                  >
                    <span className="font-medium">{coin.symbol}</span>
                    <span className="text-text-muted">{coin.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* Chart placeholder */}
      <div className="flex flex-col rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <LineChart className="h-4 w-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-primary">
            {selectedCoin.name} ({selectedCoin.symbol}) — OHLCV
          </h2>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-text-muted/40" />
            <p className="mt-3 text-sm text-text-muted">
              TradingView chart widget will be integrated here
            </p>
            <p className="mt-1 text-xs text-text-muted/60">
              {selectedCoin.name} — Real-time OHLCV data
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/5 bg-bg-surface p-1">
        <button
          onClick={() => setActiveTab("technical")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "technical"
              ? "bg-white/10 text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          <Activity className="h-4 w-4" />
          Technical Analysis
        </button>
        <button
          onClick={() => setActiveTab("macro")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "macro"
              ? "bg-white/10 text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          <LineChart className="h-4 w-4" />
          Macro Indicators
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "technical" && (
        <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-medium text-text-primary">
              Technical Signals — {selectedCoin.symbol}
            </h3>
          </div>
          {ohlcvLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {technicalSignals.map((signal) => (
                <div
                  key={signal.indicator}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-text-secondary">{signal.indicator}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-text-primary">{signal.value}</span>
                    <span className={cn("text-xs font-semibold", signalColor(signal.signal))}>
                      {signal.signal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "macro" && (
        <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-medium text-text-primary">
              Macro Indicators
            </h3>
          </div>
          {macroLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {macroIndicators.map((ind) => (
                <div
                  key={ind.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-text-secondary">{ind.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-text-primary">{ind.value}</span>
                    <span
                      className={cn(
                        "text-xs font-mono",
                        ind.change.startsWith("+")
                          ? "text-green-400"
                          : ind.change.startsWith("-")
                            ? "text-red-400"
                            : "text-text-muted"
                      )}
                    >
                      {ind.change}
                    </span>
                    <span className={cn("text-xs font-semibold", signalColor(ind.impact))}>
                      {ind.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
