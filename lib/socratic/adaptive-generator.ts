/**
 * Adaptive Response Generator for Socratic Mode
 *
 * Adapts Socratic tutor responses based on learner profile and real-time
 * psychometric extraction. Implements 5 adaptation dimensions:
 * 1. Question Complexity
 * 2. Scaffolding Level
 * 3. Confidence Calibration
 * 4. Metacognitive Prompting
 * 5. Engagement Maintenance
 *
 * Based on educational psychology research:
 * - Zone of Proximal Development (Vygotsky, 1978)
 * - Scaffolding (Wood, Bruner & Ross, 1976)
 * - Achievement Goal Theory (Dweck, 1986)
 * - Self-Regulated Learning (Zimmerman, 2002)
 */

import type { InverseProfile } from '@/lib/types/interactions'
import type { QuestionType, DialogueState } from '@/lib/tutoring/socratic-tutor'
import type { ExtractionResult } from './psychometric-extractor'

// ============================================================================
// Types
// ============================================================================

export interface SocraticProfile {
  conversational_indicators: {
    // Understanding Depth
    explanationQuality: number
    analogyAptness: number
    elaborationDepth: number
    abstractionLevel: number
    proceduralConceptualRatio: number

    // Confidence/Calibration
    hedgingRate: number
    certaintyRate: number
    calibrationAccuracy: number
    confidenceTrajectory: 'stable' | 'increasing' | 'decreasing'

    // Metacognition
    selfCorrectionRate: number
    boundaryAwareness: number
    questionQuality: 'surface' | 'deep' | 'metacognitive'
    reflectionFrequency: number
    monitoringFrequency: number

    // Reasoning Style
    reasoningStyle: 'deductive' | 'inductive' | 'mixed'
    abstractionPreference: 'concrete' | 'abstract' | 'balanced'
    processingStyle: 'sequential' | 'holistic' | 'flexible'
    averageLogicalChainLength: number

    // Engagement
    averageResponseLatencyMs: number
    engagementTrend: 'increasing' | 'stable' | 'decreasing'
    curiosityScore: number
    frustrationThreshold: number
    persistenceAfterError: number
  }

  conversational_confidence: {
    understanding: number
    calibration: number
    metacognition: number
    reasoning: number
    engagement: number
    communication: number
  }

  last_dialogue_summary: {
    skillId: string
    exchangeCount: number
    discoveryMade: boolean
    understandingProgression: number[]
    keyInsights: string[]
    misconceptionsIdentified: string[]
    timestamp: string
  } | null
}

export interface SessionState {
  exchangeCount: number
  consecutiveFailures: number
  consecutiveSuccesses: number
  currentEngagementLevel: 'high' | 'medium' | 'low'
  timeInSessionMs: number
  lastLatencyMs: number
  lastExtractionResult: ExtractionResult | null
}

export interface QuestionConfig {
  abstractionLevel: 'concrete' | 'abstract' | 'balanced'
  maxReasoningSteps: number
  preferredStyle: 'concrete' | 'abstract' | 'balanced'
  includeHints: boolean
  includeExamples: boolean
}

export interface ScaffoldingConfig {
  level: 1 | 2 | 3 | 4 // 1 = full, 4 = minimal
  proactiveHints: boolean
  workedExamples: boolean
  breakdownComplex: boolean
}

export interface CalibrationConfig {
  questionStyle: 'challenging' | 'supportive' | 'neutral'
  includeCounterexamples: boolean
  askForVerification: boolean
  highlightCorrectReasoning: boolean
  celebrateInsights: boolean
  promptText?: string
}

export interface MetacognitiveConfig {
  prompts: string[]
  frequency: number // How often to inject metacognitive prompts (0-1)
  focusArea: 'monitoring' | 'reflection' | 'strategy' | 'all'
}

export interface EngagementConfig {
  simplifyQuestions: boolean
  offerBreak: boolean
  switchTopic: boolean
  encouragementLevel: 'high' | 'medium' | 'low'
  offerExtensions: boolean
  crossDomainConnections: boolean
  challengingQuestions: boolean
  novelApproach: boolean
  connectToInterests: boolean
  shorterExchanges: boolean
}

export interface AdaptiveConfig {
  questionComplexity: QuestionConfig
  scaffolding: ScaffoldingConfig
  calibration: CalibrationConfig
  metacognitive: MetacognitiveConfig
  engagement: EngagementConfig
}

// ============================================================================
// Default Socratic Profile
// ============================================================================

export function createDefaultSocraticProfile(): SocraticProfile {
  return {
    conversational_indicators: {
      explanationQuality: 0.5,
      analogyAptness: 0.5,
      elaborationDepth: 0.5,
      abstractionLevel: 0.5,
      proceduralConceptualRatio: 0.5,
      hedgingRate: 0.3,
      certaintyRate: 0.3,
      calibrationAccuracy: 0.5,
      confidenceTrajectory: 'stable',
      selfCorrectionRate: 0.1,
      boundaryAwareness: 0.5,
      questionQuality: 'surface',
      reflectionFrequency: 0.2,
      monitoringFrequency: 0.2,
      reasoningStyle: 'mixed',
      abstractionPreference: 'balanced',
      processingStyle: 'flexible',
      averageLogicalChainLength: 1,
      averageResponseLatencyMs: 30000,
      engagementTrend: 'stable',
      curiosityScore: 0.5,
      frustrationThreshold: 5,
      persistenceAfterError: 0.5,
    },
    conversational_confidence: {
      understanding: 0.3,
      calibration: 0.3,
      metacognition: 0.3,
      reasoning: 0.3,
      engagement: 0.3,
      communication: 0.3,
    },
    last_dialogue_summary: null,
  }
}

// ============================================================================
// Adaptation Functions
// ============================================================================

/**
 * Adapt question complexity based on learner profile
 */
export function adaptQuestionComplexity(
  inverseProfile: InverseProfile | null,
  socraticProfile: SocraticProfile
): QuestionConfig {
  const expertise = inverseProfile?.cognitive_indicators?.expertiseLevel || 'beginner'
  const workingMemory = inverseProfile?.cognitive_indicators?.workingMemoryIndicator || 'medium'
  const abstractionPref = socraticProfile.conversational_indicators.abstractionPreference
  const explanationQuality = socraticProfile.conversational_indicators.explanationQuality

  // Determine abstraction level
  let abstractionLevel: 'concrete' | 'abstract' | 'balanced' = 'balanced'
  if (expertise === 'novice' || expertise === 'beginner') {
    abstractionLevel = 'concrete'
  } else if (expertise === 'advanced' || expertise === 'expert') {
    abstractionLevel = 'abstract'
  }

  // Determine max reasoning steps based on working memory
  let maxReasoningSteps = 3
  if (workingMemory === 'low') {
    maxReasoningSteps = 2
  } else if (workingMemory === 'high') {
    maxReasoningSteps = 5
  }

  // Include hints if explanation quality is low
  const includeHints = explanationQuality < 0.5

  // Include examples for concrete thinkers or novices
  const includeExamples = abstractionPref === 'concrete' || expertise === 'novice'

  return {
    abstractionLevel,
    maxReasoningSteps,
    preferredStyle: abstractionPref,
    includeHints,
    includeExamples,
  }
}

/**
 * Adapt scaffolding level
 */
export function adaptScaffolding(
  inverseProfile: InverseProfile | null,
  socraticProfile: SocraticProfile
): ScaffoldingConfig {
  const helpPattern = inverseProfile?.metacognitive_indicators?.helpSeekingPattern || 'unknown'
  const explanationQuality = socraticProfile.conversational_indicators.explanationQuality
  const selfCorrection = socraticProfile.conversational_indicators.selfCorrectionRate

  // Avoidant help-seekers need more proactive scaffolding
  if (helpPattern === 'avoidant' && explanationQuality < 0.4) {
    return {
      level: 1,
      proactiveHints: true,
      workedExamples: true,
      breakdownComplex: true,
    }
  }

  // Good self-correctors can work more independently
  if (selfCorrection > 0.3 && explanationQuality > 0.6) {
    return {
      level: 4,
      proactiveHints: false,
      workedExamples: false,
      breakdownComplex: false,
    }
  }

  // Excessive help-seekers need gradual release
  if (helpPattern === 'excessive') {
    return {
      level: 3,
      proactiveHints: false,
      workedExamples: true,
      breakdownComplex: true,
    }
  }

  // Default moderate scaffolding
  return {
    level: 2,
    proactiveHints: false,
    workedExamples: true,
    breakdownComplex: explanationQuality < 0.5,
  }
}

/**
 * Adapt for confidence calibration
 */
export function adaptForCalibration(
  inverseProfile: InverseProfile | null,
  socraticProfile: SocraticProfile
): CalibrationConfig {
  const overconfidence = inverseProfile?.metacognitive_indicators?.overconfidenceRate || 0
  const underconfidence = inverseProfile?.metacognitive_indicators?.underconfidenceRate || 0
  const hedging = socraticProfile.conversational_indicators.hedgingRate
  const certainty = socraticProfile.conversational_indicators.certaintyRate

  if (overconfidence > 0.4 || certainty > 0.7) {
    return {
      questionStyle: 'challenging',
      includeCounterexamples: true,
      askForVerification: true,
      highlightCorrectReasoning: false,
      celebrateInsights: false,
      promptText: 'Are you certain? Can you verify that?',
    }
  }

  if (underconfidence > 0.4 || hedging > 0.6) {
    return {
      questionStyle: 'supportive',
      includeCounterexamples: false,
      askForVerification: false,
      highlightCorrectReasoning: true,
      celebrateInsights: true,
      promptText: "That's a good insight! Can you build on that?",
    }
  }

  return {
    questionStyle: 'neutral',
    includeCounterexamples: false,
    askForVerification: false,
    highlightCorrectReasoning: true,
    celebrateInsights: true,
  }
}

/**
 * Adapt metacognitive prompting
 */
export function adaptMetacognitivePrompts(
  socraticProfile: SocraticProfile
): MetacognitiveConfig {
  const boundaryAwareness = socraticProfile.conversational_indicators.boundaryAwareness
  const reflectionFreq = socraticProfile.conversational_indicators.reflectionFrequency
  const monitoringFreq = socraticProfile.conversational_indicators.monitoringFrequency

  const prompts: string[] = []
  let focusArea: 'monitoring' | 'reflection' | 'strategy' | 'all' = 'all'

  // Low boundary awareness = help them recognize limits
  if (boundaryAwareness < 0.3) {
    prompts.push('What parts of this are you most/least sure about?')
    prompts.push("What aspects of this topic feel unclear to you?")
    focusArea = 'monitoring'
  }

  // Low reflection = prompt for it
  if (reflectionFreq < 0.2) {
    prompts.push('What made you change your thinking?')
    prompts.push('How does this connect to what you knew before?')
    prompts.push('What was the key insight that helped you here?')
    focusArea = focusArea === 'monitoring' ? 'all' : 'reflection'
  }

  // Low monitoring = prompt self-checking
  if (monitoringFreq < 0.2) {
    prompts.push('Does your explanation make sense to you?')
    prompts.push('Can you check if that follows from what you said earlier?')
    prompts.push('How confident are you in this reasoning?')
    if (focusArea !== 'all') focusArea = 'monitoring'
  }

  // Calculate frequency based on how much prompting is needed
  const needsLevel = (boundaryAwareness < 0.3 ? 1 : 0) +
    (reflectionFreq < 0.2 ? 1 : 0) +
    (monitoringFreq < 0.2 ? 1 : 0)
  const frequency = Math.min(0.5, needsLevel * 0.15 + 0.1)

  return { prompts, frequency, focusArea }
}

/**
 * Adapt for engagement maintenance
 */
export function adaptForEngagement(
  socraticProfile: SocraticProfile,
  sessionState: SessionState
): EngagementConfig {
  const frustrationThreshold = socraticProfile.conversational_indicators.frustrationThreshold
  const curiosityScore = socraticProfile.conversational_indicators.curiosityScore
  const engagementTrend = socraticProfile.conversational_indicators.engagementTrend
  const currentExchanges = sessionState.exchangeCount

  // Approaching frustration threshold
  if (currentExchanges >= frustrationThreshold * 0.8) {
    return {
      simplifyQuestions: true,
      offerBreak: true,
      switchTopic: sessionState.consecutiveFailures >= 2,
      encouragementLevel: 'high',
      offerExtensions: false,
      crossDomainConnections: false,
      challengingQuestions: false,
      novelApproach: true,
      connectToInterests: true,
      shorterExchanges: true,
    }
  }

  // High curiosity = can go deeper
  if (curiosityScore > 0.7) {
    return {
      simplifyQuestions: false,
      offerBreak: false,
      switchTopic: false,
      encouragementLevel: 'medium',
      offerExtensions: true,
      crossDomainConnections: true,
      challengingQuestions: true,
      novelApproach: false,
      connectToInterests: false,
      shorterExchanges: false,
    }
  }

  // Declining engagement = re-engage
  if (engagementTrend === 'decreasing' || sessionState.currentEngagementLevel === 'low') {
    return {
      simplifyQuestions: true,
      offerBreak: sessionState.timeInSessionMs > 30 * 60 * 1000, // 30 mins
      switchTopic: false,
      encouragementLevel: 'high',
      offerExtensions: false,
      crossDomainConnections: false,
      challengingQuestions: false,
      novelApproach: true,
      connectToInterests: true,
      shorterExchanges: true,
    }
  }

  // Default balanced engagement
  return {
    simplifyQuestions: false,
    offerBreak: false,
    switchTopic: false,
    encouragementLevel: 'medium',
    offerExtensions: curiosityScore > 0.5,
    crossDomainConnections: curiosityScore > 0.5,
    challengingQuestions: sessionState.consecutiveSuccesses >= 2,
    novelApproach: false,
    connectToInterests: false,
    shorterExchanges: false,
  }
}

// ============================================================================
// Main Adaptive Config Builder
// ============================================================================

export function buildAdaptiveConfig(
  inverseProfile: InverseProfile | null,
  socraticProfile: SocraticProfile,
  sessionState: SessionState
): AdaptiveConfig {
  return {
    questionComplexity: adaptQuestionComplexity(inverseProfile, socraticProfile),
    scaffolding: adaptScaffolding(inverseProfile, socraticProfile),
    calibration: adaptForCalibration(inverseProfile, socraticProfile),
    metacognitive: adaptMetacognitivePrompts(socraticProfile),
    engagement: adaptForEngagement(socraticProfile, sessionState),
  }
}

// ============================================================================
// Question Type Selection
// ============================================================================

export function selectQuestionType(
  socraticProfile: SocraticProfile,
  dialogueState: DialogueState,
  lastExtraction: ExtractionResult | null
): QuestionType {
  // Use the extraction's recommendation if available
  if (lastExtraction?.overallAssessment.recommendedNextQuestionType) {
    return lastExtraction.overallAssessment.recommendedNextQuestionType
  }

  // If discovery was made, go to reflection
  if (dialogueState.discoveryMade) {
    return 'reflection'
  }

  // Follow the planned dialogue path
  const nextFromPath = dialogueState.dialoguePath[dialogueState.currentPathIndex]
  if (nextFromPath) {
    return nextFromPath
  }

  // Default based on understanding level
  switch (dialogueState.currentUnderstanding) {
    case 'none':
      return 'clarifying'
    case 'partial':
      return 'scaffolding'
    case 'correct':
      return 'probing'
    case 'misconception':
      return 'challenging'
    case 'advanced':
      return 'metacognitive'
    default:
      return 'clarifying'
  }
}

// ============================================================================
// Adaptive System Prompt Generation
// ============================================================================

export function generateAdaptiveSystemPrompt(
  config: AdaptiveConfig,
  skillName: string,
  targetConcept: string,
  knownMisconceptions: string[]
): string {
  const parts: string[] = []

  // Base Socratic instruction
  parts.push(`You are a Socratic tutor helping a student understand ${skillName}.

CRITICAL RULE: NEVER give direct answers or solutions. Instead:
1. Ask questions to understand their thinking
2. Guide through reasoning with prompts
3. Help them discover insights themselves
4. Celebrate self-discovery moments

Target concept: ${targetConcept}`)

  // Question complexity adaptation
  parts.push(`\n## Question Complexity Adaptation`)
  parts.push(`- Use ${config.questionComplexity.abstractionLevel} language and examples`)
  parts.push(`- Limit reasoning chains to ${config.questionComplexity.maxReasoningSteps} steps`)
  if (config.questionComplexity.includeHints) {
    parts.push(`- Include helpful hints in your questions`)
  }
  if (config.questionComplexity.includeExamples) {
    parts.push(`- Use concrete examples to illustrate points`)
  }

  // Scaffolding adaptation
  parts.push(`\n## Scaffolding Level: ${config.scaffolding.level}/4`)
  if (config.scaffolding.level <= 2) {
    parts.push(`- Provide step-by-step guidance`)
    parts.push(`- Break complex ideas into smaller pieces`)
  }
  if (config.scaffolding.proactiveHints) {
    parts.push(`- Offer hints proactively without waiting to be asked`)
  }
  if (config.scaffolding.workedExamples) {
    parts.push(`- Use worked examples when introducing concepts`)
  }

  // Calibration adaptation
  parts.push(`\n## Confidence Calibration`)
  if (config.calibration.questionStyle === 'challenging') {
    parts.push(`- The learner may be overconfident - gently challenge assumptions`)
    parts.push(`- Ask "Are you sure?" type questions`)
    parts.push(`- Present counterexamples when appropriate`)
  } else if (config.calibration.questionStyle === 'supportive') {
    parts.push(`- The learner may lack confidence - be encouraging`)
    parts.push(`- Highlight when their reasoning is correct`)
    parts.push(`- Celebrate insights and progress`)
  }

  // Metacognitive prompting
  if (config.metacognitive.prompts.length > 0) {
    parts.push(`\n## Metacognitive Prompts (use occasionally)`)
    for (const prompt of config.metacognitive.prompts) {
      parts.push(`- "${prompt}"`)
    }
  }

  // Engagement adaptation
  parts.push(`\n## Engagement Adaptation`)
  if (config.engagement.encouragementLevel === 'high') {
    parts.push(`- Provide extra encouragement and positive reinforcement`)
  }
  if (config.engagement.simplifyQuestions) {
    parts.push(`- Keep questions simple and focused`)
  }
  if (config.engagement.shorterExchanges) {
    parts.push(`- Keep your responses concise`)
  }
  if (config.engagement.offerExtensions) {
    parts.push(`- Offer to explore extensions and related topics`)
  }
  if (config.engagement.crossDomainConnections) {
    parts.push(`- Make connections to other domains when relevant`)
  }

  // Misconceptions
  if (knownMisconceptions.length > 0) {
    parts.push(`\n## Known Misconceptions to Address`)
    for (const misconception of knownMisconceptions) {
      parts.push(`- ${misconception}`)
    }
  }

  // Final guidelines
  parts.push(`\n## Guidelines
NEVER:
- Give the answer directly
- Explain the concept to them
- Tell them they're wrong (ask questions instead)
- Rush to the solution

ALWAYS:
- Be patient and encouraging
- Find value in partial understanding
- Build on what they already know
- Celebrate self-discovery`)

  return parts.join('\n')
}

// ============================================================================
// Generate Adaptive Follow-up Question
// ============================================================================

export function generateFollowUpPrompt(
  config: AdaptiveConfig,
  lastExtraction: ExtractionResult,
  dialogueState: DialogueState
): string {
  const parts: string[] = []

  parts.push(`Generate a follow-up Socratic question based on the student's response.

Current understanding level: ${lastExtraction.overallAssessment.understandingLevel}
Recommended question type: ${lastExtraction.overallAssessment.recommendedNextQuestionType}`)

  if (lastExtraction.overallAssessment.isDiscoveryMoment) {
    parts.push(`\n🎉 The student just had a discovery moment! Acknowledge and celebrate it, then ask a reflection question.`)
  }

  if (lastExtraction.misconceptions.length > 0) {
    parts.push(`\n⚠️ Detected misconceptions to address:`)
    for (const m of lastExtraction.misconceptions) {
      parts.push(`- ${m}`)
    }
  }

  if (lastExtraction.insightsDetected.length > 0) {
    parts.push(`\n✨ Insights detected:`)
    for (const i of lastExtraction.insightsDetected) {
      parts.push(`- ${i}`)
    }
  }

  // Psychometric-based adjustments
  if (lastExtraction.confidence.isOverconfident) {
    parts.push(`\n📊 Student shows overconfidence - include verification prompts`)
  }
  if (lastExtraction.confidence.isUnderconfident) {
    parts.push(`\n📊 Student shows underconfidence - be encouraging`)
  }
  if (lastExtraction.engagement.engagementLevel === 'low') {
    parts.push(`\n📊 Engagement is low - try a more engaging approach`)
  }

  // Question type guidance
  const questionType = lastExtraction.overallAssessment.recommendedNextQuestionType
  parts.push(`\nGenerate a ${questionType} question that:`)

  switch (questionType) {
    case 'clarifying':
      parts.push(`- Helps understand their current thinking`)
      parts.push(`- Is open-ended and non-judgmental`)
      break
    case 'probing':
      parts.push(`- Digs deeper into their reasoning`)
      parts.push(`- Asks for evidence or justification`)
      break
    case 'scaffolding':
      parts.push(`- Breaks down the problem into smaller steps`)
      parts.push(`- Points toward the answer without revealing it`)
      break
    case 'challenging':
      parts.push(`- Tests the robustness of their understanding`)
      parts.push(`- Presents edge cases or counterexamples`)
      break
    case 'reflection':
      parts.push(`- Helps them see what they learned`)
      parts.push(`- Connects new and old knowledge`)
      break
    case 'metacognitive':
      parts.push(`- Helps them think about their thinking`)
      parts.push(`- Builds self-awareness`)
      break
  }

  parts.push(`\nReturn only the question, nothing else.`)

  return parts.join('\n')
}

// ============================================================================
// Intervention Checks
// ============================================================================

export interface SocraticIntervention {
  type: 'take_break' | 'switch_topic' | 'simplify' | 'celebrate' | 'encourage' | 'none'
  message?: string
  priority: 'high' | 'medium' | 'low'
}

export function checkForInterventions(
  socraticProfile: SocraticProfile,
  sessionState: SessionState,
  lastExtraction: ExtractionResult | null
): SocraticIntervention {
  // Check frustration threshold
  const frustrationThreshold = socraticProfile.conversational_indicators.frustrationThreshold
  if (sessionState.exchangeCount >= frustrationThreshold) {
    return {
      type: 'take_break',
      message: "You've been working hard! Would you like to take a short break or try a different skill?",
      priority: 'high',
    }
  }

  // Check for frustration signals
  if (lastExtraction?.engagement.frustrationSignals.length && lastExtraction.engagement.frustrationSignals.length > 0) {
    return {
      type: 'simplify',
      message: "Let's take a step back and approach this differently.",
      priority: 'high',
    }
  }

  // Check consecutive failures
  if (sessionState.consecutiveFailures >= 3) {
    return {
      type: 'switch_topic',
      message: "Let's try a different angle on this topic.",
      priority: 'medium',
    }
  }

  // Check for discovery moment - celebrate!
  if (lastExtraction?.overallAssessment.isDiscoveryMoment) {
    return {
      type: 'celebrate',
      message: "Excellent! You discovered something important!",
      priority: 'medium',
    }
  }

  // Check for consecutive successes
  if (sessionState.consecutiveSuccesses >= 5) {
    return {
      type: 'celebrate',
      message: "You're really getting the hang of this!",
      priority: 'low',
    }
  }

  // Check long session
  if (sessionState.timeInSessionMs > 45 * 60 * 1000) { // 45 minutes
    return {
      type: 'take_break',
      message: "You've been learning for a while. A break might help solidify what you've learned.",
      priority: 'medium',
    }
  }

  // Check low engagement
  if (sessionState.currentEngagementLevel === 'low') {
    return {
      type: 'encourage',
      message: "Keep going - you're making progress!",
      priority: 'low',
    }
  }

  return { type: 'none', priority: 'low' }
}
