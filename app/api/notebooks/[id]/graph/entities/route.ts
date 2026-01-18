import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getEntitiesByNotebook, getRelatedEntities } from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/graph/entities - Get entities for a notebook
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Check if Neo4J is available
    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph features are not configured.',
        entities: [],
        related: [],
      })
    }

    // Check for entity ID to get related entities
    const url = new URL(request.url)
    const entityId = url.searchParams.get('entityId')

    if (entityId) {
      const related = await getRelatedEntities(entityId)
      return NextResponse.json({ related })
    }

    // Get all entities
    const entities = await getEntitiesByNotebook(notebookId)
    return NextResponse.json({ entities })
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
