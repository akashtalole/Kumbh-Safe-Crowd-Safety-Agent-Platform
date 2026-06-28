'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import LineChart from '@cloudscape-design/components/line-chart'
import Select, { SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import DensityGauge from '@/components/DensityGauge'
import { ZONES, ALERTS, AGENTS, getZoneDensityHistory } from '@/lib/mock-data'
import { STATUS_COLORS, getDensityStatus, timeAgo, formatDateTime, formatNumber } from '@/lib/utils'
import type { LegacyZone as Zone } from '@/lib/types'

const LANG_OPTIONS: SelectProps.Option[] = [
  { label: 'Marathi', value: 'marathi' },
  { label: 'Hindi', value: 'hindi' },
  { label: 'English', value: 'english' },
  { label: 'Gujarati', value: 'gujarati' },
  { label: 'Tamil', value: 'tamil' },
]

export default function ZoneDetailPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params)
  const router = useRouter()
  const [zone, setZone] = useState<Zone | undefined>(ZONES.find((z) => z.zoneId === zoneId))
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState<SelectProps.Option>(LANG_OPTIONS[1])

  if (!zone) {
    return (
      <AuthGuard requiredSection="zones">
        <KumbhShell>
          <Box variant="h2" color="text-status-error">Zone not found</Box>
        </KumbhShell>
      </AuthGuard>
    )
  }

  const densityHistory = getZoneDensityHistory(zone)
  const zoneAlerts = ALERTS.filter((a) => a.zoneId === zone.zoneId).slice(0, 5)
  const watchingAgents = AGENTS.filter((a) => a.toolsUsed.includes('dynamo_read_zone') && a.status !== 'idle').slice(0, 3)
  const color = STATUS_COLORS[zone.status]

  function toggleHold() {
    if (!zone) return
    setZone((z) => z ? { ...z, isHeld: !z.isHeld } : z)
    setActionResult(zone.isHeld ? `Entry hold released for ${zone.name}.` : `Entry hold activated for ${zone.name}.`)
  }

  return (
    <AuthGuard requiredSection="zones">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup
            ariaLabel="Breadcrumbs"
            items={[
              { text: 'KumbhSafe', href: '/dashboard' },
              { text: 'Zone Management', href: '/zones' },
              { text: zone.name, href: `/zones/${zone.zoneId}` },
            ]}
          />
        }
      >
        <ContentLayout
          header={
            <Header
              variant="h1"
              description={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge color={zone.city === 'nashik' ? 'blue' : 'grey'}>
                    {zone.city === 'nashik' ? 'Nashik' : 'Trimbakeshwar'}
                  </Badge>
                  <span
                    style={{
                      background: `${color}22`,
                      border: `1px solid ${color}`,
                      color,
                      borderRadius: 4,
                      padding: '1px 8px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {zone.status.toUpperCase()}
                  </span>
                  {zone.isHeld && <Badge color="red">ENTRY HELD</Badge>}
                </div>
              }
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant={zone.isHeld ? 'normal' : 'primary'} onClick={toggleHold}>
                    {zone.isHeld ? 'Release Hold' : 'Activate Hold'}
                  </Button>
                  <Button variant="primary" onClick={() => setActionResult('Emergency declared. NDRF notified.')}>
                    Declare Emergency
                  </Button>
                </SpaceBetween>
              }
            >
              {zone.name}
            </Header>
          }
        >
          <SpaceBetween size="l">
            {actionResult && (
              <Alert type="success" dismissible onDismiss={() => setActionResult(null)}>
                {actionResult}
              </Alert>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 20 }}>
              {/* LEFT */}
              <SpaceBetween size="l">
                {/* Line chart */}
                <Container header={<Header variant="h2">Crowd density — last 6 hours</Header>}>
                  <LineChart
                    series={[
                      {
                        title: 'Density (p/m²)',
                        type: 'line',
                        data: densityHistory.map((d) => ({ x: d.x, y: d.y })),
                        color,
                      },
                      {
                        title: 'Critical threshold',
                        type: 'threshold',
                        y: 6.5,
                        color: '#c7162b',
                      },
                    ]}
                    xDomain={densityHistory.map((d) => d.x)}
                    yDomain={[0, 9]}
                    i18nStrings={{
                      xTickFormatter: (v) => v as string,
                      yTickFormatter: (v) => `${v}`,
                      filterLabel: 'Filter series',
                      filterPlaceholder: 'Filter series',
                      filterSelectedAriaLabel: 'selected',
                      legendAriaLabel: 'Legend',
                      chartAriaRoleDescription: 'line chart',
                    }}
                    ariaLabel="Zone density history"
                    height={200}
                    hideFilter
                  />
                </Container>

                {/* Key-value details */}
                <Container header={<Header variant="h2">Current conditions</Header>}>
                  <KeyValuePairs
                    columns={3}
                    items={[
                      { label: 'Current density', value: `${zone.currentDensity} p/m²` },
                      { label: 'Count / Capacity', value: `${formatNumber(zone.currentCount)} / ${formatNumber(zone.capacity)}` },
                      { label: 'Zone status', value: <StatusIndicator type={zone.status === 'black' || zone.status === 'red' ? 'error' : zone.status === 'yellow' ? 'warning' : 'success'}>{zone.status.toUpperCase()}</StatusIndicator> },
                      { label: 'Entry hold', value: <StatusIndicator type={zone.isHeld ? 'error' : 'success'}>{zone.isHeld ? 'HELD' : 'Open'}</StatusIndicator> },
                      { label: 'Cameras operational', value: `${zone.cameraCount}` },
                      { label: 'Last updated', value: timeAgo(zone.lastUpdated) },
                      ...(zone.ghatName ? [{ label: 'Ghat name', value: zone.ghatName }] : []),
                    ]}
                  />
                </Container>

                {/* Recent alerts */}
                <Container header={<Header variant="h2" counter={`(${zoneAlerts.length})`}>Recent alerts for this zone</Header>}>
                  {zoneAlerts.length === 0 ? (
                    <Box color="text-body-secondary">No recent alerts for this zone.</Box>
                  ) : (
                    <SpaceBetween size="s">
                      {zoneAlerts.map((alert) => (
                        <div key={alert.alertId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <StatusIndicator type={alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'}>
                            <Box variant="p">{alert.title}</Box>
                          </StatusIndicator>
                          <Box variant="small" color="text-body-secondary">{timeAgo(alert.createdAt)}</Box>
                        </div>
                      ))}
                    </SpaceBetween>
                  )}
                </Container>
              </SpaceBetween>

              {/* RIGHT */}
              <SpaceBetween size="l">
                {/* Density gauge */}
                <Container header={<Header variant="h2">Density gauge</Header>}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <DensityGauge density={zone.currentDensity} />
                  </div>
                </Container>

                {/* Quick actions */}
                <Container header={<Header variant="h2">Quick actions</Header>}>
                  <SpaceBetween size="s">
                    <Button variant={zone.isHeld ? 'normal' : 'primary'} iconName={zone.isHeld ? 'unlocked' : 'lock-private'} onClick={toggleHold} fullWidth>
                      {zone.isHeld ? 'Release Entry Hold' : 'Hold Entry'}
                    </Button>
                    <Button variant="primary" onClick={() => setActionResult('Emergency declared. NDRF notified.')} fullWidth>
                      Declare Emergency
                    </Button>
                    <Button iconName="call" onClick={() => setActionResult('Ambulance request sent to dispatch.')} fullWidth>
                      Request Ambulance
                    </Button>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <Select
                          selectedOption={selectedLang}
                          options={LANG_OPTIONS}
                          onChange={({ detail }) => setSelectedLang(detail.selectedOption)}
                          ariaLabel="Language for SMS"
                        />
                      </div>
                      <Button onClick={() => setActionResult(`Crowd reroute SMS sent in ${selectedLang.label}.`)}>
                        Send SMS
                      </Button>
                    </div>
                  </SpaceBetween>
                </Container>

                {/* Connected agents */}
                <Container header={<Header variant="h2">Connected agents</Header>}>
                  <SpaceBetween size="s">
                    {watchingAgents.map((agent) => (
                      <StatusIndicator key={agent.agentId} type={agent.status === 'alert' ? 'warning' : 'in-progress'}>
                        <Box variant="p">{agent.name}</Box>
                        <Box variant="small" color="text-body-secondary">{agent.lastAction.slice(0, 60)}…</Box>
                      </StatusIndicator>
                    ))}
                  </SpaceBetween>
                </Container>
              </SpaceBetween>
            </div>
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>
    </AuthGuard>
  )
}
