import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable, ensureIndexes } from '@/lib/graph/neo4j'
import { getSkillGraph, getEntitiesByNotebook, storeGraphExtraction, deleteNotebookGraph } from '@/lib/graph/store'
import { extractFromText, batchExtractFromTexts } from '@/lib/pipeline/extraction'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/graph - Get full knowledge graph for a notebook
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
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
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
        skills: [],
        prerequisites: [],
        entities: [],
      })
    }

    // Ensure indexes exist (idempotent, runs once per server lifetime)
    await ensureIndexes()

    // Get skills with prerequisites
    const skillGraph = await getSkillGraph(notebookId)

    // Get entities
    const entities = await getEntitiesByNotebook(notebookId)

    // Transform prerequisites to match frontend format
    // API stores: { fromSkillId, toSkillId, strength }
    // Frontend expects: { source, target, type }
    const prerequisites = skillGraph.prerequisites.map(p => ({
      source: p.fromSkillId,
      target: p.toSkillId,
      type: p.strength || 'recommended',
    }))

    return NextResponse.json({
      available: true,
      skills: skillGraph.skills,
      prerequisites,
      entities,
    })
  } catch (error) {
    console.error('Error fetching graph:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/graph - Extract and store graph from sources
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
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
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
        success: false,
      }, { status: 503 })
    }

    // Get request body
    const body = await request.json()
    const { sourceId, text, rebuild = false } = body

    // If rebuild requested, clear existing graph data
    if (rebuild) {
      await deleteNotebookGraph(notebookId)
    }

    // If text is provided directly, extract from it
    if (text) {
      const result = await extractFromText(text, notebookId, sourceId)
      await storeGraphExtraction(result)
      return NextResponse.json({
        success: true,
        skills: result.skills.length,
        entities: result.entities.length,
        prerequisites: result.prerequisites.length,
      })
    }

    // Otherwise, extract from all sources in the notebook
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, raw_text')
      .eq('notebook_id', notebookId)
      .eq('status', 'success')

    if (sourcesError || !sources || sources.length === 0) {
      return NextResponse.json({ error: 'No sources found' }, { status: 404 })
    }

    // For sources without raw_text, reconstruct from chunks
    const textsToExtract: { content: string; sourceId: string }[] = []

    for (const source of sources) {
      if (source.raw_text) {
        textsToExtract.push({ content: source.raw_text, sourceId: source.id })
      } else {
        // Reconstruct from chunks
        const { data: chunks } = await supabase
          .from('chunks')
          .select('content')
          .eq('source_id', source.id)
          .order('chunk_index', { ascending: true })

        if (chunks && chunks.length > 0) {
          const reconstructedText = chunks.map(c => c.content).join('\n\n')
          textsToExtract.push({ content: reconstructedText, sourceId: source.id })
          console.log(`[Graph] Reconstructed ${reconstructedText.length} chars from ${chunks.length} chunks for source ${source.id}`)
        }
      }
    }

    if (textsToExtract.length === 0) {
      return NextResponse.json({ error: 'No source content available' }, { status: 404 })
    }

    // Extract from all sources
    const texts = textsToExtract

    const result = await batchExtractFromTexts(texts, notebookId)
    await storeGraphExtraction(result)

    return NextResponse.json({
      success: true,
      skills: result.skills.length,
      entities: result.entities.length,
      prerequisites: result.prerequisites.length,
    })
  } catch (error) {
    console.error('Error building graph:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notebooks/[id]/graph - Delete graph data for a notebook
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
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
        available: false,
        message: 'Knowledge graph features are not configured.',
        success: true, // Nothing to delete if not configured
      })
    }

    await deleteNotebookGraph(notebookId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting graph:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
