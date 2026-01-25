import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import {
  getSocraticSystemPrompt,
  getQuestionGenerationPrompt,
  getResponseAnalysisPrompt,
  type SocraticContext,
  type QuestionType,
  type UnderstandingLevel,
  type DialogueState,
} from '@/lib/tutoring/socratic-tutor'
import {
  startDialogue,
  processExchange,
  completeDialogue,
  abandonDialogue,
  getDialogueSummary,
  createDefaultSocraticProfile,
  deserializeSocraticProfile,
  serializeSocraticProfile,
  generateLearnerSystemPrompt,
  type SocraticDialogue,
  type SocraticProfile,
  type LearnerPersona,
  type LearnerProfile,
  type ConversationalPsychometrics,
  type FreeformExchange,
  type AIResponseType,
  type StrategicElement,
} from '@/lib/socratic'
import type { InverseProfile } from '@/lib/types/interactions'
import type { Json } from '@/lib/types/database'

const apiKey = process.env.GEMINI_API_KEY || ''
const ai = new GoogleGenAI({ apiKey })
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

// In-memory dialogue storage (in production, use Redis or database)
const activeDialogues = new Map<string, SocraticDialogue>()

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

      // New Socratic Mode with Psychometric Extraction
      case 'start_socratic':
        return handleStartSocraticDialogue(request, notebookId, body)

      case 'exchange':
        return handleSocraticExchange(request, notebookId, body)

      case 'end_socratic':
        return handleEndSocraticDialogue(request, notebookId, body)

      case 'get_dialogue':
        return handleGetDialogue(notebookId, body)

      // Inverse Socratic Mode (Learning by Teaching)
      case 'inverse_socratic_exchange':
        return handleInverseSocraticExchange(request, notebookId, body)

      case 'inverse_socratic_complete':
        return handleInverseSocraticComplete(request, notebookId, body)

      // Freeform Tutoring Mode (User-driven Q&A)
      case 'freeform_exchange':
        return handleFreeformExchange(request, notebookId, body)

      case 'freeform_complete':
        return handleFreeformComplete(request, notebookId, body)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, respond, analyze, generate_question, start_socratic, exchange, end_socratic, get_dialogue, inverse_socratic_exchange, inverse_socratic_complete, freeform_exchange, freeform_complete' },
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

// ============================================================================
// ENHANCED SOCRATIC MODE WITH PSYCHOMETRIC EXTRACTION
// ============================================================================

/**
 * Fetch learner's inverse profile from database
 */
async function fetchInverseProfile(
  notebookId: string,
  learnerId: string
): Promise<InverseProfile | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('inverse_profiles')
    .select('*')
    .eq('notebook_id', notebookId)
    .eq('learner_id', learnerId)
    .single()

  if (!profile) return null

  // Cast JSON fields to proper types
  return {
    id: profile.id,
    learner_id: profile.learner_id,
    notebook_id: profile.notebook_id,
    version: profile.version,
    computed_at: profile.computed_at,
    interactions_analyzed: profile.interactions_analyzed,
    knowledge_state: profile.knowledge_state as unknown as InverseProfile['knowledge_state'],
    cognitive_indicators: profile.cognitive_indicators as unknown as InverseProfile['cognitive_indicators'],
    metacognitive_indicators: profile.metacognitive_indicators as unknown as InverseProfile['metacognitive_indicators'],
    motivational_indicators: profile.motivational_indicators as unknown as InverseProfile['motivational_indicators'],
    behavioral_patterns: profile.behavioral_patterns as unknown as InverseProfile['behavioral_patterns'],
    confidence_scores: profile.confidence_scores as unknown as InverseProfile['confidence_scores'],
  }
}

/**
 * Fetch SocraticProfile from inverse_profiles metadata or create default
 */
async function fetchSocraticProfile(
  notebookId: string,
  learnerId: string
): Promise<SocraticProfile | null> {
  const supabase = await createClient()

  // Check if there's a stored socratic profile in inverse_profiles metadata
  // For now, we'll use behavioral_patterns to store socratic data if available
  const { data: profile } = await supabase
    .from('inverse_profiles')
    .select('behavioral_patterns')
    .eq('notebook_id', notebookId)
    .eq('learner_id', learnerId)
    .single()

  if (!profile) return null

  const patterns = profile.behavioral_patterns as Record<string, unknown>
  if (patterns?.socratic_profile) {
    return deserializeSocraticProfile(patterns.socratic_profile as Record<string, unknown>)
  }

  return null
}

/**
 * Save updated profiles to database
 */
async function saveProfiles(
  notebookId: string,
  learnerId: string,
  inverseProfile: InverseProfile | null,
  socraticProfile: SocraticProfile | null
): Promise<void> {
  if (!inverseProfile && !socraticProfile) return

  const supabase = await createClient()

  if (inverseProfile) {
    // Merge socratic profile into behavioral_patterns
    const behavioralPatterns = {
      ...inverseProfile.behavioral_patterns,
      socratic_profile: socraticProfile ? serializeSocraticProfile(socraticProfile) : undefined,
    }

    await supabase
      .from('inverse_profiles')
      .update({
        knowledge_state: JSON.parse(JSON.stringify(inverseProfile.knowledge_state)),
        cognitive_indicators: JSON.parse(JSON.stringify(inverseProfile.cognitive_indicators)),
        metacognitive_indicators: JSON.parse(JSON.stringify(inverseProfile.metacognitive_indicators)),
        motivational_indicators: JSON.parse(JSON.stringify(inverseProfile.motivational_indicators)),
        behavioral_patterns: JSON.parse(JSON.stringify(behavioralPatterns)),
        confidence_scores: JSON.parse(JSON.stringify(inverseProfile.confidence_scores)),
        updated_at: new Date().toISOString(),
      })
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
  }
}

/**
 * Record Socratic interaction to database
 */
async function recordSocraticInteraction(
  notebookId: string,
  learnerId: string,
  sessionId: string,
  eventType: string,
  skillId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  const now = new Date()
  const hour = now.getHours()

  await supabase.from('learner_interactions').insert({
    notebook_id: notebookId,
    learner_id: learnerId,
    skill_id: skillId,
    event_type: eventType,
    session_id: sessionId,
    payload: payload as unknown as Json,
    context: {
      timeOfDay: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night',
      dayOfWeek: now.getDay(),
      deviceType: 'desktop',
    } as unknown as Json,
  })
}

/**
 * Start a new Socratic dialogue with full profile integration
 */
async function handleStartSocraticDialogue(
  request: NextRequest,
  notebookId: string,
  body: {
    skillId: string
    skillName: string
    targetConcept: string
    knownMisconceptions?: string[]
    sessionId: string
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    skillId,
    skillName,
    targetConcept,
    knownMisconceptions = [],
    sessionId,
  } = body

  if (!skillId || !skillName || !targetConcept || !sessionId) {
    return NextResponse.json({
      error: 'skillId, skillName, targetConcept, and sessionId are required',
    }, { status: 400 })
  }

  // Fetch learner profiles
  const inverseProfile = await fetchInverseProfile(notebookId, user.id)
  const socraticProfile = await fetchSocraticProfile(notebookId, user.id)

  // Start the dialogue
  const { dialogue, openingQuestion, systemPrompt } = startDialogue({
    notebookId,
    skillId,
    skillName,
    targetConcept,
    knownMisconceptions,
    inverseProfile,
    socraticProfile,
  })

  // Store dialogue in memory
  activeDialogues.set(dialogue.id, dialogue)

  // Record the dialogue started interaction
  await recordSocraticInteraction(
    notebookId,
    user.id,
    sessionId,
    'socratic_dialogue_started',
    skillId,
    {
      dialogueId: dialogue.id,
      targetConcept,
      openingQuestionType: 'clarifying',
      adaptiveConfigSummary: {
        scaffoldLevel: dialogue.adaptiveConfig.scaffolding.level,
        questionStyle: dialogue.adaptiveConfig.calibration.questionStyle,
        abstractionLevel: dialogue.adaptiveConfig.questionComplexity.abstractionLevel,
      },
    }
  )

  // Generate AI-powered opening question using the system prompt
  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nGenerate an engaging opening Socratic question to begin exploring the student's understanding of "${targetConcept}" in the context of ${skillName}.\n\nThe question should:\n1. Be friendly and inviting\n2. Help understand what they already know\n3. Match their profile (${inverseProfile?.cognitive_indicators?.expertiseLevel || 'unknown'} level)\n4. Open up opportunities for deeper exploration\n\nRespond with ONLY the question - no explanation or preamble.` }],
      },
    ],
    config: {
      temperature: 0.7,
      maxOutputTokens: 256,
    },
  })

  const aiOpeningQuestion = result.text?.trim() || openingQuestion

  return NextResponse.json({
    success: true,
    dialogueId: dialogue.id,
    openingQuestion: aiOpeningQuestion,
    adaptiveConfig: {
      scaffoldingLevel: dialogue.adaptiveConfig.scaffolding.level,
      questionStyle: dialogue.adaptiveConfig.calibration.questionStyle,
      abstractionLevel: dialogue.adaptiveConfig.questionComplexity.abstractionLevel,
      includeHints: dialogue.adaptiveConfig.scaffolding.proactiveHints,
    },
    profileSummary: inverseProfile ? {
      expertiseLevel: inverseProfile.cognitive_indicators.expertiseLevel,
      calibrationAccuracy: inverseProfile.metacognitive_indicators.calibrationAccuracy,
      helpSeekingPattern: inverseProfile.metacognitive_indicators.helpSeekingPattern,
    } : null,
  })
}

/**
 * Process a learner's response in Socratic dialogue
 */
async function handleSocraticExchange(
  request: NextRequest,
  notebookId: string,
  body: {
    dialogueId: string
    learnerResponse: string
    responseLatencyMs: number
    sessionId: string
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dialogueId, learnerResponse, responseLatencyMs, sessionId } = body

  if (!dialogueId || !learnerResponse || !sessionId) {
    return NextResponse.json({
      error: 'dialogueId, learnerResponse, and sessionId are required',
    }, { status: 400 })
  }

  // Get dialogue from memory
  const dialogue = activeDialogues.get(dialogueId)
  if (!dialogue) {
    return NextResponse.json({
      error: 'Dialogue not found. It may have expired or been completed.',
    }, { status: 404 })
  }

  // Fetch current profiles
  const inverseProfile = await fetchInverseProfile(notebookId, user.id)
  const socraticProfile = await fetchSocraticProfile(notebookId, user.id)

  // Process the exchange
  const exchangeResult = processExchange({
    dialogue,
    learnerResponse,
    responseLatencyMs,
    inverseProfile,
    socraticProfile,
  })

  // Update dialogue in memory
  activeDialogues.set(dialogueId, exchangeResult.dialogue)

  // Record the exchange interaction
  await recordSocraticInteraction(
    notebookId,
    user.id,
    sessionId,
    'socratic_exchange',
    dialogue.skillId,
    {
      dialogueId,
      exchangeNumber: exchangeResult.dialogue.sessionState.exchangeCount,
      questionType: exchangeResult.questionType,
      learnerResponse,
      responseLatencyMs,
      extractedPsychometrics: {
        explanationQuality: exchangeResult.extraction.understanding.explanationQuality,
        hedgingRate: exchangeResult.extraction.confidence.hedgingRate,
        certaintyRate: exchangeResult.extraction.confidence.certaintyRate,
        selfCorrectionCount: exchangeResult.extraction.metacognition.selfCorrectionCount,
        engagementLevel: exchangeResult.extraction.engagement.engagementLevel,
        reasoningStyle: exchangeResult.extraction.reasoning.reasoningStyle,
      },
      understandingLevel: exchangeResult.extraction.overallAssessment.understandingLevel,
      ledToDiscovery: exchangeResult.extraction.overallAssessment.isDiscoveryMoment,
      misconceptionsDetected: exchangeResult.extraction.misconceptions,
    }
  )

  // Check if discovery moment
  if (exchangeResult.extraction.overallAssessment.isDiscoveryMoment) {
    await recordSocraticInteraction(
      notebookId,
      user.id,
      sessionId,
      'socratic_discovery',
      dialogue.skillId,
      {
        dialogueId,
        exchangeNumber: exchangeResult.dialogue.sessionState.exchangeCount,
        discoveryDescription: exchangeResult.extraction.insightsDetected[0] || 'Discovery moment detected',
        insightsDetected: exchangeResult.extraction.insightsDetected,
        understandingBeforeDiscovery: 'partial',
        understandingAfterDiscovery: exchangeResult.extraction.overallAssessment.understandingLevel,
      }
    )
  }

  // Generate AI follow-up question if dialogue continues
  let aiNextQuestion: string | null = null
  if (!exchangeResult.isDialogueComplete && exchangeResult.nextQuestion) {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${exchangeResult.systemPrompt}\n\n${exchangeResult.nextQuestion}` }],
        },
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 256,
      },
    })
    aiNextQuestion = result.text?.trim() || exchangeResult.nextQuestion
  }

  return NextResponse.json({
    success: true,
    extraction: {
      understandingLevel: exchangeResult.extraction.overallAssessment.understandingLevel,
      isDiscovery: exchangeResult.extraction.overallAssessment.isDiscoveryMoment,
      psychometrics: {
        explanationQuality: exchangeResult.extraction.understanding.explanationQuality,
        hedgingRate: exchangeResult.extraction.confidence.hedgingRate,
        certaintyRate: exchangeResult.extraction.confidence.certaintyRate,
        selfCorrections: exchangeResult.extraction.metacognition.selfCorrectionCount,
        reasoningStyle: exchangeResult.extraction.reasoning.reasoningStyle,
        engagementLevel: exchangeResult.extraction.engagement.engagementLevel,
      },
      misconceptions: exchangeResult.extraction.misconceptions,
      insights: exchangeResult.extraction.insightsDetected,
    },
    nextQuestion: aiNextQuestion,
    questionType: exchangeResult.questionType,
    intervention: exchangeResult.intervention,
    isDialogueComplete: exchangeResult.isDialogueComplete,
    exchangeCount: exchangeResult.dialogue.sessionState.exchangeCount,
    adaptiveAdjustments: {
      scaffoldingLevel: exchangeResult.dialogue.adaptiveConfig.scaffolding.level,
      questionStyle: exchangeResult.dialogue.adaptiveConfig.calibration.questionStyle,
    },
  })
}

/**
 * End a Socratic dialogue and get results
 */
async function handleEndSocraticDialogue(
  request: NextRequest,
  notebookId: string,
  body: {
    dialogueId: string
    sessionId: string
    endReason?: 'completed' | 'abandoned' | 'user_requested'
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dialogueId, sessionId, endReason = 'completed' } = body

  if (!dialogueId || !sessionId) {
    return NextResponse.json({
      error: 'dialogueId and sessionId are required',
    }, { status: 400 })
  }

  // Get dialogue from memory
  let dialogue = activeDialogues.get(dialogueId)
  if (!dialogue) {
    return NextResponse.json({
      error: 'Dialogue not found. It may have already been completed.',
    }, { status: 404 })
  }

  // Fetch current profiles
  const inverseProfile = await fetchInverseProfile(notebookId, user.id)
  const socraticProfile = await fetchSocraticProfile(notebookId, user.id)

  // Handle abandoned dialogues
  if (endReason === 'abandoned') {
    dialogue = abandonDialogue(dialogue)
    activeDialogues.delete(dialogueId)

    return NextResponse.json({
      success: true,
      abandoned: true,
      summary: getDialogueSummary(dialogue),
    })
  }

  // Complete the dialogue
  const completionResult = completeDialogue(dialogue, inverseProfile, socraticProfile)

  // Save updated profiles
  await saveProfiles(
    notebookId,
    user.id,
    completionResult.profileUpdateResult.updatedInverseProfile,
    completionResult.profileUpdateResult.updatedSocraticProfile
  )

  // Record dialogue completed interaction
  await recordSocraticInteraction(
    notebookId,
    user.id,
    sessionId,
    'socratic_dialogue_completed',
    dialogue.skillId,
    {
      dialogueId,
      totalExchanges: completionResult.dialogueResults.totalExchanges,
      discoveryAchieved: completionResult.dialogueResults.discoveryAchieved,
      finalUnderstandingLevel: completionResult.dialogueResults.finalUnderstandingLevel,
      effectivenessScore: completionResult.effectiveness.score,
      durationMs: completionResult.dialogueResults.durationMs,
      aggregatedPsychometrics: completionResult.dialogueResults.aggregatedPsychometrics,
      keyInsights: completionResult.dialogueResults.keyInsights,
      misconceptionsIdentified: completionResult.dialogueResults.misconceptionsIdentified,
      profileUpdates: {
        masteryAdjustment: completionResult.profileUpdateResult.masteryAdjustment,
        newMisconceptions: completionResult.profileUpdateResult.newMisconceptions,
      },
    }
  )

  // Remove dialogue from memory
  activeDialogues.delete(dialogueId)

  return NextResponse.json({
    success: true,
    dialogueSummary: {
      totalExchanges: completionResult.dialogueResults.totalExchanges,
      discoveryAchieved: completionResult.dialogueResults.discoveryAchieved,
      finalUnderstandingLevel: completionResult.dialogueResults.finalUnderstandingLevel,
      durationMs: completionResult.dialogueResults.durationMs,
      keyInsights: completionResult.dialogueResults.keyInsights,
      misconceptions: completionResult.dialogueResults.misconceptionsIdentified,
    },
    effectiveness: {
      score: Math.round(completionResult.effectiveness.score * 100),
      selfDiscoveryRate: Math.round(completionResult.effectiveness.selfDiscoveryRate * 100),
      exchangeEfficiency: Math.round(completionResult.effectiveness.exchangeEfficiency * 100),
      interpretation: completionResult.effectiveness.interpretation,
    },
    aggregatedPsychometrics: completionResult.dialogueResults.aggregatedPsychometrics,
    profileUpdates: {
      masteryAdjustment: completionResult.profileUpdateResult.masteryAdjustment,
      newMisconceptions: completionResult.profileUpdateResult.newMisconceptions,
      confidenceUpdated: completionResult.profileUpdateResult.confidenceUpdated,
    },
    nextSteps: generateNextSteps(completionResult),
  })
}

/**
 * Get current state of an active dialogue
 */
async function handleGetDialogue(
  notebookId: string,
  body: { dialogueId: string }
) {
  const { dialogueId } = body

  if (!dialogueId) {
    return NextResponse.json({ error: 'dialogueId is required' }, { status: 400 })
  }

  const dialogue = activeDialogues.get(dialogueId)
  if (!dialogue) {
    return NextResponse.json({
      error: 'Dialogue not found',
      exists: false,
    }, { status: 404 })
  }

  const summary = getDialogueSummary(dialogue)

  return NextResponse.json({
    success: true,
    exists: true,
    status: dialogue.status,
    summary,
    exchangeCount: dialogue.sessionState.exchangeCount,
    adaptiveConfig: {
      scaffoldingLevel: dialogue.adaptiveConfig.scaffolding.level,
      questionStyle: dialogue.adaptiveConfig.calibration.questionStyle,
    },
  })
}

/**
 * Generate recommended next steps based on dialogue results
 */
function generateNextSteps(completionResult: {
  dialogueResults: { finalUnderstandingLevel: string; misconceptionsIdentified: string[] }
  profileUpdateResult: { masteryAdjustment: number }
}): string[] {
  const steps: string[] = []
  const { finalUnderstandingLevel, misconceptionsIdentified } = completionResult.dialogueResults
  const { masteryAdjustment } = completionResult.profileUpdateResult

  if (finalUnderstandingLevel === 'transfer' || finalUnderstandingLevel === 'deep') {
    steps.push('Great progress! Consider trying practice questions to reinforce your understanding.')
    steps.push('You might be ready to explore related advanced topics.')
  } else if (finalUnderstandingLevel === 'partial') {
    steps.push('Good start! Review the key concepts and try another Socratic dialogue.')
    if (misconceptionsIdentified.length > 0) {
      steps.push(`Address these misconceptions: ${misconceptionsIdentified.slice(0, 2).join(', ')}`)
    }
  } else {
    steps.push('Consider reviewing prerequisite concepts before continuing.')
    steps.push('Try studying the material and return for another dialogue.')
  }

  if (masteryAdjustment > 0.1) {
    steps.push('Your mastery improved significantly - keep up the good work!')
  } else if (masteryAdjustment < -0.05) {
    steps.push('Focus on understanding the fundamentals before moving forward.')
  }

  return steps
}

// ============================================================================
// INVERSE SOCRATIC MODE (LEARNING BY TEACHING)
// ============================================================================

/**
 * Handle an exchange in inverse socratic mode
 * The user is teaching, and the AI is learning
 */
async function handleInverseSocraticExchange(
  request: NextRequest,
  notebookId: string,
  body: {
    dialogueId: string
    skillId: string
    skillName: string
    targetConcept: string
    userMessage: string
    learnerPersona: LearnerPersona
    currentUnderstanding: number
    aiRole: 'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking'
    exchangeNumber: number
    psychometrics: {
      explanationClarity: number
      conceptAccuracy: number
      scaffoldingQuality: number
      adaptationToLearner: number
      encouragementLevel: number
    }
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    dialogueId,
    skillId,
    skillName,
    targetConcept,
    userMessage,
    learnerPersona,
    currentUnderstanding,
    aiRole,
    exchangeNumber,
    psychometrics,
  } = body

  // Generate AI learner response
  const systemPrompt = generateLearnerSystemPrompt({
    persona: learnerPersona,
    targetConcept,
    currentUnderstanding,
    recentUserMessage: userMessage,
    previousExchanges: [],
  })

  const rolePrompts: Record<string, string> = {
    asking: `The teacher just explained: "${userMessage}"\n\nAs a ${learnerPersona.replace('_', ' ')}, ask a follow-up question that shows you're engaged but still have gaps in understanding. Your question should help the teacher elaborate on an important aspect they might have missed or could explain better.`,
    confirming: `The teacher just explained: "${userMessage}"\n\nAs a ${learnerPersona.replace('_', ' ')}, show that you're starting to understand by trying to summarize or paraphrase what they taught. Include a small follow-up to make sure you got it right.`,
    confused: `The teacher just explained: "${userMessage}"\n\nAs a ${learnerPersona.replace('_', ' ')}, express genuine confusion about a specific part of their explanation. Ask them to clarify or explain it in a different way. This helps them identify gaps in their own explanation.`,
    connecting: `The teacher just explained: "${userMessage}"\n\nAs a ${learnerPersona.replace('_', ' ')}, try to connect what they taught to something else you know. Ask if your connection is correct or if you're misunderstanding something.`,
    thanking: `The teacher just explained: "${userMessage}"\n\nAs a ${learnerPersona.replace('_', ' ')}, express genuine appreciation for their teaching. Summarize what you learned and how their explanation helped you understand ${targetConcept}. Be specific about what clicked for you.`,
  }

  const rolePrompt = rolePrompts[aiRole] || rolePrompts.asking

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${rolePrompt}\n\nRespond naturally as the learner - no preamble or explanation, just your response as the student.` }],
        },
      ],
      config: {
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    })

    const response = result.text?.trim() || ''

    // Record the interaction
    await recordSocraticInteraction(
      notebookId,
      user.id,
      dialogueId,
      'inverse_socratic_exchange',
      skillId,
      {
        dialogueId,
        exchangeNumber,
        userMessage,
        aiRole,
        aiResponse: response,
        psychometrics,
        learnerPersona,
        currentUnderstanding,
      }
    )

    return NextResponse.json({
      success: true,
      response,
      aiRole,
      exchangeNumber,
    })
  } catch (error) {
    console.error('Inverse Socratic exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to generate learner response' },
      { status: 500 }
    )
  }
}

/**
 * Handle completion of inverse socratic dialogue
 */
async function handleInverseSocraticComplete(
  request: NextRequest,
  notebookId: string,
  body: {
    dialogueId: string
    skillId: string
    summary: {
      overallTeachingScore: number
      strengthSummary: string
      improvementSummary: string
      learnerFeedback: string
      psychometricHighlights: {
        category: string
        score: number
        interpretation: string
      }[]
      researchConnection: string
      totalExchanges: number
      learnerUnderstanding: number
    }
    teachingMetrics: {
      explanationClarity: number
      conceptAccuracy: number
      scaffoldingQuality: number
      adaptationToLearner: number
      encouragementLevel: number
      overallTeachingEffectiveness: number
    }
    exchanges: number
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dialogueId, skillId, summary, teachingMetrics, exchanges } = body

  // Record completion
  await recordSocraticInteraction(
    notebookId,
    user.id,
    dialogueId,
    'inverse_socratic_complete',
    skillId,
    {
      dialogueId,
      summary,
      teachingMetrics,
      totalExchanges: exchanges,
    }
  )

  // Update learner profile with teaching effectiveness data
  // Teaching effectiveness correlates with deeper understanding (Protégé Effect)
  const inverseProfile = await fetchInverseProfile(notebookId, user.id)

  if (inverseProfile) {
    // Teaching improves mastery - use the teaching effectiveness as a signal
    const masteryBoost = summary.overallTeachingScore * 0.15 // Up to 15% mastery boost
    const newMastery = Math.min(1, (inverseProfile.knowledge_state.averageMastery || 0.5) + masteryBoost)

    await supabase
      .from('inverse_profiles')
      .update({
        knowledge_state: {
          ...inverseProfile.knowledge_state,
          averageMastery: newMastery,
        },
        behavioral_patterns: {
          ...inverseProfile.behavioral_patterns,
          lastTeachingSession: {
            skillId,
            timestamp: new Date().toISOString(),
            teachingScore: summary.overallTeachingScore,
            masteryBoost,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
  }

  return NextResponse.json({
    success: true,
    dialogueId,
    summary,
    teachingMetrics,
    masteryBoost: summary.overallTeachingScore * 0.15,
  })
}

// ============================================================================
// FREEFORM TUTORING MODE (USER-DRIVEN Q&A)
// ============================================================================

/**
 * Handle a freeform tutoring exchange
 * The user asks questions and drives the conversation
 * AI adapts responses based on learner profile and extracts psychometrics
 */
async function handleFreeformExchange(
  request: NextRequest,
  notebookId: string,
  body: {
    dialogueId: string
    skillId: string
    skillName: string
    targetConcepts: string[]
    userMessage: string
    userIntent: string
    responseType: AIResponseType
    psychometrics: ConversationalPsychometrics
    learnerProfile: LearnerProfile
    previousExchanges: FreeformExchange[]
    exchangeNumber: number
    strategicElement?: StrategicElement
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    dialogueId,
    skillId,
    skillName,
    targetConcepts,
    userMessage,
    userIntent,
    responseType,
    psychometrics,
    learnerProfile,
    previousExchanges,
    exchangeNumber,
    strategicElement,
  } = body

  // Build the tutor system prompt based on learner profile
  const systemPrompt = `You are an adaptive tutor helping a learner explore "${skillName}".

LEARNER PROFILE:
- Expertise level: ${learnerProfile.expertiseLevel}
- Learning style: ${learnerProfile.learningStyle}
- Abstraction preference: ${learnerProfile.abstractionPreference}
- Confidence level: ${learnerProfile.confidenceLevel}

TARGET CONCEPTS: ${targetConcepts.join(', ')}

${previousExchanges.length > 0 ? `RECENT CONVERSATION:
${previousExchanges.map((e: FreeformExchange) => `User: ${e.userMessage}\nAI: ${e.aiResponse}`).join('\n\n')}
` : ''}
RESPONSE GUIDELINES:
- Match language complexity to learner's ${learnerProfile.expertiseLevel} level
- Use ${learnerProfile.abstractionPreference === 'concrete' ? 'concrete examples' : learnerProfile.abstractionPreference === 'abstract' ? 'more abstract explanations' : 'a balance of concrete and abstract'}
- Be supportive and encouraging
- Help the learner think deeply about the topic`

  // Build the response generation prompt
  const responseTypeInstructions: Record<string, string> = {
    direct_answer: 'Provide a clear, direct answer to the user\'s question. Be comprehensive but concise.',
    guided_answer: 'Guide the user toward the answer by asking clarifying questions and helping them think through it.',
    scaffolded_explanation: 'Break down the concept into smaller, manageable steps. Build from what they know.',
    example_based: 'Use concrete examples and analogies to explain the concept. Make it relatable.',
    clarifying_question: 'Ask a clarifying question to better understand what the user is asking.',
    encouragement: 'Provide encouragement and positive reinforcement. Acknowledge their progress.',
    connection_making: 'Help the user connect this concept to things they already know or have discussed.',
    summary: 'Summarize the key points from the conversation so far.',
    challenge: 'Challenge the user\'s thinking with a thought-provoking question or scenario.',
    application_prompt: 'Suggest a practical application or ask how they might apply this concept.',
    reflection_prompt: 'Prompt the user to reflect on what they\'ve learned or how their understanding has changed.',
  }

  const instruction = responseTypeInstructions[responseType] || responseTypeInstructions.direct_answer

  let strategicInstructions = ''
  if (strategicElement) {
    strategicInstructions = `\n\nAfter your main response, include a ${strategicElement.type.replace('_', ' ')} to deepen their understanding: "${strategicElement.content}"`
  }

  const prompt = `${systemPrompt}

The user's message: "${userMessage}"

User intent detected: ${userIntent}
Current understanding indicators:
- Question depth: ${psychometrics.questionDepth}
- Curiosity level: ${psychometrics.curiosityLevel}
- Engagement level: ${psychometrics.engagementLevel}

Response instruction: ${instruction}${strategicInstructions}

Respond naturally as an adaptive AI tutor. Match your language complexity to the user's level (${learnerProfile.expertiseLevel}). ${learnerProfile.abstractionPreference === 'concrete' ? 'Use concrete examples.' : learnerProfile.abstractionPreference === 'abstract' ? 'You can use more abstract explanations.' : 'Balance concrete and abstract.'}

Response:`

  try {
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
        maxOutputTokens: 2048,
      },
    })

    const response = result.text?.trim() || ''

    // Record the interaction
    await recordSocraticInteraction(
      notebookId,
      user.id,
      dialogueId,
      'freeform_exchange',
      skillId,
      {
        dialogueId,
        exchangeNumber,
        userMessage,
        userIntent,
        responseType,
        aiResponse: response,
        psychometrics: {
          questionDepth: psychometrics.questionDepth,
          curiosityLevel: psychometrics.curiosityLevel,
          engagementLevel: psychometrics.engagementLevel,
          selfAwarenessShown: psychometrics.selfAwarenessShown,
          insightMoments: psychometrics.insightMoments,
        },
        strategicElement: strategicElement ? {
          type: strategicElement.type,
          content: strategicElement.content,
        } : null,
        learnerProfile: {
          expertiseLevel: learnerProfile.expertiseLevel,
          confidenceLevel: learnerProfile.confidenceLevel,
        },
      }
    )

    return NextResponse.json({
      success: true,
      response,
      responseType,
      exchangeNumber,
      strategicElementIncluded: !!strategicElement,
    })
  } catch (error) {
    console.error('Freeform exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tutor response' },
      { status: 500 }
    )
  }
}

/**
 * Handle completion of freeform tutoring dialogue
 */
async function handleFreeformComplete(
  request: NextRequest,
  notebookId: string,
  body: {
    dialogueId: string
    skillId: string
    summary: {
      engagementScore: number
      understandingProgression: number
      questionQuality: number
      insightsMade: string[]
      topicsCovered: string[]
      strengths: string[]
      areasForGrowth: string[]
      overallAssessment: string
      recommendedNextSteps: string[]
    }
    conversationMetrics: {
      totalExchanges: number
      questionCount: number
      insightCount: number
      averageEngagement: number
      topicDepth: number
      curiosityTrend: 'increasing' | 'stable' | 'decreasing'
    }
    exchanges: number
    profileUpdates?: {
      expertiseLevel?: string
      confidenceLevel?: number
      preferredResponseTypes?: string[]
    }
  }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dialogueId, skillId, summary, conversationMetrics, exchanges, profileUpdates } = body

  // Record completion
  await recordSocraticInteraction(
    notebookId,
    user.id,
    dialogueId,
    'freeform_complete',
    skillId,
    {
      dialogueId,
      summary,
      conversationMetrics,
      totalExchanges: exchanges,
      profileUpdates,
    }
  )

  // Update learner profile based on freeform dialogue insights
  const inverseProfile = await fetchInverseProfile(notebookId, user.id)

  if (inverseProfile) {
    // Freeform dialogue reveals engagement and curiosity patterns
    const engagementSignal = conversationMetrics.averageEngagement

    // Calculate persistence boost from engagement
    const persistenceBoost = summary.questionQuality > 0.7 ? 0.1 : 0
    const newPersistence = Math.min(1, (inverseProfile.motivational_indicators.persistenceScore || 0.5) + persistenceBoost)

    // Update profile with freeform insights
    await supabase
      .from('inverse_profiles')
      .update({
        motivational_indicators: {
          ...inverseProfile.motivational_indicators,
          persistenceScore: newPersistence,
        },
        behavioral_patterns: {
          ...inverseProfile.behavioral_patterns,
          lastFreeformSession: {
            skillId,
            timestamp: new Date().toISOString(),
            engagementScore: summary.engagementScore,
            questionQuality: summary.questionQuality,
            curiosityTrend: conversationMetrics.curiosityTrend,
            averageEngagement: engagementSignal,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
  }

  return NextResponse.json({
    success: true,
    dialogueId,
    summary,
    conversationMetrics,
    profileUpdated: !!inverseProfile,
  })
}
