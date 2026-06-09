# NEXUS API Reference

## Base URL

```
Production: https://tracker.aitradepulse.com
Local:      http://localhost:4400
```

## Authentication

All `/api/v1/*` endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-api-key>
```

API keys are configured via the `NEXUS_API_KEYS` environment variable (comma-separated for multiple keys).

**Exception**: `/api/v1/defillama` and `/api/auth/*` are public routes that do not require authentication.

## Rate Limiting

- **Authenticated requests**: 200 req/min per API key (middleware layer)
- **Per-IP sliding window**: 100 req/min (Redis-backed, API route layer)
- **Legacy routes**: 100 req/min per IP

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 199
X-Request-Duration-Ms: 42
```

## Response Envelope

All endpoints return a consistent JSON envelope:

```json
{
  "data": <any>,
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 200,
    "hasMore": true
  },
  "error": null
}
```

Error responses:

```json
{
  "data": null,
  "error": "Human-readable error message"
}
```

HTTP status codes:
- `200` — Success
- `400` — Bad request (invalid parameters)
- `401` — Missing or invalid API key
- `404` — Resource not found
- `429` — Rate limit exceeded
- `500` — Internal server error
- `502` — External data source failure

---

## Endpoints

### Fear & Greed Index

```
GET /api/v1/fear-greed
```

Composite crypto Fear & Greed Index built from market data (volatility, momentum, BTC dominance, volume change). Returns a score 0–100 with label and regime.

**Auth**: Required
**Cache**: 5 minutes (server-side in-memory)

**Response**:

```json
{
  "data": {
    "score": 65,
    "label": "Greed",
    "regime": { "state": "risk-on", "stance": "accumulate" },
    "categories": [
      { "name": "Volatility", "score": 70, "weight": 0.25 },
      { "name": "Momentum", "score": 60, "weight": 0.25 },
      { "name": "BTC Dominance", "score": 55, "weight": 0.25 },
      { "name": "Volume Change", "score": 75, "weight": 0.25 }
    ],
    "timestamp": "2026-06-09T12:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

---

### RSS Feeds

```
GET /api/v1/feeds
```

Aggregates crypto RSS feeds from 30+ curated sources with concurrency-limited fetching and XML parsing.

**Auth**: Required
**Cache**: None (real-time fetch)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | — | Filter by category: `breaking`, `markets`, `defi`, `nfts`, `regulation`, `technology`, `opinion`, `onchain` |
| `credibility` | string | — | Filter by source credibility: `high`, `medium`, `low` |
| `tier` | number | — | Filter by tier: `1` (wire/fastest), `2` (mainstream), `3` (niche) |
| `limit` | number | 50 | Max items (1–100) |

**Response**:

```json
{
  "data": [
    {
      "title": "Bitcoin Hits New ATH",
      "link": "https://coindesk.com/...",
      "description": "Bitcoin surged past...",
      "pubDate": "2026-06-09T10:00:00Z",
      "source": "CoinDesk",
      "category": "markets",
      "credibility": "high"
    }
  ],
  "meta": { "total": 42 },
  "error": null
}
```

---

### Macro Economic Data

```
GET /api/v1/macro
```

Macroeconomic indicators from the Federal Reserve (FRED API). Includes interest rates, inflation, employment, GDP, and cross-market data.

**Auth**: Required
**Cache**: 30 minutes (server-side in-memory)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | `all` | Filter: `rates`, `inflation`, `employment`, `growth`, `cross-market`, `all` |

**FRED Series**:

| ID | Name | Category |
|----|------|----------|
| `FEDFUNDS` | Federal Funds Effective Rate | rates |
| `DGS10` | 10-Year Treasury Rate | rates |
| `DGS2` | 2-Year Treasury Rate | rates |
| `T10Y2Y` | 10Y-2Y Treasury Spread | rates |
| `CPIAUCSL` | Consumer Price Index | inflation |
| `UNRATE` | Unemployment Rate | employment |
| `GDP` | Gross Domestic Product | growth |
| `DTWEXBGS` | Trade Weighted US Dollar Index | cross-market |
| `DCOILWTICO` | WTI Crude Oil Price | cross-market |
| `GOLDAMGBD228NLBM` | Gold Price (London Fix) | cross-market |

**Response**:

```json
{
  "data": {
    "indicators": [
      {
        "id": "FEDFUNDS",
        "name": "Federal Funds Effective Rate",
        "category": "rates",
        "latestValue": 4.5,
        "latestDate": "2026-05-01",
        "previousValue": 4.5,
        "change": 0,
        "changePercent": 0,
        "unit": "%",
        "trend": "flat"
      }
    ],
    "timestamp": "2026-06-09T12:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

---

### Cross-Market Overview

```
GET /api/v1/market
```

Combined market overview: forex, commodities, and crypto. Data from open.er-api.com, CoinPaprika, and Alternative.me.

**Auth**: Required
**Cache**: 2 minutes (server-side in-memory)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `section` | string | `all` | Filter: `forex`, `commodities`, `crypto`, `all` |

**Response**:

```json
{
  "data": {
    "forex": [
      { "pair": "EUR/USD", "base": "EUR", "quote": "USD", "rate": 1.085 }
    ],
    "commodities": [
      { "name": "Gold", "symbol": "XAU", "price": 2350.00, "currency": "USD" }
    ],
    "crypto": {
      "btcPrice": 68000,
      "ethPrice": 3800,
      "totalMarketCap": 2500000000000,
      "btcDominance": 52.5,
      "fearGreed": 65
    },
    "timestamp": "2026-06-09T12:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

**Forex Pairs**: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD

---

### OHLCV + Technical Analysis

```
GET /api/v1/ohlcv
```

OHLCV candle data with computed technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands) and trading signals. Data from CoinPaprika.

**Auth**: Required
**Cache**: None (real-time fetch)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `coin` | string | **required** | CoinPaprika coin ID (e.g. `btc-bitcoin`, `eth-ethereum`) |
| `period` | string | `30d` | Time period: `1d`, `7d`, `30d`, `90d` |
| `indicators` | string | `all` | Comma-separated: `sma`, `ema`, `rsi`, `macd`, `bollinger`, `all` |

**Response**:

```json
{
  "data": {
    "coin": { "id": "btc-bitcoin", "name": "Bitcoin", "symbol": "BTC" },
    "candles": [
      { "time": 1686000000, "open": 67500, "high": 68200, "low": 67000, "close": 68000, "volume": 25000000000 }
    ],
    "indicators": {
      "sma20": [67800],
      "ema12": [67900],
      "rsi14": [58.5],
      "macd": { "macdLine": [120], "signalLine": [100], "histogram": [20] },
      "bollinger": { "upper": [69500], "middle": [67800], "lower": [66100] }
    },
    "signals": [
      { "type": "bullish", "indicator": "RSI", "message": "RSI above 50, momentum positive", "strength": 0.6 }
    ]
  },
  "meta": null,
  "error": null
}
```

---

### Crypto Sectors

```
GET /api/v1/sectors
```

Crypto sector analysis with per-sector token breakdown, average 24h change, top gainers and losers. Data from CoinPaprika.

**Auth**: Required
**Cache**: 2 minutes (`revalidate = 120`)

**Sectors**: Layer 1, Layer 2, DeFi, Meme Coins, AI & Big Data, Gaming, Stablecoins, RWA

**Response**:

```json
{
  "data": [
    {
      "id": "layer-1",
      "name": "Layer 1",
      "tokens": [
        { "name": "Bitcoin", "symbol": "BTC", "price": 68000, "change24h": 2.5, "marketCap": 1300000000000 }
      ],
      "avgChange24h": 1.8,
      "totalMarketCap": 2100000000000,
      "topGainer": { "name": "Solana", "symbol": "SOL", "change24h": 5.2 },
      "topLoser": { "name": "Cardano", "symbol": "ADA", "change24h": -1.3 }
    }
  ],
  "meta": null,
  "error": null
}
```

---

### Stablecoin Monitor

```
GET /api/v1/stablecoins
```

Tracks 10 major stablecoins with peg deviation analysis and health status. Data from CoinPaprika.

**Auth**: Required
**Cache**: None (real-time fetch)

**Tracked Stablecoins**: USDT, USDC, DAI, BUSD, TUSD, FRAX, LUSD, USDD, PYUSD, FDUSD

**Response**:

```json
{
  "data": {
    "stablecoins": [
      {
        "id": "usdt-tether",
        "name": "Tether",
        "symbol": "USDT",
        "price": 1.0001,
        "deviation": 0.01,
        "pegStatus": "ON PEG",
        "change24h": 0.02,
        "volume24h": 50000000000,
        "marketCap": 110000000000
      }
    ],
    "summary": {
      "totalMarketCap": 160000000000,
      "totalVolume24h": 80000000000,
      "coinCount": 10,
      "depeggedCount": 0,
      "healthStatus": "HEALTHY"
    }
  },
  "meta": null,
  "error": null
}
```

**Peg Status**: `ON PEG` (< 0.5% deviation), `SLIGHT DEPEG` (0.5–2%), `DEPEG` (> 2%)

**Health Status**: `HEALTHY` (all on peg), `CAUTION` (slight depegs), `WARNING` (any depeg)

---

### Trending Tokens

```
GET /api/v1/trending
```

Trending tokens and pools from multiple sources.

**Auth**: Required
**Cache**: None (real-time fetch)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | string | `geckoterminal` | Data source: `geckoterminal`, `coinpaprika`, `new-pools` |
| `limit` | number | 20 | Max results (1–50) |
| `network` | string | — | Filter by network (for `new-pools` source) |

**Response** (`geckoterminal`):

```json
{
  "data": [
    {
      "name": "PEPE/ETH",
      "address": "0x...",
      "network": "eth",
      "priceUsd": 0.000012,
      "volume24h": 5000000,
      "priceChange24h": 15.5
    }
  ],
  "meta": { "total": 20 },
  "error": null
}
```

---

### Crypto News

```
GET /api/v1/news
```

Latest crypto news articles from CryptoCompare.

**Auth**: Required
**Cache**: None (real-time fetch)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `categories` | string | — | Comma-separated category filter |
| `limit` | number | 20 | Max articles (1–50) |

**Response**:

```json
{
  "data": [
    {
      "id": "abc123",
      "title": "Bitcoin ETF Sees Record Inflows",
      "url": "https://...",
      "source": "CryptoCompare",
      "sourceLogo": "https://...",
      "publishedAt": "2026-06-09T10:00:00.000Z",
      "categories": "BTC,ETF",
      "tags": "bitcoin,etf,inflows",
      "upvotes": 150,
      "downvotes": 5
    }
  ],
  "meta": { "total": 20 },
  "error": null
}
```

---

### Data Sources Health

```
GET /api/v1/data-sources
```

Health and availability status of all 17 external data integrations. Performs live health checks for dynamic sources and reports configuration status for static ones.

**Auth**: Required
**Cache**: None (real-time checks)

**Response**:

```json
{
  "data": {
    "sources": [
      {
        "name": "DeFiLlama",
        "category": "DeFi",
        "available": true,
        "details": { "protocols": 2500, "chains": 200 },
        "latencyMs": 342
      },
      {
        "name": "Alchemy",
        "category": "RPC",
        "available": true,
        "details": {
          "configured": true,
          "chains": ["eth", "arbitrum", "base", "optimism"],
          "features": ["token-balances", "transfers", "nft-data", "enhanced-rpc"]
        }
      }
    ],
    "byCategory": {
      "DeFi": [{ "name": "DeFiLlama", "..." : "..." }],
      "RPC": [{ "name": "Alchemy", "..." : "..." }]
    },
    "summary": {
      "total": 17,
      "available": 14,
      "unavailable": 3,
      "coverage": "82%"
    }
  },
  "meta": null,
  "error": null
}
```

**Dynamic sources** (live health check): DeFiLlama, Helius, GeckoTerminal, CoinPaprika, CryptoCompare, LunarCrush

**Static sources** (config check): Alchemy, Etherscan, RSS Feeds, CoinGecko, DexScreener, Polymarket, Blockstream, Reservoir, FRED, Exchange Rates API

---

### Token Analytics

```
GET /api/v1/tokens
```

Paginated token list with smart money flow data. Backed by PostgreSQL.

**Auth**: Required
**Cache**: Database-backed (no server-side cache)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `pageSize` | number | `50` | Items per page |
| `chain` | string | — | Filter by chain (e.g. `eth`, `sol`) |
| `sort` | string | `smartMoneyFlow` | Sort field: `smartMoneyFlow`, `volume24h`, `marketCap`, `price` |
| `order` | string | `desc` | Sort order: `asc`, `desc` |

**Response**:

```json
{
  "data": [
    {
      "id": "clxxx...",
      "address": "0x...",
      "chain": "eth",
      "name": "Ethereum",
      "symbol": "ETH",
      "price": 3800,
      "marketCap": 450000000000,
      "volume24h": 15000000000,
      "holderCount": 1200000,
      "smartMoneyFlow": 5000000
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "total": 200, "hasMore": true },
  "error": null
}
```

---

### Entity Explorer

```
GET /api/v1/entities
```

Paginated list of tracked entities (whales, funds, exchanges, protocols) with wallet associations. Backed by PostgreSQL.

**Auth**: Required
**Cache**: Database-backed

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `pageSize` | number | `50` | Items per page |
| `cursor` | string | — | Cursor for keyset pagination |
| `type` | string | — | Filter: `whale`, `fund`, `exchange`, `protocol` |
| `chain` | string | — | Filter by chain (uses array containment) |
| `sort` | string | `totalUsdValue` | Sort field |
| `order` | string | `desc` | Sort order |

**Response**:

```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "Jump Trading",
      "type": "fund",
      "verified": true,
      "logoUrl": "https://...",
      "chains": ["eth", "sol"],
      "totalUsdValue": 500000000,
      "wallets": [
        { "address": "0x...", "chain": "eth" }
      ]
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "total": 50, "hasMore": false },
  "error": null
}
```

---

### Smart Money Wallets

```
GET /api/v1/smart-money
```

Paginated list of smart money wallets with scoring and categorization. Backed by PostgreSQL.

**Auth**: Required
**Cache**: Database-backed

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `pageSize` | number | `50` | Items per page |
| `category` | string | — | Filter by category (e.g. `accumulator`, `distributor`, `sniper`) |
| `sort` | string | `score` | Sort field |
| `order` | string | `desc` | Sort order |

**Response**:

```json
{
  "data": [
    {
      "id": "clxxx...",
      "walletId": "clyyy...",
      "category": "accumulator",
      "score": 92.5,
      "addedAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "total": 150, "hasMore": true },
  "error": null
}
```

---

### Alerts

```
GET /api/v1/alerts
POST /api/v1/alerts
```

Manage user-configured alert conditions.

**Auth**: Required

#### GET

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | string | — | Filter by user ID |
| `active` | string | — | Filter by active status: `true`, `false` |

**Response**:

```json
{
  "data": [
    {
      "id": "clxxx...",
      "userId": "user-1",
      "triggerType": "whale_transfer",
      "conditions": { "minUsd": 1000000, "chain": "eth" },
      "isActive": true,
      "lastFired": "2026-06-08T15:30:00.000Z",
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "meta": { "pageSize": 2, "hasMore": false },
  "error": null
}
```

#### POST

**Request Body**:

```json
{
  "userId": "user-1",
  "triggerType": "whale_transfer",
  "conditions": { "minUsd": 1000000, "chain": "eth" }
}
```

**Response** (201):

```json
{
  "data": {
    "id": "clxxx...",
    "userId": "user-1",
    "triggerType": "whale_transfer",
    "conditions": { "minUsd": 1000000, "chain": "eth" },
    "isActive": true,
    "lastFired": null,
    "createdAt": "2026-06-09T12:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

---

### Capital Flows

```
GET /api/v1/flows
```

Aggregated capital flow data between entities. Queries recent transactions and groups by entity pairs.

**Auth**: Required
**Cache**: Database-backed

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `chain` | string | — | Filter by chain |
| `limit` | number | `100` | Max transactions to aggregate (1–200) |

**Response**:

```json
{
  "data": [
    { "from": "Binance", "to": "Jump Trading", "totalUsd": 50000000, "count": 12 }
  ],
  "meta": { "pageSize": 1, "hasMore": false },
  "error": null
}
```

---

### Prediction Markets

```
GET /api/v1/predictions
```

Paginated prediction market data. Backed by PostgreSQL.

**Auth**: Required
**Cache**: Database-backed

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `pageSize` | number | `50` | Items per page |
| `category` | string | — | Filter by category |
| `status` | string | `open` | Filter: `open`, `closed`, `resolved` |
| `sort` | string | `volume24h` | Sort field |
| `order` | string | `desc` | Sort order |

**Response**:

```json
{
  "data": [
    {
      "id": "clxxx...",
      "source": "polymarket",
      "externalId": "0x...",
      "title": "Will BTC hit $100K by end of 2026?",
      "category": "crypto",
      "yesPrice": 0.65,
      "noPrice": 0.35,
      "volume24h": 2500000,
      "totalVolume": 50000000,
      "traderCount": 15000,
      "status": "open"
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "total": 200, "hasMore": true },
  "error": null
}
```

---

### DeFiLlama Data

```
GET /api/v1/defillama
```

Multi-action endpoint for DeFiLlama data. **Public — no auth required.**

**Auth**: Not required
**Cache**: DeFiLlama client-side caching (varies by action)

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `action` | string | `protocols` | Action (see below) |
| `chain` | string | — | Chain filter (where applicable) |
| `limit` | number | `50` | Max results (1–200) |
| `stablecoin` | string | — | For `yields`: set to `true` for stablecoin-only pools |

**Actions**:

| Action | Description |
|--------|-------------|
| `protocols` | Top DeFi protocols by TVL |
| `yields` | Top yield pools (filterable by chain and stablecoin) |
| `chains` | Chain TVL breakdown |
| `chain-tvl` | Historical TVL for a specific chain (requires `chain` param) |
| `stablecoins` | Tracked stablecoin data |
| `dex-volumes` | DEX volume overview (filterable by chain) |
| `bridges` | Bridge volume overview (filterable by chain) |
| `fees` | Protocol fees overview |
| `health` | DeFiLlama API health check |

**Response** (`action=protocols`):

```json
{
  "data": [
    {
      "name": "Lido",
      "tvl": 15000000000,
      "chain": "Ethereum",
      "category": "Liquid Staking",
      "change_1d": 1.5,
      "change_7d": 3.2
    }
  ],
  "meta": { "total": 50 },
  "error": null
}
```

---

### API Usage

```
GET /api/v1/usage
```

Returns usage statistics for the authenticated API key. In-memory tracking per edge instance.

**Auth**: Required

**Response**:

```json
{
  "data": {
    "totalCalls": 1542,
    "lastCalledAt": "2026-06-09T12:00:00.000Z",
    "endpoints": {
      "/api/v1/tokens": 500,
      "/api/v1/entities": 300,
      "/api/v1/smart-money": 250
    },
    "topEndpoints": [
      { "endpoint": "/api/v1/tokens", "count": 500 },
      { "endpoint": "/api/v1/entities", "count": 300 }
    ]
  },
  "meta": null,
  "error": null
}
```

---

### Wallet Details

```
GET /api/v1/wallets/:address
```

Detailed wallet information including entity association, token holdings, and recent transactions.

**Auth**: Not required (uses NextResponse directly, no middleware auth)
**Cache**: Database-backed

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `address` | string | Blockchain wallet address |

**Response**:

```json
{
  "data": {
    "id": "clxxx...",
    "address": "0x1234...",
    "chain": "eth",
    "entityId": "clyyy...",
    "entity": { "id": "clyyy...", "name": "Jump Trading", "type": "fund", "verified": true },
    "labels": ["hot_wallet", "dex_trader"],
    "riskScore": 15,
    "lastSeen": "2026-06-09T11:55:00.000Z",
    "holdings": [
      {
        "amount": 100,
        "usdValue": 380000,
        "token": { "symbol": "ETH", "name": "Ethereum", "price": 3800, "chain": "eth" }
      }
    ],
    "transactions": [
      {
        "hash": "0xabc...",
        "fromWallet": "0x1234...",
        "toWallet": "0x5678...",
        "amountUsd": 500000,
        "chain": "eth",
        "timestamp": "2026-06-09T10:00:00.000Z",
        "decodedType": "swap"
      }
    ]
  }
}
```

**Error** (404):

```json
{ "error": "Wallet not found" }
```

---

## WebSocket API

Connect to `wss://tracker.aitradepulse.com` (or `ws://localhost:4401` locally) with Bearer token authentication.

### Connection

```javascript
import { io } from "socket.io-client";

const socket = io("wss://tracker.aitradepulse.com", {
  auth: { token: "your-api-key" },
  transports: ["websocket", "polling"]
});
```

### Namespaces

| Namespace | Events | Description |
|-----------|--------|-------------|
| `/trades` | `trade` | Real-time decoded transactions |
| `/alerts` | `alert` | Alert trigger notifications |
| `/prices` | `price` | Price updates |
| `/flows` | `flow` | Capital flow events |

### Rooms

Clients can join chain-specific rooms to filter events:

```javascript
const tradesNs = socket.of("/trades");
tradesNs.emit("join", "eth");  // Only ETH trades
tradesNs.emit("join", "sol");  // Add SOL trades
```

### Events

```javascript
// Trade event
socket.on("trade", (data) => {
  // { chain, from, to, amountUsd, hash, decodedType, timestamp }
});

// Smart money signal
socket.on("smart-money", (signal) => {
  // { type, entity, score, wallet, chain }
});

// Alert trigger
socket.on("alert", (alert) => {
  // { alertId, triggerType, conditions, matchedData }
});
```
