// Database entity types
export type UserRole = 'super_admin' | 'iccc_operator' | 'zone_commander' | 'medical_officer' | 'field_officer'
export type ZoneDensityStatus = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK'
export type AlertType = 'DENSITY' | 'LOST_CHILD' | 'MEDICAL_EMERGENCY' | 'SECURITY_THREAT' | 'INFRASTRUCTURE'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED'
export type PilgrimStatus = 'ACTIVE' | 'LOST' | 'FOUND' | 'DEPARTED'
export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHED' | 'ON_DUTY' | 'MAINTENANCE'
export type LostFoundCaseType = 'LOST' | 'FOUND'
export type CaseStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  zone_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  name: string
  zone_commander_id?: string
  current_density: number
  max_capacity_per_sqm: number
  density_status: ZoneDensityStatus
  coordinates_x?: number
  coordinates_y?: number
  area_sqm?: number
  total_pilgrims: number
  is_locked: boolean
  locked_reason?: string
  locked_until?: string
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  zone_id: string
  alert_type: AlertType
  severity: AlertSeverity
  message: string
  status: AlertStatus
  acknowledged_by?: string
  acknowledged_at?: string
  resolved_by?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface Pilgrim {
  id: string
  registration_id?: string
  name: string
  phone?: string
  age?: number
  zone_id?: string
  status: PilgrimStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface LostFoundCase {
  id: string
  case_type: LostFoundCaseType
  description: string
  pilgrim_id?: string
  zone_id?: string
  handler_id?: string
  status: CaseStatus
  created_at: string
  updated_at: string
}

export interface Ambulance {
  id: string
  name: string
  driver_name?: string
  status: AmbulanceStatus
  current_location?: string
  zone_id?: string
  vehicle_number?: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: string
  created_at: string
}

// Agent types for Bedrock monitor
export interface Agent {
  agentId: string
  name: string
  role: string
  status: 'idle' | 'active' | 'alert' | 'error'
  lastAction: string
  lastActionTime: string
  invocationsToday: number
  alertsRaised: number
  model: string
  averageResponseMs: number
  toolsUsed: string[]
}

export interface AgentInvocationLog {
  logId: string
  timestamp: string
  agentName: string
  actionTaken: string
  zoneAffected: string
  durationMs: number
  result: 'success' | 'alert' | 'error'
}

// Legacy types for backward compatibility with mock data UI components
export type LegacyAlertType =
  | 'stampede'
  | 'flood'
  | 'medical'
  | 'fire'
  | 'missing'
  | 'infrastructure'
  | 'crowd_surge'

export type LegacyAlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface LegacyAlert {
  alertId: string
  type: LegacyAlertType
  severity: LegacyAlertSeverity
  zoneId: string
  zoneName: string
  city: string
  title: string
  description: string
  agentSource: string
  status: 'open' | 'responding' | 'resolved'
  createdAt: string
  resolvedAt?: string
  assignedTo?: string
  sopSteps: string[]
  acknowledgedBy?: string
}

export interface LegacyZone {
  zoneId: string
  name: string
  city: 'nashik' | 'trimbakeshwar'
  ghatName?: string
  currentDensity: number
  capacity: number
  currentCount: number
  status: 'green' | 'yellow' | 'red' | 'black' | 'closed'
  isHeld: boolean
  lastUpdated: string
  cameraCount: number
  coordinates: { lat: number; lng: number }
}

export interface LegacyAmbulance {
  vehicleId: string
  callSign: string
  city: 'nashik' | 'trimbakeshwar'
  status: 'available' | 'dispatched' | 'returning' | 'maintenance'
  currentLat: number
  currentLng: number
  assignedIncidentId?: string
  crew: string
}

export interface LegacyPilgrim {
  pilgrimId: string
  name: string
  age: number
  language: 'marathi' | 'hindi' | 'gujarati' | 'tamil' | 'kannada' | 'english'
  phone: string
  emergencyContact: string
  hasHealthFlag: boolean
  healthNote?: string
  currentZoneId?: string
  registeredAt: string
  qrCode: string
}

export interface LegacyLostFoundCase {
  caseId: string
  type: 'lost' | 'found'
  name: string
  age: number
  description: string
  lastSeenZone: string
  lastSeenTime: string
  reporterPhone: string
  photoUrl?: string
  status: 'open' | 'matched' | 'reunited'
  reportedAt: string
  city: 'nashik' | 'trimbakeshwar'
}

export interface GhatCondition {
  ghatId: string
  name: string
  city: 'nashik' | 'trimbakeshwar'
  status: 'safe' | 'caution' | 'warning' | 'closed'
  waterLevel: number
  waterLevelTrend: 'rising' | 'stable' | 'falling'
  bathingAllowed: boolean
  lastUpdated: string
  nextUpdateIn: number
  riskFactors: string[]
}
