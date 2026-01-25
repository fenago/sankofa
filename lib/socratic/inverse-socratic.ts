/**
 * Inverse Socratic Mode Implementation
 *
 * Based on "Learning by Teaching" / "Protégé Effect" research
 *
 * In Inverse Socratic Mode:
 * - The USER leads the conversation (explains, teaches, asks questions)
 * - The AI acts as a curious learner (asks clarifying questions, expresses confusion)
 * - Psychometrics are extracted from how the user teaches
 *
 * Research basis:
 * - Bargh & Schul (1980) - Learning by teaching increases retention by 50%+
 * - Fiorella & Mayer (2014) - Meta-analysis: teaching produces d=0.77 effect
 * - Roscoe & Chi (2007) - Self-explanation through teaching
 *
 * Key insight: When you teach, you:
 * 1. Must organize your knowledge coherently
 * 2. Identify gaps you didn't know you had
 * 3. Deepen understanding through explanation
 * 4. Build stronger memory through elaboration
 */

import type { ExtractionResult } from './psychometric-extractor'

// ============================================================================
// TYPES
// ============================================================================

export interface InverseSocraticConfig {
  skillId: string
  skillName: string
  targetConcept: string
  learnerPersona: LearnerPersona
  difficultyLevel: number
  maxExchanges: number
}

export type LearnerPersona =
  | 'curious_beginner'      // Asks basic questions, needs simple explanations
  | 'engaged_student'       // Has some knowledge, asks follow-up questions
  | 'skeptical_learner'     // Challenges explanations, asks "why?"
  | 'confused_novice'       // Expresses confusion, needs patience
  | 'eager_peer'            // Collaborative, builds on explanations

export interface InverseSocraticState {
  dialogueId: string
  config: InverseSocraticConfig
  exchanges: InverseExchange[]
  teachingMetrics: TeachingMetrics
  learnerSatisfaction: number         // 0-1 how "satisfied" the AI learner is
  conceptsCovered: string[]
  misconceptionsDetected: string[]
  currentLearnerUnderstanding: number // 0-1
  status: 'active' | 'completed' | 'ended_early'
}

export interface InverseExchange {
  exchangeNumber: number
  // User's teaching content
  userMessage: string
  userRole: 'explaining' | 'answering' | 'questioning' | 'elaborating' | 'correcting'
  extractedPsychometrics: TeachingPsychometrics
  // AI's learner response
  aiLearnerResponse: string
  aiLearnerRole: 'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking'
  timestamp: string
}

export interface TeachingPsychometrics {
  // Explanation Quality
  explanationClarity: number           // 0-1
  explanationCompleteness: number      // 0-1
  usesExamples: boolean
  usesAnalogies: boolean
  structureQuality: number             // 0-1 (logical flow)

  // Depth of Understanding
  surfaceVsDeep: 'surface' | 'mixed' | 'deep'
  conceptualAccuracy: number           // 0-1
  misconceptionsInExplanation: string[]
  correctsOwnMistakes: boolean

  // Teaching Adaptability
  respondsToConfusion: boolean
  simplifiesWhenNeeded: boolean
  elaboratesWhenAsked: boolean
  anticipatesQuestions: boolean

  // Metacognitive Indicators
  acknowledgesUncertainty: boolean
  distinguishesFactFromOpinion: boolean
  identifiesPrerequisites: boolean

  // Engagement
  patienceLevel: number                // 0-1
  encouragementProvided: boolean
  checksForUnderstanding: boolean
}

export interface TeachingMetrics {
  // Aggregated across exchanges
  overallExplanationQuality: number    // 0-1
  conceptualAccuracy: number           // 0-1
  teachingAdaptability: number         // 0-1
  metacognitiveDemonstration: number   // 0-1
  patienceAndEngagement: number        // 0-1

  // Qualitative
  strengthAreas: string[]
  improvementAreas: string[]
  notableInsights: string[]

  // Comparison to standard Socratic
  deeperThanQA: boolean                // Did teaching reveal more than answering would?
}

export interface LearnerPromptConfig {
  persona: LearnerPersona
  currentUnderstanding: number
  targetConcept: string
  recentUserMessage: string
  previousExchanges: InverseExchange[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERSONA_DESCRIPTIONS: Record<LearnerPersona, {
  description: string
  questionStyle: string
  confusionLevel: number
  challengeLevel: number
}> = {
  curious_beginner: {
    description: "You are a curious beginner who knows nothing about this topic but is eager to learn.",
    questionStyle: "Ask simple, basic questions like 'What does that mean?' and 'Can you give me an example?'",
    confusionLevel: 0.7,
    challengeLevel: 0.1,
  },
  engaged_student: {
    description: "You are an engaged student with some basic knowledge who wants to go deeper.",
    questionStyle: "Ask thoughtful follow-up questions and try to connect ideas.",
    confusionLevel: 0.4,
    challengeLevel: 0.3,
  },
  skeptical_learner: {
    description: "You are a skeptical learner who questions everything and wants to understand why.",
    questionStyle: "Challenge explanations with 'But why?' and 'How do you know that?'",
    confusionLevel: 0.3,
    challengeLevel: 0.7,
  },
  confused_novice: {
    description: "You are a confused novice who struggles to understand and needs patient explanations.",
    questionStyle: "Express confusion often and ask for simpler explanations.",
    confusionLevel: 0.9,
    challengeLevel: 0.1,
  },
  eager_peer: {
    description: "You are an eager peer who learns collaboratively and builds on what's explained.",
    questionStyle: "Share related ideas and ask 'What about...' questions to explore connections.",
    confusionLevel: 0.3,
    challengeLevel: 0.4,
  },
}

// Response patterns for the AI learner
const LEARNER_RESPONSES = {
  asking: [
    "Hmm, can you explain that a bit more?",
    "What do you mean by that?",
    "Can you give me an example?",
    "How does that connect to what you said before?",
    "Why does that happen?",
    "What would happen if...?",
  ],
  confirming: [
    "Oh, I think I'm starting to get it!",
    "So if I understand correctly...",
    "That makes sense because...",
    "Let me see if I got this right...",
  ],
  confused: [
    "I'm a bit confused. Could you explain it differently?",
    "Wait, I'm not sure I follow that part.",
    "Hmm, that's tricky. Can you break it down more?",
    "I thought it worked differently. Can you clarify?",
  ],
  connecting: [
    "Oh, is that similar to...?",
    "So this relates to... right?",
    "Does that mean...?",
    "I wonder if that also applies to...",
  ],
  thanking: [
    "That really helped me understand it better!",
    "Thank you for explaining that so clearly!",
    "I feel like I'm really getting this now!",
    "Great explanation! Now I want to learn more about...",
  ],
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize an Inverse Socratic dialogue
 */
export function initializeInverseSocratic(config: InverseSocraticConfig): InverseSocraticState {
  return {
    dialogueId: `inverse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    config,
    exchanges: [],
    teachingMetrics: {
      overallExplanationQuality: 0.5,
      conceptualAccuracy: 0.5,
      teachingAdaptability: 0.5,
      metacognitiveDemonstration: 0.5,
      patienceAndEngagement: 0.5,
      strengthAreas: [],
      improvementAreas: [],
      notableInsights: [],
      deeperThanQA: false,
    },
    learnerSatisfaction: 0.3,
    conceptsCovered: [],
    misconceptionsDetected: [],
    currentLearnerUnderstanding: 0.1,
    status: 'active',
  }
}

/**
 * Generate the opening prompt for the user (as teacher)
 */
export function generateOpeningPrompt(config: InverseSocraticConfig): string {
  const persona = PERSONA_DESCRIPTIONS[config.learnerPersona]

  const prompts: Record<LearnerPersona, string> = {
    curious_beginner: `Hi! I'm trying to learn about "${config.skillName}" but I don't know anything about it yet. Could you help explain it to me? I'm really curious to understand!`,
    engaged_student: `Hey! I've heard about "${config.skillName}" and I know a little bit, but I want to understand it better. Can you teach me? I'll ask questions as we go.`,
    skeptical_learner: `I've been hearing about "${config.skillName}" but I'm not sure I buy all the hype. Can you explain it to me and help me understand why it matters? I might ask some tough questions.`,
    confused_novice: `I'm supposed to learn about "${config.skillName}" but I'm really struggling with it. Could you explain it in simple terms? Please be patient with me!`,
    eager_peer: `I'm also studying "${config.skillName}" and I'd love to learn from you! Let's explore it together - I'll share my thoughts and you can teach me what you know.`,
  }

  return prompts[config.learnerPersona]
}

/**
 * Extract teaching psychometrics from user's message
 */
export function extractTeachingPsychometrics(
  userMessage: string,
  previousExchanges: InverseExchange[],
  lastAIRole: 'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking' | null
): TeachingPsychometrics {
  const message = userMessage.toLowerCase()
  const words = userMessage.split(/\s+/)
  const sentences = userMessage.split(/[.!?]+/).filter(s => s.trim().length > 0)

  // Explanation quality indicators
  const hasExamples = /for example|such as|like when|consider|imagine|let's say/i.test(userMessage)
  const hasAnalogies = /similar to|like a|just like|think of it as|it's like|comparable to/i.test(userMessage)
  const hasStructure = /first|second|then|next|finally|step \d|because|therefore|so that/i.test(userMessage)

  // Depth indicators
  const hasSurfaceOnly = /just|simply|basically|it's just that/i.test(userMessage) && words.length < 30
  const hasDeepExplanation = /because|the reason is|this happens when|underlying|fundamentally/i.test(userMessage)
  const hasConceptualLinks = /relates to|connects with|builds on|depends on|leads to/i.test(userMessage)

  // Metacognitive indicators
  const acknowledgesUncertainty = /i'm not sure|i think|might be|possibly|could be|don't quote me/i.test(userMessage)
  const identifiesPrereqs = /before you can|first you need|you should know|prerequisite|foundation/i.test(userMessage)
  const distinguishesFact = /in my opinion|some people say|the research shows|it's been proven/i.test(userMessage)

  // Teaching adaptability (responding to AI's state)
  const respondsToConfusion = lastAIRole === 'confused' && (
    /let me try|another way|simpler|differently|break it down|step by step/i.test(userMessage)
  )
  const elaboratesWhenAsked = lastAIRole === 'asking' && words.length > 40
  const checksUnderstanding = /does that make sense|do you follow|is that clear|got it\?|understand\?/i.test(userMessage)

  // Patience indicators
  const hasEncouragement = /good question|that's okay|don't worry|you're doing|keep going/i.test(userMessage)

  // Calculate scores
  const explanationClarity = Math.min(1, (
    (hasStructure ? 0.3 : 0) +
    (sentences.length >= 2 ? 0.2 : 0) +
    (words.length > 20 && words.length < 150 ? 0.2 : 0) +
    (hasExamples ? 0.15 : 0) +
    (hasAnalogies ? 0.15 : 0)
  ))

  const explanationCompleteness = Math.min(1, (
    (words.length > 30 ? 0.3 : words.length > 15 ? 0.15 : 0) +
    (sentences.length >= 3 ? 0.3 : sentences.length >= 2 ? 0.15 : 0) +
    (hasExamples ? 0.2 : 0) +
    (hasConceptualLinks ? 0.2 : 0)
  ))

  const structureQuality = Math.min(1, (
    (hasStructure ? 0.4 : 0) +
    (sentences.length >= 2 ? 0.2 : 0) +
    (!/and and|but but|so so/i.test(userMessage) ? 0.2 : 0) +
    (hasConceptualLinks ? 0.2 : 0)
  ))

  // Determine depth
  let surfaceVsDeep: 'surface' | 'mixed' | 'deep' = 'mixed'
  if (hasSurfaceOnly && !hasDeepExplanation) surfaceVsDeep = 'surface'
  else if (hasDeepExplanation && hasConceptualLinks) surfaceVsDeep = 'deep'

  // Conceptual accuracy (approximation - real implementation would use LLM)
  const conceptualAccuracy = Math.min(1, 0.5 +
    (hasDeepExplanation ? 0.2 : 0) +
    (acknowledgesUncertainty ? 0.1 : 0) +
    (hasExamples ? 0.1 : 0) +
    (hasConceptualLinks ? 0.1 : 0)
  )

  return {
    explanationClarity,
    explanationCompleteness,
    usesExamples: hasExamples,
    usesAnalogies: hasAnalogies,
    structureQuality,

    surfaceVsDeep,
    conceptualAccuracy,
    misconceptionsInExplanation: [], // Would be populated by LLM
    correctsOwnMistakes: /actually|wait|let me correct|i was wrong|i meant/i.test(userMessage),

    respondsToConfusion,
    simplifiesWhenNeeded: respondsToConfusion,
    elaboratesWhenAsked,
    anticipatesQuestions: /you might wonder|you might ask|a common question/i.test(userMessage),

    acknowledgesUncertainty,
    distinguishesFactFromOpinion: distinguishesFact,
    identifiesPrerequisites: identifiesPrereqs,

    patienceLevel: Math.min(1, 0.5 + (hasEncouragement ? 0.3 : 0) + (respondsToConfusion ? 0.2 : 0)),
    encouragementProvided: hasEncouragement,
    checksForUnderstanding: checksUnderstanding,
  }
}

/**
 * Classify the user's role in their message
 */
export function classifyUserRole(
  userMessage: string,
  lastAIRole: 'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking' | null
): 'explaining' | 'answering' | 'questioning' | 'elaborating' | 'correcting' {
  const message = userMessage.toLowerCase()

  // Is this a question from the user?
  if (/\?$/.test(userMessage.trim()) || /^(do you|did you|are you|what|why|how|when|where|who|can you)/i.test(userMessage)) {
    return 'questioning'
  }

  // Is this a correction?
  if (/actually|let me correct|i was wrong|i should clarify|to be more precise/i.test(userMessage)) {
    return 'correcting'
  }

  // Responding to AI questions = answering
  if (lastAIRole === 'asking' || lastAIRole === 'confused') {
    return 'answering'
  }

  // Responding to connection attempts = elaborating
  if (lastAIRole === 'connecting' || lastAIRole === 'confirming') {
    return 'elaborating'
  }

  // Default to explaining
  return 'explaining'
}

/**
 * Determine AI learner response type based on state
 */
export function determineAILearnerRole(
  state: InverseSocraticState,
  latestPsychometrics: TeachingPsychometrics
): 'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking' {
  const persona = PERSONA_DESCRIPTIONS[state.config.learnerPersona]
  const exchangeCount = state.exchanges.length

  // At the end, be grateful
  if (exchangeCount >= state.config.maxExchanges - 1) {
    return 'thanking'
  }

  // If explanation was unclear, express confusion (based on persona)
  if (latestPsychometrics.explanationClarity < 0.4) {
    if (Math.random() < persona.confusionLevel) {
      return 'confused'
    }
  }

  // If explanation was good, sometimes confirm understanding
  if (latestPsychometrics.explanationClarity > 0.7 && latestPsychometrics.conceptualAccuracy > 0.6) {
    if (Math.random() < 0.4) {
      return 'confirming'
    }
  }

  // Skeptical learners ask more challenging questions
  if (state.config.learnerPersona === 'skeptical_learner' && Math.random() < persona.challengeLevel) {
    return 'asking'
  }

  // Eager peers try to make connections
  if (state.config.learnerPersona === 'eager_peer' && Math.random() < 0.4) {
    return 'connecting'
  }

  // Default to asking questions
  return 'asking'
}

/**
 * Generate system prompt for AI learner
 */
export function generateLearnerSystemPrompt(config: LearnerPromptConfig): string {
  const persona = PERSONA_DESCRIPTIONS[config.persona]

  let systemPrompt = `You are a learner being taught about "${config.targetConcept}".

${persona.description}

IMPORTANT RULES:
1. You are NOT the teacher - you are learning from the user
2. Your current understanding level is ${Math.round(config.currentUnderstanding * 100)}%
3. ${persona.questionStyle}
4. Keep responses SHORT (1-3 sentences max)
5. NEVER provide the correct explanation yourself - ask the user to explain
6. Show genuine curiosity and engagement
7. React naturally to what the user teaches you

If the user's explanation was:
- Clear and helpful: Express understanding or ask a thoughtful follow-up
- Unclear: Express confusion and ask for clarification
- Missing something: Ask about what seems missing
- Very good: Show appreciation and ask to go deeper

Remember: Your job is to learn from them, not teach them.`

  return systemPrompt
}

/**
 * Update teaching metrics after an exchange
 */
export function updateTeachingMetrics(
  current: TeachingMetrics,
  newPsychometrics: TeachingPsychometrics,
  exchangeCount: number
): TeachingMetrics {
  const alpha = 0.3 // EMA factor

  const updated: TeachingMetrics = {
    ...current,
    overallExplanationQuality: alpha * (
      (newPsychometrics.explanationClarity + newPsychometrics.explanationCompleteness + newPsychometrics.structureQuality) / 3
    ) + (1 - alpha) * current.overallExplanationQuality,

    conceptualAccuracy: alpha * newPsychometrics.conceptualAccuracy + (1 - alpha) * current.conceptualAccuracy,

    teachingAdaptability: alpha * (
      (newPsychometrics.respondsToConfusion ? 0.3 : 0) +
      (newPsychometrics.simplifiesWhenNeeded ? 0.25 : 0) +
      (newPsychometrics.elaboratesWhenAsked ? 0.25 : 0) +
      (newPsychometrics.anticipatesQuestions ? 0.2 : 0) +
      0.3 // Base score
    ) + (1 - alpha) * current.teachingAdaptability,

    metacognitiveDemonstration: alpha * (
      (newPsychometrics.acknowledgesUncertainty ? 0.3 : 0) +
      (newPsychometrics.distinguishesFactFromOpinion ? 0.3 : 0) +
      (newPsychometrics.identifiesPrerequisites ? 0.2 : 0) +
      (newPsychometrics.correctsOwnMistakes ? 0.2 : 0) +
      0.2 // Base score
    ) + (1 - alpha) * current.metacognitiveDemonstration,

    patienceAndEngagement: alpha * (
      newPsychometrics.patienceLevel * 0.4 +
      (newPsychometrics.encouragementProvided ? 0.3 : 0) +
      (newPsychometrics.checksForUnderstanding ? 0.3 : 0) +
      0.2 // Base score
    ) + (1 - alpha) * current.patienceAndEngagement,

    strengthAreas: [...current.strengthAreas],
    improvementAreas: [...current.improvementAreas],
    notableInsights: [...current.notableInsights],
    deeperThanQA: current.deeperThanQA,
  }

  // Identify strengths (above 0.7)
  if (updated.overallExplanationQuality > 0.7 && !updated.strengthAreas.includes('Clear explanations')) {
    updated.strengthAreas.push('Clear explanations')
  }
  if (newPsychometrics.usesExamples && newPsychometrics.usesAnalogies && !updated.strengthAreas.includes('Uses examples and analogies')) {
    updated.strengthAreas.push('Uses examples and analogies')
  }
  if (updated.teachingAdaptability > 0.7 && !updated.strengthAreas.includes('Adapts to learner needs')) {
    updated.strengthAreas.push('Adapts to learner needs')
  }

  // Identify areas for improvement (below 0.4)
  if (updated.overallExplanationQuality < 0.4 && !updated.improvementAreas.includes('Explanation clarity')) {
    updated.improvementAreas.push('Explanation clarity')
  }
  if (!newPsychometrics.usesExamples && exchangeCount > 2 && !updated.improvementAreas.includes('Use more examples')) {
    updated.improvementAreas.push('Use more examples')
  }

  // Deep teaching detected
  if (newPsychometrics.surfaceVsDeep === 'deep' && exchangeCount > 2) {
    updated.deeperThanQA = true
  }

  return updated
}

/**
 * Update learner understanding based on teaching quality
 */
export function updateLearnerUnderstanding(
  current: number,
  psychometrics: TeachingPsychometrics
): number {
  // Good teaching increases understanding
  const qualityBonus = (
    psychometrics.explanationClarity * 0.3 +
    psychometrics.conceptualAccuracy * 0.4 +
    (psychometrics.usesExamples ? 0.15 : 0) +
    (psychometrics.usesAnalogies ? 0.15 : 0)
  )

  // Apply increase
  const increase = qualityBonus * 0.15 // Max 15% increase per exchange
  const newUnderstanding = Math.min(0.95, current + increase)

  return newUnderstanding
}

/**
 * Generate dialogue summary for Inverse Socratic mode
 */
export function generateInverseSocraticSummary(state: InverseSocraticState): {
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
} {
  const metrics = state.teachingMetrics

  const overallScore = (
    metrics.overallExplanationQuality * 0.3 +
    metrics.conceptualAccuracy * 0.25 +
    metrics.teachingAdaptability * 0.2 +
    metrics.metacognitiveDemonstration * 0.15 +
    metrics.patienceAndEngagement * 0.1
  )

  const strengthSummary = metrics.strengthAreas.length > 0
    ? `You demonstrated strength in: ${metrics.strengthAreas.join(', ')}`
    : "Keep practicing to develop teaching strengths"

  const improvementSummary = metrics.improvementAreas.length > 0
    ? `Areas to develop: ${metrics.improvementAreas.join(', ')}`
    : "Great teaching! Keep refining your explanations"

  // Generate learner feedback based on understanding
  let learnerFeedback: string
  if (state.currentLearnerUnderstanding > 0.8) {
    learnerFeedback = "I feel like I really understand this now! You're a great teacher!"
  } else if (state.currentLearnerUnderstanding > 0.6) {
    learnerFeedback = "I learned a lot from you. Some parts are still a bit fuzzy, but I'm getting there!"
  } else if (state.currentLearnerUnderstanding > 0.4) {
    learnerFeedback = "I think I understand the basics. Maybe we could go over some parts again?"
  } else {
    learnerFeedback = "I'm still a bit confused about some things. Could you try explaining differently next time?"
  }

  return {
    overallTeachingScore: overallScore,
    strengthSummary,
    improvementSummary,
    learnerFeedback,
    psychometricHighlights: [
      {
        category: 'Explanation Quality',
        score: metrics.overallExplanationQuality,
        interpretation: metrics.overallExplanationQuality > 0.7 ? 'Clear and comprehensive' :
                       metrics.overallExplanationQuality > 0.4 ? 'Good but could be clearer' : 'Needs more structure',
      },
      {
        category: 'Conceptual Accuracy',
        score: metrics.conceptualAccuracy,
        interpretation: metrics.conceptualAccuracy > 0.7 ? 'Accurate understanding' :
                       metrics.conceptualAccuracy > 0.4 ? 'Mostly correct' : 'Some gaps in understanding',
      },
      {
        category: 'Teaching Adaptability',
        score: metrics.teachingAdaptability,
        interpretation: metrics.teachingAdaptability > 0.7 ? 'Excellent at adjusting to learner' :
                       metrics.teachingAdaptability > 0.4 ? 'Responsive to feedback' : 'Could adapt more to confusion',
      },
      {
        category: 'Metacognitive Awareness',
        score: metrics.metacognitiveDemonstration,
        interpretation: metrics.metacognitiveDemonstration > 0.7 ? 'Strong self-awareness' :
                       metrics.metacognitiveDemonstration > 0.4 ? 'Good reflection' : 'Could acknowledge more uncertainty',
      },
    ],
    researchConnection: `Teaching helps you learn! Research shows a 50%+ retention boost when you explain concepts to others (Bargh & Schul, 1980). ${metrics.deeperThanQA ? 'Your explanations revealed deeper understanding than simple Q&A would have!' : 'Keep teaching to deepen your understanding!'}`,
  }
}

export default {
  initializeInverseSocratic,
  generateOpeningPrompt,
  extractTeachingPsychometrics,
  classifyUserRole,
  determineAILearnerRole,
  generateLearnerSystemPrompt,
  updateTeachingMetrics,
  updateLearnerUnderstanding,
  generateInverseSocraticSummary,
}
