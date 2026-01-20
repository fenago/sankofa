import neo4j, { Driver, Session, type SessionConfig, type ManagedTransaction } from 'neo4j-driver'

// Singleton driver instance
let driver: Driver | null = null
let connectionFailed = false

/**
 * Check if Neo4J is configured
 */
export function isNeo4JConfigured(): boolean {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD
  return !!(uri && user && password)
}

/**
 * Check if Neo4J is available (configured and not previously failed)
 */
export function isNeo4JAvailable(): boolean {
  return isNeo4JConfigured() && !connectionFailed
}

export function getDriver(): Driver | null {
  if (connectionFailed) return null

  if (!driver) {
    const uri = process.env.NEO4J_URI
    const user = process.env.NEO4J_USER
    const password = process.env.NEO4J_PASSWORD

    if (!uri || !user || !password) {
      console.log('[Neo4J] Not configured - graph features disabled')
      return null
    }

    try {
      driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        connectionTimeout: 30000,
      })
    } catch (error) {
      console.error('[Neo4J] Failed to create driver:', error)
      connectionFailed = true
      return null
    }
  }
  return driver
}

export function getSession(config?: SessionConfig): Session | null {
  const d = getDriver()
  if (!d) return null
  return d.session(config)
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}

// Verify connectivity
export async function verifyConnectivity(): Promise<boolean> {
  try {
    const d = getDriver()
    if (!d) return false
    await d.verifyConnectivity()
    return true
  } catch (error) {
    console.error('[Neo4J] Connectivity failed:', error)
    connectionFailed = true
    return false
  }
}

// Helper to run a query with automatic session management
// Returns empty array if Neo4J is not available
export async function runQuery<T>(
  cypher: string,
  params: Record<string, unknown> = {},
  config?: SessionConfig
): Promise<T[]> {
  const session = getSession(config)
  if (!session) {
    console.log('[Neo4J] Skipping query - not available')
    return []
  }
  try {
    const result = await session.run(cypher, params)
    return result.records.map(record => record.toObject() as T)
  } catch (error) {
    console.error('[Neo4J] Query error:', error)
    return []
  } finally {
    await session.close()
  }
}

// Helper for write transactions
// Returns undefined if Neo4J is not available
export async function runWriteTransaction<T>(
  work: (tx: ManagedTransaction) => Promise<T>,
  config?: SessionConfig
): Promise<T | undefined> {
  const session = getSession(config)
  if (!session) {
    console.log('[Neo4J] Skipping write transaction - not available')
    return undefined
  }
  try {
    return await session.executeWrite(work)
  } catch (error) {
    console.error('[Neo4J] Write transaction error:', error)
    return undefined
  } finally {
    await session.close()
  }
}

// Helper for read transactions
// Returns undefined if Neo4J is not available
export async function runReadTransaction<T>(
  work: (tx: ManagedTransaction) => Promise<T>,
  config?: SessionConfig
): Promise<T | undefined> {
  const session = getSession(config)
  if (!session) {
    console.log('[Neo4J] Skipping read transaction - not available')
    return undefined
  }
  try {
    return await session.executeRead(work)
  } catch (error) {
    console.error('[Neo4J] Read transaction error:', error)
    return undefined
  } finally {
    await session.close()
  }
}

// Track if indexes have been initialized
let indexesInitialized = false

/**
 * Ensure Neo4J indexes exist for optimal query performance
 * This should be called once at startup
 */
export async function ensureIndexes(): Promise<void> {
  if (indexesInitialized) return

  const session = getSession()
  if (!session) return

  try {
    // Create indexes for frequently queried properties
    // Using CREATE INDEX IF NOT EXISTS for idempotency
    const indexQueries = [
      // Skill indexes
      'CREATE INDEX skill_id IF NOT EXISTS FOR (s:Skill) ON (s.id)',
      'CREATE INDEX skill_notebook IF NOT EXISTS FOR (s:Skill) ON (s.notebookId)',
      'CREATE INDEX skill_source IF NOT EXISTS FOR (s:Skill) ON (s.sourceDocumentId)',

      // Entity indexes
      'CREATE INDEX entity_id IF NOT EXISTS FOR (e:Entity) ON (e.id)',
      'CREATE INDEX entity_notebook IF NOT EXISTS FOR (e:Entity) ON (e.notebookId)',
      'CREATE INDEX entity_source IF NOT EXISTS FOR (e:Entity) ON (e.sourceDocumentId)',

      // Composite indexes for common query patterns
      'CREATE INDEX skill_notebook_bloom IF NOT EXISTS FOR (s:Skill) ON (s.notebookId, s.bloomLevel)',
    ]

    for (const query of indexQueries) {
      try {
        await session.run(query)
      } catch (e) {
        // Index might already exist with different name, that's ok
        console.log(`[Neo4J] Index query note: ${(e as Error).message}`)
      }
    }

    indexesInitialized = true
    console.log('[Neo4J] Indexes ensured')
  } catch (error) {
    console.error('[Neo4J] Failed to ensure indexes:', error)
  } finally {
    await session.close()
  }
}
