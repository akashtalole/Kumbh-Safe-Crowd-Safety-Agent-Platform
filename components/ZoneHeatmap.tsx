'use client'

import { useRouter } from 'next/navigation'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import SpaceBetween from '@cloudscape-design/components/space-between'
import type { LegacyZone as Zone } from '@/lib/types'
import { STATUS_COLORS, getDensityStatus } from '@/lib/utils'

type ZoneStatus = 'green' | 'yellow' | 'red' | 'black' | 'closed'
const STATUS_ORDER: Record<ZoneStatus, number> = { black: 0, red: 1, yellow: 2, green: 3, closed: 4 }

function sortZones(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export default function ZoneHeatmap({ zones }: { zones: Zone[] }) {
  const router = useRouter()
  const sorted = sortZones(zones)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
      }}
    >
      {sorted.map((zone) => (
        <ZoneCard key={zone.zoneId} zone={zone} onClick={() => router.push(`/zones/${zone.zoneId}`)} />
      ))}
    </div>
  )
}

function ZoneCard({ zone, onClick }: { zone: Zone; onClick: () => void }) {
  const densityColor = STATUS_COLORS[getDensityStatus(zone.currentDensity)]
  const fillPct = Math.min((zone.currentDensity / 8) * 100, 100)

  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${densityColor}`,
        borderRadius: 8,
        padding: '12px 14px',
        cursor: 'pointer',
        background: 'var(--color-background-container-content-i3dihz, #ffffff0a)',
        transition: 'box-shadow 0.15s',
        boxShadow: zone.status === 'black' || zone.status === 'red'
          ? `0 0 8px ${densityColor}40`
          : 'none',
      }}
    >
      <SpaceBetween size="xs">
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box variant="p" fontWeight="bold">
            {zone.name}
          </Box>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <Badge color={zone.city === 'nashik' ? 'blue' : 'grey'}>
              {zone.city === 'nashik' ? 'NSK' : 'TBK'}
            </Badge>
            {zone.isHeld && <Badge color="red">HELD</Badge>}
          </div>
        </div>

        {/* Density number */}
        <div style={{ color: densityColor, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
          {zone.currentDensity.toFixed(1)}
          <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4, color: 'inherit' }}>p/m²</span>
        </div>

        {/* Density bar */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${fillPct}%`,
              background: densityColor,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box variant="small" color="text-body-secondary">
            {zone.currentCount.toLocaleString('en-IN')} / {zone.capacity.toLocaleString('en-IN')}
          </Box>
          <StatusChip status={zone.status} />
        </div>
      </SpaceBetween>
    </div>
  )
}

function StatusChip({ status }: { status: Zone['status'] }) {
  const label = status.toUpperCase()
  const color = STATUS_COLORS[status]
  return (
    <span
      style={{
        background: `${color}22`,
        border: `1px solid ${color}`,
        color,
        borderRadius: 4,
        padding: '1px 7px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  )
}
