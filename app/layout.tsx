import type { Metadata } from 'next'
import '@cloudscape-design/global-styles/index.css'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'KumbhSafe — ICCC Command Centre',
  description:
    'Real-time crowd safety intelligence platform for Nashik Simhastha Kumbh Mela 2027. Integrated Command & Control Centre.',
  keywords: 'KumbhSafe, crowd safety, Nashik Kumbh, ICCC, command centre',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
