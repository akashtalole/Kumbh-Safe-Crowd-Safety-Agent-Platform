'use client'

import { useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Flashbar from '@cloudscape-design/components/flashbar'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import Modal from '@cloudscape-design/components/modal'
import Select, { SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Tabs from '@cloudscape-design/components/tabs'
import Textarea from '@cloudscape-design/components/textarea'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import { ALERTS as INITIAL_ACTIVE, RESOLVED_ALERTS, ZONES } from '@/lib/mock-data'
import { SEVERITY_COLORS, getSeverityIndicatorType, timeAgo, formatDateTime } from '@/lib/utils'
import type { LegacyAlert as KAlert } from '@/lib/types'

type AlertType = 'stampede' | 'flood' | 'medical' | 'fire' | 'missing' | 'infrastructure' | 'crowd_surge'
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

const TYPE_OPTIONS: SelectProps.Option[] = [
  { label: 'Stampede', value: 'stampede' },
  { label: 'Flood', value: 'flood' },
  { label: 'Medical', value: 'medical' },
  { label: 'Fire', value: 'fire' },
  { label: 'Missing person', value: 'missing' },
  { label: 'Infrastructure', value: 'infrastructure' },
  { label: 'Crowd surge', value: 'crowd_surge' },
]

const SEVERITY_OPTIONS: SelectProps.Option[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

const ZONE_OPTIONS: SelectProps.Option[] = ZONES.map((z) => ({
  label: z.name,
  value: z.zoneId,
}))

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<KAlert[]>(INITIAL_ACTIVE)
  const [sopAlert, setSopAlert] = useState<KAlert | null>(null)
  const [flash, setFlash] = useState<{ type: 'success' | 'warning' | 'info'; msg: string } | null>(null)

  // Create form state
  const [alertType, setAlertType] = useState<SelectProps.Option>(TYPE_OPTIONS[0])
  const [severity, setSeverity] = useState<SelectProps.Option>(SEVERITY_OPTIONS[0])
  const [zoneOpt, setZoneOpt] = useState<SelectProps.Option>(ZONE_OPTIONS[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [sopSteps, setSopSteps] = useState<string[]>([''])
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState(false)

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved')

  function handleAction(alertId: string, action: string) {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.alertId !== alertId) return a
        if (action === 'resolve') return { ...a, status: 'resolved', resolvedAt: new Date().toISOString() }
        if (action === 'acknowledge') return { ...a, acknowledgedBy: 'Current Operator' }
        if (action === 'escalate') return { ...a, severity: 'critical' as AlertSeverity }
        return a
      })
    )
    setFlash({ type: 'success', msg: `Alert ${action}d successfully.` })
  }

  function handleCreate() {
    if (!title.trim()) { setCreateError('Alert title is required.'); return }
    const zone = ZONES.find((z) => z.zoneId === zoneOpt.value)!
    const newAlert: KAlert = {
      alertId: `a-${Date.now()}`,
      type: alertType.value as AlertType,
      severity: severity.value as AlertSeverity,
      zoneId: zone.zoneId,
      zoneName: zone.name,
      city: zone.city,
      title,
      description,
      agentSource: 'Manual',
      status: 'open',
      createdAt: new Date().toISOString(),
      assignedTo: assignedTo || undefined,
      sopSteps: sopSteps.filter(Boolean),
    }
    setAlerts((prev) => [newAlert, ...prev])
    setCreateSuccess(true)
    setTitle(''); setDescription(''); setAssignedTo('')
    setSopSteps(['']); setCreateError('')
  }

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved')

  return (
    <AuthGuard requiredSection="alerts">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup
            ariaLabel="Breadcrumbs"
            items={[
              { text: 'KumbhSafe', href: '/dashboard' },
              { text: 'Alert Manager', href: '/alerts' },
            ]}
          />
        }
        notifications={
          flash ? (
            <Flashbar items={[{ type: flash.type, dismissible: true, onDismiss: () => setFlash(null), content: flash.msg, id: 'alert-flash', statusIconAriaLabel: flash.type }]} />
          ) : <Flashbar items={[]} />
        }
      >
        <ContentLayout
          header={
            <Header variant="h1" counter={`(${activeAlerts.length} active)`} description="Monitor, acknowledge, escalate and resolve incident alerts.">
              Alert Manager
            </Header>
          }
        >
          <SpaceBetween size="l">
            {/* Critical summary flashbar */}
            {criticalAlerts.length > 1 && (
              <Alert
                type="error"
                header={`${criticalAlerts.length} critical alerts require immediate response`}
                action={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button variant="primary" onClick={() => setFlash({ type: 'info', msg: 'NDRF notification sent.' })}>Notify NDRF</Button>
                    <Button onClick={() => setFlash({ type: 'success', msg: 'Dismissed.' })}>Dismiss</Button>
                  </SpaceBetween>
                }
              >
                Multiple critical incidents are simultaneously active across Nashik and Trimbakeshwar.
              </Alert>
            )}

            <Tabs
              tabs={[
                {
                  label: `Active alerts (${activeAlerts.length})`,
                  id: 'active',
                  content: (
                    <AlertTable
                      alerts={activeAlerts}
                      onAction={handleAction}
                      onViewSop={(a) => setSopAlert(a)}
                    />
                  ),
                },
                {
                  label: `Resolved today (${RESOLVED_ALERTS.length})`,
                  id: 'resolved',
                  content: (
                    <AlertTable
                      alerts={RESOLVED_ALERTS}
                      onAction={() => {}}
                      onViewSop={(a) => setSopAlert(a)}
                      readOnly
                    />
                  ),
                },
                {
                  label: 'Create alert',
                  id: 'create',
                  content: (
                    <Container>
                      <form onSubmit={(e) => { e.preventDefault(); handleCreate() }}>
                        <Form
                          header={<Header variant="h2">New incident alert</Header>}
                          actions={
                            <SpaceBetween direction="horizontal" size="xs">
                              <Button variant="link" onClick={() => { setTitle(''); setDescription('') }}>Reset</Button>
                              <Button variant="primary" onClick={handleCreate}>Create Alert</Button>
                            </SpaceBetween>
                          }
                          errorText={createError || undefined}
                        >
                          <SpaceBetween size="m">
                            {createSuccess && (
                              <Alert type="success" dismissible onDismiss={() => setCreateSuccess(false)}>
                                Alert created successfully.
                              </Alert>
                            )}
                            <ColumnLayout columns={2}>
                              <FormField label="Alert type">
                                <Select selectedOption={alertType} options={TYPE_OPTIONS} onChange={({ detail }) => setAlertType(detail.selectedOption)} />
                              </FormField>
                              <FormField label="Severity">
                                <Select selectedOption={severity} options={SEVERITY_OPTIONS} onChange={({ detail }) => setSeverity(detail.selectedOption)} />
                              </FormField>
                            </ColumnLayout>
                            <FormField label="Zone">
                              <Select selectedOption={zoneOpt} options={ZONE_OPTIONS} onChange={({ detail }) => setZoneOpt(detail.selectedOption)} />
                            </FormField>
                            <FormField label="Alert title" errorText={!title && createError ? 'Required' : undefined}>
                              <Input value={title} onChange={({ detail }) => setTitle(detail.value)} placeholder="Brief description of the incident" />
                            </FormField>
                            <FormField label="Description" description="Detailed incident description">
                              <Textarea value={description} onChange={({ detail }) => setDescription(detail.value)} rows={3} />
                            </FormField>
                            <FormField label="Assign to">
                              <Input value={assignedTo} onChange={({ detail }) => setAssignedTo(detail.value)} placeholder="Officer name or unit" />
                            </FormField>
                            <FormField label="SOP steps" description="Add the standard operating procedure steps">
                              <SpaceBetween size="xs">
                                {sopSteps.map((step, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                      <Input
                                        value={step}
                                        onChange={({ detail }) => {
                                          const updated = [...sopSteps]
                                          updated[i] = detail.value
                                          setSopSteps(updated)
                                        }}
                                        placeholder={`Step ${i + 1}`}
                                      />
                                    </div>
                                    <Button variant="icon" iconName="remove" onClick={() => setSopSteps(sopSteps.filter((_, j) => j !== i))} ariaLabel="Remove step" />
                                  </div>
                                ))}
                                <Button variant="normal" iconName="add-plus" onClick={() => setSopSteps([...sopSteps, ''])}>
                                  Add step
                                </Button>
                              </SpaceBetween>
                            </FormField>
                          </SpaceBetween>
                        </Form>
                      </form>
                    </Container>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>

      {/* SOP Modal */}
      {sopAlert && (
        <Modal
          visible
          onDismiss={() => setSopAlert(null)}
          header={`SOP — ${sopAlert.title}`}
          size="medium"
          footer={
            <Box float="right">
              <Button variant="primary" onClick={() => setSopAlert(null)}>Close</Button>
            </Box>
          }
        >
          <SpaceBetween size="m">
            <StatusIndicator type={getSeverityIndicatorType(sopAlert.severity)}>
              {sopAlert.severity.toUpperCase()} — {sopAlert.type.replace('_', ' ').toUpperCase()}
            </StatusIndicator>
            <Box variant="p">{sopAlert.description}</Box>
            {sopAlert.sopSteps.length > 0 && (
              <SpaceBetween size="xs">
                {sopAlert.sopSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Box variant="small" color="text-body-secondary" fontWeight="bold">{i + 1}.</Box>
                    <Box variant="p">{step}</Box>
                  </div>
                ))}
              </SpaceBetween>
            )}
          </SpaceBetween>
        </Modal>
      )}
    </AuthGuard>
  )
}

function AlertTable({
  alerts,
  onAction,
  onViewSop,
  readOnly = false,
}: {
  alerts: KAlert[]
  onAction: (id: string, action: string) => void
  onViewSop: (a: KAlert) => void
  readOnly?: boolean
}) {
  return (
    <Table<KAlert>
      variant="container"
      items={alerts}
      trackBy="alertId"
      header={<Header variant="h2" counter={`(${alerts.length})`}>Alerts</Header>}
      columnDefinitions={[
        {
          id: 'severity',
          header: 'Severity',
          cell: (a) => {
            const color = SEVERITY_COLORS[a.severity]
            return (
              <span style={{ background: `${color}22`, border: `1px solid ${color}`, color, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {a.severity.toUpperCase()}
              </span>
            )
          },
          sortingField: 'severity',
        },
        {
          id: 'type',
          header: 'Type',
          cell: (a) => <Badge color="blue">{a.type.replace('_', ' ')}</Badge>,
          sortingField: 'type',
        },
        {
          id: 'title',
          header: 'Title',
          cell: (a) => <Box variant="p">{a.title}</Box>,
          isRowHeader: true,
        },
        {
          id: 'zone',
          header: 'Zone',
          cell: (a) => a.zoneName,
          sortingField: 'zoneName',
        },
        {
          id: 'agent',
          header: 'Agent',
          cell: (a) => <Box variant="small" color="text-body-secondary">{a.agentSource}</Box>,
        },
        {
          id: 'created',
          header: 'Created',
          cell: (a) => timeAgo(a.createdAt),
          sortingField: 'createdAt',
        },
        {
          id: 'status',
          header: 'Status',
          cell: (a) => (
            <StatusIndicator type={a.status === 'resolved' ? 'success' : a.status === 'responding' ? 'in-progress' : 'error'}>
              {a.status}
            </StatusIndicator>
          ),
        },
        {
          id: 'actions',
          header: 'Actions',
          cell: (a) =>
            readOnly ? null : (
              <ButtonDropdown
                variant="normal"
                items={[
                  { id: 'acknowledge', text: 'Acknowledge', disabled: !!a.acknowledgedBy },
                  { id: 'escalate', text: 'Escalate to critical' },
                  { id: 'resolve', text: 'Resolve', disabled: a.status === 'resolved' },
                  { id: 'sop', text: 'View SOP' },
                ]}
                onItemClick={({ detail }) => {
                  if (detail.id === 'sop') onViewSop(a)
                  else onAction(a.alertId, detail.id)
                }}
              >
                Actions
              </ButtonDropdown>
            ),
        },
      ]}
      empty={<Box textAlign="center" color="inherit">No alerts.</Box>}
    />
  )
}
