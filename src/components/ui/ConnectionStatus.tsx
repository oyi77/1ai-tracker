"use client";

import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  connected: boolean;
  label?: string;
  className?: string;
}

export function ConnectionStatus({ connected, label, className }: ConnectionStatusProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected ? "bg-accent-green animate-live-dot" : "bg-danger"
        )}
      />
      {label && (
        <span className="text-[10px] font-mono text-text-muted">
          {label}
        </span>
      )}
    </span>
  );
}
