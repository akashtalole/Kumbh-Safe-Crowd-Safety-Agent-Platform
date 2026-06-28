'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import Flashbar from '@cloudscape-design/components/flashbar'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Badge from '@cloudscape-design/components/badge'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import ZoneHeatmap from '@/components/ZoneHeatmap'
import AlertFeed from '@/components/AlertFeed'
import AgentStatusCard from '@/components/AgentStatusCard'
import { ZONES, ALERTS, AGENTS, GHATS } from '@/lib/mock-data'
import { formatNumber, GHAT_STATUS_INDICATOR, timeAgo } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const [flashDismissed, setFlashDismissed] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const criticalAlert = ALERTS.find((a) => a.severity === 'critical')
  const activeAlerts = ALERTS.filter((a) => a.status !== 'resolved')
  const redBlackZones = ZONES.filter((z) => z.status === 'red' || z.status === 'black')

  return (
    <AuthGuard requiredSection="dashboard">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup
            ariaLabel="Breadcrumbs"
            items={[
              { text: 'KumbhSafe', href: '/dashboard' },
              { text: 'ICCC Dashboard', href: '/dashboard' },
            ]}
          />
        }
        notifications={
          !flashDismissed && criticalAlert ? (
            <Flashbar
              items={[
                {
                  type: 'error',
                  dismissible: true,
                  statusIconAriaLabel: 'Critical alert',
                  onDismiss: () => setFlashDismissed(true),
                  content: (
                    <span>
                      <strong>CRITICAL:</strong> {criticalAlert.title} — {' '}
                      <Button variant="inline-link" onClick={() => router.push('/alerts')}>
                        View all alerts
                      </Button>
                    </span>
                  ),
                  id: 'critical-flash',
                },
              ]}
            />
          ) : (
            <Flashbar items={[]} />
          )
        }
      >
        <ContentLayout
          header={
            <Header
              variant="h1"
              description={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#c7162b',
                      display: 'inline-block',
                      animation: 'kpulse 1.5s infinite',
                    }}
                  />
                  LIVE — {liveTime.toLocaleTimeString('en-IN', { hour12: true })} IST · Nashik Simhastha Kumbh Mela 2027
                </span>
              }
            >
              ICCC Command Center
            </Header>
          }
        >
          <SpaceBetween size="l">
            {/* Top stats row */}
            <ColumnLayout columns={4} variant="text-grid">
              <StatCard
                label="Pilgrims tracked today"
                value={formatNumber(2847420)}
                sub="↑ 12,340 since 1 hour ago"
                color="var(--color-text-status-success-cqfbcn, #037f51)"
              />
              <StatCard
                label="Active alerts"
                value={`${activeAlerts.length}`}
                sub={`${activeAlerts.filter((a) => a.severity === 'critical').length} critical`}
                color="var(--color-text-status-error-mdfbya, #c7162b)"
              />
              <StatCard
                label="Zones in RED / BLACK"
                value={`${redBlackZones.length}`}
                sub="Immediate attention required"
                color="var(--color-text-status-error-mdfbya, #c7162b)"
              />
              <StatCard
                label="Ambulances available"
                value="12 / 15"
                sub="3 dispatched to Kushavart"
                color="var(--color-text-status-warning-27nlyh, #8d6605)"
              />
            </ColumnLayout>

            {/* Main two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20 }}>
              {/* Left: Zone heatmap + ghat conditions */}
              <SpaceBetween size="l">
                <Container
                  header={
                    <Header
                      variant="h2"
                      counter={`(${ZONES.length})`}
                      actions={
                        <Button variant="normal" iconName="refresh" onClick={() => {}}>
                          Refresh
                        </Button>
                      }
                    >
                      Zone density — live
                    </Header>
                  }
                >
                  <ZoneHeatmap zones={ZONES} />
                </Container>

                <ExpandableSection
                  headerText="Ghat conditions"
                  variant="container"
                >
                  <Table
                    items={GHATS}
                    trackBy="ghatId"
                    columnDefinitions={[
                      {
                        id: 'name',
                        header: 'Ghat Name',
                        cell: (g) => g.name,
                        isRowHeader: true,
                      },
                      {
                        id: 'city',
                        header: 'City',
                        cell: (g) => (
                          <Badge color={g.city === 'nashik' ? 'blue' : 'grey'}>
                            {g.city === 'nashik' ? 'Nashik' : 'Trimbakeshwar'}
                          </Badge>
                        ),
                      },
                      {
                        id: 'waterLevel',
                        header: 'Water Level',
                        cell: (g) => `+${g.waterLevel.toFixed(1)}m`,
                      },
                      {
                        id: 'trend',
                        header: 'Trend',
                        cell: (g) => (
                          <span>
                            {g.waterLevelTrend === 'rising' ? '↑' : g.waterLevelTrend === 'falling' ? '↓' : '→'}{' '}
                            {g.waterLevelTrend}
                          </span>
                        ),
                      },
                      {
                        id: 'status',
                        header: 'Status',
                        cell: (g) => (
                          <StatusIndicator type={GHAT_STATUS_INDICATOR[g.status]}>
                            {g.status.toUpperCase()}
                          </StatusIndicator>
                        ),
                      },
                      {
                        id: 'bathing',
                        header: 'Bathing',
                        cell: (g) => (
                          <StatusIndicator type={g.bathingAllowed ? 'success' : 'error'}>
                            {g.bathingAllowed ? 'Allowed' : 'Prohibited'}
                          </StatusIndicator>
                        ),
                      },
                    ]}
                    empty={<Box textAlign="center" color="inherit">No ghat data</Box>}
                  />
                </ExpandableSection>
              </SpaceBetween>

              {/* Right: Alert feed */}
              <Container
                header={
                  <Header
                    variant="h2"
                    counter={`(${activeAlerts.length})`}
                    actions={
                      <Button variant="link" onClick={() => router.push('/alerts')}>
                        View all
                      </Button>
                    }
                  >
                    Live alert feed
                  </Header>
                }
              >
                <AlertFeed alerts={activeAlerts} />
              </Container>
            </div>

            {/* Agent status row */}
            <Container
              header={
                <Header
                  variant="h2"
                  description="Bedrock AgentCore — Strands framework"
                  actions={
                    <Button variant="link" onClick={() => router.push('/agents')}>
                      Monitor all agents
                    </Button>
                  }
                >
                  Agent Status
                </Header>
              }
            >
              <ColumnLayout columns={3}>
                {AGENTS.map((agent) => (
                  <AgentStatusCard key={agent.agentId} agent={agent} />
                ))}
              </ColumnLayout>
            </Container>
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>
      <style>{`
        @keyframes kpulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </AuthGuard>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <SpaceBetween size="xxs">
      <Box variant="awsui-key-label">{label}</Box>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <Box variant="small" color="text-body-secondary">{sub}</Box>
    </SpaceBetween>
  )
}
