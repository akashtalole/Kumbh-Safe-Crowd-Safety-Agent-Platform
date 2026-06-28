import { query } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password_hash } = body

    if (!email || !password_hash) {
      return Response.json({ error: 'Email and password required' }, { status: 400 })
    }

    const result = await query(
      'SELECT id, email, name, role, zone_id, is_active, created_at, updated_at FROM users WHERE email = $1 AND password_hash = $2 AND is_active = true',
      [email, password_hash]
    )

    if (result.rows.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = result.rows[0]

    // Create session (in a real app, use session middleware)
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        zone_id: user.zone_id,
      },
    })
  } catch (error) {
    console.error('[v0] POST /api/auth/login error:', error)
    return Response.json({ error: 'Login failed' }, { status: 500 })
  }
}
