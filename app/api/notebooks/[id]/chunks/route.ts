import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/chunks - Get chunk count and sample for debugging
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get chunk count
    const { count, error: countError } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true })
      .eq('notebook_id', notebookId)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // Get sample chunks (first 3)
    const { data: samples, error: samplesError } = await supabase
      .from('chunks')
      .select('id, content, chunk_index, source_id, embedding')
      .eq('notebook_id', notebookId)
      .order('chunk_index')
      .limit(3)

    if (samplesError) {
      return NextResponse.json({ error: samplesError.message }, { status: 500 })
    }

    // Check if embeddings exist
    const hasEmbeddings = samples?.some(s => s.embedding !== null)

    return NextResponse.json({
      notebookId,
      totalChunks: count || 0,
      hasEmbeddings,
      samples: samples?.map(s => ({
        id: s.id,
        chunk_index: s.chunk_index,
        content_preview: s.content?.slice(0, 200) + '...',
        has_embedding: s.embedding !== null,
        embedding_length: s.embedding ? (Array.isArray(s.embedding) ? s.embedding.length : 'stored') : null,
      })),
    })
  } catch (error) {
    console.error('Error getting chunks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
