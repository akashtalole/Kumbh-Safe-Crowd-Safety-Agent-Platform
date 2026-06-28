'use client'

import { useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Button from '@cloudscape-design/components/button'
import Cards from '@cloudscape-design/components/cards'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Drawer from '@cloudscape-design/components/drawer'
import FormField from '@cloudscape-design/components/form-field'
import Form from '@cloudscape-design/components/form'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Modal from '@cloudscape-design/components/modal'
import Select, { SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Tabs from '@cloudscape-design/components/tabs'
import Textarea from '@cloudscape-design/components/textarea'
import KumbhShell from '@/components/kumbh-shell'
import AuthGuard from '@/components/auth-guard'
import { LOST_FOUND_CASES as INITIAL_CASES, AMBULANCES, PILGRIMS, ZONES } from '@/lib/mock-data'
import { timeAgo, formatDateTime, formatNumber } from '@/lib/utils'
import type { LegacyLostFoundCase as LostFoundCase, LegacyPilgrim as Pilgrim } from '@/lib/types'

const ZONE_OPTS: SelectProps.Option[] = ZONES.map((z) => ({ label: z.name, value: z.zoneId }))
const TYPE_OPTS: SelectProps.Option[] = [{ label: 'Lost person', value: 'lost' }, { label: 'Found person', value: 'found' }]

export default function PilgrimsPage() {
  const [cases, setCases] = useState<LostFoundCase[]>(INITIAL_CASES)
  const [selectedCase, setSelectedCase] = useState<LostFoundCase | null>(null)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPilgrim, setSelectedPilgrim] = useState<Pilgrim | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  // New case form
  const [ncType, setNcType] = useState<SelectProps.Option>(TYPE_OPTS[0])
  const [ncName, setNcName] = useState('')
  const [ncAge, setNcAge] = useState('')
  const [ncZone, setNcZone] = useState<SelectProps.Option>(ZONE_OPTS[0])
  const [ncDesc, setNcDesc] = useState('')
  const [ncPhone, setNcPhone] = useState('')
  const [ncError, setNcError] = useState('')

  const openCases = cases.filter((c) => c.status === 'open').length

  const searchedPilgrims = searchQuery.length >= 2
    ? PILGRIMS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone.includes(searchQuery) ||
          p.pilgrimId.includes(searchQuery)
      )
    : []

  function createCase() {
    if (!ncName.trim()) { setNcError('Name is required'); return }
    const zone = ZONES.find((z) => z.zoneId === ncZone.value)!
    const newCase: LostFoundCase = {
      caseId: `lf-${Date.now()}`,
      type: ncType.value as 'lost' | 'found',
      name: ncName,
      age: parseInt(ncAge) || 0,
      description: ncDesc,
      lastSeenZone: zone.name,
      lastSeenTime: new Date().toISOString(),
      reporterPhone: ncPhone,
      status: 'open',
      reportedAt: new Date().toISOString(),
      city: zone.city,
    }
    setCases((prev) => [newCase, ...prev])
    setNewCaseOpen(false)
    setNcName(''); setNcAge(''); setNcDesc(''); setNcPhone(''); setNcError('')
  }

  function markReunited(caseId: string) {
    setCases((prev) => prev.map((c) => c.caseId === caseId ? { ...c, status: 'reunited' } : c))
    setSelectedCase(null)
    setActionMsg('Case marked as reunited.')
  }

  return (
    <AuthGuard requiredSection="pilgrims">
      <KumbhShell
        breadcrumbs={
          <BreadcrumbGroup ariaLabel="Breadcrumbs" items={[
            { text: 'KumbhSafe', href: '/dashboard' },
            { text: 'Pilgrim Services', href: '/pilgrims' },
          ]} />
        }
        toolsOpen={drawerOpen}
        onToolsChange={(open) => setDrawerOpen(open)}
        tools={
          selectedPilgrim ? (
            <Drawer header={<Header variant="h3">{selectedPilgrim.name}</Header>}>
              <SpaceBetween size="m">
                <KeyValuePairs
                  columns={1}
                  items={[
                    { label: 'Pilgrim ID', value: selectedPilgrim.pilgrimId },
                    { label: 'Age', value: `${selectedPilgrim.age}` },
                    { label: 'Language', value: selectedPilgrim.language },
                    { label: 'Phone', value: selectedPilgrim.phone },
                    { label: 'Emergency contact', value: selectedPilgrim.emergencyContact },
                    { label: 'Current zone', value: ZONES.find((z) => z.zoneId === selectedPilgrim.currentZoneId)?.name ?? 'Unknown' },
                    { label: 'Registered', value: timeAgo(selectedPilgrim.registeredAt) },
                    { label: 'Health flag', value: <StatusIndicator type={selectedPilgrim.hasHealthFlag ? 'warning' : 'success'}>{selectedPilgrim.hasHealthFlag ? selectedPilgrim.healthNote ?? 'Flag raised' : 'No flag'}</StatusIndicator> },
                  ]}
                />
              </SpaceBetween>
            </Drawer>
          ) : undefined
        }
      >
        <ContentLayout
          header={
            <Header variant="h1" counter="2,847,420 registered" description="Lost &amp; found, SOS cases, and pilgrim lookup.">
              Pilgrim Services
            </Header>
          }
        >
          <SpaceBetween size="l">
            {actionMsg && (
              <Alert type="success" dismissible onDismiss={() => setActionMsg(null)}>{actionMsg}</Alert>
            )}

            <Tabs
              tabs={[
                {
                  label: `Lost & found (${openCases} open)`,
                  id: 'lostfound',
                  content: (
                    <div style={{ display: 'grid', gridTemplateColumns: selectedCase ? '6fr 4fr' : '1fr', gap: 20 }}>
                      <Table<LostFoundCase>
                        variant="container"
                        selectionType="single"
                        selectedItems={selectedCase ? [selectedCase] : []}
                        onSelectionChange={({ detail }) => setSelectedCase(detail.selectedItems[0] ?? null)}
                        items={cases}
                        trackBy="caseId"
                        header={
                          <Header
                            variant="h2"
                            counter={`(${cases.length})`}
                            actions={<Button iconName="add-plus" onClick={() => setNewCaseOpen(true)}>New case</Button>}
                          >
                            Lost &amp; Found Cases
                          </Header>
                        }
                        columnDefinitions={[
                          { id: 'caseId', header: 'Case ID', cell: (c) => <Box variant="small" color="text-body-secondary">{c.caseId}</Box> },
                          { id: 'type', header: 'Type', cell: (c) => <Badge color={c.type === 'lost' ? 'red' : 'green'}>{c.type.toUpperCase()}</Badge>, isRowHeader: true },
                          { id: 'name', header: 'Name', cell: (c) => c.name },
                          { id: 'age', header: 'Age', cell: (c) => `${c.age}` },
                          { id: 'zone', header: 'Zone last seen', cell: (c) => c.lastSeenZone },
                          { id: 'reported', header: 'Reported', cell: (c) => timeAgo(c.reportedAt) },
                          { id: 'status', header: 'Status', cell: (c) => <StatusIndicator type={c.status === 'reunited' ? 'success' : c.status === 'matched' ? 'warning' : 'error'}>{c.status}</StatusIndicator> },
                          { id: 'city', header: 'City', cell: (c) => <Badge color={c.city === 'nashik' ? 'blue' : 'grey'}>{c.city === 'nashik' ? 'Nashik' : 'Trimbakeshwar'}</Badge> },
                        ]}
                        empty={<Box textAlign="center" color="inherit">No cases reported.</Box>}
                      />

                      {selectedCase && (
                        <Container
                          header={
                            <Header variant="h2" actions={
                              <Button variant="icon" iconName="close" onClick={() => setSelectedCase(null)} ariaLabel="Close panel" />
                            }>
                              Case detail
                            </Header>
                          }
                        >
                          <SpaceBetween size="m">
                            {/* Photo placeholder */}
                            <div style={{ width: '100%', height: 140, background: 'rgba(255,255,255,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                              </svg>
                              <Box variant="small" color="text-body-secondary">No photo on file</Box>
                            </div>
                            <KeyValuePairs
                              columns={1}
                              items={[
                                { label: 'Name', value: selectedCase.name },
                                { label: 'Age', value: `${selectedCase.age}` },
                                { label: 'Type', value: <Badge color={selectedCase.type === 'lost' ? 'red' : 'green'}>{selectedCase.type.toUpperCase()}</Badge> },
                                { label: 'Last seen', value: selectedCase.lastSeenZone },
                                { label: 'Description', value: selectedCase.description },
                                { label: 'Reporter phone', value: selectedCase.reporterPhone },
                                { label: 'Reported', value: timeAgo(selectedCase.reportedAt) },
                              ]}
                            />
                            <SpaceBetween direction="horizontal" size="xs">
                              <Button onClick={() => setActionMsg('Match request sent to LostConnect agent.')}>Match with found</Button>
                              <Button onClick={() => setActionMsg(`SMS sent to ${selectedCase.reporterPhone}.`)}>Send SMS</Button>
                              {selectedCase.status !== 'reunited' && (
                                <Button variant="primary" onClick={() => markReunited(selectedCase.caseId)}>Mark reunited</Button>
                              )}
                            </SpaceBetween>
                          </SpaceBetween>
                        </Container>
                      )}
                    </div>
                  ),
                },
                {
                  label: 'SOS / Medical cases',
                  id: 'sos',
                  content: (
                    <SpaceBetween size="l">
                      <Cards
                        items={AMBULANCES.filter((a) => a.status === 'dispatched')}
                        trackBy="vehicleId"
                        header={<Header variant="h2" counter="(3 active)">Active ambulance dispatches</Header>}
                        cardDefinition={{
                          header: (a) => (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box variant="p" fontWeight="bold">{a.callSign}</Box>
                              <Badge color="red">DISPATCHED</Badge>
                            </div>
                          ),
                          sections: [
                            { id: 'crew', header: 'Crew', content: (a) => a.crew },
                            { id: 'assignment', header: 'Assignment', content: (a) => `Active incident — Kushavart approach` },
                            { id: 'eta', header: 'ETA', content: () => '~9 min' },
                            { id: 'city', header: 'City', content: (a) => <Badge color="grey">{a.city === 'nashik' ? 'Nashik' : 'Trimbakeshwar'}</Badge> },
                          ],
                        }}
                        empty={<Box textAlign="center" color="inherit">No active dispatches.</Box>}
                      />
                    </SpaceBetween>
                  ),
                },
                {
                  label: 'Pilgrim lookup',
                  id: 'lookup',
                  content: (
                    <Container header={<Header variant="h2">Search pilgrims</Header>}>
                      <SpaceBetween size="l">
                        <FormField label="Search" description="Enter name, phone number, or pilgrim ID">
                          <Input
                            value={searchQuery}
                            onChange={({ detail }) => setSearchQuery(detail.value)}
                            placeholder="e.g. Mohan Sharma, 9876543210, or p-001"
                            type="search"
                          />
                        </FormField>
                        {searchQuery.length >= 2 && (
                          <Table<Pilgrim>
                            variant="embedded"
                            selectionType="single"
                            selectedItems={selectedPilgrim ? [selectedPilgrim] : []}
                            onSelectionChange={({ detail }) => {
                              setSelectedPilgrim(detail.selectedItems[0] ?? null)
                              setDrawerOpen(!!detail.selectedItems[0])
                            }}
                            items={searchedPilgrims}
                            trackBy="pilgrimId"
                            columnDefinitions={[
                              { id: 'name', header: 'Name', cell: (p) => p.name, isRowHeader: true },
                              { id: 'zone', header: 'Current zone', cell: (p) => ZONES.find((z) => z.zoneId === p.currentZoneId)?.name ?? '—' },
                              { id: 'reg', header: 'Registered', cell: (p) => timeAgo(p.registeredAt) },
                              { id: 'lang', header: 'Language', cell: (p) => p.language },
                              { id: 'health', header: 'Health', cell: (p) => <StatusIndicator type={p.hasHealthFlag ? 'warning' : 'success'}>{p.hasHealthFlag ? 'Flag' : 'OK'}</StatusIndicator> },
                            ]}
                            empty={<Box textAlign="center" color="inherit">No pilgrims found for "{searchQuery}".</Box>}
                          />
                        )}
                        {searchQuery.length < 2 && (
                          <Box color="text-body-secondary" textAlign="center">Type at least 2 characters to search</Box>
                        )}
                      </SpaceBetween>
                    </Container>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </ContentLayout>
      </KumbhShell>

      {/* New case modal */}
      <Modal
        visible={newCaseOpen}
        onDismiss={() => setNewCaseOpen(false)}
        header="Report new lost/found case"
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setNewCaseOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={createCase}>Submit case</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); createCase() }}>
          <Form errorText={ncError || undefined}>
            <SpaceBetween size="m">
              <ColumnLayout columns={2}>
                <FormField label="Type">
                  <Select selectedOption={ncType} options={TYPE_OPTS} onChange={({ detail }) => setNcType(detail.selectedOption)} />
                </FormField>
                <FormField label="Age">
                  <Input value={ncAge} onChange={({ detail }) => setNcAge(detail.value)} type="number" placeholder="Age in years" />
                </FormField>
              </ColumnLayout>
              <FormField label="Name" errorText={!ncName && ncError ? 'Required' : undefined}>
                <Input value={ncName} onChange={({ detail }) => setNcName(detail.value)} placeholder="Full name" />
              </FormField>
              <FormField label="Zone last seen">
                <Select selectedOption={ncZone} options={ZONE_OPTS} onChange={({ detail }) => setNcZone(detail.selectedOption)} />
              </FormField>
              <FormField label="Description">
                <Textarea value={ncDesc} onChange={({ detail }) => setNcDesc(detail.value)} rows={3} placeholder="Physical description, clothing, etc." />
              </FormField>
              <FormField label="Reporter phone">
                <Input value={ncPhone} onChange={({ detail }) => setNcPhone(detail.value)} placeholder="10-digit mobile number" />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Modal>
    </AuthGuard>
  )
}
