/**
 * Microbreak Scheduler
 * Based on research showing 76% better post-test performance with strategic breaks
 *
 * Core principles:
 * - 60-90 second breaks every 10-15 minutes
 * - Complete cognitive disengagement during break
 * - Brief physical movement or mindfulness
 * - Gradual return to task
 */

export interface MicrobreakConfig {
  // Timing settings
  minSessionDurationMs: number    // Minimum time before suggesting break (default: 10 min)
  maxSessionDurationMs: number    // Maximum time before strongly suggesting break (default: 15 min)
  breakDurationMs: number         // Default break duration (default: 75 seconds)

  // Adaptive settings
  adaptToPerformance: boolean     // Adjust break timing based on performance degradation
  adaptToCognitiveLoad: boolean   // Account for question difficulty

  // Break types enabled
  enableBreathing: boolean
  enableMovement: boolean
  enableMindfulness: boolean
  enableGazeShift: boolean
}

export interface SessionState {
  sessionStartTime: number
  lastBreakTime: number | null
  totalBreaksTaken: number
  totalBreaksSkipped: number
  recentResponseTimes: number[]
  recentCorrectness: boolean[]
  currentCognitiveLoad: number    // 0-1 scale
}

export interface BreakRecommendation {
  shouldBreak: boolean
  urgency: 'none' | 'suggested' | 'recommended' | 'strongly_recommended'
  reason: string
  suggestedBreakType: BreakType
  suggestedDurationMs: number
  timeUntilNextCheck: number
}

export type BreakType = 'breathing' | 'movement' | 'mindfulness' | 'gaze_shift'

export const DEFAULT_CONFIG: MicrobreakConfig = {
  minSessionDurationMs: 10 * 60 * 1000,    // 10 minutes
  maxSessionDurationMs: 15 * 60 * 1000,    // 15 minutes
  breakDurationMs: 75 * 1000,              // 75 seconds
  adaptToPerformance: true,
  adaptToCognitiveLoad: true,
  enableBreathing: true,
  enableMovement: true,
  enableMindfulness: true,
  enableGazeShift: true,
}

/**
 * Calculate optimal break time based on session duration and cognitive load
 */
export function calculateOptimalBreakTime(
  sessionDurationMs: number,
  cognitiveLoad: number,
  config: MicrobreakConfig = DEFAULT_CONFIG
): number {
  // Base interval is the midpoint between min and max
  const baseInterval = (config.minSessionDurationMs + config.maxSessionDurationMs) / 2

  // Higher cognitive load = shorter intervals
  const loadFactor = 1 - (cognitiveLoad * 0.3)  // 0.7 to 1.0 multiplier

  return Math.floor(baseInterval * loadFactor)
}

/**
 * Detect attention fatigue from response patterns
 */
export function detectAttentionFatigue(sessionState: SessionState): {
  fatigueLevel: number
  indicators: string[]
} {
  const indicators: string[] = []
  let fatigueScore = 0

  // Check response time trend (increasing times suggest fatigue)
  if (sessionState.recentResponseTimes.length >= 5) {
    const recent = sessionState.recentResponseTimes.slice(-5)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const older = sessionState.recentResponseTimes.slice(-10, -5)

    if (older.length > 0) {
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

      if (recentAvg > olderAvg * 1.3) {  // 30% slower
        fatigueScore += 0.3
        indicators.push('Response times increasing')
      }
    }

    // Check for high variance (inconsistent attention)
    const variance = calculateVariance(recent)
    const cv = Math.sqrt(variance) / recentAvg  // Coefficient of variation

    if (cv > 0.5) {  // High variability
      fatigueScore += 0.2
      indicators.push('Inconsistent response times')
    }
  }

  // Check accuracy trend
  if (sessionState.recentCorrectness.length >= 5) {
    const recentAccuracy = sessionState.recentCorrectness.slice(-5)
      .filter(Boolean).length / 5
    const olderCorrectness = sessionState.recentCorrectness.slice(-10, -5)

    if (olderCorrectness.length > 0) {
      const olderAccuracy = olderCorrectness.filter(Boolean).length / olderCorrectness.length

      if (recentAccuracy < olderAccuracy - 0.2) {  // 20% accuracy drop
        fatigueScore += 0.3
        indicators.push('Accuracy declining')
      }
    }
  }

  // Time since last break
  const now = Date.now()
  const timeSinceBreak = sessionState.lastBreakTime
    ? now - sessionState.lastBreakTime
    : now - sessionState.sessionStartTime

  if (timeSinceBreak > 15 * 60 * 1000) {  // 15+ minutes
    fatigueScore += 0.4
    indicators.push('Extended time without break')
  } else if (timeSinceBreak > 10 * 60 * 1000) {  // 10-15 minutes
    fatigueScore += 0.2
    indicators.push('Approaching recommended break time')
  }

  return {
    fatigueLevel: Math.min(1, fatigueScore),
    indicators,
  }
}

/**
 * Get break recommendation based on current session state
 */
export function getBreakRecommendation(
  sessionState: SessionState,
  config: MicrobreakConfig = DEFAULT_CONFIG
): BreakRecommendation {
  const now = Date.now()
  const timeSinceStart = now - sessionState.sessionStartTime
  const timeSinceBreak = sessionState.lastBreakTime
    ? now - sessionState.lastBreakTime
    : timeSinceStart

  // Not enough time elapsed
  if (timeSinceBreak < config.minSessionDurationMs) {
    return {
      shouldBreak: false,
      urgency: 'none',
      reason: 'Session in progress',
      suggestedBreakType: 'breathing',
      suggestedDurationMs: config.breakDurationMs,
      timeUntilNextCheck: config.minSessionDurationMs - timeSinceBreak,
    }
  }

  // Check fatigue indicators
  const { fatigueLevel, indicators } = detectAttentionFatigue(sessionState)

  // Determine urgency
  let urgency: BreakRecommendation['urgency'] = 'none'
  let reason = ''

  if (timeSinceBreak >= config.maxSessionDurationMs || fatigueLevel >= 0.7) {
    urgency = 'strongly_recommended'
    reason = indicators.length > 0
      ? indicators.join('. ')
      : 'Maximum session duration reached'
  } else if (timeSinceBreak >= config.minSessionDurationMs || fatigueLevel >= 0.5) {
    urgency = 'recommended'
    reason = indicators.length > 0
      ? indicators.join('. ')
      : 'Optimal break time reached'
  } else if (fatigueLevel >= 0.3) {
    urgency = 'suggested'
    reason = indicators.join('. ')
  }

  // Select break type based on cognitive load and time
  const breakType = selectBreakType(sessionState, config)

  // Adjust duration based on fatigue level
  const adjustedDuration = Math.floor(
    config.breakDurationMs * (1 + fatigueLevel * 0.3)
  )

  return {
    shouldBreak: urgency !== 'none',
    urgency,
    reason,
    suggestedBreakType: breakType,
    suggestedDurationMs: Math.min(adjustedDuration, 120 * 1000), // Max 2 min
    timeUntilNextCheck: urgency === 'none' ? 60 * 1000 : 30 * 1000,
  }
}

/**
 * Select the most appropriate break type
 */
function selectBreakType(
  sessionState: SessionState,
  config: MicrobreakConfig
): BreakType {
  const availableTypes: BreakType[] = []

  if (config.enableBreathing) availableTypes.push('breathing')
  if (config.enableMovement) availableTypes.push('movement')
  if (config.enableMindfulness) availableTypes.push('mindfulness')
  if (config.enableGazeShift) availableTypes.push('gaze_shift')

  if (availableTypes.length === 0) {
    return 'breathing'  // Fallback
  }

  // High cognitive load → prefer mindfulness or breathing
  if (sessionState.currentCognitiveLoad > 0.7) {
    if (config.enableBreathing) return 'breathing'
    if (config.enableMindfulness) return 'mindfulness'
  }

  // Long session → prefer movement
  const sessionDuration = Date.now() - sessionState.sessionStartTime
  if (sessionDuration > 20 * 60 * 1000 && config.enableMovement) {
    return 'movement'
  }

  // Eye strain → gaze shift
  if (sessionState.recentResponseTimes.length > 20 && config.enableGazeShift) {
    return 'gaze_shift'
  }

  // Rotate through types to add variety
  const breakIndex = sessionState.totalBreaksTaken % availableTypes.length
  return availableTypes[breakIndex]
}

/**
 * Measure post-break recovery effectiveness
 */
export function measurePostBreakRecovery(
  preBreakResponseTimes: number[],
  postBreakResponseTimes: number[]
): {
  recoveryScore: number
  improvement: number
  recommendation: string
} {
  if (preBreakResponseTimes.length < 3 || postBreakResponseTimes.length < 3) {
    return {
      recoveryScore: 0.5,
      improvement: 0,
      recommendation: 'Not enough data to measure recovery',
    }
  }

  const preAvg = preBreakResponseTimes.reduce((a, b) => a + b, 0) / preBreakResponseTimes.length
  const postAvg = postBreakResponseTimes.reduce((a, b) => a + b, 0) / postBreakResponseTimes.length

  const improvement = (preAvg - postAvg) / preAvg  // Positive = faster after break

  let recoveryScore: number
  let recommendation: string

  if (improvement > 0.2) {
    recoveryScore = 1.0
    recommendation = 'Excellent recovery! The break significantly improved your focus.'
  } else if (improvement > 0.1) {
    recoveryScore = 0.8
    recommendation = 'Good recovery. Consider taking breaks at this interval.'
  } else if (improvement > 0) {
    recoveryScore = 0.6
    recommendation = 'Moderate recovery. Try a longer break next time.'
  } else if (improvement > -0.1) {
    recoveryScore = 0.4
    recommendation = 'Minimal change. You may benefit from a different break activity.'
  } else {
    recoveryScore = 0.2
    recommendation = 'Performance still declining. Consider a longer rest period.'
  }

  return {
    recoveryScore,
    improvement,
    recommendation,
  }
}

/**
 * Create initial session state
 */
export function createSessionState(): SessionState {
  return {
    sessionStartTime: Date.now(),
    lastBreakTime: null,
    totalBreaksTaken: 0,
    totalBreaksSkipped: 0,
    recentResponseTimes: [],
    recentCorrectness: [],
    currentCognitiveLoad: 0.5,
  }
}

/**
 * Update session state with new response
 */
export function recordResponse(
  state: SessionState,
  responseTimeMs: number,
  isCorrect: boolean,
  cognitiveLoad?: number
): SessionState {
  return {
    ...state,
    recentResponseTimes: [...state.recentResponseTimes.slice(-19), responseTimeMs],
    recentCorrectness: [...state.recentCorrectness.slice(-19), isCorrect],
    currentCognitiveLoad: cognitiveLoad ?? state.currentCognitiveLoad,
  }
}

/**
 * Update session state after break
 */
export function recordBreak(
  state: SessionState,
  wasCompleted: boolean
): SessionState {
  return {
    ...state,
    lastBreakTime: Date.now(),
    totalBreaksTaken: wasCompleted ? state.totalBreaksTaken + 1 : state.totalBreaksTaken,
    totalBreaksSkipped: wasCompleted ? state.totalBreaksSkipped : state.totalBreaksSkipped + 1,
  }
}

// Utility function
function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
  return numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length
}
