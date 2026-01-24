import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import {
  getSocraticSystemPrompt,
  getQuestionGenerationPrompt,
  getResponseAnalysisPrompt,
  type SocraticContext,
  type QuestionType,
  type UnderstandingLevel,
  type DialogueState,
} from '@/lib/tutoring/socratic-tutor'

const apiKey = process.env.GEMINI_API_KEY || ''
const ai = new GoogleGenAI({ apiKey })
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/notebooks/[id]/tutor
 * Start a Socratic tutoring dialogue or continue an existing one
 *
 * Body:
 * - action: 'start' | 'respond' | 'analyze' | 'generate_question'
 * - skillId: string (for start)
 * - skillName: string (for start)
 * - targetConcept: string (for start)
 * - misconceptions: string[] (for start)
 * - priorKnowledge: string[] (for start, optional)
 * - response: string (for respond/analyze)
 * - dialogueState: DialogueState (for respond/generate_question)
 * - questionType: QuestionType (for generate_question)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: notebookId } = await context.params
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start':
        return handleStartDialogue(notebookId, body)

      case 'respond':
        return handleStudentResponse(notebookId, body)

      case 'analyze':
        return handleAnalyzeResponse(notebookId, body)

      case 'generate_question':
        return handleGenerateQuestion(notebookId, body)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, respond, analyze, generate_question' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Socratic tutor error:', error)
    return NextResponse.json(
      { error: 'Failed to process tutoring request' },
      { status: 500 }
    )
  }
}

/**
 * Start a new Socratic dialogue
 */
async function handleStartDialogue(
  notebookId: string,
  body: {
    skillId: string
    skillName: string
    targetConcept: string
    misconceptions?: string[]
    priorKnowledge?: string[]
  }
) {
  const {
    skillId,
    skillName,
    targetConcept,
    misconceptions = [],
    priorKnowledge = [],
  } = body

  const context: SocraticContext = {
    skillName,
    targetConcept,
    studentPriorKnowledge: priorKnowledge,
    misconception: misconceptions[0],
  }

  const systemPrompt = getSocraticSystemPrompt(context)

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nGenerate an opening Socratic question to begin exploring the student's understanding of ${targetConcept}. The question should be friendly, inviting, and help you understand what they already know.\n\nRespond with ONLY the question - no explanation or preamble.` }],
      },
    ],
    config: {
      temperature: 0.7,
      maxOutputTokens: 256,
    },
  })

  const openingQuestion = result.text?.trim() || ''

  return NextResponse.json({
    success: true,
    dialogue: {
      skillId,
      skillName,
      targetConcept,
      misconceptions,
      openingQuestion,
      questionType: 'clarifying' as QuestionType,
    },
  })
}

/**
 * Handle student response with AI-powered Socratic follow-up
 */
async function handleStudentResponse(
  notebookId: string,
  body: {
    response: string
    dialogueState: DialogueState
    previousQuestion: string
    previousQuestionType: QuestionType
  }
) {
  const { response, dialogueState, previousQuestion } = body

  const context: SocraticContext = {
    skillName: dialogueState.skillName,
    targetConcept: dialogueState.targetConcept,
    studentPriorKnowledge: dialogueState.exchanges
      .filter(e => e.detectedUnderstanding === 'partial' || e.detectedUnderstanding === 'correct')
      .map(e => e.studentResponse || '')
      .filter(Boolean),
    misconception: dialogueState.knownMisconceptions[0],
    previousAttempt: response,
  }

  const systemPrompt = getSocraticSystemPrompt(context)

  // First, analyze the response
  const analysisPrompt = getResponseAnalysisPrompt(
    dialogueState.skillName,
    dialogueState.targetConcept,
    previousQuestion,
    response,
    dialogueState.knownMisconceptions
  )

  const analysisResult = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: analysisPrompt }],
      },
    ],
    config: {
      temperature: 0.3,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  })

  let analysis: {
    understandingLevel: UnderstandingLevel
    demonstratedKnowledge: string[]
    misconceptions: string[]
    partialUnderstanding: string[]
    isDiscoveryMoment: boolean
    discoveryDescription?: string
    nextQuestionType: QuestionType
    reasoning: string
  }

  try {
    analysis = JSON.parse(analysisResult.text || '{}')
  } catch {
    // Default analysis if parsing fails
    analysis = {
      understandingLevel: 'partial',
      demonstratedKnowledge: [],
      misconceptions: [],
      partialUnderstanding: [],
      isDiscoveryMoment: false,
      nextQuestionType: 'scaffolding',
      reasoning: 'Unable to parse response, continuing with scaffolding',
    }
  }

  // Generate next Socratic question based on analysis
  const questionPrompt = `${systemPrompt}

The student just responded: "${response}"

Analysis of their response:
- Understanding level: ${analysis.understandingLevel}
- What they demonstrated: ${analysis.demonstratedKnowledge.join(', ') || 'exploring'}
- Partial understanding: ${analysis.partialUnderstanding.join(', ') || 'developing'}
${analysis.misconceptions.length > 0 ? `- Misconceptions detected: ${analysis.misconceptions.join(', ')}` : ''}

${analysis.isDiscoveryMoment
  ? 'DISCOVERY MOMENT! The student has had a breakthrough. Celebrate this and help them articulate what they discovered.'
  : `Generate a ${analysis.nextQuestionType} Socratic question to continue guiding them toward understanding.`}

Respond with ONLY your next Socratic question or celebration - no explanation or preamble.`

  const questionResult = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: questionPrompt }],
      },
    ],
    config: {
      temperature: 0.7,
      maxOutputTokens: 256,
    },
  })

  const nextQuestion = questionResult.text?.trim() || ''

  return NextResponse.json({
    success: true,
    analysis: {
      understandingLevel: analysis.understandingLevel,
      isDiscovery: analysis.isDiscoveryMoment,
      discoveryDescription: analysis.discoveryDescription,
      demonstratedKnowledge: analysis.demonstratedKnowledge,
      partialUnderstanding: analysis.partialUnderstanding,
      misconceptions: analysis.misconceptions,
    },
    nextQuestion,
    nextQuestionType: analysis.isDiscoveryMoment ? 'reflection' : analysis.nextQuestionType,
  })
}

/**
 * Analyze a student response without generating next question
 */
async function handleAnalyzeResponse(
  notebookId: string,
  body: {
    response: string
    skillName: string
    targetConcept: string
    tutorQuestion: string
    misconceptions?: string[]
  }
) {
  const {
    response,
    skillName,
    targetConcept,
    tutorQuestion,
    misconceptions = [],
  } = body

  const prompt = getResponseAnalysisPrompt(
    skillName,
    targetConcept,
    tutorQuestion,
    response,
    misconceptions
  )

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    config: {
      temperature: 0.3,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  })

  try {
    const analysis = JSON.parse(result.text || '{}')
    return NextResponse.json({ success: true, analysis })
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse analysis result' },
      { status: 500 }
    )
  }
}

/**
 * Generate a specific type of Socratic question
 */
async function handleGenerateQuestion(
  notebookId: string,
  body: {
    dialogueState: DialogueState
    questionType: QuestionType
    studentResponse?: string
  }
) {
  const { dialogueState, questionType, studentResponse = '' } = body

  const prompt = getQuestionGenerationPrompt(dialogueState, questionType, studentResponse)

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    config: {
      temperature: 0.7,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  })

  try {
    const questionData = JSON.parse(result.text || '{}')
    return NextResponse.json({
      success: true,
      question: questionData.question,
      questionType,
      reasoning: questionData.reasoning,
      expectedInsight: questionData.expectedInsight,
      followUpIfCorrect: questionData.followUpIfCorrect,
      followUpIfIncorrect: questionData.followUpIfIncorrect,
    })
  } catch {
    // Fallback: use the raw text as the question
    return NextResponse.json({
      success: true,
      question: result.text?.trim() || '',
      questionType,
    })
  }
}
