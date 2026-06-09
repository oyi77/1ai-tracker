import { prisma } from "../db";


export interface DecodedTransaction {
  hash: string;
  from: string;
  to: string;
  chain: string;
  amountUsd: number;
  timestamp: Date;
  decodedType: "send" | "receive" | "swap" | "bridge";
  tokenId?: string;
  walletId?: string;
}

export async function decodeTransaction(raw: {
  hash: string;
  from: string;
  to: string;
  chain: string;
  value: string;
  timestamp: number;
  input: string;
}): Promise<DecodedTransaction> {
  const decodedType = classifyTransaction(raw);

  // Look up wallet by address
  const wallet = await prisma.wallet.findUnique({
    where: { address: raw.from.toLowerCase() },
  });

  return {
    hash: raw.hash,
    from: raw.from.toLowerCase(),
    to: raw.to.toLowerCase(),
    chain: raw.chain,
    amountUsd: 0, // Price lookup would happen here
    timestamp: new Date(raw.timestamp * 1000),
    decodedType,
    walletId: wallet?.id,
  };
}

function classifyTransaction(raw: { input: string; from: string; to: string }): DecodedTransaction["decodedType"] {
  // Simple heuristics for transaction classification
  if (raw.input === "0x" || raw.input === "") {
    return "send";
  }

  // Common function signatures
  const sig = raw.input.slice(0, 10);

  // swapExactTokensForTokens, swapExactETHForTokens
  if (["0x38ed1739", "0x7ff36ab5", "0x18cbafe5", "0xfb3bdb41"].includes(sig)) {
    return "swap";
  }

  // bridge-related (generic detection)
  if (raw.from !== raw.to && raw.input.length > 10) {
    return "bridge";
  }

  return "send";
}

export async function storeTransaction(tx: DecodedTransaction): Promise<void> {
  if (!tx.walletId) return;

  await prisma.transaction.upsert({
    where: { hash: tx.hash },
    update: {},
    create: {
      hash: tx.hash,
      fromWallet: tx.from,
      toWallet: tx.to,
      tokenId: tx.tokenId,
      amountUsd: tx.amountUsd,
      chain: tx.chain,
      timestamp: tx.timestamp,
      decodedType: tx.decodedType,
      walletId: tx.walletId,
    },
  });
}
