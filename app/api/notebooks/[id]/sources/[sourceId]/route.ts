import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteSourceGraph } from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>
}

// DELETE /api/notebooks/[id]/sources/[sourceId] - Delete a source
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

    // Verify source belongs to notebook
    const { data: source } = await supabase
      .from('sources')
      .select('id')
      .eq('id', sourceId)
      .eq('notebook_id', notebookId)
      .single()

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Delete Neo4J graph data for this source
    try {
      await deleteSourceGraph(sourceId)
    } catch (graphError) {
      console.error('Error deleting Neo4J graph data for source:', graphError)
      // Continue with Supabase deletion even if Neo4J fails
    }

    // Delete source (chunks will cascade delete due to foreign key)
    const { error: deleteError } = await supabase
      .from('sources')
      .delete()
      .eq('id', sourceId)

    if (deleteError) {
      console.error('Error deleting source:', deleteError)
      return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
