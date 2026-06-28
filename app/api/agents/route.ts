import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { AGENTS, AGENT_LOGS } from '@/lib/mock-data'

/**
 * GET /api/agents
 * Returns agent status from Aurora DSQL agent_config table.
 * Falls back to mock data if the table doesn't exist yet.
 */
export async function GET() {
  try {
    const agentsResult = await query(`
      SELECT
        agent_id,
        name,
        role,
        is_enabled,
        model_id,
        system_prompt,
        tools,
        invoke_interval_seconds,
        bedrock_agent_id,
        bedrock_agent_alias_id,
        updated_at
      FROM agent_config
      ORDER BY name
    `)

    const logsResult = await query(`
      SELECT
        log_id,
        agent_id,
        agent_name,
        action_taken,
        zone_affected,
        duration_ms,
        result,
        created_at
      FROM agent_invocation_logs
      ORDER BY created_at DESC
      LIMIT 50
    `)

    const agents = agentsResult.rows.map((r) => ({
      agentId: r.agent_id,
      name: r.name,
      role: r.role,
      status: r.is_enabled ? 'active' : 'idle',
      lastAction: 'Awaiting next scheduled invocation',
      lastActionTime: r.updated_at,
      invocationsToday: 0,
      alertsRaised: 0,
      model: r.model_id,
      averageResponseMs: 0,
      toolsUsed: Array.isArray(r.tools) ? r.tools : (r.tools ? String(r.tools).split(',') : []),
      bedrockAgentId: r.bedrock_agent_id,
      bedrockAgentAliasId: r.bedrock_agent_alias_id,
    }))

    const logs = logsResult.rows.map((r) => ({
      logId: r.log_id,
      timestamp: r.created_at,
      agentName: r.agent_name,
      actionTaken: r.action_taken,
      zoneAffected: r.zone_affected || '—',
      durationMs: r.duration_ms || 0,
      result: r.result,
    }))

    return NextResponse.json({ agents, logs })
  } catch {
    // Aurora table may not exist during development — return mock data with a flag
    const agents = AGENTS.map((a) => ({
      ...a,
      bedrockAgentId: process.env[`BEDROCK_AGENT_ID_${a.agentId.toUpperCase()}`] || '',
      bedrockAgentAliasId: process.env[`BEDROCK_AGENT_ALIAS_ID_${a.agentId.toUpperCase()}`] || 'TSTALIASID',
    }))
    return NextResponse.json({ agents, logs: AGENT_LOGS, _source: 'mock' })
  }
}
