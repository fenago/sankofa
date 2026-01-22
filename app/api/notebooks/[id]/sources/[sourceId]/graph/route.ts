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

// Async extraction runner - fire and forget
async function runExtractionAsync(
  jobId: string,
  notebookId: string,
  sourceId: string,
  text: string
) {
  const adminSupabase = createAdminClient()

  try {
    console.log(`[Graph] Starting async extraction for job ${jobId}: ${text.length} chars`)

    // Update job to processing
    await adminSupabase
      .from('extraction_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Run extraction
    const extractionResult = await extractFromText(text, notebookId, sourceId)

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
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[Graph] Extraction complete for job ${jobId}: ${extractionResult.skills.length} skills`)

  } catch (error) {
    console.error(`[Graph] Extraction failed for job ${jobId}:`, error)

    await adminSupabase
      .from('extraction_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

// POST /api/notebooks/[id]/sources/[sourceId]/graph - Start extraction (async)
export async function POST(request: Request, { params }: RouteParams) {
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

    if (!isNeo4JAvailable()) {
      return NextResponse.json({ error: 'Knowledge graph not configured' }, { status: 503 })
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
      return NextResponse.json({
        error: 'Extraction already in progress',
        jobId: activeJob.id
      }, { status: 409 })
    }

    // Get source with raw_text
    const { data: source, error: sourceError } = await adminSupabase
      .from('sources')
      .select('id, raw_text, title, status')
      .eq('id', sourceId)
      .eq('notebook_id', notebookId)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    if (source.status !== 'success') {
      return NextResponse.json({ error: 'Source is not ready' }, { status: 400 })
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
      return NextResponse.json({ error: 'No content available' }, { status: 400 })
    }

    // Delete existing skills for this source
    await deleteSourceSkills(sourceId)

    // Create job record
    const { data: job, error: jobError } = await adminSupabase
      .from('extraction_jobs')
      .insert({
        notebook_id: notebookId,
        source_id: sourceId,
        user_id: user.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Failed to create job record' }, { status: 500 })
    }

    console.log(`[Graph] Created job ${job.id}, starting async extraction for ${text.length} chars`)

    // Fire and forget - start extraction but don't wait
    // This works on Netlify because the function continues after response
    runExtractionAsync(job.id, notebookId, sourceId, text).catch(err => {
      console.error('[Graph] Async extraction error:', err)
    })

    // Return immediately with job ID - frontend will poll for status
    return NextResponse.json({
      status: 'started',
      jobId: job.id,
      message: 'Extraction started. Poll GET endpoint for status.'
    }, { status: 202 })

  } catch (error) {
    console.error('[Graph] POST error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
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
