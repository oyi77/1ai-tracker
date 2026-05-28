import { cn } from "@/lib/utils";

interface SignalStrengthProps {
  walletCount: number;
  className?: string;
}

export function SignalStrength({ walletCount, className }: SignalStrengthProps) {
  const isStrong = walletCount >= 3;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isStrong ? "text-warning" : "text-text-muted",
        className
      )}
      title={isStrong ? `Strong signal: ${walletCount} wallets` : `Signal: ${walletCount} wallet(s)`}
    >
      {isStrong ? (
        <span className="text-sm" aria-label="strong signal">&#128293;</span>
      ) : (
        <span className="text-sm" aria-label="signal">&#9889;</span>
      )}
      <span className="font-mono">{walletCount}</span>
    </span>
  );
}
