import { cn, formatNumber } from "@/lib/utils";

interface TokenAmountProps {
  amount: number;
  symbol: string;
  usdValue?: number;
  className?: string;
}

export function TokenAmount({ amount, symbol, usdValue, className }: TokenAmountProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-mono", className)}>
      <span className="text-sm text-text-primary">
        {formatNumber(amount)} {symbol}
      </span>
      {usdValue !== undefined && (
        <span className="text-xs text-text-muted">
          ({formatNumber(usdValue)})
        </span>
      )}
    </span>
  );
}
