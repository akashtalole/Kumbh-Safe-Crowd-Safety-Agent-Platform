'use client'

import { useState } from 'react'
import AppLayout from '@cloudscape-design/components/app-layout'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Flashbar from '@cloudscape-design/components/flashbar'
import Header from '@cloudscape-design/components/header'
import HelpPanel from '@cloudscape-design/components/help-panel'
import Link from '@cloudscape-design/components/link'
import SideNavigation from '@cloudscape-design/components/side-navigation'
import SpaceBetween from '@cloudscape-design/components/space-between'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import { applyMode, Mode } from '@cloudscape-design/global-styles'

import { FoundationsSection } from '@/components/sections/foundations-section'
import { OverviewSection } from '@/components/sections/overview-section'
import { CreateResourceForm } from '@/components/sections/create-resource-form'
import { ResourcesSection } from '@/components/sections/resources-section'

export default function AppShell() {
  const [navigationOpen, setNavigationOpen] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    applyMode(next ? Mode.Dark : Mode.Light)
  }

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: '#',
            title: 'Cloudscape Console',
            logo: {
              src: `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><rect width="30" height="30" rx="6" fill="#006ce0"/><path d="M8 19c-1.7 0-3-1.3-3-3 0-1.6 1.2-2.9 2.7-3 .3-2.3 2.3-4 4.6-4 1.9 0 3.6 1.2 4.2 3 .2 0 .3-.1.5-.1 1.7 0 3 1.3 3 3s-1.3 3-3 3H8z" fill="#fff"/></svg>`,
              )}`,
              alt: 'Cloudscape Console',
            },
          }}
          utilities={[
            {
              type: 'button',
              iconName: darkMode ? 'star-filled' : 'star',
              text: darkMode ? 'Dark' : 'Light',
              ariaLabel: 'Toggle color mode',
              onClick: toggleDarkMode,
            },
            {
              type: 'button',
              iconName: 'notification',
              ariaLabel: 'Notifications',
              badge: true,
            },
            {
              type: 'menu-dropdown',
              iconName: 'settings',
              ariaLabel: 'Settings',
              items: [
                { id: 'settings-org', text: 'Organization settings' },
                { id: 'settings-acc', text: 'Account settings' },
              ],
            },
            {
              type: 'menu-dropdown',
              text: 'Jordan Rivera',
              description: 'jordan@example.com',
              iconName: 'user-profile',
              items: [
                { id: 'profile', text: 'Profile' },
                { id: 'preferences', text: 'Preferences' },
                { id: 'security', text: 'Security' },
                {
                  id: 'support-group',
                  text: 'Support',
                  items: [
                    {
                      id: 'documentation',
                      text: 'Documentation',
                      href: 'https://cloudscape.design/',
                      external: true,
                    },
                    { id: 'support', text: 'Support' },
                  ],
                },
                { id: 'signout', text: 'Sign out' },
              ],
            },
          ]}
          i18nStrings={{
            overflowMenuTriggerText: 'More',
            overflowMenuTitleText: 'All',
          }}
        />
      </div>

      <AppLayout
        headerSelector="#top-nav"
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'Console home', href: '#' },
              { text: 'Compute', href: '#' },
              { text: 'Instances', href: '#' },
            ]}
            ariaLabel="Breadcrumbs"
          />
        }
        navigation={
          <SideNavigation
            activeHref="#/instances"
            header={{ href: '#/', text: 'Compute service' }}
            items={[
              { type: 'link', text: 'Dashboard', href: '#/dashboard' },
              { type: 'link', text: 'Instances', href: '#/instances' },
              { type: 'link', text: 'Images', href: '#/images' },
              { type: 'link', text: 'Volumes', href: '#/volumes' },
              { type: 'divider' },
              {
                type: 'section',
                text: 'Networking',
                items: [
                  { type: 'link', text: 'Load balancers', href: '#/lb' },
                  { type: 'link', text: 'Security groups', href: '#/sg' },
                ],
              },
              { type: 'divider' },
              {
                type: 'link',
                text: 'Documentation',
                href: 'https://cloudscape.design/',
                external: true,
              },
            ]}
          />
        }
        tools={
          <HelpPanel header={<h2>About this starter</h2>}>
            <SpaceBetween size="m">
              <p>
                This page is built entirely with Cloudscape Design System
                components and design tokens — the same system AWS uses for its
                console.
              </p>
              <p>
                It showcases the foundation (color and type), the AppLayout
                shell, and signature components in realistic compositions.
              </p>
              <Link href="https://cloudscape.design/" external>
                Cloudscape documentation
              </Link>
            </SpaceBetween>
          </HelpPanel>
        }
        notifications={
          <Flashbar
            items={
              showWelcome
                ? [
                    {
                      type: 'success',
                      dismissible: true,
                      onDismiss: () => setShowWelcome(false),
                      statusIconAriaLabel: 'Success',
                      content:
                        'Cloudscape is wired up correctly — provider, fonts, and tokens are active.',
                      id: 'welcome',
                    },
                  ]
                : []
            }
          />
        }
        content={
          <ContentLayout
            header={
              <Header
                variant="h1"
                description="An open-source React design system for building intuitive, accessible web applications at scale."
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Link href="https://cloudscape.design/" external>
                      Documentation
                    </Link>
                  </SpaceBetween>
                }
              >
                Cloudscape Design System
              </Header>
            }
          >
            <SpaceBetween size="l">
              <OverviewSection />
              <FoundationsSection />
              <ResourcesSection />
              <CreateResourceForm />
            </SpaceBetween>
          </ContentLayout>
        }
      />
    </>
  )
}
