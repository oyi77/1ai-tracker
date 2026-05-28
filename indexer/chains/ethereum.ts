import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";
import { decodeTransaction, storeTransaction } from "../processors/transaction";
import { detectSmartMoneyActivity } from "../processors/smart-money";
import { publishEvent } from "../publisher";

const prisma = new PrismaClient();

// Free public WebSocket RPC endpoints (no API key needed)
const CHAINS = ["eth", "arb", "base", "op"] as const;
type Chain = (typeof CHAINS)[number];

const PUBLIC_WS_URLS: Record<Chain, string> = {
  eth: process.env.ETH_WS_URL || "wss://ethereum-rpc.publicnode.com",
  arb: process.env.ARB_WS_URL || "wss://arbitrum-one-rpc.publicnode.com",
  base: process.env.BASE_WS_URL || "wss://base-rpc.publicnode.com",
  op: process.env.OP_WS_URL || "wss://optimism-rpc.publicnode.com",
};

interface BlockHeader {
  hash: string;
  number: string;
  timestamp: string;
}

export async function startEthereumListener() {
  for (const chain of CHAINS) {
    connectChain(chain);
  }
}

function connectChain(chain: Chain) {
  const url = PUBLIC_WS_URLS[chain];
  console.log(`[ethereum:${chain}] connecting to ${url}...`);

  const ws = new WebSocket(url);

  ws.on("open", async () => {
    console.log(`[ethereum:${chain}] connected`);

    // Get tracked wallet addresses
    const wallets = await prisma.wallet.findMany({
      where: { chain },
      select: { address: true },
    });

    if (wallets.length === 0) {
      console.log(`[ethereum:${chain}] no wallets to track, subscribing to new blocks only`);
    }

    // Subscribe to new blocks (standard eth_subscribe)
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: ["newHeads"],
      })
    );

    // Subscribe to logs for tracked wallets (standard eth_subscribe)
    if (wallets.length > 0) {
      const addresses = wallets.map((w: { address: string }) => w.address.toLowerCase());
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_subscribe",
          params: [
            "logs",
            {
              address: addresses,
            },
          ],
        })
      );
    }
  });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // New block notification
      if (msg.method === "eth_subscription" && msg.params?.result?.number) {
        const header: BlockHeader = msg.params.result;
        console.log(`[ethereum:${chain}] new block ${parseInt(header.number, 16)}`);

        // Update checkpoint
        await prisma.indexerCheckpoint.upsert({
          where: { chain },
          update: { lastBlock: BigInt(parseInt(header.number, 16)), updatedAt: new Date() },
          create: { chain, lastBlock: BigInt(parseInt(header.number, 16)) },
        });
      }

      // Log notification (wallet activity)
      if (msg.method === "eth_subscription" && msg.params?.result?.transactionHash) {
        const log = msg.params.result;
        const tx = await decodeTransaction({
          hash: log.transactionHash,
          from: log.address,
          to: log.address,
          chain,
          value: "0",
          timestamp: Math.floor(Date.now() / 1000),
          input: log.data || "0x",
        });

        await storeTransaction(tx);
        await detectSmartMoneyActivity(tx);

        await publishEvent("nexus:trades", {
          chain,
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          decodedType: tx.decodedType,
          amountUsd: tx.amountUsd,
          timestamp: tx.timestamp.toISOString(),
        });
      }
    } catch (err) {
      console.error(`[ethereum:${chain}] message error:`, err);
    }
  });

  ws.on("error", (err) => {
    console.error(`[ethereum:${chain}] error:`, err.message);
  });

  ws.on("close", () => {
    console.log(`[ethereum:${chain}] disconnected, reconnecting in 5s...`);
    setTimeout(() => connectChain(chain), 5000);
  });
}
