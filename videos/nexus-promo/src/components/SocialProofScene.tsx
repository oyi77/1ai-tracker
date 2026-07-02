// ─────────────────────────────────────────────────────────────
// Social Proof Scene (24-28s) — Animated stats counting up
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion'
import { colors } from '../design-tokens'
import { GridBackground, RadialGlow, Particles } from './Background'

const CountUp: React.FC<{
  end: number
  suffix?: string
  delay: number
}> = ({ end, suffix = '', delay }) => {
  const frame = useCurrentFrame()
  

  const progress = interpolate(frame - delay, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })

  const value = Math.floor(end * progress)

  return (
    <span>
      {value.toLocaleString()}{suffix}
    </span>
  )
}

const StatCard: React.FC<{
  value: number
  suffix: string
  label: string
  delay: number
}> = ({ value, suffix, label, delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enter = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 15, stiffness: 150, mass: 1 },
  })

  return (
    <div
      style={{
        opacity: enter,
        scale: interpolate(enter, [0, 1], [0.8, 1]),
        textAlign: 'center',
        padding: '40px 60px',
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          color: colors.cyan,
          filter: `drop-shadow(0 0 20px ${colors.cyanGlow})`,
          lineHeight: 1,
        }}
      >
        <CountUp end={value} suffix={suffix} delay={delay + 10} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontFamily: "'Inter', sans-serif",
          color: colors.textSecondary,
          marginTop: 12,
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </div>
    </div>
  )
}

export const SocialProofScene: React.FC = () => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      <GridBackground />
      <RadialGlow x="50%" y="50%" color={colors.violetGlow} size={800} opacity={0.3} />
      <Particles count={20} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 60,
        }}
      >
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 80 }}>
          <StatCard value={1000} suffix="+" label="Signals Tracked Daily" delay={0} />
          <StatCard value={30} suffix="+" label="Data Sources" delay={10} />
          <StatCard value={4} suffix="" label="Markets Covered" delay={20} />
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
            fontSize: 24,
            fontFamily: "'Inter', sans-serif",
            color: colors.textSecondary,
            letterSpacing: '0.15em',
          }}
        >
          POWERED BY AI · BUILT FOR TRADERS
        </div>
      </div>
    </AbsoluteFill>
  )
}
