"use client";

import { cn, formatAddress } from "@/lib/utils";
import { Copy, ExternalLink } from "lucide-react";

interface WalletAddressProps {
  address: string;
  chain?: string;
  chars?: number;
  className?: string;
}

export function WalletAddress({ address, chain, chars = 4, className }: WalletAddressProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
  };

  const explorerUrl = chain
    ? getExplorerUrl(chain, address)
    : undefined;

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-sm", className)}>
      <span className="text-text-primary">{formatAddress(address, chars)}</span>
      <button
        onClick={handleCopy}
        className="text-text-muted hover:text-accent-cyan transition-colors"
        title="Copy address"
      >
        <Copy className="h-3 w-3" />
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-accent-cyan transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </span>
  );
}

function getExplorerUrl(chain: string, address: string): string {
  const explorers: Record<string, string> = {
    ethereum: `https://etherscan.io/address/${address}`,
    arbitrum: `https://arbiscan.io/address/${address}`,
    base: `https://basescan.org/address/${address}`,
    optimism: `https://optimistic.etherscan.io/address/${address}`,
    solana: `https://solscan.io/account/${address}`,
    bitcoin: `https://mempool.space/address/${address}`,
  };
  return explorers[chain.toLowerCase()] || "";
}
