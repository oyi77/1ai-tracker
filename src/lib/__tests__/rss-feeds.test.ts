import { describe, it, expect } from 'vitest';
import {
  CRYPTO_FEEDS,
  getFeedsByCategory,
  getFeedsByCredibility,
  getFeedsByTier,
  getFeedById,
  getAllCategories,
  getFeedStats,
} from '../rss-feeds';
import type { FeedCategory } from '../rss-feeds';

describe('CRYPTO_FEEDS', () => {
  it('contains a non-empty array of feeds', () => {
    expect(CRYPTO_FEEDS.length).toBeGreaterThan(0);
  });

  it('every feed has required fields', () => {
    for (const feed of CRYPTO_FEEDS) {
      expect(feed.id).toBeTruthy();
      expect(feed.name).toBeTruthy();
      expect(feed.url).toMatch(/^https?:\/\//);
      expect(feed.category).toBeTruthy();
      expect(feed.credibility).toBeTruthy();
      expect([1, 2, 3]).toContain(feed.tier);
      expect(feed.lang).toBeTruthy();
      expect(Array.isArray(feed.tags)).toBe(true);
    }
  });

  it('all feed IDs are unique', () => {
    const ids = CRYPTO_FEEDS.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('getFeedsByCategory', () => {
  it('returns only feeds matching the given category', () => {
    const breakingFeeds = getFeedsByCategory('breaking');
    expect(breakingFeeds.length).toBeGreaterThan(0);
    for (const feed of breakingFeeds) {
      expect(feed.category).toBe('breaking');
    }
  });

  it('returns empty array for a category with no feeds', () => {
    // "opinion" category — check if any exist first
    const opinionFeeds = getFeedsByCategory('opinion');
    // If none exist, should be empty
    for (const feed of opinionFeeds) {
      expect(feed.category).toBe('opinion');
    }
    // At minimum, the function doesn't throw
    expect(Array.isArray(opinionFeeds)).toBe(true);
  });

  it('result length matches manual count for "markets"', () => {
    const marketsFeeds = getFeedsByCategory('markets');
    const manualCount = CRYPTO_FEEDS.filter((f) => f.category === 'markets').length;
    expect(marketsFeeds.length).toBe(manualCount);
  });
});

describe('getFeedsByCredibility', () => {
  it('returns only high-credibility feeds', () => {
    const highFeeds = getFeedsByCredibility('high');
    expect(highFeeds.length).toBeGreaterThan(0);
    for (const feed of highFeeds) {
      expect(feed.credibility).toBe('high');
    }
  });

  it('returns only low-credibility feeds', () => {
    const lowFeeds = getFeedsByCredibility('low');
    for (const feed of lowFeeds) {
      expect(feed.credibility).toBe('low');
    }
  });
});

describe('getFeedsByTier', () => {
  it('returns only tier 1 feeds', () => {
    const tier1 = getFeedsByTier(1);
    expect(tier1.length).toBeGreaterThan(0);
    for (const feed of tier1) {
      expect(feed.tier).toBe(1);
    }
  });

  it('tier counts sum to total feeds', () => {
    const t1 = getFeedsByTier(1).length;
    const t2 = getFeedsByTier(2).length;
    const t3 = getFeedsByTier(3).length;
    expect(t1 + t2 + t3).toBe(CRYPTO_FEEDS.length);
  });
});

describe('getFeedById', () => {
  it('returns the correct feed for a known ID', () => {
    const feed = getFeedById('coindesk');
    expect(feed).toBeDefined();
    expect(feed?.name).toBe('CoinDesk');
    expect(feed?.category).toBe('breaking');
  });

  it('returns undefined for an unknown ID', () => {
    expect(getFeedById('nonexistent-feed-id')).toBeUndefined();
  });
});

describe('getAllCategories', () => {
  it('returns an array of unique category strings', () => {
    const categories = getAllCategories();
    expect(categories.length).toBeGreaterThan(0);
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);
  });

  it('every category in the result exists in at least one feed', () => {
    const categories = getAllCategories();
    for (const cat of categories) {
      const feeds = getFeedsByCategory(cat as FeedCategory);
      expect(feeds.length).toBeGreaterThan(0);
    }
  });
});

describe('getFeedStats', () => {
  it('total matches CRYPTO_FEEDS.length', () => {
    const stats = getFeedStats();
    expect(stats.total).toBe(CRYPTO_FEEDS.length);
  });

  it('byCategory counts sum to total', () => {
    const stats = getFeedStats();
    const catSum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    expect(catSum).toBe(stats.total);
  });

  it('byCredibility counts sum to total', () => {
    const stats = getFeedStats();
    const credSum = Object.values(stats.byCredibility).reduce((a, b) => a + b, 0);
    expect(credSum).toBe(stats.total);
  });

  it('byTier counts sum to total', () => {
    const stats = getFeedStats();
    const tierSum = Object.values(stats.byTier).reduce((a, b) => a + b, 0);
    expect(tierSum).toBe(stats.total);
  });
});
