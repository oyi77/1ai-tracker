"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { Search, Wallet, Coins, Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { label: "Entities", icon: Building2, href: "/entities" },
  { label: "Tokens", icon: Coins, href: "/tokens" },
  { label: "Predictions", icon: TrendingUp, href: "/predictions" },
  { label: "Smart Money", icon: Wallet, href: "/smart-money" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [open, onOpenChange]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <Command
        className={cn(
          "relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-white/10",
          "bg-bg-surface shadow-2xl"
        )}
      >
        <div className="flex items-center border-b border-white/5 px-4">
          <Search className="h-4 w-4 text-text-muted" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search entities, wallets, tokens..."
            className="flex-1 bg-transparent px-3 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-text-muted">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-text-muted">
            No results found.
          </Command.Empty>
          <Command.Group heading="Quick Navigation" className="px-2">
            {quickActions.map((action) => (
              <Command.Item
                key={action.href}
                value={action.label}
                onSelect={() => {
                  window.location.href = action.href;
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary aria-selected:bg-bg-elevated"
              >
                <action.icon className="h-4 w-4 text-text-muted" />
                {action.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
