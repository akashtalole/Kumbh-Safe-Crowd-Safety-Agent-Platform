import { query } from '@/lib/db'
import { LostFoundCase } from '@/lib/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const caseType = searchParams.get('caseType')
    const status = searchParams.get('status')
    const zoneId = searchParams.get('zoneId')

    let sql = 'SELECT * FROM lost_found_cases WHERE 1=1'
    const params: any[] = []

    if (caseType) {
      sql += ' AND case_type = $' + (params.length + 1)
      params.push(caseType)
    }

    if (status) {
      sql += ' AND status = $' + (params.length + 1)
      params.push(status)
    }

    if (zoneId) {
      sql += ' AND zone_id = $' + (params.length + 1)
      params.push(zoneId)
    }

    sql += ' ORDER BY created_at DESC LIMIT 100'

    const result = await query(sql, params)
    return Response.json({ cases: result.rows })
  } catch (error) {
    console.error('[v0] GET /api/lost-found error:', error)
    return Response.json({ error: 'Failed to fetch lost/found cases' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { case_type, description, pilgrim_id, zone_id, handler_id } = body

    if (!case_type || !description) {
      return Response.json({ error: 'case_type and description are required' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO lost_found_cases (case_type, description, pilgrim_id, zone_id, handler_id, status) VALUES ($1, $2, $3, $4, $5, \'OPEN\') RETURNING *',
      [case_type, description, pilgrim_id || null, zone_id || null, handler_id || null]
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/lost-found error:', error)
    return Response.json({ error: 'Failed to create lost/found case' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { caseId, status } = body

    if (!caseId || !status) {
      return Response.json({ error: 'caseId and status are required' }, { status: 400 })
    }

    const result = await query(
      'UPDATE lost_found_cases SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, caseId]
    )

    if (result.rows.length === 0) {
      return Response.json({ error: 'Case not found' }, { status: 404 })
    }

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('[v0] PATCH /api/lost-found error:', error)
    return Response.json({ error: 'Failed to update case' }, { status: 500 })
  }
}
