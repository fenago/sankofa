/**
 * Adaptive Practice API Route
 *
 * Provides fully adaptive practice sessions that use the learner's profile
 * to select skills, adjust difficulty, and determine scaffolding.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getZPDSkills } from '@/lib/graph/store'
import {
  getLearnerSkillState,
  getMasteredSkillIds,
  recordPracticeAttempt,
  getLearnerProgress,
} from '@/lib/graph/learner-state'
import {
  generateAdaptiveRecommendations,
  type AdaptiveContext,
  type AdaptiveRecommendation,
} from '@/lib/adaptive/adaptive-learning-service'
import {
  getOrGenerateQuestions,
  getSkillSourceContent,
  type GeneratedQuestion,
  type QuestionGenerationConfig,
} from '@/lib/practice/question-generator'
import type { InverseProfile } from '@/lib/types/interactions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Adaptive session structure
interface AdaptiveSession {
  id: string
  targetMastery: number
  sessionLength: number
  currentIndex: number
  skillOrder: string[]
  adjustments: Map<string, {
    scaffoldLevel: number
    difficultyAdjustment: number
  }>
  questions: GeneratedQuestion[]
  answeredCount: number
  correctCount: number
  totalHintsUsed: number
  startedAt: number
  estimatedDurationMs: number
  adaptationLog: Array<{
    timestamp: number
    action: string
    details: string
  }>
}

// Generate session ID
function generateSessionId(): string {
  return `adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * GET /api/notebooks/[id]/practice/adaptive
 *
 * Generate an adaptive practice session based on learner profile
 *
 * Query params:
 * - targetMastery: number (default: 0.8) - Target mastery probability
 * - sessionLength: number (default: 10) - Number of questions per session
 */
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
        message: 'Knowledge graph features are not configured.',
      }, { status: 503 })
    }

    const targetMastery = parseFloat(searchParams.get('targetMastery') || '0.8')
    const sessionLength = Math.min(parseInt(searchParams.get('sessionLength') || '10'), 20)
    const learnerId = user.id

    // Get learner's inverse profile
    const { data: profileData } = await supabase
      .from('inverse_profiles')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .single()

    // Convert the row data to InverseProfile type
    const profile: InverseProfile | null = profileData ? {
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
    } : null

    // Get mastered skills and ZPD skills
    const masteredIds = await getMasteredSkillIds(learnerId, notebookId)
    const zpdSkillsRaw = await getZPDSkills(notebookId, masteredIds)

    // Get recent performance data
    const { data: recentInteractions } = await supabase
      .from('learner_interactions')
      .select('event_type, payload, created_at')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .eq('event_type', 'practice_attempt')
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate consecutive successes/failures
    let consecutiveSuccesses = 0
    let consecutiveFailures = 0
    if (recentInteractions && recentInteractions.length > 0) {
      for (const interaction of recentInteractions) {
        const payload = interaction.payload as Record<string, unknown> | null
        const isCorrect = payload?.isCorrect
        if (isCorrect) {
          if (consecutiveFailures > 0) break
          consecutiveSuccesses++
        } else {
          if (consecutiveSuccesses > 0) break
          consecutiveFailures++
        }
      }
    }

    // Calculate session duration
    const { data: sessionData } = await supabase
      .from('learner_sessions')
      .select('started_at')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    const sessionDurationMs = sessionData?.started_at
      ? Date.now() - new Date(sessionData.started_at).getTime()
      : 0

    // Build adaptive context
    const adaptiveContext: AdaptiveContext = {
      profile,
      zpdSkills: zpdSkillsRaw.map(z => ({
        skill: z.skill,
        readinessScore: z.readinessScore,
        prerequisitesMastered: z.prerequisitesMastered,
        prerequisitesPending: z.prerequisitesPending,
      })),
      recentPerformance: {
        consecutiveSuccesses,
        consecutiveFailures,
        sessionDurationMs,
      },
    }

    // Generate adaptive recommendations
    const adaptiveResult = generateAdaptiveRecommendations(adaptiveContext)
    const recommendations = adaptiveResult.recommendations

    if (recommendations.length === 0) {
      return NextResponse.json({
        available: true,
        message: 'No skills available for adaptive practice',
        questions: [],
        session: null,
      })
    }

    // Select skills for the session based on recommendations
    const skillsForSession = selectSkillsForSession(recommendations, sessionLength)

    // Generate questions for each skill
    const allQuestions: GeneratedQuestion[] = []
    const adjustmentsMap: Record<string, { scaffoldLevel: number; difficultyAdjustment: number }> = {}

    for (const rec of skillsForSession) {
      const { skill, adjustments } = rec
      const sourceContent = await getSkillSourceContent(notebookId, skill.id)

      // Questions per skill depends on session length
      const questionsPerSkill = Math.max(1, Math.floor(sessionLength / skillsForSession.length))

      const config: QuestionGenerationConfig = {
        count: questionsPerSkill,
        scaffoldLevel: adjustments.scaffoldLevel,
        difficultyAdjustment: adjustments.difficultyAdjustment,
        includeWorkedExamples: adjustments.scaffoldLevel <= 2,
      }

      try {
        const questions = await getOrGenerateQuestions(skill, sourceContent, config, notebookId)
        allQuestions.push(...questions)
        adjustmentsMap[skill.id] = {
          scaffoldLevel: adjustments.scaffoldLevel,
          difficultyAdjustment: adjustments.difficultyAdjustment,
        }
      } catch (genError) {
        console.warn(`[AdaptivePractice] Failed to generate questions for skill ${skill.id}:`, genError)
      }
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({
        available: true,
        message: 'Failed to generate questions for this session',
        questions: [],
        session: null,
      })
    }

    // Shuffle questions for variety (but keep worked examples first within each skill)
    const shuffledQuestions = shuffleWithConstraints(allQuestions)

    // Calculate estimated duration
    const estimatedDurationMs = calculateEstimatedDuration(
      shuffledQuestions,
      profile?.cognitive_indicators.expertiseLevel || 'beginner'
    )

    // Create adaptive session
    const sessionId = generateSessionId()

    // Note: practice_sessions table would need to be created for session persistence
    // For now, session data is returned directly to the client

    return NextResponse.json({
      available: true,
      sessionId,
      questions: shuffledQuestions,
      adjustments: adjustmentsMap,
      estimatedDurationMs,
      profileSummary: adaptiveResult.profileSummary,
      activeInterventions: adaptiveResult.activeInterventions,
      skillsIncluded: skillsForSession.map(s => ({
        id: s.skill.id,
        name: s.skill.name,
        scaffoldLevel: s.adjustments.scaffoldLevel,
        whyIncluded: s.whyExplanation,
      })),
    })
  } catch (error) {
    console.error('Error in adaptive practice API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/notebooks/[id]/practice/adaptive
 *
 * Submit answer and get next adaptive question
 * Dynamically adjusts based on performance
 */
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

    const body = await request.json()
    const {
      sessionId,
      questionId,
      userAnswer,
      responseTimeMs,
      hintsUsed = 0,
      confidenceRating,
    } = body

    if (!sessionId || !questionId || typeof userAnswer !== 'string') {
      return NextResponse.json({
        error: 'sessionId, questionId, and userAnswer are required',
      }, { status: 400 })
    }

    // Note: practice_sessions table would need to be created for full session support
    // For now, we'll process answers without session validation
    // Get session data (type assertion as table may not exist)
    const { data: session } = await (supabase as any)
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    // Session is optional - continue even if not found
    // Full session support requires database migration

    // Get the question (type assertion as table may not exist)
    const { data: cachedQuestion } = await (supabase as any)
      .from('practice_questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (!cachedQuestion) {
      return NextResponse.json({
        error: 'Question not found',
      }, { status: 404 })
    }

    // Evaluate answer (import from answer-evaluator)
    const { evaluateAnswer } = await import('@/lib/practice/answer-evaluator')

    const question: GeneratedQuestion = {
      id: cachedQuestion.id,
      skillId: cachedQuestion.skill_id,
      type: cachedQuestion.question_type,
      question: cachedQuestion.question_data.question,
      options: cachedQuestion.question_data.options,
      correctAnswer: cachedQuestion.question_data.correctAnswer,
      explanation: cachedQuestion.question_data.explanation,
      hints: cachedQuestion.question_data.hints,
      difficulty: cachedQuestion.difficulty,
      bloomLevel: cachedQuestion.bloom_level,
      scaffoldLevel: cachedQuestion.scaffold_level,
      workedExample: cachedQuestion.question_data.workedExample,
      partialSolution: cachedQuestion.question_data.partialSolution,
    }

    const evaluation = await evaluateAnswer(question, userAnswer)

    // Update BKT state
    const learnerId = user.id
    let updatedState = null
    if (isNeo4JAvailable()) {
      try {
        updatedState = await recordPracticeAttempt(
          learnerId,
          question.skillId,
          evaluation.isCorrect,
          0.8,
          responseTimeMs
        )
      } catch (err) {
        console.warn('[AdaptivePractice] BKT update failed:', err)
      }
    }

    // Record interaction
    await supabase
      .from('learner_interactions')
      .insert({
        notebook_id: notebookId,
        learner_id: user.id,
        skill_id: question.skillId,
        event_type: 'practice_attempt',
        session_id: sessionId,
        payload: {
          questionId,
          skillId: question.skillId,
          questionType: question.type,
          isCorrect: evaluation.isCorrect,
          score: evaluation.score,
          responseTimeMs,
          hintsUsed,
          confidenceRating,
          scaffoldLevel: question.scaffoldLevel,
          isAdaptive: true,
        },
        context: {
          sessionId,
          bloomLevel: question.bloomLevel,
          difficulty: question.difficulty,
        },
      })

    // Update session stats (if session exists)
    if (session) {
      await (supabase as any)
        .from('practice_sessions')
        .update({
          answered_count: (session.answered_count || 0) + 1,
          correct_count: (session.correct_count || 0) + (evaluation.isCorrect ? 1 : 0),
          hints_used_total: (session.hints_used_total || 0) + hintsUsed,
        })
        .eq('id', sessionId)
    }

    // Generate adaptive next action
    const answeredCount = session?.answered_count || 0
    const correctCount = session?.correct_count || 0
    const targetMastery = session?.metadata?.targetMastery || 0.8
    const nextAction = determineNextAction(
      evaluation.isCorrect,
      answeredCount,
      correctCount,
      targetMastery
    )

    // Get feedback
    const { generateImmediateFeedback, generateHintFeedback } = await import('@/lib/practice/feedback-generator')
    const feedback = generateImmediateFeedback(evaluation, question, updatedState)
    const hintFeedback = generateHintFeedback(hintsUsed, evaluation.isCorrect)

    // Get progress
    const progress = await getLearnerProgress(learnerId, notebookId)

    return NextResponse.json({
      available: true,
      isCorrect: evaluation.isCorrect,
      score: evaluation.score,
      correctAnswer: evaluation.correctAnswer,
      explanation: evaluation.explanation,
      feedback: {
        ...feedback,
        hintFeedback,
      },
      updatedState: updatedState ? {
        pMastery: updatedState.pMastery,
        masteryStatus: updatedState.masteryStatus,
        scaffoldLevel: updatedState.currentScaffoldLevel,
        consecutiveSuccesses: updatedState.consecutiveSuccesses,
      } : null,
      progress,
      nextAction,
      workedExample: !evaluation.isCorrect ? question.workedExample : undefined,
      sessionStats: {
        answered: answeredCount + 1,
        correct: correctCount + (evaluation.isCorrect ? 1 : 0),
        accuracy: (correctCount + (evaluation.isCorrect ? 1 : 0)) / (answeredCount + 1),
      },
    })
  } catch (error) {
    console.error('Error in adaptive practice POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Select skills for the session based on recommendations
 */
function selectSkillsForSession(
  recommendations: AdaptiveRecommendation[],
  sessionLength: number
): AdaptiveRecommendation[] {
  // Target 2-4 skills per session for variety
  const skillCount = Math.min(
    Math.max(2, Math.ceil(sessionLength / 4)),
    recommendations.length,
    4
  )

  return recommendations.slice(0, skillCount)
}

/**
 * Shuffle questions while keeping worked examples first for each skill
 */
function shuffleWithConstraints(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  // Group by skill
  const bySkill: Record<string, GeneratedQuestion[]> = {}
  for (const q of questions) {
    if (!bySkill[q.skillId]) {
      bySkill[q.skillId] = []
    }
    bySkill[q.skillId].push(q)
  }

  // For each skill, put worked example first, shuffle the rest
  const result: GeneratedQuestion[] = []
  const skillIds = Object.keys(bySkill)

  // Shuffle skill order
  for (let i = skillIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[skillIds[i], skillIds[j]] = [skillIds[j], skillIds[i]]
  }

  // For each skill, add questions in order
  for (const skillId of skillIds) {
    const skillQuestions = bySkill[skillId]

    // Find worked example questions and put them first
    const workedExamples = skillQuestions.filter(q => q.workedExample)
    const others = skillQuestions.filter(q => !q.workedExample)

    // Shuffle others
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[others[i], others[j]] = [others[j], others[i]]
    }

    result.push(...workedExamples, ...others)
  }

  return result
}

/**
 * Calculate estimated duration based on questions and expertise
 */
function calculateEstimatedDuration(
  questions: GeneratedQuestion[],
  expertiseLevel: string
): number {
  const timeMultipliers: Record<string, number> = {
    novice: 1.5,
    beginner: 1.3,
    intermediate: 1.0,
    advanced: 0.85,
    expert: 0.7,
  }

  const multiplier = timeMultipliers[expertiseLevel] || 1.0

  // Base time per question type
  const baseTimes: Record<string, number> = {
    multiple_choice: 60000, // 1 minute
    true_false: 30000, // 30 seconds
    fill_blank: 45000, // 45 seconds
    free_response: 120000, // 2 minutes
  }

  let totalMs = 0
  for (const q of questions) {
    const baseTime = baseTimes[q.type] || 60000
    totalMs += baseTime * multiplier
  }

  return Math.round(totalMs)
}

/**
 * Determine next action based on session progress
 */
function determineNextAction(
  isCorrect: boolean,
  answered: number,
  correct: number,
  targetMastery: number
): {
  action: 'continue' | 'adjust_difficulty' | 'add_scaffolding' | 'end_session'
  reason: string
} {
  const accuracy = answered > 0 ? correct / answered : 0

  // End session checks
  if (answered >= 10 && accuracy >= targetMastery) {
    return {
      action: 'end_session',
      reason: 'Target mastery achieved!',
    }
  }

  // Difficulty adjustments
  if (answered >= 3) {
    if (accuracy < 0.4) {
      return {
        action: 'add_scaffolding',
        reason: 'Providing more support to help you succeed.',
      }
    } else if (accuracy > 0.9) {
      return {
        action: 'adjust_difficulty',
        reason: 'Increasing challenge level.',
      }
    }
  }

  return {
    action: 'continue',
    reason: 'Keep going!',
  }
}
