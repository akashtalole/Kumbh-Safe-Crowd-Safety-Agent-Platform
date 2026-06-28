# SQL Scripts Reference

All 4 scripts are in `/scripts/` directory and create the complete Aurora DSQL schema for KumbhSafe.

---

## 001-setup-users.sql (21 lines)

**Purpose**: Create users table for authentication and role-based access

**What it creates**:
- `users` table with 9 columns
- 3 indexes: email (login), role (filtering), zone_id (commander queries)

**Key features**:
- UUID primary key
- Email UNIQUE constraint for login
- Role CHECK constraint (5 valid roles only)
- Default timestamps for auditing
- Password hash storage (hashed by application)

**When to run**: First (creates authentication foundation)

---

## 002-setup-zones.sql (27 lines)

**Purpose**: Create zones table for density tracking and management

**What it creates**:
- `zones` table with 14 columns
- 3 indexes: name (lookup), density_status (dashboard), commander (mgmt)

**Key features**:
- UUID primary key
- Real-time density tracking (current_density, max_capacity_per_sqm)
- Density status colors: GREEN, YELLOW, ORANGE, RED, BLACK
- Lock mechanism for crowd control (is_locked, locked_reason, locked_until)
- GPS coordinates (coordinates_x, coordinates_y)
- Zone area calculation
- Zone commander assignment

**When to run**: Second (dependency: none, but runs before alerts)

---

## 003-setup-alerts-services.sql (99 lines)

**Purpose**: Create 4 tables for operational management

**What it creates**:

### Table 1: alerts (20 lines)
- Alert incident management
- 8 indexes: zone, status, severity
- Types: DENSITY, LOST_CHILD, MEDICAL_EMERGENCY, SECURITY_THREAT, INFRASTRUCTURE
- Statuses: OPEN, ACKNOWLEDGED, ESCALATED, RESOLVED
- Tracks who acknowledged and who resolved

### Table 2: pilgrims (20 lines)
- Pilgrim registry database
- 3 indexes: zone, status
- Status: ACTIVE, LOST, FOUND, DEPARTED
- Registration ID tracking
- Emergency notes

### Table 3: lost_found_cases (20 lines)
- Lost & found case management
- 3 indexes: zone, status
- Type: LOST or FOUND
- Handler tracking
- Links to pilgrim records

### Table 4: ambulances (20 lines)
- Emergency ambulance fleet
- 2 indexes: zone, status
- Status: AVAILABLE, DISPATCHED, ON_DUTY, MAINTENANCE
- Driver assignment
- Location tracking
- Vehicle number tracking

### Table 5: audit_logs (18 lines)
- Compliance and audit trail
- 2 indexes: user, action
- Records all user actions
- Resource tracking
- Immutable change log

**When to run**: Third (depends on zones table existing)

---

## 004-seed-demo-data.sql (51 lines)

**Purpose**: Pre-populate database with demo accounts and test data

**What it does**:

### 5 Demo Users Inserted:
```sql
1. rajesh.patil@kumbhsafe.gov.in (Super Admin)
2. operator.iccc@kumbhsafe.gov.in (ICCC Operator)
3. nashik.commander@kumbhsafe.gov.in (Zone Commander)
4. medical.officer@kumbhsafe.gov.in (Medical Officer)
5. field.officer@kumbhsafe.gov.in (Field Officer)
```

All passwords hashed as: `Password@2027`

### 3 Demo Zones Inserted:
```sql
1. Kushavart Kund Core (Nashik)
2. Ramkund Ghat (Nashik)
3. Trimbakeshwar Temple (Trimbakeshwar)
```

### 5 Ambulances Inserted:
- AMBULANCE-01 through AMBULANCE-05
- All marked AVAILABLE
- Assigned to zones

### Sample Pilgrims (100 records):
- Various names, ages, languages
- Spread across zones
- Status tracking

**When to run**: Fourth (after all 3 tables exist)

---

## Execution Instructions

### Local with psql:
```bash
# Set variables
export PGHOST=your-cluster.aurora-dsql.region.db.aws.com
export PGUSER=admin
export PGDATABASE=postgres

# Run in order
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/001-setup-users.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/002-setup-zones.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/003-setup-alerts-services.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/004-seed-demo-data.sql
```

### Via AWS Console:
1. Open AWS RDS → Query Editor
2. Select your Aurora DSQL cluster
3. Copy-paste content from each .sql file
4. Execute one at a time in order

### Via Vercel Deployment:
Set env vars → Deploy → Scripts auto-execute on first run

---

## Verification

After running all scripts, verify with:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
-- Expected: alerts, ambulances, audit_logs, lost_found_cases, pilgrims, users, zones

-- Check demo users loaded
SELECT COUNT(*) as user_count FROM users;
-- Expected: 5

-- Check zones loaded
SELECT COUNT(*) as zone_count FROM zones;
-- Expected: 3

-- Check ambulances loaded
SELECT COUNT(*) as ambulance_count FROM ambulances;
-- Expected: 5

-- Check pilgrims loaded
SELECT COUNT(*) as pilgrim_count FROM pilgrims;
-- Expected: 100+
```

---

## DSQL Compliance Notes

All scripts follow Aurora DSQL requirements:

✅ UUIDs instead of SERIAL
✅ `gen_random_uuid()` for ID generation
✅ `CREATE INDEX ASYNC` for non-blocking indexes
✅ Each DDL in own `COMMIT` statement
✅ No foreign keys (enforced in app code)
✅ No triggers or extensions
✅ Batched inserts (within transaction limits)
✅ CHECK constraints for enum values

---

## Rollback Instructions

To start fresh, drop tables in reverse order:

```sql
DROP TABLE IF EXISTS audit_logs;
COMMIT;

DROP TABLE IF EXISTS lost_found_cases;
COMMIT;

DROP TABLE IF EXISTS ambulances;
COMMIT;

DROP TABLE IF EXISTS pilgrims;
COMMIT;

DROP TABLE IF EXISTS alerts;
COMMIT;

DROP TABLE IF EXISTS zones;
COMMIT;

DROP TABLE IF EXISTS users;
COMMIT;
```

Then re-run all 4 scripts.

---

## Script Dependencies

```
001-setup-users.sql
    ↓
002-setup-zones.sql (can reference users via zone_commander_id)
    ↓
003-setup-alerts-services.sql (references users, zones)
    ↓
004-seed-demo-data.sql (populates all 3 tables)
```

Each script depends on previous scripts completing successfully.

---

## Performance Notes

- All indexes use ASYNC creation (no write blocking)
- Indexes by access pattern:
  - Email index for login queries
  - Role index for permission queries
  - Status indexes for dashboard queries
  - Zone indexes for zone-scoped queries
- Transaction size: ~3,000 rows max (seed data batches appropriately)
- Query execution: Indexes optimize common queries

---

For more details, see:
- `AURORA_DSQL_SETUP.md` - Full setup guide
- `SCHEMA_DIAGRAM.md` - Entity relationships
- `QUICK_REFERENCE.md` - TL;DR quick start
