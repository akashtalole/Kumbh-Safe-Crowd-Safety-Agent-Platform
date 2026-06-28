# KumbhSafe Database Integration Guide

## Current Status

The KumbhSafe application has been fully prepared for **Aurora DSQL integration** with a production-ready database schema and API layer. The application currently uses **mock data** for demonstration purposes, but all database infrastructure is in place and ready to activate.

## Architecture

### Database Schema (Aurora DSQL)

The schema is defined in `scripts/` with 4 SQL files:

1. **001-setup-users.sql** - Users table with roles (super_admin, iccc_operator, zone_commander, medical_officer, field_officer)
2. **002-setup-zones.sql** - Zones table with density tracking, capacity management, and lock/hold functionality
3. **003-setup-alerts-services.sql** - 4 tables:
   - `alerts` - Incident alerts with severity, status, and acknowledgment tracking
   - `pilgrims` - Pilgrim registration with status tracking
   - `lost_found_cases` - Lost & found case management
   - `ambulances` - Ambulance fleet with status tracking
4. **004-seed-demo-data.sql** - Demo user accounts and sample data

### API Routes

All API routes are implemented in `app/api/`:

- **`/api/auth/login`** (POST) - Validate credentials against users table
- **`/api/users`** (GET, POST) - List and create users
- **`/api/zones`** (GET, PATCH) - List zones, hold/release/update density
- **`/api/alerts`** (GET, POST, PATCH) - CRUD alerts, acknowledge/escalate/resolve
- **`/api/pilgrims`** (GET, POST, PATCH) - Manage pilgrim records
- **`/api/ambulances`** (GET, POST, PATCH) - Dispatch and track ambulances
- **`/api/lost-found`** (GET, POST, PATCH) - Lost & found case management

### Database Connection

Database connection pooling is handled in `lib/db.ts` using:
- AWS IAM authentication via `@aws-sdk/dsql-signer`
- Connection pool from `pg` package
- Automatic token refresh with 900-second expiry

```typescript
// Example usage in API routes
import { query, withConnection } from '@/lib/db'

// Single query
const result = await query('SELECT * FROM users WHERE email = $1', [email])

// Multi-query transaction
await withConnection(async (client) => {
  await client.query('UPDATE alerts SET status = $1 WHERE id = $2', [status, id])
  await client.query('INSERT INTO audit_logs ...')
})
```

## Migration Path

### To activate the database:

1. **Create index page** that migrates data from mock-data to database (one-time seed):
   ```typescript
   // pages/admin/db-migrate.tsx
   async function migrateData() {
     // Call /api/migrate endpoint to:
     // 1. Insert users from DEMO_USERS
     // 2. Insert zones from ZONES
     // 3. Insert alerts from ALERTS
     // 4. Insert pilgrims and ambulances
   }
   ```

2. **Update authentication**:
   - Current: `components/login-page.tsx` validates against `DEMO_USERS`
   - New: Call `/api/auth/login` to validate against users table
   - Already partially implemented - just uncomment API call

3. **Update page data fetching**:
   - Zones page: Fetch from `/api/zones` instead of `ZONES` mock
   - Alerts page: Fetch from `/api/alerts` instead of `ALERTS` mock
   - Pilgrims page: Fetch from `/api/pilgrims` instead of mock
   - Ambulances: Fetch from `/api/ambulances` instead of mock

4. **Update action handlers**:
   - Zone hold/release: POST to `/api/zones` with action
   - Alert acknowledge/escalate/resolve: PATCH `/api/alerts` with status
   - Ambulance dispatch: PATCH `/api/ambulances` with status

## Field Mapping (Mock → Database)

For reference when migrating components:

| Mock Field | Database Field | Notes |
|---|---|---|
| zoneId | id | |
| zoneName | name | |
| currentDensity | current_density | |
| density_status | density_status (UPPERCASE) | GREEN, YELLOW, ORANGE, RED, BLACK |
| isHeld | is_locked | |
| alertId | id | |
| severity | severity (UPPERCASE) | INFO, WARNING, CRITICAL |
| status | status (UPPERCASE) | OPEN, ACKNOWLEDGED, ESCALATED, RESOLVED |
| pilgrimId | id | |
| vehicleId (ambulance) | id | |
| createdAt | created_at | ISO 8601 string |
| updatedAt | updated_at | ISO 8601 string |

## Environment Variables

Required for database connection:
- `PGHOST` - Aurora DSQL cluster hostname
- `PGUSER` - Database user (default: admin)
- `PGDATABASE` - Database name (default: postgres)
- `AWS_ROLE_ARN` - IAM role for DSQL access
- `AWS_REGION` - AWS region for DSQL

Set these in Vercel project Settings → Environment Variables.

## Transaction Limits (Aurora DSQL)

Note: DSQL has specific constraints to be aware of:
- **Max 3,000 rows per transaction**
- **Max 10 MiB data per transaction**
- **Max 5 minute duration**
- **Batch large operations** into chunks of 500–1,000 rows

This is why API routes batch operations and use `withConnection()` for multi-step transactions.

## Unsupported Features (DSQL)

The schema deliberately avoids these DSQL-incompatible features:
- Foreign key constraints (enforced in app code)
- SERIAL/BIGSERIAL (uses UUID + gen_random_uuid())
- Triggers (logic in app layer)
- Temporary tables (use regular tables)
- Array types (stored as TEXT)
- JSON/JSONB (stored as TEXT, parsed in app)

## Testing the API

Once database is provisioned, test with curl:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.patil@kumbhsafe.gov.in","password_hash":"Password@2027"}'

# Fetch zones
curl http://localhost:3000/api/zones

# Create alert
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"zone_id":"<zone-uuid>","alert_type":"DENSITY","severity":"CRITICAL","message":"..."}'

# Update zone status
curl -X PATCH http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -d '{"zoneId":"<zone-uuid>","action":"hold","reason":"Manual safety hold"}'
```

## Deployment

The application is ready for deployment:

1. Ensure Aurora DSQL cluster is provisioned
2. Add environment variables to Vercel project
3. Scripts will run automatically on first deployment (or manually via Vercel CLI)
4. Seed data populates demo accounts

## Support

All API routes have comprehensive error handling and logging:
- See `console.error('[v0] ...')` statements in route handlers
- Logs capture parameter issues, database errors, and constraint violations
- Check function parameter validation before query execution

For questions, refer to the AWS Aurora DSQL documentation and the route implementations in `app/api/`.
