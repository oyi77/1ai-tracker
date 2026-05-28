import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1e6 ? "compact" : "standard",
    maximumFractionDigits: value >= 1e6 ? 2 : value >= 1e3 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatRelativeTime(timestamp: Date | string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function getChainColor(chain: string): string {
  const colors: Record<string, string> = {
    ethereum: "#627EEA", arbitrum: "#28A0F0", base: "#0052FF",
    optimism: "#FF0420", solana: "#9945FF", bitcoin: "#F7931A",
  };
  return colors[chain.toLowerCase()] || "#6B7280";
}

export function getEntityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    Exchange: "#00D4FF", Whale: "#00FF88", Fund: "#FFB800",
    Protocol: "#8B5CF6", Government: "#FF3D6B", Unknown: "#6B7280",
  };
  return colors[type] || "#6B7280";
}
