"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Pause, Play, Wifi, WifiOff } from "lucide-react";
import { useSocket, type SocketEvent } from "@/lib/ws/client";

export interface FeedItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  type?: "info" | "warning" | "success" | "danger";
}

interface LiveFeedProps {
  items?: FeedItem[];
  className?: string;
  maxHeight?: number;
  /** Connect to a WebSocket namespace for real-time events */
  namespace?: string;
}

const typeColors: Record<string, string> = {
  info: "border-accent-cyan/20",
  warning: "border-warning/20",
  success: "border-accent-green/20",
  danger: "border-danger/20",
};

const typeDots: Record<string, string> = {
  info: "bg-accent-cyan",
  warning: "bg-warning",
  success: "bg-accent-green",
  danger: "bg-danger",
};

export function LiveFeed({ items, className, maxHeight = 400 }: LiveFeedProps) {
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [items, paused]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Live Feed
        </span>
        <button
          onClick={() => setPaused(!paused)}
          className="flex h-6 items-center gap-1 rounded px-2 text-[10px] text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          {paused ? (
            <>
              <Play className="h-3 w-3" /> Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" /> Pause
            </>
          )}
        </button>
      </div>
      <div
        ref={containerRef}
        className="scrollbar-thin space-y-1 overflow-y-auto"
        style={{ maxHeight }}
      >
        {(items ?? []).map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-bg-surface/50 p-3 transition-colors",
              typeColors[item.type || "info"]
            )}
          >
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full animate-live-dot",
                typeDots[item.type || "info"]
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-text-muted mt-0.5 truncate">
                  {item.description}
                </p>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-mono text-text-muted">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
