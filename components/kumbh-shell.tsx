'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AppLayout from '@cloudscape-design/components/app-layout'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import SideNavigation from '@cloudscape-design/components/side-navigation'
import Badge from '@cloudscape-design/components/badge'
import { applyMode, Mode } from '@cloudscape-design/global-styles'
import { useAuth } from '@/components/auth-provider'
import { ROLE_LABELS, hasPermission } from '@/lib/auth'
import { ALERTS } from '@/lib/mock-data'

interface KumbhShellProps {
  children: ReactNode
  breadcrumbs?: ReactNode
  notifications?: ReactNode
  tools?: ReactNode
  toolsOpen?: boolean
  onToolsChange?: (open: boolean) => void
}

export default function KumbhShell({
  children,
  breadcrumbs,
  notifications,
  tools,
  toolsOpen = false,
  onToolsChange,
}: KumbhShellProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [navigationOpen, setNavigationOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const criticalCount = ALERTS.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length
  const activeAlertCount = ALERTS.filter((a) => a.status !== 'resolved').length
  const redBlackZoneCount = 3

  useEffect(() => {
    // Default to dark mode for command center
    applyMode(Mode.Dark)
    const timer = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    applyMode(next ? Mode.Dark : Mode.Light)
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  function navHref(path: string) {
    return path
  }

  const navItems: any[] = []

  if (hasPermission(user!, 'dashboard')) {
    navItems.push({ type: 'link', text: 'Dashboard', href: '/dashboard', info: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c7162b', display: 'inline-block' }} /></span> })
  }
  if (hasPermission(user!, 'zones')) {
    navItems.push({ type: 'link', text: `Zone Management`, href: '/zones', info: <Badge color="red">{redBlackZoneCount}</Badge> })
  }
  if (hasPermission(user!, 'alerts')) {
    navItems.push({ type: 'link', text: 'Alert Manager', href: '/alerts', info: <Badge color="red">{activeAlertCount}</Badge> })
  }
  if (hasPermission(user!, 'pilgrims')) {
    navItems.push({ type: 'link', text: 'Pilgrim Services', href: '/pilgrims', info: <Badge color="blue">1</Badge> })
  }
  if (hasPermission(user!, 'agents')) {
    navItems.push({ type: 'link', text: 'Agent Monitor', href: '/agents' })
  }
  navItems.push({ type: 'divider' })
  if (hasPermission(user!, 'settings')) {
    navItems.push({ type: 'link', text: 'Settings', href: '/settings' })
  }

  return (
    <>
      <div id="kumbh-top-nav">
        <TopNavigation
          identity={{
            href: '/dashboard',
            title: 'KumbhSafe — ICCC',
            logo: {
              src: `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><rect width="30" height="30" rx="6" fill="#c7162b"/><text x="15" y="21" font-size="16" text-anchor="middle" fill="white" font-family="sans-serif">&#x0950;</text></svg>`
              )}`,
              alt: 'KumbhSafe',
            },
          }}
          utilities={[
            {
              type: 'button',
              text: secondsAgo < 60 ? `Updated ${secondsAgo}s ago` : `Updated ${Math.floor(secondsAgo / 60)}m ago`,
              ariaLabel: 'Last data refresh time',
            },
            {
              type: 'button',
              iconName: darkMode ? 'star-filled' : 'star',
              ariaLabel: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
              onClick: toggleDark,
            },
            {
              type: 'button',
              iconName: 'notification',
              ariaLabel: `${criticalCount} critical alerts`,
              badge: criticalCount > 0,
              onClick: () => router.push('/alerts'),
            },
            {
              type: 'menu-dropdown',
              text: user?.name ?? 'User',
              description: `${ROLE_LABELS[user?.role ?? 'field_officer']} • ${user?.city === 'both' ? 'Both Cities' : user?.city}`,
              iconName: 'user-profile',
              items: [
                { id: 'profile-header', text: user?.email ?? '', disabled: true },
                { id: 'role', text: `Role: ${ROLE_LABELS[user?.role ?? 'field_officer']}`, disabled: true },
                { id: 'divider1', text: '-' },
                { id: 'switch-user', text: 'Switch User / Sign Out', href: '/login' },
              ],
              onItemClick: ({ detail }) => {
                if (detail.id === 'switch-user') handleLogout()
              },
            },
          ]}
          i18nStrings={{
            overflowMenuTriggerText: 'More',
            overflowMenuTitleText: 'All',
          }}
        />
      </div>

      <AppLayout
        headerSelector="#kumbh-top-nav"
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => onToolsChange?.(detail.open)}
        breadcrumbs={breadcrumbs}
        navigation={
          <SideNavigation
            activeHref={pathname}
            header={{ href: '/dashboard', text: 'Nashik Kumbh 2027' }}
            items={navItems}
            onFollow={(e) => {
              e.preventDefault()
              router.push(e.detail.href)
            }}
          />
        }
        tools={tools}
        notifications={notifications}
        content={children}
      />
    </>
  )
}
