// ─────────────────────────────────────────────────────────────
// Wordmark Scene (4-8s) — NEXUS logo reveal with glow
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion'
import { colors } from '../design-tokens'
import { GridBackground, Particles, RadialGlow } from './Background'

export const WordmarkScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Logo line-draw effect
  const lineProgress = interpolate(frame, [0, 45], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: 'clamp',
  })

  // Glow intensity
  const glowOpacity = interpolate(frame, [30, 60], [0, 0.8], {
    extrapolateRight: 'clamp',
  })

  // Tagline fade in
  const taglineOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // Spring bounce for logo
  const logoScale = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 1,
      overshootClamping: false,
    },
  })

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      <GridBackground />
      <RadialGlow color={colors.cyanGlow} size={800} opacity={0.5} />
      <Particles count={40} />

      {/* Logo container */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        {/* NEXUS text with line-draw effect */}
        <div
          style={{
            fontSize: 120,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: 'transparent',
            WebkitTextStroke: `2px ${colors.cyan}`,
            opacity: glowOpacity,
            scale: logoScale,
            filter: `drop-shadow(0 0 30px ${colors.cyan})`,
          }}
        >
          NEXUS
        </div>

        {/* Filled NEXUS (revealed by line-progress) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            fontSize: 120,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: colors.textPrimary,
            clipPath: `inset(0 ${(1 - lineProgress) * 100}% 0 0)`,
            scale: logoScale,
          }}
        >
          NEXUS
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 30,
            fontSize: 28,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            letterSpacing: '0.4em',
            color: colors.textSecondary,
            opacity: taglineOpacity,
            translate: `0px ${interpolate(taglineOpacity, [0, 1], [20, 0])}px`,
          }}
        >
          AI TRADING INTELLIGENCE
        </div>
      </div>

      {/* Decorative lines */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '10%',
          width: `${lineProgress * 30}%`,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${colors.cyan}40)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '55%',
          right: '10%',
          width: `${lineProgress * 30}%`,
          height: 1,
          background: `linear-gradient(270deg, transparent, ${colors.cyan}40)`,
        }}
      />
    </AbsoluteFill>
  )
}
