import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notebooks - List all notebooks for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: notebooks, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching notebooks:', error)
      return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 })
    }

    return NextResponse.json({ notebooks })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks - Create a new notebook
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: notebook, error } = await supabase
      .from('notebooks')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3b82f6',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notebook:', error)
      return NextResponse.json({ error: 'Failed to create notebook' }, { status: 500 })
    }

    return NextResponse.json({ notebook }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
