'use client'

import { useState } from 'react'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import Flashbar from '@cloudscape-design/components/flashbar'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Tabs from '@cloudscape-design/components/tabs'
import Textarea from '@cloudscape-design/components/textarea'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import { AGENTS, AGENT_LOGS } from '@/lib/mock-data'
import { AGENT_STATUS_INDICATOR, timeAgo } from '@/lib/utils'
import type { Agent, AgentInvocationLog } from '@/lib/types'

const STATUS_ICON_COLOR: Record<string, string> = {
  active: '#037f51',
  alert: '#d6880b',
  idle: '#5f6b7a',
  error: '#c7162b',
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [invokeTask, setInvokeTask] = useState('')
  const [invokeResult, setInvokeResult] = useState<string | null>(null)
  const [invoking, setInvoking] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'warning'; msg: string } | null>(null)

  const activeCount = AGENTS.filter((a) => a.status === 'active' || a.status === 'alert').length
  const totalInvocations = AGENTS.reduce((s, a) => s + a.invocationsToday, 0)
  const totalAlerts = AGENTS.reduce((s, a) => s + a.alertsRaised, 0)
  const avgMs = Math.round(AGENTS.reduce((s, a) => s + a.averageResponseMs, 0) / AGENTS.length)

  async function handleInvoke() {
    if (!selectedAgent || !invokeTask.trim()) return
    setInvoking(true)
    await new Promise((r) => setTimeout(r, 1400))
    setInvokeResult(
      `[${selectedAgent.name}] Received task: "${invokeTask}"\n\nInitializing...\nQuerying DynamoDB zone metrics...\nCalling tool: ${selectedAgent.toolsUsed[0]}\n\nResult: Task accepted. Current operational status: ${selectedAgent.lastAction}\n\nModel: ${selectedAgent.model}\nResponse time: ${Math.round(selectedAgent.averageResponseMs * (0.85 + Math.random() * 0.3))}ms\nStatus: Success`
    )
    setInvoking(false)
  }

  function handlePause(agent: Agent) {
    setFlash({ type: 'warning', msg: `${agent.name} paused. Manual override active.` })
  }

  return (
    <AuthGuard requiredSection="agents">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup
            ariaLabel="Breadcrumbs"
            items={[
              { text: 'KumbhSafe', href: '/dashboard' },
              { text: 'Agent Monitor', href: '/agents' },
            ]}
          />
        }
        notifications={
          flash ? (
            <Flashbar
              items={[{
                type: flash.type,
                dismissible: true,
                onDismiss: () => setFlash(null),
                content: flash.msg,
                id: 'agent-flash',
                statusIconAriaLabel: flash.type,
              }]}
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
              description="Amazon Bedrock AgentCore — Strands multi-agent framework. All agents operate autonomously and escalate to human operators when required."
            >
              Bedrock Agent Monitor
            </Header>
          }
        >
          <SpaceBetween size="l">
            {/* Summary stats */}
            <ColumnLayout columns={4} variant="text-grid">
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Active agents</Box>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#037f51' }}>{activeCount} / {AGENTS.length}</div>
                <Box variant="small" color="text-body-secondary">Autonomous operation</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Total invocations today</Box>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-body-default-7p9esn)' }}>{totalInvocations.toLocaleString()}</div>
                <Box variant="small" color="text-body-secondary">Across all 6 agents</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Alerts raised today</Box>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#d6880b' }}>{totalAlerts}</div>
                <Box variant="small" color="text-body-secondary">Automated detections</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Avg. response time</Box>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-body-default-7p9esn)' }}>{avgMs}ms</div>
                <Box variant="small" color="text-body-secondary">Across all agents</Box>
              </SpaceBetween>
            </ColumnLayout>

            <Tabs
              tabs={[
                {
                  label: 'Agent cards',
                  id: 'cards',
                  content: (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                        gap: 16,
                        paddingTop: 16,
                      }}
                    >
                      {AGENTS.map((agent) => (
                        <AgentDetailCard
                          key={agent.agentId}
                          agent={agent}
                          onInvoke={() => {
                            setSelectedAgent(agent)
                            setInvokeResult(null)
                            setInvokeTask('')
                          }}
                          onPause={() => handlePause(agent)}
                        />
                      ))}
                    </div>
                  ),
                },
                {
                  label: `Invocation log (${AGENT_LOGS.length})`,
                  id: 'logs',
                  content: (
                    <Table<AgentInvocationLog>
                      variant="container"
                      items={AGENT_LOGS}
                      trackBy="logId"
                      header={<Header variant="h2" counter={`(${AGENT_LOGS.length})`}>Recent invocations</Header>}
                      columnDefinitions={[
                        {
                          id: 'time',
                          header: 'Time',
                          cell: (l) => timeAgo(l.timestamp),
                          sortingField: 'timestamp',
                        },
                        {
                          id: 'agent',
                          header: 'Agent',
                          cell: (l) => <Box fontWeight="bold">{l.agentName}</Box>,
                          isRowHeader: true,
                          sortingField: 'agentName',
                        },
                        {
                          id: 'action',
                          header: 'Action taken',
                          cell: (l) => <Box variant="p">{l.actionTaken}</Box>,
                        },
                        {
                          id: 'zone',
                          header: 'Zone',
                          cell: (l) => (
                            <Box variant="small" color="text-body-secondary">
                              {l.zoneAffected}
                            </Box>
                          ),
                        },
                        {
                          id: 'duration',
                          header: 'Duration',
                          cell: (l) => `${l.durationMs}ms`,
                          sortingField: 'durationMs',
                        },
                        {
                          id: 'result',
                          header: 'Result',
                          cell: (l) => (
                            <StatusIndicator
                              type={
                                l.result === 'success'
                                  ? 'success'
                                  : l.result === 'alert'
                                  ? 'warning'
                                  : 'error'
                              }
                            >
                              {l.result}
                            </StatusIndicator>
                          ),
                          sortingField: 'result',
                        },
                      ]}
                      empty={<Box textAlign="center" color="inherit">No log entries.</Box>}
                    />
                  ),
                },
                {
                  label: 'Architecture',
                  id: 'arch',
                  content: (
                    <Container header={<Header variant="h2">Agent architecture — Bedrock Strands framework</Header>}>
                      <SpaceBetween size="l">
                        <Box variant="p">
                          KumbhSafe uses Amazon Bedrock AgentCore with the Strands multi-agent framework.
                          A master orchestrator agent (CommandBridge) manages five specialised sub-agents.
                          All agents persist state and alerts to Amazon DynamoDB and communicate via Amazon SNS.
                        </Box>
                        <ColumnLayout columns={2}>
                          <SpaceBetween size="s">
                            <Box variant="h3">Data flow</Box>
                            {[
                              'Cameras → OpenCV crowd analysis → CrowdSentinel',
                              'Godavari sensor + IMD API → FloodWatch',
                              'Pilgrim registry + GPS → RouteOracle',
                              'Ambulance GPS + hospital capacity → MedEvac',
                              'Camera feeds + FaceID → LostConnect',
                              'All agents → CommandBridge → Human operators',
                            ].map((step, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <Box variant="small" color="text-body-secondary" fontWeight="bold">{i + 1}.</Box>
                                <Box variant="small">{step}</Box>
                              </div>
                            ))}
                          </SpaceBetween>
                          <SpaceBetween size="s">
                            <Box variant="h3">AWS services used</Box>
                            {[
                              ['Amazon Bedrock AgentCore', 'Agent hosting and tool execution'],
                              ['Amazon Nova Pro / Lite', 'LLM backbone for all agents'],
                              ['Amazon DynamoDB', 'Zone state, alerts, pilgrim registry'],
                              ['Amazon SNS', 'Bulk SMS and push notifications'],
                              ['Amazon Rekognition', 'Lost person facial recognition'],
                              ['Amazon S3', 'Camera frame storage and audit logs'],
                            ].map(([svc, desc]) => (
                              <div key={svc}>
                                <Box variant="small" fontWeight="bold">{svc}</Box>
                                <Box variant="small" color="text-body-secondary">{desc}</Box>
                              </div>
                            ))}
                          </SpaceBetween>
                        </ColumnLayout>
                      </SpaceBetween>
                    </Container>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>

      {/* Invoke modal */}
      <Modal
        visible={!!selectedAgent}
        onDismiss={() => {
          setSelectedAgent(null)
          setInvokeResult(null)
          setInvokeTask('')
        }}
        header={`Invoke ${selectedAgent?.name ?? ''}`}
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => {
                  setSelectedAgent(null)
                  setInvokeResult(null)
                  setInvokeTask('')
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                loading={invoking}
                onClick={handleInvoke}
                disabled={!invokeTask.trim()}
              >
                Send task
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {selectedAgent && (
          <SpaceBetween size="m">
            <KeyValuePairs
              columns={3}
              items={[
                { label: 'Model', value: selectedAgent.model },
                { label: 'Avg response', value: `${selectedAgent.averageResponseMs}ms` },
                { label: 'Status', value: <StatusIndicator type={AGENT_STATUS_INDICATOR[selectedAgent.status]}>{selectedAgent.status}</StatusIndicator> },
              ]}
            />
            <Box variant="p" color="text-body-secondary">{selectedAgent.role}</Box>
            <Textarea
              value={invokeTask}
              onChange={({ detail }) => setInvokeTask(detail.value)}
              placeholder={`Describe the task for ${selectedAgent.name}...`}
              rows={3}
            />
            {invokeResult && (
              <ExpandableSection
                headerText="Agent response"
                defaultExpanded
                variant="container"
              >
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    color: 'var(--color-text-body-secondary-cwla8r, #8d99a8)',
                    lineHeight: 1.6,
                  }}
                >
                  {invokeResult}
                </div>
              </ExpandableSection>
            )}
          </SpaceBetween>
        )}
      </Modal>
    </AuthGuard>
  )
}

function AgentDetailCard({
  agent,
  onInvoke,
  onPause,
}: {
  agent: Agent
  onInvoke: () => void
  onPause: () => void
}) {
  const color = STATUS_ICON_COLOR[agent.status] ?? '#5f6b7a'

  return (
    <div
      style={{
        border: `1px solid ${agent.status === 'alert' ? '#d6880b44' : 'var(--color-border-divider-default-cx07f2, #414d5c)'}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SpaceBetween size="xxs">
          <StatusIndicator type={AGENT_STATUS_INDICATOR[agent.status]}>
            <Box variant="p" fontWeight="bold">{agent.name}</Box>
          </StatusIndicator>
          <Box variant="small" color="text-body-secondary">
            {agent.model.split('.')[0]} · {agent.model.split('-')[1] ?? 'nova'}
          </Box>
        </SpaceBetween>
        <Badge
          color={
            agent.status === 'active'
              ? 'green'
              : agent.status === 'alert'
              ? 'red'
              : 'grey'
          }
        >
          {agent.status.toUpperCase()}
        </Badge>
      </div>

      {/* Role description */}
      <Box variant="small" color="text-body-secondary">
        {agent.role}
      </Box>

      {/* Last action terminal-style */}
      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 4,
          padding: '6px 10px',
          fontFamily: 'monospace',
          fontSize: 11,
          color: color,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        &gt; {agent.lastAction}
      </div>

      {/* Stats row */}
      <ColumnLayout columns={3} variant="text-grid">
        <SpaceBetween size="xxs">
          <Box variant="awsui-key-label" fontSize="body-s">Invocations</Box>
          <Box fontWeight="bold">{agent.invocationsToday.toLocaleString()}</Box>
        </SpaceBetween>
        <SpaceBetween size="xxs">
          <Box variant="awsui-key-label" fontSize="body-s">Alerts raised</Box>
          <Box fontWeight="bold" color={agent.alertsRaised > 0 ? 'text-status-warning' : undefined}>
            {agent.alertsRaised}
          </Box>
        </SpaceBetween>
        <SpaceBetween size="xxs">
          <Box variant="awsui-key-label" fontSize="body-s">Avg. latency</Box>
          <Box fontWeight="bold">{agent.averageResponseMs}ms</Box>
        </SpaceBetween>
      </ColumnLayout>

      {/* Tools used */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {agent.toolsUsed.map((tool) => (
          <span
            key={tool}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 10,
              fontFamily: 'monospace',
              color: 'var(--color-text-body-secondary-cwla8r, #8d99a8)',
            }}
          >
            {tool}
          </span>
        ))}
      </div>

      {/* Updated */}
      <Box variant="small" color="text-body-secondary">
        Last action: {timeAgo(agent.lastActionTime)}
      </Box>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={onInvoke}>
          Invoke
        </Button>
        <Button onClick={onPause}>Pause</Button>
      </div>
    </div>
  )
}
