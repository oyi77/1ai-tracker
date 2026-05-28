import http from "http";
import { redis } from "./publisher";
import { startEthereumListener } from "./chains/ethereum";
import { startSolanaListener } from "./chains/solana";
import { startBitcoinListener } from "./chains/bitcoin";

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || "9090", 10);

async function main() {
  console.log("[indexer] starting nexus indexer sidecar...");

  // Test Redis connection
  try {
    await redis.ping();
    console.log("[indexer] redis connection OK");
  } catch (err) {
    console.warn("[indexer] redis not available, will retry:", (err as Error).message);
  }

  // Start chain listeners
  await Promise.allSettled([startEthereumListener(), startSolanaListener(), startBitcoinListener()]);

  // Health check HTTP server
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[indexer] health check on :${HEALTH_PORT}/health`);
  });
}

main().catch((err) => {
  console.error("[indexer] fatal:", err);
  process.exit(1);
});
