'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@cloudscape-design/components/spinner'
import Box from '@cloudscape-design/components/box'
import { useAuth } from '@/components/auth-provider'
import { hasPermission } from '@/lib/auth'

interface AuthGuardProps {
  children: ReactNode
  requiredSection?: string
}

export default function AuthGuard({ children, requiredSection }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size="large" />
      </div>
    )
  }

  if (!user) return null

  if (requiredSection && !hasPermission(user, requiredSection)) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Box variant="h2" color="text-status-error">Access Denied</Box>
        <Box variant="p" color="text-body-secondary">
          Your role ({user.role.replace('_', ' ')}) does not have access to this section.
        </Box>
      </div>
    )
  }

  return <>{children}</>
}
