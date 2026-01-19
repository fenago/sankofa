import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteNotebooksGraph, cleanupOrphanedNodes, getAllGraphStats } from '@/lib/graph/store'

// GET /api/cleanup - Get cleanup stats for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's notebooks
    const { data: notebooks, error: notebooksError } = await supabase
      .from('notebooks')
      .select('id, name')
      .eq('user_id', user.id)

    if (notebooksError) {
      console.error('Error fetching notebooks:', notebooksError)
      return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 })
    }

    const notebookIds = notebooks?.map(n => n.id) || []

    // Get Supabase stats for user
    const [sourcesResult, chunksResult, messagesResult, artifactsResult] = await Promise.all([
      supabase.from('sources').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('chunks').select('id', { count: 'exact' }).in('notebook_id', notebookIds.length > 0 ? notebookIds : ['__none__']),
      supabase.from('messages').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('artifacts').select('id', { count: 'exact' }).eq('user_id', user.id),
    ])

    // Get global Neo4J stats
    let graphStats = {
      totalSkills: 0,
      totalEntities: 0,
      totalPrerequisites: 0,
      totalEntityRelationships: 0,
      orphanedSkills: 0,
      orphanedEntities: 0,
    }
    try {
      graphStats = await getAllGraphStats()
    } catch (graphError) {
      console.error('Error getting Neo4J stats:', graphError)
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      notebookCount: notebooks?.length || 0,
      supabase: {
        sources: sourcesResult.count || 0,
        chunks: chunksResult.count || 0,
        messages: messagesResult.count || 0,
        artifacts: artifactsResult.count || 0,
      },
      neo4j: graphStats,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cleanup - Clean all data for the current user
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    const { action } = body

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle orphaned cleanup action (admin utility)
    if (action === 'cleanup-orphaned') {
      let orphanedDeleted = { skills: 0, entities: 0 }
      try {
        orphanedDeleted = await cleanupOrphanedNodes()
      } catch (graphError) {
        console.error('Error cleaning orphaned nodes:', graphError)
        return NextResponse.json({ error: 'Failed to cleanup orphaned nodes' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'cleanup-orphaned',
        deleted: orphanedDeleted,
      })
    }

    // Get all user's notebooks
    const { data: notebooks, error: notebooksError } = await supabase
      .from('notebooks')
      .select('id, name')
      .eq('user_id', user.id)

    if (notebooksError) {
      console.error('Error fetching notebooks:', notebooksError)
      return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 })
    }

    const notebookIds = notebooks?.map(n => n.id) || []

    // Get before stats
    const [sourcesResult, chunksResult, messagesResult, artifactsResult] = await Promise.all([
      supabase.from('sources').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('chunks').select('id', { count: 'exact' }).in('notebook_id', notebookIds.length > 0 ? notebookIds : ['__none__']),
      supabase.from('messages').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('artifacts').select('id', { count: 'exact' }).eq('user_id', user.id),
    ])

    const beforeStats = {
      notebooks: notebooks?.length || 0,
      sources: sourcesResult.count || 0,
      chunks: chunksResult.count || 0,
      messages: messagesResult.count || 0,
      artifacts: artifactsResult.count || 0,
    }

    // Delete Neo4J graph data for all user notebooks
    let graphNodesDeleted = 0
    if (notebookIds.length > 0) {
      try {
        graphNodesDeleted = await deleteNotebooksGraph(notebookIds)
      } catch (graphError) {
        console.error('Error deleting Neo4J graph data:', graphError)
        // Continue even if Neo4J fails
      }
    }

    // Delete all sources (which cascade deletes chunks)
    const { error: sourcesError } = await supabase
      .from('sources')
      .delete()
      .eq('user_id', user.id)

    if (sourcesError) {
      console.error('Error deleting sources:', sourcesError)
    }

    // Delete all messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('user_id', user.id)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
    }

    // Delete all artifacts
    const { error: artifactsError } = await supabase
      .from('artifacts')
      .delete()
      .eq('user_id', user.id)

    if (artifactsError) {
      console.error('Error deleting artifacts:', artifactsError)
    }

    // Delete all prompt overrides
    const { error: promptsError } = await supabase
      .from('prompt_overrides')
      .delete()
      .eq('user_id', user.id)

    if (promptsError) {
      console.error('Error deleting prompt overrides:', promptsError)
    }

    console.log(`[Cleanup] Cleaned all data for user ${user.id}`)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      deleted: {
        ...beforeStats,
        graphNodes: graphNodesDeleted,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
