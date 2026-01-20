/**
 * Adaptive Learning API
 *
 * Provides personalized skill recommendations based on the learner's inverse profile.
 * Integrates ZPD skills with profile-aware filtering and ranking.
 *
 * GET /api/notebooks/[id]/adaptive?action=recommendations
 * GET /api/notebooks/[id]/adaptive?action=next-skill
 * GET /api/notebooks/[id]/adaptive?action=learning-path
 * GET /api/notebooks/[id]/adaptive?action=interventions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getZPDSkills, generateLearningPath } from '@/lib/graph/store'
import { getMasteredSkillIds } from '@/lib/graph/learner-state'
import {
  generateAdaptiveRecommendations,
  getNextBestSkill,
  adjustTimeEstimate,
  type AdaptiveContext,
  type ZPDSkillWithState,
} from '@/lib/adaptive/adaptive-learning-service'
import {
  evaluateTriggers,
  createTriggerContext,
  type TriggerContext,
} from '@/lib/adaptive/intervention-triggers'
import type { InverseProfile } from '@/lib/types/interactions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/adaptive - Get adaptive recommendations
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook exists
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const action = searchParams.get('action') || 'recommendations'
    const learnerId = user.id

    // Check Neo4J availability
    const neo4jAvailable = isNeo4JAvailable()

    if (!neo4jAvailable) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph not available',
        recommendations: [],
        activeInterventions: {},
        profileSummary: null,
      })
    }

    // Fetch learner profile
    const { data: profileData } = await supabase
      .from('inverse_profiles')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .single()

    // Convert to typed profile (null if not exists)
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

    // Get mastered skills and ZPD skills
    const masteredIds = await getMasteredSkillIds(learnerId, notebookId)
    const zpdSkillsRaw = await getZPDSkills(notebookId, masteredIds)

    // Convert to ZPDSkillWithState
    const zpdSkills: ZPDSkillWithState[] = zpdSkillsRaw.map((s) => ({
      skill: s.skill,
      readinessScore: s.readinessScore,
      prerequisitesMastered: s.prerequisitesMastered,
      prerequisitesPending: s.prerequisitesPending,
    }))

    // Get recent session data for context
    const { data: recentSession } = await supabase
      .from('learner_sessions')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Get recent performance from interactions
    const { data: recentInteractions } = await supabase
      .from('learner_interactions')
      .select('event_type, payload, created_at')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate consecutive successes/failures
    let consecutiveSuccesses = 0
    let consecutiveFailures = 0
    let currentErrors = 0
    const recentDifficulties: number[] = []

    if (recentInteractions) {
      for (const interaction of recentInteractions) {
        if (interaction.event_type === 'practice_attempt') {
          const payload = interaction.payload as Record<string, unknown>
          const isCorrect = payload?.isCorrect as boolean | undefined
          const difficulty = payload?.difficulty as number | undefined

          if (difficulty !== undefined) {
            recentDifficulties.push(difficulty)
          }

          if (isCorrect === true) {
            if (consecutiveFailures === 0) {
              consecutiveSuccesses++
            } else {
              break // Stop counting when pattern changes
            }
          } else if (isCorrect === false) {
            currentErrors++
            if (consecutiveSuccesses === 0) {
              consecutiveFailures++
            } else {
              break
            }
          }
        }
      }
    }

    // Calculate session duration
    const sessionDurationMs = recentSession?.started_at
      ? Date.now() - new Date(recentSession.started_at).getTime()
      : 0

    const recentPerformance = {
      consecutiveSuccesses,
      consecutiveFailures,
      sessionDurationMs,
    }

    // Build adaptive context
    const adaptiveContext: AdaptiveContext = {
      profile,
      zpdSkills,
      recentPerformance,
    }

    switch (action) {
      case 'recommendations': {
        const result = generateAdaptiveRecommendations(adaptiveContext)

        return NextResponse.json({
          available: true,
          hasProfile: !!profile,
          recommendations: result.recommendations.map((r) => ({
            skillId: r.skillId,
            skill: {
              id: r.skill.id,
              name: r.skill.name,
              description: r.skill.description,
              bloomLevel: r.skill.bloomLevel,
              difficulty: r.skill.difficulty,
              estimatedMinutes: profile
                ? adjustTimeEstimate(
                    r.skill.estimatedMinutes ?? 30,
                    profile.cognitive_indicators.expertiseLevel
                  )
                : r.skill.estimatedMinutes,
              isThresholdConcept: r.skill.isThresholdConcept,
              cognitiveLoadEstimate: r.skill.cognitiveLoadEstimate,
            },
            score: r.score,
            reasons: r.reasons,
            adjustments: r.adjustments,
            whyExplanation: r.whyExplanation,
          })),
          activeInterventions: result.activeInterventions,
          profileSummary: result.profileSummary,
          totalZPDSkills: zpdSkills.length,
          masteredCount: masteredIds.length,
        })
      }

      case 'next-skill': {
        const recommendation = getNextBestSkill(adaptiveContext)

        if (!recommendation) {
          return NextResponse.json({
            available: true,
            hasProfile: !!profile,
            nextSkill: null,
            message: zpdSkills.length === 0
              ? 'All available skills require unmet prerequisites'
              : 'No recommendations available',
          })
        }

        return NextResponse.json({
          available: true,
          hasProfile: !!profile,
          nextSkill: {
            skillId: recommendation.skillId,
            skill: {
              id: recommendation.skill.id,
              name: recommendation.skill.name,
              description: recommendation.skill.description,
              bloomLevel: recommendation.skill.bloomLevel,
              difficulty: recommendation.skill.difficulty,
              estimatedMinutes: profile
                ? adjustTimeEstimate(
                    recommendation.skill.estimatedMinutes ?? 30,
                    profile.cognitive_indicators.expertiseLevel
                  )
                : recommendation.skill.estimatedMinutes,
              isThresholdConcept: recommendation.skill.isThresholdConcept,
            },
            score: recommendation.score,
            reasons: recommendation.reasons,
            adjustments: recommendation.adjustments,
            whyExplanation: recommendation.whyExplanation,
          },
        })
      }

      case 'learning-path': {
        const goalSkillId = searchParams.get('goalSkillId')

        if (!goalSkillId) {
          return NextResponse.json(
            { error: 'goalSkillId parameter required' },
            { status: 400 }
          )
        }

        const path = await generateLearningPath(notebookId, goalSkillId, masteredIds)

        // Adjust time estimates based on profile
        const adjustedPath = profile
          ? path.path.map((skill) => ({
              ...skill,
              adjustedMinutes: adjustTimeEstimate(
                skill.estimatedMinutes ?? 30,
                profile.cognitive_indicators.expertiseLevel
              ),
            }))
          : path.path

        const adjustedTotalMinutes = profile
          ? adjustTimeEstimate(path.totalEstimatedMinutes, profile.cognitive_indicators.expertiseLevel)
          : path.totalEstimatedMinutes

        return NextResponse.json({
          available: true,
          hasProfile: !!profile,
          learningPath: {
            goalSkillId,
            skills: adjustedPath,
            totalEstimatedMinutes: adjustedTotalMinutes,
            thresholdConcepts: path.thresholdConcepts,
            personalization: profile
              ? {
                  expertiseLevel: profile.cognitive_indicators.expertiseLevel,
                  timeMultiplier: getTimeMultiplier(profile.cognitive_indicators.expertiseLevel),
                  cognitiveLoadLimit: profile.cognitive_indicators.cognitiveLoadThreshold,
                }
              : null,
          },
        })
      }

      case 'interventions': {
        // Build trigger context
        const triggerContext: TriggerContext = createTriggerContext(profile, {
          consecutiveSuccesses,
          consecutiveFailures,
          currentErrors,
          sessionDurationMs,
          recentDifficulties,
        })

        // Get dismissed triggers from request (could be stored in session/cookie)
        const dismissedParam = searchParams.get('dismissed')
        const dismissedTriggers = dismissedParam ? dismissedParam.split(',') : []

        const activeTriggers = evaluateTriggers(triggerContext, dismissedTriggers)

        return NextResponse.json({
          available: true,
          hasProfile: !!profile,
          interventions: activeTriggers,
          context: {
            consecutiveSuccesses,
            consecutiveFailures,
            currentErrors,
            sessionDurationMs,
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in adaptive API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to get time multiplier for expertise level
function getTimeMultiplier(expertise: string): number {
  const multipliers: Record<string, number> = {
    novice: 1.5,
    beginner: 1.3,
    intermediate: 1.0,
    advanced: 0.85,
    expert: 0.7,
  }
  return multipliers[expertise] ?? 1.0
}
