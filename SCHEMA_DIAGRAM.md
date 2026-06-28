# KumbhSafe Aurora DSQL Schema Diagram

## Entity Relationship Overview

```
┌─────────────────┐
│     USERS       │
├─────────────────┤
│ id (PK, UUID)   │
│ email (UNIQUE)  │ ← 5 demo accounts seeded
│ password_hash   │
│ name            │
│ role            │ ┐
│ zone_id (FK)    │ ├─→ ZONES (via zone_id)
│ is_active       │ │   ALERTS (via user_id)
│ created_at      │ │   AMBULANCES (via zone_id)
│ updated_at      │ │   LOST_FOUND_CASES (via handler_id)
└─────────────────┘ │   AUDIT_LOGS (via user_id)
                    └────────────────────────────

┌─────────────────────────┐
│       ZONES             │
├─────────────────────────┤
│ id (PK, UUID)           │
│ name                    │ ┐
│ zone_commander_id (FK)  │ ├─→ USERS (zone_commander_id)
│ current_density         │ │   ALERTS (zone_id)
│ max_capacity_per_sqm    │ │   PILGRIMS (zone_id)
│ density_status          │ │   AMBULANCES (zone_id)
│ coordinates_x/y         │ │   LOST_FOUND_CASES (zone_id)
│ area_sqm                │ │
│ total_pilgrims          │ │
│ is_locked               │ │
│ locked_reason           │ │
│ locked_until            │ │
│ created_at/updated_at   │ │
└─────────────────────────┘ │
                            │
┌──────────────────────────┐ │
│       ALERTS             │ │
├──────────────────────────┤ │
│ id (PK, UUID)            │ │
│ zone_id (FK) ────────────┘ │
│ alert_type               │
│ severity                 │
│ message                  │
│ status                   │
│ acknowledged_by (FK)     ├─→ USERS
│ acknowledged_at          │
│ resolved_by (FK)         │
│ resolved_at              │
│ created_at/updated_at    │
└──────────────────────────┘

┌──────────────────────────┐
│      PILGRIMS            │
├──────────────────────────┤
│ id (PK, UUID)            │
│ registration_id (UNIQUE) │
│ name                     │
│ phone                    │
│ age                      │
│ zone_id (FK) ────────────┤──→ ZONES
│ status                   │
│ notes                    │
│ created_at/updated_at    │
└──────────────────────────┘

┌──────────────────────────┐
│      AMBULANCES          │
├──────────────────────────┤
│ id (PK, UUID)            │
│ name                     │
│ driver_name              │
│ status                   │
│ current_location         │
│ zone_id (FK) ────────────┤──→ ZONES
│ vehicle_number           │
│ created_at/updated_at    │
└──────────────────────────┘

┌──────────────────────────┐
│   LOST_FOUND_CASES       │
├──────────────────────────┤
│ id (PK, UUID)            │
│ case_type                │
│ description              │
│ pilgrim_id (FK) ─────────┤──→ PILGRIMS
│ zone_id (FK) ────────────┤──→ ZONES
│ handler_id (FK) ─────────┤──→ USERS
│ status                   │
│ created_at/updated_at    │
└──────────────────────────┘

┌──────────────────────────┐
│      AUDIT_LOGS          │
├──────────────────────────┤
│ id (PK, UUID)            │
│ user_id (FK) ────────────┤──→ USERS
│ action                   │
│ resource_type            │
│ resource_id (UUID)       │
│ details                  │
│ created_at               │
└──────────────────────────┘
```

---

## Data Flow

### Authentication Flow
```
Login Page
    ↓
POST /api/auth/login { email, password_hash }
    ↓
Query USERS table for email match
    ↓
Compare password_hash
    ↓
Return user object with role
    ↓
Frontend stores in sessionStorage
    ↓
Redirect to /dashboard
```

### Dashboard Data Flow
```
GET /api/zones
    ↓
SELECT * FROM zones
    ↓
Render Zone Heatmap with density_status colors
    ↓
Show locked zones, capacity info

GET /api/alerts
    ↓
SELECT * FROM alerts WHERE status != 'RESOLVED'
    ↓
Render Alert Feed with acknowledge/resolve buttons
```

### Alert Management
```
User acknowledges alert
    ↓
PATCH /api/alerts/:id { acknowledged_by, status: 'ACKNOWLEDGED' }
    ↓
UPDATE alerts SET acknowledged_by, status, updated_at
    ↓
INSERT audit_logs record
    ↓
Refresh alert feed in UI
```

---

## Key Constraints

### Role-Based Access (Application Layer)
```typescript
const ROLE_PERMISSIONS = {
  super_admin: ['dashboard', 'zones', 'alerts', 'pilgrims', 'ambulances', 'agents', 'settings'],
  iccc_operator: ['dashboard', 'alerts', 'agents'],
  zone_commander: ['dashboard', 'zones', 'alerts'],
  medical_officer: ['dashboard', 'pilgrims', 'ambulances'],
  field_officer: ['dashboard', 'zones']
}
```

### Status Enums
```sql
USERS.role: super_admin, iccc_operator, zone_commander, medical_officer, field_officer
ZONES.density_status: GREEN, YELLOW, ORANGE, RED, BLACK
ALERTS.alert_type: DENSITY, LOST_CHILD, MEDICAL_EMERGENCY, SECURITY_THREAT, INFRASTRUCTURE
ALERTS.severity: INFO, WARNING, CRITICAL
ALERTS.status: OPEN, ACKNOWLEDGED, ESCALATED, RESOLVED
PILGRIMS.status: ACTIVE, LOST, FOUND, DEPARTED
AMBULANCES.status: AVAILABLE, DISPATCHED, ON_DUTY, MAINTENANCE
LOST_FOUND_CASES.status: OPEN, RESOLVED, CLOSED
LOST_FOUND_CASES.case_type: LOST, FOUND
```

---

## Indexes for Performance

### By Table:

**USERS**
- idx_users_email (email lookup for login)
- idx_users_role (filter by role)
- idx_users_zone_id (zone commander queries)

**ZONES**
- idx_zones_name (zone lookup)
- idx_zones_status (density status queries)
- idx_zones_commander (zone commander queries)

**ALERTS**
- idx_alerts_zone (alerts per zone)
- idx_alerts_status (open/active alerts)
- idx_alerts_severity (critical alerts)

**PILGRIMS**
- idx_pilgrims_zone (pilgrims per zone)
- idx_pilgrims_status (lost/found tracking)

**AMBULANCES**
- idx_ambulances_zone (ambulances per zone)
- idx_ambulances_status (available units)

**LOST_FOUND_CASES**
- idx_lost_found_zone (cases per zone)
- idx_lost_found_status (open/closed cases)

**AUDIT_LOGS**
- idx_audit_logs_user (audit trail per user)
- idx_audit_logs_action (action type filtering)

---

## Sample Queries

### Get all open critical alerts
```sql
SELECT * FROM alerts 
WHERE status IN ('OPEN', 'ACKNOWLEDGED') 
  AND severity = 'CRITICAL'
ORDER BY created_at DESC;
```

### Get zone current status
```sql
SELECT 
  z.name,
  z.current_density,
  z.density_status,
  z.total_pilgrims,
  z.is_locked,
  u.name as zone_commander
FROM zones z
LEFT JOIN users u ON z.zone_commander_id = u.id
WHERE z.id = $1;
```

### Get lost children cases open today
```sql
SELECT 
  lfc.id,
  lfc.description,
  z.name as zone,
  u.name as handler
FROM lost_found_cases lfc
LEFT JOIN zones z ON lfc.zone_id = z.id
LEFT JOIN users u ON lfc.handler_id = u.id
WHERE lfc.case_type = 'LOST'
  AND lfc.status = 'OPEN'
  AND DATE(lfc.created_at) = CURRENT_DATE
ORDER BY lfc.created_at DESC;
```

### Get ambulance dispatch history
```sql
SELECT 
  a.name,
  a.vehicle_number,
  al.action,
  al.resource_id,
  al.details,
  u.name as operator,
  al.created_at
FROM audit_logs al
JOIN ambulances a ON al.resource_id = a.id
JOIN users u ON al.user_id = u.id
WHERE al.resource_type = 'ambulance'
  AND al.action IN ('dispatch', 'return')
ORDER BY al.created_at DESC
LIMIT 50;
```

---

## Notes

- **No Foreign Keys in DSQL**: Referential integrity is enforced in application code
- **Transactions**: Maximum 3,000 rows and 10 MB per transaction (batching applied)
- **UUIDs**: All primary keys use UUID for distributed system compatibility
- **Async Indexes**: All indexes use `CREATE INDEX ASYNC` to avoid write blocking
- **Timestamps**: All tables include `created_at` and `updated_at` for audit trails
