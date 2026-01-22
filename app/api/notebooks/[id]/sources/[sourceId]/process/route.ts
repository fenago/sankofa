import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { chunkDocument, estimateTokens } from '@/lib/pipeline/chunking'
import { batchGenerateEmbeddings } from '@/lib/pipeline/embeddings'
// Graph extraction disabled in source processing - too slow for serverless
// Users can trigger via "Build Graph" button instead

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>
}

// POST /api/notebooks/[id]/sources/[sourceId]/process - Process a pending source
export async function POST(request: Request, { params }: RouteParams) {
  const startTime = Date.now()

  try {
    const { id: notebookId, sourceId } = await params
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

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

    // Get source with raw_text
    const { data: source, error: sourceError } = await adminSupabase
      .from('sources')
      .select('id, raw_text, title, url, filename, source_type, status')
      .eq('id', sourceId)
      .eq('notebook_id', notebookId)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Check if already processed
    if (source.status === 'success') {
      return NextResponse.json({
        success: true,
        sourceId,
        message: 'Already processed',
        alreadyProcessed: true,
      })
    }

    const text = source.raw_text
    if (!text) {
      return NextResponse.json({ error: 'Source has no text content' }, { status: 400 })
    }

    console.log(`[Process] Starting processing for source ${sourceId}, text length: ${text.length}`)

    // Update status to processing
    await adminSupabase
      .from('sources')
      .update({ status: 'processing' })
      .eq('id', sourceId)

    // Chunk the text
    const chunkStartTime = Date.now()
    const chunks = chunkDocument(text, {
      maxChunkSize: 1500,
      overlap: 200,
    })
    console.log(`[Process] Chunked into ${chunks.length} chunks in ${Date.now() - chunkStartTime}ms`)

    if (chunks.length === 0) {
      await adminSupabase
        .from('sources')
        .update({ status: 'error', error_message: 'No content to process' })
        .eq('id', sourceId)
      return NextResponse.json({ error: 'No content to process' }, { status: 400 })
    }

    // Generate embeddings
    const embedStartTime = Date.now()
    const chunkTexts = chunks.map(c => c.content)
    const embeddings = await batchGenerateEmbeddings(chunkTexts, 'RETRIEVAL_DOCUMENT', 100, 100)
    console.log(`[Process] Generated ${embeddings.length} embeddings in ${Date.now() - embedStartTime}ms`)

    // Prepare and insert chunks
    const chunkInserts = chunks.map((chunk, idx) => ({
      source_id: sourceId,
      notebook_id: notebookId,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: embeddings[idx],
      token_count: estimateTokens(chunk.content),
    }))

    const insertStartTime = Date.now()
    const BATCH_SIZE = 50
    for (let i = 0; i < chunkInserts.length; i += BATCH_SIZE) {
      const batch = chunkInserts.slice(i, i + BATCH_SIZE)
      const { error: insertError } = await adminSupabase
        .from('chunks')
        .insert(batch)

      if (insertError) {
        throw insertError
      }
    }
    console.log(`[Process] Inserted chunks in ${Date.now() - insertStartTime}ms`)

    // Mark as success
    await adminSupabase
      .from('sources')
      .update({ status: 'success' })
      .eq('id', sourceId)

    const totalTime = Date.now() - startTime
    console.log(`[Process] Source ${sourceId} complete: ${chunks.length} chunks in ${totalTime}ms`)

    // Graph extraction is intentionally skipped here - it's too slow for serverless
    // Users can trigger graph building manually via the "Build Graph" button

    return NextResponse.json({
      success: true,
      sourceId,
      chunkCount: chunks.length,
      processingTimeMs: totalTime,
    })
  } catch (error) {
    console.error('[Process] Error:', error)

    // Try to mark source as error
    try {
      const { sourceId } = await params
      const adminSupabase = createAdminClient()
      await adminSupabase
        .from('sources')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Processing failed',
        })
        .eq('id', sourceId)
    } catch (updateError) {
      console.error('[Process] Failed to update error status:', updateError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
