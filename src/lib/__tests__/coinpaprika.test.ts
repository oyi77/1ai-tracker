import { describe, it, expect } from 'vitest';
import { mapTicker } from '../coinpaprika';
import type { RawTicker, Ticker } from '../coinpaprika';

function makeRawTicker(overrides?: Partial<RawTicker>): RawTicker {
  return {
    id: 'btc-bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    rank: 1,
    circulating_supply: 19_500_000,
    total_supply: 19_500_000,
    max_supply: 21_000_000,
    beta_value: 1.0,
    first_data_at: '2010-07-13T00:00:00Z',
    last_updated: '2024-01-01T00:00:00Z',
    quotes: {
      USD: {
        price: 42_000.50,
        volume_24h: 25_000_000_000,
        volume_24h_change_24h: 5.5,
        market_cap: 820_000_000_000,
        market_cap_change_24h: 2.1,
        percent_change_15m: 0.1,
        percent_change_30m: 0.2,
        percent_change_1h: 0.5,
        percent_change_6h: 1.2,
        percent_change_12h: 1.8,
        percent_change_24h: 3.5,
        percent_change_7d: 8.2,
        percent_change_30d: 15.0,
        percent_change_1y: 120.0,
        ath_price: 69_000,
        ath_date: '2021-11-10T00:00:00Z',
        percent_from_price_ath: -39.13,
      },
    },
    ...overrides,
  };
}

describe('mapTicker', () => {
  it('correctly extracts top-level fields from raw ticker', () => {
    const raw = makeRawTicker();
    const ticker = mapTicker(raw);

    expect(ticker.id).toBe('btc-bitcoin');
    expect(ticker.name).toBe('Bitcoin');
    expect(ticker.symbol).toBe('BTC');
    expect(ticker.rank).toBe(1);
    expect(ticker.circulatingSupply).toBe(19_500_000);
    expect(ticker.totalSupply).toBe(19_500_000);
    expect(ticker.maxSupply).toBe(21_000_000);
  });

  it('correctly extracts quotes.USD fields', () => {
    const raw = makeRawTicker();
    const ticker = mapTicker(raw);

    expect(ticker.price).toBe(42_000.50);
    expect(ticker.volume24h).toBe(25_000_000_000);
    expect(ticker.marketCap).toBe(820_000_000_000);
    expect(ticker.change1h).toBe(0.5);
    expect(ticker.change24h).toBe(3.5);
    expect(ticker.change7d).toBe(8.2);
    expect(ticker.change30d).toBe(15.0);
    expect(ticker.change1y).toBe(120.0);
    expect(ticker.athPrice).toBe(69_000);
    expect(ticker.athDate).toBe('2021-11-10T00:00:00Z');
    expect(ticker.athDrop).toBe(-39.13);
  });

  it('handles null maxSupply', () => {
    const raw = makeRawTicker({ max_supply: null });
    const ticker = mapTicker(raw);
    expect(ticker.maxSupply).toBeNull();
  });

  it('produces correct Ticker type shape (all required fields present)', () => {
    const raw = makeRawTicker();
    const ticker = mapTicker(raw);

    const expectedKeys: (keyof Ticker)[] = [
      'id', 'name', 'symbol', 'rank', 'price', 'volume24h', 'marketCap',
      'change1h', 'change24h', 'change7d', 'change30d', 'change1y',
      'athPrice', 'athDate', 'athDrop', 'circulatingSupply', 'totalSupply', 'maxSupply',
    ];
    for (const key of expectedKeys) {
      expect(ticker).toHaveProperty(key);
    }
  });

  it('does not include raw API fields in the output', () => {
    const raw = makeRawTicker();
    const ticker = mapTicker(raw);
    const keys = Object.keys(ticker);

    // Raw snake_case fields should NOT be present
    expect(keys).not.toContain('circulating_supply');
    expect(keys).not.toContain('total_supply');
    expect(keys).not.toContain('max_supply');
    expect(keys).not.toContain('beta_value');
    expect(keys).not.toContain('first_data_at');
    expect(keys).not.toContain('last_updated');
    expect(keys).not.toContain('quotes');
  });
});
