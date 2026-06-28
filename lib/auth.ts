/**
 * KumbhSafe multi-user auth layer
 * Implemented as a client-side session stored in sessionStorage (no external deps).
 * In production this would be replaced with Cognito / Better Auth.
 */

export type UserRole =
  | 'super_admin'
  | 'iccc_operator'
  | 'zone_commander'
  | 'medical_officer'
  | 'field_officer'

export interface KumbhUser {
  userId: string
  name: string
  email: string
  role: UserRole
  city: 'nashik' | 'trimbakeshwar' | 'both'
  avatarInitials: string
  lastLogin: string
}

export interface LoginCredentials {
  email: string
  password: string
}

// Predefined demo accounts for multi-user testing
export const DEMO_USERS: (KumbhUser & { password: string })[] = [
  {
    userId: 'u-001',
    name: 'Rajesh Patil',
    email: 'admin@kumbhsafe.gov.in',
    password: 'Admin@2027',
    role: 'super_admin',
    city: 'both',
    avatarInitials: 'RP',
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    userId: 'u-002',
    name: 'Sunita Deshmukh',
    email: 'operator@kumbhsafe.gov.in',
    password: 'Iccc@2027',
    role: 'iccc_operator',
    city: 'both',
    avatarInitials: 'SD',
    lastLogin: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    userId: 'u-003',
    name: 'Vikram Shinde',
    email: 'nashik.commander@kumbhsafe.gov.in',
    password: 'Zone@2027',
    role: 'zone_commander',
    city: 'nashik',
    avatarInitials: 'VS',
    lastLogin: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    userId: 'u-004',
    name: 'Dr. Anjali Kulkarni',
    email: 'medical@kumbhsafe.gov.in',
    password: 'Medic@2027',
    role: 'medical_officer',
    city: 'both',
    avatarInitials: 'AK',
    lastLogin: new Date(Date.now() - 900000).toISOString(),
  },
  {
    userId: 'u-005',
    name: 'Prashant More',
    email: 'field@kumbhsafe.gov.in',
    password: 'Field@2027',
    role: 'field_officer',
    city: 'trimbakeshwar',
    avatarInitials: 'PM',
    lastLogin: new Date(Date.now() - 5400000).toISOString(),
  },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  iccc_operator: 'ICCC Operator',
  zone_commander: 'Zone Commander',
  medical_officer: 'Medical Officer',
  field_officer: 'Field Officer',
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['dashboard', 'zones', 'alerts', 'pilgrims', 'agents', 'settings'],
  iccc_operator: ['dashboard', 'zones', 'alerts', 'pilgrims', 'agents'],
  zone_commander: ['dashboard', 'zones', 'alerts'],
  medical_officer: ['dashboard', 'pilgrims', 'alerts'],
  field_officer: ['dashboard', 'zones'],
}

const SESSION_KEY = 'kumbhsafe_session'

export function login(credentials: LoginCredentials): KumbhUser | null {
  const found = DEMO_USERS.find(
    (u) => u.email === credentials.email && u.password === credentials.password
  )
  if (!found) return null
  const { password: _pw, ...user } = found
  const updated = { ...user, lastLogin: new Date().toISOString() }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  }
  return updated
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

export function getSession(): KumbhUser | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as KumbhUser
  } catch {
    return null
  }
}

export function hasPermission(user: KumbhUser, section: string): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(section) ?? false
}
