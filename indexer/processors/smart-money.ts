import { PrismaClient } from "@prisma/client";
import { DecodedTransaction } from "./transaction";
import { publishEvent } from "../publisher";

const prisma = new PrismaClient();

export interface SmartMoneyEvent {
  walletAddress: string;
  chain: string;
  action: "Accumulated" | "Exited" | "Bridged" | "Swapped";
  score: number;
  txHash: string;
  amountUsd: number;
  timestamp: Date;
}

export async function detectSmartMoneyActivity(tx: DecodedTransaction): Promise<SmartMoneyEvent | null> {
  if (!tx.walletId) return null;

  const smartWallet = await prisma.smartMoneyWallet.findUnique({
    where: { walletId: tx.walletId },
    include: { wallet: true },
  });

  if (!smartWallet) return null;

  const action = classifySmartMoneyAction(tx);

  if (!action) return null;

  const event: SmartMoneyEvent = {
    walletAddress: tx.from,
    chain: tx.chain,
    action,
    score: smartWallet.score,
    txHash: tx.hash,
    amountUsd: tx.amountUsd,
    timestamp: tx.timestamp,
  };

  // Publish to Redis
  await publishEvent("nexus:alerts", {
    type: "smart_money_action",
    triggerType: "smart_money_action",
    walletAddress: event.walletAddress,
    chain: event.chain,
    action: event.action,
    score: event.score,
    txHash: event.txHash,
    amountUsd: event.amountUsd,
    timestamp: event.timestamp.toISOString(),
  });

  return event;
}

function classifySmartMoneyAction(tx: DecodedTransaction): SmartMoneyEvent["action"] | null {
  switch (tx.decodedType) {
    case "swap":
      return "Swapped";
    case "bridge":
      return "Bridged";
    case "receive":
      return "Accumulated";
    case "send":
      return "Exited";
    default:
      return null;
  }
}
