'use client'

import Box from '@cloudscape-design/components/box'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import Link from '@cloudscape-design/components/link'
import StatusIndicator from '@cloudscape-design/components/status-indicator'

function Metric({
  label,
  value,
  status,
}: {
  label: string
  value: React.ReactNode
  status?: React.ReactNode
}) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <Box variant="h2" padding={{ bottom: 'xxxs' }}>
        {value}
      </Box>
      {status}
    </div>
  )
}

export function OverviewSection() {
  return (
    <Container
      header={
        <Header
          variant="h2"
          description="A snapshot of your fleet across all regions."
          info={<Link variant="info">Info</Link>}
        >
          Service overview
        </Header>
      }
    >
      <ColumnLayout columns={4} variant="text-grid">
        <Metric
          label="Running instances"
          value="128"
          status={<StatusIndicator type="success">Healthy</StatusIndicator>}
        />
        <Metric
          label="Pending"
          value="6"
          status={
            <StatusIndicator type="in-progress">Launching</StatusIndicator>
          }
        />
        <Metric
          label="Alarms"
          value="2"
          status={
            <StatusIndicator type="warning">Needs review</StatusIndicator>
          }
        />
        <Metric
          label="Monthly spend"
          value="$4,210"
          status={<StatusIndicator type="info">On budget</StatusIndicator>}
        />
      </ColumnLayout>
    </Container>
  )
}
