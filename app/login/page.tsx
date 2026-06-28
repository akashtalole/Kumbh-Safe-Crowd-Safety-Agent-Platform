'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/components/login-page'
import { useAuth } from '@/components/auth-provider'
import type { KumbhUser } from '@/lib/auth'

export default function LoginRoute() {
  const { user, setUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.replace('/dashboard')
    }
  }, [user, router])

  function handleLogin(loggedInUser: KumbhUser) {
    setUser(loggedInUser)
    router.push('/dashboard')
  }

  return <LoginPage onLogin={handleLogin} />
}
