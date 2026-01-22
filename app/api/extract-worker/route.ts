/**
 * Internal worker route for graph extraction
 * Called in fire-and-forget mode from the source graph API
 *
 * This route handles the actual extraction work and updates job status
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { extractFromText } from '@/lib/pipeline/extraction'
import { storeGraphExtraction } from '@/lib/graph/store'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'

// Tell Netlify this can run longer
export const maxDuration = 300 // 5 minutes (Netlify Pro limit for API routes)

interface ExtractRequest {
  jobId: string
  notebookId: string
  sourceId: string
  text: string
  secret: string
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json() as ExtractRequest
    const { jobId, notebookId, sourceId, text, secret } = body

    // Verify internal call
    if (secret !== process.env.INTERNAL_API_SECRET && secret !== 'dev-secret') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!jobId || !notebookId || !sourceId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

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
