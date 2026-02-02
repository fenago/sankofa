/**
 * Self-Determination Theory Implementation
 *
 * Based on Ryan & Deci (2020) - Self-determination theory: Basic psychological needs
 * in motivation, development, and wellness.
 *
 * Three core psychological needs:
 * 1. Autonomy - Sense of choice and control
 * 2. Competence - Feeling effective and capable
 * 3. Relatedness - Connection with others
 *
 * Research evidence: d=0.49-0.61 across all three needs
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SDTProfile {
  // Autonomy indicators
  autonomy: {
    pathChoiceFrequency: number       // How often they choose their own path (0-1)
    paceControlUsage: number          // How often they adjust pace settings (0-1)
    contentSelectionRate: number      // How often they select specific content (0-1)
    skipUsageRate: number             // Healthy skip usage indicates autonomy
    overallScore: number              // Composite autonomy score (0-1)
  }

  // Competence indicators
  competence: {
    optimalChallengeRate: number      // % of tasks in ZPD (0-1)
    successRateInZPD: number          // Success when appropriately challenged (0-1)
    masteryGrowthRate: number         // Skills mastered per session
    selfEfficacyIndicator: number     // Inferred from confidence patterns (0-1)
    overallScore: number              // Composite competence score (0-1)
  }

  // Relatedness indicators
  relatedness: {
    peerInteractionRate: number       // Interactions with study groups (0-1)
    sharedContentRate: number         // Content shared with others (0-1)
    collaborativeLearning: number     // Collaborative features used (0-1)
    communityEngagement: number       // Forum/discussion participation (0-1)
    overallScore: number              // Composite relatedness score (0-1)
  }

  // Overall SDT wellness
  overallSDTScore: number             // Composite of all three needs (0-1)
  needFrustration: {
    autonomy: boolean
    competence: boolean
    relatedness: boolean
  }
  motivationType: 'intrinsic' | 'identified' | 'introjected' | 'external' | 'amotivated'
  lastUpdated: string
}

export interface AutonomySupportConfig {
  enablePathChoice: boolean
  enablePaceControl: boolean
  enableContentSelection: boolean
  enableSkillOrder: boolean
  choiceBreadth: 'narrow' | 'moderate' | 'wide'
}

export interface CompetenceSupportConfig {
  targetChallengeLevel: 'easy' | 'optimal' | 'hard'
  feedbackRichness: 'minimal' | 'moderate' | 'detailed'
  progressVisibility: 'hidden' | 'subtle' | 'prominent'
  celebrateMastery: boolean
}

export interface RelatednessSupportConfig {
  enablePeerFeatures: boolean
  enableStudyGroups: boolean
  enableSharing: boolean
  socialComparison: 'none' | 'cooperative' | 'competitive'
}

export interface SDTInterventionConfig {
  type: 'autonomy_boost' | 'competence_boost' | 'relatedness_boost' | 'need_restoration'
  targetNeed: 'autonomy' | 'competence' | 'relatedness'
  actions: string[]
  messages: string[]
  priority: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SDT_DEFAULTS: SDTProfile = {
  autonomy: {
    pathChoiceFrequency: 0.5,
    paceControlUsage: 0.3,
    contentSelectionRate: 0.4,
    skipUsageRate: 0.1,
    overallScore: 0.5,
  },
  competence: {
    optimalChallengeRate: 0.7,
    successRateInZPD: 0.65,
    masteryGrowthRate: 0.5,
    selfEfficacyIndicator: 0.6,
    overallScore: 0.6,
  },
  relatedness: {
    peerInteractionRate: 0.1,
    sharedContentRate: 0.05,
    collaborativeLearning: 0.1,
    communityEngagement: 0.1,
    overallScore: 0.2,
  },
  overallSDTScore: 0.5,
  needFrustration: {
    autonomy: false,
    competence: false,
    relatedness: false,
  },
  motivationType: 'identified',
  lastUpdated: new Date().toISOString(),
}

// Thresholds for need frustration detection
const FRUSTRATION_THRESHOLDS = {
  autonomy: 0.3,      // Low autonomy triggers frustration
  competence: 0.4,    // Low competence triggers frustration
  relatedness: 0.2,   // Very low relatedness triggers frustration
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize a default SDT profile for a new learner
 */
export function initializeSDTProfile(): SDTProfile {
  return {
    ...SDT_DEFAULTS,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Detect need frustration based on current scores
 */
export function detectNeedFrustration(profile: SDTProfile): {
  autonomy: boolean
  competence: boolean
  relatedness: boolean
  any: boolean
} {
  const frustration = {
    autonomy: profile.autonomy.overallScore < FRUSTRATION_THRESHOLDS.autonomy,
    competence: profile.competence.overallScore < FRUSTRATION_THRESHOLDS.competence,
    relatedness: profile.relatedness.overallScore < FRUSTRATION_THRESHOLDS.relatedness,
    any: false,
  }
  frustration.any = frustration.autonomy || frustration.competence || frustration.relatedness
  return frustration
}

/**
 * Classify motivation type based on SDT profile
 *
 * Motivation continuum (Deci & Ryan):
 * Amotivation → External → Introjected → Identified → Integrated → Intrinsic
 */
export function classifyMotivationType(
  profile: SDTProfile
): 'intrinsic' | 'identified' | 'introjected' | 'external' | 'amotivated' {
  const { autonomy, competence, relatedness } = profile

  // High on all three needs = intrinsic motivation
  if (autonomy.overallScore >= 0.7 && competence.overallScore >= 0.7 && relatedness.overallScore >= 0.5) {
    return 'intrinsic'
  }

  // High autonomy and competence, lower relatedness = identified
  if (autonomy.overallScore >= 0.6 && competence.overallScore >= 0.6) {
    return 'identified'
  }

  // Moderate scores with some autonomy = introjected
  if (competence.overallScore >= 0.5 && autonomy.overallScore >= 0.3) {
    return 'introjected'
  }

  // Low autonomy but functional = external regulation
  if (autonomy.overallScore < 0.3 && competence.overallScore >= 0.4) {
    return 'external'
  }

  // Very low on all counts = amotivation
  return 'amotivated'
}

/**
 * Update autonomy indicators based on learner behavior
 */
export function updateAutonomyIndicators(
  current: SDTProfile['autonomy'],
  event: {
    type: 'path_choice' | 'pace_change' | 'content_select' | 'skip' | 'forced_path'
    voluntary: boolean
  }
): SDTProfile['autonomy'] {
  const alpha = 0.15 // EMA smoothing factor

  const updated = { ...current }

  switch (event.type) {
    case 'path_choice':
      updated.pathChoiceFrequency = alpha * 1 + (1 - alpha) * current.pathChoiceFrequency
      break
    case 'pace_change':
      updated.paceControlUsage = alpha * 1 + (1 - alpha) * current.paceControlUsage
      break
    case 'content_select':
      updated.contentSelectionRate = alpha * 1 + (1 - alpha) * current.contentSelectionRate
      break
    case 'skip':
      // Healthy skip rate is around 0.1-0.2
      updated.skipUsageRate = alpha * 1 + (1 - alpha) * current.skipUsageRate
      break
    case 'forced_path':
      // Negative impact on autonomy
      updated.pathChoiceFrequency = alpha * 0 + (1 - alpha) * current.pathChoiceFrequency
      break
  }

  // Recalculate overall score
  updated.overallScore = (
    updated.pathChoiceFrequency * 0.35 +
    updated.paceControlUsage * 0.25 +
    updated.contentSelectionRate * 0.25 +
    Math.min(updated.skipUsageRate * 2, 0.3) * 0.15 // Cap skip contribution
  )

  return updated
}

/**
 * Update competence indicators based on practice outcomes
 */
export function updateCompetenceIndicators(
  current: SDTProfile['competence'],
  event: {
    wasInZPD: boolean
    wasSuccessful: boolean
    masteredSkill: boolean
    confidenceLevel?: number
  }
): SDTProfile['competence'] {
  const alpha = 0.15

  const updated = { ...current }

  // Update ZPD metrics
  if (event.wasInZPD) {
    updated.optimalChallengeRate = alpha * 1 + (1 - alpha) * current.optimalChallengeRate
    if (event.wasSuccessful) {
      updated.successRateInZPD = alpha * 1 + (1 - alpha) * current.successRateInZPD
    } else {
      updated.successRateInZPD = alpha * 0 + (1 - alpha) * current.successRateInZPD
    }
  } else {
    updated.optimalChallengeRate = alpha * 0.5 + (1 - alpha) * current.optimalChallengeRate
  }

  // Mastery growth
  if (event.masteredSkill) {
    updated.masteryGrowthRate = alpha * 1 + (1 - alpha) * current.masteryGrowthRate
  }

  // Self-efficacy from confidence
  if (event.confidenceLevel !== undefined) {
    const calibratedConfidence = Math.min(event.confidenceLevel, 1)
    updated.selfEfficacyIndicator = alpha * calibratedConfidence + (1 - alpha) * current.selfEfficacyIndicator
  }

  // Overall competence score
  updated.overallScore = (
    updated.optimalChallengeRate * 0.25 +
    updated.successRateInZPD * 0.3 +
    updated.masteryGrowthRate * 0.25 +
    updated.selfEfficacyIndicator * 0.2
  )

  return updated
}

/**
 * Update relatedness indicators based on social interactions
 */
export function updateRelatednessIndicators(
  current: SDTProfile['relatedness'],
  event: {
    type: 'peer_interaction' | 'content_shared' | 'collaboration' | 'community_post' | 'isolation'
  }
): SDTProfile['relatedness'] {
  const alpha = 0.2 // Higher alpha for social events (less frequent)

  const updated = { ...current }

  switch (event.type) {
    case 'peer_interaction':
      updated.peerInteractionRate = alpha * 1 + (1 - alpha) * current.peerInteractionRate
      break
    case 'content_shared':
      updated.sharedContentRate = alpha * 1 + (1 - alpha) * current.sharedContentRate
      break
    case 'collaboration':
      updated.collaborativeLearning = alpha * 1 + (1 - alpha) * current.collaborativeLearning
      break
    case 'community_post':
      updated.communityEngagement = alpha * 1 + (1 - alpha) * current.communityEngagement
      break
    case 'isolation':
      // All metrics decay slightly
      updated.peerInteractionRate *= 0.95
      updated.collaborativeLearning *= 0.95
      break
  }

  // Overall relatedness score
  updated.overallScore = (
    updated.peerInteractionRate * 0.3 +
    updated.sharedContentRate * 0.2 +
    updated.collaborativeLearning * 0.3 +
    updated.communityEngagement * 0.2
  )

  return updated
}

/**
 * Generate SDT-based interventions
 */
export function generateSDTInterventions(
  profile: SDTProfile
): SDTInterventionConfig[] {
  const interventions: SDTInterventionConfig[] = []
  const frustration = detectNeedFrustration(profile)

  // Autonomy interventions
  if (frustration.autonomy || profile.autonomy.overallScore < 0.5) {
    interventions.push({
      type: 'autonomy_boost',
      targetNeed: 'autonomy',
      priority: frustration.autonomy ? 3 : 2,
      actions: [
        'offer_skill_choice',
        'enable_pace_control',
        'show_alternative_paths',
        'allow_content_skip',
      ],
      messages: [
        "Would you like to choose what to practice next?",
        "You're in control! Pick the skill that interests you most.",
        "Take your time—there's no rush. Learn at your own pace.",
        "Here are several paths forward. Which one feels right?",
      ],
    })
  }

  // Competence interventions
  if (frustration.competence || profile.competence.overallScore < 0.5) {
    interventions.push({
      type: 'competence_boost',
      targetNeed: 'competence',
      priority: frustration.competence ? 3 : 2,
      actions: [
        'reduce_difficulty',
        'provide_scaffolding',
        'highlight_progress',
        'celebrate_small_wins',
      ],
      messages: [
        "Let's try something a bit easier to build confidence.",
        "You've made great progress! Look how far you've come.",
        "That was challenging—and you handled it well!",
        "Every step forward counts. You're doing better than you think.",
      ],
    })
  }

  // Relatedness interventions
  if (frustration.relatedness || profile.relatedness.overallScore < 0.3) {
    interventions.push({
      type: 'relatedness_boost',
      targetNeed: 'relatedness',
      priority: frustration.relatedness ? 3 : 1,
      actions: [
        'suggest_study_group',
        'enable_peer_sharing',
        'show_community_activity',
        'highlight_shared_learning',
      ],
      messages: [
        "Learning with others can make it more fun! Want to join a study group?",
        "Other learners are working on similar topics. Want to see what they're discovering?",
        "Share your progress with a study buddy for extra motivation!",
        "You're not alone—many others are on this learning journey too.",
      ],
    })
  }

  // Sort by priority
  return interventions.sort((a, b) => b.priority - a.priority)
}

/**
 * Generate autonomy-supportive configuration based on profile
 */
export function generateAutonomySupportConfig(profile: SDTProfile): AutonomySupportConfig {
  const autonomy = profile.autonomy.overallScore

  return {
    enablePathChoice: true, // Always enable for autonomy
    enablePaceControl: true,
    enableContentSelection: autonomy >= 0.3, // Require some autonomous behavior first
    enableSkillOrder: autonomy >= 0.5, // Higher threshold for full control
    choiceBreadth: autonomy < 0.3 ? 'narrow' : autonomy < 0.6 ? 'moderate' : 'wide',
  }
}

/**
 * Generate competence support configuration based on profile
 */
export function generateCompetenceSupportConfig(profile: SDTProfile): CompetenceSupportConfig {
  const competence = profile.competence.overallScore

  return {
    targetChallengeLevel: competence < 0.4 ? 'easy' : competence < 0.7 ? 'optimal' : 'hard',
    feedbackRichness: competence < 0.5 ? 'detailed' : competence < 0.7 ? 'moderate' : 'minimal',
    progressVisibility: competence < 0.4 ? 'prominent' : competence < 0.6 ? 'subtle' : 'subtle',
    celebrateMastery: competence < 0.6, // More celebration for lower competence
  }
}

/**
 * Generate relatedness support configuration
 */
export function generateRelatednessSupportConfig(profile: SDTProfile): RelatednessSupportConfig {
  const relatedness = profile.relatedness.overallScore

  return {
    enablePeerFeatures: true, // Always available
    enableStudyGroups: true,
    enableSharing: true,
    socialComparison: relatedness < 0.3 ? 'cooperative' : 'cooperative', // Always cooperative, never competitive
  }
}

/**
 * Calculate overall SDT wellness score
 */
export function calculateOverallSDTScore(profile: SDTProfile): number {
  // Weighted combination of all three needs
  // Research suggests all three are important, but autonomy and competence
  // have slightly stronger effects on academic outcomes
  return (
    profile.autonomy.overallScore * 0.35 +
    profile.competence.overallScore * 0.40 +
    profile.relatedness.overallScore * 0.25
  )
}

/**
 * Update the complete SDT profile after any event
 */
export function updateSDTProfile(
  current: SDTProfile,
  events: {
    autonomyEvent?: Parameters<typeof updateAutonomyIndicators>[1]
    competenceEvent?: Parameters<typeof updateCompetenceIndicators>[1]
    relatednessEvent?: Parameters<typeof updateRelatednessIndicators>[1]
  }
): SDTProfile {
  const updated: SDTProfile = { ...current }

  if (events.autonomyEvent) {
    updated.autonomy = updateAutonomyIndicators(current.autonomy, events.autonomyEvent)
  }

  if (events.competenceEvent) {
    updated.competence = updateCompetenceIndicators(current.competence, events.competenceEvent)
  }

  if (events.relatednessEvent) {
    updated.relatedness = updateRelatednessIndicators(current.relatedness, events.relatednessEvent)
  }

  // Recalculate derived values
  updated.overallSDTScore = calculateOverallSDTScore(updated)
  updated.needFrustration = detectNeedFrustration(updated)
  updated.motivationType = classifyMotivationType(updated)
  updated.lastUpdated = new Date().toISOString()

  return updated
}

export default {
  initializeSDTProfile,
  detectNeedFrustration,
  classifyMotivationType,
  updateAutonomyIndicators,
  updateCompetenceIndicators,
  updateRelatednessIndicators,
  generateSDTInterventions,
  generateAutonomySupportConfig,
  generateCompetenceSupportConfig,
  generateRelatednessSupportConfig,
  calculateOverallSDTScore,
  updateSDTProfile,
}
