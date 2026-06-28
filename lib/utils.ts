import type { LegacyAlertSeverity } from './types'

type ZoneStatus = 'green' | 'yellow' | 'red' | 'black' | 'closed'
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
type GhatStatus = 'safe' | 'caution' | 'warning' | 'closed'
type AgentStatus = 'idle' | 'active' | 'alert' | 'error'

export function getDensityStatus(density: number): ZoneStatus {
  if (density > 6.5) return 'black'
  if (density > 4.5) return 'red'
  if (density > 2.5) return 'yellow'
  return 'green'
}

export function getDensityColor(density: number): string {
  const status = getDensityStatus(density)
  return STATUS_COLORS[status]
}

export const STATUS_COLORS: Record<ZoneStatus, string> = {
  green: '#037f51',
  yellow: '#d6880b',
  red: '#c7162b',
  black: '#8c1515',
  closed: '#5f6b7a',
}

export const STATUS_BADGE_COLORS: Record<ZoneStatus, 'green' | 'blue' | 'red' | 'grey'> = {
  green: 'green',
  yellow: 'blue',
  red: 'red',
  black: 'red',
  closed: 'grey',
}

export const SEVERITY_COLORS: Record<LegacyAlertSeverity, string> = {
  critical: '#c7162b',
  high: '#d6880b',
  medium: '#0972d3',
  low: '#5f6b7a',
}

export const AGENT_STATUS_INDICATOR: Record<AgentStatus, 'success' | 'in-progress' | 'warning' | 'error'> = {
  idle: 'success',
  active: 'in-progress',
  alert: 'warning',
  error: 'error',
}

export const GHAT_STATUS_INDICATOR: Record<GhatStatus, 'success' | 'warning' | 'error' | 'stopped'> = {
  safe: 'success',
  caution: 'warning',
  warning: 'error',
  closed: 'stopped',
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

export function getSeverityIndicatorType(severity: LegacyAlertSeverity | string): 'error' | 'warning' | 'info' | 'stopped' {
  switch (severity) {
    case 'critical': return 'error'
    case 'high': return 'warning'
    case 'medium': return 'info'
    case 'low': return 'stopped'
    case 'CRITICAL': return 'error'
    case 'WARNING': return 'warning'
    case 'INFO': return 'info'
    default: return 'stopped'
  }
}
