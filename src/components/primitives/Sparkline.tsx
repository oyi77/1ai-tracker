"use client"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillOpacity?: number
  className?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  fillOpacity = 0.15,
  className = '',
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="2,2" />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 2) - 1,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  // Determine color from first → last
  const isBullish = data[data.length - 1] >= data[0]
  const lineColor = color || (isBullish ? 'var(--color-data-bull)' : 'var(--color-data-bear)')

  return (
    <svg width={width} height={height} className={`flex-shrink-0 ${className}`}>
      <path d={fillD} fill={lineColor} fillOpacity={fillOpacity} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
