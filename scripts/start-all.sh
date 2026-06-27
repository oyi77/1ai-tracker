#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Nexus Service Manager — Start all services for PM2
# Usage: bash scripts/start-all.sh
# ─────────────────────────────────────────────────────────────

echo "[NEXUS] Starting all services..."

# 1. Web Server (Next.js on port 4400)
echo "  • Starting nexus-web..."
npx next start -p 4400 &
sleep 5

# 2. WebSocket Server (Socket.IO on port 4401)
echo "  • Starting nexus-ws..."
cd ws-server && npx tsx server.ts &
cd ..

# 3. Indexer (EVM + Solana + Bitcoin on port 4409)
echo "  • Starting nexus-indexer..."
cd indexer && npx tsx main.ts &
cd ..

echo "[NEXUS] All services started. Run 'pm2 list' to verify."
echo ""
echo "Health check: curl http://localhost:4400/api/v1/health"
