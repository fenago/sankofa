import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getSkillsByNotebook, getSkillGraph, searchSkills } from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/graph/skills - Get skills for a notebook
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
        skills: [],
        prerequisites: [],
      })
    }

    // Check for query parameter
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const includeGraph = url.searchParams.get('graph') === 'true'

    if (query) {
      // Search skills
      const skills = await searchSkills(notebookId, query)
      return NextResponse.json({ skills })
    }

    if (includeGraph) {
      // Get full skill graph with prerequisites
      const graph = await getSkillGraph(notebookId)
      return NextResponse.json(graph)
    }

    // Get all skills
    const skills = await getSkillsByNotebook(notebookId)
    return NextResponse.json({ skills })
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
