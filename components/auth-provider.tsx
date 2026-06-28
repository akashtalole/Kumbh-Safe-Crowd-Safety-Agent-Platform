'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type KumbhUser, getSession, logout as authLogout } from '@/lib/auth'

interface AuthContextValue {
  user: KumbhUser | null
  setUser: (u: KumbhUser | null) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<KumbhUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    setUser(session)
    setIsLoading(false)
  }, [])

  function logout() {
    authLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
