/**
 * Handwriting vs. Typing for Learning Implementation
 *
 * Based on:
 * - van der Meer & van der Weel (2024) - Handwriting versus keyboarding
 * - Mueller & Oppenheimer (2014) - The pen is mightier than the keyboard
 * - Multiple 2025 replications
 *
 * Core findings:
 * - Handwriting activates more brain regions than typing
 * - 25-40% better recall with handwritten notes
 * - Effect persists even with laptop note-taking training
 * - EEG shows increased theta oscillations (memory encoding) during handwriting
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HandwritingProfile {
  // Input method preferences and history
  inputMethods: {
    primaryMethod: InputMethod
    handwritingFrequency: number       // 0-1, how often they use handwriting
    drawingFrequency: number           // 0-1, how often they draw/sketch
    lastHandwritingUse: string | null
  }

  // Performance comparison by input method
  performanceByMethod: {
    typing: {
      averageRetention: number         // 0-1
      averageComprehension: number     // 0-1
      speed: number                    // words per minute
      sampleSize: number               // number of sessions
    }
    handwriting: {
      averageRetention: number
      averageComprehension: number
      speed: number
      sampleSize: number
    }
    drawing: {
      averageRetention: number
      averageComprehension: number
      sampleSize: number
    }
  }

  // Content type benefits
  contentTypeBenefits: {
    conceptual: number                 // -1 to 1, positive = handwriting better
    procedural: number
    factual: number
    mathematical: number
    verbal: number
  }

  // Device and capability info
  deviceCapabilities: {
    hasStylusSupport: boolean
    hasHandwritingRecognition: boolean
    hasTouchScreen: boolean
  }

  // Recommendations tracking
  recommendations: {
    lastRecommendedMethod: InputMethod | null
    acceptanceRate: number             // 0-1, how often they follow recommendations
    lastRecommendation: string | null
  }

  lastUpdated: string
}

export type InputMethod = 'typing' | 'handwriting' | 'drawing' | 'mixed'

export interface HandwritingRecommendation {
  id: string
  recommendedMethod: InputMethod
  confidence: number                   // 0-1
  reason: string
  scientificBasis: string
  alternativeIfNotPossible: string
  expectedBenefit: string
}

export interface HandwritingActivity {
  id: string
  type: 'note_taking' | 'concept_drawing' | 'formula_writing' | 'diagram_creation' | 'summary_writing'
  prompt: string
  guidance: string[]
  whyHandwriting: string
  duration: number                     // seconds
  contentType: 'conceptual' | 'procedural' | 'factual' | 'mathematical' | 'verbal'
}

export interface HandwritingInputConfig {
  enableHandwriting: boolean
  enableDrawing: boolean
  showHandwritingPrompts: boolean
  canvasSize: 'small' | 'medium' | 'large'
  backgroundStyle: 'blank' | 'lined' | 'dotted' | 'graph'
  penColor: string
  penThickness: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_HANDWRITING_PROFILE: HandwritingProfile = {
  inputMethods: {
    primaryMethod: 'typing',
    handwritingFrequency: 0,
    drawingFrequency: 0,
    lastHandwritingUse: null,
  },
  performanceByMethod: {
    typing: {
      averageRetention: 0.5,
      averageComprehension: 0.5,
      speed: 40,
      sampleSize: 0,
    },
    handwriting: {
      averageRetention: 0.5,
      averageComprehension: 0.5,
      speed: 15,
      sampleSize: 0,
    },
    drawing: {
      averageRetention: 0.5,
      averageComprehension: 0.5,
      sampleSize: 0,
    },
  },
  contentTypeBenefits: {
    conceptual: 0.3,    // Research shows handwriting better for conceptual
    procedural: 0.2,
    factual: 0.15,
    mathematical: 0.35, // Very strong for math
    verbal: 0.1,
  },
  deviceCapabilities: {
    hasStylusSupport: false,
    hasHandwritingRecognition: false,
    hasTouchScreen: false,
  },
  recommendations: {
    lastRecommendedMethod: null,
    acceptanceRate: 0.5,
    lastRecommendation: null,
  },
  lastUpdated: new Date().toISOString(),
}

// Research-based retention multipliers
const RETENTION_MULTIPLIERS = {
  handwriting: {
    conceptual: 1.35,    // 35% better retention (conservative from 25-40% finding)
    mathematical: 1.40,  // Strong effect for math
    procedural: 1.25,
    factual: 1.20,
    verbal: 1.15,
  },
  drawing: {
    conceptual: 1.45,    // Drawing effect is even stronger for concepts
    mathematical: 1.30,
    procedural: 1.35,
    factual: 1.25,
    verbal: 1.10,
  },
}

// Content type to handwriting recommendation strength
const CONTENT_HANDWRITING_FIT: Record<string, number> = {
  conceptual: 0.8,       // High fit - concepts benefit most
  mathematical: 0.9,     // Very high - formulas, equations
  procedural: 0.6,       // Medium - step-by-step can be typed
  factual: 0.5,          // Medium-low - lists can be typed
  verbal: 0.4,           // Lower - but still some benefit
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize handwriting profile
 */
export function initializeHandwritingProfile(deviceCapabilities?: {
  hasStylusSupport: boolean
  hasHandwritingRecognition: boolean
  hasTouchScreen: boolean
}): HandwritingProfile {
  const profile = { ...DEFAULT_HANDWRITING_PROFILE }

  if (deviceCapabilities) {
    profile.deviceCapabilities = deviceCapabilities
  }

  profile.lastUpdated = new Date().toISOString()
  return profile
}

/**
 * Detect device handwriting capabilities
 */
export function detectHandwritingCapabilities(): {
  hasStylusSupport: boolean
  hasHandwritingRecognition: boolean
  hasTouchScreen: boolean
} {
  if (typeof window === 'undefined') {
    return {
      hasStylusSupport: false,
      hasHandwritingRecognition: false,
      hasTouchScreen: false,
    }
  }

  // Check for touch screen
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Check for pointer events (stylus support)
  const hasStylusSupport = 'PointerEvent' in window

  // Check for handwriting recognition API (experimental)
  const hasHandwritingRecognition = 'Handwriting' in window || ('navigator' in window && 'createHandwritingRecognizer' in navigator)

  return {
    hasStylusSupport,
    hasHandwritingRecognition,
    hasTouchScreen,
  }
}

/**
 * Generate input method recommendation for content
 */
export function recommendInputMethod(
  profile: HandwritingProfile,
  contentType: 'conceptual' | 'procedural' | 'factual' | 'mathematical' | 'verbal',
  context: {
    isKeyLearningMoment: boolean    // Is this a critical concept?
    hasTimeConstraint: boolean       // Is speed important?
    isReviewSession: boolean         // Reviewing vs learning new
    difficultyLevel: number          // 0-1
  }
): HandwritingRecommendation {
  const { deviceCapabilities, performanceByMethod, contentTypeBenefits } = profile

  // Check if handwriting is even possible
  const canHandwrite = deviceCapabilities.hasTouchScreen || deviceCapabilities.hasStylusSupport

  // Calculate expected benefit from handwriting for this content
  const contentFit = CONTENT_HANDWRITING_FIT[contentType] || 0.5
  const personalBenefit = contentTypeBenefits[contentType] || 0

  // Higher difficulty and key moments favor handwriting
  const situationalBoost = (context.isKeyLearningMoment ? 0.2 : 0) +
                          (context.difficultyLevel > 0.6 ? 0.15 : 0) +
                          (context.isReviewSession ? -0.1 : 0.1) // New learning benefits more

  // Time constraints favor typing
  const speedPenalty = context.hasTimeConstraint ? -0.3 : 0

  // Combined score for handwriting recommendation
  const handwritingScore = contentFit + personalBenefit + situationalBoost + speedPenalty

  // Determine recommendation
  if (!canHandwrite) {
    return {
      id: `rec-${Date.now()}`,
      recommendedMethod: 'typing',
      confidence: 0.95,
      reason: "Your device doesn't support handwriting input",
      scientificBasis: "Handwriting produces 25-40% better retention, but requires compatible input",
      alternativeIfNotPossible: "Consider drawing diagrams on paper and photographing them",
      expectedBenefit: "Standard retention with typing",
    }
  }

  if (handwritingScore >= 0.6) {
    return {
      id: `rec-${Date.now()}`,
      recommendedMethod: contentType === 'mathematical' ? 'handwriting' : 'mixed',
      confidence: Math.min(0.9, handwritingScore),
      reason: getHandwritingReason(contentType, context),
      scientificBasis: `Research shows ${Math.round(RETENTION_MULTIPLIERS.handwriting[contentType] * 100 - 100)}% better retention for ${contentType} content when handwritten (van der Meer & van der Weel, 2024)`,
      alternativeIfNotPossible: "Type your notes but draw key diagrams/formulas by hand",
      expectedBenefit: `Up to ${Math.round(RETENTION_MULTIPLIERS.handwriting[contentType] * 100 - 100)}% better long-term retention`,
    }
  }

  if (handwritingScore >= 0.4 && handwritingScore < 0.6) {
    return {
      id: `rec-${Date.now()}`,
      recommendedMethod: 'mixed',
      confidence: 0.6,
      reason: "A combination of typing and handwriting may work best here",
      scientificBasis: "Mixed approach captures speed benefits of typing while handwriting key concepts improves retention",
      alternativeIfNotPossible: "Focus handwriting on the most important concepts only",
      expectedBenefit: "Balanced speed and retention",
    }
  }

  return {
    id: `rec-${Date.now()}`,
    recommendedMethod: 'typing',
    confidence: 0.7,
    reason: context.hasTimeConstraint
      ? "Speed is prioritized for this content"
      : "This content type benefits less from handwriting",
    scientificBasis: "While handwriting generally helps retention, the benefit varies by content type and situation",
    alternativeIfNotPossible: "N/A - typing is recommended",
    expectedBenefit: "Good balance of speed and retention for this content",
  }
}

/**
 * Generate a handwriting activity for a concept
 */
export function generateHandwritingActivity(
  conceptName: string,
  contentType: 'conceptual' | 'procedural' | 'factual' | 'mathematical' | 'verbal',
  difficulty: number
): HandwritingActivity {
  const activities: Record<string, HandwritingActivity> = {
    conceptual: {
      id: `hw-concept-${Date.now()}`,
      type: 'concept_drawing',
      prompt: `Draw a visual representation of "${conceptName}"`,
      guidance: [
        "Don't worry about artistic quality - focus on meaning",
        "Include labels for key parts",
        "Show relationships with arrows or connections",
        "Add a one-sentence summary below your drawing",
      ],
      whyHandwriting: "Drawing while thinking activates visual-spatial processing and creates multiple memory pathways (25-40% better retention)",
      duration: 180, // 3 minutes
      contentType: 'conceptual',
    },
    mathematical: {
      id: `hw-math-${Date.now()}`,
      type: 'formula_writing',
      prompt: `Write out the key formulas/equations for "${conceptName}"`,
      guidance: [
        "Write each formula slowly and deliberately",
        "Annotate what each symbol means",
        "Write a simple example using the formula",
        "Note any conditions or constraints",
      ],
      whyHandwriting: "Handwriting mathematical notation increases theta oscillations in your brain, enhancing memory encoding (EEG studies, van der Meer 2024)",
      duration: 120, // 2 minutes
      contentType: 'mathematical',
    },
    procedural: {
      id: `hw-proc-${Date.now()}`,
      type: 'summary_writing',
      prompt: `Write out the steps for "${conceptName}" in your own words`,
      guidance: [
        "Number each step clearly",
        "Add small sketches where helpful",
        "Note any tricky parts or common mistakes",
        "Write what happens at each transition",
      ],
      whyHandwriting: "The slower pace of handwriting forces deeper processing of each step",
      duration: 150, // 2.5 minutes
      contentType: 'procedural',
    },
    factual: {
      id: `hw-fact-${Date.now()}`,
      type: 'note_taking',
      prompt: `Write the key facts about "${conceptName}"`,
      guidance: [
        "Don't copy verbatim - rephrase in your words",
        "Use abbreviations and shorthand",
        "Create visual cues (arrows, boxes, underlines)",
        "Leave space for additions",
      ],
      whyHandwriting: "Active rephrasing during handwriting improves understanding over passive copying",
      duration: 90, // 1.5 minutes
      contentType: 'factual',
    },
    verbal: {
      id: `hw-verbal-${Date.now()}`,
      type: 'summary_writing',
      prompt: `Summarize "${conceptName}" in 2-3 sentences by hand`,
      guidance: [
        "Focus on the main idea first",
        "Add supporting details if space allows",
        "Underline key terms",
        "Read your summary aloud when done",
      ],
      whyHandwriting: "Handwriting engages different cognitive processes than typing, even for verbal content",
      duration: 60, // 1 minute
      contentType: 'verbal',
    },
  }

  const activity = activities[contentType] || activities.conceptual

  // Adjust duration based on difficulty
  activity.duration = Math.round(activity.duration * (1 + difficulty * 0.5))

  return activity
}

/**
 * Get handwriting input configuration
 */
export function getHandwritingInputConfig(
  contentType: 'conceptual' | 'procedural' | 'factual' | 'mathematical' | 'verbal',
  profile: HandwritingProfile
): HandwritingInputConfig {
  const baseConfig: HandwritingInputConfig = {
    enableHandwriting: profile.deviceCapabilities.hasTouchScreen || profile.deviceCapabilities.hasStylusSupport,
    enableDrawing: true,
    showHandwritingPrompts: profile.inputMethods.handwritingFrequency < 0.3, // Prompt more if rarely used
    canvasSize: 'medium',
    backgroundStyle: 'blank',
    penColor: '#1a1a2e',
    penThickness: 2,
  }

  // Customize based on content type
  switch (contentType) {
    case 'mathematical':
      baseConfig.canvasSize = 'large'
      baseConfig.backgroundStyle = 'graph'
      baseConfig.penThickness = 2
      break
    case 'conceptual':
      baseConfig.canvasSize = 'large'
      baseConfig.backgroundStyle = 'dotted'
      break
    case 'procedural':
      baseConfig.canvasSize = 'medium'
      baseConfig.backgroundStyle = 'lined'
      break
    case 'factual':
      baseConfig.canvasSize = 'small'
      baseConfig.backgroundStyle = 'lined'
      break
    case 'verbal':
      baseConfig.canvasSize = 'medium'
      baseConfig.backgroundStyle = 'lined'
      break
  }

  return baseConfig
}

/**
 * Update handwriting profile after a learning session
 */
export function updateHandwritingProfile(
  current: HandwritingProfile,
  sessionData: {
    inputMethodUsed: InputMethod
    contentType: 'conceptual' | 'procedural' | 'factual' | 'mathematical' | 'verbal'
    retentionScore?: number           // If tested
    comprehensionScore?: number       // If assessed
    timeSpent: number                 // seconds
    followedRecommendation: boolean
  }
): HandwritingProfile {
  const alpha = 0.2 // EMA smoothing
  const updated = { ...current }

  // Update input method usage
  if (sessionData.inputMethodUsed === 'handwriting' || sessionData.inputMethodUsed === 'mixed') {
    updated.inputMethods.handwritingFrequency = alpha * 1 + (1 - alpha) * current.inputMethods.handwritingFrequency
    updated.inputMethods.lastHandwritingUse = new Date().toISOString()
  } else {
    updated.inputMethods.handwritingFrequency = alpha * 0 + (1 - alpha) * current.inputMethods.handwritingFrequency
  }

  if (sessionData.inputMethodUsed === 'drawing' || sessionData.inputMethodUsed === 'mixed') {
    updated.inputMethods.drawingFrequency = alpha * 1 + (1 - alpha) * current.inputMethods.drawingFrequency
  }

  // Update performance metrics if we have scores
  if (sessionData.retentionScore !== undefined || sessionData.comprehensionScore !== undefined) {
    const methodKey = sessionData.inputMethodUsed === 'mixed' ? 'handwriting' : sessionData.inputMethodUsed
    const perfData = updated.performanceByMethod[methodKey]

    if (sessionData.retentionScore !== undefined) {
      perfData.averageRetention = alpha * sessionData.retentionScore + (1 - alpha) * perfData.averageRetention
    }
    if (sessionData.comprehensionScore !== undefined) {
      perfData.averageComprehension = alpha * sessionData.comprehensionScore + (1 - alpha) * perfData.averageComprehension
    }
    perfData.sampleSize++
  }

  // Update content type benefits based on comparative performance
  if (sessionData.retentionScore !== undefined && current.performanceByMethod.typing.sampleSize > 0) {
    const typingBaseline = current.performanceByMethod.typing.averageRetention
    const benefit = sessionData.retentionScore - typingBaseline
    updated.contentTypeBenefits[sessionData.contentType] =
      alpha * benefit + (1 - alpha) * current.contentTypeBenefits[sessionData.contentType]
  }

  // Update recommendation acceptance rate
  updated.recommendations.acceptanceRate =
    alpha * (sessionData.followedRecommendation ? 1 : 0) + (1 - alpha) * current.recommendations.acceptanceRate

  updated.lastUpdated = new Date().toISOString()
  return updated
}

/**
 * Calculate expected retention boost for handwriting
 */
export function calculateRetentionBoost(
  contentType: 'conceptual' | 'procedural' | 'factual' | 'mathematical' | 'verbal',
  inputMethod: InputMethod
): {
  multiplier: number
  percentageIncrease: number
  confidence: number
} {
  if (inputMethod === 'typing') {
    return { multiplier: 1.0, percentageIncrease: 0, confidence: 0.9 }
  }

  const baseMultiplier = inputMethod === 'drawing'
    ? RETENTION_MULTIPLIERS.drawing[contentType] || 1.2
    : RETENTION_MULTIPLIERS.handwriting[contentType] || 1.2

  // Mixed method gets partial benefit
  const multiplier = inputMethod === 'mixed'
    ? 1 + (baseMultiplier - 1) * 0.6
    : baseMultiplier

  return {
    multiplier,
    percentageIncrease: Math.round((multiplier - 1) * 100),
    confidence: 0.75, // Based on research replication strength
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getHandwritingReason(
  contentType: string,
  context: { isKeyLearningMoment: boolean; difficultyLevel: number }
): string {
  const reasons: string[] = []

  if (contentType === 'mathematical') {
    reasons.push("Mathematical notation benefits significantly from handwriting")
  } else if (contentType === 'conceptual') {
    reasons.push("Complex concepts are better retained when written/drawn by hand")
  }

  if (context.isKeyLearningMoment) {
    reasons.push("This is a key learning moment worth the extra encoding effort")
  }

  if (context.difficultyLevel > 0.6) {
    reasons.push("Difficult material benefits from the slower, more deliberate pace of handwriting")
  }

  return reasons.length > 0
    ? reasons.join('. ')
    : "Handwriting can enhance retention for this content"
}

export default {
  initializeHandwritingProfile,
  detectHandwritingCapabilities,
  recommendInputMethod,
  generateHandwritingActivity,
  getHandwritingInputConfig,
  updateHandwritingProfile,
  calculateRetentionBoost,
}
