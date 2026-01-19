import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import {
  getLearnerStatesByNotebook,
  getLearnerProgress,
  getSkillsDueForReview,
  getMasteredSkillIds,
  recordPracticeAttempt,
  deleteLearnerStateForNotebook,
} from '@/lib/graph/learner-state'
import { getZPDSkills } from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/learner - Get learner state and progress
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

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
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const learnerId = user.id
    const action = searchParams.get('action') || 'progress'

    switch (action) {
      case 'progress': {
        // Get overall progress summary
        const progress = await getLearnerProgress(learnerId, notebookId)
        return NextResponse.json({
          available: true,
          progress,
        })
      }

      case 'states': {
        // Get all learner states for this notebook
        const states = await getLearnerStatesByNotebook(learnerId, notebookId)
        return NextResponse.json({
          available: true,
          states,
          count: states.length,
        })
      }

      case 'due': {
        // Get skills due for review (spaced repetition)
        const limit = parseInt(searchParams.get('limit') || '10')
        const dueSkills = await getSkillsDueForReview(learnerId, notebookId, limit)
        return NextResponse.json({
          available: true,
          dueSkills,
          count: dueSkills.length,
        })
      }

      case 'zpd': {
        // Get Zone of Proximal Development skills using actual mastered state
        const masteredIds = await getMasteredSkillIds(learnerId, notebookId)
        const zpdSkills = await getZPDSkills(notebookId, masteredIds)
        return NextResponse.json({
          available: true,
          zpdSkills,
          masteredCount: masteredIds.length,
        })
      }

      case 'mastered': {
        // Get list of mastered skill IDs
        const masteredIds = await getMasteredSkillIds(learnerId, notebookId)
        return NextResponse.json({
          available: true,
          masteredIds,
          count: masteredIds.length,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in learner state API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/learner - Record practice attempt
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

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const body = await request.json()
    const {
      skillId,
      isCorrect,
      responseTimeMs,
      expectedTimeMs,
      masteryThreshold = 0.8,
    } = body

    if (!skillId || typeof isCorrect !== 'boolean') {
      return NextResponse.json({
        error: 'skillId and isCorrect (boolean) are required',
      }, { status: 400 })
    }

    const learnerId = user.id

    // Record the practice attempt (updates BKT, SM-2, scaffold level)
    const updatedState = await recordPracticeAttempt(
      learnerId,
      skillId,
      isCorrect,
      masteryThreshold,
      responseTimeMs,
      expectedTimeMs
    )

    // Get updated progress
    const progress = await getLearnerProgress(learnerId, notebookId)

    return NextResponse.json({
      available: true,
      updatedState,
      progress,
      message: updatedState.masteryStatus === 'mastered'
        ? 'Skill mastered!'
        : `Mastery: ${(updatedState.pMastery * 100).toFixed(1)}%`,
    })
  } catch (error) {
    console.error('Error recording practice attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notebooks/[id]/learner - Reset learner progress
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

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const learnerId = user.id
    await deleteLearnerStateForNotebook(learnerId, notebookId)

    return NextResponse.json({
      available: true,
      success: true,
      message: 'Learner progress reset successfully',
    })
  } catch (error) {
    console.error('Error resetting learner progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
