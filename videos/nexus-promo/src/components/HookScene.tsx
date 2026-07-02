// ─────────────────────────────────────────────────────────────
// Hook Scene (0-4s) — Dark screen with chaotic chart noise
// Represents: "too much noise, hard to find real signals"
// ─────────────────────────────────────────────────────────────

import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion'
import { colors } from '../design-tokens'
import { GridBackground, Particles, RadialGlow } from './Background'

// Animated chart noise
const ChartNoise: React.FC = () => {
  const frame = useCurrentFrame()
  // Generate chaotic candlestick data
  const candles = React.useMemo(() => {
    const data = []
    let price = 50000
    for (let i = 0; i < 40; i++) {
      const change = (Math.random() - 0.5) * 2000
      const open = price
      const close = price + change
      const high = Math.max(open, close) + Math.random() * 500
      const low = Math.min(open, close) - Math.random() * 500
      data.push({ open, close, high, low })
      price = close
    }
    return data
  }, [])

  // Animate candles appearing chaotically
  const chaosOpacity = interpolate(frame, [0, 30, 60, 90, 120], [0, 1, 1, 0.5, 0], {
    extrapolateRight: 'clamp',
  })

  const flashIntensity = interpolate(frame % 10, [0, 5, 10], [0.3, 1, 0.3])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: chaosOpacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="800" height="400" viewBox="0 0 800 400">
        {candles.map((c, i) => {
          const x = 20 + i * 19
          const isGreen = c.close > c.open
          const bodyTop = Math.min(c.open, c.close)
          const bodyBottom = Math.max(c.open, c.close)
          const scale = 400 / 10000

          return (
            <g key={i} opacity={flashIntensity}>
              {/* Wick */}
              <line
                x1={x + 7}
                y1={400 - (c.high - 45000) * scale}
                x2={x + 7}
                y2={400 - (c.low - 45000) * scale}
                stroke={isGreen ? colors.green : colors.red}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={x}
                y={400 - (bodyBottom - 45000) * scale}
                width={14}
                height={Math.max(1, (bodyBottom - bodyTop) * scale)}
                fill={isGreen ? colors.green : colors.red}
                opacity={0.8}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame()
  // Fade in chaos, then fade out
  const sceneOpacity = interpolate(frame, [0, 20, 100, 120], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase, opacity: sceneOpacity }}>
      <GridBackground />
      <RadialGlow color={colors.violetGlow} size={800} opacity={0.3} />
      <Particles count={20} />
      <ChartNoise />
      
      {/* Noise text overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: interpolate(frame, [60, 80], [0, 0.6], { extrapolateRight: 'clamp' }),
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontFamily: "'Inter', sans-serif",
            color: colors.textMuted,
            letterSpacing: '0.2em',
          }}
        >
          TOO MUCH NOISE
        </span>
      </div>
    </AbsoluteFill>
  )
}
