'use client'

import Box from '@cloudscape-design/components/box'
import { STATUS_COLORS, getDensityStatus } from '@/lib/utils'

export default function DensityGauge({ density, maxDensity = 8 }: { density: number; maxDensity?: number }) {
  const status = getDensityStatus(density)
  const color = STATUS_COLORS[status]
  const pct = Math.min(density / maxDensity, 1)

  // SVG arc parameters
  const cx = 100, cy = 100, r = 75
  const startAngle = 210 // degrees
  const totalAngle = 300 // degrees sweep
  const toRad = (d: number) => (d * Math.PI) / 180

  function arcPath(start: number, end: number, radius: number) {
    const s = toRad(start)
    const e = toRad(end)
    const x1 = cx + radius * Math.cos(s)
    const y1 = cy + radius * Math.sin(s)
    const x2 = cx + radius * Math.cos(e)
    const y2 = cy + radius * Math.sin(e)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  const bgPath = arcPath(startAngle, startAngle + totalAngle, r)
  const fgPath = arcPath(startAngle, startAngle + totalAngle * pct, r)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="200" height="160" viewBox="0 0 200 160" aria-label={`Density gauge: ${density} p/m²`}>
        {/* Background track */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        {/* Colored fill */}
        <path d={fgPath} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
        {/* Center text */}
        <text x="100" y="95" textAnchor="middle" fill={color} fontSize="32" fontWeight="700" fontFamily="sans-serif">
          {density.toFixed(1)}
        </text>
        <text x="100" y="115" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="sans-serif">
          p/m²
        </text>
        {/* Min/max labels */}
        <text x="25" y="148" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="sans-serif">0</text>
        <text x="175" y="148" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="sans-serif">{maxDensity}</text>
        {/* Threshold markers at 2.5, 4.5, 6.5 */}
        {[2.5, 4.5, 6.5].map((t) => {
          const angle = startAngle + (t / maxDensity) * totalAngle
          const rad = toRad(angle)
          const x1 = cx + (r - 10) * Math.cos(rad)
          const y1 = cy + (r - 10) * Math.sin(rad)
          const x2 = cx + (r + 10) * Math.cos(rad)
          const y2 = cy + (r + 10) * Math.sin(rad)
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        })}
      </svg>
      <div
        style={{
          background: `${color}22`,
          border: `1px solid ${color}`,
          color,
          borderRadius: 6,
          padding: '4px 16px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {status.toUpperCase()} ZONE
      </div>
    </div>
  )
}
