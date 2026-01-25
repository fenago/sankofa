/**
 * Dialogue Manager for Socratic Mode
 *
 * Orchestrates the complete Socratic dialogue flow:
 * 1. Initialize dialogue state
 * 2. Process learner responses
 * 3. Extract psychometrics
 * 4. Adapt next questions
 * 5. Track dialogue effectiveness
 * 6. Update profiles on completion
 */

import type { InverseProfile } from '@/lib/types/interactions'
import type {
  DialogueState,
  QuestionType,
  UnderstandingLevel,
} from '@/lib/tutoring/socratic-tutor'
import {
  createDialogueState,
  recordExchange,
  getNextQuestionType,
  calculateDialogueEffectiveness,
} from '@/lib/tutoring/socratic-tutor'

import {
  extractFromResponse,
  aggregatePsychometrics,
  type ExtractionResult,
  type DialogueContext,
} from './psychometric-extractor'

import {
  buildAdaptiveConfig,
  selectQuestionType,
  generateAdaptiveSystemPrompt,
  generateFollowUpPrompt,
  checkForInterventions,
  createDefaultSocraticProfile,
  type SocraticProfile,
  type AdaptiveConfig,
  type SessionState,
  type SocraticIntervention,
} from './adaptive-generator'

import {
  updateProfileFromSocraticDialogue,
  type DialogueResults,
  type ProfileUpdateResult,
} from './profile-updater'

// ============================================================================
// Types
// ============================================================================

export interface SocraticDialogue {
  id: string
  notebookId: string
  skillId: string
  skillName: string
  targetConcept: string
  knownMisconceptions: string[]
  state: DialogueState
  sessionState: SessionState
  adaptiveConfig: AdaptiveConfig
  extractions: ExtractionResult[]
  correctnessRecord: boolean[]
  startedAt: string
  lastActivityAt: string
  status: 'active' | 'completed' | 'abandoned'
}

export interface StartDialogueParams {
  notebookId: string
  skillId: string
  skillName: string
  targetConcept: string
  knownMisconceptions: string[]
  inverseProfile: InverseProfile | null
  socraticProfile: SocraticProfile | null
}

export interface StartDialogueResult {
  dialogue: SocraticDialogue
  openingQuestion: string
  systemPrompt: string
}

export interface ExchangeParams {
  dialogue: SocraticDialogue
  learnerResponse: string
  responseLatencyMs: number
  inverseProfile: InverseProfile | null
  socraticProfile: SocraticProfile | null
}

export interface ExchangeResult {
  dialogue: SocraticDialogue
  extraction: ExtractionResult
  nextQuestion: string | null
  questionType: QuestionType | null
  intervention: SocraticIntervention
  isDialogueComplete: boolean
  systemPrompt: string
}

export interface CompleteDialogueResult {
  dialogueResults: DialogueResults
  profileUpdateResult: ProfileUpdateResult
  effectiveness: {
    score: number
    selfDiscoveryRate: number
    exchangeEfficiency: number
    misconceptionAddressed: boolean
    interpretation: string
  }
}

// ============================================================================
// Dialogue ID Generator
// ============================================================================

function generateDialogueId(): string {
  return `socratic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Start Dialogue
// ============================================================================

export function startDialogue(params: StartDialogueParams): StartDialogueResult {
  const {
    notebookId,
    skillId,
    skillName,
    targetConcept,
    knownMisconceptions,
    inverseProfile,
    socraticProfile,
  } = params

  // Initialize dialogue state
  const dialogueState = createDialogueState(
    skillId,
    skillName,
    targetConcept,
    knownMisconceptions
  )

  // Initialize session state
  const sessionState: SessionState = {
    exchangeCount: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    currentEngagementLevel: 'medium',
    timeInSessionMs: 0,
    lastLatencyMs: 0,
    lastExtractionResult: null,
  }

  // Build adaptive configuration
  const profile = socraticProfile || createDefaultSocraticProfile()
  const adaptiveConfig = buildAdaptiveConfig(inverseProfile, profile, sessionState)

  // Generate system prompt
  const systemPrompt = generateAdaptiveSystemPrompt(
    adaptiveConfig,
    skillName,
    targetConcept,
    knownMisconceptions
  )

  // Determine opening question type
  const openingType = getNextQuestionType(dialogueState)
  const openingQuestion = generateOpeningQuestion(
    openingType || 'clarifying',
    skillName,
    targetConcept,
    adaptiveConfig
  )

  // Create dialogue object
  const dialogue: SocraticDialogue = {
    id: generateDialogueId(),
    notebookId,
    skillId,
    skillName,
    targetConcept,
    knownMisconceptions,
    state: dialogueState,
    sessionState,
    adaptiveConfig,
    extractions: [],
    correctnessRecord: [],
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    status: 'active',
  }

  return {
    dialogue,
    openingQuestion,
    systemPrompt,
  }
}

// ============================================================================
// Generate Opening Question
// ============================================================================

function generateOpeningQuestion(
  questionType: QuestionType,
  skillName: string,
  targetConcept: string,
  config: AdaptiveConfig
): string {
  // Template-based opening questions adapted to configuration
  const templates: Record<QuestionType, string[]> = {
    clarifying: [
      `Let's explore ${skillName} together. What do you already know about ${targetConcept}?`,
      `I'd like to understand your current thinking about ${skillName}. Can you tell me what comes to mind when you think about ${targetConcept}?`,
      `Before we dive in, what's your understanding of ${targetConcept}?`,
    ],
    probing: [
      `What do you think is the most important aspect of ${targetConcept}?`,
      `If you had to explain ${targetConcept} to someone, what would you say?`,
    ],
    scaffolding: [
      `Let's break down ${skillName} step by step. What's the first thing we need to understand about ${targetConcept}?`,
      `To understand ${targetConcept}, what do you think we need to know first?`,
    ],
    challenging: [
      `What makes ${targetConcept} different from related concepts you might know?`,
      `Can you think of a situation where ${targetConcept} might not apply the way you'd expect?`,
    ],
    reflection: [
      `Think back to what you've learned before. How might ${targetConcept} connect to your prior knowledge?`,
    ],
    metacognitive: [
      `What's your approach when learning something new like ${targetConcept}?`,
      `How confident do you feel about ${skillName}? What parts seem clear vs unclear?`,
    ],
  }

  const options = templates[questionType] || templates.clarifying
  const baseQuestion = options[Math.floor(Math.random() * options.length)]

  // Adapt based on configuration
  let question = baseQuestion

  if (config.scaffolding.level <= 2) {
    question += " Don't worry if you're not sure - we'll figure it out together."
  }

  if (config.calibration.questionStyle === 'supportive') {
    question = question.replace("What do you", "I'm curious - what do you")
  }

  return question
}

// ============================================================================
// Process Exchange
// ============================================================================

export function processExchange(params: ExchangeParams): ExchangeResult {
  const {
    dialogue,
    learnerResponse,
    responseLatencyMs,
    inverseProfile,
    socraticProfile,
  } = params

  // Build dialogue context for extraction
  const context: DialogueContext = {
    skillName: dialogue.skillName,
    targetConcept: dialogue.targetConcept,
    exchangeNumber: dialogue.sessionState.exchangeCount + 1,
    previousExchanges: dialogue.state.exchanges.map((e) => ({
      tutorQuestion: e.tutorQuestion,
      learnerResponse: e.studentResponse || '',
      questionType: e.questionType,
    })),
    knownMisconceptions: dialogue.knownMisconceptions,
  }

  // Extract psychometrics from response
  const extraction = extractFromResponse(learnerResponse, responseLatencyMs, context)

  // Update correctness record (based on understanding level)
  const isCorrect = ['partial', 'deep', 'transfer'].includes(
    extraction.overallAssessment.understandingLevel
  )

  // Map understanding level to the expected type
  const understandingMap: Record<string, UnderstandingLevel> = {
    'none': 'none',
    'surface': 'partial',
    'partial': 'partial',
    'deep': 'correct',
    'transfer': 'advanced',
  }
  const mappedUnderstanding = understandingMap[extraction.overallAssessment.understandingLevel] || 'none'

  // Get current question (last one asked)
  const currentQuestion = dialogue.state.exchanges.length > 0
    ? dialogue.state.exchanges[dialogue.state.exchanges.length - 1]?.tutorQuestion
    : generateOpeningQuestion('clarifying', dialogue.skillName, dialogue.targetConcept, dialogue.adaptiveConfig)

  // Record the exchange
  const updatedState = recordExchange(
    dialogue.state,
    currentQuestion || 'Initial question',
    extraction.overallAssessment.recommendedNextQuestionType,
    learnerResponse,
    {
      understandingLevel: mappedUnderstanding,
      isDiscovery: extraction.overallAssessment.isDiscoveryMoment,
      discoveryDescription: extraction.insightsDetected.length > 0
        ? extraction.insightsDetected[0]
        : undefined,
    }
  )

  // Update session state
  const updatedSessionState: SessionState = {
    exchangeCount: dialogue.sessionState.exchangeCount + 1,
    consecutiveFailures: isCorrect
      ? 0
      : dialogue.sessionState.consecutiveFailures + 1,
    consecutiveSuccesses: isCorrect
      ? dialogue.sessionState.consecutiveSuccesses + 1
      : 0,
    currentEngagementLevel: extraction.engagement.engagementLevel,
    timeInSessionMs: Date.now() - new Date(dialogue.startedAt).getTime(),
    lastLatencyMs: responseLatencyMs,
    lastExtractionResult: extraction,
  }

  // Update adaptive config based on new information
  const profile = socraticProfile || createDefaultSocraticProfile()
  const updatedConfig = buildAdaptiveConfig(inverseProfile, profile, updatedSessionState)

  // Check for interventions
  const intervention = checkForInterventions(profile, updatedSessionState, extraction)

  // Determine if dialogue should complete
  const shouldComplete =
    updatedState.discoveryMade ||
    intervention.type === 'take_break' ||
    intervention.type === 'switch_topic' ||
    updatedSessionState.exchangeCount >= 15 || // Max exchanges
    (extraction.overallAssessment.understandingLevel === 'transfer' &&
      updatedSessionState.consecutiveSuccesses >= 2)

  // Generate next question if not complete
  let nextQuestion: string | null = null
  let nextQuestionType: QuestionType | null = null

  if (!shouldComplete) {
    nextQuestionType = selectQuestionType(profile, updatedState, extraction)

    // Generate follow-up prompt for AI
    nextQuestion = generateFollowUpPrompt(updatedConfig, extraction, updatedState)
  }

  // Generate updated system prompt
  const systemPrompt = generateAdaptiveSystemPrompt(
    updatedConfig,
    dialogue.skillName,
    dialogue.targetConcept,
    dialogue.knownMisconceptions
  )

  // Build updated dialogue
  const updatedDialogue: SocraticDialogue = {
    ...dialogue,
    state: updatedState,
    sessionState: updatedSessionState,
    adaptiveConfig: updatedConfig,
    extractions: [...dialogue.extractions, extraction],
    correctnessRecord: [...dialogue.correctnessRecord, isCorrect],
    lastActivityAt: new Date().toISOString(),
    status: shouldComplete ? 'completed' : 'active',
  }

  return {
    dialogue: updatedDialogue,
    extraction,
    nextQuestion,
    questionType: nextQuestionType,
    intervention,
    isDialogueComplete: shouldComplete,
    systemPrompt,
  }
}

// ============================================================================
// Complete Dialogue
// ============================================================================

export function completeDialogue(
  dialogue: SocraticDialogue,
  inverseProfile: InverseProfile | null,
  socraticProfile: SocraticProfile | null
): CompleteDialogueResult {
  // Calculate effectiveness
  const effectiveness = calculateDialogueEffectiveness(dialogue.state)

  // Aggregate psychometrics
  const aggregated = aggregatePsychometrics(
    dialogue.extractions,
    dialogue.correctnessRecord
  )

  // Determine final understanding level
  const lastExtraction = dialogue.extractions[dialogue.extractions.length - 1]
  const finalUnderstanding = lastExtraction?.overallAssessment.understandingLevel || 'none'

  // Collect insights and misconceptions
  const keyInsights = dialogue.extractions
    .flatMap((e) => e.insightsDetected)
    .filter((v, i, a) => a.indexOf(v) === i) // unique

  const misconceptionsIdentified = dialogue.extractions
    .flatMap((e) => e.misconceptions)
    .filter((v, i, a) => a.indexOf(v) === i) // unique

  // Build dialogue results
  const dialogueResults: DialogueResults = {
    skillId: dialogue.skillId,
    skillName: dialogue.skillName,
    totalExchanges: dialogue.sessionState.exchangeCount,
    discoveryAchieved: dialogue.state.discoveryMade,
    finalUnderstandingLevel: finalUnderstanding,
    effectivenessScore: effectiveness.score,
    extractions: dialogue.extractions,
    correctnessRecord: dialogue.correctnessRecord,
    aggregatedPsychometrics: aggregated,
    keyInsights,
    misconceptionsIdentified,
    durationMs: Date.now() - new Date(dialogue.startedAt).getTime(),
    timestamp: new Date().toISOString(),
  }

  // Update profiles
  const profileUpdateResult = updateProfileFromSocraticDialogue(
    inverseProfile,
    socraticProfile,
    dialogueResults
  )

  return {
    dialogueResults,
    profileUpdateResult,
    effectiveness,
  }
}

// ============================================================================
// Abandon Dialogue
// ============================================================================

export function abandonDialogue(dialogue: SocraticDialogue): SocraticDialogue {
  return {
    ...dialogue,
    status: 'abandoned',
    lastActivityAt: new Date().toISOString(),
  }
}

// ============================================================================
// Get Dialogue Summary
// ============================================================================

export interface DialogueSummary {
  totalExchanges: number
  discoveryMade: boolean
  finalUnderstanding: string
  effectivenessScore: number
  keyInsights: string[]
  misconceptions: string[]
  avgEngagement: string
  avgConfidence: string
  duration: string
}

export function getDialogueSummary(dialogue: SocraticDialogue): DialogueSummary {
  const effectiveness = calculateDialogueEffectiveness(dialogue.state)

  // Calculate average engagement
  const engagementCounts = { high: 0, medium: 0, low: 0 }
  for (const e of dialogue.extractions) {
    engagementCounts[e.engagement.engagementLevel]++
  }
  const avgEngagement = Object.entries(engagementCounts)
    .sort((a, b) => b[1] - a[1])[0][0]

  // Calculate average confidence
  const avgHedging = dialogue.extractions.reduce((sum, e) => sum + e.confidence.hedgingRate, 0) /
    Math.max(1, dialogue.extractions.length)
  const avgCertainty = dialogue.extractions.reduce((sum, e) => sum + e.confidence.certaintyRate, 0) /
    Math.max(1, dialogue.extractions.length)
  const avgConfidence = avgCertainty > avgHedging + 0.2
    ? 'confident'
    : avgHedging > avgCertainty + 0.2
      ? 'uncertain'
      : 'balanced'

  // Format duration
  const durationMs = Date.now() - new Date(dialogue.startedAt).getTime()
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.floor((durationMs % 60000) / 1000)
  const duration = `${minutes}m ${seconds}s`

  // Collect unique insights and misconceptions
  const keyInsights = [...new Set(dialogue.extractions.flatMap((e) => e.insightsDetected))]
  const misconceptions = [...new Set(dialogue.extractions.flatMap((e) => e.misconceptions))]

  // Get final understanding
  const lastExtraction = dialogue.extractions[dialogue.extractions.length - 1]
  const finalUnderstanding = lastExtraction?.overallAssessment.understandingLevel || 'unknown'

  return {
    totalExchanges: dialogue.sessionState.exchangeCount,
    discoveryMade: dialogue.state.discoveryMade,
    finalUnderstanding,
    effectivenessScore: Math.round(effectiveness.score * 100),
    keyInsights,
    misconceptions,
    avgEngagement,
    avgConfidence,
    duration,
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  ExtractionResult,
  DialogueContext,
  SocraticProfile,
  AdaptiveConfig,
  SessionState,
  SocraticIntervention,
  DialogueResults,
  ProfileUpdateResult,
}
