import { query } from '@/lib/db'
import { User } from '@/lib/types'

export async function GET() {
  try {
    const result = await query(
      'SELECT id, email, name, role, zone_id, is_active, created_at, updated_at FROM users WHERE is_active = true ORDER BY created_at DESC'
    )
    return Response.json({ users: result.rows })
  } catch (error) {
    console.error('[v0] GET /api/users error:', error)
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password_hash, name, role, zone_id } = body

    if (!email || !password_hash || !name || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO users (email, password_hash, name, role, zone_id, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, email, name, role, zone_id, is_active, created_at, updated_at',
      [email, password_hash, name, role, zone_id || null]
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/users error:', error)
    if ((error as any).code === '23505') {
      return Response.json({ error: 'Email already exists' }, { status: 409 })
    }
    return Response.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
