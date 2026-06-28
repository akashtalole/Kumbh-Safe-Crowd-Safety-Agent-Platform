import { query, withConnection } from '@/lib/db'
import { Ambulance } from '@/lib/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const zoneId = searchParams.get('zoneId')

    let sql = 'SELECT * FROM ambulances WHERE 1=1'
    const params: any[] = []

    if (status) {
      sql += ' AND status = $' + (params.length + 1)
      params.push(status)
    }

    if (zoneId) {
      sql += ' AND zone_id = $' + (params.length + 1)
      params.push(zoneId)
    }

    sql += ' ORDER BY name ASC'

    const result = await query(sql, params)
    return Response.json({ ambulances: result.rows })
  } catch (error) {
    console.error('[v0] GET /api/ambulances error:', error)
    return Response.json({ error: 'Failed to fetch ambulances' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, driver_name, zone_id, vehicle_number } = body

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO ambulances (name, driver_name, zone_id, vehicle_number, status) VALUES ($1, $2, $3, $4, \'AVAILABLE\') RETURNING *',
      [name, driver_name || null, zone_id || null, vehicle_number || null]
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/ambulances error:', error)
    return Response.json({ error: 'Failed to create ambulance' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { ambulanceId, action, location } = body

    if (!ambulanceId || !action) {
      return Response.json({ error: 'Missing ambulanceId or action' }, { status: 400 })
    }

    return await withConnection(async (client) => {
      if (action === 'dispatch') {
        await client.query(
          'UPDATE ambulances SET status = \'DISPATCHED\', current_location = $1, updated_at = now() WHERE id = $2',
          [location || null, ambulanceId]
        )
      } else if (action === 'on_duty') {
        await client.query(
          'UPDATE ambulances SET status = \'ON_DUTY\', current_location = $1, updated_at = now() WHERE id = $2',
          [location || null, ambulanceId]
        )
      } else if (action === 'available') {
        await client.query(
          'UPDATE ambulances SET status = \'AVAILABLE\', current_location = null, updated_at = now() WHERE id = $1',
          [ambulanceId]
        )
      }

      const result = await client.query('SELECT * FROM ambulances WHERE id = $1', [ambulanceId])
      return Response.json(result.rows[0])
    })
  } catch (error) {
    console.error('[v0] PATCH /api/ambulances error:', error)
    return Response.json({ error: 'Failed to update ambulance' }, { status: 500 })
  }
}
