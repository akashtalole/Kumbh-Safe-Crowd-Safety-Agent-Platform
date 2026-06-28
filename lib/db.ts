import { Pool, ClientBase } from 'pg'
import { DsqlSigner } from '@aws-sdk/dsql-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { attachDatabasePool } from '@vercel/functions'

let pool: Pool

function getPool(): Pool {
  if (!pool) {
    const signer = new DsqlSigner({
      credentials: awsCredentialsProvider({
        roleArn: process.env.AWS_ROLE_ARN!,
        clientConfig: { region: process.env.AWS_REGION || 'us-east-1' },
      }),
      region: process.env.AWS_REGION || 'us-east-1',
      hostname: process.env.PGHOST || '',
      expiresIn: 900,
    })

    pool = new Pool({
      host: process.env.PGHOST,
      user: process.env.PGUSER || 'admin',
      database: process.env.PGDATABASE || 'postgres',
      password: () => signer.getDbConnectAdminAuthToken(),
      port: 5432,
      ssl: true,
      max: 20,
    })

    attachDatabasePool(pool)
  }

  return pool
}

// Single query transactions
export async function query(text: string, params?: unknown[]) {
  const p = getPool()
  return p.query(text, params)
}

// Use for multi-query transactions
export async function withConnection<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const p = getPool()
  const client = await p.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}
