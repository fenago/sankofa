/**
 * Embodied Cognition & Gesture-Based Learning Implementation
 *
 * Based on:
 * - Goldin-Meadow, S. (2019-2024) - Gesture and learning research
 * - Wilson, M. - Embodied cognition
 * - Alibali, M. - Gesture in mathematics learning
 *
 * Core concept: Physical movement and gesture enhance cognitive processing
 * and memory formation.
 *
 * Research evidence: d=0.32-0.55 for gesture-enhanced instruction
 * Particularly strong for spatial and mathematical reasoning
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EmbodiedProfile {
  // Gesture usage patterns
  gestureUsage: {
    hasGestureSupport: boolean         // Device supports gestures
    gestureFrequency: number           // Gestures per session (0-1 normalized)
    preferredGestureTypes: GestureType[]
    gestureAccuracy: number            // Accuracy of gesture-based inputs (0-1)
    lastGestureSession: string | null
  }

  // Physical interaction patterns
  physicalInteraction: {
    prefersTouchInput: boolean
    usesDrawingTools: boolean
    handwritingUsed: boolean
    movementDuringLearning: boolean
  }

  // Learning modality preferences
  modalityPreferences: {
    kinesthetic: number                // 0-1 preference for physical interaction
    visual: number                     // 0-1 preference for visual learning
    auditory: number                   // 0-1 preference for auditory learning
    readingWriting: number             // 0-1 preference for text-based learning
  }

  // Content type performance with embodied approaches
  embodiedPerformance: {
    spatialReasoning: number           // Performance on spatial tasks (0-1)
    mathematicalConcepts: number       // Performance on math with gestures (0-1)
    proceduralLearning: number         // Performance on step-by-step tasks (0-1)
    abstractConcepts: number           // Performance on abstract ideas (0-1)
  }

  lastUpdated: string
}

export type GestureType =
  | 'tap'           // Single tap for selection
  | 'swipe'         // Swipe for navigation
  | 'pinch'         // Pinch for zoom
  | 'drag'          // Drag and drop
  | 'draw'          // Freeform drawing
  | 'trace'         // Tracing shapes/letters
  | 'rotate'        // Rotation gestures
  | 'shake'         // Device shake

export interface GesturePrompt {
  id: string
  type: 'instructional' | 'interactive' | 'mimicry' | 'exploration'
  gesture: GestureType
  instruction: string
  conceptRelation: string          // How the gesture relates to the concept
  expectedBenefit: string          // Why this helps learning
  alternatives?: string[]          // For accessibility
}

export interface EmbodiedActivity {
  id: string
  type: 'gesture_practice' | 'physical_manipulation' | 'movement_break' | 'drawing_exercise' | 'tracing_practice'
  skillId?: string
  duration: number                 // Suggested duration in seconds
  instructions: string[]
  gestures: GesturePrompt[]
  accessibilityAlternatives: string[]
  benefitExplanation: string
}

export interface EmbodiedRecommendation {
  activity: EmbodiedActivity
  priority: number                 // 1-3, higher is more important
  reason: string
  timing: 'before_learning' | 'during_learning' | 'after_learning' | 'break'
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_EMBODIED_PROFILE: EmbodiedProfile = {
  gestureUsage: {
    hasGestureSupport: false,
    gestureFrequency: 0,
    preferredGestureTypes: [],
    gestureAccuracy: 0.5,
    lastGestureSession: null,
  },
  physicalInteraction: {
    prefersTouchInput: false,
    usesDrawingTools: false,
    handwritingUsed: false,
    movementDuringLearning: false,
  },
  modalityPreferences: {
    kinesthetic: 0.25,
    visual: 0.25,
    auditory: 0.25,
    readingWriting: 0.25,
  },
  embodiedPerformance: {
    spatialReasoning: 0.5,
    mathematicalConcepts: 0.5,
    proceduralLearning: 0.5,
    abstractConcepts: 0.5,
  },
  lastUpdated: new Date().toISOString(),
}

// Gesture prompts for different concept types
const GESTURE_LIBRARY: Record<string, GesturePrompt[]> = {
  mathematical: [
    {
      id: 'math-growth',
      type: 'instructional',
      gesture: 'pinch',
      instruction: "Spread your fingers apart to visualize growth or expansion",
      conceptRelation: "The expanding motion mirrors mathematical growth (exponential, increasing functions)",
      expectedBenefit: "Creates physical memory of 'getting larger'",
      alternatives: ["Imagine stretching a rubber band"],
    },
    {
      id: 'math-fraction',
      type: 'interactive',
      gesture: 'drag',
      instruction: "Drag to divide the shape into equal parts",
      conceptRelation: "Physical division reinforces fraction concepts",
      expectedBenefit: "Hands-on manipulation builds concrete understanding",
    },
    {
      id: 'math-balance',
      type: 'mimicry',
      gesture: 'rotate',
      instruction: "Use two fingers to balance the equation by rotating",
      conceptRelation: "Physical balance mirrors algebraic equality",
      expectedBenefit: "Embodied sense of 'keeping things equal'",
    },
  ],
  spatial: [
    {
      id: 'spatial-rotate',
      type: 'interactive',
      gesture: 'rotate',
      instruction: "Rotate the 3D object to view from different angles",
      conceptRelation: "Mental rotation practice through physical rotation",
      expectedBenefit: "Strengthens spatial reasoning skills",
    },
    {
      id: 'spatial-trace',
      type: 'exploration',
      gesture: 'trace',
      instruction: "Trace the path with your finger to understand the shape",
      conceptRelation: "Kinesthetic tracing builds shape recognition",
      expectedBenefit: "Motor memory enhances geometric understanding",
    },
  ],
  procedural: [
    {
      id: 'proc-step',
      type: 'instructional',
      gesture: 'swipe',
      instruction: "Swipe through each step of the process",
      conceptRelation: "Sequential gestures reinforce sequential thinking",
      expectedBenefit: "Physical progression matches mental progression",
    },
    {
      id: 'proc-connect',
      type: 'interactive',
      gesture: 'drag',
      instruction: "Connect the steps by dragging from one to the next",
      conceptRelation: "Physical connection reinforces logical connection",
      expectedBenefit: "Builds understanding of cause-effect chains",
    },
  ],
  abstract: [
    {
      id: 'abstract-categorize',
      type: 'interactive',
      gesture: 'drag',
      instruction: "Drag concepts into categories that make sense to you",
      conceptRelation: "Physical sorting mirrors conceptual categorization",
      expectedBenefit: "Concrete action for abstract categorization",
    },
    {
      id: 'abstract-draw',
      type: 'exploration',
      gesture: 'draw',
      instruction: "Draw a diagram showing how these ideas connect",
      conceptRelation: "Visual-kinesthetic representation of relationships",
      expectedBenefit: "Externalizes mental models",
    },
  ],
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize embodied cognition profile
 */
export function initializeEmbodiedProfile(deviceCapabilities?: {
  hasTouch: boolean
  hasGyroscope: boolean
  screenSize: 'small' | 'medium' | 'large'
}): EmbodiedProfile {
  const profile = { ...DEFAULT_EMBODIED_PROFILE }

  if (deviceCapabilities) {
    profile.gestureUsage.hasGestureSupport = deviceCapabilities.hasTouch
    profile.physicalInteraction.prefersTouchInput = deviceCapabilities.hasTouch
  }

  profile.lastUpdated = new Date().toISOString()
  return profile
}

/**
 * Detect gesture capability from user agent/device
 */
export function detectGestureCapability(): {
  hasTouch: boolean
  hasPressure: boolean
  hasMotion: boolean
} {
  // This would be called client-side
  if (typeof window === 'undefined') {
    return { hasTouch: false, hasPressure: false, hasMotion: false }
  }

  return {
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hasPressure: 'PointerEvent' in window,
    hasMotion: 'DeviceMotionEvent' in window,
  }
}

/**
 * Get gesture prompts for a specific concept type
 */
export function getGesturePromptsForConcept(
  conceptType: 'mathematical' | 'spatial' | 'procedural' | 'abstract',
  profile: EmbodiedProfile
): GesturePrompt[] {
  const prompts = GESTURE_LIBRARY[conceptType] || []

  // Filter based on device capability
  if (!profile.gestureUsage.hasGestureSupport) {
    // Return prompts with alternatives only
    return prompts.filter(p => p.alternatives && p.alternatives.length > 0)
  }

  // Prioritize preferred gesture types
  const preferredTypes = new Set(profile.gestureUsage.preferredGestureTypes)
  return prompts.sort((a, b) => {
    const aPreferred = preferredTypes.has(a.gesture) ? 1 : 0
    const bPreferred = preferredTypes.has(b.gesture) ? 1 : 0
    return bPreferred - aPreferred
  })
}

/**
 * Generate embodied learning activity for a skill
 */
export function generateEmbodiedActivity(
  skillId: string,
  skillName: string,
  conceptType: 'mathematical' | 'spatial' | 'procedural' | 'abstract',
  profile: EmbodiedProfile
): EmbodiedActivity {
  const gestures = getGesturePromptsForConcept(conceptType, profile)

  const activityTypes = {
    mathematical: 'gesture_practice' as const,
    spatial: 'physical_manipulation' as const,
    procedural: 'tracing_practice' as const,
    abstract: 'drawing_exercise' as const,
  }

  const instructions: Record<string, string[]> = {
    mathematical: [
      "As you work through this problem, use your hands to visualize the quantities",
      "When you see growth or increase, spread your fingers apart",
      "For subtraction or decrease, bring your fingers together",
      "Try drawing the equation in the air with your finger",
    ],
    spatial: [
      "Rotate your device or use two fingers to view from different angles",
      "Trace the shapes with your finger to build muscle memory",
      "Try to predict the rotation before making it",
      "Close your eyes and trace the shape in the air",
    ],
    procedural: [
      "Step through each phase using swipe gestures",
      "Connect the steps by drawing lines between them",
      "Practice the sequence until it feels automatic",
      "Verbalize each step as you gesture through it",
    ],
    abstract: [
      "Create a visual diagram using your finger or stylus",
      "Drag related concepts near each other",
      "Draw connections between ideas that relate",
      "Use color coding through different gesture pressures",
    ],
  }

  return {
    id: `embodied-${skillId}-${Date.now()}`,
    type: activityTypes[conceptType],
    skillId,
    duration: 60, // 1 minute default
    instructions: instructions[conceptType],
    gestures: gestures.slice(0, 3), // Limit to 3 gestures per activity
    accessibilityAlternatives: [
      "Visualize the movements mentally if physical gestures aren't possible",
      "Describe the movements aloud",
      "Use a pen and paper to trace or draw",
    ],
    benefitExplanation: `Using physical gestures while learning ${skillName} activates motor areas of your brain, creating stronger memory traces and deeper understanding (Goldin-Meadow, 2019).`,
  }
}

/**
 * Generate embodied learning recommendations based on profile and content
 */
export function generateEmbodiedRecommendations(
  profile: EmbodiedProfile,
  currentSkill: {
    id: string
    name: string
    type: 'mathematical' | 'spatial' | 'procedural' | 'abstract'
    difficulty: number
  },
  sessionContext: {
    sessionDuration: number
    questionsAnswered: number
    recentPerformance: number
  }
): EmbodiedRecommendation[] {
  const recommendations: EmbodiedRecommendation[] = []

  // Higher kinesthetic preference = more embodied activities
  const kinestheticThreshold = profile.modalityPreferences.kinesthetic

  // Generate activity for current skill
  const mainActivity = generateEmbodiedActivity(
    currentSkill.id,
    currentSkill.name,
    currentSkill.type,
    profile
  )

  // Before learning: prep gesture for difficult concepts
  if (currentSkill.difficulty > 0.6) {
    recommendations.push({
      activity: mainActivity,
      priority: kinestheticThreshold > 0.5 ? 3 : 2,
      reason: "Prepare your brain for complex concepts through physical warm-up",
      timing: 'before_learning',
    })
  }

  // During learning: gesture integration
  if (profile.gestureUsage.hasGestureSupport) {
    recommendations.push({
      activity: {
        ...mainActivity,
        type: 'gesture_practice',
        duration: 30,
      },
      priority: 2,
      reason: "Gesturing while thinking enhances understanding and retention",
      timing: 'during_learning',
    })
  }

  // Movement break if session is long
  if (sessionContext.sessionDuration > 15 * 60) { // 15 minutes
    recommendations.push({
      activity: {
        id: 'movement-break',
        type: 'movement_break',
        duration: 60,
        instructions: [
          "Stand up and stretch",
          "Roll your shoulders backward 5 times",
          "Take 3 deep breaths",
          "Shake out your hands",
        ],
        gestures: [],
        accessibilityAlternatives: [
          "If standing isn't possible, do seated stretches",
          "Focus on deep breathing only",
        ],
        benefitExplanation: "Brief physical movement reactivates your brain and improves focus for the next learning segment.",
      },
      priority: sessionContext.sessionDuration > 25 * 60 ? 3 : 1,
      reason: "Physical movement resets attention and enhances subsequent learning",
      timing: 'break',
    })
  }

  // After learning: consolidation through gesture review
  if (sessionContext.recentPerformance < 0.6) {
    recommendations.push({
      activity: {
        ...mainActivity,
        type: 'drawing_exercise',
        duration: 45,
        instructions: [
          "Draw the key concept you just learned",
          "Label the important parts",
          "Show the relationships with arrows",
          "Explain your drawing to yourself",
        ],
      },
      priority: 2,
      reason: "Drawing helps consolidate learning after challenging material",
      timing: 'after_learning',
    })
  }

  return recommendations.sort((a, b) => b.priority - a.priority)
}

/**
 * Update embodied profile based on interaction events
 */
export function updateEmbodiedProfile(
  current: EmbodiedProfile,
  event: {
    type: 'gesture_used' | 'drawing_completed' | 'tracing_done' | 'movement_break_taken'
    gesture?: GestureType
    accuracy?: number
    contentType?: 'mathematical' | 'spatial' | 'procedural' | 'abstract'
    performanceAfter?: number
  }
): EmbodiedProfile {
  const alpha = 0.2 // EMA smoothing
  const updated = { ...current }

  // Update gesture usage
  if (event.type === 'gesture_used' && event.gesture) {
    updated.gestureUsage.gestureFrequency = alpha * 1 + (1 - alpha) * current.gestureUsage.gestureFrequency
    updated.gestureUsage.lastGestureSession = new Date().toISOString()

    // Update preferred gestures
    if (!updated.gestureUsage.preferredGestureTypes.includes(event.gesture)) {
      updated.gestureUsage.preferredGestureTypes.push(event.gesture)
      if (updated.gestureUsage.preferredGestureTypes.length > 5) {
        updated.gestureUsage.preferredGestureTypes.shift()
      }
    }

    if (event.accuracy !== undefined) {
      updated.gestureUsage.gestureAccuracy = alpha * event.accuracy + (1 - alpha) * current.gestureUsage.gestureAccuracy
    }
  }

  // Update physical interaction patterns
  if (event.type === 'drawing_completed') {
    updated.physicalInteraction.usesDrawingTools = true
  }
  if (event.type === 'movement_break_taken') {
    updated.physicalInteraction.movementDuringLearning = true
  }

  // Update modality preferences based on usage
  if (event.type === 'gesture_used' || event.type === 'tracing_done') {
    updated.modalityPreferences.kinesthetic = Math.min(1, current.modalityPreferences.kinesthetic + 0.05)
  }

  // Update performance metrics
  if (event.contentType && event.performanceAfter !== undefined) {
    const perfMap: Record<string, keyof EmbodiedProfile['embodiedPerformance']> = {
      mathematical: 'mathematicalConcepts',
      spatial: 'spatialReasoning',
      procedural: 'proceduralLearning',
      abstract: 'abstractConcepts',
    }
    const key = perfMap[event.contentType]
    if (key) {
      updated.embodiedPerformance[key] = alpha * event.performanceAfter + (1 - alpha) * current.embodiedPerformance[key]
    }
  }

  updated.lastUpdated = new Date().toISOString()
  return updated
}

/**
 * Get accessibility alternatives for a gesture
 */
export function getAccessibilityAlternatives(gesture: GestureType): string[] {
  const alternatives: Record<GestureType, string[]> = {
    tap: ["Click with mouse", "Press Enter key"],
    swipe: ["Use arrow keys", "Click next/previous buttons"],
    pinch: ["Use +/- buttons", "Scroll wheel to zoom"],
    drag: ["Click and use arrow keys", "Tab to select, Enter to place"],
    draw: ["Type your answer", "Describe in words"],
    trace: ["Watch animation instead", "Follow numbered steps"],
    rotate: ["Click rotation buttons", "Use left/right arrows"],
    shake: ["Click refresh button", "Press R key to reset"],
  }

  return alternatives[gesture] || ["Use keyboard navigation"]
}

export default {
  initializeEmbodiedProfile,
  detectGestureCapability,
  getGesturePromptsForConcept,
  generateEmbodiedActivity,
  generateEmbodiedRecommendations,
  updateEmbodiedProfile,
  getAccessibilityAlternatives,
}
