import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/sources - List all sources in a notebook
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

    // Fetch sources with chunk count
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sources:', error)
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }

    // Get chunk counts for each source
    const sourceIds = sources.map(s => s.id)
    const { data: chunkCounts } = await supabase
      .from('chunks')
      .select('source_id')
      .in('source_id', sourceIds)

    // Count chunks per source
    const chunkCountMap = new Map<string, number>()
    chunkCounts?.forEach(c => {
      const count = chunkCountMap.get(c.source_id) || 0
      chunkCountMap.set(c.source_id, count + 1)
    })

    // Add chunk count to sources
    const sourcesWithCounts = sources.map(s => ({
      ...s,
      chunkCount: chunkCountMap.get(s.id) || 0,
    }))

    return NextResponse.json({ sources: sourcesWithCounts })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
