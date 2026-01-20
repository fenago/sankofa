/**
 * Practice API Route
 *
 * GET - Get practice questions for a skill
 * POST - Submit an answer and get feedback
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getSkillById, getZPDSkills } from '@/lib/graph/store'
import {
  getLearnerSkillState,
  getLearnerProgress,
  getSkillsDueForReview,
  getMasteredSkillIds,
  recordPracticeAttempt,
  calculateScaffoldLevel,
} from '@/lib/graph/learner-state'
import {
  generateQuestions,
  getOrGenerateQuestions,
  getSkillSourceContent,
  type GeneratedQuestion,
  type QuestionGenerationConfig,
} from '@/lib/practice/question-generator'
import { evaluateAnswer, type EvaluationResult } from '@/lib/practice/answer-evaluator'
import {
  generateImmediateFeedback,
  generateHintFeedback,
  type PracticeFeedback,
} from '@/lib/practice/feedback-generator'
import type { SkillNode, LearnerSkillState, ZPDSkill } from '@/lib/types/graph'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Practice session data
interface PracticeSession {
  id: string
  skillId: string
  skillName: string
  scaffoldLevel: 1 | 2 | 3 | 4
  mode: 'zpd' | 'review' | 'skill'
  questions: GeneratedQuestion[]
  currentIndex: number
  answeredCount: number
  correctCount: number
  hintsUsedTotal: number
  startedAt: number
}

// Generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * GET /api/notebooks/[id]/practice
 *
 * Query params:
 * - mode: 'zpd' | 'review' | 'skill' (default: 'zpd')
 * - skillId: string (required for mode='skill')
 * - count: number (default: 5)
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
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const mode = (searchParams.get('mode') || 'zpd') as 'zpd' | 'review' | 'skill'
    const skillIdParam = searchParams.get('skillId')
    const count = Math.min(parseInt(searchParams.get('count') || '5'), 10)

    const learnerId = user.id
    let targetSkill: SkillNode | null = null
    let learnerState: LearnerSkillState | null = null

    // Determine which skill to practice based on mode
    switch (mode) {
      case 'skill': {
        // Practice a specific skill
        if (!skillIdParam) {
          return NextResponse.json({
            error: 'skillId is required for mode=skill',
          }, { status: 400 })
        }
        targetSkill = await getSkillById(skillIdParam)
        if (!targetSkill) {
          return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
        }
        learnerState = await getLearnerSkillState(learnerId, skillIdParam)
        break
      }

      case 'review': {
        // Get skills due for spaced repetition review
        const dueSkills = await getSkillsDueForReview(learnerId, notebookId, 1)
        if (dueSkills.length === 0) {
          return NextResponse.json({
            available: true,
            message: 'No skills due for review',
            questions: [],
            session: null,
          })
        }
        targetSkill = dueSkills[0].skill
        learnerState = dueSkills[0].state
        break
      }

      case 'zpd':
      default: {
        // Get skill from Zone of Proximal Development
        const masteredIds = await getMasteredSkillIds(learnerId, notebookId)
        const zpdSkills = await getZPDSkills(notebookId, masteredIds)

        if (zpdSkills.length === 0) {
          // Fall back to any skill
          const { data: skills } = await supabase
            .from('sources')
            .select('id')
            .eq('notebook_id', notebookId)
            .limit(1)

          if (!skills || skills.length === 0) {
            return NextResponse.json({
              available: true,
              message: 'No skills available for practice',
              questions: [],
              session: null,
            })
          }

          // Try to get any skill from the graph
          const allSkills = await getZPDSkills(notebookId, [])
          if (allSkills.length > 0) {
            targetSkill = allSkills[0].skill
          } else {
            return NextResponse.json({
              available: true,
              message: 'No skills available in knowledge graph',
              questions: [],
              session: null,
            })
          }
        } else {
          // Sort by readiness score and pick the best
          const sorted = [...zpdSkills].sort((a, b) => b.readinessScore - a.readinessScore)
          targetSkill = sorted[0].skill
        }

        if (targetSkill) {
          learnerState = await getLearnerSkillState(learnerId, targetSkill.id)
        }
        break
      }
    }

    if (!targetSkill) {
      return NextResponse.json({
        available: true,
        message: 'No suitable skill found for practice',
        questions: [],
        session: null,
      })
    }

    // Calculate scaffold level
    const pMastery = learnerState?.pMastery || 0
    const scaffoldLevel = calculateScaffoldLevel(pMastery)

    // Get source content for question generation
    const sourceContent = await getSkillSourceContent(notebookId, targetSkill.id)

    // Generate or retrieve questions
    const config: QuestionGenerationConfig = {
      count,
      scaffoldLevel,
      includeWorkedExamples: scaffoldLevel <= 2,
    }

    let questions: GeneratedQuestion[]
    try {
      questions = await getOrGenerateQuestions(targetSkill, sourceContent, config, notebookId)
    } catch (genError) {
      console.error('[Practice] Question generation failed:', genError)
      return NextResponse.json({
        error: 'Failed to generate questions',
      }, { status: 500 })
    }

    // Create practice session
    const session: PracticeSession = {
      id: generateSessionId(),
      skillId: targetSkill.id,
      skillName: targetSkill.name,
      scaffoldLevel,
      mode,
      questions,
      currentIndex: 0,
      answeredCount: 0,
      correctCount: 0,
      hintsUsedTotal: 0,
      startedAt: Date.now(),
    }

    // Store session in Supabase (for persistence)
    // Note: Type assertion needed until practice_sessions table is created
    await (supabase as any)
      .from('practice_sessions')
      .upsert({
        id: session.id,
        notebook_id: notebookId,
        user_id: user.id,
        skill_id: targetSkill.id,
        scaffold_level: scaffoldLevel,
        mode,
        question_ids: questions.map(q => q.id),
        status: 'active',
        started_at: new Date(session.startedAt).toISOString(),
      })
      .select()

    return NextResponse.json({
      available: true,
      questions,
      session: {
        id: session.id,
        skillId: targetSkill.id,
        skillName: targetSkill.name,
        scaffoldLevel,
        mode,
      },
      skillInfo: {
        id: targetSkill.id,
        name: targetSkill.name,
        description: targetSkill.description,
        bloomLevel: targetSkill.bloomLevel,
        difficulty: targetSkill.difficulty,
        isThresholdConcept: targetSkill.isThresholdConcept,
        pMastery,
        masteryStatus: learnerState?.masteryStatus || 'not_started',
      },
    })
  } catch (error) {
    console.error('Error in practice API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/notebooks/[id]/practice
 *
 * Submit an answer and get feedback
 *
 * Body:
 * - questionId: string
 * - userAnswer: string
 * - responseTimeMs: number
 * - hintsUsed: number
 * - confidenceRating?: number (1-5)
 * - sessionId?: string
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
      questionId,
      userAnswer,
      responseTimeMs = 0,
      hintsUsed = 0,
      confidenceRating,
      sessionId,
    } = body

    if (!questionId || typeof userAnswer !== 'string') {
      return NextResponse.json({
        error: 'questionId and userAnswer are required',
      }, { status: 400 })
    }

    // Get the question from cache
    // Note: Type assertion needed until practice_questions table is created
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

    // Reconstruct the GeneratedQuestion
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

    // Evaluate the answer
    const evaluation: EvaluationResult = await evaluateAnswer(question, userAnswer)

    // Get learner state
    const learnerId = user.id
    const learnerState = await getLearnerSkillState(learnerId, question.skillId)

    // Update BKT/SM-2 state
    let updatedState: LearnerSkillState | null = null
    if (isNeo4JAvailable()) {
      try {
        updatedState = await recordPracticeAttempt(
          learnerId,
          question.skillId,
          evaluation.isCorrect,
          0.8, // masteryThreshold
          responseTimeMs
        )
      } catch (bktError) {
        console.warn('[Practice] BKT update failed:', bktError)
      }
    }

    // Generate feedback
    const feedback: PracticeFeedback = generateImmediateFeedback(
      evaluation,
      question,
      updatedState || learnerState
    )

    // Generate hint feedback
    const hintFeedback = generateHintFeedback(hintsUsed, evaluation.isCorrect)

    // Record the attempt in Supabase
    await supabase
      .from('learner_interactions')
      .insert({
        notebook_id: notebookId,
        learner_id: user.id,
        session_id: sessionId || 'no-session',
        event_type: 'practice_attempt',
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
        },
        context: {
          bloomLevel: question.bloomLevel,
          difficulty: question.difficulty,
        },
      })

    // Update session if provided
    // Note: Type assertion needed until practice_sessions table is created
    if (sessionId) {
      const { data: session } = await (supabase as any)
        .from('practice_sessions')
        .select('answered_count, correct_count, hints_used_total')
        .eq('id', sessionId)
        .single()

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
    }

    // Get updated progress
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
      workedExample: !evaluation.isCorrect ? question.workedExample : undefined,
    })
  } catch (error) {
    console.error('Error submitting practice answer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
