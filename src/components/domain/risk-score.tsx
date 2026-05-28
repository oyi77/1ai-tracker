import { cn } from "@/lib/utils";

interface RiskScoreProps {
  score: number;
  className?: string;
}

export function RiskScore({ score, className }: RiskScoreProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const level =
    clampedScore <= 30 ? "low" : clampedScore <= 70 ? "medium" : "high";
  const color =
    level === "low"
      ? "bg-accent-green"
      : level === "medium"
        ? "bg-warning"
        : "bg-danger";
  const textColor =
    level === "low"
      ? "text-accent-green"
      : level === "medium"
        ? "text-warning"
        : "text-danger";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-elevated">
        <span
          className={cn("block h-full rounded-full", color)}
          style={{ width: `${clampedScore}%` }}
        />
      </span>
      <span className={cn("text-xs font-mono font-medium", textColor)}>
        {clampedScore}
      </span>
    </span>
  );
}
