import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database'
import type {
  InteractionEventType,
  InteractionContext,
  RecordInteractionRequest,
  RecordInteractionResponse,
  GetInteractionsResponse,
  LearnerInteraction,
} from '@/lib/types/interactions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/interactions - Get learner interactions
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook access
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Parse query params
    const eventType = searchParams.get('event_type')
    const skillId = searchParams.get('skill_id')
    const sessionId = searchParams.get('session_id')
    const since = searchParams.get('since')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('learner_interactions')
      .select('*', { count: 'exact' })
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (skillId) {
      query = query.eq('skill_id', skillId)
    }
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }
    if (since) {
      query = query.gte('created_at', since)
    }

    const { data: interactions, error, count } = await query

    if (error) {
      console.error('Error fetching interactions:', error)
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 })
    }

    // Cast the interactions to our typed interface
    const typedInteractions: LearnerInteraction[] = (interactions || []).map(i => ({
      ...i,
      event_type: i.event_type as InteractionEventType,
      payload: i.payload as unknown as LearnerInteraction['payload'],
      context: i.context as unknown as LearnerInteraction['context'],
    }))

    const response: GetInteractionsResponse = {
      interactions: typedInteractions,
      total_count: count || 0,
      has_more: (count || 0) > offset + limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in interactions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/interactions - Record a learner interaction
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook access
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const body: RecordInteractionRequest = await request.json()
    const { event_type, skill_id, session_id, payload = {}, context = {} } = body

    if (!event_type || !session_id) {
      return NextResponse.json({
        error: 'event_type and session_id are required',
      }, { status: 400 })
    }

    // Get the session to calculate timing
    const { data: session } = await supabase
      .from('learner_sessions')
      .select('started_at, total_interactions, practice_attempts, correct_attempts, hints_requested, skills_practiced')
      .eq('id', session_id)
      .eq('learner_id', user.id)
      .single()

    // Calculate session duration if session exists
    let sessionDurationMs: number | null = null
    if (session) {
      sessionDurationMs = Date.now() - new Date(session.started_at).getTime()
    }

    // Get last interaction for this session to calculate time since last
    const { data: lastInteraction } = await supabase
      .from('learner_interactions')
      .select('created_at')
      .eq('session_id', session_id)
      .eq('learner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let timeSinceLastMs: number | null = null
    if (lastInteraction) {
      timeSinceLastMs = Date.now() - new Date(lastInteraction.created_at).getTime()
    }

    // Enrich context with time-of-day info
    const now = new Date()
    const hour = now.getHours()
    const enrichedContext: InteractionContext = {
      timeOfDay: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night',
      dayOfWeek: now.getDay(),
      deviceType: context.deviceType || 'desktop',
      ...context,
    }

    // Insert the interaction
    const { data: interaction, error: insertError } = await supabase
      .from('learner_interactions')
      .insert({
        notebook_id: notebookId,
        learner_id: user.id,
        skill_id: skill_id || null,
        event_type,
        session_id,
        session_duration_ms: sessionDurationMs,
        time_since_last_ms: timeSinceLastMs,
        payload: payload as unknown as Json,
        context: enrichedContext as unknown as Json,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting interaction:', insertError)
      return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 })
    }

    // Update session counters
    let sessionUpdated = false
    if (session) {
      const isPracticeCorrect = (payload as { isCorrect?: boolean })?.isCorrect

      // Build update object based on event type
      const updateData: Record<string, unknown> = {
        total_interactions: (session.total_interactions || 0) + 1,
      }

      if (event_type === 'practice_attempt') {
        updateData.practice_attempts = (session.practice_attempts || 0) + 1
        if (isPracticeCorrect) {
          updateData.correct_attempts = (session.correct_attempts || 0) + 1
        }
        if (skill_id) {
          const currentSkills = session.skills_practiced || []
          if (!currentSkills.includes(skill_id)) {
            updateData.skills_practiced = [...currentSkills, skill_id]
          }
        }
      } else if (event_type === 'hint_requested') {
        updateData.hints_requested = (session.hints_requested || 0) + 1
      }

      const { error: updateError } = await supabase
        .from('learner_sessions')
        .update(updateData)
        .eq('id', session_id)

      sessionUpdated = !updateError
    }

    const response: RecordInteractionResponse = {
      success: true,
      interaction_id: interaction.id,
      session_updated: sessionUpdated,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error recording interaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
