import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteNotebookGraph, getGraphStats } from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/cleanup - Get cleanup stats for a notebook
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
      .select('id, name')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Get Supabase stats
    const [sourcesResult, chunksResult, messagesResult] = await Promise.all([
      supabase.from('sources').select('id', { count: 'exact' }).eq('notebook_id', notebookId),
      supabase.from('chunks').select('id', { count: 'exact' }).eq('notebook_id', notebookId),
      supabase.from('messages').select('id', { count: 'exact' }).eq('notebook_id', notebookId),
    ])

    // Get Neo4J stats
    let graphStats = { skillCount: 0, entityCount: 0, prerequisiteCount: 0, entityRelationshipCount: 0 }
    try {
      graphStats = await getGraphStats(notebookId)
    } catch (graphError) {
      console.error('Error getting Neo4J stats:', graphError)
    }

    return NextResponse.json({
      notebook: { id: notebook.id, name: notebook.name },
      supabase: {
        sources: sourcesResult.count || 0,
        chunks: chunksResult.count || 0,
        messages: messagesResult.count || 0,
      },
      neo4j: graphStats,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/cleanup - Clean all data for a notebook
export async function POST(request: Request, { params }: RouteParams) {
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
      .select('id, name')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Get before stats
    const [sourcesResult, chunksResult, messagesResult] = await Promise.all([
      supabase.from('sources').select('id', { count: 'exact' }).eq('notebook_id', notebookId),
      supabase.from('chunks').select('id', { count: 'exact' }).eq('notebook_id', notebookId),
      supabase.from('messages').select('id', { count: 'exact' }).eq('notebook_id', notebookId),
    ])

    let graphStats = { skillCount: 0, entityCount: 0, prerequisiteCount: 0, entityRelationshipCount: 0 }
    try {
      graphStats = await getGraphStats(notebookId)
    } catch (graphError) {
      console.error('Error getting Neo4J stats:', graphError)
    }

    const beforeStats = {
      supabase: {
        sources: sourcesResult.count || 0,
        chunks: chunksResult.count || 0,
        messages: messagesResult.count || 0,
      },
      neo4j: graphStats,
    }

    // Delete Neo4J graph data
    try {
      await deleteNotebookGraph(notebookId)
    } catch (graphError) {
      console.error('Error deleting Neo4J graph data:', graphError)
      // Continue even if Neo4J fails
    }

    // Delete all sources (which cascade deletes chunks)
    const { error: sourcesError } = await supabase
      .from('sources')
      .delete()
      .eq('notebook_id', notebookId)

    if (sourcesError) {
      console.error('Error deleting sources:', sourcesError)
    }

    // Delete all messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('notebook_id', notebookId)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
    }

    // Delete all artifacts
    const { error: artifactsError } = await supabase
      .from('artifacts')
      .delete()
      .eq('notebook_id', notebookId)

    if (artifactsError) {
      console.error('Error deleting artifacts:', artifactsError)
    }

    // Delete all prompt overrides
    const { error: promptsError } = await supabase
      .from('prompt_overrides')
      .delete()
      .eq('notebook_id', notebookId)

    if (promptsError) {
      console.error('Error deleting prompt overrides:', promptsError)
    }

    console.log(`[Cleanup] Cleaned all data for notebook ${notebookId}`)

    return NextResponse.json({
      success: true,
      notebook: { id: notebook.id, name: notebook.name },
      deleted: beforeStats,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
