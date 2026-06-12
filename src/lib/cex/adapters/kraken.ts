/**
 * Kraken CEX Adapter
 *
 * Kraken: Major spot exchange with unique symbol naming (XBT instead of BTC, USD instead of USDT)
 * Public APIs only - no authentication required
 * No futures/liquidation data via public API
 * Rate limit: ~15 req/s (token bucket with 3s refresh)
 */

import {
  CexExchange,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
  DataValidationError,
} from "../types";
import { CexAdapter } from "./base";

const BASE_URL = "https://api.kraken.com/0/public";

/**
 * Maps internal symbol format (BTCUSDT) to Kraken format (XBTUSD)
 * For unmapped pairs, algorithm: replace USDT with USD, then map BTC→XBT
 */
const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: "XBTUSD",
  ETHUSDT: "ETHUSD",
  SOLUSDT: "SOLUSD",
  ADAUSDT: "ADAUSD",
  DOTUSDT: "DOTUSD",
  XRPUSDT: "XRPUSD",
  LINKUSDT: "LINKUSD",
  LTCUSDT: "LTCUSD",
  BCHUSD: "BCHUSD",
  XLMUSDT: "XLMUSD",
  DOGEUSD: "DOGEUSD",
};

/**
 * Kraken ticker response structure (nested by pair)
 */
interface KrakenTickerData {
  a: [price: string, wholeLotVolume: string, lotVolume: string]; // ask
  b: [price: string, wholeLotVolume: string, lotVolume: string]; // bid
  c: [price: string, volume: string]; // last trade price and volume
  v: [volume24h: string, volume24hVolumeWeightedAveragePrice: string]; // 24h volume [today, last 24h]
  p: [vwap24h: string, vwap24hVolume: string]; // volume weighted average price [today, last 24h]
  t: [trades24h: number, tradesLast24h: number]; // trade count [today, last 24h]
  l: [low24h: string, lowLast24h: string]; // low [today, last 24h]
  h: [high24h: string, highLast24h: string]; // high [today, last 24h]
  o: string; // opening price
}

interface KrakenTickerResponse {
  error: string[];
  result: Record<string, KrakenTickerData>;
}

interface KrakenAssetsResponse {
  error: string[];
  result: Record<string, unknown>;
}

export class KrakenAdapter extends CexAdapter {
  protected exchangeId = "kraken" as const;
  protected baseUrl = BASE_URL;

  /**
   * Get exchange metadata and status
   */
  async getExchangeStatus(): Promise<CexExchange> {
    try {
      const response = await this.fetch<KrakenAssetsResponse>(`${BASE_URL}/Assets`);

      if (response.error && response.error.length > 0) {
        throw new DataValidationError(
          this.exchangeId,
          "Assets",
          response.error
        );
      }

      return {
        id: "kraken",
        name: "Kraken",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0016,
        takerFee: 0.0026,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: "operational",
        lastUpdate: Date.now(),
        supports: { fundingRates: false, openInterest: false, liquidations: false },
      };
    } catch (error) {
      console.error("[Kraken] Failed to get exchange status:", error);
      return {
        id: "kraken",
        name: "Kraken",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0016,
        takerFee: 0.0026,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: "offline",
        lastUpdate: Date.now(),
        supports: { fundingRates: false, openInterest: false, liquidations: false },
      };
    }
  }

  /**
   * Get all trading pairs with spot market data
   */
  async getPairs(symbol?: string): Promise<CexPair[]> {
    const cacheKey = symbol ? `kraken:pairs:${symbol}` : "kraken:pairs:all";
    const cached = this.cache.get<CexPair[]>(cacheKey);
    if (cached) return cached;

    try {
      const pairs = await this.getSpotPairs(symbol);
      this.cache.set(cacheKey, pairs, 60); // 60s cache TTL
      return pairs;
    } catch (error) {
      console.error("[Kraken] Failed to get pairs:", error);
      return [];
    }
  }

  /**
   * Kraken public API does not expose funding rates
   */
  async getFundingRates(_symbol: string): Promise<CexFundingRate[]> {
    void _symbol;
    return [];
  }

  async getOpenInterest(_symbol: string): Promise<CexOpenInterest[]> {
    void _symbol;
    return [];
  }

  async getLiquidations(_hours: number): Promise<CexLiquidation[]> {
    void _hours;
    return [];
  }

  // ─── Private Methods ───────────────────────────────

  /**
   * Fetch spot market pairs from ticker data
   */
  private async getSpotPairs(symbol?: string): Promise<CexPair[]> {
    const pairsToFetch = symbol
      ? [this.convertToKrakenSymbol(symbol)]
      : Object.values(SYMBOL_MAP);

    // Kraken API accepts comma-separated pairs in single request
    const pairList = pairsToFetch.join(",");
    const url = `${BASE_URL}/Ticker?pair=${pairList}`;

    const response = await this.fetch<KrakenTickerResponse>(url, { tokens: 1 });

    if (response.error && response.error.length > 0) {
      console.error("[Kraken] API error in ticker fetch:", response.error);
      throw new DataValidationError(
        this.exchangeId,
        "Ticker",
        response.error
      );
    }

    if (!response.result) {
      return [];
    }

    const pairs: CexPair[] = [];
    for (const [krakenSymbol, tickerData] of Object.entries(response.result)) {
      try {
        const pair = this.normalizeTicker(krakenSymbol, tickerData);
        if (pair) pairs.push(pair);
      } catch (err) {
        console.warn(`[Kraken] Failed to normalize ticker for ${krakenSymbol}:`, err);
      }
    }

    return pairs;
  }

  /**
   * Convert internal symbol format to Kraken format
   * Examples: BTCUSDT → XBTUSD, ETHUSDT → ETHUSD
   */
  private convertToKrakenSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);

    // Check direct mapping
    if (SYMBOL_MAP[normalized]) {
      return SYMBOL_MAP[normalized];
    }

    // Fallback: replace USDT with USD, then BTC with XBT
    let result = normalized.replace("USDT", "USD");
    result = result.replace(/^BTC/, "XBT"); // Only replace at start to avoid false positives

    return result;
  }

  /**
   * Convert Kraken symbol back to internal format
   * Examples: XBTUSD → BTCUSDT, ETHUSD → ETHUSDT
   */
  private convertFromKrakenSymbol(krakenSymbol: string): string {
    // Check reverse mapping
    for (const [internal, kraken] of Object.entries(SYMBOL_MAP)) {
      if (kraken === krakenSymbol) {
        return internal;
      }
    }

    // Fallback: replace XBT with BTC, USD with USDT
    let result = krakenSymbol.replace(/^XBT/, "BTC");
    result = result.replace("USD", "USDT");

    return result;
  }

  /**
   * Normalize Kraken ticker data to unified CexPair schema
   */
  private normalizeTicker(krakenSymbol: string, ticker: KrakenTickerData): CexPair | null {
    try {
      const internalSymbol = this.convertFromKrakenSymbol(krakenSymbol);
      const { base, quote } = this.extractPairParts(internalSymbol);

      const lastPrice = parseFloat(ticker.c[0]);
      const openPrice = parseFloat(ticker.o);
      const highPrice = parseFloat(ticker.h[1]); // last 24h (index 1)
      const lowPrice = parseFloat(ticker.l[1]); // last 24h (index 1)
      const volume24h = parseFloat(ticker.v[1]); // last 24h (index 1)
      const bidPrice = parseFloat(ticker.b[0]);
      const askPrice = parseFloat(ticker.a[0]);

      if (!lastPrice || !openPrice) {
        return null;
      }

      const priceChange24hPercent = ((lastPrice - openPrice) / openPrice) * 100;
      const volumeUsd24h = volume24h * lastPrice; // estimate USD volume

      return {
        id: this.generateId(internalSymbol),
        exchange: "kraken",
        baseSymbol: base,
        quoteSymbol: quote,
        symbol: internalSymbol,
        pairType: "spot",

        // Prices
        priceUsd: lastPrice,
        priceChange24hPercent,
        priceHigh24h: highPrice,
        priceLow24h: lowPrice,
        priceOpen24h: openPrice,

        // Volume & Liquidity
        volumeUsd24h,
        volumeBase24h: volume24h,
        bidAskSpreadBps: this.calculateSpreadBps(bidPrice, askPrice),
        midPrice: (bidPrice + askPrice) / 2,

        // Exchange-specific
        isActive: true,
        minOrderSize: 0.0001,
        maxOrderSize: 10000000,

        // Metadata
        lastUpdate: Date.now(),
        confidence: 0.9,
      };
    } catch (error) {
      console.error(`[Kraken] Error normalizing ticker for ${krakenSymbol}:`, error);
      return null;
    }
  }

  /**
   * Calculate bid-ask spread in basis points
   */
  private calculateSpreadBps(bid: number, ask: number): number {
    if (bid <= 0 || ask <= 0) return 0;
    const spread = ask - bid;
    const mid = (bid + ask) / 2;
    return (spread / mid) * 10000; // convert to basis points
  }
}
