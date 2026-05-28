import { cn, formatUsd, formatPercent, formatNumber } from "@/lib/utils";
import type { DeFiProtocol } from "@/lib/mock-data";
import { RiskScore } from "@/components/domain/risk-score";
import Link from "next/link";
import { getChainColor } from "@/lib/utils";

interface ProtocolCardProps {
  protocol: DeFiProtocol;
  className?: string;
}

const categoryIcons: Record<string, string> = {
  Lending: "🏦",
  DEX: "🔄",
  Yield: "📈",
  Perpetuals: "📊",
  Bridge: "🌉",
  "Liquid Staking": "🥩",
};

export function ProtocolCard({ protocol, className }: ProtocolCardProps) {
  return (
    <Link
      href={`/defi/${protocol.id}`}
      className={cn(
        "group block rounded-lg border border-white/5 bg-bg-surface p-4 transition-all hover:border-accent-cyan/20 hover:bg-bg-elevated/50",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{categoryIcons[protocol.category] || "📦"}</span>
          <div>
            <h3 className="font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
              {protocol.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: getChainColor(protocol.chain) }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getChainColor(protocol.chain) }}
                />
                {protocol.chain}
              </span>
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                {protocol.category}
              </span>
            </div>
          </div>
        </div>
        <RiskScore score={protocol.riskScore} />
      </div>

      <p className="mt-3 text-xs text-text-muted line-clamp-2">{protocol.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">TVL</span>
          <div className="font-mono text-sm text-text-primary">{formatUsd(protocol.tvl)}</div>
          <span className={cn("text-xs font-mono", protocol.tvlChange24h >= 0 ? "text-accent-green" : "text-danger")}>
            {formatPercent(protocol.tvlChange24h)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">24h Volume</span>
          <div className="font-mono text-sm text-text-primary">
            {protocol.volume24h > 0 ? formatUsd(protocol.volume24h) : "N/A"}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Users</span>
          <div className="font-mono text-sm text-text-primary">{formatNumber(protocol.uniqueUsers)}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">SM Inflow</span>
          <div className={cn("font-mono text-sm", protocol.smartMoneyInflow >= 0 ? "text-accent-green" : "text-danger")}>
            {protocol.smartMoneyInflow >= 0 ? "+" : ""}{formatUsd(protocol.smartMoneyInflow)}
          </div>
        </div>
      </div>

      {protocol.yieldRate !== undefined && (
        <div className="mt-3 rounded-md bg-accent-green/5 px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Yield APY</span>
          <span className="ml-2 font-mono text-sm text-accent-green">{protocol.yieldRate}%</span>
        </div>
      )}
    </Link>
  );
}
