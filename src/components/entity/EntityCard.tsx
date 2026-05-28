"use client";

import { cn, formatUsd, formatPercent } from "@/lib/utils";
import { EntityBadge } from "@/components/domain/entity-badge";
import { RiskScore } from "@/components/domain/risk-score";
import { PnlBadge } from "@/components/domain/pnl-badge";
import type { Entity } from "@/lib/mock/entities";

interface EntityCardProps {
  entity: Entity;
  className?: string;
}

export function EntityCard({ entity, className }: EntityCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/5 bg-bg-surface p-4 transition-colors hover:border-accent-cyan/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <EntityBadge name={entity.name} type={entity.type} verified={entity.verified} />
        <RiskScore score={entity.riskScore} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-text-muted">{entity.description}</p>
      <div className="mt-3 flex items-center gap-3">
        <div>
          <p className="text-xs text-text-muted">Total Value</p>
          <p className="font-mono text-sm font-semibold text-text-primary">
            {formatUsd(entity.totalValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">24h</p>
          <PnlBadge value={entity.change24h} />
        </div>
        <div>
          <p className="text-xs text-text-muted">7d PNL</p>
          <PnlBadge value={entity.pnl7d} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {entity.chains.map((chain) => (
          <span
            key={chain}
            className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-muted"
          >
            {chain}
          </span>
        ))}
      </div>
    </div>
  );
}
