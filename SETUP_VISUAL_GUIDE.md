# Visual Setup Guide for Aurora DSQL

## Overview Flowchart

```
┌─────────────────────────────────────────────────┐
│  Aurora DSQL Cluster Provisioned & Running      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Get Credentials from AWS                       │
│  • PGHOST                                       │
│  • AWS_ROLE_ARN                                 │
│  • AWS_REGION                                   │
│  • AWS_ACCOUNT_ID                               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Set Environment Variables in Vercel            │
│  (Settings → Environment Variables)             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Choose Execution Method:                       │
│  ┌─────────────────────────────────────────┐    │
│  │ A) Auto (via Deployment)                │    │
│  │ B) Manual (psql CLI)                    │    │
│  │ C) AWS Console (Query Editor)           │    │
│  └─────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        ┌──────────┴────────────┐
        │                       │
        ▼                       ▼
    ┌────────────┐        ┌──────────────────┐
    │   AUTO     │        │   MANUAL / AWS   │
    ├────────────┤        ├──────────────────┤
    │ Deploy     │        │ Run SQL Scripts  │
    │ on Vercel  │        │ in order:        │
    │            │        │ 1. Users         │
    │ Scripts    │        │ 2. Zones         │
    │ run        │        │ 3. Services      │
    │ auto       │        │ 4. Seed Data     │
    └──────┬─────┘        └────────┬─────────┘
           │                       │
           └───────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ All 7 Tables Created         │
        │ Demo Data Loaded             │
        │ Indexes Built                │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Test Login with DB           │
        │ Email:                       │
        │ rajesh.patil@...             │
        │ Password: Password@2027      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ ✅ SUCCESS                   │
        │ App using Aurora DSQL        │
        └──────────────────────────────┘
```

---

## Step-by-Step Instructions

### STEP 1: Gather AWS Credentials

```
Login to AWS Console
    ↓
Go to RDS > Databases
    ↓
Select your Aurora DSQL cluster
    ↓
Copy these from cluster details:
    
    PGHOST = (Endpoint) 
    Example: my-cluster.aurora-dsql.us-east-1.db.aws.com
    
    AWS_REGION = (Instance class region)
    Example: us-east-1
    
    AWS_ACCOUNT_ID = (from AWS Account menu)
    Example: 123456789012
    
    AWS_ROLE_ARN = (from IAM > Roles)
    Example: arn:aws:iam::123456789:role/my-dsql-role
```

### STEP 2: Set Vercel Environment Variables

```
1. Go to Vercel Dashboard
   https://vercel.com/dashboard
   
2. Click Your Project Name (KumbhSafe)
   
3. Go to Settings (top nav)
   
4. Click "Environment Variables" (left sidebar)
   
5. Add these 6 variables:
   
   ┌──────────────────────────────────────────┐
   │ PGHOST                                   │
   │ Value: your-cluster.aurora-dsql....com   │
   │ Environments: Production, Preview, Dev   │
   │ [Add]                                    │
   └──────────────────────────────────────────┘
   
   ┌──────────────────────────────────────────┐
   │ PGUSER                                   │
   │ Value: admin                             │
   │ Environments: Production, Preview, Dev   │
   │ [Add]                                    │
   └──────────────────────────────────────────┘
   
   ┌──────────────────────────────────────────┐
   │ PGDATABASE                               │
   │ Value: postgres                          │
   │ Environments: Production, Preview, Dev   │
   │ [Add]                                    │
   └──────────────────────────────────────────┘
   
   ┌──────────────────────────────────────────┐
   │ AWS_ROLE_ARN                             │
   │ Value: arn:aws:iam::123456789:role/...   │
   │ Environments: Production, Preview, Dev   │
   │ [Add]                                    │
   └──────────────────────────────────────────┘
   
   ┌──────────────────────────────────────────┐
   │ AWS_REGION                               │
   │ Value: us-east-1                         │
   │ Environments: Production, Preview, Dev   │
   │ [Add]                                    │
   └──────────────────────────────────────────┘
   
   ┌──────────────────────────────────────────┐
   │ AWS_ACCOUNT_ID                           │
   │ Value: 123456789012                      │
   │ Environments: Production, Preview, Dev   │
   │ [Add]                                    │
   └──────────────────────────────────────────┘

6. Click "Save" for each variable
   
7. All should show "✓" when saved
```

### STEP 3: Execute SQL Scripts

**Choose ONE of these three methods:**

---

#### METHOD A: Auto (Recommended)

```
1. Go to Vercel Dashboard
   
2. Your project should auto-redeploy after env var changes
   
3. Watch the deployment log
   
4. If PGHOST is set, scripts auto-execute on first request
   
5. After ~2 minutes, tables will be created
   
✓ No manual work needed, just wait for deployment
```

---

#### METHOD B: Manual (psql CLI)

```
Prerequisites:
  • PostgreSQL client installed locally
  • PGHOST, PGUSER credentials
  • Network access to Aurora DSQL cluster
  
Commands:

  # Open terminal/command prompt
  
  # Set environment variables
  export PGHOST=your-cluster.aurora-dsql.region.db.aws.com
  export PGUSER=admin
  export PGDATABASE=postgres
  
  # Run each script in order
  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/001-setup-users.sql
  # Prompts for password → Enter your admin password
  # Wait for "CREATE TABLE" and "CREATE INDEX" confirmations
  
  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/002-setup-zones.sql
  # Wait for completion
  
  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/003-setup-alerts-services.sql
  # Wait for completion (longest script)
  
  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/004-seed-demo-data.sql
  # Wait for completion
  
✓ If no errors shown, tables are created
```

---

#### METHOD C: AWS Console (Query Editor)

```
1. Go to AWS RDS Console
   https://console.aws.amazon.com/rds/
   
2. Click "Databases" in left sidebar
   
3. Select your Aurora DSQL cluster
   
4. Scroll right, click "Query Editor" (or "Actions" → "Query Editor")
   
5. It opens a SQL editor in your browser
   
6. Connection defaults to your cluster (verify correct cluster name)
   
7. Copy-paste FIRST script:
   
   ┌────────────────────────────────────────────┐
   │ /* 001-setup-users.sql */                  │
   │ CREATE TABLE IF NOT EXISTS users (         │
   │   id UUID PRIMARY KEY DEFAULT ...          │
   │   ...                                      │
   │ );                                         │
   │ COMMIT;                                    │
   │ ...                                        │
   │                                            │
   │ [Execute] or [Ctrl+Enter]                  │
   └────────────────────────────────────────────┘
   
8. Wait for success message (green checkmark)
   
9. Clear editor, paste SECOND script (002-setup-zones.sql)
   
10. Click [Execute]
    
11. Repeat steps 9-10 for:
    - 003-setup-alerts-services.sql
    - 004-seed-demo-data.sql
    
✓ After all 4 scripts succeed (green checks), done
```

---

### STEP 4: Verify Tables Created

```
Verify with this query in psql or Query Editor:

  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY table_name;

Expected output:
  
  ┌──────────────────────┐
  │ alerts               │
  │ ambulances           │
  │ audit_logs           │
  │ lost_found_cases     │
  │ pilgrims             │
  │ users                │
  │ zones                │
  └──────────────────────┘
  
  (7 rows)

If you see all 7 tables → ✓ SUCCESS
If you see fewer → Scripts didn't run, check errors
```

---

### STEP 5: Verify Demo Data

```
Check demo accounts loaded:

  SELECT email, role FROM users;

Expected:
  
  ┌─────────────────────────────────┬─────────────────┐
  │ email                           │ role            │
  ├─────────────────────────────────┼─────────────────┤
  │ rajesh.patil@...                │ super_admin     │
  │ operator.iccc@...               │ iccc_operator   │
  │ nashik.commander@...            │ zone_commander  │
  │ medical.officer@...             │ medical_officer │
  │ field.officer@...               │ field_officer   │
  └─────────────────────────────────┴─────────────────┘
  
  (5 rows)

Check zones:
  
  SELECT name, density_status FROM zones;
  
  Expected: 3 zones (Kushavart Kund, Ramkund, Trimbakeshwar)

Check ambulances:
  
  SELECT COUNT(*) FROM ambulances;
  
  Expected: 5

✓ All demo data loaded successfully
```

---

### STEP 6: Test in App

```
1. Go to your KumbhSafe app
   https://kumbhsafe.vercel.app/login
   
2. Try logging in with database credentials
   
   Email: rajesh.patil@kumbhsafe.gov.in
   Password: Password@2027
   
3. If login succeeds:
   ✓ You're now using Aurora DSQL!
   ✓ All features use real database
   
4. Check Network Tab (DevTools) to see API calls:
   - POST /api/auth/login
   - GET /api/zones
   - GET /api/alerts
   
   ✓ All hitting database endpoints
```

---

## Troubleshooting Flowchart

```
                Problem?
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Can't    Tables     Login fails
    connect  don't exist with DB
        │           │           │
        ▼           ▼           ▼
    Check     Re-run      Check
    PGHOST    SQL         password_hash
    & creds   scripts     hashing
        │           │           │
        ▼           ▼           ▼
    Can't      DDL         Wrong
    connect    error?      password?
    to AWS?        │           │
        │          ▼           ▼
        │      Aurora      Review
        ▼      DSQL        seed data
    Check      docs
    security
    group
```

---

## Checklist

- [ ] Aurora DSQL cluster running
- [ ] Got PGHOST, AWS_ROLE_ARN, AWS_REGION, AWS_ACCOUNT_ID
- [ ] Added 6 env vars to Vercel
- [ ] Deployed project
- [ ] Ran SQL scripts (or waited for auto-run)
- [ ] Verified 7 tables exist
- [ ] Verified 5 demo users loaded
- [ ] Tested login with database
- [ ] ✓ Setup complete!

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| Env vars | Vercel Settings | Add 6 variables |
| SQL scripts | `/scripts/` | Run in order: 001, 002, 003, 004 |
| Test login | `/login` page | rajesh.patil@... / Password@2027 |
| Check status | AWS Query Editor | `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` |
| Debug | Vercel logs | Deployment tab → check for errors |

---

For detailed info, see:
- `AURORA_DSQL_SETUP.md` - Full setup
- `QUICK_REFERENCE.md` - TL;DR
- `SQL_SCRIPTS_REFERENCE.md` - Script details
- `SCHEMA_DIAGRAM.md` - Database structure
