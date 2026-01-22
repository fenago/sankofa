import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getSkillCountBySource, deleteSourceSkills, storeGraphExtraction } from '@/lib/graph/store'
import { extractFromText } from '@/lib/pipeline/extraction'

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>
}

// GET /api/notebooks/[id]/sources/[sourceId]/graph - Check if source has been graphed
export async function GET(request: Request, { params }: RouteParams) {
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

    // Check if Neo4J is available
    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        graphed: false,
        skillCount: 0,
        available: false,
      })
    }

    // Check for any active extraction jobs
    const { data: activeJob } = await adminSupabase
      .from('extraction_jobs')
      .select('id, status, created_at, updated_at')
      .eq('source_id', sourceId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeJob) {
      // Check if job is stale (stuck for > 5 minutes)
      const updatedAt = new Date(activeJob.updated_at || activeJob.created_at)
      const staleMs = Date.now() - updatedAt.getTime()
      if (staleMs > 5 * 60 * 1000) {
        // Mark as failed
        await adminSupabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            error_message: 'Job timed out (no updates for 5 minutes)',
            completed_at: new Date().toISOString()
          })
          .eq('id', activeJob.id)

        // Don't return extracting state
      } else {
        return NextResponse.json({
          graphed: false,
          skillCount: 0,
          available: true,
          extracting: true,
          jobId: activeJob.id,
          jobStatus: activeJob.status,
        })
      }
    }

    // Check for recent completed/failed jobs
    const { data: recentJob } = await adminSupabase
      .from('extraction_jobs')
      .select('id, status, skill_count, error_message, completed_at')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get skill count for this source from Neo4J
    const skillCount = await getSkillCountBySource(sourceId)

    return NextResponse.json({
      graphed: skillCount > 0,
      skillCount,
      available: true,
      extracting: false,
      lastJob: recentJob ? {
        id: recentJob.id,
        status: recentJob.status,
        skillCount: recentJob.skill_count,
        error: recentJob.error_message,
        completedAt: recentJob.completed_at,
      } : null,
    })
  } catch (error) {
    console.error('Error checking source graph status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/sources/[sourceId]/graph - Extract graph with streaming
export async function POST(request: Request, { params }: RouteParams) {
  const encoder = new TextEncoder()

  // Create a streaming response to avoid Netlify timeout
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send status updates
  const sendStatus = async (status: string, data?: Record<string, unknown>) => {
    const message = JSON.stringify({ status, ...data, timestamp: Date.now() }) + '\n'
    await writer.write(encoder.encode(message))
  }

  // Start the async extraction process
  const extractionPromise = (async () => {
    let jobId: string | null = null

    try {
      const { id: notebookId, sourceId } = await params
      const supabase = await createClient()
      const adminSupabase = createAdminClient()

      await sendStatus('authenticating')

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        await sendStatus('error', { error: 'Unauthorized' })
        return
      }

      // Verify notebook ownership
      const { data: notebook } = await supabase
        .from('notebooks')
        .select('id')
        .eq('id', notebookId)
        .eq('user_id', user.id)
        .single()

      if (!notebook) {
        await sendStatus('error', { error: 'Notebook not found' })
        return
      }

      await sendStatus('checking_neo4j')

      if (!isNeo4JAvailable()) {
        await sendStatus('error', { error: 'Knowledge graph not configured' })
        return
      }

      // Check for existing active job
      const { data: activeJob } = await adminSupabase
        .from('extraction_jobs')
        .select('id, status')
        .eq('source_id', sourceId)
        .in('status', ['pending', 'processing'])
        .limit(1)
        .single()

      if (activeJob) {
        await sendStatus('error', { error: 'Extraction already in progress', jobId: activeJob.id })
        return
      }

      await sendStatus('loading_source')

      // Get source with raw_text
      const { data: source, error: sourceError } = await adminSupabase
        .from('sources')
        .select('id, raw_text, title, status')
        .eq('id', sourceId)
        .eq('notebook_id', notebookId)
        .single()

      if (sourceError || !source) {
        await sendStatus('error', { error: 'Source not found' })
        return
      }

      if (source.status !== 'success') {
        await sendStatus('error', { error: 'Source is not ready' })
        return
      }

      let text = source.raw_text

      // If no raw_text, reconstruct from chunks
      if (!text) {
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
        await sendStatus('error', { error: 'No content available' })
        return
      }

      await sendStatus('preparing', { textLength: text.length })

      // Delete existing skills for this source
      await deleteSourceSkills(sourceId)

      // Create job record
      const { data: job, error: jobError } = await adminSupabase
        .from('extraction_jobs')
        .insert({
          notebook_id: notebookId,
          source_id: sourceId,
          user_id: user.id,
          status: 'processing',
        })
        .select('id')
        .single()

      if (jobError || !job) {
        await sendStatus('error', { error: 'Failed to create job record' })
        return
      }

      jobId = job.id
      await sendStatus('extracting', { jobId, textLength: text.length })

      console.log(`[Graph] Starting extraction for source ${sourceId}: ${text.length} chars`)

      // Send heartbeats every 5 seconds to keep connection alive
      const heartbeatInterval = setInterval(async () => {
        try {
          await sendStatus('heartbeat', { jobId })
        } catch {
          // Connection closed
        }
      }, 5000)

      try {
        // Run extraction
        const extractionResult = await extractFromText(text, notebookId, sourceId)

        clearInterval(heartbeatInterval)

        await sendStatus('storing', {
          jobId,
          skillCount: extractionResult.skills.length,
          prerequisiteCount: extractionResult.prerequisites.length
        })

        console.log(`[Graph] Extracted ${extractionResult.skills.length} skills, storing in Neo4J`)

        // Store in Neo4J
        await storeGraphExtraction(extractionResult)

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

        await sendStatus('complete', {
          jobId,
          skillCount: extractionResult.skills.length,
          prerequisiteCount: extractionResult.prerequisites.length
        })

        console.log(`[Graph] Extraction complete: ${extractionResult.skills.length} skills`)

      } catch (extractError) {
        clearInterval(heartbeatInterval)
        throw extractError
      }

    } catch (error) {
      console.error('[Graph] Extraction error:', error)

      // Update job as failed if we have a jobId
      if (jobId) {
        const adminSupabase = createAdminClient()
        await adminSupabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
      }

      await sendStatus('error', {
        error: error instanceof Error ? error.message : 'Extraction failed',
        jobId
      })
    } finally {
      await writer.close()
    }
  })()

  // Don't await - let it run in background while streaming
  extractionPromise.catch(console.error)

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// DELETE /api/notebooks/[id]/sources/[sourceId]/graph - Remove source from graph
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId, sourceId } = await params
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

    if (!isNeo4JAvailable()) {
      return NextResponse.json({ success: true }) // Nothing to delete
    }

    await deleteSourceSkills(sourceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting source graph:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
