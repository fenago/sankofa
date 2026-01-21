/**
 * Micro-Assessment API
 *
 * Provides endpoints for periodic micro-assessments to improve learner profile data.
 *
 * GET /api/notebooks/[id]/micro-assessment
 *   - Check if a micro-assessment should be triggered
 *   - Returns assessment questions if needed
 *
 * POST /api/notebooks/[id]/micro-assessment
 *   - Submit micro-assessment results
 *   - Updates learner profile with new data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  shouldTriggerMicroAssessment,
  processMicroAssessmentResults,
  getAssessmentTypeName,
  getAssessmentTypeDescription,
  type AssessmentTriggerContext,
  type MicroAssessmentResult,
} from '@/lib/adaptive/micro-assessment-service'
import type { InverseProfile } from '@/lib/types/interactions'
import type { Json } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET: Check if a micro-assessment should be triggered
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const learnerId = user.id
    const searchParams = request.nextUrl.searchParams

    // Parse context from query params
    const timeSinceLastAssessment = parseInt(searchParams.get('timeSinceLastAssessment') || '0')
    const interactionsSinceLastAssessment = parseInt(searchParams.get('interactionsSinceLastAssessment') || '0')
    const currentSessionDurationMs = parseInt(searchParams.get('currentSessionDurationMs') || '0')
    const recentAccuracy = searchParams.get('recentAccuracy')
      ? parseFloat(searchParams.get('recentAccuracy')!)
      : undefined

    // Fetch learner's inverse profile
    const { data: profileData } = await supabase
      .from('inverse_profiles')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .single()

    const profile: InverseProfile | null = profileData
      ? {
          id: profileData.id,
          learner_id: profileData.learner_id,
          notebook_id: profileData.notebook_id,
          version: profileData.version,
          computed_at: profileData.computed_at,
          interactions_analyzed: profileData.interactions_analyzed,
          knowledge_state: profileData.knowledge_state as unknown as InverseProfile['knowledge_state'],
          cognitive_indicators: profileData.cognitive_indicators as unknown as InverseProfile['cognitive_indicators'],
          metacognitive_indicators: profileData.metacognitive_indicators as unknown as InverseProfile['metacognitive_indicators'],
          motivational_indicators: profileData.motivational_indicators as unknown as InverseProfile['motivational_indicators'],
          behavioral_patterns: profileData.behavioral_patterns as unknown as InverseProfile['behavioral_patterns'],
          confidence_scores: profileData.confidence_scores as unknown as InverseProfile['confidence_scores'],
        }
      : null

    // Check for recent confidence ratings
    const { data: recentInteractions } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .eq('event_type', 'confidence_rated')
      .order('created_at', { ascending: false })
      .limit(5)

    const recentConfidenceRatings = recentInteractions
      ?.map(i => (i.payload as Record<string, unknown>)?.rating as number)
      .filter(r => typeof r === 'number') || []

    // Build trigger context
    const triggerContext: AssessmentTriggerContext = {
      timeSinceLastAssessment,
      interactionsSinceLastAssessment,
      profile,
      currentSessionDurationMs,
      recentAccuracy,
      recentConfidenceRatings,
    }

    // Check if assessment should be triggered
    const recommendation = shouldTriggerMicroAssessment(triggerContext)

    return NextResponse.json({
      success: true,
      shouldTrigger: recommendation.shouldTrigger,
      reason: recommendation.reason,
      assessmentType: recommendation.assessmentType,
      assessmentTypeName: getAssessmentTypeName(recommendation.assessmentType),
      assessmentTypeDescription: getAssessmentTypeDescription(recommendation.assessmentType),
      priority: recommendation.priority,
      questions: recommendation.questions,
    })
  } catch (error) {
    console.error('[MicroAssessment] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST: Submit micro-assessment results
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const learnerId = user.id
    const body = await request.json()
    const { results, sessionId } = body as { results: MicroAssessmentResult[]; sessionId?: string }

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 })
    }

    // Process the results
    const { updates, insights } = processMicroAssessmentResults(results)

    // Get or create a session for the interaction
    let effectiveSessionId = sessionId

    if (!effectiveSessionId) {
      // Try to get the most recent active session
      const { data: recentSession } = await supabase
        .from('learner_sessions')
        .select('id')
        .eq('notebook_id', notebookId)
        .eq('learner_id', learnerId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (recentSession) {
        effectiveSessionId = recentSession.id
      } else {
        // Create a new session for the micro-assessment
        const { data: newSession } = await supabase
          .from('learner_sessions')
          .insert({
            notebook_id: notebookId,
            learner_id: learnerId,
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        effectiveSessionId = newSession?.id || crypto.randomUUID()
      }
    }

    // Log the micro-assessment interaction
    await supabase.from('learner_interactions').insert({
      learner_id: learnerId,
      notebook_id: notebookId,
      session_id: effectiveSessionId,
      event_type: 'micro_assessment_completed',
      payload: {
        results: results.map(r => ({
          ...r,
          response: String(r.response), // Ensure response is serializable
        })),
        updates,
        insights,
        completedAt: new Date().toISOString(),
      } as unknown as Json,
    })

    // Update the inverse profile with new data
    if (Object.keys(updates).length > 0) {
      // Fetch current profile
      const { data: currentProfile } = await supabase
        .from('inverse_profiles')
        .select('*')
        .eq('notebook_id', notebookId)
        .eq('learner_id', learnerId)
        .single()

      if (currentProfile) {
        // Build update object by parsing dotted keys
        const profileUpdates: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(updates)) {
          const parts = key.split('.')
          if (parts.length === 2) {
            const [category, field] = parts
            if (!profileUpdates[category]) {
              profileUpdates[category] = { ...(currentProfile[category as keyof typeof currentProfile] as Record<string, unknown> || {}) }
            }
            (profileUpdates[category] as Record<string, unknown>)[field] = value
          }
        }

        // Apply updates to profile
        await supabase
          .from('inverse_profiles')
          .update({
            ...profileUpdates,
            version: (currentProfile.version || 1) + 1,
            computed_at: new Date().toISOString(),
          })
          .eq('id', currentProfile.id)
      } else {
        // Create new profile with the updates
        const newProfile: {
          learner_id: string
          notebook_id: string
          version: number
          computed_at: string
          interactions_analyzed: number
          knowledge_state: Json
          cognitive_indicators: Json
          metacognitive_indicators: Json
          motivational_indicators: Json
          behavioral_patterns: Json
          confidence_scores: Json
        } = {
          learner_id: learnerId,
          notebook_id: notebookId,
          version: 1,
          computed_at: new Date().toISOString(),
          interactions_analyzed: 1,
          knowledge_state: {} as Json,
          cognitive_indicators: {} as Json,
          metacognitive_indicators: {} as Json,
          motivational_indicators: {} as Json,
          behavioral_patterns: {} as Json,
          confidence_scores: {
            knowledge: 0.3,
            cognitive: 0.3,
            metacognitive: 0.3,
            motivational: 0.3,
            behavioral: 0.3,
          } as Json,
        }

        // Apply updates to new profile
        for (const [key, value] of Object.entries(updates)) {
          const parts = key.split('.')
          if (parts.length === 2) {
            const [category, field] = parts
            const categoryKey = category as keyof typeof newProfile
            if (categoryKey && typeof newProfile[categoryKey] === 'object') {
              (newProfile[categoryKey] as Record<string, unknown>)[field] = value
            }
          }
        }

        await supabase.from('inverse_profiles').insert(newProfile)
      }
    }

    return NextResponse.json({
      success: true,
      updatesApplied: Object.keys(updates).length,
      insights,
      message: 'Micro-assessment results recorded successfully',
    })
  } catch (error) {
    console.error('[MicroAssessment] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
