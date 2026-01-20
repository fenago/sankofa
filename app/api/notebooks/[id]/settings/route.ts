import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { NotebookSettings } from '@/lib/types/database'
import { DEFAULT_NOTEBOOK_SETTINGS } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/settings - Get notebook settings
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get notebook with settings
    const { data: notebook, error } = await supabase
      .from('notebooks')
      .select('id, settings')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (error || !notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Merge with defaults to ensure all fields exist
    const settings: NotebookSettings = {
      ...DEFAULT_NOTEBOOK_SETTINGS,
      ...(notebook.settings as Partial<NotebookSettings> || {}),
      bkt_parameters: {
        ...DEFAULT_NOTEBOOK_SETTINGS.bkt_parameters,
        ...((notebook.settings as Partial<NotebookSettings>)?.bkt_parameters || {}),
      },
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notebooks/[id]/settings - Update notebook settings
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current notebook
    const { data: notebook, error: fetchError } = await supabase
      .from('notebooks')
      .select('id, settings')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates = body.settings as Partial<NotebookSettings>

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid settings object' }, { status: 400 })
    }

    // Validate BKT parameters if provided
    if (updates.bkt_parameters) {
      const bkt = updates.bkt_parameters
      const isValidProbability = (v: unknown): boolean =>
        typeof v === 'number' && v >= 0 && v <= 1

      if (bkt.default_pL0 !== undefined && !isValidProbability(bkt.default_pL0)) {
        return NextResponse.json({ error: 'pL0 must be between 0 and 1' }, { status: 400 })
      }
      if (bkt.default_pT !== undefined && !isValidProbability(bkt.default_pT)) {
        return NextResponse.json({ error: 'pT must be between 0 and 1' }, { status: 400 })
      }
      if (bkt.default_pS !== undefined && !isValidProbability(bkt.default_pS)) {
        return NextResponse.json({ error: 'pS must be between 0 and 1' }, { status: 400 })
      }
      if (bkt.default_pG !== undefined && !isValidProbability(bkt.default_pG)) {
        return NextResponse.json({ error: 'pG must be between 0 and 1' }, { status: 400 })
      }
    }

    // Merge settings
    const currentSettings = notebook.settings as Partial<NotebookSettings> || {}
    const newSettings: NotebookSettings = {
      ...DEFAULT_NOTEBOOK_SETTINGS,
      ...currentSettings,
      ...updates,
      bkt_parameters: {
        ...DEFAULT_NOTEBOOK_SETTINGS.bkt_parameters,
        ...(currentSettings.bkt_parameters || {}),
        ...(updates.bkt_parameters || {}),
      },
    }

    // Update notebook
    const { error: updateError } = await supabase
      .from('notebooks')
      .update({ settings: newSettings })
      .eq('id', notebookId)

    if (updateError) {
      console.error('Error updating settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: newSettings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
