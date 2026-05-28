import { PageHeader } from "@/components/domain/page-header";
import { SmartMoneyFeed } from "@/components/smart-money/SmartMoneyFeed";
import { smartMoneyEvents } from "@/lib/mock-data";

export default function SmartMoneyPage() {
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
          <SmartMoneyFeed events={smartMoneyEvents} />
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
