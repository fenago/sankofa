import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getSkillCountBySource, deleteSourceSkills } from '@/lib/graph/store'

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
      .select('id, status, created_at')
      .eq('source_id', sourceId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeJob) {
      return NextResponse.json({
        graphed: false,
        skillCount: 0,
        available: true,
        extracting: true,
        jobId: activeJob.id,
        jobStatus: activeJob.status,
      })
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

// POST /api/notebooks/[id]/sources/[sourceId]/graph - Start async graph extraction
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

    // Check if Neo4J is available
    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        success: false,
        message: 'Knowledge graph features are not configured.',
      }, { status: 503 })
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
        success: false,
        message: 'Extraction already in progress',
        jobId: activeJob.id,
        status: activeJob.status,
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
      return NextResponse.json({ error: 'Source is not ready for graph extraction' }, { status: 400 })
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
        console.log(`[Graph] Reconstructed ${text.length} chars from ${chunks.length} chunks`)
      }
    }

    if (!text) {
      return NextResponse.json({ error: 'No content available for extraction' }, { status: 400 })
    }

    console.log(`[Graph] Starting async extraction for source ${sourceId}: ${text.length} chars`)

    // Delete existing skills for this source (re-extract)
    await deleteSourceSkills(sourceId)

    // Create extraction job record
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
      console.error('[Graph] Failed to create job:', jobError)
      return NextResponse.json({ error: 'Failed to start extraction' }, { status: 500 })
    }

    // Get the base URL for internal API call
    const baseUrl = process.env.URL || process.env.NETLIFY_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
    const workerUrl = `${baseUrl}/api/extract-worker`
    const secret = process.env.INTERNAL_API_SECRET || 'dev-secret'

    console.log(`[Graph] Triggering worker at ${workerUrl}`)

    // Fire and forget - don't await the full response
    // Just ensure the request is sent
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        notebookId,
        sourceId,
        text,
        secret,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Graph] Worker returned error:', res.status, errorText)
      }
    }).catch(err => {
      console.error('[Graph] Failed to trigger worker:', err)
      // Update job as failed
      adminSupabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to start extraction worker: ' + (err instanceof Error ? err.message : 'Unknown'),
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    })

    return NextResponse.json({
      success: true,
      async: true,
      jobId: job.id,
      message: 'Extraction started. Poll GET endpoint for status.',
    })
  } catch (error) {
    console.error('Error starting source graph extraction:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Extraction failed'
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
