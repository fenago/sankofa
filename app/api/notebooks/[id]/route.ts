import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteNotebookGraph } from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id] - Get a specific notebook
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: notebook, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Also fetch source count and message count
    const [sourcesResult, messagesResult] = await Promise.all([
      supabase
        .from('sources')
        .select('id', { count: 'exact' })
        .eq('notebook_id', id),
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('notebook_id', id),
    ])

    return NextResponse.json({
      notebook,
      stats: {
        sourceCount: sourcesResult.count || 0,
        messageCount: messagesResult.count || 0,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notebooks/[id] - Update a notebook
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color } = body

    // Build update object with only provided fields
    const updates: Record<string, string | null> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (color !== undefined) updates.color = color

    const { data: notebook, error } = await supabase
      .from('notebooks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !notebook) {
      return NextResponse.json({ error: 'Notebook not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ notebook })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notebooks/[id] - Delete a notebook
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership before delete
    const { data: existing } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Delete Neo4J graph data for this notebook
    try {
      await deleteNotebookGraph(id)
    } catch (graphError) {
      console.error('Error deleting Neo4J graph data:', graphError)
      // Continue with Supabase deletion even if Neo4J fails
    }

    // Delete will cascade to sources, chunks, and messages in Supabase
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting notebook:', error)
      return NextResponse.json({ error: 'Failed to delete notebook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
