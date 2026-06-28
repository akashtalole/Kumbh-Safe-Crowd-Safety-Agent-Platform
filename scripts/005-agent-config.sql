-- Agent configuration and invocation log tables for KumbhSafe AgentCore integration
-- Run after: 004-seed-demo-data.sql

-- Agent configuration (source of truth for all 6 Bedrock AgentCore agents)
CREATE TABLE IF NOT EXISTS agent_config (
    agent_id                VARCHAR(64) PRIMARY KEY,
    name                    VARCHAR(128) NOT NULL,
    role                    TEXT NOT NULL,
    is_enabled              BOOLEAN NOT NULL DEFAULT true,
    model_id                VARCHAR(128) NOT NULL DEFAULT 'amazon.nova-pro-v1:0',
    max_tokens              INTEGER NOT NULL DEFAULT 4096,
    temperature             NUMERIC(3,2) NOT NULL DEFAULT 0.1,
    system_prompt           TEXT,
    tools                   TEXT[],
    invoke_interval_seconds INTEGER,
    bedrock_agent_id        VARCHAR(64),
    bedrock_agent_alias_id  VARCHAR(64),
    updated_by              UUID REFERENCES users(id),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invocation audit log (written by Next.js API after each agent call)
CREATE TABLE IF NOT EXISTS agent_invocation_logs (
    log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        VARCHAR(64) NOT NULL,
    agent_name      VARCHAR(128) NOT NULL,
    action_taken    TEXT NOT NULL,
    zone_affected   VARCHAR(128),
    duration_ms     INTEGER,
    result          VARCHAR(32) CHECK (result IN ('success', 'alert', 'error')),
    session_id      VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id  ON agent_invocation_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_invocation_logs (created_at DESC);

-- Seed the 6 KumbhSafe agents
-- Replace bedrock_agent_id and bedrock_agent_alias_id with real values after CDK deploy
INSERT INTO agent_config
    (agent_id, name, role, is_enabled, model_id, tools, invoke_interval_seconds, bedrock_agent_id, bedrock_agent_alias_id)
VALUES
    (
        'crowd_sentinel',
        'CrowdSentinel',
        'Real-time crowd density monitoring. Reads zone density every 30 seconds. Raises alerts and holds zones when density exceeds RED/BLACK thresholds. Enforces the Kushavart hard cap (1,900 persons).',
        true,
        'amazon.nova-pro-v1:0',
        ARRAY['read_zone_density','get_all_zones_summary','write_alert','hold_zone_entry','send_pilgrim_sms'],
        30,
        '',  -- set to real Bedrock Agent ID after deploy
        'TSTALIASID'
    ),
    (
        'route_oracle',
        'RouteOracle',
        'Safe route calculation and pilgrim rerouting. Triggered by ZONE_RED and ZONE_BLACK events. Calculates alternative routes and sends rerouting SMS to pilgrims in congested zones.',
        true,
        'amazon.nova-pro-v1:0',
        ARRAY['get_all_zones_summary','get_safe_routes','write_alert','send_pilgrim_sms'],
        NULL,
        '',
        'TSTALIASID'
    ),
    (
        'flood_watch',
        'FloodWatch',
        'Godavari river level monitoring and flood alert. Checks water levels every 5 minutes. Updates ghat statuses and issues flood warnings when thresholds are exceeded.',
        true,
        'amazon.nova-pro-v1:0',
        ARRAY['get_godavari_level','get_imd_forecast','update_ghat_status','write_alert','send_pilgrim_sms'],
        300,
        '',
        'TSTALIASID'
    ),
    (
        'med_evac',
        'MedEvac',
        'Medical emergency coordination and ambulance dispatch. Responds to SOS events within 8 seconds. Dispatches ambulances, creates green corridors, and coordinates with police.',
        true,
        'amazon.nova-pro-v1:0',
        ARRAY['get_available_ambulances','dispatch_ambulance','create_green_corridor','send_sos_response','write_alert'],
        NULL,
        '',
        'TSTALIASID'
    ),
    (
        'lost_connect',
        'LostConnect',
        'Lost person identification and family reconnection. Uses Rekognition facial recognition and QR wristband lookup. Prioritises children under 12 and elderly above 70.',
        true,
        'amazon.nova-pro-v1:0',
        ARRAY['search_pilgrim_by_face','get_pilgrim_by_qr','create_lost_found_case','send_sms_to_reporter','write_alert'],
        NULL,
        '',
        'TSTALIASID'
    ),
    (
        'command_bridge',
        'CommandBridge',
        'Master orchestrator. Coordinates cross-city incidents, invokes specialist agents, and manages simultaneous multi-zone emergencies. Escalates to NDRF and ORG_ADMIN when required.',
        true,
        'amazon.nova-pro-v1:0',
        ARRAY['invoke_child_agent','get_all_zones_summary','write_alert','send_pilgrim_sms'],
        NULL,
        '',
        'TSTALIASID'
    )
ON CONFLICT (agent_id) DO UPDATE SET
    name                    = EXCLUDED.name,
    role                    = EXCLUDED.role,
    model_id                = EXCLUDED.model_id,
    tools                   = EXCLUDED.tools,
    invoke_interval_seconds = EXCLUDED.invoke_interval_seconds,
    updated_at              = NOW();
