/**
 * Attention & Inattention Contagion Implementation
 *
 * Based on Stojic et al. (2024) - Attention contagion in learning environments
 *
 * Core concept: Attention states spread between nearby learners;
 * both focus and distraction are contagious.
 *
 * Key findings:
 * - Students near distracted peers show 15-25% performance drops
 * - Focus is equally contagious
 * - Eye-tracking shows attention synchronization within 2-3 minutes
 *
 * Since this is a solo learning platform, we adapt the research for:
 * - Virtual study room recommendations
 * - Attention state detection for self-intervention
 * - Environment recommendations
 * - Study group matching
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AttentionState {
  currentLevel: 'deep_focus' | 'focused' | 'neutral' | 'distracted' | 'highly_distracted'
  score: number                        // 0-1, where 1 is deep focus
  trend: 'improving' | 'stable' | 'declining'
  confidenceInAssessment: number       // 0-1
  lastUpdated: string
}

export interface AttentionProfile {
  // Current session state
  currentState: AttentionState

  // Historical patterns
  patterns: {
    averageFocusScore: number          // Historical average (0-1)
    focusDuration: number              // Average minutes of sustained focus
    distractionRecoveryTime: number    // Average seconds to refocus
    peakFocusTimeOfDay: string         // ISO time of best focus
    worstFocusTimeOfDay: string        // ISO time of worst focus
  }

  // Environmental factors
  environment: {
    reportedDistractions: string[]     // User-reported distractions
    optimalEnvironment: EnvironmentProfile | null
    currentEnvironmentScore: number    // 0-1
  }

  // Social learning preferences
  socialLearning: {
    prefersStudyGroups: boolean
    optimalGroupSize: number
    peerFocusCompatibility: number     // 0-1 - how well they match focused peers
  }

  // Contagion susceptibility
  contagionProfile: {
    distractionSusceptibility: number  // 0-1, how easily distracted by others
    focusInfluence: number             // 0-1, how well they pick up focus from others
    canAnchorsOthersFocus: boolean     // Whether they help others focus
  }

  lastUpdated: string
}

export interface EnvironmentProfile {
  noiseLevel: 'silent' | 'quiet' | 'moderate' | 'noisy'
  lighting: 'dim' | 'natural' | 'bright'
  socialPresence: 'alone' | 'quiet_others' | 'collaborative'
  deviceUsage: 'single' | 'multiple'
}

export interface AttentionIndicator {
  type: 'behavioral' | 'temporal' | 'performance'
  signal: string
  weight: number
  direction: 'positive' | 'negative'
}

export interface StudyEnvironmentRecommendation {
  id: string
  type: 'environment' | 'timing' | 'social' | 'intervention'
  priority: number
  title: string
  description: string
  rationale: string
  implementationSteps: string[]
}

export interface VirtualStudyRoomConfig {
  roomId: string
  focusLevel: 'casual' | 'focused' | 'deep_work'
  maxParticipants: number
  features: {
    sharedTimer: boolean
    ambientSounds: boolean
    focusIndicators: boolean
    breakSynchronization: boolean
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ATTENTION_STATE: AttentionState = {
  currentLevel: 'neutral',
  score: 0.5,
  trend: 'stable',
  confidenceInAssessment: 0.3,
  lastUpdated: new Date().toISOString(),
}

const DEFAULT_ATTENTION_PROFILE: AttentionProfile = {
  currentState: DEFAULT_ATTENTION_STATE,
  patterns: {
    averageFocusScore: 0.5,
    focusDuration: 15,
    distractionRecoveryTime: 30,
    peakFocusTimeOfDay: '09:00',
    worstFocusTimeOfDay: '14:00',
  },
  environment: {
    reportedDistractions: [],
    optimalEnvironment: null,
    currentEnvironmentScore: 0.5,
  },
  socialLearning: {
    prefersStudyGroups: false,
    optimalGroupSize: 3,
    peerFocusCompatibility: 0.5,
  },
  contagionProfile: {
    distractionSusceptibility: 0.5,
    focusInfluence: 0.5,
    canAnchorsOthersFocus: false,
  },
  lastUpdated: new Date().toISOString(),
}

// Attention level thresholds
const ATTENTION_THRESHOLDS = {
  deep_focus: 0.85,
  focused: 0.65,
  neutral: 0.45,
  distracted: 0.25,
  // Below 0.25 = highly_distracted
}

// Behavioral signals that indicate attention state
const ATTENTION_INDICATORS: AttentionIndicator[] = [
  // Positive indicators
  { type: 'behavioral', signal: 'consistent_response_times', weight: 0.15, direction: 'positive' },
  { type: 'behavioral', signal: 'thorough_responses', weight: 0.2, direction: 'positive' },
  { type: 'behavioral', signal: 'no_tab_switching', weight: 0.15, direction: 'positive' },
  { type: 'performance', signal: 'improving_accuracy', weight: 0.2, direction: 'positive' },
  { type: 'temporal', signal: 'steady_pacing', weight: 0.1, direction: 'positive' },

  // Negative indicators
  { type: 'behavioral', signal: 'erratic_response_times', weight: 0.15, direction: 'negative' },
  { type: 'behavioral', signal: 'very_short_responses', weight: 0.15, direction: 'negative' },
  { type: 'behavioral', signal: 'rapid_skipping', weight: 0.2, direction: 'negative' },
  { type: 'performance', signal: 'declining_accuracy', weight: 0.2, direction: 'negative' },
  { type: 'temporal', signal: 'long_gaps', weight: 0.15, direction: 'negative' },
]

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize attention profile
 */
export function initializeAttentionProfile(): AttentionProfile {
  return {
    ...DEFAULT_ATTENTION_PROFILE,
    currentState: {
      ...DEFAULT_ATTENTION_STATE,
      lastUpdated: new Date().toISOString(),
    },
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Calculate attention score from behavioral signals
 */
export function calculateAttentionScore(signals: {
  responseTimeVariance: number          // Lower is better (0-1 normalized)
  responseLength: number                // 0-1, longer is usually better
  skipRate: number                      // 0-1, lower is better
  accuracyTrend: number                 // -1 to 1, positive is better
  timeSinceLastInteraction: number      // Seconds since last interaction
  sessionDuration: number               // Minutes in current session
}): number {
  let score = 0.5 // Start neutral

  // Response time consistency (20% weight)
  const timeConsistency = 1 - Math.min(signals.responseTimeVariance, 1)
  score += (timeConsistency - 0.5) * 0.2

  // Response quality/length (20% weight)
  score += (signals.responseLength - 0.5) * 0.2

  // Skip rate (15% weight - inverted)
  score -= signals.skipRate * 0.15

  // Accuracy trend (25% weight)
  score += signals.accuracyTrend * 0.125 // Maps -1 to 1 to -0.125 to 0.125

  // Recency of interaction (10% weight)
  const recencyScore = signals.timeSinceLastInteraction < 60 ? 1 :
                       signals.timeSinceLastInteraction < 180 ? 0.7 :
                       signals.timeSinceLastInteraction < 300 ? 0.4 : 0.1
  score += (recencyScore - 0.5) * 0.1

  // Session fatigue (10% weight - longer sessions = lower attention)
  const fatigueScore = signals.sessionDuration < 15 ? 1 :
                       signals.sessionDuration < 30 ? 0.8 :
                       signals.sessionDuration < 45 ? 0.6 : 0.4
  score += (fatigueScore - 0.5) * 0.1

  return Math.max(0, Math.min(1, score))
}

/**
 * Classify attention level from score
 */
export function classifyAttentionLevel(
  score: number
): 'deep_focus' | 'focused' | 'neutral' | 'distracted' | 'highly_distracted' {
  if (score >= ATTENTION_THRESHOLDS.deep_focus) return 'deep_focus'
  if (score >= ATTENTION_THRESHOLDS.focused) return 'focused'
  if (score >= ATTENTION_THRESHOLDS.neutral) return 'neutral'
  if (score >= ATTENTION_THRESHOLDS.distracted) return 'distracted'
  return 'highly_distracted'
}

/**
 * Detect attention trend from recent scores
 */
export function detectAttentionTrend(
  recentScores: number[] // Most recent first
): 'improving' | 'stable' | 'declining' {
  if (recentScores.length < 3) return 'stable'

  // Calculate moving average slope
  const recent = recentScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const older = recentScores.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(3, recentScores.length - 3)

  if (recentScores.length < 6) {
    // Not enough data, compare first and last
    const diff = recentScores[0] - recentScores[recentScores.length - 1]
    if (diff > 0.1) return 'improving'
    if (diff < -0.1) return 'declining'
    return 'stable'
  }

  const diff = recent - older
  if (diff > 0.1) return 'improving'
  if (diff < -0.1) return 'declining'
  return 'stable'
}

/**
 * Update attention state based on new observation
 */
export function updateAttentionState(
  current: AttentionState,
  newScore: number,
  recentScores: number[]
): AttentionState {
  const alpha = 0.3 // EMA smoothing

  // Smooth the score
  const smoothedScore = alpha * newScore + (1 - alpha) * current.score

  // Update trend
  const allScores = [smoothedScore, ...recentScores]
  const trend = detectAttentionTrend(allScores)

  // Classify level
  const level = classifyAttentionLevel(smoothedScore)

  // Confidence increases with more consistent observations
  const scoreVariance = recentScores.length > 2
    ? Math.sqrt(recentScores.reduce((sum, s) => sum + Math.pow(s - smoothedScore, 2), 0) / recentScores.length)
    : 0.3
  const confidence = Math.min(0.9, 1 - scoreVariance)

  return {
    currentLevel: level,
    score: smoothedScore,
    trend,
    confidenceInAssessment: confidence,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Generate environment recommendations based on attention profile
 */
export function generateEnvironmentRecommendations(
  profile: AttentionProfile
): StudyEnvironmentRecommendation[] {
  const recommendations: StudyEnvironmentRecommendation[] = []
  const { currentState, patterns, contagionProfile } = profile

  // If attention is low, suggest environmental changes
  if (currentState.score < 0.5) {
    recommendations.push({
      id: 'env-change',
      type: 'environment',
      priority: 3,
      title: 'Change Your Environment',
      description: 'A change of scenery can reset your attention',
      rationale: 'Environmental novelty activates the attention system and breaks distraction patterns.',
      implementationSteps: [
        'Move to a different room or location if possible',
        'Clear your desk of unnecessary items',
        'Put your phone in another room',
        'Try using noise-cancelling headphones or ambient sounds',
      ],
    })
  }

  // Time-of-day recommendations
  const currentHour = new Date().getHours()
  const peakHour = parseInt(patterns.peakFocusTimeOfDay.split(':')[0])
  const worstHour = parseInt(patterns.worstFocusTimeOfDay.split(':')[0])

  if (Math.abs(currentHour - worstHour) < 2) {
    recommendations.push({
      id: 'timing-warning',
      type: 'timing',
      priority: 2,
      title: 'Challenging Focus Time',
      description: `You're in your typically lower-focus period (around ${worstHour}:00)`,
      rationale: 'Historical data shows this is when your attention tends to dip.',
      implementationSteps: [
        'Consider doing lighter review rather than learning new material',
        'Take more frequent breaks',
        'Use active learning techniques (practice, teaching) over passive reading',
        `Try to schedule demanding work closer to ${peakHour}:00`,
      ],
    })
  }

  // Social recommendations based on contagion susceptibility
  if (contagionProfile.distractionSusceptibility > 0.6) {
    recommendations.push({
      id: 'isolation-rec',
      type: 'social',
      priority: 2,
      title: 'Solo Study Recommended',
      description: "You're sensitive to others' distraction states",
      rationale: 'Research shows attention states are contagious. Your profile suggests you pick up distraction easily from others.',
      implementationSteps: [
        'Find a quiet, private study space',
        'If in public, face away from distractions',
        'Consider using website blockers during study sessions',
        'If studying with others, choose highly focused partners',
      ],
    })
  } else if (contagionProfile.focusInfluence > 0.6) {
    recommendations.push({
      id: 'group-rec',
      type: 'social',
      priority: 2,
      title: 'Study Group Could Help',
      description: "You benefit from others' focus energy",
      rationale: 'Your profile shows you pick up focus well from concentrated peers.',
      implementationSteps: [
        'Find focused study partners or a library environment',
        'Try virtual co-working sessions',
        'Use body-doubling techniques (studying alongside focused peers)',
        'Join scheduled focus sessions where everyone is working',
      ],
    })
  }

  // Declining trend intervention
  if (currentState.trend === 'declining') {
    recommendations.push({
      id: 'trend-intervention',
      type: 'intervention',
      priority: 3,
      title: 'Attention Declining',
      description: 'Your focus has been dropping - time for a reset',
      rationale: 'Catching attention decline early prevents longer periods of unproductive struggle.',
      implementationSteps: [
        'Take a 5-minute break away from screens',
        'Do some light physical movement',
        'Hydrate and have a small snack if needed',
        'Return with a clear micro-goal for the next 15 minutes',
      ],
    })
  }

  return recommendations.sort((a, b) => b.priority - a.priority)
}

/**
 * Generate virtual study room configuration for the user
 */
export function generateStudyRoomConfig(
  profile: AttentionProfile
): VirtualStudyRoomConfig {
  const { contagionProfile, socialLearning, currentState } = profile

  // Determine focus level based on profile
  let focusLevel: 'casual' | 'focused' | 'deep_work' = 'focused'
  if (currentState.score >= 0.7 && contagionProfile.canAnchorsOthersFocus) {
    focusLevel = 'deep_work'
  } else if (currentState.score < 0.5) {
    focusLevel = 'casual'
  }

  return {
    roomId: `virtual-room-${Date.now()}`,
    focusLevel,
    maxParticipants: socialLearning.optimalGroupSize + 2,
    features: {
      sharedTimer: true,
      ambientSounds: contagionProfile.distractionSusceptibility > 0.5,
      focusIndicators: contagionProfile.focusInfluence > 0.5,
      breakSynchronization: true,
    },
  }
}

/**
 * Update attention profile from session data
 */
export function updateAttentionProfile(
  current: AttentionProfile,
  sessionData: {
    averageResponseTimeVariance: number
    averageResponseLength: number
    skipRate: number
    accuracyTrend: number
    sessionDuration: number
    reportedEnvironment?: Partial<EnvironmentProfile>
    attentionScores: number[]
  }
): AttentionProfile {
  const alpha = 0.2 // EMA smoothing

  // Calculate new attention score
  const latestScore = calculateAttentionScore({
    responseTimeVariance: sessionData.averageResponseTimeVariance,
    responseLength: sessionData.averageResponseLength,
    skipRate: sessionData.skipRate,
    accuracyTrend: sessionData.accuracyTrend,
    timeSinceLastInteraction: 0,
    sessionDuration: sessionData.sessionDuration,
  })

  // Update current state
  const newState = updateAttentionState(
    current.currentState,
    latestScore,
    sessionData.attentionScores
  )

  // Update patterns
  const newPatterns = {
    ...current.patterns,
    averageFocusScore: alpha * latestScore + (1 - alpha) * current.patterns.averageFocusScore,
  }

  // Update time-of-day patterns if this was a good/bad session
  const currentHour = new Date().getHours().toString().padStart(2, '0') + ':00'
  if (latestScore > current.patterns.averageFocusScore + 0.15) {
    newPatterns.peakFocusTimeOfDay = currentHour
  } else if (latestScore < current.patterns.averageFocusScore - 0.15) {
    newPatterns.worstFocusTimeOfDay = currentHour
  }

  // Update environment if reported
  let newEnvironment = current.environment
  if (sessionData.reportedEnvironment) {
    newEnvironment = {
      ...current.environment,
      optimalEnvironment: latestScore > 0.7
        ? { ...current.environment.optimalEnvironment, ...sessionData.reportedEnvironment } as EnvironmentProfile
        : current.environment.optimalEnvironment,
      currentEnvironmentScore: latestScore,
    }
  }

  return {
    ...current,
    currentState: newState,
    patterns: newPatterns,
    environment: newEnvironment,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Calculate peer compatibility for study groups
 */
export function calculatePeerCompatibility(
  userProfile: AttentionProfile,
  peerProfile: AttentionProfile
): {
  compatibility: number
  reason: string
} {
  const user = userProfile.contagionProfile
  const peer = peerProfile.contagionProfile

  // High focus influence + peer who anchors = good match
  if (user.focusInfluence > 0.6 && peer.canAnchorsOthersFocus) {
    return {
      compatibility: 0.9,
      reason: "This peer's focus will positively influence your attention",
    }
  }

  // Both high distraction susceptibility = risky
  if (user.distractionSusceptibility > 0.6 && peer.distractionSusceptibility > 0.6) {
    return {
      compatibility: 0.3,
      reason: "You're both susceptible to distraction - may amplify each other's unfocused states",
    }
  }

  // One anchors, one susceptible = good
  if (
    (user.canAnchorsOthersFocus && peer.focusInfluence > 0.5) ||
    (peer.canAnchorsOthersFocus && user.focusInfluence > 0.5)
  ) {
    return {
      compatibility: 0.8,
      reason: "Good balance - one can anchor focus while the other benefits",
    }
  }

  // Default moderate compatibility
  return {
    compatibility: 0.5,
    reason: "Neutral match - attention states may vary",
  }
}

export default {
  initializeAttentionProfile,
  calculateAttentionScore,
  classifyAttentionLevel,
  detectAttentionTrend,
  updateAttentionState,
  generateEnvironmentRecommendations,
  generateStudyRoomConfig,
  updateAttentionProfile,
  calculatePeerCompatibility,
}
