/**
 * Micro-Assessment Service
 *
 * Provides periodic micro-assessments to improve learner profile data quality.
 * These are quick (1-3 question) assessments triggered:
 * - After a time interval (e.g., 10 minutes of learning)
 * - After a certain number of interactions
 * - When confidence data is stale or uncertain
 *
 * The assessments target specific framework indicators that need more data.
 */

import type { InverseProfile } from '@/lib/types/interactions'

// ============================================
// Types
// ============================================

export type AssessmentType =
  | 'confidence_calibration' // Test if learner's self-assessment matches reality
  | 'metacognitive_awareness' // Test self-monitoring abilities
  | 'knowledge_probe' // Quick knowledge check for specific skills
  | 'help_seeking_prompt' // Understand help-seeking behavior
  | 'cognitive_load_check' // Check if content is at right level
  | 'engagement_check' // Check motivation and interest

export interface MicroAssessmentQuestion {
  id: string
  type: AssessmentType
  question: string
  questionType: 'multiple_choice' | 'scale' | 'yes_no' | 'open_ended'
  options?: string[]
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: { min: string; max: string }
  skillId?: string // For knowledge probes
  expectedOutcome?: string // For calibration questions
  frameworkTarget: string // Which framework indicator this helps
}

export interface MicroAssessmentResult {
  questionId: string
  type: AssessmentType
  response: string | number
  responseTimeMs: number
  timestamp: string
  frameworkTarget: string
  skillId?: string
}

export interface MicroAssessmentRecommendation {
  shouldTrigger: boolean
  reason: string
  assessmentType: AssessmentType
  priority: 'low' | 'medium' | 'high'
  questions: MicroAssessmentQuestion[]
}

export interface AssessmentTriggerContext {
  timeSinceLastAssessment: number // ms
  interactionsSinceLastAssessment: number
  profile: InverseProfile | null
  currentSessionDurationMs: number
  recentAccuracy?: number
  recentConfidenceRatings?: number[]
}

// ============================================
// Constants
// ============================================

const MIN_TIME_BETWEEN_ASSESSMENTS_MS = 10 * 60 * 1000 // 10 minutes
const MIN_INTERACTIONS_BETWEEN_ASSESSMENTS = 5
const MAX_QUESTIONS_PER_ASSESSMENT = 3

// ============================================
// Assessment Question Templates
// ============================================

const confidenceCalibrationQuestions: Omit<MicroAssessmentQuestion, 'id'>[] = [
  {
    type: 'confidence_calibration',
    question: 'Before answering the next practice question, how confident are you that you will get it correct?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Not confident', max: 'Very confident' },
    frameworkTarget: 'metacognitive.calibrationAccuracy',
  },
  {
    type: 'confidence_calibration',
    question: 'Looking back at the topic you just studied, how well do you think you understand it?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Poorly', max: 'Completely' },
    frameworkTarget: 'metacognitive.calibrationAccuracy',
  },
]

const metacognitiveAwarenessQuestions: Omit<MicroAssessmentQuestion, 'id'>[] = [
  {
    type: 'metacognitive_awareness',
    question: 'When you get a practice question wrong, what do you usually do?',
    questionType: 'multiple_choice',
    options: [
      'Move on to the next question',
      'Re-read the explanation carefully',
      'Try to figure out why I was wrong',
      'Go back and review the related material',
    ],
    frameworkTarget: 'metacognitive.errorAnalysis',
  },
  {
    type: 'metacognitive_awareness',
    question: 'Are you aware of which parts of this topic you find most challenging?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Not at all', max: 'Very aware' },
    frameworkTarget: 'metacognitive.selfAwareness',
  },
  {
    type: 'metacognitive_awareness',
    question: 'When you read something confusing, what do you typically do?',
    questionType: 'multiple_choice',
    options: [
      'Skip it and keep going',
      'Re-read it more slowly',
      'Look for an explanation elsewhere',
      'Ask for help',
    ],
    frameworkTarget: 'metacognitive.comprehensionMonitoring',
  },
]

const helpSeekingQuestions: Omit<MicroAssessmentQuestion, 'id'>[] = [
  {
    type: 'help_seeking_prompt',
    question: 'When you get stuck on a problem, how long do you typically try before seeking help?',
    questionType: 'multiple_choice',
    options: [
      'I ask for help right away',
      'A few minutes',
      '5-10 minutes',
      '15+ minutes',
      'I rarely ask for help',
    ],
    frameworkTarget: 'metacognitive.helpSeekingPattern',
  },
  {
    type: 'help_seeking_prompt',
    question: 'How comfortable are you asking for help when you need it?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Very uncomfortable', max: 'Very comfortable' },
    frameworkTarget: 'metacognitive.helpSeekingPattern',
  },
]

const cognitiveLoadQuestions: Omit<MicroAssessmentQuestion, 'id'>[] = [
  {
    type: 'cognitive_load_check',
    question: 'How mentally demanding do you find the current material?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Too easy', max: 'Overwhelming' },
    frameworkTarget: 'cognitive.workingMemoryIndicator',
  },
  {
    type: 'cognitive_load_check',
    question: 'How would you describe your current mental state?',
    questionType: 'multiple_choice',
    options: [
      'I feel bored - this is too easy',
      'I feel comfortable - this is at my level',
      'I feel challenged but engaged',
      'I feel overwhelmed - this is too hard',
    ],
    frameworkTarget: 'cognitive.optimalComplexityLevel',
  },
]

const engagementQuestions: Omit<MicroAssessmentQuestion, 'id'>[] = [
  {
    type: 'engagement_check',
    question: 'How interested are you in this topic right now?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Not interested', max: 'Very interested' },
    frameworkTarget: 'motivational.intrinsicMotivation',
  },
  {
    type: 'engagement_check',
    question: 'What is your main motivation for learning this material?',
    questionType: 'multiple_choice',
    options: [
      'I find it genuinely interesting',
      'I need it for a class or test',
      'It will help with my career',
      'Someone else wants me to learn it',
    ],
    frameworkTarget: 'motivational.goalOrientation',
  },
  {
    type: 'engagement_check',
    question: 'How likely are you to continue learning about this topic on your own?',
    questionType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: 'Very unlikely', max: 'Very likely' },
    frameworkTarget: 'motivational.autonomousMotivation',
  },
]

// ============================================
// Helper Functions
// ============================================

function generateQuestionId(): string {
  return `maq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getQuestionsForType(type: AssessmentType): Omit<MicroAssessmentQuestion, 'id'>[] {
  switch (type) {
    case 'confidence_calibration':
      return confidenceCalibrationQuestions
    case 'metacognitive_awareness':
      return metacognitiveAwarenessQuestions
    case 'help_seeking_prompt':
      return helpSeekingQuestions
    case 'cognitive_load_check':
      return cognitiveLoadQuestions
    case 'engagement_check':
      return engagementQuestions
    case 'knowledge_probe':
      return [] // Knowledge probes are generated dynamically
    default:
      return []
  }
}

// ============================================
// Determine What to Assess
// ============================================

function determineAssessmentNeeds(
  profile: InverseProfile | null
): { type: AssessmentType; priority: 'low' | 'medium' | 'high'; reason: string }[] {
  const needs: { type: AssessmentType; priority: 'low' | 'medium' | 'high'; reason: string }[] = []

  if (!profile) {
    // No profile at all - need baseline data
    needs.push({
      type: 'metacognitive_awareness',
      priority: 'high',
      reason: 'No learner profile data - need baseline metacognitive indicators',
    })
    needs.push({
      type: 'engagement_check',
      priority: 'medium',
      reason: 'No motivational data available',
    })
    return needs
  }

  const confidence = profile.confidence_scores

  // Check metacognitive confidence
  if (!confidence?.metacognitive || confidence.metacognitive < 0.5) {
    needs.push({
      type: 'metacognitive_awareness',
      priority: 'high',
      reason: 'Low confidence in metacognitive indicators',
    })
  }

  // Check calibration data
  const metacognitive = profile.metacognitive_indicators
  if (metacognitive?.calibrationAccuracy === null || metacognitive?.calibrationAccuracy === undefined) {
    needs.push({
      type: 'confidence_calibration',
      priority: 'high',
      reason: 'No calibration data available',
    })
  } else if (metacognitive.overconfidenceRate && metacognitive.overconfidenceRate > 0.3) {
    needs.push({
      type: 'confidence_calibration',
      priority: 'medium',
      reason: 'Learner appears overconfident - need verification',
    })
  }

  // Check help-seeking pattern
  if (metacognitive?.helpSeekingPattern === 'unknown') {
    needs.push({
      type: 'help_seeking_prompt',
      priority: 'medium',
      reason: 'Help-seeking pattern unknown',
    })
  }

  // Check cognitive load indicators
  const cognitive = profile.cognitive_indicators
  if (!confidence?.cognitive || confidence.cognitive < 0.5) {
    needs.push({
      type: 'cognitive_load_check',
      priority: 'medium',
      reason: 'Low confidence in cognitive load estimates',
    })
  }

  // Check motivational indicators
  const motivational = profile.motivational_indicators
  if (!confidence?.motivational || confidence.motivational < 0.4) {
    needs.push({
      type: 'engagement_check',
      priority: 'low',
      reason: 'Low confidence in motivational indicators',
    })
  }

  return needs
}

// ============================================
// Main Functions
// ============================================

/**
 * Check if a micro-assessment should be triggered
 */
export function shouldTriggerMicroAssessment(
  context: AssessmentTriggerContext
): MicroAssessmentRecommendation {
  // Check minimum time threshold
  if (context.timeSinceLastAssessment < MIN_TIME_BETWEEN_ASSESSMENTS_MS) {
    return {
      shouldTrigger: false,
      reason: 'Too soon since last assessment',
      assessmentType: 'metacognitive_awareness',
      priority: 'low',
      questions: [],
    }
  }

  // Check minimum interaction threshold
  if (context.interactionsSinceLastAssessment < MIN_INTERACTIONS_BETWEEN_ASSESSMENTS) {
    return {
      shouldTrigger: false,
      reason: 'Not enough interactions since last assessment',
      assessmentType: 'metacognitive_awareness',
      priority: 'low',
      questions: [],
    }
  }

  // Determine what needs to be assessed
  const assessmentNeeds = determineAssessmentNeeds(context.profile)

  if (assessmentNeeds.length === 0) {
    return {
      shouldTrigger: false,
      reason: 'Profile data is sufficient',
      assessmentType: 'metacognitive_awareness',
      priority: 'low',
      questions: [],
    }
  }

  // Sort by priority
  assessmentNeeds.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Pick the highest priority need
  const selectedNeed = assessmentNeeds[0]

  // Get questions for this type
  const questionTemplates = getQuestionsForType(selectedNeed.type)

  // Select up to MAX_QUESTIONS_PER_ASSESSMENT questions
  const selectedQuestions = questionTemplates
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX_QUESTIONS_PER_ASSESSMENT)
    .map(q => ({
      ...q,
      id: generateQuestionId(),
    }))

  return {
    shouldTrigger: selectedQuestions.length > 0,
    reason: selectedNeed.reason,
    assessmentType: selectedNeed.type,
    priority: selectedNeed.priority,
    questions: selectedQuestions,
  }
}

/**
 * Process micro-assessment results and update profile indicators
 */
export function processMicroAssessmentResults(
  results: MicroAssessmentResult[]
): {
  updates: Record<string, unknown>
  insights: string[]
} {
  const updates: Record<string, unknown> = {}
  const insights: string[] = []

  for (const result of results) {
    switch (result.type) {
      case 'confidence_calibration':
        processConfidenceCalibration(result, updates, insights)
        break
      case 'metacognitive_awareness':
        processMetacognitiveAwareness(result, updates, insights)
        break
      case 'help_seeking_prompt':
        processHelpSeeking(result, updates, insights)
        break
      case 'cognitive_load_check':
        processCognitiveLoad(result, updates, insights)
        break
      case 'engagement_check':
        processEngagement(result, updates, insights)
        break
    }
  }

  return { updates, insights }
}

function processConfidenceCalibration(
  result: MicroAssessmentResult,
  updates: Record<string, unknown>,
  insights: string[]
) {
  const response = typeof result.response === 'number' ? result.response : parseInt(result.response as string)

  if (!isNaN(response)) {
    updates['metacognitive_indicators.selfReportedConfidence'] = response
    updates['confidence_scores.metacognitiveIndicators'] = 0.6 // Improved confidence

    if (response >= 4) {
      insights.push('Learner reports high confidence - will monitor for overconfidence')
    } else if (response <= 2) {
      insights.push('Learner reports low confidence - may need more encouragement')
    }
  }
}

function processMetacognitiveAwareness(
  result: MicroAssessmentResult,
  updates: Record<string, unknown>,
  insights: string[]
) {
  const response = result.response

  if (typeof response === 'string') {
    // Multiple choice analysis
    if (response.includes('figure out why') || response.includes('review the related material')) {
      updates['metacognitive_indicators.errorAnalysisStrategy'] = 'reflective'
      insights.push('Learner shows good error analysis habits')
    } else if (response.includes('Move on')) {
      updates['metacognitive_indicators.errorAnalysisStrategy'] = 'avoidant'
      insights.push('Learner may benefit from prompts to analyze errors')
    }
  } else if (typeof response === 'number') {
    // Scale response
    updates['metacognitive_indicators.selfAwarenessRating'] = response
    if (response >= 4) {
      insights.push('Learner shows strong metacognitive awareness')
    }
  }
}

function processHelpSeeking(
  result: MicroAssessmentResult,
  updates: Record<string, unknown>,
  insights: string[]
) {
  const response = result.response

  if (typeof response === 'string') {
    if (response.includes('right away')) {
      updates['metacognitive_indicators.helpSeekingPattern'] = 'excessive'
      insights.push('Learner may seek help too quickly - encourage productive struggle')
    } else if (response.includes('rarely')) {
      updates['metacognitive_indicators.helpSeekingPattern'] = 'avoidant'
      insights.push('Learner may avoid help - proactively offer assistance')
    } else {
      updates['metacognitive_indicators.helpSeekingPattern'] = 'appropriate'
      insights.push('Learner shows appropriate help-seeking behavior')
    }
  } else if (typeof response === 'number') {
    updates['metacognitive_indicators.helpSeekingComfort'] = response
    if (response <= 2) {
      insights.push('Learner uncomfortable seeking help - normalize asking questions')
    }
  }
}

function processCognitiveLoad(
  result: MicroAssessmentResult,
  updates: Record<string, unknown>,
  insights: string[]
) {
  const response = result.response

  if (typeof response === 'number') {
    // Scale 1-5: 1=too easy, 3=just right, 5=overwhelming
    if (response === 1 || response === 2) {
      updates['cognitive_indicators.perceivedDifficulty'] = 'low'
      insights.push('Content may be too easy - consider increasing challenge')
    } else if (response === 3) {
      updates['cognitive_indicators.perceivedDifficulty'] = 'optimal'
      insights.push('Content difficulty is at optimal level')
    } else {
      updates['cognitive_indicators.perceivedDifficulty'] = 'high'
      insights.push('Content may be overwhelming - consider more scaffolding')
    }
  } else if (typeof response === 'string') {
    if (response.includes('bored')) {
      updates['cognitive_indicators.workingMemoryIndicator'] = 'high'
      insights.push('Learner may benefit from more challenging material')
    } else if (response.includes('overwhelmed')) {
      updates['cognitive_indicators.workingMemoryIndicator'] = 'low'
      insights.push('Consider reducing cognitive load')
    } else {
      updates['cognitive_indicators.workingMemoryIndicator'] = 'medium'
    }
  }
}

function processEngagement(
  result: MicroAssessmentResult,
  updates: Record<string, unknown>,
  insights: string[]
) {
  const response = result.response

  if (typeof response === 'number') {
    updates['motivational_indicators.interestLevel'] = response

    if (response >= 4) {
      updates['motivational_indicators.intrinsicMotivation'] = true
      insights.push('Learner shows high intrinsic motivation')
    } else if (response <= 2) {
      insights.push('Learner interest is low - consider connecting to interests')
    }
  } else if (typeof response === 'string') {
    if (response.includes('genuinely interesting')) {
      updates['motivational_indicators.goalOrientation'] = 'mastery'
      insights.push('Learner is mastery-oriented')
    } else if (response.includes('class or test')) {
      updates['motivational_indicators.goalOrientation'] = 'performance'
      insights.push('Learner is performance-oriented')
    } else if (response.includes('career')) {
      updates['motivational_indicators.goalOrientation'] = 'utility'
      insights.push('Learner has utility-focused motivation')
    }
  }
}

/**
 * Generate a knowledge probe question for a specific skill
 */
export function generateKnowledgeProbe(
  skillId: string,
  skillName: string,
  difficulty: number
): MicroAssessmentQuestion {
  // This would typically call an AI to generate the question
  // For now, return a template
  return {
    id: generateQuestionId(),
    type: 'knowledge_probe',
    question: `Quick check: Can you explain the key concept of "${skillName}" in your own words?`,
    questionType: 'open_ended',
    skillId,
    frameworkTarget: 'knowledge_state.skillMastery',
  }
}

/**
 * Get assessment type display name
 */
export function getAssessmentTypeName(type: AssessmentType): string {
  const names: Record<AssessmentType, string> = {
    confidence_calibration: 'Confidence Check',
    metacognitive_awareness: 'Learning Strategies',
    knowledge_probe: 'Quick Knowledge Check',
    help_seeking_prompt: 'Study Habits',
    cognitive_load_check: 'Difficulty Check',
    engagement_check: 'Interest Check',
  }
  return names[type] ?? 'Quick Assessment'
}

/**
 * Get assessment type description
 */
export function getAssessmentTypeDescription(type: AssessmentType): string {
  const descriptions: Record<AssessmentType, string> = {
    confidence_calibration: 'Help us understand how you judge your own understanding',
    metacognitive_awareness: 'Tell us about how you approach learning',
    knowledge_probe: 'A quick check on your understanding',
    help_seeking_prompt: 'Help us learn about your study habits',
    cognitive_load_check: 'Let us know how the difficulty level feels',
    engagement_check: 'Share your interest level with this topic',
  }
  return descriptions[type] ?? 'A quick question to personalize your learning experience'
}
