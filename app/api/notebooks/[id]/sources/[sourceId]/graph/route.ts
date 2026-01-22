import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { storeGraphExtraction, getSkillCountBySource, deleteSourceSkills } from '@/lib/graph/store'
import { extractFromText } from '@/lib/pipeline/extraction'

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>
}

// GET /api/notebooks/[id]/sources/[sourceId]/graph - Check if source has been graphed
export async function GET(request: Request, { params }: RouteParams) {
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

    // Check if Neo4J is available
    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        graphed: false,
        skillCount: 0,
        available: false,
      })
    }

    // Get skill count for this source
    const skillCount = await getSkillCountBySource(sourceId)

    return NextResponse.json({
      graphed: skillCount > 0,
      skillCount,
      available: true,
    })
  } catch (error) {
    console.error('Error checking source graph status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/sources/[sourceId]/graph - Extract graph from single source
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

    console.log(`[Graph] Extracting from source ${sourceId}: ${text.length} chars`)

    // Delete existing skills for this source (re-extract)
    await deleteSourceSkills(sourceId)

    // Extract and store
    const result = await extractFromText(text, notebookId, sourceId)
    await storeGraphExtraction(result)

    console.log(`[Graph] Extracted ${result.skills.length} skills, ${result.prerequisites.length} prerequisites from source ${sourceId}`)

    return NextResponse.json({
      success: true,
      skillCount: result.skills.length,
      prerequisiteCount: result.prerequisites.length,
      entityCount: result.entities.length,
    })
  } catch (error) {
    console.error('Error extracting source graph:', error)
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
