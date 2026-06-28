'use client'

import { useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Select, { SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Tabs from '@cloudscape-design/components/tabs'
import Toggle from '@cloudscape-design/components/toggle'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import { useAuth } from '@/components/auth-provider'
import { DEMO_USERS, ROLE_LABELS } from '@/lib/auth'

const THRESHOLD_PRESETS: SelectProps.Option[] = [
  { label: 'Standard (Green <2.5 / Yellow <4.5 / Red <6.5 / Black ≥6.5)', value: 'standard' },
  { label: 'Conservative (Green <2.0 / Yellow <3.5 / Red <5.5 / Black ≥5.5)', value: 'conservative' },
  { label: 'High-capacity (Green <3.0 / Yellow <5.5 / Red <7.0 / Black ≥7.0)', value: 'high' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [thresholdPreset, setThresholdPreset] = useState<SelectProps.Option>(THRESHOLD_PRESETS[0])
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [autoHold, setAutoHold] = useState(true)
  const [ndrf, setNdrf] = useState(true)
  const [refreshRate, setRefreshRate] = useState('30')

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AuthGuard requiredSection="settings">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup
            ariaLabel="Breadcrumbs"
            items={[
              { text: 'KumbhSafe', href: '/dashboard' },
              { text: 'Settings', href: '/settings' },
            ]}
          />
        }
      >
        <ContentLayout
          header={
            <Header
              variant="h1"
              description="Configure system thresholds, notifications, and operator access."
              actions={
                <Button variant="primary" onClick={save}>
                  Save changes
                </Button>
              }
            >
              Settings
            </Header>
          }
        >
          <SpaceBetween size="l">
            {saved && (
              <Alert type="success" dismissible onDismiss={() => setSaved(false)}>
                Settings saved successfully.
              </Alert>
            )}

            <Tabs
              tabs={[
                {
                  label: 'System',
                  id: 'system',
                  content: (
                    <SpaceBetween size="l">
                      <Container header={<Header variant="h2" description="Define density thresholds that trigger zone status changes.">Crowd density thresholds</Header>}>
                        <SpaceBetween size="m">
                          <FormField label="Threshold preset">
                            <Select
                              selectedOption={thresholdPreset}
                              options={THRESHOLD_PRESETS}
                              onChange={({ detail }) => setThresholdPreset(detail.selectedOption)}
                            />
                          </FormField>
                          <ColumnLayout columns={4} variant="text-grid">
                            {[
                              { label: 'GREEN', value: '< 2.5 p/m²', color: '#037f51' },
                              { label: 'YELLOW', value: '2.5 – 4.5 p/m²', color: '#d6880b' },
                              { label: 'RED', value: '4.5 – 6.5 p/m²', color: '#c7162b' },
                              { label: 'BLACK', value: '≥ 6.5 p/m²', color: '#8c1515' },
                            ].map(({ label, value, color }) => (
                              <SpaceBetween key={label} size="xxs">
                                <span
                                  style={{
                                    background: `${color}22`,
                                    border: `1px solid ${color}`,
                                    color,
                                    borderRadius: 4,
                                    padding: '2px 10px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  {label}
                                </span>
                                <Box variant="small" color="text-body-secondary">{value}</Box>
                              </SpaceBetween>
                            ))}
                          </ColumnLayout>
                        </SpaceBetween>
                      </Container>

                      <Container header={<Header variant="h2">Data refresh &amp; automation</Header>}>
                        <SpaceBetween size="m">
                          <ColumnLayout columns={2}>
                            <SpaceBetween size="xxs">
                              <Box variant="awsui-key-label">Dashboard refresh rate (seconds)</Box>
                              <Input
                                value={refreshRate}
                                onChange={({ detail }) => setRefreshRate(detail.value)}
                                type="number"
                                placeholder="30"
                              />
                            </SpaceBetween>
                          </ColumnLayout>
                          <SpaceBetween size="s">
                            <Toggle checked={autoHold} onChange={({ detail }) => setAutoHold(detail.checked)}>
                              Auto-activate entry hold when zone reaches RED status
                            </Toggle>
                            <Toggle checked={smsEnabled} onChange={({ detail }) => setSmsEnabled(detail.checked)}>
                              Enable automated SMS rerouting via RouteOracle
                            </Toggle>
                            <Toggle checked={ndrf} onChange={({ detail }) => setNdrf(detail.checked)}>
                              Notify NDRF on BLACK zone declaration
                            </Toggle>
                          </SpaceBetween>
                        </SpaceBetween>
                      </Container>

                      <Container header={<Header variant="h2">AWS infrastructure</Header>}>
                        <KeyValuePairs
                          columns={3}
                          items={[
                            { label: 'AWS Region', value: 'ap-south-1 (Mumbai)' },
                            { label: 'Bedrock endpoint', value: 'bedrock-runtime.ap-south-1.amazonaws.com' },
                            { label: 'DynamoDB table', value: 'kumbhsafe-zones-prod' },
                            { label: 'SNS topic', value: 'arn:aws:sns:ap-south-1:*:kumbhsafe-alerts' },
                            { label: 'S3 bucket', value: 'kumbhsafe-camera-frames-prod' },
                            {
                              label: 'Status',
                              value: (
                                <StatusIndicator type="success">All systems operational</StatusIndicator>
                              ),
                            },
                          ]}
                        />
                      </Container>
                    </SpaceBetween>
                  ),
                },
                {
                  label: 'Operators',
                  id: 'operators',
                  content: (
                    <Table
                      variant="container"
                      items={DEMO_USERS}
                      trackBy="userId"
                      header={
                        <Header
                          variant="h2"
                          counter={`(${DEMO_USERS.length})`}
                          description="Manage operator access and roles. Roles control which sections each user can access."
                          actions={<Button iconName="add-plus" disabled>Add operator</Button>}
                        >
                          Operator accounts
                        </Header>
                      }
                      columnDefinitions={[
                        {
                          id: 'name',
                          header: 'Name',
                          cell: (u) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'var(--color-background-button-primary-active-4iay8c, #0972d3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: 'white',
                                  flexShrink: 0,
                                }}
                              >
                                {u.avatarInitials}
                              </div>
                              <SpaceBetween size="xxs">
                                <Box fontWeight="bold">{u.name}</Box>
                                <Box variant="small" color="text-body-secondary">{u.email}</Box>
                              </SpaceBetween>
                            </div>
                          ),
                          isRowHeader: true,
                        },
                        {
                          id: 'role',
                          header: 'Role',
                          cell: (u) => {
                            const colors: Record<string, 'red' | 'blue' | 'green' | 'grey'> = {
                              super_admin: 'red',
                              iccc_operator: 'blue',
                              zone_commander: 'green',
                              medical_officer: 'blue',
                              field_officer: 'grey',
                            }
                            return <Badge color={colors[u.role] ?? 'grey'}>{ROLE_LABELS[u.role]}</Badge>
                          },
                        },
                        {
                          id: 'city',
                          header: 'City access',
                          cell: (u) => (
                            <Badge color={u.city === 'both' ? 'blue' : 'grey'}>
                              {u.city === 'both' ? 'Both cities' : u.city === 'nashik' ? 'Nashik' : 'Trimbakeshwar'}
                            </Badge>
                          ),
                        },
                        {
                          id: 'permissions',
                          header: 'Sections',
                          cell: (u) => {
                            const perms: Record<string, string[]> = {
                              super_admin: ['Dashboard', 'Zones', 'Alerts', 'Pilgrims', 'Agents', 'Settings'],
                              iccc_operator: ['Dashboard', 'Zones', 'Alerts', 'Pilgrims', 'Agents'],
                              zone_commander: ['Dashboard', 'Zones', 'Alerts'],
                              medical_officer: ['Dashboard', 'Pilgrims', 'Alerts'],
                              field_officer: ['Dashboard', 'Zones'],
                            }
                            return (
                              <Box variant="small" color="text-body-secondary">
                                {(perms[u.role] ?? []).join(', ')}
                              </Box>
                            )
                          },
                        },
                        {
                          id: 'current',
                          header: 'Logged in',
                          cell: (u) =>
                            user?.userId === u.userId ? (
                              <StatusIndicator type="success">Current session</StatusIndicator>
                            ) : (
                              <Box variant="small" color="text-body-secondary">—</Box>
                            ),
                        },
                      ]}
                      empty={<Box textAlign="center" color="inherit">No operators found.</Box>}
                    />
                  ),
                },
                {
                  label: 'About',
                  id: 'about',
                  content: (
                    <Container header={<Header variant="h2">About KumbhSafe</Header>}>
                      <SpaceBetween size="l">
                        <ColumnLayout columns={2}>
                          <KeyValuePairs
                            columns={1}
                            items={[
                              { label: 'Platform', value: 'KumbhSafe ICCC v2.7.0' },
                              { label: 'Event', value: 'Nashik Simhastha Kumbh Mela 2027' },
                              { label: 'Operator', value: 'District Administration, Nashik' },
                              { label: 'Build', value: 'Production — AWS ap-south-1' },
                            ]}
                          />
                          <KeyValuePairs
                            columns={1}
                            items={[
                              { label: 'AI framework', value: 'Amazon Bedrock AgentCore + Strands' },
                              { label: 'Agents deployed', value: '6 (CommandBridge orchestrator + 5 specialised)' },
                              { label: 'Cities covered', value: 'Nashik, Trimbakeshwar' },
                              { label: 'Zones monitored', value: '12 zones, 126 cameras' },
                            ]}
                          />
                        </ColumnLayout>
                        <Alert type="info">
                          This is a demonstration build of the KumbhSafe platform for the Nashik Simhastha Kumbh Mela 2027.
                          All pilgrims, alerts, and incident data shown are simulated. In production, all data feeds connect
                          to live sensors, cameras, and AWS infrastructure.
                        </Alert>
                      </SpaceBetween>
                    </Container>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>
    </AuthGuard>
  )
}
