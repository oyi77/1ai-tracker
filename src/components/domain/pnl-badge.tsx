import { cn } from "@/lib/utils";

interface PnlBadgeProps {
  value: number;
  className?: string;
}

export function PnlBadge({ value, className }: PnlBadgeProps) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium",
        isPositive
          ? "bg-accent-green/10 text-accent-green"
          : "bg-danger/10 text-danger",
        className
      )}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
