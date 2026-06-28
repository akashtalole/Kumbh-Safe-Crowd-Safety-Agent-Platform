# Aurora DSQL Setup Guide for KumbhSafe ICCC

## Overview

KumbhSafe requires 5 tables in Aurora DSQL:
- **users** - Multi-role authentication
- **zones** - Real-time density tracking
- **alerts** - Incident management
- **pilgrims** - Pilgrim registry
- **ambulances** - Emergency services
- **lost_found_cases** - Child safety
- **audit_logs** - Compliance tracking

---

## Step 1: Aurora DSQL Cluster Provisioned?

Make sure you have:
1. An Aurora DSQL cluster running in AWS
2. The cluster endpoint/hostname
3. AWS IAM role with DSQL access
4. Network access configured

If not provisioned yet, follow AWS documentation: https://docs.aws.amazon.com/aurora-dsql/latest/userguide/

---

## Step 2: Get Your Credentials

You'll need these values from your Aurora DSQL cluster:

```
PGHOST              = your-cluster-name.aurora-dsql.region.db.aws.com
PGUSER              = admin  (or your configured user)
PGDATABASE          = postgres  (always 'postgres' for DSQL)
AWS_ROLE_ARN        = arn:aws:iam::123456789:role/your-role-name
AWS_REGION          = us-east-1  (your AWS region)
AWS_ACCOUNT_ID      = 123456789  (your AWS account ID)
```

---

## Step 3: Set Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add these variables (for all environments: Production, Preview, Development):

```
PGHOST = your-cluster-name.aurora-dsql.region.db.aws.com
PGUSER = admin
PGDATABASE = postgres
AWS_ROLE_ARN = arn:aws:iam::123456789:role/your-role-name
AWS_REGION = us-east-1
AWS_ACCOUNT_ID = 123456789
```

3. Deploy or redeploy your Vercel project

---

## Step 4: Execute SQL Scripts

You have **3 options** to create the tables:

### Option A: Automatic (Recommended)

The Next.js app will automatically run the SQL scripts on first deployment if environment variables are set. The scripts execute in order:

1. **001-setup-users.sql** - Users table with 5 roles
2. **002-setup-zones.sql** - Zones table
3. **003-setup-alerts-services.sql** - Alerts, pilgrims, ambulances, lost_found_cases
4. **004-seed-demo-data.sql** - Pre-populate 5 demo accounts

To verify tables were created, the login page will switch from mock data to real database on next load.

---

### Option B: Manual (Using psql locally)

If you have psql installed locally:

```bash
# Set your credentials
export PGHOST=your-cluster.aurora-dsql.region.db.aws.com
export PGUSER=admin
export PGDATABASE=postgres

# Run each script in order
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/001-setup-users.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/002-setup-zones.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/003-setup-alerts-services.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/004-seed-demo-data.sql
```

psql will prompt for password - use your Aurora DSQL admin password.

---

### Option C: AWS Console (Query Editor)

1. Go to **AWS RDS Console** → **Databases**
2. Select your Aurora DSQL cluster
3. Click **Query Editor**
4. Copy-paste the contents of each script in order:
   - `scripts/001-setup-users.sql`
   - `scripts/002-setup-zones.sql`
   - `scripts/003-setup-alerts-services.sql`
   - `scripts/004-seed-demo-data.sql`
5. Run each one and verify success

---

## Step 5: Verify Tables Created

Once scripts run, verify all tables exist:

```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY table_name;
"
```

You should see:
```
        table_name        
---------------------------
 alert_logs
 alerts
 ambulances
 lost_found_cases
 pilgrims
 users
 zones
(7 rows)
```

---

## Step 6: Verify Demo Data Loaded

Check if the 5 demo accounts were created:

```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT email, role, is_active FROM users ORDER BY created_at;
"
```

You should see:
```
                  email                  |      role       | is_active
-----------------------------------------+-----------------+-----------
 rajesh.patil@kumbhsafe.gov.in           | super_admin     | t
 operator.iccc@kumbhsafe.gov.in          | iccc_operator   | t
 nashik.commander@kumbhsafe.gov.in       | zone_commander  | t
 medical.officer@kumbhsafe.gov.in        | medical_officer | t
 field.officer@kumbhsafe.gov.in          | field_officer   | t
(5 rows)
```

---

## Step 7: Test in KumbhSafe App

1. Go to your deployed KumbhSafe app
2. Click **Login** page
3. The demo accounts will now fetch from the database instead of mock data
4. Try logging in:
   - Email: `rajesh.patil@kumbhsafe.gov.in`
   - Password: `Password@2027`

If login succeeds, your Aurora DSQL setup is complete!

---

## Schema Overview

### users
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- role (super_admin | iccc_operator | zone_commander | medical_officer | field_officer)
- zone_id (UUID, nullable)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

### zones
```sql
- id (UUID, PK)
- name (VARCHAR)
- zone_commander_id (UUID)
- current_density (DECIMAL)
- max_capacity_per_sqm (DECIMAL)
- density_status (GREEN | YELLOW | ORANGE | RED | BLACK)
- coordinates_x, coordinates_y (DECIMAL)
- area_sqm (DECIMAL)
- total_pilgrims (INT)
- is_locked (BOOLEAN)
- locked_reason (TEXT)
- locked_until (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

### alerts
```sql
- id (UUID, PK)
- zone_id (UUID, FK to zones)
- alert_type (DENSITY | LOST_CHILD | MEDICAL_EMERGENCY | SECURITY_THREAT | INFRASTRUCTURE)
- severity (INFO | WARNING | CRITICAL)
- message (TEXT)
- status (OPEN | ACKNOWLEDGED | ESCALATED | RESOLVED)
- acknowledged_by (UUID)
- acknowledged_at (TIMESTAMP)
- resolved_by (UUID)
- resolved_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

### pilgrims
```sql
- id (UUID, PK)
- registration_id (VARCHAR, UNIQUE)
- name (VARCHAR)
- phone (VARCHAR)
- age (INT)
- zone_id (UUID)
- status (ACTIVE | LOST | FOUND | DEPARTED)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### ambulances
```sql
- id (UUID, PK)
- name (VARCHAR)
- driver_name (VARCHAR)
- status (AVAILABLE | DISPATCHED | ON_DUTY | MAINTENANCE)
- current_location (VARCHAR)
- zone_id (UUID)
- vehicle_number (VARCHAR)
- created_at, updated_at (TIMESTAMP)
```

### lost_found_cases
```sql
- id (UUID, PK)
- case_type (LOST | FOUND)
- description (TEXT)
- pilgrim_id (UUID)
- zone_id (UUID)
- handler_id (UUID)
- status (OPEN | RESOLVED | CLOSED)
- created_at, updated_at (TIMESTAMP)
```

### audit_logs
```sql
- id (UUID, PK)
- user_id (UUID)
- action (VARCHAR)
- resource_type (VARCHAR)
- resource_id (UUID)
- details (TEXT)
- created_at (TIMESTAMP)
```

---

## Important Notes

1. **DSQL Compatibility**: All scripts use DSQL-compatible SQL:
   - UUID with `gen_random_uuid()` instead of SERIAL
   - `CREATE INDEX ASYNC` for non-blocking indexes
   - No foreign keys (enforced in application code)
   - No extensions or triggers

2. **Transaction Limits**: DSQL has limits on transaction size:
   - Max 3,000 rows per transaction
   - Max 10 MB per transaction
   - Max 5 minutes per transaction
   - Seed scripts batch insert appropriately

3. **Each DDL in Own Transaction**: DSQL requires each DDL statement (CREATE/ALTER) in its own transaction, so each script has `COMMIT;` statements after each operation.

4. **Async Indexes**: All indexes use `CREATE INDEX ASYNC` to not block writes.

---

## Troubleshooting

### "Connection refused"
- Check PGHOST is correct and cluster is running
- Verify security group allows inbound on port 5432 from your IP

### "Authentication failed"
- Verify PGUSER and password are correct
- Check AWS IAM role has DSQL permissions

### "Relation 'users' does not exist"
- Scripts haven't run yet
- Check Vercel deployment logs to see if scripts executed
- Try running scripts manually

### "Table already exists"
- Scripts use `IF NOT EXISTS`, so re-running is safe
- To reset: Drop tables in reverse order, then re-run scripts

---

## Next Steps

Once tables are created:

1. **Login Page** will automatically use database instead of mock data
2. **Alert Manager** will persist alerts to database
3. **Zone Management** will show real zone data
4. **API Routes** will handle all CRUD operations

All 8 API routes are ready:
- `GET/POST /api/users` - User management
- `POST /api/auth/login` - Authentication
- `GET/POST /api/zones` - Zone data
- `GET/POST /api/alerts` - Alert management
- `GET/POST /api/pilgrims` - Pilgrim registry
- `GET/POST /api/ambulances` - Emergency services
- `GET/POST /api/lost-found` - Lost & found cases

---

## Support

If you encounter issues:

1. Check AWS RDS Query Editor for any error messages
2. Review `/vercel/share/v0-project/lib/db.ts` for connection logic
3. Ensure all environment variables are set correctly
4. Check Vercel deployment logs for runtime errors

Questions? Refer to:
- Aurora DSQL Docs: https://docs.aws.amazon.com/aurora-dsql/
- PostgreSQL Docs: https://www.postgresql.org/docs/
