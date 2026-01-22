/**
 * Worker route for graph extraction with extended timeout
 * Configured in netlify.toml for 300s timeout
 */

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { extractFromText } from '@/lib/pipeline/extraction'
import { storeGraphExtraction } from '@/lib/graph/store'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'

interface ExtractRequest {
  jobId: string
  notebookId: string
  sourceId: string
}

export async function POST(request: Request) {
  const startTime = Date.now()
  let jobId: string | undefined

  try {
    console.log('[ExtractWorker] Request received')

    // Parse body
    let body: ExtractRequest
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[ExtractWorker] Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    jobId = body.jobId
    const { notebookId, sourceId } = body

    console.log(`[ExtractWorker] Processing job ${jobId}, notebook ${notebookId}, source ${sourceId}`)

    if (!jobId || !notebookId || !sourceId) {
      return NextResponse.json({ error: 'Missing required fields: jobId, notebookId, sourceId' }, { status: 400 })
    }

    // Verify user auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[ExtractWorker] Auth error:', authError)
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
      return NextResponse.json({ error: 'Notebook not found or access denied' }, { status: 404 })
    }

    const adminSupabase = createAdminClient()

    // Update job status to processing
    await adminSupabase
      .from('extraction_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Fetch source content
    const { data: source } = await adminSupabase
      .from('sources')
      .select('raw_text')
      .eq('id', sourceId)
      .single()

    let text = source?.raw_text

    if (!text) {
      // Try to reconstruct from chunks
      const { data: chunks } = await adminSupabase
        .from('chunks')
        .select('content')
        .eq('source_id', sourceId)
        .order('chunk_index', { ascending: true })

      if (chunks && chunks.length > 0) {
        text = chunks.map(c => c.content).join('\n\n')
      }
    }

    if (!text) {
      await adminSupabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: 'No content available for source',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return NextResponse.json({ error: 'No content available for source' }, { status: 400 })
    }

    console.log(`[ExtractWorker] Starting extraction: ${text.length} chars`)

    // Run extraction
    const extractionResult = await extractFromText(text, notebookId, sourceId)

    console.log(`[ExtractWorker] Extracted ${extractionResult.skills.length} skills, ${extractionResult.prerequisites.length} prerequisites in ${Date.now() - startTime}ms`)

    // Store in Neo4J if available
    if (isNeo4JAvailable()) {
      await storeGraphExtraction(extractionResult)
      console.log(`[ExtractWorker] Stored in Neo4J`)
    }

    // Update job as completed
    await adminSupabase
      .from('extraction_jobs')
      .update({
        status: 'completed',
        skill_count: extractionResult.skills.length,
        prerequisite_count: extractionResult.prerequisites.length,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[ExtractWorker] Job ${jobId} completed in ${Date.now() - startTime}ms`)

    return NextResponse.json({
      success: true,
      skillCount: extractionResult.skills.length,
      prerequisiteCount: extractionResult.prerequisites.length,
      durationMs: Date.now() - startTime
    })

  } catch (error) {
    console.error(`[ExtractWorker] Error:`, error)

    // Try to mark job as failed
    if (jobId) {
      try {
        const adminSupabase = createAdminClient()
        await adminSupabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
      } catch (updateError) {
        console.error('[ExtractWorker] Failed to update job status:', updateError)
      }
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Extraction failed',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
