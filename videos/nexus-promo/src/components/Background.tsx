// ─────────────────────────────────────────────────────────────
// Background Elements — Grid pattern, particles, glow
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { colors } from '../design-tokens'
import { useCurrentFrame, interpolate, useVideoConfig } from "remotion"

// Subtle grid pattern
export const GridBackground: React.FC = () => {
  const frame = useCurrentFrame()
  const gridOpacity = interpolate(frame, [0, 30], [0, 0.06], {
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: gridOpacity,
        backgroundImage: `
          linear-gradient(${colors.cyan}22 1px, transparent 1px),
          linear-gradient(90deg, ${colors.cyan}22 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  )
}

// Floating particles
export const Particles: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (i * 137.508) % width,
      y: (i * 97.314) % height,
      size: 1 + (i % 3),
      speed: 0.3 + (i % 5) * 0.1,
      opacity: 0.2 + (i % 4) * 0.1,
    }))
  }, [count, width, height])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {particles.map((p, i) => {
        const y = (p.y + frame * p.speed) % height
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: i % 3 === 0 ? colors.cyan : i % 3 === 1 ? colors.violet : colors.green,
              opacity: p.opacity * interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          />
        )
      })}
    </div>
  )
}

// Radial glow effect
export const RadialGlow: React.FC<{
  x?: string
  y?: string
  color?: string
  size?: number
  opacity?: number
}> = ({ x = '50%', y = '50%', color = colors.cyanGlow, size = 600, opacity = 0.4 }) => {
  const frame = useCurrentFrame()
  const pulse = interpolate(frame % 90, [0, 45, 90], [1, 1.1, 1])

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size * pulse,
        height: size * pulse,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: opacity * interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
        transform: 'translate(-50%, -50%)',
        filter: 'blur(40px)',
      }}
    />
  )
}
