"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { cn, formatUsd, formatNumber, getChainColor } from "@/lib/utils";
import { LiveFeed, type FeedItem } from "@/components/ui/LiveFeed";
import {
  GitBranch,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";

const chains = ["Ethereum", "Arbitrum", "Base", "Optimism", "Solana", "Bitcoin"];

const flowData = [
  { from: "Ethereum", to: "Arbitrum", volume: 240000000, pct: 28 },
  { from: "Ethereum", to: "Base", volume: 180000000, pct: 21 },
  { from: "Ethereum", to: "Optimism", volume: 95000000, pct: 11 },
  { from: "Arbitrum", to: "Ethereum", volume: 120000000, pct: 14 },
  { from: "Base", to: "Ethereum", volume: 80000000, pct: 9 },
  { from: "Solana", to: "Ethereum", volume: 65000000, pct: 8 },
  { from: "Optimism", to: "Arbitrum", volume: 42000000, pct: 5 },
  { from: "Arbitrum", to: "Base", volume: 35000000, pct: 4 },
];

const topBridgingWallets = [
  { address: "0xab12...cd34", totalVolume: "$142M", chains: ["Ethereum", "Arbitrum", "Base"], txCount: 1240 },
  { address: "0xef56...gh78", totalVolume: "$98M", chains: ["Ethereum", "Optimism"], txCount: 890 },
  { address: "0xij90...kl12", totalVolume: "$76M", chains: ["Solana", "Ethereum"], txCount: 520 },
  { address: "0xmn34...op56", totalVolume: "$54M", chains: ["Arbitrum", "Base", "Optimism"], txCount: 410 },
  { address: "0xqr78...st90", totalVolume: "$38M", chains: ["Ethereum", "Bitcoin"], txCount: 280 },
];

const anomalyAlerts = [
  { id: "1", message: "Unusual $45M bridge flow from Arbitrum to Base in last hour", severity: "high" },
  { id: "2", message: "New wallet pattern: 15 wallets bridging identical amounts simultaneously", severity: "medium" },
];

const feedItems: FeedItem[] = [
  { id: "1", title: "$12.4M bridged ETH -> Arbitrum", description: "via Across Protocol", timestamp: new Date(Date.now() - 30000), type: "info" },
  { id: "2", title: "$5.2M bridged SOL -> Ethereum", description: "via Wormhole", timestamp: new Date(Date.now() - 120000), type: "info" },
  { id: "3", title: "Anomalous bridge pattern detected", description: "Multiple wallets, same amount, same destination", timestamp: new Date(Date.now() - 300000), type: "danger" },
  { id: "4", title: "$8.1M bridged USDC -> Base", description: "via Base Bridge", timestamp: new Date(Date.now() - 600000), type: "success" },
];

function SankeyDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const nodeY = [0.15, 0.35, 0.55, 0.75, 0.45, 0.65];
    const leftX = 60;
    const rightX = w - 60;

    // Draw nodes
    chains.forEach((chain, i) => {
      const y = nodeY[i] * h;
      const color = getChainColor(chain);

      // Left node
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(leftX - 8, y - 12, 16, 24, 4);
      ctx.fill();

      // Right node
      ctx.beginPath();
      ctx.roundRect(rightX - 8, y - 12, 16, 24, 4);
      ctx.fill();

      // Labels
      ctx.fillStyle = "#6B7280";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(chain, leftX - 16, y + 4);
      ctx.textAlign = "left";
      ctx.fillText(chain, rightX + 16, y + 4);
    });

    // Draw flows
    flowData.slice(0, 6).forEach((flow) => {
      const fromIdx = chains.indexOf(flow.from);
      const toIdx = chains.indexOf(flow.to);
      if (fromIdx === -1 || toIdx === -1) return;

      const fromY = nodeY[fromIdx] * h;
      const toY = nodeY[toIdx] * h;
      const thickness = Math.max(2, (flow.pct / 30) * 20);

      const gradient = ctx.createLinearGradient(leftX, 0, rightX, 0);
      gradient.addColorStop(0, getChainColor(flow.from) + "60");
      gradient.addColorStop(1, getChainColor(flow.to) + "60");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(leftX + 8, fromY);
      const cpX = (leftX + rightX) / 2;
      ctx.bezierCurveTo(cpX, fromY, cpX, toY, rightX - 8, toY);
      ctx.stroke();
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={400}
      className="w-full h-auto"
    />
  );
}

function HeatmapMatrix() {
  const maxVolume = Math.max(...flowData.map((f) => f.volume));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="px-2 py-2 text-[10px] text-text-muted">From / To</th>
            {chains.map((c) => (
              <th key={c} className="px-2 py-2 text-[10px] text-text-muted text-center">
                {c.slice(0, 4)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chains.map((from) => (
            <tr key={from}>
              <td className="px-2 py-2 text-[10px] text-text-muted font-medium">{from.slice(0, 4)}</td>
              {chains.map((to) => {
                const flow = flowData.find((f) => f.from === from && f.to === to);
                const intensity = flow ? flow.volume / maxVolume : 0;
                return (
                  <td key={to} className="px-1 py-1">
                    <div
                      className={cn(
                        "h-8 w-full rounded flex items-center justify-center",
                        from === to ? "bg-bg-elevated" : ""
                      )}
                      style={
                        from !== to
                          ? { backgroundColor: `rgba(0, 212, 255, ${intensity * 0.6})` }
                          : undefined
                      }
                      title={flow ? `${from} -> ${to}: ${formatUsd(flow.volume)}` : ""}
                    >
                      {flow && (
                        <span className="text-[9px] font-mono text-white">
                          {formatUsd(flow.volume).replace("$", "")}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FlowsPage() {
  const [day, setDay] = useState(7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-Chain Flow Visualizer"
        description="Capital flows, bridge volumes, and anomaly detection across chains"
      />

      {anomalyAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3",
            alert.severity === "high"
              ? "border-danger/30 bg-danger/5"
              : "border-warning/30 bg-warning/5"
          )}
        >
          <AlertTriangle
            className={cn(
              "h-4 w-4 shrink-0",
              alert.severity === "high" ? "text-danger" : "text-warning"
            )}
          />
          <p className="text-sm text-text-primary">{alert.message}</p>
        </div>
      ))}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Volume (24h)" value={formatUsd(842000000)} change={5.8} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Active Bridges" value="24" icon={<GitBranch className="h-4 w-4" />} />
        <StatCard label="Unique Bridgers" value="8,420" change={3.1} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Avg Bridge Time" value="2.4 min" change={-8.2} icon={<ArrowLeftRight className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg border border-white/5 bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Capital Flow Diagram
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">Replay:</span>
              <input
                type="range"
                min={1}
                max={7}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-24 accent-accent-cyan"
              />
              <span className="text-[10px] font-mono text-accent-cyan">{day}d</span>
            </div>
          </div>
          <SankeyDiagram />
        </div>

        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
            Bridge Volume Heatmap
          </h3>
          <HeatmapMatrix />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Top Bridging Wallets
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Wallet</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-muted">Volume</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Chains</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-muted">Txns</th>
              </tr>
            </thead>
            <tbody>
              {topBridgingWallets.map((w, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-mono text-text-primary">{w.address}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-mono text-accent-cyan">{w.totalVolume}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {w.chains.map((c) => (
                        <span
                          key={c}
                          className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                          style={{ backgroundColor: getChainColor(c) + "20", color: getChainColor(c) }}
                        >
                          {c.slice(0, 4)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-mono text-text-muted">{w.txCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <LiveFeed items={feedItems} maxHeight={280} />
        </div>
      </div>
    </div>
  );
}
