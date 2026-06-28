'use client'

import { useState, useEffect } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Container from '@cloudscape-design/components/container'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import SpaceBetween from '@cloudscape-design/components/space-between'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Badge from '@cloudscape-design/components/badge'
import { applyMode, Mode } from '@cloudscape-design/global-styles'
import { DEMO_USERS, ROLE_LABELS, type KumbhUser } from '@/lib/auth'

interface LoginPageProps {
  onLogin: (user: KumbhUser) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  // Default dark mode for the command center — must run client-side only
  useEffect(() => {
    applyMode(Mode.Dark)
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    applyMode(next ? Mode.Dark : Mode.Light)
  }

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password_hash: password }),
      })
      
      if (!response.ok) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }

      const { user } = await response.json()
      setLoading(false)
      onLogin(user as KumbhUser)
    } catch (err) {
      console.error('[v0] Login error:', err)
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError('')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        padding: '32px 16px',
        background: darkMode
          ? 'linear-gradient(135deg, #0f1b2a 0%, #192534 100%)'
          : 'linear-gradient(135deg, #f2f3f3 0%, #e8eaed 100%)',
      }}
    >
      {/* Header branding */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <Box variant="h1" color="text-status-error">
          KumbhSafe
        </Box>
        <Box variant="p" color="text-body-secondary">
          ICCC Integrated Command &amp; Control Centre
        </Box>
        <Box variant="small" color="text-body-secondary">
          Nashik Simhastha Kumbh Mela 2027
        </Box>
      </div>

      {/* Live status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#c7162b',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <Box variant="small" color="text-status-error">
          LIVE — 3 critical alerts active
        </Box>
      </div>

      {/* Login form */}
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button variant="icon" iconName={darkMode ? 'star-filled' : 'star'} onClick={toggleDark} ariaLabel="Toggle dark mode" />
              }
            >
              Operator Sign In
            </Header>
          }
        >
          <form onSubmit={(e) => { e.preventDefault(); handleLogin() }}>
            <Form
              actions={
                <Button variant="primary" loading={loading} onClick={handleLogin} iconName="lock-private">
                  Sign In
                </Button>
              }
              errorText={error || undefined}
            >
              <SpaceBetween size="m">
                <FormField label="Email address" constraintText="Use your official @kumbhsafe.gov.in account">
                  <Input
                    type="email"
                    value={email}
                    onChange={({ detail }) => setEmail(detail.value)}
                    placeholder="operator@kumbhsafe.gov.in"
                    autoFocus
                  />
                </FormField>
                <FormField label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={({ detail }) => setPassword(detail.value)}
                    placeholder="Enter your password"
                  />
                </FormField>
              </SpaceBetween>
            </Form>
          </form>
        </Container>
      </div>

      {/* Demo accounts quick-fill */}
      <div style={{ width: '100%', maxWidth: 640 }}>
        <Container
          header={
            <Header variant="h3" description="Click any account to pre-fill credentials">
              Demo Accounts — Multi-User Access
            </Header>
          }
        >
          <SpaceBetween size="s">
            {DEMO_USERS.map((u) => (
              <div
                key={u.userId}
                onClick={() => fillDemo(u.email, u.password)}
                style={{ cursor: 'pointer' }}
              >
                <ColumnLayout columns={3} variant="text-grid">
                  <SpaceBetween size="xxs">
                    <Box variant="awsui-key-label">Name</Box>
                    <Box>{u.name}</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xxs">
                    <Box variant="awsui-key-label">Role</Box>
                    <RoleBadge role={u.role} />
                  </SpaceBetween>
                  <SpaceBetween size="xxs">
                    <Box variant="awsui-key-label">Access</Box>
                    <Box variant="small" color="text-body-secondary">
                      {u.email}
                    </Box>
                  </SpaceBetween>
                </ColumnLayout>
              </div>
            ))}
          </SpaceBetween>
        </Container>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, 'red' | 'blue' | 'green' | 'grey'> = {
    super_admin: 'red',
    iccc_operator: 'blue',
    zone_commander: 'green',
    medical_officer: 'blue',
    field_officer: 'grey',
  }
  return <Badge color={colorMap[role] ?? 'grey'}>{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</Badge>
}
