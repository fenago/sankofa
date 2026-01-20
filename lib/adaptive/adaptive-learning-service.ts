/**
 * Adaptive Learning Service
 *
 * Integrates the inverse profile's 5 dimensions into adaptive learning recommendations.
 * Provides personalized scaffolding, help-seeking prompts, engagement interventions,
 * and "Why this recommendation?" explanations.
 *
 * Based on research in:
 * - Zone of Proximal Development (Vygotsky, 1978)
 * - Cognitive Load Theory (Sweller, 1988)
 * - Self-Regulated Learning (Zimmerman, 2002)
 */

import type { SkillNode } from '@/lib/types/graph'
import type {
  InverseProfile,
  CognitiveIndicators,
  MetacognitiveIndicators,
  MotivationalIndicators,
  ExpertiseLevel,
  HelpSeekingPattern,
  GoalOrientation,
} from '@/lib/types/interactions'

// ============================================================================
// TYPES
// ============================================================================

export interface RecommendationReason {
  factor: string
  weight: number
  description: string
  profileDimension: 'knowledge' | 'cognitive' | 'metacognitive' | 'motivational' | 'behavioral'
}

export interface LearningAdjustments {
  scaffoldLevel: 1 | 2 | 3 | 4
  difficultyAdjustment: number // -0.3 to +0.3
  cognitiveLoadLimit: 'low' | 'medium' | 'high'
  helpPrompt?: MetacognitivePrompt
  motivationalIntervention?: MotivationalIntervention
}

export interface MetacognitivePrompt {
  type: 'overconfidence' | 'underconfidence' | 'help_avoidant' | 'help_excessive'
  message: string
  actionLabel?: string
  priority: 'low' | 'medium' | 'high'
}

export interface MotivationalIntervention {
  type: 'persistence' | 'celebration' | 'break_suggestion' | 'challenge_prompt'
  message: string
  emoji?: string
  priority: 'low' | 'medium' | 'high'
}

export interface AdaptiveRecommendation {
  skillId: string
  skill: SkillNode
  score: number
  reasons: RecommendationReason[]
  adjustments: LearningAdjustments
  whyExplanation: string
}

export interface ZPDSkillWithState {
  skill: SkillNode
  readinessScore: number
  prerequisitesMastered: string[]
  prerequisitesPending: string[]
}

export interface AdaptiveContext {
  profile: InverseProfile | null
  zpdSkills: ZPDSkillWithState[]
  recentPerformance?: {
    consecutiveSuccesses: number
    consecutiveFailures: number
    sessionDurationMs: number
  }
}

export interface AdaptiveRecommendationsResult {
  recommendations: AdaptiveRecommendation[]
  activeInterventions: {
    metacognitive?: MetacognitivePrompt
    motivational?: MotivationalIntervention
  }
  profileSummary: {
    expertiseLevel: ExpertiseLevel
    optimalComplexity: number | null
    helpSeekingPattern: HelpSeekingPattern
    goalOrientation: GoalOrientation
  }
}

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

const RANKING_WEIGHTS = {
  readiness: 0.40,
  cognitiveMatch: 0.25,
  motivationalFit: 0.15,
  urgency: 0.20,
}

// Time multipliers for different expertise levels
const TIME_MULTIPLIERS: Record<ExpertiseLevel, number> = {
  novice: 1.5,
  beginner: 1.3,
  intermediate: 1.0,
  advanced: 0.85,
  expert: 0.7,
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Generate adaptive recommendations based on profile and ZPD skills
 */
export function generateAdaptiveRecommendations(
  context: AdaptiveContext
): AdaptiveRecommendationsResult {
  const { profile, zpdSkills, recentPerformance } = context

  // If no profile, return basic recommendations
  if (!profile) {
    return {
      recommendations: zpdSkills.slice(0, 5).map((zpd) => ({
        skillId: zpd.skill.id,
        skill: zpd.skill,
        score: zpd.readinessScore,
        reasons: [
          {
            factor: 'readiness',
            weight: 1.0,
            description: 'Prerequisites met',
            profileDimension: 'knowledge' as const,
          },
        ],
        adjustments: getDefaultAdjustments(),
        whyExplanation: 'This skill has all prerequisites completed and is ready to learn.',
      })),
      activeInterventions: {},
      profileSummary: {
        expertiseLevel: 'beginner',
        optimalComplexity: null,
        helpSeekingPattern: 'unknown',
        goalOrientation: 'unknown',
      },
    }
  }

  // Filter skills by cognitive load threshold
  const filteredSkills = filterByProfile(zpdSkills, profile.cognitive_indicators)

  // Rank skills using weighted factors
  const rankedSkills = rankByProfile(filteredSkills, profile)

  // Generate recommendations with explanations
  const recommendations = rankedSkills.slice(0, 5).map((ranked) =>
    buildRecommendation(ranked.zpd, ranked.scores, profile, recentPerformance)
  )

  // Generate active interventions
  const activeInterventions = generateInterventions(profile, recentPerformance)

  return {
    recommendations,
    activeInterventions,
    profileSummary: {
      expertiseLevel: profile.cognitive_indicators.expertiseLevel,
      optimalComplexity: profile.cognitive_indicators.optimalComplexityLevel,
      helpSeekingPattern: profile.metacognitive_indicators.helpSeekingPattern,
      goalOrientation: profile.motivational_indicators.goalOrientation,
    },
  }
}

/**
 * Filter ZPD skills by cognitive load threshold
 */
function filterByProfile(
  skills: ZPDSkillWithState[],
  cognitive: CognitiveIndicators
): ZPDSkillWithState[] {
  const threshold = cognitive.cognitiveLoadThreshold ?? 0.7

  return skills.filter((zpd) => {
    const skill = zpd.skill

    // Check cognitive load estimate
    const loadScore = getLoadScore(skill.cognitiveLoadEstimate)
    if (loadScore > threshold + 0.1) {
      return false // Skip skills that exceed cognitive load threshold
    }

    // For low working memory, prefer lower element interactivity
    if (cognitive.workingMemoryIndicator === 'low') {
      if (skill.elementInteractivity === 'high') {
        return false
      }
    }

    return true
  })
}

function getLoadScore(load: 'low' | 'medium' | 'high' | undefined): number {
  switch (load) {
    case 'low':
      return 0.3
    case 'medium':
      return 0.5
    case 'high':
      return 0.8
    default:
      return 0.5
  }
}

/**
 * Rank ZPD skills using weighted factors from profile
 */
function rankByProfile(
  skills: ZPDSkillWithState[],
  profile: InverseProfile
): { zpd: ZPDSkillWithState; scores: Record<string, number>; total: number }[] {
  const cognitive = profile.cognitive_indicators
  const motivational = profile.motivational_indicators

  const scored = skills.map((zpd) => {
    const skill = zpd.skill

    // 1. Readiness score (from ZPD calculation)
    const readinessScore = zpd.readinessScore

    // 2. Cognitive match score
    const cognitiveMatch = computeCognitiveMatch(skill, cognitive)

    // 3. Motivational fit score
    const motivationalFit = computeMotivationalFit(skill, motivational)

    // 4. Urgency score (threshold concepts, knowledge gaps)
    const urgency = computeUrgency(skill, profile.knowledge_state)

    // Weighted total
    const total =
      readinessScore * RANKING_WEIGHTS.readiness +
      cognitiveMatch * RANKING_WEIGHTS.cognitiveMatch +
      motivationalFit * RANKING_WEIGHTS.motivationalFit +
      urgency * RANKING_WEIGHTS.urgency

    return {
      zpd,
      scores: {
        readiness: readinessScore,
        cognitiveMatch,
        motivationalFit,
        urgency,
      },
      total,
    }
  })

  // Sort by total score descending
  return scored.sort((a, b) => b.total - a.total)
}

function computeCognitiveMatch(skill: SkillNode, cognitive: CognitiveIndicators): number {
  const optimalComplexity = cognitive.optimalComplexityLevel ?? 0.5
  const skillDifficulty = (skill.difficulty ?? 5) / 10

  // Score based on how close skill difficulty is to optimal complexity
  const distance = Math.abs(skillDifficulty - optimalComplexity)
  const match = 1 - Math.min(distance * 2, 1)

  // Bonus for matching cognitive load
  const loadScore = getLoadScore(skill.cognitiveLoadEstimate)
  const threshold = cognitive.cognitiveLoadThreshold ?? 0.7
  const loadMatch = loadScore <= threshold ? 1 : 0.5

  return match * 0.7 + loadMatch * 0.3
}

function computeMotivationalFit(
  skill: SkillNode,
  motivational: MotivationalIndicators
): number {
  const goalOrientation = motivational.goalOrientation
  const persistence = motivational.persistenceScore ?? 0.5
  const difficulty = (skill.difficulty ?? 5) / 10

  switch (goalOrientation) {
    case 'mastery':
      // Mastery-oriented: prefer challenging but achievable
      return difficulty >= 0.5 && difficulty <= 0.8 ? 1 : 0.6

    case 'performance':
      // Performance-oriented: prefer easier tasks for quick wins
      return difficulty <= 0.5 ? 1 : 0.5

    case 'avoidance':
      // Avoidance-oriented: prefer very easy tasks
      return difficulty <= 0.3 ? 1 : 0.3

    default:
      // Unknown: use persistence as proxy
      if (persistence > 0.6) {
        return difficulty >= 0.4 && difficulty <= 0.7 ? 1 : 0.7
      }
      return difficulty <= 0.5 ? 1 : 0.6
  }
}

function computeUrgency(
  skill: SkillNode,
  knowledgeState: InverseProfile['knowledge_state']
): number {
  let urgency = 0

  // Threshold concepts are high priority
  if (skill.isThresholdConcept) {
    urgency += 0.4
  }

  // Skills in knowledge gaps are urgent
  if (knowledgeState.knowledgeGaps.includes(skill.id)) {
    urgency += 0.3
  }

  // Skills with misconceptions need attention
  if (knowledgeState.misconceptions.includes(skill.id)) {
    urgency += 0.3
  }

  return Math.min(urgency, 1)
}

/**
 * Build a complete recommendation with adjustments and explanation
 */
function buildRecommendation(
  zpd: ZPDSkillWithState,
  scores: Record<string, number>,
  profile: InverseProfile,
  recentPerformance?: AdaptiveContext['recentPerformance']
): AdaptiveRecommendation {
  const skill = zpd.skill
  const cognitive = profile.cognitive_indicators
  const metacognitive = profile.metacognitive_indicators
  const motivational = profile.motivational_indicators

  // Build reasons
  const reasons: RecommendationReason[] = []

  if (scores.readiness >= 0.7) {
    reasons.push({
      factor: 'High readiness',
      weight: scores.readiness,
      description: 'All prerequisites mastered',
      profileDimension: 'knowledge',
    })
  }

  if (scores.cognitiveMatch >= 0.7) {
    reasons.push({
      factor: 'Optimal difficulty',
      weight: scores.cognitiveMatch,
      description: 'Matches your current skill level',
      profileDimension: 'cognitive',
    })
  }

  if (scores.motivationalFit >= 0.7) {
    reasons.push({
      factor: 'Learning style fit',
      weight: scores.motivationalFit,
      description: getMotivationalFitReason(motivational.goalOrientation),
      profileDimension: 'motivational',
    })
  }

  if (scores.urgency >= 0.3) {
    reasons.push({
      factor: 'Priority skill',
      weight: scores.urgency,
      description: skill.isThresholdConcept
        ? 'This is a threshold concept that unlocks new understanding'
        : 'Addresses a knowledge gap',
      profileDimension: 'knowledge',
    })
  }

  // Calculate adjustments
  const adjustments = calculateAdjustments(skill, cognitive, metacognitive, motivational, recentPerformance)

  // Generate explanation
  const whyExplanation = generateExplanation(skill, reasons, cognitive, motivational)

  const totalScore =
    scores.readiness * RANKING_WEIGHTS.readiness +
    scores.cognitiveMatch * RANKING_WEIGHTS.cognitiveMatch +
    scores.motivationalFit * RANKING_WEIGHTS.motivationalFit +
    scores.urgency * RANKING_WEIGHTS.urgency

  return {
    skillId: skill.id,
    skill,
    score: totalScore,
    reasons,
    adjustments,
    whyExplanation,
  }
}

function getMotivationalFitReason(goalOrientation: GoalOrientation): string {
  switch (goalOrientation) {
    case 'mastery':
      return 'Provides the right level of challenge for deep learning'
    case 'performance':
      return 'Good opportunity for demonstrating competence'
    case 'avoidance':
      return 'Manageable task to build confidence'
    default:
      return 'Well-suited for your learning style'
  }
}

/**
 * Calculate learning adjustments based on profile
 */
function calculateAdjustments(
  skill: SkillNode,
  cognitive: CognitiveIndicators,
  metacognitive: MetacognitiveIndicators,
  motivational: MotivationalIndicators,
  recentPerformance?: AdaptiveContext['recentPerformance']
): LearningAdjustments {
  // Base scaffold level from expertise
  let scaffoldLevel = expertiseToScaffold(cognitive.expertiseLevel)

  // Adjust for help-seeking pattern
  if (metacognitive.helpSeekingPattern === 'avoidant') {
    // Provide more scaffolding for avoidant learners
    scaffoldLevel = Math.max(1, scaffoldLevel - 1) as 1 | 2 | 3 | 4
  } else if (metacognitive.helpSeekingPattern === 'excessive') {
    // Encourage independence
    scaffoldLevel = Math.min(4, scaffoldLevel + 1) as 1 | 2 | 3 | 4
  }

  // Difficulty adjustment
  let difficultyAdjustment = 0

  if (cognitive.expertiseLevel === 'novice' || cognitive.expertiseLevel === 'beginner') {
    difficultyAdjustment = -0.15
  } else if (cognitive.expertiseLevel === 'advanced' || cognitive.expertiseLevel === 'expert') {
    difficultyAdjustment = 0.1
  }

  // Adjust based on recent performance
  if (recentPerformance) {
    if (recentPerformance.consecutiveFailures >= 3) {
      difficultyAdjustment -= 0.1
      scaffoldLevel = Math.max(1, scaffoldLevel - 1) as 1 | 2 | 3 | 4
    } else if (recentPerformance.consecutiveSuccesses >= 5) {
      difficultyAdjustment += 0.05
    }
  }

  // Cognitive load limit
  const cognitiveLoadLimit = cognitive.workingMemoryIndicator === 'low'
    ? 'low'
    : cognitive.workingMemoryIndicator === 'high'
      ? 'high'
      : 'medium'

  // Help prompt for metacognitive issues
  let helpPrompt: MetacognitivePrompt | undefined

  if (metacognitive.overconfidenceRate !== null && metacognitive.overconfidenceRate > 0.4) {
    helpPrompt = {
      type: 'overconfidence',
      message: 'Take a moment to double-check your answers before submitting.',
      actionLabel: 'Review my work',
      priority: 'medium',
    }
  } else if (metacognitive.underconfidenceRate !== null && metacognitive.underconfidenceRate > 0.5) {
    helpPrompt = {
      type: 'underconfidence',
      message: 'Trust your preparation - you know more than you think!',
      priority: 'low',
    }
  } else if (metacognitive.helpSeekingPattern === 'avoidant') {
    helpPrompt = {
      type: 'help_avoidant',
      message: 'Hints are designed to help you learn, not just give answers. Use them when stuck!',
      actionLabel: 'Show hint',
      priority: 'medium',
    }
  } else if (metacognitive.helpSeekingPattern === 'excessive') {
    helpPrompt = {
      type: 'help_excessive',
      message: 'Try working through this one on your own first. You can do it!',
      priority: 'low',
    }
  }

  return {
    scaffoldLevel,
    difficultyAdjustment,
    cognitiveLoadLimit,
    helpPrompt,
  }
}

function expertiseToScaffold(expertise: ExpertiseLevel): 1 | 2 | 3 | 4 {
  switch (expertise) {
    case 'novice':
      return 1
    case 'beginner':
      return 2
    case 'intermediate':
      return 3
    case 'advanced':
    case 'expert':
      return 4
  }
}

/**
 * Generate a human-readable explanation
 */
function generateExplanation(
  skill: SkillNode,
  reasons: RecommendationReason[],
  cognitive: CognitiveIndicators,
  motivational: MotivationalIndicators
): string {
  const parts: string[] = []

  // Start with skill type context
  if (skill.isThresholdConcept) {
    parts.push(
      `"${skill.name}" is a threshold concept that will transform your understanding of this topic.`
    )
  } else {
    parts.push(`"${skill.name}" is recommended based on your learning profile.`)
  }

  // Add top reasons
  const topReasons = reasons.slice(0, 2)
  if (topReasons.length > 0) {
    const reasonTexts = topReasons.map((r) => r.description.toLowerCase())
    parts.push(`This skill ${reasonTexts.join(' and ')}.`)
  }

  // Add personalization note
  if (cognitive.expertiseLevel === 'beginner' || cognitive.expertiseLevel === 'novice') {
    parts.push("We'll provide extra guidance as you work through this.")
  } else if (cognitive.expertiseLevel === 'advanced' || cognitive.expertiseLevel === 'expert') {
    parts.push("Given your expertise, you may move through this quickly.")
  }

  // Add time estimate adjustment
  const timeMultiplier = TIME_MULTIPLIERS[cognitive.expertiseLevel]
  const baseTime = skill.estimatedMinutes ?? 30
  const adjustedTime = Math.round(baseTime * timeMultiplier)
  if (adjustedTime !== baseTime) {
    parts.push(`Estimated time: ~${adjustedTime} minutes.`)
  }

  return parts.join(' ')
}

/**
 * Generate active interventions based on profile state
 */
function generateInterventions(
  profile: InverseProfile,
  recentPerformance?: AdaptiveContext['recentPerformance']
): { metacognitive?: MetacognitivePrompt; motivational?: MotivationalIntervention } {
  const metacognitive = profile.metacognitive_indicators
  const motivational = profile.motivational_indicators

  const interventions: {
    metacognitive?: MetacognitivePrompt
    motivational?: MotivationalIntervention
  } = {}

  // Metacognitive interventions
  if (metacognitive.overconfidenceRate !== null && metacognitive.overconfidenceRate > 0.4) {
    interventions.metacognitive = {
      type: 'overconfidence',
      message: 'Your confidence sometimes exceeds your accuracy. Consider double-checking answers.',
      actionLabel: 'Learn more',
      priority: 'high',
    }
  } else if (
    metacognitive.helpSeekingPattern === 'avoidant' &&
    recentPerformance?.consecutiveFailures &&
    recentPerformance.consecutiveFailures >= 3
  ) {
    interventions.metacognitive = {
      type: 'help_avoidant',
      message: 'Struggling a bit? Hints are here to help you learn, not just give answers.',
      actionLabel: 'Use a hint',
      priority: 'high',
    }
  }

  // Motivational interventions
  if (
    motivational.persistenceScore !== null &&
    motivational.persistenceScore < 0.3 &&
    recentPerformance?.consecutiveFailures &&
    recentPerformance.consecutiveFailures >= 2
  ) {
    interventions.motivational = {
      type: 'persistence',
      message: "Don't give up! Mistakes are part of learning. Try breaking this down into smaller steps.",
      emoji: '💪',
      priority: 'high',
    }
  } else if (recentPerformance?.consecutiveSuccesses && recentPerformance.consecutiveSuccesses >= 5) {
    interventions.motivational = {
      type: 'celebration',
      message: "You're on fire! 5 correct answers in a row!",
      emoji: '🔥',
      priority: 'low',
    }
  }

  // Session duration check
  if (recentPerformance?.sessionDurationMs) {
    const minutesActive = recentPerformance.sessionDurationMs / (1000 * 60)
    if (minutesActive >= 45) {
      interventions.motivational = {
        type: 'break_suggestion',
        message: "You've been studying for a while. A short break can help consolidate learning!",
        emoji: '☕',
        priority: 'medium',
      }
    }
  }

  // Challenge prompt for mastery-oriented learners doing only easy tasks
  if (
    motivational.goalOrientation === 'mastery' &&
    recentPerformance?.consecutiveSuccesses &&
    recentPerformance.consecutiveSuccesses >= 8
  ) {
    interventions.motivational = {
      type: 'challenge_prompt',
      message: 'Ready for a bigger challenge? Try something more difficult!',
      emoji: '🚀',
      priority: 'low',
    }
  }

  return interventions
}

/**
 * Get default adjustments when no profile is available
 */
function getDefaultAdjustments(): LearningAdjustments {
  return {
    scaffoldLevel: 2,
    difficultyAdjustment: 0,
    cognitiveLoadLimit: 'medium',
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Adjust estimated time based on expertise level
 */
export function adjustTimeEstimate(
  baseMinutes: number,
  expertiseLevel: ExpertiseLevel
): number {
  const multiplier = TIME_MULTIPLIERS[expertiseLevel]
  return Math.round(baseMinutes * multiplier)
}

/**
 * Get the next best skill based on profile
 */
export function getNextBestSkill(context: AdaptiveContext): AdaptiveRecommendation | null {
  const result = generateAdaptiveRecommendations(context)
  return result.recommendations[0] ?? null
}

/**
 * Check if an intervention should be shown
 */
export function shouldShowIntervention(
  intervention: MetacognitivePrompt | MotivationalIntervention,
  dismissedInterventions: string[]
): boolean {
  const key = `${intervention.type}-${intervention.message.slice(0, 20)}`
  return !dismissedInterventions.includes(key)
}
