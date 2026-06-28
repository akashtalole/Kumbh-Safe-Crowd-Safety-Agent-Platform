'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Flashbar from '@cloudscape-design/components/flashbar'
import Header from '@cloudscape-design/components/header'
import Select, { SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Toggle from '@cloudscape-design/components/toggle'
import PieChart from '@cloudscape-design/components/pie-chart'
import Link from '@cloudscape-design/components/link'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import { ZONES as INITIAL_ZONES } from '@/lib/mock-data'
import { STATUS_COLORS, timeAgo, getDensityStatus } from '@/lib/utils'
import type { LegacyZone as Zone } from '@/lib/types'

type ZoneStatus = 'green' | 'yellow' | 'red' | 'black' | 'closed'

const CITY_OPTIONS: SelectProps.Option[] = [
  { label: 'All cities', value: 'all' },
  { label: 'Nashik', value: 'nashik' },
  { label: 'Trimbakeshwar', value: 'trimbakeshwar' },
]

const STATUS_OPTIONS: SelectProps.Option[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Green', value: 'green' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Red', value: 'red' },
  { label: 'Black', value: 'black' },
]

export default function ZonesPage() {
  const router = useRouter()
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES)
  const [cityFilter, setCityFilter] = useState<SelectProps.Option>(CITY_OPTIONS[0])
  const [statusFilter, setStatusFilter] = useState<SelectProps.Option>(STATUS_OPTIONS[0])
  const [heldOnly, setHeldOnly] = useState(false)
  const [selectedZones, setSelectedZones] = useState<Zone[]>([])
  const [flash, setFlash] = useState<{ type: 'success' | 'warning'; message: string } | null>(null)

  const filtered = zones.filter((z) => {
    if (cityFilter.value !== 'all' && z.city !== cityFilter.value) return false
    if (statusFilter.value !== 'all' && z.status !== statusFilter.value) return false
    if (heldOnly && !z.isHeld) return false
    return true
  })

  function toggleHold(zone: Zone) {
    setZones((prev) =>
      prev.map((z) => (z.zoneId === zone.zoneId ? { ...z, isHeld: !z.isHeld } : z))
    )
    setFlash({
      type: zone.isHeld ? 'success' : 'warning',
      message: zone.isHeld
        ? `Entry hold released for ${zone.name}`
        : `Entry hold activated for ${zone.name}`,
    })
  }

  function holdAll() {
    setZones((prev) =>
      prev.map((z) => (z.status === 'red' || z.status === 'black' ? { ...z, isHeld: true } : z))
    )
    setFlash({ type: 'warning', message: 'Entry hold activated for all RED and BLACK zones.' })
  }

  function bulkHold(hold: boolean) {
    if (selectedZones.length === 0) return
    const ids = new Set(selectedZones.map((z) => z.zoneId))
    setZones((prev) => prev.map((z) => (ids.has(z.zoneId) ? { ...z, isHeld: hold } : z)))
    setFlash({ type: hold ? 'warning' : 'success', message: `${hold ? 'Hold' : 'Release'} applied to ${selectedZones.length} zones.` })
    setSelectedZones([])
  }

  // Pie chart data
  const statusDist = ['green', 'yellow', 'red', 'black'].map((s) => ({
    title: s.toUpperCase(),
    value: zones.filter((z) => z.status === s).length,
    color: STATUS_COLORS[s as ZoneStatus],
  })).filter((d) => d.value > 0)

  const cityDist = [
    { title: 'Nashik', value: zones.filter((z) => z.city === 'nashik').length, color: '#0972d3' },
    { title: 'Trimbakeshwar', value: zones.filter((z) => z.city === 'trimbakeshwar').length, color: '#8d6605' },
  ]

  return (
    <AuthGuard requiredSection="zones">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup
            ariaLabel="Breadcrumbs"
            items={[
              { text: 'KumbhSafe', href: '/dashboard' },
              { text: 'Zone Management', href: '/zones' },
            ]}
          />
        }
        notifications={
          flash ? (
            <Flashbar
              items={[{
                type: flash.type,
                dismissible: true,
                statusIconAriaLabel: flash.type,
                onDismiss: () => setFlash(null),
                content: flash.message,
                id: 'zone-flash',
              }]}
            />
          ) : <Flashbar items={[]} />
        }
      >
        <ContentLayout
          header={
            <Header
              variant="h1"
              counter={`(${zones.length})`}
              description="Manage entry holds, monitor density, and declare emergencies."
              actions={
                <Button variant="primary" onClick={holdAll}>
                  Hold all RED zones
                </Button>
              }
            >
              Zone Management
            </Header>
          }
        >
          <SpaceBetween size="l">
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Select
                selectedOption={cityFilter}
                options={CITY_OPTIONS}
                onChange={({ detail }) => setCityFilter(detail.selectedOption)}
                ariaLabel="Filter by city"
              />
              <Select
                selectedOption={statusFilter}
                options={STATUS_OPTIONS}
                onChange={({ detail }) => setStatusFilter(detail.selectedOption)}
                ariaLabel="Filter by status"
              />
              <Toggle checked={heldOnly} onChange={({ detail }) => setHeldOnly(detail.checked)}>
                Held zones only
              </Toggle>
            </div>

            {/* Bulk action bar */}
            {selectedZones.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Box variant="small" color="text-body-secondary">{selectedZones.length} selected:</Box>
                <Button onClick={() => bulkHold(true)}>Hold selected</Button>
                <Button onClick={() => bulkHold(false)}>Release selected</Button>
                <Button variant="primary">Declare emergency</Button>
                <Button variant="link" onClick={() => setSelectedZones([])}>Clear selection</Button>
              </div>
            )}

            {/* Table */}
            <Table<Zone>
              variant="container"
              selectionType="multi"
              selectedItems={selectedZones}
              onSelectionChange={({ detail }) => setSelectedZones(detail.selectedItems)}
              items={filtered}
              trackBy="zoneId"
              header={
                <Header variant="h2" counter={`(${filtered.length})`}>
                  Zones
                </Header>
              }
              columnDefinitions={[
                {
                  id: 'name',
                  header: 'Zone Name',
                  cell: (z) => (
                    <Link href={`/zones/${z.zoneId}`} onFollow={(e) => { e.preventDefault(); router.push(`/zones/${z.zoneId}`) }}>
                      {z.name}
                    </Link>
                  ),
                  sortingField: 'name',
                  isRowHeader: true,
                },
                {
                  id: 'city',
                  header: 'City',
                  cell: (z) => (
                    <Badge color={z.city === 'nashik' ? 'blue' : 'grey'}>
                      {z.city === 'nashik' ? 'Nashik' : 'Trimbakeshwar'}
                    </Badge>
                  ),
                  sortingField: 'city',
                },
                {
                  id: 'density',
                  header: 'Density (p/m²)',
                  cell: (z) => (
                    <span style={{ color: STATUS_COLORS[getDensityStatus(z.currentDensity)], fontWeight: 700 }}>
                      {z.currentDensity.toFixed(1)}
                    </span>
                  ),
                  sortingField: 'currentDensity',
                },
                {
                  id: 'count',
                  header: 'Count / Capacity',
                  cell: (z) => `${z.currentCount.toLocaleString('en-IN')} / ${z.capacity.toLocaleString('en-IN')}`,
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (z) => (
                    <span
                      style={{
                        background: `${STATUS_COLORS[z.status]}22`,
                        border: `1px solid ${STATUS_COLORS[z.status]}`,
                        color: STATUS_COLORS[z.status],
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {z.status.toUpperCase()}
                    </span>
                  ),
                  sortingField: 'status',
                },
                {
                  id: 'hold',
                  header: 'Entry Hold',
                  cell: (z) => (
                    <Toggle checked={z.isHeld} onChange={() => toggleHold(z)}>
                      {z.isHeld ? 'HELD' : 'Open'}
                    </Toggle>
                  ),
                },
                {
                  id: 'updated',
                  header: 'Last Updated',
                  cell: (z) => timeAgo(z.lastUpdated),
                  sortingField: 'lastUpdated',
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  cell: (z) => (
                    <ButtonDropdown
                      items={[
                        { id: 'view', text: 'View detail' },
                        { id: 'yellow', text: 'Set to yellow' },
                        { id: 'hold', text: 'Hold entry' },
                        { id: 'close', text: 'Close zone' },
                      ]}
                      variant="icon"
                      ariaLabel="Zone actions"
                      onItemClick={({ detail }) => {
                        if (detail.id === 'view') router.push(`/zones/${z.zoneId}`)
                        if (detail.id === 'hold') toggleHold(z)
                      }}
                    />
                  ),
                },
              ]}
              empty={<Box textAlign="center" color="inherit">No zones match the current filters.</Box>}
            />

            {/* Charts */}
            <ColumnLayout columns={2}>
              <Container header={<Header variant="h3">Zone status distribution</Header>}>
                <PieChart
                  data={statusDist}
                  detailPopoverContent={(datum) => [{ key: 'Zones', value: datum.value }]}
                  segmentDescription={(datum) => `${datum.value} zones`}
                  ariaLabel="Zone status pie chart"
                  hideFilter
                  hideLegend={false}
                  size="medium"
                />
              </Container>
              <Container header={<Header variant="h3">City distribution by zone count</Header>}>
                <PieChart
                  data={cityDist}
                  detailPopoverContent={(datum) => [{ key: 'Zones', value: datum.value }]}
                  segmentDescription={(datum) => `${datum.value} zones`}
                  ariaLabel="City distribution pie chart"
                  hideFilter
                  size="medium"
                />
              </Container>
            </ColumnLayout>
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>
    </AuthGuard>
  )
}
