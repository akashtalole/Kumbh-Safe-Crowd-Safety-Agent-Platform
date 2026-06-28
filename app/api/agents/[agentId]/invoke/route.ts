import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { invokeAgentStreaming } from '@/lib/bedrock'
import { query } from '@/lib/db'

interface Params {
  params: Promise<{ agentId: string }>
}

/**
 * POST /api/agents/[agentId]/invoke
 * Body: { task: string, sessionId?: string }
 *
 * Looks up bedrock_agent_id and bedrock_agent_alias_id from Aurora agent_config,
 * then streams the Bedrock AgentCore response back as Server-Sent Events.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { agentId } = await params
  const body = await request.json().catch(() => ({}))
  const task: string = body.task || 'Perform your standard monitoring check and report status.'
  const sessionId: string = body.sessionId || randomUUID()

  // Resolve Bedrock agent IDs — prefer Aurora, fall back to env vars
  let bedrockAgentId = ''
  let bedrockAgentAliasId = 'TSTALIASID'

  try {
    const result = await query(
      'SELECT bedrock_agent_id, bedrock_agent_alias_id FROM agent_config WHERE agent_id = $1',
      [agentId],
    )
    if (result.rows.length > 0) {
      bedrockAgentId = result.rows[0].bedrock_agent_id || ''
      bedrockAgentAliasId = result.rows[0].bedrock_agent_alias_id || 'TSTALIASID'
    }
  } catch {
    // Aurora not available — fall through to env var lookup
  }

  if (!bedrockAgentId) {
    const envKey = `BEDROCK_AGENT_ID_${agentId.toUpperCase().replace(/-/g, '_')}`
    bedrockAgentId = process.env[envKey] || ''
  }
  if (!bedrockAgentId) {
    const envAliasKey = `BEDROCK_AGENT_ALIAS_ID_${agentId.toUpperCase().replace(/-/g, '_')}`
    bedrockAgentAliasId = process.env[envAliasKey] || bedrockAgentAliasId
  }

  // If no real Bedrock agent ID is configured, return a simulated response (dev/demo mode)
  if (!bedrockAgentId) {
    return simulatedResponse(agentId, task)
  }

  // Stream real Bedrock AgentCore response as SSE
  const encoder = new TextEncoder()
  const start = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of invokeAgentStreaming(bedrockAgentId, bedrockAgentAliasId, sessionId, task)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
        }
        const durationMs = Date.now() - start
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, durationMs, sessionId })}\n\n`))

        // Log invocation to Aurora (best-effort)
        logInvocation(agentId, task, durationMs, 'success').catch(() => {})
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        logInvocation(agentId, task, Date.now() - start, 'error').catch(() => {})
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function logInvocation(agentId: string, task: string, durationMs: number, result: string) {
  await query(
    `INSERT INTO agent_invocation_logs
       (log_id, agent_id, agent_name, action_taken, duration_ms, result, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [randomUUID(), agentId, agentId, task.slice(0, 200), durationMs, result],
  )
}

/** Returns a realistic simulated SSE stream when no real Bedrock agent is configured. */
function simulatedResponse(agentId: string, task: string): NextResponse {
  const AGENT_PERSONAS: Record<string, string[]> = {
    crowd_sentinel: [
      'Initialising crowd density scan across all 12 zones...',
      'Querying DynamoDB: kumbhsafe-zones (LATEST records)...',
      'Zone z-001 Ramkund Main Ghat: density 6.8 p/m² · status RED · count 4,100',
      'Zone z-004 Ahilya Ghat: density 5.5 p/m² · status YELLOW · count 2,800',
      'Calling tool: write_alert(z-001, crowd_surge, high, "Ramkund density at 6.8 p/m²")',
      'Alert created: alert_id=uuid-001 · severity=high · status=open',
      'Calling tool: send_pilgrim_sms(trigger=zone_red, zoneIds=[z-001], ...)',
      'SMS dispatched to ~1,200 registered pilgrims in Ramkund zone.',
      '',
      'ASSESSMENT: 1 RED zone (Ramkund Main Ghat), 2 YELLOW zones under monitoring.',
      'No BLACK zones detected. Kushavart Kund count 1,240 — within safe limit.',
      'Next scan in 30 seconds.',
    ],
    route_oracle: [
      'Received ZONE_RED event for zone z-001 Ramkund Main Ghat, city=nashik...',
      'Querying safe route alternatives from z-001...',
      'Route 1: Ramkund → Sunder Narayan Ghat · 1.2km · 14 min · density GREEN',
      'Route 2: Ramkund → Godavari Bridge East · 0.8km · 10 min · density YELLOW',
      'Route 3: Ramkund → Ahilya Ghat bypass · 1.8km · 22 min · density GREEN',
      'Calling tool: send_pilgrim_sms(trigger=route_change, ...)',
      'Route guidance SMS sent to 1,200 pilgrims in Ramkund zone.',
      '',
      'RECOMMENDATION: Divert via Godavari Bridge East (shortest). Sunder Narayan as overflow.',
      'Estimated diversion capacity: 3,400 persons. Monitoring in progress.',
    ],
    flood_watch: [
      'Checking Godavari water levels at all monitored ghats...',
      'Ramkund Ghat: 2.1m · stable · bathing allowed',
      'Ahilya Ghat: 2.4m · rising · bathing allowed',
      'Sunder Narayan Ghat: 2.6m · rising · bathing allowed',
      'Fetching IMD forecast for Nashik district...',
      'IMD forecast: 42mm expected in next 3 hours · flood risk = MODERATE',
      'All ghats within safe thresholds (< 3.0m).',
      'Calling tool: update_ghat_status(ahilya_ghat, caution, true)',
      '',
      'ASSESSMENT: Rising trend at 2 ghats. No immediate closures required.',
      'If IMD forecast exceeds 80mm, Kushavart Kund will require pre-emptive closure.',
      'Next check in 5 minutes.',
    ],
    med_evac: [
      'Medical emergency received. Querying available ambulances in nashik...',
      'Available: AMB-NK-003 (0.4km), AMB-NK-007 (1.1km), AMB-NK-012 (2.3km)',
      'Calling tool: dispatch_ambulance(AMB-NK-003, incident_uuid)',
      'Ambulance AMB-NK-003 dispatched · ETA: 4 minutes',
      'Calling tool: create_green_corridor(AMB-NK-003, "Via Ramkund Road → Ghat Entry 3")',
      'Green corridor requested · Police coordinator notified',
      'Calling tool: send_sos_response(pilgrim_uuid, "मदद आ रही है। एम्बुलेंस 4 मिनट में पहुंचेगी।", AMB-NK-003, 4)',
      'SOS response sent to pilgrim in Hindi.',
      '',
      'RESPONSE COMPLETE: AMB-NK-003 en route · 4 min ETA · Green corridor active.',
      'ICCC notified. Medical officer alerted.',
    ],
    lost_connect: [
      'New lost person case received. Initiating search...',
      'Calling tool: search_pilgrim_by_face(photo_s3_key=cases/uuid/photo.jpg)',
      'Rekognition search: 3 potential matches found',
      'Match 1: pilgrim_id=PIL-4421 · confidence=94.2% · current zone z-003',
      'Match 2: pilgrim_id=PIL-8812 · confidence=87.6% · zone z-001',
      'Match 3: pilgrim_id=PIL-2203 · confidence=81.1% · zone z-005',
      'Top match PIL-4421 (94.2%) — Suresh Kumar, age 67, phone +91-98XXXXXX',
      'Calling tool: send_sms_to_reporter(+91-94XXXXXX, "We found a match...")',
      'Reunification SMS sent to reporter in Marathi.',
      '',
      'MATCH FOUND: PIL-4421 located at Ramkund West Corridor.',
      'Family notified. ICCC operator to confirm physical reunification.',
    ],
    command_bridge: [
      'ZONE_BLACK event received from EventBridge.',
      'Calling get_all_zones_summary() — assessing full situational picture...',
      'Nashik: 1 BLACK, 1 RED, 2 YELLOW · Trimbakeshwar: 2 GREEN, 1 YELLOW',
      'Calling invoke_child_agent(crowd_sentinel, "Confirm Kushavart count and hold status")',
      'CrowdSentinel: Kushavart count 1,842 — approaching hard cap (1,900). Hold activated.',
      'Calling invoke_child_agent(route_oracle, "Reroute pilgrims from BLACK zone")',
      'RouteOracle: 3 alternative routes identified, SMS dispatched to 2,400 pilgrims.',
      'Calling invoke_child_agent(med_evac, "Place MedEvac on standby for BLACK zone")',
      'MedEvac: 2 ambulances pre-positioned at Ramkund staging area.',
      'Calling tool: write_alert(zone_black, stampede_risk, critical, ...)',
      'CRITICAL alert created · NDRF notification triggered · ICCC flashbar active',
      '',
      'COMMAND SUMMARY: BLACK zone contained. Entry hold active. 3 agents deployed.',
      'NDRF alerted. Situation under active management. Escalate to ORG_ADMIN if count reaches 1,900.',
    ],
  }

  const lines = AGENT_PERSONAS[agentId] || [
    `[${agentId}] Received task: "${task}"`,
    'Processing...',
    'Task completed successfully.',
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const line of lines) {
        const text = line === '' ? '\n' : `${line}\n`
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`))
        await new Promise((r) => setTimeout(r, 180))
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true, durationMs: lines.length * 180, sessionId: randomUUID(), _simulated: true })}\n\n`)
      )
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
