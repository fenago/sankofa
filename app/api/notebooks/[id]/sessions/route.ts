import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  SessionStatus,
  DeviceType,
  StartSessionRequest,
  StartSessionResponse,
  EndSessionRequest,
  EndSessionResponse,
  GetSessionsRequest,
  GetSessionsResponse,
  LearnerSession,
} from '@/lib/types/interactions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/sessions - Get learner sessions
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

    const action = searchParams.get('action') || 'list'

    switch (action) {
      case 'active': {
        // Get current active session
        const { data: activeSession } = await supabase
          .from('learner_sessions')
          .select('*')
          .eq('notebook_id', notebookId)
          .eq('learner_id', user.id)
          .eq('status', 'active')
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        return NextResponse.json({
          session: activeSession || null,
          has_active_session: !!activeSession,
        })
      }

      case 'list':
      default: {
        // Parse query params
        const status = searchParams.get('status') as SessionStatus | null
        const since = searchParams.get('since')
        const limit = parseInt(searchParams.get('limit') || '20')

        // Build query
        let query = supabase
          .from('learner_sessions')
          .select('*', { count: 'exact' })
          .eq('notebook_id', notebookId)
          .eq('learner_id', user.id)
          .order('started_at', { ascending: false })
          .limit(limit)

        if (status) {
          query = query.eq('status', status)
        }
        if (since) {
          query = query.gte('started_at', since)
        }

        const { data: sessions, error, count } = await query

        if (error) {
          console.error('Error fetching sessions:', error)
          return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
        }

        const response: GetSessionsResponse = {
          sessions: (sessions || []) as LearnerSession[],
          total_count: count || 0,
        }

        return NextResponse.json(response)
      }
    }
  } catch (error) {
    console.error('Error in sessions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/sessions - Start a new session
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

    const body: StartSessionRequest = await request.json()
    const { device_type, user_agent, entry_point = 'direct' } = body

    // Check for existing active session and end it
    const { data: existingSession } = await supabase
      .from('learner_sessions')
      .select('id, started_at')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (existingSession) {
      // Mark existing session as abandoned (or ended if recent)
      const sessionAge = Date.now() - new Date(existingSession.started_at).getTime()
      const thirtyMinutes = 30 * 60 * 1000

      await supabase
        .from('learner_sessions')
        .update({
          status: sessionAge > thirtyMinutes ? 'abandoned' : 'ended',
          ended_at: new Date().toISOString(),
          duration_ms: sessionAge,
        })
        .eq('id', existingSession.id)
    }

    // Get last session to calculate days since last session
    const { data: lastSession } = await supabase
      .from('learner_sessions')
      .select('started_at')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .neq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    const now = new Date()
    let daysSinceLastSession: number | undefined
    let returningSameDay = false

    if (lastSession) {
      const lastDate = new Date(lastSession.started_at)
      const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
      daysSinceLastSession = daysDiff
      returningSameDay = lastDate.toDateString() === now.toDateString()
    }

    // Create new session
    const { data: newSession, error: insertError } = await supabase
      .from('learner_sessions')
      .insert({
        notebook_id: notebookId,
        learner_id: user.id,
        device_type: device_type || null,
        user_agent: user_agent || null,
        status: 'active',
      })
      .select('id, started_at')
      .single()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
    }

    // Record session_started interaction
    await supabase
      .from('learner_interactions')
      .insert({
        notebook_id: notebookId,
        learner_id: user.id,
        event_type: 'session_started',
        session_id: newSession.id,
        payload: {
          entryPoint: entry_point,
          returningSameDay,
          daysSinceLastSession,
        },
        context: {
          timeOfDay: getTimeOfDay(now.getHours()),
          dayOfWeek: now.getDay(),
          deviceType: device_type || 'desktop',
        },
      })

    const response: StartSessionResponse = {
      session_id: newSession.id,
      started_at: newSession.started_at,
      returning_same_day: returningSameDay,
      days_since_last_session: daysSinceLastSession,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error starting session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notebooks/[id]/sessions - End or update a session
export async function PATCH(request: Request, { params }: RouteParams) {
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

    const body: EndSessionRequest = await request.json()
    const { session_id, end_reason = 'explicit', final_skill_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('learner_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('learner_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const now = new Date()
    const durationMs = now.getTime() - new Date(session.started_at).getTime()

    // Update session as ended
    const { error: updateError } = await supabase
      .from('learner_sessions')
      .update({
        status: 'ended',
        ended_at: now.toISOString(),
        duration_ms: durationMs,
      })
      .eq('id', session_id)

    if (updateError) {
      console.error('Error ending session:', updateError)
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
    }

    // Get practice streak (consecutive correct answers at end of session)
    const { data: recentAttempts } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('session_id', session_id)
      .eq('event_type', 'practice_attempt')
      .order('created_at', { ascending: false })
      .limit(20)

    let practiceStreak = 0
    if (recentAttempts) {
      for (const attempt of recentAttempts) {
        if ((attempt.payload as { isCorrect?: boolean })?.isCorrect) {
          practiceStreak++
        } else {
          break
        }
      }
    }

    // Record session_ended interaction
    await supabase
      .from('learner_interactions')
      .insert({
        notebook_id: notebookId,
        learner_id: user.id,
        event_type: 'session_ended',
        session_id,
        session_duration_ms: durationMs,
        payload: {
          endReason: end_reason,
          finalSkillId: final_skill_id,
          practiceStreak,
        },
        context: {
          timeOfDay: getTimeOfDay(now.getHours()),
          dayOfWeek: now.getDay(),
          deviceType: session.device_type || 'desktop',
        },
      })

    // Calculate session summary
    const accuracy = session.practice_attempts > 0
      ? session.correct_attempts / session.practice_attempts
      : 0

    // Get unique skills practiced
    const uniqueSkills = [...new Set(session.skills_practiced || [])]

    const response: EndSessionResponse = {
      success: true,
      session_summary: {
        duration_ms: durationMs,
        total_interactions: session.total_interactions,
        practice_attempts: session.practice_attempts,
        correct_attempts: session.correct_attempts,
        accuracy,
        skills_practiced: uniqueSkills,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to determine time of day
function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}
