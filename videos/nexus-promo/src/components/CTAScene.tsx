// ─────────────────────────────────────────────────────────────
// CTA Scene (28-34s) — Dashboard full-screen with CTA
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion'
import { colors } from '../design-tokens'
import { GridBackground, RadialGlow, Particles } from './Background'

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame()
  

  // Dashboard fade in
  const dashboardOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // CTA text fade in
  const ctaOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // URL fade in
  const urlOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // Glow pulse
  const glowPulse = interpolate(frame % 60, [0, 30, 60], [1, 1.1, 1])

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      <GridBackground />
      <RadialGlow x="50%" y="40%" color={colors.cyanGlow} size={900} opacity={0.4 * glowPulse} />
      <Particles count={50} />

      {/* Dashboard mockup (background) */}
      <div
        style={{
          position: 'absolute',
          inset: 60,
          opacity: dashboardOpacity * 0.3,
          background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgSurface} 100%)`,
          borderRadius: 20,
          border: `1px solid ${colors.cyan}20`,
          overflow: 'hidden',
        }}
      >
        {/* Fake dashboard content */}
        <div style={{ padding: 40, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{
                height: 120,
                background: colors.bgCard,
                borderRadius: 12,
                border: `1px solid ${colors.cyan}15`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CTA overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        {/* Main CTA */}
        <div
          style={{
            opacity: ctaOpacity,
            translate: `0px ${interpolate(ctaOpacity, [0, 1], [30, 0])}px`,
            fontSize: 72,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            color: colors.textPrimary,
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: 40,
          }}
        >
          Start Tracking
          <br />
          <span style={{ color: colors.cyan }}>Smarter</span>
        </div>

        {/* URL */}
        <div
          style={{
            opacity: urlOpacity,
            fontSize: 28,
            fontFamily: "'JetBrains Mono', sans-serif",
            color: colors.cyan,
            letterSpacing: '0.1em',
            padding: '16px 32px',
            border: `1px solid ${colors.cyan}40`,
            borderRadius: 8,
            background: `${colors.cyan}10`,
          }}
        >
          tracker.aitradepulse.com
        </div>

        {/* Disclaimer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            opacity: interpolate(frame, [100, 120], [0, 0.5], { extrapolateRight: 'clamp' }),
            fontSize: 12,
            fontFamily: "'Inter', sans-serif",
            color: colors.textMuted,
            textAlign: 'center',
          }}
        >
          Not financial advice. Trading involves risk. Past performance does not guarantee future results.
        </div>
      </div>
    </AbsoluteFill>
  )
}
