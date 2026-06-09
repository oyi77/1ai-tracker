'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/domain/page-header';
import { SmartMoneyFeed } from '@/components/smart-money/SmartMoneyFeed';
import type { SmartMoneyEvent } from '@/lib/mock-data';

export default function SmartMoneyPage() {
  const [events, setEvents] = useState<SmartMoneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/smart-money', { signal: controller.signal });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        setEvents(json.data ?? []);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load smart money data');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <PageHeader
          title="Smart Money Feed"
          description="Real-time activity from labeled smart money wallets across all chains"
        />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Stat label="Active Wallets" value="147" />
          <Stat label="24h Volume" value="$2.4B" />
          <Stat label="Top Action" value="Accumulated" color="text-accent-green" />
          <Stat label="Signals Today" value="38" />
        </div>
        <div className="mt-6">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
            </div>
          ) : (
            <SmartMoneyFeed events={events} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
      <div className={`mt-1 font-mono text-xl font-semibold ${color || "text-text-primary"}`}>{value}</div>
    </div>
  );
}
