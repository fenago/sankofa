import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQueryEmbedding } from '@/lib/pipeline/embeddings'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface SearchResult {
  id: string
  source_id: string
  content: string
  chunk_index: number
  similarity: number
  source_title?: string
  source_url?: string
}

// POST /api/notebooks/[id]/search - Semantic search within a notebook
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
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const body = await request.json()
    const { query, limit = 10, threshold = 0.5 } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query.trim())

    // Perform vector search using the match_chunks function
    const { data: results, error: searchError } = await supabase
      .rpc('match_chunks', {
        query_embedding: queryEmbedding,
        p_notebook_id: notebookId,
        match_count: limit,
        similarity_threshold: threshold,
      })

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Get source information for each result
    const sourceIds = [...new Set(results.map((r: SearchResult) => r.source_id))]
    const { data: sources } = await supabase
      .from('sources')
      .select('id, title, url')
      .in('id', sourceIds)

    const sourceMap = new Map(sources?.map(s => [s.id, s]) || [])

    // Enrich results with source info
    const enrichedResults = results.map((r: SearchResult) => {
      const source = sourceMap.get(r.source_id)
      return {
        ...r,
        source_title: source?.title,
        source_url: source?.url,
      }
    })

    return NextResponse.json({
      results: enrichedResults,
      query,
      count: enrichedResults.length,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
