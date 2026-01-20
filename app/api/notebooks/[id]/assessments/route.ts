import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getOrGenerateQuestions } from '@/lib/practice/question-generator'
import { evaluateAnswer } from '@/lib/practice/answer-evaluator'
import { getSkillNodes, getSkillById } from '@/lib/graph/store'
import type { GeneratedQuestion } from '@/lib/practice/question-generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AssessmentRow {
  id: string
  notebook_id: string
  user_id: string
  type: 'diagnostic' | 'formative' | 'summative'
  title: string | null
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned'
  skill_ids: string[]
  question_ids: string[]
  question_count: number | null
  time_limit_ms: number | null
  started_at: string | null
  completed_at: string | null
  answers: Record<string, string>
  score: number | null
  max_score: number | null
  skill_results: Record<string, { correct: number; total: number; score: number }>
  created_at: string
  updated_at: string
}

interface AssessmentQuestionRow {
  id: string
  assessment_id: string
  skill_id: string
  type: string
  question: string
  options: string[] | null
  correct_answer: string
  explanation: string | null
  difficulty: number
  bloom_level: number
  position: number
}

// GET /api/notebooks/[id]/assessments
// Query params: status, type, assessmentId
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

    const assessmentId = searchParams.get('assessmentId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Get specific assessment with questions
    // Note: Type assertions needed until database types are regenerated after migration
    if (assessmentId) {
      const { data: assessment, error } = await (supabase as any)
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('notebook_id', notebookId)
        .eq('user_id', user.id)
        .single()

      if (error || !assessment) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
      }

      // Get questions for this assessment
      const { data: questions } = await (supabase as any)
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('position', { ascending: true })

      return NextResponse.json({
        available: true,
        assessment: assessment as AssessmentRow,
        questions: (questions || []) as AssessmentQuestionRow[],
      })
    }

    // List assessments with filters
    // Note: Type assertions needed until database types are regenerated after migration
    let query = (supabase as any)
      .from('assessments')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data: assessments, error } = await query.limit(50)

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    // Calculate stats
    const completed = (assessments || []).filter((a: AssessmentRow) => a.status === 'completed')
    const stats = {
      total: assessments?.length || 0,
      pending: (assessments || []).filter((a: AssessmentRow) => a.status === 'pending').length,
      inProgress: (assessments || []).filter((a: AssessmentRow) => a.status === 'in_progress').length,
      completed: completed.length,
      averageScore: completed.length > 0
        ? completed.reduce((sum: number, a: AssessmentRow) => sum + (a.score || 0), 0) / completed.length
        : 0,
    }

    return NextResponse.json({
      available: true,
      assessments: assessments as AssessmentRow[],
      stats,
    })
  } catch (error) {
    console.error('Error in assessments GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/assessments
// Create a new assessment
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
      type = 'formative',
      title,
      description,
      skillIds = [],
      questionCount = 10,
      timeLimit,
    } = body

    if (!['diagnostic', 'formative', 'summative'].includes(type)) {
      return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 })
    }

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph required for assessments',
      }, { status: 503 })
    }

    // Get skills to include in assessment
    let targetSkillIds = skillIds
    if (targetSkillIds.length === 0) {
      // Get all skills from notebook if none specified
      const skills = await getSkillNodes(notebookId)
      targetSkillIds = skills.slice(0, 10).map(s => s.id)
    }

    if (targetSkillIds.length === 0) {
      return NextResponse.json({
        available: false,
        message: 'No skills available for assessment',
      }, { status: 400 })
    }

    // Create the assessment
    // Note: Type assertions needed until database types are regenerated after migration
    const { data: assessment, error: createError } = await (supabase as any)
      .from('assessments')
      .insert({
        notebook_id: notebookId,
        user_id: user.id,
        type,
        title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Assessment`,
        description,
        status: 'pending',
        skill_ids: targetSkillIds,
        question_count: questionCount,
        time_limit_ms: timeLimit || null,
      })
      .select()
      .single()

    if (createError || !assessment) {
      console.error('Error creating assessment:', createError)
      return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 })
    }

    // Get source content for question generation
    const { data: sources } = await supabase
      .from('sources')
      .select('raw_text')
      .eq('notebook_id', notebookId)
      .eq('status', 'success')
      .limit(5)

    const sourceContent = sources?.map(s => s.raw_text).filter(Boolean).join('\n\n') || ''

    // Generate questions for each skill
    const questionsPerSkill = Math.ceil(questionCount / targetSkillIds.length)
    const allQuestions: GeneratedQuestion[] = []

    for (const skillId of targetSkillIds) {
      try {
        // Get the skill node
        const skill = await getSkillById(skillId)
        if (!skill) {
          console.error(`Skill ${skillId} not found`)
          continue
        }

        const questions = await getOrGenerateQuestions(
          skill,
          sourceContent,
          {
            count: questionsPerSkill,
            scaffoldLevel: 4, // No scaffolding for assessments
            questionTypes: ['multiple_choice', 'true_false', 'fill_blank'],
          },
          notebookId
        )
        allQuestions.push(...questions.slice(0, questionsPerSkill))
      } catch (err) {
        console.error(`Error generating questions for skill ${skillId}:`, err)
      }
    }

    // Limit to requested count and shuffle
    const shuffledQuestions = allQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount)

    // Store questions
    const questionRows = shuffledQuestions.map((q, i) => ({
      assessment_id: assessment.id,
      skill_id: q.skillId,
      type: q.type,
      question: q.question,
      options: q.options || null,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      bloom_level: q.bloomLevel,
      position: i,
    }))

    if (questionRows.length > 0) {
      const { error: questionsError } = await (supabase as any)
        .from('assessment_questions')
        .insert(questionRows)

      if (questionsError) {
        console.error('Error storing questions:', questionsError)
      }
    }

    // Update assessment with question IDs
    const questionIds = shuffledQuestions.map(q => q.id)
    await (supabase as any)
      .from('assessments')
      .update({
        question_ids: questionIds,
        max_score: questionRows.length,
      })
      .eq('id', assessment.id)

    return NextResponse.json({
      available: true,
      assessmentId: assessment.id,
      questionCount: questionRows.length,
      timeLimit: assessment.time_limit_ms,
      skillCount: targetSkillIds.length,
    })
  } catch (error) {
    console.error('Error in assessments POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notebooks/[id]/assessments
// Update assessment (start, save progress, submit)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assessmentId, action, answers } = body

    if (!assessmentId) {
      return NextResponse.json({ error: 'Assessment ID required' }, { status: 400 })
    }

    // Verify assessment ownership
    // Note: Type assertions needed until database types are regenerated after migration
    const { data: assessment, error: fetchError } = await (supabase as any)
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('notebook_id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    switch (action) {
      case 'start': {
        if (assessment.status !== 'pending') {
          return NextResponse.json({ error: 'Assessment already started' }, { status: 400 })
        }

        const { error } = await (supabase as any)
          .from('assessments')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', assessmentId)

        if (error) {
          return NextResponse.json({ error: 'Failed to start assessment' }, { status: 500 })
        }

        return NextResponse.json({
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          timeLimit: assessment.time_limit_ms,
        })
      }

      case 'save_progress': {
        if (assessment.status === 'completed') {
          return NextResponse.json({ error: 'Assessment already completed' }, { status: 400 })
        }

        const { error } = await (supabase as any)
          .from('assessments')
          .update({
            answers: { ...assessment.answers, ...answers },
          })
          .eq('id', assessmentId)

        if (error) {
          return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
        }

        return NextResponse.json({
          saved: true,
          answeredCount: Object.keys({ ...assessment.answers, ...answers }).length,
        })
      }

      case 'submit': {
        if (assessment.status === 'completed') {
          return NextResponse.json({ error: 'Assessment already submitted' }, { status: 400 })
        }

        // Get questions for scoring
        const { data: questions } = await (supabase as any)
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('position', { ascending: true })

        if (!questions || questions.length === 0) {
          return NextResponse.json({ error: 'No questions found' }, { status: 400 })
        }

        // Score the assessment
        const finalAnswers = { ...assessment.answers, ...answers }
        let totalScore = 0
        const skillResults: Record<string, { correct: number; total: number; score: number }> = {}

        for (const question of questions) {
          const userAnswer = finalAnswers[question.id]
          // Convert assessment question to GeneratedQuestion format for evaluation
          const questionForEval: GeneratedQuestion = {
            id: question.id,
            skillId: question.skill_id,
            type: question.type as GeneratedQuestion['type'],
            question: question.question,
            options: question.options || undefined,
            correctAnswer: question.correct_answer,
            explanation: question.explanation || '',
            hints: [],
            difficulty: question.difficulty,
            bloomLevel: question.bloom_level,
            scaffoldLevel: 4, // Assessments use no scaffolding
          }
          const result = await evaluateAnswer(questionForEval, userAnswer || '')

          // Track score
          totalScore += result.score

          // Track per-skill results
          if (!skillResults[question.skill_id]) {
            skillResults[question.skill_id] = { correct: 0, total: 0, score: 0 }
          }
          skillResults[question.skill_id].total++
          if (result.isCorrect) {
            skillResults[question.skill_id].correct++
          }
          skillResults[question.skill_id].score += result.score
        }

        // Calculate percentage scores for skills
        for (const skillId of Object.keys(skillResults)) {
          skillResults[skillId].score = skillResults[skillId].score / skillResults[skillId].total
        }

        // Update assessment
        const { error } = await (supabase as any)
          .from('assessments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            answers: finalAnswers,
            score: totalScore,
            skill_results: skillResults,
          })
          .eq('id', assessmentId)

        if (error) {
          return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 })
        }

        return NextResponse.json({
          status: 'completed',
          score: totalScore,
          maxScore: questions.length,
          percentage: Math.round((totalScore / questions.length) * 100),
          skillResults,
          completedAt: new Date().toISOString(),
        })
      }

      case 'abandon': {
        const { error } = await (supabase as any)
          .from('assessments')
          .update({
            status: 'abandoned',
            completed_at: new Date().toISOString(),
          })
          .eq('id', assessmentId)

        if (error) {
          return NextResponse.json({ error: 'Failed to abandon assessment' }, { status: 500 })
        }

        return NextResponse.json({ status: 'abandoned' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in assessments PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
