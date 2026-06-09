import WebSocket from "ws";
import { prisma } from "../db";
import { publishEvent } from "../publisher";


// Free public Solana WebSocket RPC (no API key needed)
const SOLANA_WS_URL = process.env.SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com";

export async function startSolanaListener() {
  connectSolana();
}

function connectSolana() {
  console.log(`[solana] connecting to ${SOLANA_WS_URL}...`);

  const ws = new WebSocket(SOLANA_WS_URL);

  ws.on("open", async () => {
    console.log("[solana] connected");

    // Get tracked SOL wallets
    const wallets = await prisma.wallet.findMany({
      where: { chain: "sol" },
      select: { address: true },
    });

    if (wallets.length === 0) {
      console.log("[solana] no wallets to track");
      return;
    }

    // Subscribe to account changes for each wallet (standard Solana WebSocket)
    for (const wallet of wallets) {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "accountSubscribe",
          params: [wallet.address, { encoding: "jsonParsed", commitment: "confirmed" }],
        })
      );
    }
  });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Account change notification
      if (msg.method === "accountNotification") {
        const account = msg.params.result.value;
        const pubkey = msg.params.subscription;

        // Publish to Redis
        await publishEvent("nexus:trades", {
          chain: "sol",
          address: pubkey,
          lamports: account.lamports,
          timestamp: new Date().toISOString(),
        });

        // Update checkpoint
        await prisma.indexerCheckpoint.upsert({
          where: { chain: "sol" },
          update: { updatedAt: new Date() },
          create: { chain: "sol", lastBlock: BigInt(0) },
        });
      }
    } catch (err) {
      console.error("[solana] message error:", err);
    }
  });

  ws.on("error", (err) => {
    console.error("[solana] error:", err.message);
  });

  ws.on("close", () => {
    console.log("[solana] disconnected, reconnecting in 5s...");
    setTimeout(connectSolana, 5000);
  });
}
