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

// POST /api/notebooks/[id]/sources/[sourceId]/graph - Start extraction via Supabase Edge Function
// The edge function runs with 150s timeout and handles the actual extraction
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

    // Get source to verify it exists and is ready
    const { data: source, error: sourceError } = await adminSupabase
      .from('sources')
      .select('id, title, status, raw_text')
      .eq('id', sourceId)
      .eq('notebook_id', notebookId)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    if (source.status !== 'success') {
      return NextResponse.json({ error: 'Source is not ready' }, { status: 400 })
    }

    // Check if there's content available
    let hasContent = !!source.raw_text
    if (!hasContent) {
      const { count } = await adminSupabase
        .from('chunks')
        .select('*', { count: 'exact', head: true })
        .eq('source_id', sourceId)
      hasContent = (count || 0) > 0
    }

    if (!hasContent) {
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

    console.log(`[Graph] Created job ${job.id}, invoking Supabase Edge Function`)

    // Call Supabase Edge Function (fire-and-forget)
    // The edge function will update job status when complete
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    // Invoke edge function without awaiting (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/extract-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        jobId: job.id,
        notebookId,
        sourceId,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text()
        console.error(`[Graph] Edge function error: ${res.status} - ${errorText}`)
      } else {
        const result = await res.json()
        console.log(`[Graph] Edge function completed:`, result)
      }
    }).catch((err) => {
      console.error(`[Graph] Edge function call failed:`, err)
    })

    // Return immediately - frontend will poll for completion
    return NextResponse.json({
      status: 'started',
      jobId: job.id,
      message: 'Extraction started via Supabase Edge Function'
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
