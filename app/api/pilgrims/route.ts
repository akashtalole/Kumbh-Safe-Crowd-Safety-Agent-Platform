import { query } from '@/lib/db'
import { Pilgrim } from '@/lib/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const zoneId = searchParams.get('zoneId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let sql = 'SELECT * FROM pilgrims WHERE 1=1'
    const params: any[] = []

    if (zoneId) {
      sql += ' AND zone_id = $' + (params.length + 1)
      params.push(zoneId)
    }

    if (status) {
      sql += ' AND status = $' + (params.length + 1)
      params.push(status)
    }

    if (search) {
      sql += ' AND (name ILIKE $' + (params.length + 1) + ' OR registration_id ILIKE $' + (params.length + 1) + ' OR phone ILIKE $' + (params.length + 1) + ')'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    sql += ' ORDER BY created_at DESC LIMIT 100'

    const result = await query(sql, params)
    return Response.json({ pilgrims: result.rows })
  } catch (error) {
    console.error('[v0] GET /api/pilgrims error:', error)
    return Response.json({ error: 'Failed to fetch pilgrims' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { registration_id, name, phone, age, zone_id } = body

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO pilgrims (registration_id, name, phone, age, zone_id, status) VALUES ($1, $2, $3, $4, $5, \'ACTIVE\') RETURNING *',
      [registration_id || null, name, phone || null, age || null, zone_id || null]
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/pilgrims error:', error)
    return Response.json({ error: 'Failed to create pilgrim' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { pilgrimId, status, notes } = body

    if (!pilgrimId) {
      return Response.json({ error: 'pilgrimId is required' }, { status: 400 })
    }

    const result = await query(
      'UPDATE pilgrims SET status = COALESCE($1, status), notes = COALESCE($2, notes), updated_at = now() WHERE id = $3 RETURNING *',
      [status || null, notes || null, pilgrimId]
    )

    if (result.rows.length === 0) {
      return Response.json({ error: 'Pilgrim not found' }, { status: 404 })
    }

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('[v0] PATCH /api/pilgrims error:', error)
    return Response.json({ error: 'Failed to update pilgrim' }, { status: 500 })
  }
}
