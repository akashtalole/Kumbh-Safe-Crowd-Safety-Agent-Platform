import { query, withConnection } from '@/lib/db'
import { Zone } from '@/lib/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const locked = searchParams.get('locked')

    let sql = 'SELECT * FROM zones WHERE 1=1'
    const params: any[] = []

    if (status) {
      sql += ' AND density_status = $' + (params.length + 1)
      params.push(status)
    }

    if (locked !== null) {
      sql += ' AND is_locked = $' + (params.length + 1)
      params.push(locked === 'true')
    }

    sql += ' ORDER BY name ASC'

    const result = await query(sql, params)
    return Response.json({ zones: result.rows })
  } catch (error) {
    console.error('[v0] GET /api/zones error:', error)
    return Response.json({ error: 'Failed to fetch zones' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { zoneId, action, reason } = body

    if (!zoneId || !action) {
      return Response.json({ error: 'Missing zoneId or action' }, { status: 400 })
    }

    return await withConnection(async (client) => {
      if (action === 'hold') {
        await client.query(
          'UPDATE zones SET is_locked = true, locked_reason = $1, locked_until = now() + interval \'1 hour\' WHERE id = $2',
          [reason || 'Manual hold', zoneId]
        )
      } else if (action === 'release') {
        await client.query(
          'UPDATE zones SET is_locked = false, locked_reason = null, locked_until = null WHERE id = $1',
          [zoneId]
        )
      } else if (action === 'update_density') {
        const { density, status } = body
        await client.query(
          'UPDATE zones SET current_density = $1, density_status = $2, updated_at = now() WHERE id = $3',
          [density, status, zoneId]
        )
      }

      const result = await client.query('SELECT * FROM zones WHERE id = $1', [zoneId])
      return Response.json(result.rows[0])
    })
  } catch (error) {
    console.error('[v0] PATCH /api/zones error:', error)
    return Response.json({ error: 'Failed to update zone' }, { status: 500 })
  }
}
