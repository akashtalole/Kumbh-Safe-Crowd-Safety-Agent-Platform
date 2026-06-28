'use client'

import { useRouter } from 'next/navigation'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import type { LegacyAlert as Alert } from '@/lib/types'
import { SEVERITY_COLORS, getSeverityIndicatorType, timeAgo } from '@/lib/utils'

export default function AlertFeed({ alerts }: { alerts: Alert[] }) {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
      {alerts.map((alert) => (
        <AlertCard key={alert.alertId} alert={alert} onRespond={() => router.push(`/alerts`)} />
      ))}
    </div>
  )
}

function AlertCard({ alert, onRespond }: { alert: Alert; onRespond: () => void }) {
  const color = SEVERITY_COLORS[alert.severity]
  const isCritical = alert.severity === 'critical'

  return (
    <div
      style={{
        border: `1px solid ${color}44`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: isCritical ? `${color}08` : 'transparent',
      }}
    >
      <SpaceBetween size="xxs">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <StatusIndicator type={getSeverityIndicatorType(alert.severity)}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{alert.title}</span>
          </StatusIndicator>
          <span
            style={{
              background: `${color}22`,
              border: `1px solid ${color}`,
              color,
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {alert.severity.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box variant="small" color="text-body-secondary">
            {alert.agentSource} · {alert.zoneName} · {timeAgo(alert.createdAt)}
          </Box>
          {isCritical && (
            <Button variant="primary" onClick={onRespond}>
              Respond
            </Button>
          )}
        </div>
      </SpaceBetween>
    </div>
  )
}
