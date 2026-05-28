"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Coins,
  GitBranch,
  Bell,
  Store,
  Wallet,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "NFT Intel", href: "/nft", icon: ImageIcon },
  { label: "Cross-Chain Flows", href: "/flows", icon: GitBranch },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Marketplace", href: "/marketplace", icon: Store },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-white/5 bg-bg-surface transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/5 px-3">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-cyan/10">
              <Wallet className="h-4 w-4 text-accent-cyan" />
            </div>
            <span className="text-sm font-bold tracking-tight text-text-primary">
              NEXUS
            </span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-accent-cyan/20" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">
                0x1a2b...3c4d
              </p>
              <p className="text-[10px] text-text-muted">Connected</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
