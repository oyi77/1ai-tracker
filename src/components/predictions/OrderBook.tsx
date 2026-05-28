"use client";

import { cn } from "@/lib/utils";
import type { OrderBook as OrderBookType } from "@/lib/predictions/mock-data";

interface OrderBookProps {
  data: OrderBookType;
  className?: string;
}

export function OrderBook({ data, className }: OrderBookProps) {
  const maxBidTotal = data.bids.length > 0 ? data.bids[data.bids.length - 1].total : 0;
  const maxAskTotal = data.asks.length > 0 ? data.asks[data.asks.length - 1].total : 0;
  const maxTotal = Math.max(maxBidTotal, maxAskTotal, 1);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Price</span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Size</span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="flex flex-col-reverse gap-px">
        {data.asks.slice(0, 8).map((ask, i) => (
          <div key={`ask-${i}`} className="relative flex items-center justify-between px-1 py-1">
            <div
              className="absolute inset-0 bg-danger/8"
              style={{ width: `${(ask.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-xs font-mono text-danger">
              {(ask.price * 100).toFixed(0)}&cent;
            </span>
            <span className="relative text-xs font-mono text-text-muted">
              {ask.size.toLocaleString()}
            </span>
            <span className="relative text-xs font-mono text-text-muted">
              {ask.total.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="my-1 flex items-center justify-center gap-2 rounded bg-bg-primary py-1">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Spread</span>
        <span className="text-xs font-mono font-medium text-accent-cyan">
          {(data.spread * 100).toFixed(0)}&cent;
        </span>
      </div>

      {/* Bids */}
      <div className="flex flex-col gap-px">
        {data.bids.slice(0, 8).map((bid, i) => (
          <div key={`bid-${i}`} className="relative flex items-center justify-between px-1 py-1">
            <div
              className="absolute inset-0 bg-accent-green/8"
              style={{ width: `${(bid.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-xs font-mono text-accent-green">
              {(bid.price * 100).toFixed(0)}&cent;
            </span>
            <span className="relative text-xs font-mono text-text-muted">
              {bid.size.toLocaleString()}
            </span>
            <span className="relative text-xs font-mono text-text-muted">
              {bid.total.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
