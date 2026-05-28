import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  GitBranch,
  Bell,
  Store,
  Image as ImageIcon,
  LayoutDashboard,
  ArrowRight,
  Shield,
  Zap,
  Eye,
} from "lucide-react";

const features = [
  {
    title: "Command Center Dashboard",
    description: "Real-time widget grid with market overview, live alerts, smart money activity, and active positions.",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "#00D4FF",
  },
  {
    title: "NFT Intelligence",
    description: "Collection leaderboard with floor prices, volume, holder analytics, smart money tracking, and wash trade detection.",
    icon: ImageIcon,
    href: "/nft",
    color: "#00FF88",
  },
  {
    title: "Cross-Chain Flow Visualizer",
    description: "Interactive Sankey diagram showing capital flows between chains. Bridge volume heatmap and anomaly detection.",
    icon: GitBranch,
    href: "/flows",
    color: "#8B5CF6",
  },
  {
    title: "Alert Engine",
    description: "Build custom alerts with step-by-step wizard. Track whale movements, smart money, prediction markets, and bridge activity.",
    icon: Bell,
    href: "/alerts",
    color: "#FFB800",
  },
  {
    title: "Intel Marketplace",
    description: "Submit wallet-to-entity intelligence with evidence. Earn USDC rewards through the bounty system.",
    icon: Store,
    href: "/marketplace",
    color: "#FF3D6B",
  },
];

const stats = [
  { label: "Wallets Tracked", value: "2.4M+" },
  { label: "Chains Monitored", value: "12" },
  { label: "Alerts Fired", value: "840K+" },
  { label: "Intel Reports", value: "15K+" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan/10">
            <Wallet className="h-4 w-4 text-accent-cyan" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">NEXUS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-accent-cyan px-4 text-sm font-medium text-bg-primary hover:bg-accent-cyan/80 transition-colors"
          >
            Launch App
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 pt-32 pb-20 text-center">
        <div className="flex items-center gap-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-1.5 mb-8">
          <Zap className="h-3.5 w-3.5 text-accent-cyan" />
          <span className="text-xs font-medium text-accent-cyan">Onchain Intelligence Platform</span>
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-text-primary leading-tight">
          See everything.{" "}
          <span className="bg-gradient-to-r from-accent-cyan to-accent-green bg-clip-text text-transparent">
            Miss nothing.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-text-muted leading-relaxed">
          NEXUS aggregates onchain data across 12 chains into a single intelligence layer.
          Track smart money, detect anomalies, and act on real-time signals — all from one command center.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex h-11 items-center gap-2 rounded-lg bg-accent-cyan px-6 text-sm font-semibold text-bg-primary hover:bg-accent-cyan/80 transition-colors"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="flex h-11 items-center gap-2 rounded-lg border border-white/10 px-6 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors"
          >
            Explore Features
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-bg-surface/50">
        <div className="mx-auto grid max-w-4xl grid-cols-4 gap-8 py-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold font-mono text-accent-cyan">{stat.value}</p>
              <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary">Intelligence Modules</h2>
            <p className="mt-3 text-text-muted">Purpose-built tools for onchain analysis</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group rounded-xl border border-white/5 bg-bg-surface p-6 hover:border-white/10 transition-all"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg mb-4"
                  style={{ backgroundColor: feature.color + "15" }}
                >
                  <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
                </div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-text-muted group-hover:text-accent-cyan transition-colors">
                  Learn more
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="border-t border-white/5 bg-bg-surface/30 px-8 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="h-6 w-6 text-accent-cyan" />
            <h2 className="text-2xl font-bold text-text-primary">Built for Professionals</h2>
          </div>
          <p className="text-text-muted leading-relaxed max-w-2xl mx-auto">
            NEXUS is designed for trading teams, researchers, and security analysts who need
            real-time onchain intelligence. Every data point is verifiable, every signal is actionable.
          </p>
          <div className="mt-10 flex items-center justify-center gap-8">
            {[
              { icon: Eye, label: "Real-time monitoring" },
              { icon: Shield, label: "Verified data" },
              { icon: Zap, label: "Instant alerts" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-text-muted">
                <item.icon className="h-4 w-4 text-accent-cyan" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-text-primary">Ready to see onchain?</h2>
          <p className="mt-3 text-text-muted">
            Connect your wallet and start exploring the intelligence layer.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-accent-cyan px-6 text-sm font-semibold text-bg-primary hover:bg-accent-cyan/80 transition-colors"
          >
            Launch NEXUS
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent-cyan" />
            <span className="text-sm font-semibold text-text-primary">NEXUS</span>
          </div>
          <p className="text-xs text-text-muted">Onchain Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
}
