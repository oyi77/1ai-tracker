// ─────────────────────────────────────────────────────────────
// Feature Scene (8-23s) — 3 feature showcases with animated mockups
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { colors } from '../design-tokens'
import { GridBackground, RadialGlow } from './Background'

// Animated chart component
const AnimatedChart: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame()
  const adjustedFrame = Math.max(0, frame - delay)

  const dataPoints = React.useMemo(() => {
    const points = []
    let y = 200
    for (let i = 0; i < 60; i++) {
      y += (Math.random() - 0.45) * 20
      y = Math.max(100, Math.min(300, y))
      points.push({ x: i * 10, y })
    }
    return points
  }, [])

  const lineProgress = interpolate(adjustedFrame, [0, 90], [0, 1], {
    extrapolateRight: 'clamp',
  })

  const visiblePoints = Math.floor(lineProgress * dataPoints.length)
  const pathData = dataPoints
    .slice(0, visiblePoints)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <svg width="500" height="350" viewBox="0 0 600 350">
      {/* Grid */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * 70}
          x2={600}
          y2={i * 70}
          stroke={colors.cyan}
          strokeOpacity={0.1}
        />
      ))}
      
      {/* Chart line */}
      <path
        d={pathData}
        fill="none"
        stroke={colors.cyan}
        strokeWidth={2}
        filter={`drop-shadow(0 0 8px ${colors.cyan})`}
      />

      {/* Signal dots */}
      {dataPoints.slice(0, visiblePoints).filter((_, i) => i % 15 === 0).map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={p.y < 200 ? colors.green : colors.red}
          opacity={interpolate(adjustedFrame, [i * 15, i * 15 + 10], [0, 1], { extrapolateRight: 'clamp' })}
        />
      ))}
    </svg>
  )
}

// Feature card component
const FeatureCard: React.FC<{
  title: string
  description: string
  delay: number
  icon: string
}> = ({ title, description, delay, icon }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enter = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.8 },
  })

  return (
    <div
      style={{
        opacity: enter,
        translate: `0px ${interpolate(enter, [0, 1], [40, 0])}px`,
        scale: interpolate(enter, [0, 1], [0.95, 1]),
        background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgSurface} 100%)`,
        borderRadius: 16,
        padding: '32px 40px',
        border: `1px solid ${colors.cyan}30`,
        maxWidth: 350,
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div
        style={{
          fontSize: 24,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          color: colors.textSecondary,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  )
}

// Feature 1: Real-time Signal Tracking
export const Feature1Scene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      <GridBackground />
      <RadialGlow x="70%" y="50%" color={colors.cyanGlow} size={600} />

      <div style={{ display: 'flex', height: '100%', padding: '0 120px', alignItems: 'center' }}>
        {/* Left: Feature info */}
        <div style={{ flex: 1 }}>
          <FeatureCard
            title="Real-time Signal Tracking"
            description="AI-powered signals from trade flow, whale alerts, funding rates, and sentiment — updated every second."
            delay={10}
            icon="📡"
          />
        </div>

        {/* Right: Animated chart */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <AnimatedChart delay={20} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

// Feature 2: Multi-Market Coverage
export const Feature2Scene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const markets = [
    { name: 'BTC', price: '$61,248', change: '+2.4%' },
    { name: 'ETH', price: '$3,456', change: '+1.8%' },
    { name: 'SOL', price: '$187', change: '+5.2%' },
    { name: 'GOLD', price: '$2,345', change: '-0.3%' },
    { name: 'EUR/USD', price: '1.0892', change: '+0.1%' },
    { name: 'OIL', price: '$78.45', change: '-1.2%' },
  ]

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      <GridBackground />
      <RadialGlow x="30%" y="50%" color={colors.violetGlow} size={600} />

      <div style={{ display: 'flex', height: '100%', padding: '0 120px', alignItems: 'center' }}>
        {/* Left: Market grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {markets.map((m, i) => {
            const enter = spring({
              frame: Math.max(0, frame - i * 8),
              fps,
              config: { damping: 20, stiffness: 200, mass: 0.8 },
            })

            return (
              <div
                key={m.name}
                style={{
                  opacity: enter,
                  translate: `0px ${interpolate(enter, [0, 1], [30, 0])}px`,
                  background: colors.bgCard,
                  borderRadius: 12,
                  padding: 20,
                  border: `1px solid ${colors.cyan}20`,
                }}
              >
                <div style={{ fontSize: 16, fontFamily: "'Space Grotesk'", fontWeight: 600, color: colors.textPrimary }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 20, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: colors.textPrimary, marginTop: 4 }}>
                  {m.price}
                </div>
                <div style={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono'",
                  color: m.change.startsWith('+') ? colors.green : colors.red,
                  marginTop: 4,
                }}>
                  {m.change}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Feature info */}
        <div style={{ flex: 1, paddingLeft: 80 }}>
          <FeatureCard
            title="Multi-Market Coverage"
            description="Crypto, forex, commodities, equities — all from one terminal. 30+ data sources cross-correlated."
            delay={20}
            icon="🌍"
          />
        </div>
      </div>
    </AbsoluteFill>
  )
}

// Feature 3: Clean Actionable Insights
export const Feature3Scene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const signal = {
    symbol: 'BTC',
    direction: 'LONG',
    entry: '$61,248',
    tp1: '$62,803',
    tp2: '$64,359',
    tp3: '$65,915',
    sl: '$58,914',
    strength: 85,
    confidence: 70,
  }

  const cardEnter = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 15, stiffness: 150, mass: 1 },
  })

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      <GridBackground />
      <RadialGlow x="50%" y="40%" color={colors.greenGlow} size={500} />

      <div style={{ display: 'flex', height: '100%', padding: '0 120px', alignItems: 'center' }}>
        {/* Left: Feature info */}
        <div style={{ flex: 1 }}>
          <FeatureCard
            title="Clean Actionable Insights"
            description="Every signal includes Entry, TP1, TP2, TP3, and Stop Loss — calculated from real volatility."
            delay={5}
            icon="🎯"
          />
        </div>

        {/* Right: Signal card */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            opacity: cardEnter,
            scale: interpolate(cardEnter, [0, 1], [0.9, 1]),
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgSurface} 100%)`,
              borderRadius: 16,
              padding: '32px 40px',
              border: `1px solid ${colors.green}40`,
              width: 400,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>🟢</span>
              <span style={{ fontSize: 20, fontFamily: "'Space Grotesk'", fontWeight: 700, color: colors.green }}>
                {signal.symbol} {signal.direction}
              </span>
              <span style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono'",
                background: `${colors.green}20`,
                color: colors.green,
                padding: '4px 8px',
                borderRadius: 4,
              }}>
                STR: {signal.strength}
              </span>
            </div>

            {/* Levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'ENTRY', value: signal.entry, color: colors.textPrimary },
                { label: 'TP1', value: signal.tp1, color: colors.green },
                { label: 'TP2', value: signal.tp2, color: colors.green },
                { label: 'TP3', value: signal.tp3, color: colors.green },
                { label: 'SL', value: signal.sl, color: colors.red },
              ].map((item, i) => {
                const itemEnter = interpolate(frame, [30 + i * 8, 40 + i * 8], [0, 1], {
                  extrapolateRight: 'clamp',
                })

                return (
                  <div key={item.label} style={{ opacity: itemEnter }}>
                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono'", color: colors.textMuted }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: 18,
                      fontFamily: "'JetBrains Mono'",
                      fontWeight: 700,
                      color: item.color,
                    }}>
                      {item.value}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* AI Verified badge */}
            <div
              style={{
                marginTop: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              <div style={{
                background: `${colors.violet}20`,
                color: colors.violet,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontFamily: "'JetBrains Mono'",
                fontWeight: 600,
              }}>
                ✓ AI VERIFIED
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
