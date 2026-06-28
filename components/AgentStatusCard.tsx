'use client'

import { useState } from 'react'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Modal from '@cloudscape-design/components/modal'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Textarea from '@cloudscape-design/components/textarea'
import Alert from '@cloudscape-design/components/alert'
import type { Agent } from '@/lib/types'
import { AGENT_STATUS_INDICATOR, timeAgo } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
}

export default function AgentStatusCard({ agent }: AgentCardProps) {
  const [invokeOpen, setInvokeOpen] = useState(false)
  const [task, setTask] = useState('')
  const [invokeResult, setInvokeResult] = useState<string | null>(null)
  const [invoking, setInvoking] = useState(false)

  async function handleInvoke() {
    if (!task.trim()) return
    setInvoking(true)
    await new Promise((r) => setTimeout(r, 1200))
    setInvokeResult(
      `[${agent.name}] Task received: "${task}"\n\nAnalyzing current zone data...\nQuerying DynamoDB crowd metrics...\n\nResponse: Task acknowledged and queued. I will monitor the situation and raise an alert if conditions worsen. Current status: ${agent.lastAction}\n\nAgent model: ${agent.model}\nResponse time: ${Math.round(agent.averageResponseMs * (0.8 + Math.random() * 0.4))}ms`
    )
    setInvoking(false)
  }

  return (
    <>
      <div
        style={{
          border: '1px solid var(--color-border-divider-default-cx07f2, #414d5c)',
          borderRadius: 8,
          padding: 14,
          height: '100%',
        }}
      >
        <SpaceBetween size="xs">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusIndicator type={AGENT_STATUS_INDICATOR[agent.status]}>
              <Box variant="p" fontWeight="bold">{agent.name}</Box>
            </StatusIndicator>
            <Box variant="small" color="text-body-secondary">{agent.model.split('.')[0]}</Box>
          </div>

          <Box variant="small" color="text-body-secondary">{agent.role.split('—')[0].trim()}</Box>

          <div
            style={{
              background: 'var(--color-background-code-editor-status-bar-j52y5n, #0f1b2a)',
              borderRadius: 4,
              padding: '6px 8px',
              fontFamily: 'monospace',
              fontSize: 11,
              color: 'var(--color-text-body-secondary-cwla8r, #8d99a8)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {agent.lastAction}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box variant="small" color="text-body-secondary">
              {agent.invocationsToday.toLocaleString()} calls · {agent.alertsRaised} alerts · {agent.averageResponseMs}ms
            </Box>
            <Button variant="normal" onClick={() => setInvokeOpen(true)}>
              Invoke
            </Button>
          </div>
        </SpaceBetween>
      </div>

      <Modal
        visible={invokeOpen}
        onDismiss={() => { setInvokeOpen(false); setInvokeResult(null); setTask('') }}
        header={`Invoke ${agent.name}`}
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => { setInvokeOpen(false); setInvokeResult(null); setTask('') }}>
                Close
              </Button>
              <Button variant="primary" loading={invoking} onClick={handleInvoke} disabled={!task.trim()}>
                Send Task
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box variant="p" color="text-body-secondary">
            {agent.role}
          </Box>
          <Textarea
            value={task}
            onChange={({ detail }) => setTask(detail.value)}
            placeholder={`Enter a task for ${agent.name}...`}
            rows={3}
          />
          {invokeResult && (
            <div
              style={{
                background: 'var(--color-background-code-editor-status-bar-j52y5n, #0f1b2a)',
                borderRadius: 4,
                padding: 12,
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                color: 'var(--color-text-body-secondary-cwla8r, #8d99a8)',
              }}
            >
              {invokeResult}
            </div>
          )}
        </SpaceBetween>
      </Modal>
    </>
  )
}
