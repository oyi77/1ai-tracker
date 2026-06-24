import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { authMiddleware } from "./auth";
import WebSocket from "ws";
import { startSubscriber } from "./subscriber";

const PORT = parseInt(process.env.WS_PORT || "4401", 10);
const ALLOWED_ORIGINS = [
  'https://tracker.aitradepulse.com',
  'http://localhost:4400',
  'http://localhost:3000',
];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
  pingInterval: 30000,
  pingTimeout: 10000,
  transports: ["websocket", "polling"],
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), streams: activeStreams });
});

// ─── Auth-protected namespaces ──────────────────────────────
const authNamespaces = ["/trades", "/alerts", "/flows", "/cex"];
for (const ns of authNamespaces) {
  const namespace = io.of(ns);
  namespace.use(authMiddleware);
  namespace.on("connection", (socket) => {
    console.log(`[WS] Client connected to ${ns}: ${socket.id}`);
    socket.on("join", (room: string) => { socket.join(room); });
    socket.on("leave", (room: string) => { socket.leave(room); });
    socket.on("disconnect", () => {});
  });
}

// ─── Public namespaces (no auth, browser-facing) ────────────

const DEPTH_SYMBOLS = ["btcusdt", "ethusdt", "solusdt", "xrpusdt", "dogeusdt", "avaxusdt", "linkusdt", "arbusdt", "opusdt"]
let activeStreams = 0

// ═══════════════════════════════════════════════════════════
// ORDERBOOK: Binance depth20@100ms → /orderbook namespace
// ═══════════════════════════════════════════════════════════
const orderbookNs = io.of("/orderbook")

function connectDepth(symbol: string) {
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth20@100ms`)
  activeStreams++
  ws.on("open", () => console.log(`[orderbook] ${symbol} connected`))
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString())
      orderbookNs.to(symbol).emit("depth", { symbol, bids: msg.bids, asks: msg.asks, timestamp: Date.now() })
    } catch {}
  })
  ws.on("error", () => {})
  ws.on("close", () => { activeStreams--; setTimeout(() => connectDepth(symbol), 3000) })
}

orderbookNs.on("connection", (socket) => {
  console.log(`[orderbook] Client: ${socket.id}`)
  socket.on("subscribe", (symbol: string) => {
    const s = symbol.toLowerCase().replace("usdt", "") + "usdt"
    socket.join(s)
  })
  socket.on("unsubscribe", (symbol: string) => {
    socket.leave(symbol.toLowerCase().replace("usdt", "") + "usdt")
  })
  socket.on("disconnect", () => {})
})

// ═══════════════════════════════════════════════════════════
// TICKER: Binance 24h ticker → /prices namespace
// Real-time price, change, volume for all symbols
// ═══════════════════════════════════════════════════════════
const pricesNs = io.of("/prices")
const latestPrices = new Map<string, Record<string, unknown>>()

function connectTicker() {
  // Subscribe to all symbols via single combined stream
  const streams = DEPTH_SYMBOLS.map(s => `${s}@ticker`).join("/")
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
  activeStreams++
  ws.on("open", () => console.log(`[prices] ticker stream connected (${DEPTH_SYMBOLS.length} symbols)`))
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString())
      const d = msg.data
      if (!d || !d.s) return
      const symbol = d.s.replace("USDT", "").toLowerCase()
      const priceData = {
        symbol,
        price: parseFloat(d.c),
        change24h: parseFloat(d.P),
        volume24h: parseFloat(d.q),
        high24h: parseFloat(d.h),
        low24h: parseFloat(d.l),
        trades24h: parseInt(d.n),
        timestamp: Date.now(),
      }
      latestPrices.set(symbol, priceData)
      pricesNs.emit("price", priceData)
    } catch {}
  })
  ws.on("error", () => {})
  ws.on("close", () => { activeStreams--; setTimeout(connectTicker, 3000) })
}

pricesNs.on("connection", (socket) => {
  console.log(`[prices] Client: ${socket.id}`)
  // Send latest prices on connect
  for (const [, price] of latestPrices) {
    socket.emit("price", price)
  }
  socket.on("disconnect", () => {})
})

// ═══════════════════════════════════════════════════════════
// FUTURES: Binance Futures ticker → /derivatives namespace
// Funding rate, OI, mark price, basis
// ═══════════════════════════════════════════════════════════
const derivativesNs = io.of("/derivatives")
const latestDeriv = new Map<string, Record<string, unknown>>()

function connectFuturesTicker() {
  const streams = DEPTH_SYMBOLS.map(s => `${s}@ticker`).join("/")
  const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`)
  activeStreams++
  ws.on("open", () => console.log(`[derivatives] futures ticker connected`))
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString())
      const d = msg.data
      if (!d || !d.s) return
      const symbol = d.s.replace("USDT", "").toLowerCase()
      const derivData = {
        symbol,
        price: parseFloat(d.c),
        markPrice: parseFloat(d.p ?? d.c),
        indexPrice: parseFloat(d.c),
        fundingRate: parseFloat(d.r ?? "0"),
        openInterest: parseFloat(d.o ?? "0"),
        change24h: parseFloat(d.P),
        volume24h: parseFloat(d.q),
        high24h: parseFloat(d.h),
        low24h: parseFloat(d.l),
        timestamp: Date.now(),
      }
      latestDeriv.set(symbol, derivData)
      derivativesNs.emit("deriv", derivData)
    } catch {}
  })
  ws.on("error", () => {})
  ws.on("close", () => { activeStreams--; setTimeout(connectFuturesTicker, 3000) })
}

derivativesNs.on("connection", (socket) => {
  console.log(`[derivatives] Client: ${socket.id}`)
  for (const [, deriv] of latestDeriv) {
    socket.emit("deriv", deriv)
  }
  socket.on("disconnect", () => {})
})

// ═══════════════════════════════════════════════════════════
// LIQUIDATIONS: Binance Futures force orders → /liquidations
// ═══════════════════════════════════════════════════════════
const liquidationsNs = io.of("/liquidations")

function connectLiquidations() {
  const streams = DEPTH_SYMBOLS.map(s => `${s}@forceOrder`).join("/")
  const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`)
  activeStreams++
  ws.on("open", () => console.log(`[liquidations] force order stream connected`))
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString())
      const d = msg.data?.o
      if (!d) return
      const liq = {
        symbol: d.s,
        side: d.S === "BUY" ? "short" : "long", // forced buy = short liquidated
        price: parseFloat(d.p),
        quantity: parseFloat(d.q),
        usdValue: parseFloat(d.p) * parseFloat(d.q),
        timestamp: Date.now(),
      }
      liquidationsNs.emit("liquidation", liq)
    } catch {}
  })
  ws.on("error", () => {})
  ws.on("close", () => { activeStreams--; setTimeout(connectLiquidations, 3000) })
}

liquidationsNs.on("connection", (socket) => {
  console.log(`[liquidations] Client: ${socket.id}`)
  socket.on("disconnect", () => {})
})

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
for (const sym of DEPTH_SYMBOLS) connectDepth(sym)
connectTicker()
connectFuturesTicker()
connectLiquidations()

const subscriber = startSubscriber(io);

httpServer.listen(PORT, () => {
  console.log(`[WS] Socket.io server on port ${PORT}`);
  console.log(`[WS] Streams: orderbook(${DEPTH_SYMBOLS.length}), prices, derivatives, liquidations`);
});

process.on("SIGTERM", async () => {
  console.log("[WS] Shutting down...");
  await subscriber.quit();
  io.close();
  httpServer.close();
  process.exit(0);
});
