import { query, withConnection } from '@/lib/db'
import { Alert } from '@/lib/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const zoneId = searchParams.get('zoneId')
    const limit = parseInt(searchParams.get('limit') || '50')

    let sql = 'SELECT * FROM alerts WHERE 1=1'
    const params: any[] = []

    if (status) {
      sql += ' AND status = $' + (params.length + 1)
      params.push(status)
    }

    if (severity) {
      sql += ' AND severity = $' + (params.length + 1)
      params.push(severity)
    }

    if (zoneId) {
      sql += ' AND zone_id = $' + (params.length + 1)
      params.push(zoneId)
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1)
    params.push(limit)

    const result = await query(sql, params)
    return Response.json({ alerts: result.rows })
  } catch (error) {
    console.error('[v0] GET /api/alerts error:', error)
    return Response.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { zone_id, alert_type, severity, message } = body

    if (!zone_id || !alert_type || !severity || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO alerts (zone_id, alert_type, severity, message, status) VALUES ($1, $2, $3, $4, \'OPEN\') RETURNING *',
      [zone_id, alert_type, severity, message]
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/alerts error:', error)
    return Response.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { alertId, action, userId } = body

    if (!alertId || !action) {
      return Response.json({ error: 'Missing alertId or action' }, { status: 400 })
    }

    return await withConnection(async (client) => {
      if (action === 'acknowledge') {
        await client.query(
          'UPDATE alerts SET status = \'ACKNOWLEDGED\', acknowledged_by = $1, acknowledged_at = now(), updated_at = now() WHERE id = $2',
          [userId, alertId]
        )
      } else if (action === 'escalate') {
        await client.query(
          'UPDATE alerts SET status = \'ESCALATED\', updated_at = now() WHERE id = $1',
          [alertId]
        )
      } else if (action === 'resolve') {
        await client.query(
          'UPDATE alerts SET status = \'RESOLVED\', resolved_by = $1, resolved_at = now(), updated_at = now() WHERE id = $2',
          [userId, alertId]
        )
      }

      const result = await client.query('SELECT * FROM alerts WHERE id = $1', [alertId])
      return Response.json(result.rows[0])
    })
  } catch (error) {
    console.error('[v0] PATCH /api/alerts error:', error)
    return Response.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
