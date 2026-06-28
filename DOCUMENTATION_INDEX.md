# KumbhSafe Documentation Index

Welcome! Here's how to navigate the documentation for the KumbhSafe ICCC application.

## 📋 Quick Navigation

### 👤 I'm a **New User** — I want to...

**Start the app and see it working**
→ Go to [README.md](./README.md) → "Quick Start" section

**Understand what the app does**
→ Go to [README.md](./README.md) → "Features" section

**Test with demo accounts**
→ Go to [README.md](./README.md) → "Demo Accounts" table

### 👨‍💻 I'm a **Developer** — I want to...

**Understand the project structure**
→ Go to [README.md](./README.md) → "Architecture" section

**Set up the database**
→ Go to [SETUP.md](./SETUP.md) → Complete guide included

**Migrate from mock data to real DB**
→ Go to [SETUP.md](./SETUP.md) → "Activating Database" section

**Understand the API endpoints**
→ Go to [SETUP.md](./SETUP.md) → "API Reference" section  
OR  
→ Go to [DATABASE.md](./DATABASE.md) → Full endpoint documentation

**See the database schema**
→ Go to [DATABASE.md](./DATABASE.md) → "Schema Overview" section

**Find example code**
→ Go to [DATABASE.md](./DATABASE.md) → Code examples in each section

**Troubleshoot an issue**
→ Go to [SETUP.md](./SETUP.md) → "Troubleshooting" section  
OR  
→ Go to [DATABASE.md](./DATABASE.md) → "Common Issues" section

### 🏗️ I'm an **Architect** — I want to...

**See the complete project scope**
→ Go to [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → "What's Been Delivered" section

**Understand technical decisions**
→ Go to [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → "Key Decisions" section

**Review what's production-ready**
→ Go to [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → "Current Functionality" section

**Plan next steps**
→ Go to [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → "What's Next" section

### 📊 I'm a **Manager** — I want to...

**Executive summary of the project**
→ Go to [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → "Project Status" section

**See what features exist**
→ Go to [README.md](./README.md) → "Features" section

**Understand the timeline**
→ Go to [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → "Current Status" (top)

**Know about deployment**
→ Go to [README.md](./README.md) → "Deployment" section

---

## 📄 Document Overview

### [README.md](./README.md) — START HERE

**Purpose**: Feature overview, quick start, and high-level architecture

**Contains**:
- Feature list with descriptions
- Installation & running locally
- Demo account credentials
- Technology stack
- Project structure (directory tree)
- Database setup overview
- Deployment instructions
- Troubleshooting FAQ

**Read this if**: You're new to the project, want features overview, or need quick start.

**Time to read**: 10–15 minutes

---

### [SETUP.md](./SETUP.md) — Database & Migration

**Purpose**: Complete database setup and migration guide from mock data to production

**Contains**:
- Current status summary
- Quick start with mock data (demo accounts)
- Aurora DSQL setup prerequisites
- Environment variables needed
- Schema setup instructions
- Migration guide (mock → real database)
- Full API reference with examples
- Testing procedures
- Troubleshooting with solutions

**Read this if**: You need to set up Aurora DSQL, migrate to real DB, or understand API endpoints.

**Time to read**: 20–30 minutes

---

### [DATABASE.md](./DATABASE.md) — Schema & Architecture

**Purpose**: Deep dive into database schema, connection handling, and technical details

**Contains**:
- Aurora DSQL connection architecture
- Token refresh mechanism
- Complete schema design (7 tables)
- Transaction limits & batch sizing
- Data type conversions (DSQL ↔ JavaScript)
- Relationship model (how tables connect)
- RLS patterns (if needed)
- Performance optimization
- Common issues & solutions

**Read this if**: You're implementing features, debugging queries, or understanding database internals.

**Time to read**: 20–25 minutes

---

### [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — Complete Project Overview

**Purpose**: Executive summary of everything that's been built

**Contains**:
- Project status (COMPLETE ✅)
- Full feature list with checkmarks
- Technical stack summary
- File structure with descriptions
- Dependencies list
- Performance targets
- Deployment checklist
- What's next (roadmap)
- Key design decisions
- Conclusion & readiness

**Read this if**: You want a comprehensive overview, need documentation for stakeholders, or planning next phases.

**Time to read**: 15–20 minutes

---

## 🎯 Common Workflows

### Workflow: "I want to run the app locally"

1. **README.md** → "Quick Start" section
   - Install dependencies: `pnpm install`
   - Run dev server: `pnpm dev`
   - Open browser to `localhost:3000`

2. **Use demo accounts** from README.md table
   - Click auto-fill cards on login page
   - Explore all features

3. **To use real database**: See next workflow

### Workflow: "I want to connect Aurora DSQL"

1. **SETUP.md** → "Database Setup" section
   - Read prerequisites
   - Provision Aurora DSQL in AWS

2. **SETUP.md** → Set environment variables
   - Add `PGHOST`, `AWS_ROLE_ARN`, `AWS_REGION` to Vercel

3. **SETUP.md** → "Running the Schema Setup"
   - Run SQL scripts against your DSQL cluster
   - Verify data seed completed

4. **SETUP.md** → "Activating Database" section
   - Update page imports (replace ZONES with API calls)
   - Update API handlers if needed
   - Test with `curl` commands provided

### Workflow: "I found a bug in an API endpoint"

1. **Check the endpoint** in `app/api/*/route.ts`

2. **Read DATABASE.md** → "Schema Overview"
   - Understand table structure & columns

3. **See transaction limits** in DATABASE.md
   - Check if batch size is causing issues

4. **Use troubleshooting checklist**:
   - Are env vars set in Vercel?
   - Is the DSQL cluster running?
   - Check console logs with `[v0]` prefix

5. **SETUP.md** → "Troubleshooting" for common issues

### Workflow: "I need to add a new feature"

1. **Determine what data you need** in DATABASE.md → "Schema Overview"

2. **Check if table exists**:
   - Zone detail? → `zones` table
   - Pilgrim data? → `pilgrims` table
   - Emergency alert? → `alerts` table

3. **Create API endpoint** in `app/api/*/route.ts`
   - Follow existing patterns (parameterized queries)
   - Add error handling

4. **Create UI page** or component
   - Import and use API endpoint
   - Handle loading & error states

5. **Test locally** with mock data first
   - Update `lib/mock-data.ts` if needed
   - Test all flows

6. **Test with real DB**
   - Switch to API calls
   - Verify database changes

### Workflow: "I need to understand a component"

1. **Find the file** in project structure (README.md)

2. **Check TypeScript types** in `lib/types.ts`
   - Understand what props it receives

3. **Look for usage examples** in other components

4. **Read inline code comments** in the component

---

## 🔍 Finding Things Fast

### "Where's the login logic?"
→ `components/login-page.tsx` (UI)  
→ `lib/auth.ts` (Auth context & DEMO_USERS)  
→ `app/api/auth/login/route.ts` (API endpoint)

### "Where's the dashboard?"
→ `app/dashboard/page.tsx` (Main page)  
→ `components/ZoneHeatmap.tsx` (Zone visualization)  
→ `components/AlertFeed.tsx` (Alert feed)

### "Where are the demo accounts?"
→ `lib/auth.ts` → `DEMO_USERS` array

### "Where's the database schema?"
→ `scripts/001-*.sql`, `002-*.sql`, etc.  
→ DATABASE.md → "Schema Overview" section

### "Where are the API endpoints?"
→ `app/api/*/route.ts` files  
→ SETUP.md → "API Reference" section

### "Where's the type definitions?"
→ `lib/types.ts` (Database types)  
→ TypeScript interfaces throughout codebase

### "Where are the colors & tokens?"
→ `lib/utils.ts` → `STATUS_COLORS`, `SEVERITY_COLORS`  
→ Cloudscape tokens in components (automatic)

### "Where's styling configured?"
→ `tailwind.config.js` (Tailwind)  
→ `app/globals.css` (Global CSS)  
→ Component inline `className` (Tailwind classes)

### "Where's the mock data?"
→ `lib/mock-data.ts` (All demo data)

### "Where do I configure the app?"
→ `app/settings/page.tsx` (UI)  
→ `.env.local` (Environment variables)  
→ `next.config.mjs` (Build config)

---

## 🆘 Help & Support

### "The app won't start"
→ See README.md → "Troubleshooting" section

### "Database API returns 500 error"
→ See SETUP.md → "Troubleshooting" section

### "I don't understand the schema"
→ See DATABASE.md → "Schema Overview" with diagrams

### "How do I add a new user role?"
→ See lib/auth.ts → DEMO_USERS and ROLE_PERMISSIONS

### "How do I deploy?"
→ See README.md → "Deployment" section

### "How do I test an API?"
→ See SETUP.md → "Testing" section with curl commands

### "I need to understand transactions"
→ See DATABASE.md → "Transaction Limits & Batch Operations"

---

## 📚 Reading Order (By Role)

### For New Developers
1. README.md (30 min) — Features, quick start, structure
2. SETUP.md (15 min) — API reference and DB setup
3. DATABASE.md (20 min) — Schema deep dive
4. Code exploration (1 hour) — Browse `/app/api` and components

### For Backend Engineers
1. DATABASE.md (20 min) — Schema, connections, transactions
2. SETUP.md (10 min) — Database setup
3. `app/api/` (1 hour) — Review all endpoints
4. `lib/db.ts` (30 min) — Connection pool & auth

### For Frontend Engineers
1. README.md (15 min) — Features and structure
2. `components/` (1 hour) — Review all components
3. `app/*/page.tsx` (1 hour) — Review all pages
4. Cloudscape docs (30 min) — Component reference

### For Project Managers
1. PROJECT_SUMMARY.md (15 min) — Status & overview
2. README.md (10 min) — Features & deployment
3. SETUP.md (5 min) — Database setup summary

### For DevOps/Infrastructure
1. DATABASE.md (20 min) — Aurora DSQL architecture
2. SETUP.md (15 min) — Environment setup
3. README.md (5 min) — Deployment section
4. `scripts/` (30 min) — SQL schema review

---

## 💾 File Reference

| File | Purpose | Location |
|------|---------|----------|
| README.md | Features & quick start | Root |
| SETUP.md | Database setup guide | Root |
| DATABASE.md | Schema & technical details | Root |
| PROJECT_SUMMARY.md | Complete overview | Root |
| DOCUMENTATION_INDEX.md | This file | Root |
| lib/auth.ts | Auth context & roles | `lib/` |
| lib/db.ts | Database connection | `lib/` |
| lib/types.ts | Type definitions | `lib/` |
| lib/mock-data.ts | Demo data | `lib/` |
| app/api/auth/login/route.ts | Login API | `app/api/` |
| app/dashboard/page.tsx | Dashboard page | `app/dashboard/` |
| components/kumbh-shell.tsx | App layout | `components/` |
| scripts/001-setup-users.sql | User table schema | `scripts/` |

---

## ✅ Verification Checklist

When working with KumbhSafe, use this checklist:

- [ ] I've read README.md (know what the app does)
- [ ] I've run `pnpm install` and `pnpm dev` (app works locally)
- [ ] I've tested login with a demo account (auth works)
- [ ] I've explored at least 3 pages (UI is familiar)
- [ ] I know where the database schema is (scripts/)
- [ ] I know how to call an API endpoint (SETUP.md)
- [ ] I know what my role permissions are (lib/auth.ts)
- [ ] I know where to add a new feature (app/api/ or components/)
- [ ] I've read the troubleshooting section (know where to look)
- [ ] I know how to deploy (README.md → Deployment)

---

## 🚀 Quick Links

- **Start app**: `pnpm dev` then `localhost:3000/login`
- **View schema**: `scripts/001-*.sql` through `004-*.sql`
- **API endpoints**: `app/api/*/route.ts`
- **Demo data**: `lib/mock-data.ts`
- **User roles**: `lib/auth.ts` → `ROLE_PERMISSIONS`
- **Components**: `components/` directory
- **Database docs**: [DATABASE.md](./DATABASE.md)
- **Setup guide**: [SETUP.md](./SETUP.md)

---

**Last Updated**: June 28, 2026  
**Version**: 1.0 (Production Ready)  
**Status**: ✅ Complete & Ready to Deploy
