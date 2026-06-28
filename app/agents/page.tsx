'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { AGENT_STATUS_INDICATOR, timeAgo } from '@/lib/utils'
import type { Agent, AgentInvocationLog } from '@/lib/types'

const STATUS_ICON_COLOR: Record<string, string> = {
  active: '#037f51',
  alert: '#d6880b',
  idle: '#5f6b7a',
  error: '#c7162b',
}

interface AgentWithBedrock extends Agent {
  bedrockAgentId?: string
  bedrockAgentAliasId?: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentWithBedrock[]>([])
  const [logs, setLogs] = useState<AgentInvocationLog[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedAgent, setSelectedAgent] = useState<AgentWithBedrock | null>(null)
  const [invokeTask, setInvokeTask] = useState('')
  const [invokeResult, setInvokeResult] = useState<string | null>(null)
  const [invoking, setInvoking] = useState(false)
  const [invokeMs, setInvokeMs] = useState<number | null>(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'warning' | 'error'; msg: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAgents(data.agents || [])
      setLogs(data.logs || [])
    } catch {
      setFlash({ type: 'error', msg: 'Failed to load agent status from server.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgents()
    // Refresh every 30 seconds (matches CrowdSentinel interval)
    const interval = setInterval(loadAgents, 30_000)
    return () => clearInterval(interval)
  }, [loadAgents])

  const activeCount = agents.filter((a) => a.status === 'active' || a.status === 'alert').length
  const totalInvocations = logs.length
  const totalAlerts = logs.filter((l) => l.result === 'alert').length
  const avgMs = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / logs.length)
    : 0

  async function handleInvoke() {
    if (!selectedAgent || !invokeTask.trim()) return
    setInvoking(true)
    setInvokeResult('')
    setInvokeMs(null)
    setIsSimulated(false)

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/agents/${selectedAgent.agentId}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: invokeTask }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.chunk) {
              setInvokeResult((prev) => (prev ?? '') + payload.chunk)
            }
            if (payload.done) {
              setInvokeMs(payload.durationMs ?? null)
              setIsSimulated(payload._simulated === true)
              // Refresh logs after a successful invocation
              setTimeout(loadAgents, 500)
            }
            if (payload.error) {
              setInvokeResult((prev) => (prev ?? '') + `\n\n[ERROR] ${payload.error}`)
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setInvokeResult((prev) => (prev ?? '') + `\n[Connection error: ${err.message}]`)
      }
    } finally {
      setInvoking(false)
    }
  }

  function handlePause(agent: AgentWithBedrock) {
    setFlash({ type: 'warning', msg: `${agent.name} paused. Manual override active. Re-enable from Admin → Agent Config.` })
  }

  function handleCancelInvoke() {
    abortRef.current?.abort()
    setInvoking(false)
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
              actions={
                <Button
                  iconName="refresh"
                  onClick={loadAgents}
                  loading={loading}
                >
                  Refresh
                </Button>
              }
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
                <div style={{ fontSize: 28, fontWeight: 700, color: '#037f51' }}>
                  {loading ? '…' : `${activeCount} / ${agents.length}`}
                </div>
                <Box variant="small" color="text-body-secondary">Autonomous operation</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Invocations logged</Box>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {loading ? '…' : totalInvocations.toLocaleString()}
                </div>
                <Box variant="small" color="text-body-secondary">Last 50 recorded</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Alerts raised</Box>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#d6880b' }}>
                  {loading ? '…' : totalAlerts}
                </div>
                <Box variant="small" color="text-body-secondary">Automated detections</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Avg. response time</Box>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {loading ? '…' : avgMs ? `${avgMs}ms` : '—'}
                </div>
                <Box variant="small" color="text-body-secondary">Across logged invocations</Box>
              </SpaceBetween>
            </ColumnLayout>

            <Tabs
              tabs={[
                {
                  label: 'Agent cards',
                  id: 'cards',
                  content: loading ? (
                    <Box textAlign="center" padding="xl">
                      <StatusIndicator type="loading">Loading agent status…</StatusIndicator>
                    </Box>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                        gap: 16,
                        paddingTop: 16,
                      }}
                    >
                      {agents.map((agent) => (
                        <AgentDetailCard
                          key={agent.agentId}
                          agent={agent}
                          onInvoke={() => {
                            setSelectedAgent(agent)
                            setInvokeResult(null)
                            setInvokeTask('')
                            setInvokeMs(null)
                            setIsSimulated(false)
                          }}
                          onPause={() => handlePause(agent)}
                        />
                      ))}
                    </div>
                  ),
                },
                {
                  label: `Invocation log (${logs.length})`,
                  id: 'logs',
                  content: (
                    <Table<AgentInvocationLog>
                      variant="container"
                      items={logs}
                      trackBy="logId"
                      loading={loading}
                      loadingText="Loading invocation logs…"
                      header={<Header variant="h2" counter={`(${logs.length})`}>Recent invocations</Header>}
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
                      empty={<Box textAlign="center" color="inherit">No invocations logged yet. Invoke an agent to see entries here.</Box>}
                    />
                  ),
                },
                {
                  label: 'Architecture',
                  id: 'arch',
                  content: (
                    <Container header={<Header variant="h2">Agent architecture — Bedrock AgentCore + Strands</Header>}>
                      <SpaceBetween size="l">
                        <Box variant="p">
                          KumbhSafe uses Amazon Bedrock AgentCore with the Strands Agents SDK (Python).
                          A master orchestrator agent (CommandBridge) manages five specialist sub-agents.
                          All agents persist state and alerts to Amazon DynamoDB and communicate via Amazon SNS.
                          The Next.js frontend invokes agents via <code>BedrockAgentRuntimeClient.invokeAgent()</code> and
                          streams responses back using Server-Sent Events.
                        </Box>
                        <ColumnLayout columns={2}>
                          <SpaceBetween size="s">
                            <Box variant="h3">Invocation flow</Box>
                            {[
                              '1. EventBridge 30s schedule → Lambda → AgentCore (CrowdSentinel)',
                              '2. EventBridge 5min schedule → Lambda → AgentCore (FloodWatch)',
                              '3. ZONE_RED/BLACK event → CommandBridge → specialist agents',
                              '4. ICCC Operator → Next.js → /api/agents/{id}/invoke → Bedrock AgentCore',
                              '5. Agent uses Strands tools → DynamoDB reads/writes → SNS publish',
                              '6. SSE chunks stream back to ICCC dashboard in real time',
                            ].map((step, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <Box variant="small">{step}</Box>
                              </div>
                            ))}
                          </SpaceBetween>
                          <SpaceBetween size="s">
                            <Box variant="h3">AWS services</Box>
                            {[
                              ['Amazon Bedrock AgentCore', 'Managed runtime for Strands agents'],
                              ['Amazon Nova Pro v1', 'LLM backbone — all 6 agents'],
                              ['Strands Agents SDK (Python)', 'Tool-use framework with @tool decorators'],
                              ['Amazon DynamoDB', 'Zone state, alerts, pilgrim registry'],
                              ['Amazon SNS', 'Bulk SMS · NDRF webhook · medical alerts'],
                              ['Amazon Rekognition', 'Lost person facial recognition'],
                              ['Aurora DSQL', 'agent_config · zone_config · audit_logs'],
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
          handleCancelInvoke()
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
                  handleCancelInvoke()
                  setSelectedAgent(null)
                  setInvokeResult(null)
                  setInvokeTask('')
                }}
              >
                Close
              </Button>
              {invoking ? (
                <Button onClick={handleCancelInvoke}>Cancel</Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleInvoke}
                  disabled={!invokeTask.trim()}
                >
                  Send task
                </Button>
              )}
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
                {
                  label: 'Bedrock Agent ID',
                  value: selectedAgent.bedrockAgentId
                    ? <code style={{ fontSize: 11 }}>{selectedAgent.bedrockAgentId}</code>
                    : <Box color="text-body-secondary" variant="small">Demo mode (no agent ID set)</Box>,
                },
                {
                  label: 'Status',
                  value: <StatusIndicator type={AGENT_STATUS_INDICATOR[selectedAgent.status]}>{selectedAgent.status}</StatusIndicator>,
                },
              ]}
            />
            <Box variant="p" color="text-body-secondary">{selectedAgent.role}</Box>
            <Textarea
              value={invokeTask}
              onChange={({ detail }) => setInvokeTask(detail.value)}
              placeholder={`Describe the task for ${selectedAgent.name}…`}
              rows={3}
              disabled={invoking}
            />
            {(invokeResult !== null) && (
              <ExpandableSection
                headerText={
                  invoking
                    ? 'Agent responding…'
                    : `Agent response${invokeMs ? ` · ${invokeMs}ms` : ''}${isSimulated ? ' · demo mode' : ''}`
                }
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
                    maxHeight: 360,
                    overflowY: 'auto',
                  }}
                >
                  {invokeResult || (invoking ? '▌' : '')}
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
  agent: AgentWithBedrock
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
            {agent.model}
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

      {/* Bedrock Agent ID chip */}
      {agent.bedrockAgentId ? (
        <Box variant="small" color="text-body-secondary">
          AgentCore: <code style={{ fontSize: 10 }}>{agent.bedrockAgentId}</code>
        </Box>
      ) : (
        <Box variant="small" color="text-status-inactive">No Bedrock Agent ID — demo mode</Box>
      )}

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
        Last updated: {timeAgo(agent.lastActionTime)}
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
