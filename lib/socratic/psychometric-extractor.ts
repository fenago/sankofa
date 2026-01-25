/**
 * Psychometric Extraction Engine for Socratic Mode
 *
 * Extracts rich psychometric data from conversational patterns that cannot
 * be captured through traditional Q&A practice.
 *
 * Based on educational psychology research:
 * - Bloom's Taxonomy (Anderson & Krathwohl, 2001)
 * - Epistemic Markers (Holmes, 1984)
 * - Metacognition (Flavell, 1979)
 * - Dunning-Kruger Effect (Kruger & Dunning, 1999)
 * - Expert-Novice Differences (Chi et al., 1981)
 */

import type { DialogueState, QuestionType } from '@/lib/tutoring/socratic-tutor'

// ============================================================================
// Types
// ============================================================================

export interface UnderstandingIndicators {
  explanationQuality: number // 0-1 (poor to excellent)
  analogyAptness: number // 0-1
  elaborationDepth: number // 0-1
  abstractionLevel: number // 0-1 (concrete to abstract)
  proceduralConceptualRatio: number // 0-1 (0=procedural, 1=conceptual)
  conceptualConnections: number // count of cross-concept references
}

export interface ConfidenceIndicators {
  hedgingRate: number // 0-1 (never to always)
  certaintyRate: number // 0-1
  hedgingMarkers: string[]
  certaintyMarkers: string[]
  isOverconfident: boolean
  isUnderconfident: boolean
}

export interface MetacognitionIndicators {
  selfCorrectionCount: number
  selfCorrections: string[]
  boundaryAwareness: number // 0-1 (knows what they don't know)
  questionQuality: 'surface' | 'deep' | 'metacognitive'
  reflectionCount: number
  monitoringCount: number
  strategyVerbalization: boolean
}

export interface ReasoningIndicators {
  reasoningStyle: 'deductive' | 'inductive' | 'mixed'
  abstractionPreference: 'concrete' | 'abstract' | 'balanced'
  processingStyle: 'sequential' | 'holistic' | 'flexible'
  logicalChainLength: number // steps in reasoning
  causalReasoningPresent: boolean
  divergentThinkingCount: number // alternative explanations offered
}

export interface EngagementIndicators {
  responseLatencyMs: number
  wordCount: number
  engagementLevel: 'high' | 'medium' | 'low'
  curiositySignals: string[]
  frustrationSignals: string[]
  persistenceIndicator: boolean
  masteryOrientation: boolean // vs performance orientation
}

export interface CommunicationIndicators {
  turnLength: number // words
  responsiveness: number // 0-1 (answers questions directly)
  topicCoherence: number // 0-1
  vocabularySophistication: number // 0-1
  grammaticalComplexity: number // 0-1
}

export interface ExtractionResult {
  understanding: UnderstandingIndicators
  confidence: ConfidenceIndicators
  metacognition: MetacognitionIndicators
  reasoning: ReasoningIndicators
  engagement: EngagementIndicators
  communication: CommunicationIndicators
  misconceptions: string[]
  insightsDetected: string[]
  overallAssessment: {
    understandingLevel: 'none' | 'surface' | 'partial' | 'deep' | 'transfer'
    isDiscoveryMoment: boolean
    recommendedNextQuestionType: QuestionType
  }
}

export interface DialogueContext {
  skillName: string
  targetConcept: string
  exchangeNumber: number
  previousExchanges: Array<{
    tutorQuestion: string
    learnerResponse: string
    questionType: QuestionType
  }>
  knownMisconceptions: string[]
}

// ============================================================================
// Hedging & Certainty Detection (Holmes, 1984 - Epistemic Markers)
// ============================================================================

const HEDGING_MARKERS = [
  'maybe', "i think", 'probably', 'not sure', 'might be', 'could be',
  'possibly', 'perhaps', "i guess", "i suppose", 'sort of', 'kind of',
  "i'm not certain", 'seems like', 'appears to', "i believe",
  'somewhat', 'fairly', 'rather', 'quite', 'apparently',
  "it seems", "it looks like", "i feel like", 'in a way'
]

const CERTAINTY_MARKERS = [
  'definitely', 'always', 'must be', 'obviously', 'clearly',
  'certainly', 'absolutely', 'without doubt', 'for sure', 'of course',
  'no question', 'undoubtedly', 'exactly', 'precisely', 'totally',
  "i know", "i'm sure", "i'm certain", 'completely', 'entirely'
]

export function detectHedgingLanguage(text: string): {
  rate: number
  markers: string[]
} {
  const lowerText = text.toLowerCase()
  const wordCount = text.split(/\s+/).length
  const foundMarkers: string[] = []

  for (const marker of HEDGING_MARKERS) {
    if (lowerText.includes(marker)) {
      foundMarkers.push(marker)
    }
  }

  // Rate is proportion of response containing hedging
  // Normalized by response length to avoid penalizing longer responses
  const rate = Math.min(1, foundMarkers.length / Math.max(3, wordCount / 20))

  return { rate, markers: foundMarkers }
}

export function detectCertaintyMarkers(text: string): {
  rate: number
  markers: string[]
} {
  const lowerText = text.toLowerCase()
  const wordCount = text.split(/\s+/).length
  const foundMarkers: string[] = []

  for (const marker of CERTAINTY_MARKERS) {
    if (lowerText.includes(marker)) {
      foundMarkers.push(marker)
    }
  }

  const rate = Math.min(1, foundMarkers.length / Math.max(3, wordCount / 20))

  return { rate, markers: foundMarkers }
}

// ============================================================================
// Self-Correction Detection (Yeung & Summerfield, 2012 - Error Monitoring)
// ============================================================================

const SELF_CORRECTION_MARKERS = [
  'wait', 'actually', 'let me rethink', "no, that's wrong",
  'hold on', "i made a mistake", 'let me reconsider',
  'on second thought', "i take that back", 'correction:',
  'let me correct', "i was wrong", "that's not right",
  'sorry, I meant', 'what I meant was', 'let me rephrase',
  'hmm, actually', 'no wait', 'scratch that'
]

export function detectSelfCorrections(text: string): {
  count: number
  corrections: string[]
} {
  const lowerText = text.toLowerCase()
  const corrections: string[] = []

  for (const marker of SELF_CORRECTION_MARKERS) {
    if (lowerText.includes(marker)) {
      // Extract the sentence containing the correction
      const sentences = text.split(/[.!?]+/)
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(marker)) {
          corrections.push(sentence.trim())
        }
      }
    }
  }

  return { count: corrections.length, corrections }
}

// ============================================================================
// Knowledge Boundary Awareness (Flavell, 1979 - Metacognition)
// ============================================================================

const BOUNDARY_AWARENESS_MARKERS = [
  "i don't know", "i'm not sure about", "i haven't learned",
  "i need to review", "i'm confused about", "i don't understand",
  "that's beyond what i know", "i'm uncertain about",
  "i would need to check", "i can't remember", "this is new to me",
  "i'm not familiar with", "i'm struggling with"
]

const MONITORING_MARKERS = [
  'let me check', 'does that make sense?', 'am i right?',
  "i'm not sure if", "is that correct?", 'let me verify',
  "did i get that right?", "i should double-check"
]

const REFLECTION_MARKERS = [
  'i wonder why i thought', 'looking back', 'i realize',
  'now that i think about it', 'in retrospect', 'upon reflection',
  'i see now that', 'i understand now', 'it makes sense because'
]

export function detectMetacognition(text: string): {
  boundaryAwareness: number
  monitoringCount: number
  reflectionCount: number
} {
  const lowerText = text.toLowerCase()

  let boundaryCount = 0
  let monitoringCount = 0
  let reflectionCount = 0

  for (const marker of BOUNDARY_AWARENESS_MARKERS) {
    if (lowerText.includes(marker)) boundaryCount++
  }

  for (const marker of MONITORING_MARKERS) {
    if (lowerText.includes(marker)) monitoringCount++
  }

  for (const marker of REFLECTION_MARKERS) {
    if (lowerText.includes(marker)) reflectionCount++
  }

  // Normalize boundary awareness to 0-1
  const boundaryAwareness = Math.min(1, boundaryCount / 3)

  return { boundaryAwareness, monitoringCount, reflectionCount }
}

// ============================================================================
// Reasoning Style Classification (Johnson-Laird, 1999)
// ============================================================================

const DEDUCTIVE_MARKERS = [
  'because of the rule', 'according to', 'by definition',
  'therefore', 'thus', 'hence', 'it follows that',
  'if...then', 'since', 'given that', 'as a result of'
]

const INDUCTIVE_MARKERS = [
  'for example', 'like', 'such as', 'in this case',
  "i've seen", 'based on', 'from what i know',
  'generally', 'usually', 'often', 'in my experience'
]

const CAUSAL_MARKERS = [
  'because', 'causes', 'leads to', 'results in',
  'due to', 'as a result', 'consequently', 'so that',
  'in order to', 'the reason is', 'this happens when'
]

export function classifyReasoningStyle(text: string): {
  style: 'deductive' | 'inductive' | 'mixed'
  logicalChainLength: number
  causalReasoningPresent: boolean
} {
  const lowerText = text.toLowerCase()

  let deductiveCount = 0
  let inductiveCount = 0

  for (const marker of DEDUCTIVE_MARKERS) {
    if (lowerText.includes(marker)) deductiveCount++
  }

  for (const marker of INDUCTIVE_MARKERS) {
    if (lowerText.includes(marker)) inductiveCount++
  }

  // Determine style
  let style: 'deductive' | 'inductive' | 'mixed' = 'mixed'
  if (deductiveCount > inductiveCount * 1.5) {
    style = 'deductive'
  } else if (inductiveCount > deductiveCount * 1.5) {
    style = 'inductive'
  }

  // Count logical chain markers
  const chainMarkers = ['therefore', 'so', 'which means', 'thus', 'hence', 'consequently']
  let logicalChainLength = 0
  for (const marker of chainMarkers) {
    const regex = new RegExp(marker, 'gi')
    const matches = lowerText.match(regex)
    if (matches) logicalChainLength += matches.length
  }

  // Check for causal reasoning
  let causalReasoningPresent = false
  for (const marker of CAUSAL_MARKERS) {
    if (lowerText.includes(marker)) {
      causalReasoningPresent = true
      break
    }
  }

  return { style, logicalChainLength, causalReasoningPresent }
}

// ============================================================================
// Abstraction Level Measurement (Bruner, 1966 - CRA)
// ============================================================================

export function measureAbstractionLevel(text: string): {
  level: number // 0-1 (concrete to abstract)
  preference: 'concrete' | 'abstract' | 'balanced'
} {
  const lowerText = text.toLowerCase()
  const words = text.split(/\s+/)

  // Concrete indicators: specific examples, numbers, named entities
  const concreteIndicators = [
    'for example', 'specifically', 'in this case', 'like when',
    'such as', 'imagine', 'picture', 'think of'
  ]

  // Abstract indicators: generalizations, principles, theories
  const abstractIndicators = [
    'in general', 'always', 'the principle', 'the concept',
    'theoretically', 'fundamentally', 'essentially', 'in essence',
    'the underlying', 'at its core', 'broadly speaking'
  ]

  let concreteCount = 0
  let abstractCount = 0

  for (const indicator of concreteIndicators) {
    if (lowerText.includes(indicator)) concreteCount++
  }

  for (const indicator of abstractIndicators) {
    if (lowerText.includes(indicator)) abstractCount++
  }

  // Also check for numbers (concrete) vs abstract nouns
  const numberPattern = /\d+/g
  const numbers = text.match(numberPattern)
  if (numbers) concreteCount += numbers.length

  const total = concreteCount + abstractCount
  let level = 0.5 // default balanced
  let preference: 'concrete' | 'abstract' | 'balanced' = 'balanced'

  if (total > 0) {
    level = abstractCount / total
    if (level > 0.65) preference = 'abstract'
    else if (level < 0.35) preference = 'concrete'
  }

  return { level, preference }
}

// ============================================================================
// Engagement & Curiosity Detection (Litman, 2008; Csikszentmihalyi, 1990)
// ============================================================================

const CURIOSITY_MARKERS = [
  'what about', 'i wonder', 'can you tell me more',
  "that's interesting", 'why does', 'how does',
  "i'd like to know", 'what if', 'could you explain',
  "i'm curious", 'is there more', 'tell me more'
]

const FRUSTRATION_MARKERS = [
  "this is confusing", 'i give up', "this doesn't work",
  "i don't get it", "this makes no sense", "i'm lost",
  "this is too hard", "i can't do this", "i'm frustrated",
  "this is impossible", 'whatever', 'never mind'
]

const MASTERY_ORIENTATION_MARKERS = [
  'i want to understand', 'i want to learn', 'help me see',
  "i'd like to figure out", 'let me try', 'can i explore',
  "i'm interested in understanding", 'how can i improve'
]

const PERFORMANCE_ORIENTATION_MARKERS = [
  'i need to get this right', 'just tell me the answer',
  "what's the correct answer", 'is this right?',
  'did i pass?', 'what grade', 'how many did i get'
]

export function detectEngagement(text: string, latencyMs: number): {
  level: 'high' | 'medium' | 'low'
  curiositySignals: string[]
  frustrationSignals: string[]
  masteryOrientation: boolean
} {
  const lowerText = text.toLowerCase()
  const wordCount = text.split(/\s+/).length
  const curiositySignals: string[] = []
  const frustrationSignals: string[] = []

  for (const marker of CURIOSITY_MARKERS) {
    if (lowerText.includes(marker)) curiositySignals.push(marker)
  }

  for (const marker of FRUSTRATION_MARKERS) {
    if (lowerText.includes(marker)) frustrationSignals.push(marker)
  }

  // Check goal orientation
  let masteryCount = 0
  let performanceCount = 0

  for (const marker of MASTERY_ORIENTATION_MARKERS) {
    if (lowerText.includes(marker)) masteryCount++
  }

  for (const marker of PERFORMANCE_ORIENTATION_MARKERS) {
    if (lowerText.includes(marker)) performanceCount++
  }

  const masteryOrientation = masteryCount > performanceCount

  // Determine engagement level
  let level: 'high' | 'medium' | 'low' = 'medium'

  // High engagement: longer responses, curiosity, moderate latency (thinking)
  if (wordCount > 30 && curiositySignals.length > 0 && frustrationSignals.length === 0) {
    level = 'high'
  }
  // Low engagement: short responses, frustration, or very fast (dismissive) responses
  else if (
    wordCount < 10 ||
    frustrationSignals.length > 0 ||
    (latencyMs < 2000 && wordCount < 15)
  ) {
    level = 'low'
  }

  return { level, curiositySignals, frustrationSignals, masteryOrientation }
}

// ============================================================================
// Communication Quality (Grice, 1975; Hunt, 1965)
// ============================================================================

export function analyzeCommmunication(text: string, tutorQuestion: string): {
  responsiveness: number
  topicCoherence: number
  vocabularySophistication: number
  grammaticalComplexity: number
} {
  const words = text.split(/\s+/)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim())

  // Responsiveness: Does the response address the question?
  // Simple heuristic: check for question words being addressed
  const questionWords = tutorQuestion.toLowerCase().match(/\b(what|why|how|when|where|which)\b/g)
  let responsiveness = 0.5 // default
  if (questionWords && questionWords.length > 0) {
    // Check if response contains relevant content words from question
    const questionContentWords = tutorQuestion
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
    const responseContentWords = text.toLowerCase().split(/\s+/)
    const overlap = questionContentWords.filter((w) => responseContentWords.includes(w))
    responsiveness = Math.min(1, overlap.length / Math.max(1, questionContentWords.length) + 0.3)
  }

  // Topic coherence: are they staying on topic?
  // Simple heuristic based on tangent indicators
  const tangentIndicators = [
    'by the way',
    'off topic',
    'unrelated',
    'anyway',
    'speaking of which',
  ]
  let topicCoherence = 1
  for (const indicator of tangentIndicators) {
    if (text.toLowerCase().includes(indicator)) {
      topicCoherence -= 0.2
    }
  }
  topicCoherence = Math.max(0, topicCoherence)

  // Vocabulary sophistication: average word length and uncommon words
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length
  const vocabularySophistication = Math.min(1, (avgWordLength - 3) / 5)

  // Grammatical complexity: clauses per sentence
  const avgSentenceLength = words.length / Math.max(1, sentences.length)
  const grammaticalComplexity = Math.min(1, avgSentenceLength / 25)

  return {
    responsiveness,
    topicCoherence,
    vocabularySophistication: Math.max(0, vocabularySophistication),
    grammaticalComplexity,
  }
}

// ============================================================================
// Explanation Quality Assessment (Bloom's Taxonomy, Chi et al., 2001)
// ============================================================================

export function assessExplanationQuality(
  text: string,
  targetConcept: string
): number {
  const lowerText = text.toLowerCase()
  const lowerConcept = targetConcept.toLowerCase()
  let score = 0

  // Check if concept is mentioned
  if (lowerText.includes(lowerConcept)) {
    score += 0.1
  }

  // Check for explanation structure
  const explanationIndicators = [
    'because', 'this means', 'in other words', 'the reason',
    'this happens when', 'it works by', 'the way this works'
  ]
  for (const indicator of explanationIndicators) {
    if (lowerText.includes(indicator)) {
      score += 0.1
    }
  }

  // Check for examples
  if (lowerText.includes('for example') || lowerText.includes('like when') || lowerText.includes('such as')) {
    score += 0.15
  }

  // Check for connections to other concepts
  if (lowerText.includes('similar to') || lowerText.includes('related to') || lowerText.includes('connects to')) {
    score += 0.15
  }

  // Check for elaboration (longer = more elaborated, with diminishing returns)
  const wordCount = text.split(/\s+/).length
  score += Math.min(0.3, wordCount / 100)

  // Check for cause-effect reasoning
  const causalMarkers = ['causes', 'leads to', 'results in', 'therefore', 'consequently']
  for (const marker of causalMarkers) {
    if (lowerText.includes(marker)) {
      score += 0.05
    }
  }

  return Math.min(1, score)
}

// ============================================================================
// Misconception Detection
// ============================================================================

export function detectMisconceptions(
  text: string,
  knownMisconceptions: string[]
): string[] {
  const lowerText = text.toLowerCase()
  const detected: string[] = []

  for (const misconception of knownMisconceptions) {
    // Check for key phrases from the misconception
    const keywords = misconception.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    const matchCount = keywords.filter((kw) => lowerText.includes(kw)).length
    if (matchCount >= Math.min(2, keywords.length)) {
      detected.push(misconception)
    }
  }

  return detected
}

// ============================================================================
// Insight/Discovery Detection
// ============================================================================

const INSIGHT_MARKERS = [
  'oh!', 'aha', 'i see', 'i get it', 'that makes sense',
  'now i understand', "so that's why", "i didn't realize",
  'wait, so', 'oh, because', 'that means', 'i think i see',
  'now it clicks', "that's it!", 'eureka'
]

export function detectInsights(text: string): string[] {
  const lowerText = text.toLowerCase()
  const insights: string[] = []

  for (const marker of INSIGHT_MARKERS) {
    if (lowerText.includes(marker)) {
      // Extract the sentence containing the insight
      const sentences = text.split(/[.!?]+/)
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(marker) && sentence.trim().length > 10) {
          insights.push(sentence.trim())
        }
      }
    }
  }

  return insights
}

// ============================================================================
// Main Extraction Function
// ============================================================================

export function extractFromResponse(
  response: string,
  latencyMs: number,
  context: DialogueContext
): ExtractionResult {
  const wordCount = response.split(/\s+/).length

  // Extract all indicators
  const hedging = detectHedgingLanguage(response)
  const certainty = detectCertaintyMarkers(response)
  const selfCorrections = detectSelfCorrections(response)
  const metacog = detectMetacognition(response)
  const reasoning = classifyReasoningStyle(response)
  const abstraction = measureAbstractionLevel(response)
  const engagement = detectEngagement(response, latencyMs)
  const communication = analyzeCommmunication(
    response,
    context.previousExchanges[context.previousExchanges.length - 1]?.tutorQuestion || ''
  )
  const explanationQuality = assessExplanationQuality(response, context.targetConcept)
  const misconceptions = detectMisconceptions(response, context.knownMisconceptions)
  const insights = detectInsights(response)

  // Determine if overconfident/underconfident
  // Overconfident: high certainty + misconceptions detected
  const isOverconfident = certainty.rate > 0.5 && misconceptions.length > 0
  // Underconfident: high hedging + actually good explanation
  const isUnderconfident = hedging.rate > 0.4 && explanationQuality > 0.6

  // Determine question quality
  let questionQuality: 'surface' | 'deep' | 'metacognitive' = 'surface'
  if (metacog.reflectionCount > 0 || metacog.monitoringCount > 0) {
    questionQuality = 'metacognitive'
  } else if (reasoning.logicalChainLength > 1 || reasoning.causalReasoningPresent) {
    questionQuality = 'deep'
  }

  // Determine overall understanding level
  let understandingLevel: 'none' | 'surface' | 'partial' | 'deep' | 'transfer' = 'partial'
  if (wordCount < 10 || engagement.level === 'low') {
    understandingLevel = 'none'
  } else if (explanationQuality < 0.3) {
    understandingLevel = 'surface'
  } else if (explanationQuality < 0.5) {
    understandingLevel = 'partial'
  } else if (explanationQuality < 0.75 || insights.length === 0) {
    understandingLevel = 'deep'
  } else {
    understandingLevel = 'transfer'
  }

  // Check for discovery moment
  const isDiscoveryMoment = insights.length > 0 || selfCorrections.count > 0

  // Recommend next question type based on current state
  let recommendedNextQuestionType: QuestionType = 'scaffolding'
  if (isDiscoveryMoment) {
    recommendedNextQuestionType = 'reflection'
  } else if (misconceptions.length > 0) {
    recommendedNextQuestionType = 'challenging'
  } else if (understandingLevel === 'deep' || understandingLevel === 'transfer') {
    recommendedNextQuestionType = 'metacognitive'
  } else if (understandingLevel === 'none' || understandingLevel === 'surface') {
    recommendedNextQuestionType = 'clarifying'
  } else if (hedging.rate > 0.3) {
    recommendedNextQuestionType = 'probing'
  }

  return {
    understanding: {
      explanationQuality,
      analogyAptness: abstraction.level > 0.3 && abstraction.level < 0.7 ? 0.7 : 0.4,
      elaborationDepth: Math.min(1, wordCount / 80),
      abstractionLevel: abstraction.level,
      proceduralConceptualRatio: reasoning.style === 'deductive' ? 0.7 : 0.4,
      conceptualConnections: reasoning.logicalChainLength,
    },
    confidence: {
      hedgingRate: hedging.rate,
      certaintyRate: certainty.rate,
      hedgingMarkers: hedging.markers,
      certaintyMarkers: certainty.markers,
      isOverconfident,
      isUnderconfident,
    },
    metacognition: {
      selfCorrectionCount: selfCorrections.count,
      selfCorrections: selfCorrections.corrections,
      boundaryAwareness: metacog.boundaryAwareness,
      questionQuality,
      reflectionCount: metacog.reflectionCount,
      monitoringCount: metacog.monitoringCount,
      strategyVerbalization: response.toLowerCase().includes('my approach') ||
        response.toLowerCase().includes('first i') ||
        response.toLowerCase().includes("i'm thinking"),
    },
    reasoning: {
      reasoningStyle: reasoning.style,
      abstractionPreference: abstraction.preference,
      processingStyle: reasoning.logicalChainLength > 2 ? 'sequential' : 'holistic',
      logicalChainLength: reasoning.logicalChainLength,
      causalReasoningPresent: reasoning.causalReasoningPresent,
      divergentThinkingCount: (response.match(/or maybe|alternatively|another way/gi) || []).length,
    },
    engagement: {
      responseLatencyMs: latencyMs,
      wordCount,
      engagementLevel: engagement.level,
      curiositySignals: engagement.curiositySignals,
      frustrationSignals: engagement.frustrationSignals,
      persistenceIndicator: selfCorrections.count > 0 || response.toLowerCase().includes('let me try'),
      masteryOrientation: engagement.masteryOrientation,
    },
    communication: {
      turnLength: wordCount,
      responsiveness: communication.responsiveness,
      topicCoherence: communication.topicCoherence,
      vocabularySophistication: communication.vocabularySophistication,
      grammaticalComplexity: communication.grammaticalComplexity,
    },
    misconceptions,
    insightsDetected: insights,
    overallAssessment: {
      understandingLevel,
      isDiscoveryMoment,
      recommendedNextQuestionType,
    },
  }
}

// ============================================================================
// Aggregation for Profile Updates
// ============================================================================

export interface AggregatedPsychometrics {
  // Averages from session
  avgExplanationQuality: number
  avgHedgingRate: number
  avgCertaintyRate: number
  avgElaborationDepth: number
  avgResponseLatencyMs: number

  // Counts
  totalSelfCorrections: number
  totalInsights: number
  totalMisconceptionsDetected: number

  // Derived indicators
  calibrationAccuracy: number // Correlation between confidence and correctness
  dominantReasoningStyle: 'deductive' | 'inductive' | 'mixed'
  dominantProcessingStyle: 'sequential' | 'holistic' | 'flexible'
  overallEngagement: 'high' | 'medium' | 'low'
  masteryVsPerformance: 'mastery' | 'performance' | 'balanced'
}

export function aggregatePsychometrics(
  extractions: ExtractionResult[],
  correctnessRecord: boolean[] // For each exchange, was the response ultimately correct?
): AggregatedPsychometrics {
  if (extractions.length === 0) {
    return {
      avgExplanationQuality: 0.5,
      avgHedgingRate: 0.3,
      avgCertaintyRate: 0.3,
      avgElaborationDepth: 0.5,
      avgResponseLatencyMs: 30000,
      totalSelfCorrections: 0,
      totalInsights: 0,
      totalMisconceptionsDetected: 0,
      calibrationAccuracy: 0.5,
      dominantReasoningStyle: 'mixed',
      dominantProcessingStyle: 'flexible',
      overallEngagement: 'medium',
      masteryVsPerformance: 'balanced',
    }
  }

  // Calculate averages
  const avgExplanationQuality =
    extractions.reduce((sum, e) => sum + e.understanding.explanationQuality, 0) / extractions.length
  const avgHedgingRate =
    extractions.reduce((sum, e) => sum + e.confidence.hedgingRate, 0) / extractions.length
  const avgCertaintyRate =
    extractions.reduce((sum, e) => sum + e.confidence.certaintyRate, 0) / extractions.length
  const avgElaborationDepth =
    extractions.reduce((sum, e) => sum + e.understanding.elaborationDepth, 0) / extractions.length
  const avgResponseLatencyMs =
    extractions.reduce((sum, e) => sum + e.engagement.responseLatencyMs, 0) / extractions.length

  // Calculate totals
  const totalSelfCorrections = extractions.reduce(
    (sum, e) => sum + e.metacognition.selfCorrectionCount,
    0
  )
  const totalInsights = extractions.reduce((sum, e) => sum + e.insightsDetected.length, 0)
  const totalMisconceptionsDetected = extractions.reduce(
    (sum, e) => sum + e.misconceptions.length,
    0
  )

  // Calculate calibration accuracy
  // High certainty + correct = good calibration
  // High certainty + incorrect = overconfidence
  // High hedging + correct = underconfidence
  let calibrationScore = 0
  for (let i = 0; i < extractions.length && i < correctnessRecord.length; i++) {
    const e = extractions[i]
    const correct = correctnessRecord[i]
    const confident = e.confidence.certaintyRate > e.confidence.hedgingRate

    if ((confident && correct) || (!confident && !correct)) {
      calibrationScore += 1
    }
  }
  const calibrationAccuracy = calibrationScore / Math.max(1, Math.min(extractions.length, correctnessRecord.length))

  // Determine dominant reasoning style
  const reasoningCounts = { deductive: 0, inductive: 0, mixed: 0 }
  for (const e of extractions) {
    reasoningCounts[e.reasoning.reasoningStyle]++
  }
  const dominantReasoningStyle = (
    Object.entries(reasoningCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as 'deductive' | 'inductive' | 'mixed'

  // Determine dominant processing style
  const processingCounts = { sequential: 0, holistic: 0, flexible: 0 }
  for (const e of extractions) {
    processingCounts[e.reasoning.processingStyle]++
  }
  const dominantProcessingStyle = (
    Object.entries(processingCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as 'sequential' | 'holistic' | 'flexible'

  // Determine overall engagement
  const engagementCounts = { high: 0, medium: 0, low: 0 }
  for (const e of extractions) {
    engagementCounts[e.engagement.engagementLevel]++
  }
  const overallEngagement = (
    Object.entries(engagementCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as 'high' | 'medium' | 'low'

  // Determine mastery vs performance orientation
  let masteryCount = 0
  let performanceCount = 0
  for (const e of extractions) {
    if (e.engagement.masteryOrientation) masteryCount++
    else performanceCount++
  }
  const masteryVsPerformance =
    masteryCount > performanceCount * 1.5
      ? 'mastery'
      : performanceCount > masteryCount * 1.5
        ? 'performance'
        : 'balanced'

  return {
    avgExplanationQuality,
    avgHedgingRate,
    avgCertaintyRate,
    avgElaborationDepth,
    avgResponseLatencyMs,
    totalSelfCorrections,
    totalInsights,
    totalMisconceptionsDetected,
    calibrationAccuracy,
    dominantReasoningStyle,
    dominantProcessingStyle,
    overallEngagement,
    masteryVsPerformance,
  }
}
