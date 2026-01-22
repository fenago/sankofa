/**
 * Worker route for graph extraction with extended timeout
 * Can be called by authenticated users (for their own sources) or internally
 *
 * This route handles the actual extraction work and updates job status
 * Has 5-minute timeout vs the normal 26s for API routes
 */

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { extractFromText } from '@/lib/pipeline/extraction'
import { storeGraphExtraction } from '@/lib/graph/store'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'

// Tell Netlify this can run longer
export const maxDuration = 300 // 5 minutes (Netlify Pro limit for API routes)

interface ExtractRequest {
  jobId: string
  notebookId: string
  sourceId: string
  text?: string // Optional - will be fetched if not provided
  secret?: string
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json() as ExtractRequest
    const { jobId, notebookId, sourceId, secret } = body
    let { text } = body

    const adminSupabase = createAdminClient()

    // Auth: either internal secret OR authenticated user who owns the notebook
    const isInternalCall = secret === process.env.INTERNAL_API_SECRET || secret === 'dev-secret'

    if (!isInternalCall) {
      // Verify user auth
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
    }

    if (!jobId || !notebookId || !sourceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If text not provided, fetch it from the source
    if (!text) {
      const { data: source } = await adminSupabase
        .from('sources')
        .select('raw_text')
        .eq('id', sourceId)
        .single()

      if (source?.raw_text) {
        text = source.raw_text
      } else {
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
        return NextResponse.json({ error: 'No content available for source' }, { status: 400 })
      }
    }

    console.log(`[ExtractWorker] Starting job ${jobId}, source ${sourceId}, ${text.length} chars`)

    // Update job status to processing
    await adminSupabase
      .from('extraction_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

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
        completed_at: new Date().toISOString()
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
    try {
      const body = await request.clone().json() as ExtractRequest
      if (body.jobId) {
        const adminSupabase = createAdminClient()
        await adminSupabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', body.jobId)
      }
    } catch (e) {
      console.error('[ExtractWorker] Failed to update job status:', e)
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Extraction failed'
    }, { status: 500 })
  }
}
