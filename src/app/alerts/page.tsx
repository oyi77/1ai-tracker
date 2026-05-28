"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { cn, formatUsd, formatRelativeTime } from "@/lib/utils";
import {
  Bell,
  Plus,
  Wallet,
  Zap,
  TrendingUp,
  GitBranch,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  AlertTriangle,
  Webhook,
  Smartphone,
  Package,
  Trash2,
} from "lucide-react";

type AlertType = "wallet_move" | "smart_money" | "prediction" | "large_swap" | "bridge";
type Channel = "in_app" | "webhook";
type Step = 1 | 2 | 3;

interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  types: AlertType[];
}

const alertTemplates: AlertTemplate[] = [
  {
    id: "whale-watch",
    name: "Whale Watch Pack",
    description: "Track large wallet movements and exchange deposits",
    icon: <Wallet className="h-4 w-4" />,
    types: ["wallet_move", "large_swap"],
  },
  {
    id: "defi-rotation",
    name: "DeFi Rotation Pack",
    description: "Monitor smart money rotations across DeFi protocols",
    icon: <Zap className="h-4 w-4" />,
    types: ["smart_money", "large_swap"],
  },
];

interface AlertConfig {
  type: AlertType;
  condition: string;
  threshold: string;
  channels: Channel[];
  name: string;
}

interface AlertHistoryItem {
  id: string;
  name: string;
  type: AlertType;
  firedAt: Date;
  message: string;
  read: boolean;
}

const mockAlertHistory: AlertHistoryItem[] = [
  { id: "1", name: "Whale ETH Transfer", type: "wallet_move", firedAt: new Date(Date.now() - 300000), message: "0xab12 moved 5,000 ETH to Binance", read: false },
  { id: "2", name: "Smart Money Buy", type: "smart_money", firedAt: new Date(Date.now() - 900000), message: "Known fund bought $2.4M LINK", read: false },
  { id: "3", name: "Large USDC Swap", type: "large_swap", firedAt: new Date(Date.now() - 1800000), message: "10M USDC -> ETH on Uniswap V3", read: true },
  { id: "4", name: "Bridge Anomaly", type: "bridge", firedAt: new Date(Date.now() - 3600000), message: "Unusual $45M flow Arb -> Base", read: true },
  { id: "5", name: "Prediction Threshold", type: "prediction", firedAt: new Date(Date.now() - 7200000), message: "Polymarket election > 80%", read: true },
  { id: "6", name: "Whale SOL Move", type: "wallet_move", firedAt: new Date(Date.now() - 14400000), message: "0xef56 unstaked 100K SOL", read: true },
];

const typeLabels: Record<AlertType, string> = {
  wallet_move: "Wallet Movement",
  smart_money: "Smart Money Action",
  prediction: "Prediction Threshold",
  large_swap: "Large Swap",
  bridge: "Bridge Activity",
};

const typeColors: Record<AlertType, string> = {
  wallet_move: "text-accent-cyan",
  smart_money: "text-accent-green",
  prediction: "text-warning",
  large_swap: "text-[#8B5CF6]",
  bridge: "text-danger",
};

const typeBg: Record<AlertType, string> = {
  wallet_move: "bg-accent-cyan/10",
  smart_money: "bg-accent-green/10",
  prediction: "bg-warning/10",
  large_swap: "bg-[#8B5CF6]/10",
  bridge: "bg-danger/10",
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
              i + 1 <= current
                ? "bg-accent-cyan text-bg-primary"
                : "bg-bg-elevated text-text-muted"
            )}
          >
            {i + 1 < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                "h-px w-8",
                i + 1 < current ? "bg-accent-cyan" : "bg-bg-elevated"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AlertBuilder() {
  const [step, setStep] = useState<Step>(1);
  const [config, setConfig] = useState<Partial<AlertConfig>>({
    channels: ["in_app"],
  });

  const alertTypes: { type: AlertType; label: string; desc: string; icon: React.ReactNode }[] = [
    { type: "wallet_move", label: "Wallet Movement", desc: "Track when a wallet moves funds", icon: <Wallet className="h-4 w-4" /> },
    { type: "smart_money", label: "Smart Money Action", desc: "Detect smart money buys/sells", icon: <Zap className="h-4 w-4" /> },
    { type: "prediction", label: "Prediction Threshold", desc: "Market probability thresholds", icon: <TrendingUp className="h-4 w-4" /> },
    { type: "large_swap", label: "Large Swap", desc: "Swaps above a USD threshold", icon: <ArrowRight className="h-4 w-4" /> },
    { type: "bridge", label: "Bridge Activity", desc: "Cross-chain bridge transfers", icon: <GitBranch className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-primary">Create Alert</h3>
        <StepIndicator current={step} total={3} />
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted mb-3">Select a trigger type:</p>
          {alertTypes.map((at) => (
            <button
              key={at.type}
              onClick={() => {
                setConfig({ ...config, type: at.type });
                setStep(2);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                config.type === at.type
                  ? "border-accent-cyan/40 bg-accent-cyan/5"
                  : "border-white/5 hover:border-white/10 hover:bg-bg-elevated"
              )}
            >
              <div className={cn("rounded-lg p-2", typeBg[at.type], typeColors[at.type])}>
                {at.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{at.label}</p>
                <p className="text-xs text-text-muted">{at.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">Set conditions for: <span className="text-accent-cyan font-medium">{config.type && typeLabels[config.type]}</span></p>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Alert Name</label>
            <input
              type="text"
              placeholder="e.g., Whale ETH Transfer"
              value={config.name || ""}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/5 bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Condition</label>
            <input
              type="text"
              placeholder="e.g., amount > 1000 ETH"
              value={config.condition || ""}
              onChange={(e) => setConfig({ ...config, condition: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/5 bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Threshold (USD)</label>
            <input
              type="text"
              placeholder="e.g., 1000000"
              value={config.threshold || ""}
              onChange={(e) => setConfig({ ...config, threshold: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/5 bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="h-8 rounded-lg border border-white/5 px-4 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="h-8 rounded-lg bg-accent-cyan px-4 text-xs font-medium text-bg-primary hover:bg-accent-cyan/80 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">Choose notification channels:</p>
          {[
            { ch: "in_app" as Channel, label: "In-App Toast", desc: "Real-time in-browser notifications", icon: <Smartphone className="h-4 w-4" /> },
            { ch: "webhook" as Channel, label: "Webhook", desc: "POST to a custom URL endpoint", icon: <Webhook className="h-4 w-4" /> },
          ].map((c) => (
            <button
              key={c.ch}
              onClick={() => {
                const channels = config.channels || [];
                setConfig({
                  ...config,
                  channels: channels.includes(c.ch)
                    ? channels.filter((ch) => ch !== c.ch)
                    : [...channels, c.ch],
                });
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                config.channels?.includes(c.ch)
                  ? "border-accent-cyan/40 bg-accent-cyan/5"
                  : "border-white/5 hover:border-white/10"
              )}
            >
              <div className="rounded-lg bg-bg-elevated p-2 text-text-muted">{c.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{c.label}</p>
                <p className="text-xs text-text-muted">{c.desc}</p>
              </div>
              {config.channels?.includes(c.ch) && (
                <Check className="h-4 w-4 text-accent-cyan" />
              )}
            </button>
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="h-8 rounded-lg border border-white/5 px-4 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                setStep(1);
                setConfig({ channels: ["in_app"] });
              }}
              className="h-8 rounded-lg bg-accent-green px-4 text-xs font-medium text-bg-primary hover:bg-accent-green/80 transition-colors"
            >
              Create Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Engine"
        description="Build custom alerts, monitor triggers, and manage notification channels"
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active Alerts" value="12" icon={<Bell className="h-4 w-4" />} />
        <StatCard label="Fired (24h)" value="38" change={15.4} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Channels Active" value="2" icon={<Smartphone className="h-4 w-4" />} />
        <StatCard label="Avg Response" value="1.2s" icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <AlertBuilder />

          <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
              Alert Templates
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {alertTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-bg-elevated/30 p-4 hover:border-accent-cyan/20 transition-colors cursor-pointer"
                >
                  <div className="rounded-lg bg-accent-cyan/10 p-2 text-accent-cyan">
                    {t.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                    <div className="flex gap-1 mt-2">
                      {t.types.map((type) => (
                        <span
                          key={type}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-mono",
                            typeBg[type],
                            typeColors[type]
                          )}
                        >
                          {typeLabels[type]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Alert History
            </h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            {mockAlertHistory.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "border-b border-white/5 px-4 py-3 hover:bg-bg-elevated/50 transition-colors",
                  !item.read && "bg-accent-cyan/5"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{item.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-mono",
                      typeBg[item.type],
                      typeColors[item.type]
                    )}
                  >
                    {typeLabels[item.type]}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{item.message}</p>
                <p className="text-[10px] font-mono text-text-muted mt-1">
                  {formatRelativeTime(item.firedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
