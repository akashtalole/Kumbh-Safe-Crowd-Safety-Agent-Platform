# KumbhSafe — Architecture Document

> **Platform:** Real-time crowd safety intelligence for Nashik Simhastha Kumbh Mela 2027  
> **Scale:** 80 million pilgrims · 22.5 million peak single day · 12 zones · 2 cities · Monsoon season  
> **Stack:** AWS DynamoDB · Aurora DSQL · Bedrock AgentCore · Strands Agents · Vercel · Cloudscape

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Crowd Density Data Pipeline](#3-crowd-density-data-pipeline)
4. [Multi-Agent Orchestration](#4-multi-agent-orchestration)
5. [Agent Invocation Sequence](#5-agent-invocation-sequence)
6. [Aurora DSQL Schema](#6-aurora-dsql-schema)
7. [DynamoDB Access Patterns](#7-dynamodb-access-patterns)
8. [Authentication & RBAC Flow](#8-authentication--rbac-flow)
9. [Zone Status State Machine](#9-zone-status-state-machine)
10. [Alert Lifecycle](#10-alert-lifecycle)
11. [Pilgrim SOS Emergency Flow](#11-pilgrim-sos-emergency-flow)
12. [Platform Configuration Flow](#12-platform-configuration-flow)
13. [AWS CDK Deployment Order](#13-aws-cdk-deployment-order)
14. [Multi-Region Failover](#14-multi-region-failover)
15. [Event Bus Routing](#15-event-bus-routing)
16. [API Request Lifecycle](#16-api-request-lifecycle)

---

## 1. System Overview

KumbhSafe operates across two simultaneous command centres — Nashik (Ramkund ghats) and Trimbakeshwar (Kushavart Kund) — 30 km apart via a single mountain road. The platform ingests real-time crowd density from IoT sensors and CCTV, processes it through six Strands-powered agents deployed on AWS Bedrock AgentCore, and surfaces actionable intelligence to 7 user roles through a Cloudscape dashboard deployed on Vercel.

**The three failure modes that must never happen:**
- Kushavart Kund exceeding 1,900 persons without an immediate entry hold
- A critical alert not reaching NDRF within 60 seconds
- CrowdSentinel silently failing during active bathing hours (0600–2200 IST)

All three are protected by hard-coded rules in stream processors — not dependent on AI agent availability.

---

## 2. High-Level Architecture

```mermaid
graph LR
    subgraph CLIENT["Client Layer"]
        FE["Vercel + Next.js 14\nCloudscape Design System"]
        MOB["Mobile / SMS / WhatsApp\n6 languages"]
        IOT["IoT Sensors + CCTV\nRekognition density"]
    end

    subgraph AUTH["Auth Layer"]
        COG["AWS Cognito\nUser Pools + JWT"]
        RBAC["Lambda Authorizer\nRBAC permission check"]
    end

    subgraph API["API Layer"]
        APIGW["API Gateway\nREST — 40+ routes"]
        APPSYNC["AppSync\nGraphQL subscriptions"]
    end

    subgraph COMPUTE["Compute — Lambda Node.js 20.x"]
        ZL["zones/"]
        AL["alerts/"]
        PL["pilgrims/"]
        ADM["admin/"]
        AGT["agents/"]
    end

    subgraph DATA["Data Layer"]
        DDB["DynamoDB\n8 tables · Streams · on-demand"]
        AURORA["Aurora DSQL\nPostgreSQL · active-active\nap-south-1 + ap-southeast-1"]
    end

    subgraph EVENTS["Event Layer"]
        STREAMS["DynamoDB Streams\nzone · alert · pilgrim · incident"]
        EB["EventBridge\nCrowdSentinel 30s\nFloodWatch 5min"]
        SNS["SNS Topics\ncritical · sms · ndrf · medical"]
        SQS["SQS\nagent task queue"]
    end

    subgraph AGENTS["Agents — Bedrock AgentCore + Strands"]
        CB["CommandBridge\norchestrator"]
        CS["CrowdSentinel"]
        RO["RouteOracle"]
        FW["FloodWatch"]
        ME["MedEvac"]
        LC["LostConnect"]
    end

    subgraph INGEST["Ingestion Layer"]
        KIN["Kinesis\niot-stream · cctv-stream"]
        S3["S3\nphotos · reports"]
        REK["Rekognition\ncrowd density\nfacial recognition"]
    end

    IOT --> KIN
    KIN --> COMPUTE
    FE --> COG --> RBAC --> APIGW --> COMPUTE
    MOB --> APIGW
    COMPUTE --> DDB
    COMPUTE --> AURORA
    DDB --> STREAMS --> EVENTS
    EB --> AGENTS
    AGENTS --> DDB
    AGENTS --> SNS
    DDB --> APPSYNC --> FE
    S3 --> REK --> KIN
```

---

## 3. Crowd Density Data Pipeline

This pipeline runs continuously — every 30 seconds during active hours, ingesting sensor and camera data, computing zone density, and pushing live updates to every connected ICCC operator dashboard.

```mermaid
sequenceDiagram
    participant CCTV as CCTV / Drone
    participant REK as AWS Rekognition
    participant KIN as Kinesis Stream
    participant PROC as cctv-processor Lambda
    participant DDB as DynamoDB zones
    participant STREAM as DynamoDB Stream
    participant ZLAM as zone-stream Lambda
    participant EB as EventBridge
    participant AGENT as CrowdSentinel Agent
    participant APPSYNC as AppSync
    participant FE as ICCC Dashboard

    CCTV->>REK: Video frame (every 30s per zone)
    REK-->>KIN: {zoneId, personCount, confidence, timestamp}
    KIN->>PROC: Batch of density records
    PROC->>PROC: Calculate density = personCount / area_sqm
    PROC->>PROC: getDensityStatus(density, zoneConfig)

    alt Kushavart Kund special rule
        PROC->>PROC: if currentCount > 1900 → status = BLACK
    end

    PROC->>DDB: PutItem {zoneId, "LATEST", density, status, count}
    PROC->>DDB: PutItem {zoneId, timestamp, density, status, ttl=7days}

    DDB->>STREAM: NEW_AND_OLD_IMAGES stream record
    STREAM->>ZLAM: Trigger

    ZLAM->>ZLAM: Skip if SK != "LATEST"
    ZLAM->>ZLAM: Check Kushavart hard cap rule

    alt Status changed to RED or BLACK
        ZLAM->>EB: Publish ZONE_RED or ZONE_BLACK event
        EB->>AGENT: Invoke CrowdSentinel with task
        AGENT->>DDB: write_alert(zoneId, "crowd_surge", "critical")
        AGENT->>DDB: hold_zone_entry(zoneId, reason)
        AGENT->>SNS: send_pilgrim_sms(trigger="zone_black", zoneIds)
    end

    ZLAM->>APPSYNC: Mutation updateZone(zone data)
    APPSYNC->>FE: onZoneUpdate subscription push
    FE->>FE: Update density heatmap in real time
```

---

## 4. Multi-Agent Orchestration

CommandBridge is the orchestrating agent. It has one tool no other agent has: `invoke_child_agent`. All specialist agents are stateless — they read from DynamoDB, write to DynamoDB, and publish to SNS. They share a common tool library from `shared/dynamo_tools.py`.

```mermaid
graph TD
    EB["EventBridge\nScheduled + Event triggers"]

    subgraph ORCHESTRATOR["CommandBridge — Master Coordinator"]
        CB_IN["Receives: zone RED/BLACK events\ncritical alerts\ncross-city conflicts"]
        CB_TOOL["Tool: invoke_child_agent\nTool: broadcast_alert\nTool: write_alert"]
        CB_DEC["Decision: which agents to activate\nwhich cities need coordination\npriority ranking of incidents"]
    end

    subgraph SPECIALISTS["Specialist Agents (Strands · amazon.nova-pro-v1:0)"]
        CS["CrowdSentinel\nTools: read_zone_density\nget_all_zones_summary\nwrite_alert · hold_zone_entry\nsend_pilgrim_sms\n\nTrigger: every 30s via EventBridge"]

        RO["RouteOracle\nTools: get_all_zones_summary\nget_safe_routes\nwrite_alert · send_pilgrim_sms\n\nTrigger: ZONE_RED/BLACK event"]

        FW["FloodWatch\nTools: get_godavari_level\nget_imd_forecast\nupdate_ghat_status\nwrite_alert · send_pilgrim_sms\n\nTrigger: every 5min EventBridge"]

        ME["MedEvac\nTools: get_available_ambulances\ndispatch_ambulance\nwrite_alert · send_sos_response\ncreate_green_corridor\n\nTrigger: SOS event or MEDICAL alert"]

        LC["LostConnect\nTools: search_pilgrim_by_face\nget_pilgrim_by_qr\ncreate_lost_found_case\nsend_sms_to_reporter\n\nTrigger: new lost-found case"]
    end

    subgraph SHARED["Shared Tool Library (shared/dynamo_tools.py)"]
        T1["read_zone_density(zone_id)"]
        T2["write_alert(zone_id, type, severity, ...)"]
        T3["hold_zone_entry(zone_id, reason)"]
        T4["send_pilgrim_sms(trigger, zone_ids, context)"]
        T5["get_godavari_level()"]
        T6["update_ghat_status(ghat_id, status)"]
        T7["get_available_ambulances(city)"]
        T8["dispatch_ambulance(vehicle_id, incident_id)"]
    end

    DDB[(DynamoDB\n8 tables)]
    SNS[SNS Topics\npilgrim-sms · ndrf-webhook\nmedical-alerts · critical-alerts]
    AURORA[(Aurora DSQL\nzone_config · notification_templates)]

    EB -->|"30s schedule"| CS
    EB -->|"5min schedule"| FW
    EB -->|"ZONE_RED/BLACK event"| CB_IN

    CB_IN --> CB_DEC
    CB_DEC --> CB_TOOL
    CB_TOOL -->|"invoke_child_agent('route_oracle', task)"| RO
    CB_TOOL -->|"invoke_child_agent('med_evac', task)"| ME
    CB_TOOL -->|"invoke_child_agent('crowd_sentinel', task)"| CS

    CS --> T1 & T2 & T3 & T4
    RO --> T1 & T4
    FW --> T5 & T6 & T2 & T4
    ME --> T7 & T8 & T2
    LC --> T2 & T4

    T1 & T2 & T3 & T5 & T6 & T7 & T8 --> DDB
    T4 --> SNS
    CS & FW & RO --> AURORA
```

---

## 5. Agent Invocation Sequence

Shows the full path from EventBridge trigger → Bedrock AgentCore → Strands agent → tool execution → DynamoDB write → alert stream → ICCC notification.

```mermaid
sequenceDiagram
    participant EB as EventBridge
    participant LAMBDA as Agent Lambda Handler
    participant BEDROCK as Bedrock AgentCore
    participant STRANDS as Strands Agent (Python)
    participant TOOL as Tool: write_alert
    participant DDB as DynamoDB kumbhsafe-alerts
    participant ASTREAM as alert-stream Lambda
    participant SNS as SNS critical-alerts
    participant APPSYNC as AppSync
    participant ICCC as ICCC Dashboard
    participant NDRF as NDRF Webhook

    EB->>LAMBDA: Scheduled trigger {task: "Check all zones"}
    LAMBDA->>BEDROCK: InvokeAgent(agentId, sessionId, inputText)
    BEDROCK->>STRANDS: Execute with system_prompt + tools

    loop Agent reasoning cycle
        STRANDS->>STRANDS: Plan next action
        STRANDS->>TOOL: Call write_alert(zone_kushavart_core, stampede, critical, ...)
        TOOL->>DDB: PutItem new alert
        DDB-->>TOOL: {alertId: "uuid"}
        TOOL-->>STRANDS: {alertId, created: true}
        STRANDS->>STRANDS: Continue or finish
    end

    STRANDS-->>BEDROCK: Final response text
    BEDROCK-->>LAMBDA: Streaming completion chunks
    LAMBDA->>DDB: Write to kumbhsafe-agent-log

    DDB->>ASTREAM: Stream record (alert INSERT)
    ASTREAM->>ASTREAM: severity == "critical" → trigger NDRF
    ASTREAM->>SNS: Publish to kumbhsafe-critical-alerts
    ASTREAM->>NDRF: POST webhook (HMAC signed)
    ASTREAM->>APPSYNC: Mutation onAlertCreated

    SNS-->>ICCC: Push notification to all ICCC_OPERATOR + POLICE_COORDINATOR
    APPSYNC-->>ICCC: WebSocket push → Flashbar alert
    ICCC->>ICCC: Sound alarm · Update alert feed · Show SOP checklist
```

---

## 6. Aurora DSQL Schema

Complete entity-relationship diagram for all Aurora DSQL tables. Aurora DSQL is the source of truth for platform configuration, user management, audit history, and all relational data.

```mermaid
erDiagram
    organizations {
        uuid org_id PK
        varchar name
        varchar slug UK
        varchar type
        varchar city
        varchar contact_email
        boolean is_active
        jsonb config
        timestamptz created_at
    }

    users {
        uuid user_id PK
        varchar cognito_sub UK
        uuid org_id FK
        varchar email UK
        varchar full_name
        varchar role
        varchar city_access
        boolean is_active
        timestamptz last_login_at
        boolean force_password_reset
        jsonb preferences
        uuid created_by FK
        timestamptz deactivated_at
    }

    platform_config {
        varchar config_key PK
        jsonb config_value
        varchar description
        boolean is_sensitive
        timestamptz updated_at
        uuid updated_by FK
    }

    zone_config {
        varchar zone_id PK
        varchar name
        varchar city
        integer capacity
        numeric area_sqm
        numeric yellow_threshold
        numeric red_threshold
        numeric black_threshold
        boolean auto_hold_enabled
        numeric auto_hold_at
        integer max_persons_override
        boolean is_active
        numeric lat
        numeric lng
    }

    alert_rules {
        uuid rule_id PK
        varchar name
        varchar trigger_type
        jsonb conditions
        varchar alert_type
        varchar severity
        boolean auto_notify
        varchar notify_roles
        uuid sop_template_id FK
        boolean is_active
        uuid created_by FK
    }

    sop_templates {
        uuid template_id PK
        varchar name
        varchar alert_type
        varchar severity
        jsonb steps
        integer estimated_duration_minutes
        boolean is_active
    }

    notification_templates {
        uuid template_id PK
        varchar name
        varchar type
        varchar language
        varchar event_trigger
        text body_template
        integer char_count
        boolean is_active
    }

    audit_logs {
        uuid log_id PK
        uuid user_id FK
        uuid org_id FK
        varchar action
        varchar resource_type
        varchar resource_id
        jsonb old_value
        jsonb new_value
        varchar ip_address
        varchar result
        timestamptz created_at
    }

    agent_config {
        varchar agent_id PK
        varchar name
        text role
        boolean is_enabled
        varchar model_id
        integer max_tokens
        numeric temperature
        text system_prompt
        varchar tools
        integer invoke_interval_seconds
        varchar bedrock_agent_id
        varchar bedrock_agent_alias_id
        uuid updated_by FK
    }

    api_keys {
        uuid key_id PK
        varchar name
        varchar key_hash UK
        varchar key_prefix
        uuid org_id FK
        varchar scopes
        timestamptz expires_at
        timestamptz last_used_at
        boolean is_active
        uuid created_by FK
        uuid revoked_by FK
    }

    organizations ||--o{ users : "has many"
    organizations ||--o{ api_keys : "owns"
    organizations ||--o{ audit_logs : "generates"
    users ||--o{ audit_logs : "creates"
    users ||--o{ platform_config : "updates"
    users ||--o{ agent_config : "configures"
    users }o--|| users : "created_by"
    alert_rules }o--|| sop_templates : "uses"
    alert_rules }o--|| users : "created_by"
```

---

## 7. DynamoDB Access Patterns

All DynamoDB tables use separate table design (not single-table) for domain clarity. The `LATEST` SK pattern enables both current-state reads and time-series queries from the same table.

```mermaid
graph TD
    subgraph ZONES["kumbhsafe-zones"]
        Z_PK["PK: zoneId"]
        Z_SK["SK: 'LATEST' | ISO timestamp"]
        Z_GSI1["GSI-1: city-status-index\nPK: city · SK: status"]
        Z_GSI2["GSI-2: status-timestamp-index\nPK: status · SK: timestamp"]
        Z_USE1["→ Get current zone state"]
        Z_USE2["→ List all RED zones in nashik"]
        Z_USE3["→ Zone density history last 6h"]
    end

    subgraph ALERTS["kumbhsafe-alerts"]
        A_PK["PK: alertId (UUID)"]
        A_SK["SK: createdAt (ISO)"]
        A_GSI1["GSI-1: status-createdAt\nPK: status · SK: createdAt"]
        A_GSI2["GSI-2: severity-createdAt\nPK: severity · SK: createdAt"]
        A_GSI3["GSI-3: zoneId-createdAt\nPK: zoneId · SK: createdAt"]
        A_GSI4["GSI-4: city-severity\nPK: city · SK: severity"]
        A_USE1["→ List open alerts newest first"]
        A_USE2["→ All critical alerts"]
        A_USE3["→ Alerts for one zone"]
        A_USE4["→ Critical alerts in Nashik"]
    end

    subgraph PILGRIMS["kumbhsafe-pilgrims"]
        P_PK["PK: pilgrimId"]
        P_SK["SK: registeredAt"]
        P_GSI1["GSI-1: phone-index\nPK: phone"]
        P_GSI2["GSI-2: qrCode-index\nPK: qrCode"]
        P_GSI3["GSI-3: currentZone-index\nPK: currentZoneId"]
        P_GSI4["GSI-4: status-index\nPK: status · SK: registeredAt"]
        P_USE1["→ Lookup by phone (SMS registration)"]
        P_USE2["→ Lookup by QR wristband scan"]
        P_USE3["→ Count persons in zone"]
        P_USE4["→ List all lost pilgrims"]
    end

    subgraph LOSTFOUND["kumbhsafe-lostfound"]
        LF_PK["PK: caseId"]
        LF_SK["SK: reportedAt"]
        LF_GSI1["GSI-1: status-reportedAt\nPK: status · SK: reportedAt"]
        LF_GSI2["GSI-2: city-status\nPK: city · SK: status"]
        LF_USE1["→ List open cases newest first"]
        LF_USE2["→ Open cases in Trimbakeshwar"]
    end

    subgraph PATTERN["Write Pattern — Zones + Ghats"]
        WP1["Sensor data arrives"]
        WP2["Write 1: PutItem\nPK: zoneId · SK: 'LATEST'\nOverwrites previous current state"]
        WP3["Write 2: PutItem\nPK: zoneId · SK: ISO timestamp\nTime-series snapshot\nTTL: now + 7 days"]
        WP4["Stream triggers\non LATEST item changes only"]

        WP1 --> WP2
        WP1 --> WP3
        WP2 --> WP4
    end
```

---

## 8. Authentication & RBAC Flow

Every API request goes through Cognito JWT verification followed by a permission check against the RBAC matrix. The user's `city_access` attribute adds an extra data-level filter on top of permission checks.

```mermaid
sequenceDiagram
    participant CLIENT as Client (Browser / App)
    participant APIGW as API Gateway
    participant AUTHZ as Lambda Authorizer
    participant COGNITO as Cognito JWKS
    participant RBAC as @kumbhsafe/rbac
    participant HANDLER as Route Lambda Handler
    participant AURORA as Aurora DSQL
    participant DDB as DynamoDB

    CLIENT->>APIGW: GET /zones?city=nashik\nAuthorization: Bearer {JWT}

    APIGW->>AUTHZ: Invoke authorizer with token

    AUTHZ->>COGNITO: Fetch JWKS (cached 10 min)
    COGNITO-->>AUTHZ: Public keys

    AUTHZ->>AUTHZ: jwt.verify(token, jwks)
    Note over AUTHZ: Extracts: sub, email,\ncustom:orgId, custom:role,\ncustom:city_access

    AUTHZ->>RBAC: hasPermission(role, "zone:read")

    alt Permission denied
        AUTHZ-->>APIGW: DENY policy
        APIGW-->>CLIENT: 403 Forbidden
    else Permission granted
        AUTHZ-->>APIGW: ALLOW policy + auth context
        APIGW->>HANDLER: Invoke with auth context
    end

    HANDLER->>HANDLER: Extract city_access from context

    alt city_access == "nashik"
        HANDLER->>DDB: Query zones WHERE city = "nashik"
        Note over HANDLER: Trimbakeshwar data\nnever returned
    else city_access == "both"
        HANDLER->>DDB: Query all zones
    end

    DDB-->>HANDLER: Zone records

    HANDLER->>AURORA: INSERT audit_log\n(user_id, action, resource_type, result)

    HANDLER-->>CLIENT: 200 { success: true, data: zones[] }
```

---

## 9. Zone Status State Machine

Zone status transitions are driven by crowd density thresholds defined in `zone_config` per zone (not global). Kushavart Kund has custom lower thresholds. Some transitions require human authorization; others are automatic.

```mermaid
stateDiagram-v2
    [*] --> GREEN : Zone initialised

    GREEN --> YELLOW : density > yellow_threshold\n(default 4.5 p/m²)\nAuto: increase monitoring\nLog observation

    YELLOW --> GREEN : density drops below green_max\nAuto: resume normal monitoring

    YELLOW --> RED : density > red_threshold\n(default 6.5 p/m²)\nAuto: create HIGH alert\nNotify ICCC + Police\nSend reroute SMS

    RED --> YELLOW : density drops to yellow range\nAuto: update status\nCancel active reroutes

    RED --> BLACK : density > black_threshold\n(default 6.5 p/m²)\nOR Kushavart count > 1900\nAuto: create CRITICAL alert\nActivate entry hold\nNotify NDRF\nInvoke RouteOracle\nInvoke MedEvac standby

    BLACK --> RED : density drops below black_threshold\nAND count < max_persons_override\nRequires: ICCC_OPERATOR manual release\nNot automatic

    BLACK --> CLOSED : Manual declaration\nRequires: ICCC_OPERATOR or ORG_ADMIN\nEntry completely stopped\nEvacuation protocol active

    CLOSED --> RED : Requires: ORG_ADMIN authorization\nSafety clearance confirmed\nStaggered re-entry only

    RED --> CLOSED : Incident escalation\nFire / Stampede / Flood\nRequires: ICCC_OPERATOR

    note right of BLACK
        Hard rules in zone-stream Lambda
        (not dependent on AI agent):
        — Auto-hold on BLACK
        — NDRF webhook on CRITICAL
        — Kushavart: count > 1900 = BLACK
    end note
```

---

## 10. Alert Lifecycle

Alerts are immutable once created. Only `status`, `acknowledgedBy`, `acknowledgedAt`, `assignedTo`, `resolvedBy`, `resolvedAt` can be updated after creation. The `alertId`, `type`, `severity`, `createdAt`, `agentSource`, and `zoneId` are locked.

```mermaid
stateDiagram-v2
    [*] --> OPEN : Alert created\nBy agent or manual\nSOP attached\nNotifications sent

    OPEN --> ACKNOWLEDGED : ICCC_OPERATOR or POLICE_COORDINATOR\nclicks Acknowledge\nTimestamp + userId recorded

    OPEN --> ESCALATED : severity bumped\ne.g. HIGH → CRITICAL\nRe-notifies broader role set\nAdditional NDRF trigger if critical

    ACKNOWLEDGED --> RESPONDING : Responders assigned\nVehicles dispatched\nTimeline entry created

    ACKNOWLEDGED --> ESCALATED : Situation worsens\nno improvement in 5 min

    RESPONDING --> RESOLVED : Situation contained\nICCC_OPERATOR or POLICE records\nresolution notes\nTimestamp recorded

    RESPONDING --> ESCALATED : Escalation required\nmore resources needed

    ESCALATED --> ACKNOWLEDGED : Escalation reviewed\nAdditional resources assigned

    RESOLVED --> [*] : Alert closed\nAudit log written\nZone status review triggered\nIncident report generated

    note right of OPEN
        On CRITICAL severity:
        — SNS → kumbhsafe-critical-alerts
        — SNS → kumbhsafe-ndrf-webhook
        — AppSync → onAlertCreated
        — Flashbar on all ICCC dashboards
    end note
```

---

## 11. Pilgrim SOS Emergency Flow

A pilgrim in distress triggers SOS via mobile app, SMS shortcode (*555), or QR wristband scan at a help kiosk. MedEvac agent must dispatch an ambulance and confirm response within 8 seconds.

```mermaid
sequenceDiagram
    participant PIL as Pilgrim (mobile/SMS)
    participant SNS_IN as SNS SOS Inbound
    participant LAMBDA as sos-handler Lambda
    participant DDB_PIL as DynamoDB pilgrims
    participant DDB_AMB as DynamoDB ambulances
    participant DDB_INC as DynamoDB incidents
    participant AGENT as MedEvac Agent
    participant POLICE as Police Coordinator API
    participant DDB_ALT as DynamoDB alerts
    participant STREAM as alert-stream Lambda
    participant SNS_OUT as SNS medical-alerts
    participant FE as ICCC Dashboard
    participant PIL_SMS as Pilgrim SMS Response

    PIL->>SNS_IN: SOS trigger\n{pilgrimId or phone, lat, lng, type}

    SNS_IN->>LAMBDA: Invoke sos-handler

    LAMBDA->>DDB_PIL: GetItem by phone GSI
    DDB_PIL-->>LAMBDA: Pilgrim record {name, language, currentZone, healthNote}

    LAMBDA->>DDB_AMB: Query city-status-index\nstatus=available, city=pilgrim.city
    DDB_AMB-->>LAMBDA: Available ambulances sorted by proximity

    LAMBDA->>DDB_INC: PutItem new incident\n{type: medical, zone, status: open}
    LAMBDA->>DDB_AMB: UpdateItem vehicle\n{status: dispatched, assignedIncident}
    LAMBDA->>DDB_ALT: PutItem new alert\n{type: medical, severity: high, agentSource: MedEvac}

    LAMBDA->>AGENT: Invoke MedEvac\n{task: "Coordinate response for SOS at zone_X"}
    AGENT->>POLICE: create_green_corridor(vehicleId, route)
    AGENT->>DDB_INC: Add responders + ETA to incident timeline
    AGENT-->>LAMBDA: {ambulanceCallSign, eta, instructions}

    DDB_ALT->>STREAM: Alert INSERT stream record
    STREAM->>SNS_OUT: Publish to kumbhsafe-medical-alerts
    SNS_OUT-->>FE: Push to Medical Staff + ICCC dashboard

    LAMBDA->>PIL_SMS: Send response in pilgrim's language\n"Help is coming. Ambulance AMB-NK-003\narrives in 6 minutes. Stay in place."

    Note over PIL_SMS: Message sent in\npilgrim's registered language\n(Marathi / Hindi / Gujarati etc.)
```

---

## 12. Platform Configuration Flow

The Super Admin controls the entire platform through Aurora DSQL configuration tables. Changes propagate to all Lambdas within 60 seconds via a DynamoDB config cache layer.

```mermaid
flowchart TD
    SA["Super Admin\nfirst deploy bootstrap\nscripts/create-super-admin.ts"]

    subgraph BOOTSTRAP["One-time Bootstrap (run once)"]
        B1["Create NTKMA org\nin Aurora organizations"]
        B2["Create Cognito user\nrole=SUPER_ADMIN\ncustom:orgId, custom:role"]
        B3["Seed platform_config\n28 default keys\nthresholds · features · intervals"]
        B4["Seed zone_config\n12 zones with\ncustom thresholds\nKushavart: max_persons=1900"]
        B5["Seed agent_config\n6 agents with\nmodel IDs + system prompts"]
        B6["Seed sop_templates\n7 alert types × 4 severities"]
        B7["Seed notification_templates\n6 triggers × 6 languages = 36 rows"]
    end

    subgraph ONGOING["Ongoing Super Admin Operations"]
        C1["PUT /admin/config/:key\nChange any platform setting"]
        C2["PUT /admin/zones/config/:zoneId\nAdjust zone thresholds\ncapacity · auto-hold density"]
        C3["PUT /admin/agent-config/:agentId\nChange model · prompt · interval\nenable / disable agent"]
        C4["POST /admin/orgs\nCreate new organization\n+ first ORG_ADMIN user"]
        C5["POST /admin/notification-templates\nAdd / edit SMS templates\nper language + trigger"]
        C6["GET /admin/audit\nView all platform changes\nExport CSV"]
    end

    subgraph PROPAGATION["Config Hot-Reload (< 60 seconds)"]
        P1["Aurora platform_config\nrow updated"]
        P2["EventBridge rule detects\nconfig table change"]
        P3["Lambda writes changed key\nto kumbhsafe-config-cache\nDynamoDB table"]
        P4["All Lambda functions\npoll config-cache on each invocation\n60s in-memory TTL"]
        P5["Configuration active\nacross all 40+ functions"]
    end

    SA --> BOOTSTRAP
    B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7

    SA --> ONGOING
    C1 & C2 & C3 --> P1
    P1 --> P2 --> P3 --> P4 --> P5

    subgraph ORG_ADMIN_FLOW["ORG_ADMIN Creates New User"]
        U1["POST /admin/users\n{email, role, city_access}"]
        U2["Validate: target role\nmust be <= caller's role"]
        U3["Aurora BEGIN transaction\nINSERT users row"]
        U4["Cognito adminCreateUser\nwith custom attributes"]
        U5["Cognito sends welcome email\ntemporary password"]
        U6["ROLLBACK Aurora\nif Cognito fails"]
        U7["Write audit_log\naction: user.create"]
        U1 --> U2 --> U3 --> U4
        U4 -->|success| U5
        U4 -->|failure| U6
        U5 --> U7
    end
```

---

## 13. AWS CDK Deployment Order

Stacks have explicit dependencies. Deploy in order — each stack exports values consumed by subsequent stacks.

```mermaid
graph TD
    COG["CognitoStack\nUser Pool · App Clients\nCustom attributes"]
    DDB["DynamoDBStack\n8 tables · GSIs\nStreams · TTL"]
    AURORA["AuroraStack\nDSQL cluster\nap-south-1 + ap-southeast-1\nIAM auth configured"]
    S3["S3Stack\nMedia bucket · Reports bucket\nCORS · Lifecycle rules"]
    LAMBDA["LambdaStack\nAll 40+ handlers\nIAM roles attached\nEnv vars from SSM"]
    APIGW["ApiGatewayStack\nREST API\nCognito authorizer\nWAF + rate limiting"]
    APPSYNC["AppSyncStack\nGraphQL schema\nDynamoDB data sources\nSubscription resolvers"]
    KIN["KinesisStack\niot-stream · cctv-stream\nLambda consumers"]
    EB["EventBridgeStack\nCrowdSentinel 30s rule\nFloodWatch 5min rule\nSafety event bus"]
    BEDROCK["BedrockStack\n6 AgentCore runtimes\nStrands agent code deployed\nIAM + tool permissions"]
    MON["MonitoringStack\nCloudWatch dashboards\nAlarm: agent watchdog 90s\nX-Ray tracing\nCost anomaly alerts"]

    COG --> LAMBDA
    DDB --> LAMBDA
    AURORA --> LAMBDA
    S3 --> LAMBDA
    LAMBDA --> APIGW
    DDB --> APPSYNC
    LAMBDA --> APPSYNC
    LAMBDA --> KIN
    LAMBDA --> EB
    LAMBDA --> BEDROCK
    APIGW --> MON
    APPSYNC --> MON
    BEDROCK --> MON
    KIN --> MON
    EB --> MON
```

**Post-deploy bootstrap (run in order):**

```mermaid
graph LR
    S1["Run Aurora migrations\npnpm db:migrate"] --> S2
    S2["Seed Aurora\npnpm seed:aurora\norgs · config · templates"] --> S3
    S3["Seed DynamoDB\npnpm seed:dynamo\n12 zones · 5 ghats\nmock ambulances"] --> S4
    S4["Create Super Admin\npnpm create:super-admin\n-- email admin@ntkma.gov.in"] --> S5
    S5["Deploy agent prompts\npnpm agents:deploy\nUpload system_prompt.txt\nto each AgentCore runtime"] --> S6
    S6["Run smoke tests\npnpm test:smoke\nVerify all 40+ routes\nVerify 6 agents respond"] --> DONE["Platform ready"]
```

---

## 14. Multi-Region Failover

Aurora DSQL provides active-active replication across two regions. DynamoDB uses global tables for cross-region replication of operational data. The frontend on Vercel serves from edge nodes globally.

```mermaid
graph LR
    subgraph PRIMARY["Primary: ap-south-1 (Mumbai)"]
        API1["API Gateway"]
        LAM1["Lambda Functions"]
        DDB1["DynamoDB\n(primary)"]
        AURORA1["Aurora DSQL\n(primary write)"]
        AGT1["Bedrock AgentCore"]
        KIN1["Kinesis Streams"]
    end

    subgraph DR["DR: ap-southeast-1 (Singapore)"]
        API2["API Gateway\n(warm standby)"]
        LAM2["Lambda Functions\n(warm standby)"]
        DDB2["DynamoDB Global Table\n(replica)"]
        AURORA2["Aurora DSQL\n(active-active)"]
        AGT2["Bedrock AgentCore\n(failover)"]
    end

    subgraph EDGE["Edge / Global"]
        R53["Route53 Health Checks\n+ Failover routing"]
        CF["CloudFront\nFrontend CDN\nVercel edge nodes"]
    end

    DDB1 <-->|"Global Table\nreplication < 1s"| DDB2
    AURORA1 <-->|"Active-active\nRPO: 0\nRTO: < 60s"| AURORA2

    R53 -->|"Primary healthy"| API1
    R53 -->|"Primary fails\nauto-failover < 60s"| API2

    CF --> R53

    API1 --> LAM1 --> DDB1 & AURORA1 & AGT1 & KIN1
    API2 --> LAM2 --> DDB2 & AURORA2 & AGT2
```

---

## 15. Event Bus Routing

All asynchronous events flow through EventBridge as the central message broker. Each event type has a defined pattern and one or more Lambda targets.

```mermaid
graph TD
    subgraph SOURCES["Event Sources"]
        SRC1["DynamoDB zone-stream Lambda"]
        SRC2["DynamoDB alert-stream Lambda"]
        SRC3["Agent Lambda functions"]
        SRC4["EventBridge Scheduler"]
        SRC5["API Gateway (manual triggers)"]
    end

    subgraph BUS["EventBridge — kumbhsafe-safety-events"]
        E1["ZONE_RED\n{zoneId, city, density}"]
        E2["ZONE_BLACK\n{zoneId, city, density, count}"]
        E3["GHAT_CLOSED\n{ghatId, city, waterLevel}"]
        E4["FLOOD_ALERT\n{city, ghatIds, forecastMm}"]
        E5["AGENT_FAILED\n{agentId, lastInvokedAt}"]
    end

    subgraph TARGETS["Lambda Targets"]
        T1["RouteOracle Agent Handler\nTriggered by: ZONE_RED, ZONE_BLACK"]
        T2["MedEvac Agent Handler\nTriggered by: ZONE_BLACK"]
        T3["CommandBridge Agent Handler\nTriggered by: all events"]
        T4["Admin Notification Lambda\nTriggered by: AGENT_FAILED"]
        T5["FloodWatch Agent Handler\nScheduled: every 5 min"]
        T6["CrowdSentinel Agent Handler\nScheduled: every 30s (active hours)"]
    end

    subgraph SNS_OUT["SNS Fan-out"]
        SNS1["kumbhsafe-critical-alerts → SQS → ICCC"]
        SNS2["kumbhsafe-pilgrim-sms → Pinpoint → Pilgrim phones"]
        SNS3["kumbhsafe-ndrf-webhook → Lambda → NDRF API"]
        SNS4["kumbhsafe-medical-alerts → SQS → Medical Staff"]
        SNS5["kumbhsafe-admin-notifications → Email → Super Admin"]
    end

    SRC1 -->|"status changed"| E1 & E2
    SRC1 -->|"ghat status"| E3
    SRC3 -->|"flood detected"| E4
    SRC3 -->|"watchdog alarm"| E5
    SRC4 -->|"30s schedule"| T6
    SRC4 -->|"5min schedule"| T5

    E1 --> T1 & T3
    E2 --> T1 & T2 & T3
    E3 & E4 --> T3
    E5 --> T4

    T1 & T2 & T3 --> SNS1 & SNS2 & SNS3 & SNS4
    T4 --> SNS5
```

---

## 16. API Request Lifecycle

Complete lifecycle of a PATCH request to hold a zone — from client click to DynamoDB write to real-time dashboard update.

```mermaid
sequenceDiagram
    participant OP as ICCC Operator
    participant FE as Next.js Frontend
    participant APIGW as API Gateway
    participant AUTH as Lambda Authorizer
    participant HANDLER as zones/hold Lambda
    participant RBAC as @kumbhsafe/rbac
    participant AURORA_CFG as Aurora zone_config
    participant DDB as DynamoDB zones
    participant AUDIT as Aurora audit_logs
    participant STREAM as zone-stream Lambda
    participant APPSYNC as AppSync
    participant OTHER as Other Operator Dashboards

    OP->>FE: Click "Hold entry" on Ramkund Main Ghat
    FE->>APIGW: POST /zones/zone_ramkund_main/hold\nAuthorization: Bearer {JWT}

    APIGW->>AUTH: Validate token
    AUTH->>AUTH: jwt.verify + decode claims
    AUTH->>RBAC: hasPermission("ICCC_OPERATOR", "zone:hold")
    RBAC-->>AUTH: true
    AUTH->>AUTH: city_access="both" → pass through
    AUTH-->>APIGW: ALLOW + {userId, orgId, role, city}

    APIGW->>HANDLER: Invoke with auth context

    HANDLER->>AURORA_CFG: SELECT * FROM zone_config WHERE zone_id = $1
    AURORA_CFG-->>HANDLER: {capacity, auto_hold_enabled, police_zone_code, ...}

    HANDLER->>HANDLER: Validate: zone exists, not already held
    HANDLER->>HANDLER: Build update expression

    HANDLER->>DDB: UpdateItem\nPK: zone_ramkund_main · SK: LATEST\nSET isHeld=true, heldBy=userId, heldAt=now, heldReason="Manual hold"

    DDB-->>HANDLER: Success

    HANDLER->>AUDIT: INSERT audit_logs\n{userId, orgId, action="zone.hold",\nresource_type="zone", resource_id="zone_ramkund_main",\nold_value={isHeld:false}, new_value={isHeld:true}}

    HANDLER-->>APIGW: 200 {success: true, data: {zoneId, isHeld: true}}
    APIGW-->>FE: 200 Response

    FE->>FE: Optimistic UI: show HELD badge on zone card

    DDB->>STREAM: DynamoDB Stream record (zone LATEST modified)
    STREAM->>STREAM: isHeld changed false→true: publish hold event
    STREAM->>APPSYNC: Mutation updateZone({isHeld: true, ...})
    APPSYNC->>OTHER: onZoneUpdate subscription push
    OTHER->>OTHER: All dashboards show HELD badge\n(no refresh needed)

    Note over OP,OTHER: Total time: ~400ms\nAll 12 ICCC operators see\nthe hold in real time
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Primary DB for real-time | DynamoDB | 200K writes/hr burst, sub-10ms latency, no capacity planning |
| Config / relational DB | Aurora DSQL | SQL joins, active-active multi-region, zero RPO for config data |
| Agent framework | Strands + Bedrock AgentCore | Managed runtime, no cold starts, native tool-use, Python ecosystem |
| Real-time push | AppSync subscriptions | WebSocket built-in, DynamoDB resolver, no polling |
| Ingestion | Kinesis | Ordered, replay-capable, scales to millions of sensor events/hr |
| Frontend | Vercel + Cloudscape | Cloudscape: AWS-native operational UI patterns; Vercel: zero-config deploy |
| Multi-user auth | Cognito + custom attributes | Managed JWT lifecycle, orgId + role + city in token claims |
| Audit trail | Aurora (append-only) | Immutable, SQL-queryable, cross-joined with user/org data, exportable |
| Agent invocation | EventBridge schedule | Decoupled, retry-capable, catchup on Lambda failures, no tight Lambda→Lambda coupling |
| Safety rules | Stream Lambda (not agents) | Hard rules cannot depend on AI availability. Kushavart cap + NDRF notify are code, not prompts |

---

*Document version: 1.0 · Platform: KumbhSafe · Event: Nashik Simhastha Kumbh Mela 2027*  
