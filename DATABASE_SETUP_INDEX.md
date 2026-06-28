# KumbhSafe Aurora DSQL - Complete Documentation Index

## Quick Navigation

### For Immediate Setup
1. **[SETUP_VISUAL_GUIDE.md](SETUP_VISUAL_GUIDE.md)** - Step-by-step with visuals (START HERE)
2. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - TL;DR version with all essentials

### For Understanding What You're Setting Up
3. **[SQL_SCRIPTS_REFERENCE.md](SQL_SCRIPTS_REFERENCE.md)** - What each of the 4 SQL scripts does
4. **[SCHEMA_DIAGRAM.md](SCHEMA_DIAGRAM.md)** - ER diagrams, relationships, and queries

### For Comprehensive Details
5. **[AURORA_DSQL_SETUP.md](AURORA_DSQL_SETUP.md)** - Full setup guide with all options

---

## Documentation by Role

### "I Just Want to Get Started"
→ Read: **SETUP_VISUAL_GUIDE.md** (20 min read)

Follow the flowchart and step-by-step instructions. Includes 3 methods to run SQL scripts.

### "I Need to Understand the Database"
→ Read: **SCHEMA_DIAGRAM.md** (15 min read)

See all 7 tables, their relationships, sample queries, and data flows.

### "I Want Details & Troubleshooting"
→ Read: **AURORA_DSQL_SETUP.md** (30 min read)

Full instructions for each setup method, verification queries, troubleshooting section.

### "I'm in a Hurry"
→ Read: **QUICK_REFERENCE.md** (5 min read)

TL;DR with just the essentials: env vars, 3 scripts to run, and test login.

### "I Need to Know What Each Script Does"
→ Read: **SQL_SCRIPTS_REFERENCE.md** (15 min read)

Breaks down all 4 SQL scripts line-by-line: what they create, why, and when to run them.

---

## The 4 SQL Scripts Explained

```
scripts/001-setup-users.sql (21 lines)
  ├─ Creates: users table
  ├─ Demo data: 5 accounts (Super Admin, ICCC Operator, Zone Commander, etc.)
  ├─ Indexes: email (login), role, zone_id
  └─ Run: FIRST

scripts/002-setup-zones.sql (27 lines)
  ├─ Creates: zones table
  ├─ Demo data: 3 zones (Kushavart Kund, Ramkund, Trimbakeshwar)
  ├─ Indexes: name, density_status, zone_commander
  └─ Run: SECOND

scripts/003-setup-alerts-services.sql (99 lines)
  ├─ Creates: 5 tables
  │  ├─ alerts
  │  ├─ pilgrims
  │  ├─ lost_found_cases
  │  ├─ ambulances
  │  └─ audit_logs
  ├─ Demo data: 5 ambulances, 100+ pilgrims
  ├─ Indexes: 15 total across all tables
  └─ Run: THIRD

scripts/004-seed-demo-data.sql (51 lines)
  ├─ Creates: No new tables
  ├─ Demo data: Additional test records
  ├─ Note: Optional but recommended for testing
  └─ Run: FOURTH
```

---

## Setup Methods

### 1. Auto (Easiest)
- Add env vars to Vercel
- Deploy
- Scripts run automatically
- ✓ No manual steps needed

### 2. Manual (psql)
- Install PostgreSQL client
- Run 4 psql commands
- Each runs one SQL script
- ✓ Full control, great for debugging

### 3. AWS Console (No Installation)
- Open AWS RDS Query Editor
- Copy-paste SQL scripts one by one
- Execute in browser
- ✓ No local setup required

→ See **SETUP_VISUAL_GUIDE.md** for step-by-step on each method

---

## The 7 Database Tables

| Table | Rows | Purpose |
|-------|------|---------|
| **users** | 5 | Multi-role authentication |
| **zones** | 3 | Crowd density tracking |
| **alerts** | 0 (app-created) | Incident alerts |
| **pilgrims** | 100+ | Pilgrim registry |
| **ambulances** | 5 | Emergency dispatch |
| **lost_found_cases** | 0 (app-created) | Child safety |
| **audit_logs** | 0 (app-created) | Compliance tracking |

→ See **SCHEMA_DIAGRAM.md** for full ER diagrams and relationships

---

## Demo Accounts (After Setup)

All created in SQL script 004-seed-demo-data.sql:

```
Email: rajesh.patil@kumbhsafe.gov.in
Role: Super Admin
Password: Password@2027
Access: All features

Email: operator.iccc@kumbhsafe.gov.in
Role: ICCC Operator
Password: Password@2027
Access: Dashboard, Alerts, Agents

Email: nashik.commander@kumbhsafe.gov.in
Role: Zone Commander
Password: Password@2027
Access: Dashboard, Zones, Alerts

Email: medical.officer@kumbhsafe.gov.in
Role: Medical Officer
Password: Password@2027
Access: Dashboard, Pilgrims, Ambulances

Email: field.officer@kumbhsafe.gov.in
Role: Field Officer
Password: Password@2027
Access: Dashboard, Zones
```

---

## Environment Variables Needed

These go in Vercel → Settings → Environment Variables:

```
PGHOST               = your-cluster.aurora-dsql.region.db.aws.com
PGUSER               = admin
PGDATABASE           = postgres
AWS_ROLE_ARN         = arn:aws:iam::123456789:role/your-role
AWS_REGION           = us-east-1
AWS_ACCOUNT_ID       = 123456789
```

→ See **AURORA_DSQL_SETUP.md** for how to get these values

---

## Verification Steps

After running scripts, verify with these commands:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
-- Expected: 7 rows (alerts, ambulances, audit_logs, lost_found_cases, pilgrims, users, zones)

-- Check demo users
SELECT email, role FROM users;
-- Expected: 5 demo accounts

-- Check zones
SELECT name, density_status FROM zones;
-- Expected: 3 zones

-- Check ambulances
SELECT COUNT(*) FROM ambulances;
-- Expected: 5
```

→ See **AURORA_DSQL_SETUP.md** for more verification queries

---

## Important DSQL Rules

✅ **Requirements Met:**
- UUIDs instead of SERIAL
- Async index creation
- Each DDL in own COMMIT
- Application-enforced referential integrity
- Parameterized queries
- Batch operations

❌ **Not Supported (Not Used Here):**
- Foreign keys
- Triggers
- Serial/BigSerial
- Extensions
- Array types

→ See **SCHEMA_DIAGRAM.md** for details

---

## API Routes (After Database Active)

All 8 routes become active once Aurora DSQL is configured:

```
POST   /api/auth/login              → User authentication
GET    /api/users                   → List users
POST   /api/users                   → Create user
GET    /api/zones                   → List zones
POST   /api/zones                   → Create zone
PATCH  /api/zones/:id               → Update zone
GET    /api/alerts                  → List alerts
POST   /api/alerts                  → Create alert
PATCH  /api/alerts/:id              → Update alert (acknowledge, resolve)
GET    /api/pilgrims                → List pilgrims
POST   /api/pilgrims                → Create pilgrim
GET    /api/ambulances              → List ambulances
POST   /api/ambulances              → Create ambulance
GET    /api/lost-found              → List lost/found cases
POST   /api/lost-found              → Create case
```

→ See **AURORA_DSQL_SETUP.md** in "Next Steps" section for API details

---

## File Locations in Project

```
/vercel/share/v0-project/
├── scripts/
│   ├── 001-setup-users.sql                    ← Run 1st
│   ├── 002-setup-zones.sql                    ← Run 2nd
│   ├── 003-setup-alerts-services.sql          ← Run 3rd
│   └── 004-seed-demo-data.sql                 ← Run 4th
│
├── lib/
│   ├── db.ts                                  ← Database connection (IAM auth)
│   ├── types.ts                               ← TypeScript types
│   └── auth.ts                                ← Auth logic
│
├── app/api/
│   ├── auth/login/route.ts                    ← Login endpoint
│   ├── users/route.ts
│   ├── zones/route.ts
│   ├── alerts/route.ts
│   ├── pilgrims/route.ts
│   ├── ambulances/route.ts
│   └── lost-found/route.ts
│
├── DATABASE_SETUP_INDEX.md                    ← This file (navigation)
├── SETUP_VISUAL_GUIDE.md                      ← Step-by-step with visuals
├── QUICK_REFERENCE.md                         ← TL;DR quick start
├── AURORA_DSQL_SETUP.md                       ← Comprehensive guide
├── SQL_SCRIPTS_REFERENCE.md                   ← Script details
└── SCHEMA_DIAGRAM.md                          ← ER diagrams & queries
```

---

## Recommended Reading Order

**First Time Setup:**
1. Start: `SETUP_VISUAL_GUIDE.md` (10-20 min)
2. Reference: `QUICK_REFERENCE.md` during setup (2 min)
3. Troubleshoot: `AURORA_DSQL_SETUP.md` if issues (10 min)
4. Understand: `SCHEMA_DIAGRAM.md` after working (15 min)
5. Details: `SQL_SCRIPTS_REFERENCE.md` as needed (10 min)

**Debugging/Understanding:**
1. `SCHEMA_DIAGRAM.md` - See data structure
2. `SQL_SCRIPTS_REFERENCE.md` - Understand what was created
3. `AURORA_DSQL_SETUP.md` - Find troubleshooting section

**Quick Lookup:**
1. `QUICK_REFERENCE.md` - Quick copy-paste
2. `SCHEMA_DIAGRAM.md` - Query samples
3. `SETUP_VISUAL_GUIDE.md` - Step by step

---

## Common Questions

### "Where do I start?"
→ Read: **SETUP_VISUAL_GUIDE.md**, follow the flowchart

### "How do I run the SQL scripts?"
→ See: **SETUP_VISUAL_GUIDE.md**, Step 3 (3 methods shown)

### "What do the scripts create?"
→ See: **SQL_SCRIPTS_REFERENCE.md**

### "I'm getting an error"
→ See: **AURORA_DSQL_SETUP.md**, Troubleshooting section

### "What are the database relationships?"
→ See: **SCHEMA_DIAGRAM.md**, ER diagrams

### "How do I verify setup worked?"
→ See: **AURORA_DSQL_SETUP.md**, Step 5

### "How do I test the app with the database?"
→ See: **SETUP_VISUAL_GUIDE.md**, Step 6

### "What are the demo login credentials?"
→ See: **QUICK_REFERENCE.md**, Demo Accounts section

---

## Still Have Questions?

1. **Setup Issues** → `AURORA_DSQL_SETUP.md` Troubleshooting
2. **Schema Questions** → `SCHEMA_DIAGRAM.md` 
3. **Script Details** → `SQL_SCRIPTS_REFERENCE.md`
4. **Lost?** → `QUICK_REFERENCE.md`

---

## Version & Status

- **Status**: ✓ Production Ready
- **Version**: 1.0
- **Last Updated**: 2026-06-28
- **Aurora DSQL**: Fully Compatible
- **Vercel**: Fully Integrated

All SQL scripts are DSQL-compliant with:
- Async indexes
- Application-enforced referential integrity
- Proper transaction scoping
- UUID identifiers
- Full audit logging

---

**Ready to set up? Start with [SETUP_VISUAL_GUIDE.md](SETUP_VISUAL_GUIDE.md)**
