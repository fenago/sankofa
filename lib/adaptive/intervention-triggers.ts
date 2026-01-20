/**
 * Intervention Trigger System
 *
 * Detects conditions that warrant metacognitive or motivational interventions
 * based on learner profile and recent behavior.
 *
 * Metacognitive Triggers:
 * - Overconfidence detection
 * - Underconfidence detection
 * - Help-seeking pattern issues
 *
 * Motivational Triggers:
 * - Low persistence after failure
 * - Success streaks (celebration)
 * - Long session (break suggestion)
 * - Mastery learner doing only easy tasks
 */

import type {
  InverseProfile,
  MetacognitiveIndicators,
  MotivationalIndicators,
} from '@/lib/types/interactions'

// ============================================================================
// TYPES
// ============================================================================

export type TriggerCondition = {
  id: string
  name: string
  dimension: 'metacognitive' | 'motivational'
  check: (context: TriggerContext) => boolean
  priority: 'low' | 'medium' | 'high'
}

export interface TriggerContext {
  profile: InverseProfile | null
  consecutiveSuccesses: number
  consecutiveFailures: number
  currentErrors: number
  sessionDurationMs: number
  lastActivityType?: 'practice' | 'hint' | 'skip' | 'view'
  recentDifficulties: number[] // Last N problem difficulties
}

export interface ActiveTrigger {
  triggerId: string
  triggerName: string
  dimension: 'metacognitive' | 'motivational'
  priority: 'low' | 'medium' | 'high'
  message: string
  actionLabel?: string
  emoji?: string
  dismissKey: string
}

// ============================================================================
// TRIGGER DEFINITIONS
// ============================================================================

const METACOGNITIVE_TRIGGERS: TriggerCondition[] = [
  {
    id: 'overconfidence_high',
    name: 'High Overconfidence',
    dimension: 'metacognitive',
    priority: 'high',
    check: (ctx) => {
      const rate = ctx.profile?.metacognitive_indicators.overconfidenceRate
      return rate !== null && rate !== undefined && rate > 0.4
    },
  },
  {
    id: 'underconfidence_high',
    name: 'High Underconfidence',
    dimension: 'metacognitive',
    priority: 'medium',
    check: (ctx) => {
      const rate = ctx.profile?.metacognitive_indicators.underconfidenceRate
      return rate !== null && rate !== undefined && rate > 0.5
    },
  },
  {
    id: 'help_avoidant_struggling',
    name: 'Avoidant Help-Seeking While Struggling',
    dimension: 'metacognitive',
    priority: 'high',
    check: (ctx) => {
      const pattern = ctx.profile?.metacognitive_indicators.helpSeekingPattern
      return pattern === 'avoidant' && ctx.currentErrors >= 3
    },
  },
  {
    id: 'help_excessive',
    name: 'Excessive Help-Seeking',
    dimension: 'metacognitive',
    priority: 'low',
    check: (ctx) => {
      const pattern = ctx.profile?.metacognitive_indicators.helpSeekingPattern
      return pattern === 'excessive' && ctx.lastActivityType === 'hint'
    },
  },
]

const MOTIVATIONAL_TRIGGERS: TriggerCondition[] = [
  {
    id: 'low_persistence_failure',
    name: 'Low Persistence After Failure',
    dimension: 'motivational',
    priority: 'high',
    check: (ctx) => {
      const persistence = ctx.profile?.motivational_indicators.persistenceScore
      return (
        persistence !== null &&
        persistence !== undefined &&
        persistence < 0.3 &&
        ctx.consecutiveFailures >= 2
      )
    },
  },
  {
    id: 'success_streak',
    name: 'Success Streak',
    dimension: 'motivational',
    priority: 'low',
    check: (ctx) => ctx.consecutiveSuccesses >= 5,
  },
  {
    id: 'long_session',
    name: 'Long Session Break Suggestion',
    dimension: 'motivational',
    priority: 'medium',
    check: (ctx) => {
      const minutes = ctx.sessionDurationMs / (1000 * 60)
      return minutes >= 45
    },
  },
  {
    id: 'mastery_all_easy',
    name: 'Mastery Learner Doing Only Easy Tasks',
    dimension: 'motivational',
    priority: 'low',
    check: (ctx) => {
      const goalOrientation = ctx.profile?.motivational_indicators.goalOrientation
      if (goalOrientation !== 'mastery') return false
      if (ctx.recentDifficulties.length < 5) return false

      const avgDifficulty =
        ctx.recentDifficulties.reduce((a, b) => a + b, 0) / ctx.recentDifficulties.length
      return avgDifficulty < 0.3 && ctx.consecutiveSuccesses >= 8
    },
  },
  {
    id: 'extended_struggle',
    name: 'Extended Struggle',
    dimension: 'motivational',
    priority: 'high',
    check: (ctx) => ctx.consecutiveFailures >= 5,
  },
]

const ALL_TRIGGERS = [...METACOGNITIVE_TRIGGERS, ...MOTIVATIONAL_TRIGGERS]

// ============================================================================
// TRIGGER MESSAGES
// ============================================================================

const TRIGGER_MESSAGES: Record<
  string,
  { message: string; actionLabel?: string; emoji?: string }
> = {
  overconfidence_high: {
    message: 'Take a moment to double-check your answers before submitting.',
    actionLabel: 'Got it',
  },
  underconfidence_high: {
    message: "Trust your preparation - you've been doing better than you think!",
    emoji: '💪',
  },
  help_avoidant_struggling: {
    message: "Struggling a bit? That's okay! Hints are here to help you learn, not just give answers.",
    actionLabel: 'Show hint',
    emoji: '💡',
  },
  help_excessive: {
    message: 'Try working through this one on your own first. You might surprise yourself!',
    emoji: '🌟',
  },
  low_persistence_failure: {
    message: "Don't give up! Mistakes are part of learning. Try breaking this down into smaller steps.",
    actionLabel: 'Get help',
    emoji: '💪',
  },
  success_streak: {
    message: "You're on fire! Keep up the great work!",
    emoji: '🔥',
  },
  long_session: {
    message: "You've been studying hard! Consider taking a short break - it helps with retention.",
    actionLabel: 'Take a break',
    emoji: '☕',
  },
  mastery_all_easy: {
    message: "You're crushing it! Ready to challenge yourself with something harder?",
    actionLabel: 'Try a challenge',
    emoji: '🚀',
  },
  extended_struggle: {
    message: "This is a tough one. Would you like to try a simpler problem first or get some extra help?",
    actionLabel: 'Get help',
    emoji: '🤝',
  },
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Evaluate all triggers and return active ones
 */
export function evaluateTriggers(
  context: TriggerContext,
  dismissedTriggers: string[] = []
): ActiveTrigger[] {
  const active: ActiveTrigger[] = []

  for (const trigger of ALL_TRIGGERS) {
    const dismissKey = getDismissKey(trigger.id, context)

    // Skip if already dismissed
    if (dismissedTriggers.includes(dismissKey)) {
      continue
    }

    // Check if trigger condition is met
    if (trigger.check(context)) {
      const messageData = TRIGGER_MESSAGES[trigger.id]

      if (messageData) {
        active.push({
          triggerId: trigger.id,
          triggerName: trigger.name,
          dimension: trigger.dimension,
          priority: trigger.priority,
          message: messageData.message,
          actionLabel: messageData.actionLabel,
          emoji: messageData.emoji,
          dismissKey,
        })
      }
    }
  }

  // Sort by priority (high first)
  return active.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Evaluate only metacognitive triggers
 */
export function evaluateMetacognitiveTriggers(
  context: TriggerContext,
  dismissedTriggers: string[] = []
): ActiveTrigger[] {
  return evaluateTriggers(context, dismissedTriggers).filter(
    (t) => t.dimension === 'metacognitive'
  )
}

/**
 * Evaluate only motivational triggers
 */
export function evaluateMotivationalTriggers(
  context: TriggerContext,
  dismissedTriggers: string[] = []
): ActiveTrigger[] {
  return evaluateTriggers(context, dismissedTriggers).filter(
    (t) => t.dimension === 'motivational'
  )
}

/**
 * Get the highest priority active trigger
 */
export function getTopTrigger(
  context: TriggerContext,
  dismissedTriggers: string[] = []
): ActiveTrigger | null {
  const triggers = evaluateTriggers(context, dismissedTriggers)
  return triggers[0] ?? null
}

/**
 * Generate a unique dismiss key for a trigger
 * This allows the same trigger to fire again in a new context
 */
function getDismissKey(triggerId: string, context: TriggerContext): string {
  // For session-based triggers, include session marker
  if (triggerId === 'long_session') {
    const sessionMarker = Math.floor(context.sessionDurationMs / (15 * 60 * 1000)) // Every 15 min
    return `${triggerId}-${sessionMarker}`
  }

  // For streak-based triggers, include streak count
  if (triggerId === 'success_streak') {
    const streakMarker = Math.floor(context.consecutiveSuccesses / 5)
    return `${triggerId}-${streakMarker}`
  }

  // For error-based triggers, allow re-triggering after improvement
  if (triggerId === 'help_avoidant_struggling' || triggerId === 'extended_struggle') {
    const errorMarker = Math.floor(context.currentErrors / 3)
    return `${triggerId}-${errorMarker}`
  }

  // Default: use trigger ID only (fires once per session)
  return triggerId
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a trigger context from profile and session data
 */
export function createTriggerContext(
  profile: InverseProfile | null,
  sessionData: {
    consecutiveSuccesses?: number
    consecutiveFailures?: number
    currentErrors?: number
    sessionDurationMs?: number
    lastActivityType?: 'practice' | 'hint' | 'skip' | 'view'
    recentDifficulties?: number[]
  }
): TriggerContext {
  return {
    profile,
    consecutiveSuccesses: sessionData.consecutiveSuccesses ?? 0,
    consecutiveFailures: sessionData.consecutiveFailures ?? 0,
    currentErrors: sessionData.currentErrors ?? 0,
    sessionDurationMs: sessionData.sessionDurationMs ?? 0,
    lastActivityType: sessionData.lastActivityType,
    recentDifficulties: sessionData.recentDifficulties ?? [],
  }
}

/**
 * Check if a specific trigger type is active
 */
export function isTriggerActive(
  triggerId: string,
  context: TriggerContext
): boolean {
  const trigger = ALL_TRIGGERS.find((t) => t.id === triggerId)
  return trigger ? trigger.check(context) : false
}

/**
 * Get all trigger definitions (for debugging/admin)
 */
export function getAllTriggerDefinitions(): TriggerCondition[] {
  return ALL_TRIGGERS
}
