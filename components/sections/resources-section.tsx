'use client'

import { useState } from 'react'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Link from '@cloudscape-design/components/link'
import Pagination from '@cloudscape-design/components/pagination'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator, {
  StatusIndicatorProps,
} from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import TextFilter from '@cloudscape-design/components/text-filter'

interface Instance {
  id: string
  name: string
  type: string
  state: StatusIndicatorProps.Type
  stateText: string
  zone: string
}

const INSTANCES: Instance[] = [
  {
    id: 'i-0a1b2c3d',
    name: 'web-prod-1',
    type: 'm6i.large',
    state: 'success',
    stateText: 'Running',
    zone: 'us-east-1a',
  },
  {
    id: 'i-0e4f5g6h',
    name: 'web-prod-2',
    type: 'm6i.large',
    state: 'success',
    stateText: 'Running',
    zone: 'us-east-1b',
  },
  {
    id: 'i-0i7j8k9l',
    name: 'api-staging',
    type: 'c6g.xlarge',
    state: 'in-progress',
    stateText: 'Launching',
    zone: 'us-east-1a',
  },
  {
    id: 'i-0m1n2o3p',
    name: 'batch-worker',
    type: 'r6i.2xlarge',
    state: 'stopped',
    stateText: 'Stopped',
    zone: 'us-east-1c',
  },
  {
    id: 'i-0q4r5s6t',
    name: 'analytics-db',
    type: 'r6i.4xlarge',
    state: 'warning',
    stateText: 'Degraded',
    zone: 'us-east-1b',
  },
]

export function ResourcesSection() {
  const [filteringText, setFilteringText] = useState('')
  const [selectedItems, setSelectedItems] = useState<Instance[]>([])

  const filtered = INSTANCES.filter((i) =>
    `${i.name} ${i.id} ${i.type} ${i.zone}`
      .toLowerCase()
      .includes(filteringText.toLowerCase()),
  )

  return (
    <Table<Instance>
      variant="container"
      selectionType="multi"
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
      items={filtered}
      trackBy="id"
      header={
        <Header
          variant="h2"
          counter={
            selectedItems.length
              ? `(${selectedItems.length}/${INSTANCES.length})`
              : `(${INSTANCES.length})`
          }
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={!selectedItems.length}>Stop</Button>
              <Button disabled={!selectedItems.length}>Reboot</Button>
              <Button variant="primary" iconName="add-plus">
                Launch instance
              </Button>
            </SpaceBetween>
          }
        >
          Instances
        </Header>
      }
      filter={
        <TextFilter
          filteringText={filteringText}
          filteringPlaceholder="Find instances"
          filteringAriaLabel="Filter instances"
          countText={`${filtered.length} matches`}
          onChange={({ detail }) => setFilteringText(detail.filteringText)}
        />
      }
      pagination={<Pagination currentPageIndex={1} pagesCount={1} />}
      columnDefinitions={[
        {
          id: 'name',
          header: 'Name',
          cell: (item) => <Link href="#">{item.name}</Link>,
          sortingField: 'name',
          isRowHeader: true,
        },
        { id: 'id', header: 'Instance ID', cell: (item) => item.id },
        {
          id: 'type',
          header: 'Type',
          cell: (item) => <Badge>{item.type}</Badge>,
        },
        {
          id: 'state',
          header: 'State',
          cell: (item) => (
            <StatusIndicator type={item.state}>
              {item.stateText}
            </StatusIndicator>
          ),
        },
        { id: 'zone', header: 'Availability zone', cell: (item) => item.zone },
      ]}
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="s">
            <b>No instances</b>
            <Button>Launch instance</Button>
          </SpaceBetween>
        </Box>
      }
    />
  )
}
