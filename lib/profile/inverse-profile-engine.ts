/**
 * Inverse Profile Engine
 *
 * Computes learner profiles from interaction data using statistical inference.
 * The engine analyzes 5 dimensions:
 * 1. Knowledge State - mastery levels, gaps, ZPD
 * 2. Cognitive Indicators - working memory, expertise level
 * 3. Metacognitive Indicators - calibration, help-seeking
 * 4. Motivational Indicators - engagement, persistence
 * 5. Behavioral Patterns - time preferences, learning velocity
 *
 * Based on research in educational data mining and learning analytics.
 */

import type {
  LearnerInteraction,
  LearnerSession,
  InverseProfile,
  KnowledgeState,
  CognitiveIndicators,
  MetacognitiveIndicators,
  MotivationalIndicators,
  BehavioralPatterns,
  ConfidenceScores,
  ExpertiseLevel,
  WorkingMemoryIndicator,
  HelpSeekingPattern,
  GoalOrientation,
  PracticeAttemptPayload,
  ConfidenceRatedPayload,
  HintRequestedPayload,
} from '@/lib/types/interactions'
import { getLearnerStatesByNotebook, getMasteredSkillIds } from '@/lib/graph/learner-state'
import { getZPDSkills } from '@/lib/graph/store'

// Minimum data requirements for reliable inference
const MIN_INTERACTIONS_FOR_PROFILE = 10
const MIN_PRACTICE_ATTEMPTS = 5
const MIN_SESSIONS_FOR_MOTIVATION = 3
const MIN_CONFIDENCE_RATINGS = 5

// Confidence score calculation weights
const CONFIDENCE_WEIGHTS = {
  knowledge: { minSamples: 5, maxConfidence: 0.95 },
  cognitive: { minSamples: 10, maxConfidence: 0.85 },
  metacognitive: { minSamples: 10, maxConfidence: 0.80 },
  motivational: { minSamples: 3, maxConfidence: 0.90 },
  behavioral: { minSamples: 10, maxConfidence: 0.85 },
}

export interface ProfileComputationResult {
  profile: InverseProfile
  warnings: string[]
  dataQuality: 'insufficient' | 'limited' | 'adequate' | 'good'
}

export interface InverseProfileEngineOptions {
  notebookId: string
  learnerId: string
}

/**
 * Main engine class for computing inverse profiles
 */
export class InverseProfileEngine {
  private notebookId: string
  private learnerId: string
  private interactions: LearnerInteraction[] = []
  private sessions: LearnerSession[] = []
  private warnings: string[] = []

  constructor(options: InverseProfileEngineOptions) {
    this.notebookId = options.notebookId
    this.learnerId = options.learnerId
  }

  /**
   * Load interaction data for profile computation
   */
  loadData(interactions: LearnerInteraction[], sessions: LearnerSession[]): void {
    this.interactions = interactions.filter(i => i.notebook_id === this.notebookId)
    this.sessions = sessions.filter(s => s.notebook_id === this.notebookId)
    this.warnings = []
  }

  /**
   * Compute the complete inverse profile
   */
  async computeProfile(): Promise<ProfileComputationResult> {
    this.warnings = []

    // Check minimum data requirements
    if (this.interactions.length < MIN_INTERACTIONS_FOR_PROFILE) {
      this.warnings.push(
        `Limited data: ${this.interactions.length} interactions (${MIN_INTERACTIONS_FOR_PROFILE} recommended)`
      )
    }

    // Compute all dimensions
    const knowledgeState = await this.computeKnowledgeState()
    const cognitiveIndicators = this.computeCognitiveIndicators()
    const metacognitiveIndicators = this.computeMetacognitiveIndicators()
    const motivationalIndicators = this.computeMotivationalIndicators()
    const behavioralPatterns = this.computeBehavioralPatterns()
    const confidenceScores = this.computeConfidenceScores()

    const profile: InverseProfile = {
      id: `${this.learnerId}-${this.notebookId}`,
      learner_id: this.learnerId,
      notebook_id: this.notebookId,
      version: 1,
      computed_at: new Date().toISOString(),
      interactions_analyzed: this.interactions.length,
      knowledge_state: knowledgeState,
      cognitive_indicators: cognitiveIndicators,
      metacognitive_indicators: metacognitiveIndicators,
      motivational_indicators: motivationalIndicators,
      behavioral_patterns: behavioralPatterns,
      confidence_scores: confidenceScores,
    }

    const dataQuality = this.assessDataQuality()

    return {
      profile,
      warnings: this.warnings,
      dataQuality,
    }
  }

  // ===========================================================================
  // DIMENSION 1: KNOWLEDGE STATE
  // ===========================================================================

  private async computeKnowledgeState(): Promise<KnowledgeState> {
    // Get learner states from Neo4J
    const learnerStates = await getLearnerStatesByNotebook(this.learnerId, this.notebookId)
    const masteredIds = await getMasteredSkillIds(this.learnerId, this.notebookId)

    // Calculate average mastery
    const totalMastery = learnerStates.reduce((sum, s) => sum + s.pMastery, 0)
    const averageMastery = learnerStates.length > 0 ? totalMastery / learnerStates.length : 0

    // Count by status
    const skillsMastered = learnerStates.filter(s => s.masteryStatus === 'mastered').length
    const skillsInProgress = learnerStates.filter(s => s.masteryStatus === 'learning').length
    const skillsNotStarted = learnerStates.filter(s => s.masteryStatus === 'not_started').length

    // Get ZPD skills
    const zpdSkills = await getZPDSkills(this.notebookId, masteredIds)
    const currentZPD = zpdSkills.slice(0, 5).map(s => s.skill.id)

    // Detect knowledge gaps (skills with low mastery that have mastered prerequisites)
    const knowledgeGaps = learnerStates
      .filter(s => s.pMastery < 0.4 && s.totalAttempts >= 3)
      .map(s => s.skillId)
      .slice(0, 10)

    // Detect misconceptions from error patterns
    const misconceptions = this.detectMisconceptions()

    return {
      averageMastery,
      skillsMastered,
      skillsInProgress,
      skillsNotStarted,
      knowledgeGaps,
      misconceptions,
      currentZPD,
    }
  }

  /**
   * Detect misconceptions from systematic error patterns
   */
  private detectMisconceptions(): string[] {
    const misconceptions: string[] = []

    // Get practice attempts
    const practiceAttempts = this.interactions.filter(
      i => i.event_type === 'practice_attempt'
    )

    // Group by skill
    const skillAttempts = new Map<string, { correct: number; incorrect: number; patterns: string[] }>()

    for (const attempt of practiceAttempts) {
      const skillId = attempt.skill_id
      if (!skillId) continue

      const payload = attempt.payload as PracticeAttemptPayload
      const existing = skillAttempts.get(skillId) || { correct: 0, incorrect: 0, patterns: [] }

      if (payload.isCorrect) {
        existing.correct++
      } else {
        existing.incorrect++
        // Track wrong answers for pattern detection
        if (payload.userAnswer) {
          existing.patterns.push(payload.userAnswer)
        }
      }

      skillAttempts.set(skillId, existing)
    }

    // Identify skills with high error rates (potential misconceptions)
    for (const [skillId, data] of skillAttempts.entries()) {
      const total = data.correct + data.incorrect
      if (total >= 3) {
        const errorRate = data.incorrect / total
        // High error rate with attempts suggests misconception
        if (errorRate >= 0.6 && data.incorrect >= 3) {
          misconceptions.push(skillId)
        }
      }
    }

    return misconceptions.slice(0, 5)
  }

  // ===========================================================================
  // DIMENSION 2: COGNITIVE INDICATORS
  // ===========================================================================

  private computeCognitiveIndicators(): CognitiveIndicators {
    const practiceAttempts = this.interactions.filter(
      i => i.event_type === 'practice_attempt'
    )

    // Calculate average response time
    const responseTimes = practiceAttempts
      .map(i => (i.payload as PracticeAttemptPayload).responseTimeMs)
      .filter(t => t !== undefined && t > 0)

    const averageResponseTimeMs = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null

    // Infer working memory indicator from response patterns
    const workingMemoryIndicator = this.inferWorkingMemory(practiceAttempts)

    // Infer expertise level from accuracy and speed
    const expertiseLevel = this.inferExpertiseLevel(practiceAttempts)

    // Estimate cognitive load threshold
    const cognitiveLoadThreshold = this.estimateCognitiveLoadThreshold(practiceAttempts)

    // Optimal complexity based on performance at different difficulties
    const optimalComplexityLevel = this.estimateOptimalComplexity(practiceAttempts)

    return {
      workingMemoryIndicator,
      expertiseLevel,
      cognitiveLoadThreshold,
      optimalComplexityLevel,
      averageResponseTimeMs,
    }
  }

  private inferWorkingMemory(attempts: LearnerInteraction[]): WorkingMemoryIndicator {
    if (attempts.length < MIN_PRACTICE_ATTEMPTS) {
      return 'unknown'
    }

    // Working memory inference based on:
    // 1. Performance degradation in complex problems
    // 2. Time taken on multi-step problems
    // 3. Need for hints on complex problems

    const hintsRequested = this.interactions.filter(i => i.event_type === 'hint_requested')
    const totalAttempts = attempts.length
    const hintRate = hintsRequested.length / totalAttempts

    // Get response time variability (high variability suggests working memory constraints)
    const responseTimes = attempts
      .map(i => (i.payload as PracticeAttemptPayload).responseTimeMs)
      .filter(t => t !== undefined && t > 0)

    if (responseTimes.length < 3) return 'unknown'

    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const variance = responseTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / responseTimes.length
    const cv = Math.sqrt(variance) / mean // Coefficient of variation

    // Combine signals
    if (hintRate < 0.1 && cv < 0.3) return 'high'
    if (hintRate > 0.4 || cv > 0.6) return 'low'
    return 'medium'
  }

  private inferExpertiseLevel(attempts: LearnerInteraction[]): ExpertiseLevel {
    if (attempts.length < MIN_PRACTICE_ATTEMPTS) {
      return 'novice'
    }

    // Calculate accuracy
    const correctAttempts = attempts.filter(
      i => (i.payload as PracticeAttemptPayload).isCorrect
    )
    const accuracy = correctAttempts.length / attempts.length

    // Calculate average response time
    const responseTimes = attempts
      .map(i => (i.payload as PracticeAttemptPayload).responseTimeMs)
      .filter(t => t !== undefined && t > 0)

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : Infinity

    // Expertise based on accuracy and speed
    // Fast and accurate = expert, slow and accurate = intermediate, etc.
    if (accuracy >= 0.9 && avgResponseTime < 10000) return 'expert'
    if (accuracy >= 0.85 && avgResponseTime < 15000) return 'advanced'
    if (accuracy >= 0.7 && avgResponseTime < 30000) return 'intermediate'
    if (accuracy >= 0.5) return 'beginner'
    return 'novice'
  }

  private estimateCognitiveLoadThreshold(attempts: LearnerInteraction[]): number | null {
    if (attempts.length < MIN_PRACTICE_ATTEMPTS) return null

    // Look at performance breakdown at different difficulty levels
    const byDifficulty = new Map<number, { correct: number; total: number }>()

    for (const attempt of attempts) {
      const payload = attempt.payload as PracticeAttemptPayload
      const difficulty = payload.difficulty ?? 0.5

      // Bucket into difficulty ranges
      const bucket = Math.floor(difficulty * 10) / 10
      const existing = byDifficulty.get(bucket) || { correct: 0, total: 0 }
      existing.total++
      if (payload.isCorrect) existing.correct++
      byDifficulty.set(bucket, existing)
    }

    // Find the difficulty level where performance drops below 50%
    let threshold = 1.0
    for (const [difficulty, stats] of Array.from(byDifficulty.entries()).sort((a, b) => a[0] - b[0])) {
      if (stats.total >= 2) {
        const accuracy = stats.correct / stats.total
        if (accuracy < 0.5) {
          threshold = difficulty
          break
        }
      }
    }

    return threshold
  }

  private estimateOptimalComplexity(attempts: LearnerInteraction[]): number | null {
    if (attempts.length < MIN_PRACTICE_ATTEMPTS) return null

    // Optimal complexity is where performance is ~70% (challenging but achievable)
    const byDifficulty = new Map<number, { correct: number; total: number }>()

    for (const attempt of attempts) {
      const payload = attempt.payload as PracticeAttemptPayload
      const difficulty = payload.difficulty ?? 0.5
      const bucket = Math.floor(difficulty * 10) / 10
      const existing = byDifficulty.get(bucket) || { correct: 0, total: 0 }
      existing.total++
      if (payload.isCorrect) existing.correct++
      byDifficulty.set(bucket, existing)
    }

    let optimalLevel = 0.5
    let closestTo70 = 1.0

    for (const [difficulty, stats] of byDifficulty.entries()) {
      if (stats.total >= 2) {
        const accuracy = stats.correct / stats.total
        const distanceTo70 = Math.abs(accuracy - 0.7)
        if (distanceTo70 < closestTo70) {
          closestTo70 = distanceTo70
          optimalLevel = difficulty
        }
      }
    }

    return optimalLevel
  }

  // ===========================================================================
  // DIMENSION 3: METACOGNITIVE INDICATORS
  // ===========================================================================

  private computeMetacognitiveIndicators(): MetacognitiveIndicators {
    const confidenceRatings = this.interactions.filter(
      i => i.event_type === 'confidence_rated'
    )

    const hintRequests = this.interactions.filter(
      i => i.event_type === 'hint_requested'
    )

    const practiceAttempts = this.interactions.filter(
      i => i.event_type === 'practice_attempt'
    )

    // Calculate calibration accuracy (correlation between confidence and performance)
    const calibrationAccuracy = this.computeCalibrationAccuracy(confidenceRatings)

    // Determine help-seeking pattern
    const helpSeekingPattern = this.classifyHelpSeeking(hintRequests, practiceAttempts)

    // Calculate over/under confidence rates
    const { overconfidenceRate, underconfidenceRate } = this.computeConfidenceRates(confidenceRatings)

    // Self-monitoring accuracy (ability to predict own performance)
    const selfMonitoringAccuracy = calibrationAccuracy // Same metric

    return {
      calibrationAccuracy,
      helpSeekingPattern,
      selfMonitoringAccuracy,
      overconfidenceRate,
      underconfidenceRate,
    }
  }

  private computeCalibrationAccuracy(confidenceRatings: LearnerInteraction[]): number | null {
    if (confidenceRatings.length < MIN_CONFIDENCE_RATINGS) return null

    // Get pre-attempt confidence ratings with outcomes
    const preAttemptRatings = confidenceRatings
      .filter(i => {
        const payload = i.payload as ConfidenceRatedPayload
        return payload.ratingType === 'pre_attempt' && payload.actualOutcome !== undefined
      })
      .map(i => {
        const payload = i.payload as ConfidenceRatedPayload
        return {
          confidence: payload.scale === '1-5' ? payload.rating / 5 : payload.rating,
          outcome: payload.actualOutcome ? 1 : 0,
        }
      })

    if (preAttemptRatings.length < 3) return null

    // Calculate Pearson correlation
    const n = preAttemptRatings.length
    const sumX = preAttemptRatings.reduce((sum, r) => sum + r.confidence, 0)
    const sumY = preAttemptRatings.reduce((sum, r) => sum + r.outcome, 0)
    const sumXY = preAttemptRatings.reduce((sum, r) => sum + r.confidence * r.outcome, 0)
    const sumX2 = preAttemptRatings.reduce((sum, r) => sum + r.confidence * r.confidence, 0)
    const sumY2 = preAttemptRatings.reduce((sum, r) => sum + r.outcome * r.outcome, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    if (denominator === 0) return null

    return numerator / denominator
  }

  private classifyHelpSeeking(
    hintRequests: LearnerInteraction[],
    practiceAttempts: LearnerInteraction[]
  ): HelpSeekingPattern {
    if (practiceAttempts.length < MIN_PRACTICE_ATTEMPTS) return 'unknown'

    const hintRate = hintRequests.length / practiceAttempts.length

    // Analyze timing of hint requests
    const earlyHints = hintRequests.filter(h => {
      const payload = h.payload as HintRequestedPayload
      return payload.timeBeforeHintMs < 5000 // Hint requested within 5 seconds
    })

    const earlyHintRate = hintRequests.length > 0
      ? earlyHints.length / hintRequests.length
      : 0

    // Classify based on patterns
    if (hintRate < 0.05) {
      return 'avoidant' // Rarely asks for help even when struggling
    }

    if (hintRate > 0.5 || earlyHintRate > 0.7) {
      return 'excessive' // Asks for hints too quickly/frequently
    }

    return 'appropriate' // Balanced help-seeking
  }

  private computeConfidenceRates(confidenceRatings: LearnerInteraction[]): {
    overconfidenceRate: number | null
    underconfidenceRate: number | null
  } {
    const preAttemptRatings = confidenceRatings
      .filter(i => {
        const payload = i.payload as ConfidenceRatedPayload
        return payload.ratingType === 'pre_attempt' && payload.actualOutcome !== undefined
      })
      .map(i => {
        const payload = i.payload as ConfidenceRatedPayload
        const normalizedConfidence = payload.scale === '1-5' ? payload.rating / 5 : payload.rating
        return {
          confident: normalizedConfidence >= 0.6, // Considered "confident"
          correct: payload.actualOutcome,
        }
      })

    if (preAttemptRatings.length < MIN_CONFIDENCE_RATINGS) {
      return { overconfidenceRate: null, underconfidenceRate: null }
    }

    // Overconfidence: confident but wrong
    const overconfident = preAttemptRatings.filter(r => r.confident && !r.correct)
    const confidentTotal = preAttemptRatings.filter(r => r.confident)
    const overconfidenceRate = confidentTotal.length > 0
      ? overconfident.length / confidentTotal.length
      : null

    // Underconfidence: not confident but right
    const underconfident = preAttemptRatings.filter(r => !r.confident && r.correct)
    const notConfidentTotal = preAttemptRatings.filter(r => !r.confident)
    const underconfidenceRate = notConfidentTotal.length > 0
      ? underconfident.length / notConfidentTotal.length
      : null

    return { overconfidenceRate, underconfidenceRate }
  }

  // ===========================================================================
  // DIMENSION 4: MOTIVATIONAL INDICATORS
  // ===========================================================================

  private computeMotivationalIndicators(): MotivationalIndicators {
    if (this.sessions.length < MIN_SESSIONS_FOR_MOTIVATION) {
      this.warnings.push(
        `Limited session data: ${this.sessions.length} sessions (${MIN_SESSIONS_FOR_MOTIVATION} recommended for motivation analysis)`
      )
    }

    // Session frequency (sessions per week)
    const sessionFrequency = this.computeSessionFrequency()

    // Average session duration
    const averageSessionDuration = this.computeAverageSessionDuration()

    // Voluntary return rate (sessions that weren't within 24h of previous)
    const voluntaryReturnRate = this.computeVoluntaryReturnRate()

    // Persistence score (attempts after failure)
    const persistenceScore = this.computePersistenceScore()

    // Goal orientation
    const goalOrientation = this.inferGoalOrientation()

    return {
      sessionFrequency,
      averageSessionDuration,
      voluntaryReturnRate,
      persistenceScore,
      goalOrientation,
    }
  }

  private computeSessionFrequency(): number | null {
    if (this.sessions.length < 2) return null

    const sortedSessions = [...this.sessions]
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

    const firstSession = new Date(sortedSessions[0].started_at)
    const lastSession = new Date(sortedSessions[sortedSessions.length - 1].started_at)

    const weeksDiff = (lastSession.getTime() - firstSession.getTime()) / (7 * 24 * 60 * 60 * 1000)

    if (weeksDiff < 0.5) return null // Not enough time range

    return this.sessions.length / weeksDiff
  }

  private computeAverageSessionDuration(): number | null {
    const sessionsWithDuration = this.sessions.filter(s => s.duration_ms && s.duration_ms > 0)

    if (sessionsWithDuration.length === 0) return null

    const totalDuration = sessionsWithDuration.reduce((sum, s) => sum + (s.duration_ms || 0), 0)
    return (totalDuration / sessionsWithDuration.length) / 60000 // Convert to minutes
  }

  private computeVoluntaryReturnRate(): number | null {
    if (this.sessions.length < 2) return null

    const sortedSessions = [...this.sessions]
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

    let voluntaryReturns = 0

    for (let i = 1; i < sortedSessions.length; i++) {
      const prevEnd = sortedSessions[i - 1].ended_at
        ? new Date(sortedSessions[i - 1].ended_at!).getTime()
        : new Date(sortedSessions[i - 1].started_at).getTime()

      const currentStart = new Date(sortedSessions[i].started_at).getTime()

      // Voluntary return: gap of more than 4 hours
      if (currentStart - prevEnd > 4 * 60 * 60 * 1000) {
        voluntaryReturns++
      }
    }

    return voluntaryReturns / (this.sessions.length - 1)
  }

  private computePersistenceScore(): number | null {
    const practiceAttempts = this.interactions.filter(
      i => i.event_type === 'practice_attempt'
    )

    if (practiceAttempts.length < MIN_PRACTICE_ATTEMPTS) return null

    // Group by skill to analyze persistence per skill
    const skillAttempts = new Map<string, boolean[]>()

    for (const attempt of practiceAttempts) {
      if (!attempt.skill_id) continue
      const isCorrect = (attempt.payload as PracticeAttemptPayload).isCorrect
      const attempts = skillAttempts.get(attempt.skill_id) || []
      attempts.push(isCorrect)
      skillAttempts.set(attempt.skill_id, attempts)
    }

    // Calculate average attempts after first failure
    let totalAttemptsAfterFailure = 0
    let skillsWithFailure = 0

    for (const attempts of skillAttempts.values()) {
      const firstFailureIdx = attempts.findIndex(c => !c)
      if (firstFailureIdx >= 0 && firstFailureIdx < attempts.length - 1) {
        // Count how many attempts after first failure
        totalAttemptsAfterFailure += attempts.length - firstFailureIdx - 1
        skillsWithFailure++
      }
    }

    if (skillsWithFailure === 0) return 1.0 // No failures or always quit after failure

    // Normalize: average attempts after failure, capped at 10
    const avgAttemptsAfterFailure = totalAttemptsAfterFailure / skillsWithFailure
    return Math.min(1.0, avgAttemptsAfterFailure / 5) // 5+ attempts = perfect persistence
  }

  private inferGoalOrientation(): GoalOrientation {
    if (this.interactions.length < MIN_PRACTICE_ATTEMPTS) return 'unknown'

    const practiceAttempts = this.interactions.filter(
      i => i.event_type === 'practice_attempt'
    )

    // Mastery orientation: seeks challenging problems, persists after failure
    // Performance orientation: avoids difficult problems, quits after failure
    // Avoidance orientation: minimal engagement

    // Check for skipped problems
    const skippedProblems = this.interactions.filter(i => i.event_type === 'practice_skipped')
    const skipRate = skippedProblems.length / (practiceAttempts.length + skippedProblems.length)

    // Check difficulty distribution
    const difficulties = practiceAttempts
      .map(i => (i.payload as PracticeAttemptPayload).difficulty)
      .filter(d => d !== undefined) as number[]

    const avgDifficulty = difficulties.length > 0
      ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
      : 0.5

    // Check persistence
    const persistenceScore = this.computePersistenceScore() ?? 0.5

    // Classify
    if (skipRate > 0.3 || persistenceScore < 0.3) {
      return 'avoidance'
    }

    if (avgDifficulty > 0.6 && persistenceScore > 0.6) {
      return 'mastery'
    }

    if (avgDifficulty < 0.4 && skipRate < 0.1) {
      return 'performance' // Sticks to easier problems
    }

    return 'mastery' // Default to mastery if engaged
  }

  // ===========================================================================
  // DIMENSION 5: BEHAVIORAL PATTERNS
  // ===========================================================================

  private computeBehavioralPatterns(): BehavioralPatterns {
    // Time of day analysis
    const preferredTimeOfDay = this.computePreferredTimeOfDay()

    // Day of week analysis
    const mostActiveDay = this.computeMostActiveDay()

    // Response time
    const practiceAttempts = this.interactions.filter(i => i.event_type === 'practice_attempt')
    const responseTimes = practiceAttempts
      .map(i => (i.payload as PracticeAttemptPayload).responseTimeMs)
      .filter(t => t !== undefined && t > 0)

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null

    // Hint usage rate
    const hintRequests = this.interactions.filter(i => i.event_type === 'hint_requested')
    const hintUsageRate = practiceAttempts.length > 0
      ? hintRequests.length / practiceAttempts.length
      : null

    // Error patterns
    const errorPatterns = this.extractErrorPatterns()

    // Learning velocity (skills progressed per week)
    const learningVelocity = this.computeLearningVelocity()

    return {
      preferredTimeOfDay,
      mostActiveDay,
      averageResponseTime,
      hintUsageRate,
      errorPatterns,
      learningVelocity,
    }
  }

  private computePreferredTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' | null {
    if (this.interactions.length < MIN_INTERACTIONS_FOR_PROFILE) return null

    const timeSlots = {
      morning: 0,   // 6-12
      afternoon: 0, // 12-18
      evening: 0,   // 18-22
      night: 0,     // 22-6
    }

    for (const interaction of this.interactions) {
      const hour = new Date(interaction.created_at).getHours()
      if (hour >= 6 && hour < 12) timeSlots.morning++
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++
      else if (hour >= 18 && hour < 22) timeSlots.evening++
      else timeSlots.night++
    }

    const maxSlot = Object.entries(timeSlots).reduce(
      (max, [slot, count]) => count > max.count ? { slot, count } : max,
      { slot: 'afternoon', count: 0 }
    )

    return maxSlot.slot as 'morning' | 'afternoon' | 'evening' | 'night'
  }

  private computeMostActiveDay(): number | null {
    if (this.interactions.length < MIN_INTERACTIONS_FOR_PROFILE) return null

    const dayCounts = new Array(7).fill(0)

    for (const interaction of this.interactions) {
      const day = new Date(interaction.created_at).getDay()
      dayCounts[day]++
    }

    return dayCounts.indexOf(Math.max(...dayCounts))
  }

  private extractErrorPatterns(): string[] {
    // Analyze wrong answers for common patterns
    const patterns: string[] = []

    const wrongAttempts = this.interactions
      .filter(i => i.event_type === 'practice_attempt')
      .filter(i => !(i.payload as PracticeAttemptPayload).isCorrect)

    // Group by skill to identify skill-specific error patterns
    const skillErrors = new Map<string, number>()
    for (const attempt of wrongAttempts) {
      if (!attempt.skill_id) continue
      const count = skillErrors.get(attempt.skill_id) || 0
      skillErrors.set(attempt.skill_id, count + 1)
    }

    // Skills with high error counts
    for (const [skillId, count] of skillErrors.entries()) {
      if (count >= 3) {
        patterns.push(`High error rate on skill: ${skillId}`)
      }
    }

    return patterns.slice(0, 5)
  }

  private computeLearningVelocity(): number | null {
    if (this.sessions.length < 2) return null

    const sortedSessions = [...this.sessions]
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

    const firstSession = new Date(sortedSessions[0].started_at)
    const lastSession = new Date(sortedSessions[sortedSessions.length - 1].started_at)

    const weeksDiff = (lastSession.getTime() - firstSession.getTime()) / (7 * 24 * 60 * 60 * 1000)

    if (weeksDiff < 0.5) return null

    // Count unique skills practiced
    const uniqueSkills = new Set<string>()
    for (const session of this.sessions) {
      for (const skillId of session.skills_practiced || []) {
        uniqueSkills.add(skillId)
      }
    }

    return uniqueSkills.size / weeksDiff
  }

  // ===========================================================================
  // CONFIDENCE SCORES
  // ===========================================================================

  private computeConfidenceScores(): ConfidenceScores {
    return {
      knowledge: this.computeDimensionConfidence('knowledge'),
      cognitive: this.computeDimensionConfidence('cognitive'),
      metacognitive: this.computeDimensionConfidence('metacognitive'),
      motivational: this.computeDimensionConfidence('motivational'),
      behavioral: this.computeDimensionConfidence('behavioral'),
    }
  }

  private computeDimensionConfidence(
    dimension: 'knowledge' | 'cognitive' | 'metacognitive' | 'motivational' | 'behavioral'
  ): number {
    const weights = CONFIDENCE_WEIGHTS[dimension]

    let sampleSize: number

    switch (dimension) {
      case 'knowledge':
        sampleSize = this.interactions.filter(i => i.event_type === 'practice_attempt').length
        break
      case 'cognitive':
        sampleSize = this.interactions.filter(i => i.event_type === 'practice_attempt').length
        break
      case 'metacognitive':
        sampleSize = this.interactions.filter(i => i.event_type === 'confidence_rated').length
        break
      case 'motivational':
        sampleSize = this.sessions.length
        break
      case 'behavioral':
        sampleSize = this.interactions.length
        break
    }

    // Logistic growth function for confidence
    // Starts low, increases with samples, asymptotes at maxConfidence
    const k = 0.5 // Growth rate
    const confidence = weights.maxConfidence / (1 + Math.exp(-k * (sampleSize - weights.minSamples)))

    return Math.min(weights.maxConfidence, Math.max(0.1, confidence))
  }

  // ===========================================================================
  // DATA QUALITY ASSESSMENT
  // ===========================================================================

  private assessDataQuality(): 'insufficient' | 'limited' | 'adequate' | 'good' {
    const practiceAttempts = this.interactions.filter(i => i.event_type === 'practice_attempt')
    const confidenceRatings = this.interactions.filter(i => i.event_type === 'confidence_rated')

    const scores = {
      interactions: this.interactions.length >= 50 ? 2 : this.interactions.length >= 20 ? 1 : 0,
      practice: practiceAttempts.length >= 20 ? 2 : practiceAttempts.length >= 10 ? 1 : 0,
      sessions: this.sessions.length >= 5 ? 2 : this.sessions.length >= 3 ? 1 : 0,
      confidence: confidenceRatings.length >= 10 ? 2 : confidenceRatings.length >= 5 ? 1 : 0,
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

    if (totalScore >= 7) return 'good'
    if (totalScore >= 5) return 'adequate'
    if (totalScore >= 2) return 'limited'
    return 'insufficient'
  }
}

// ===========================================================================
// HELPER: Generate actionable insights from profile
// ===========================================================================

export interface ProfileInsight {
  category: 'strength' | 'improvement' | 'recommendation'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
}

export function generateProfileInsights(profile: InverseProfile): ProfileInsight[] {
  const insights: ProfileInsight[] = []

  // Knowledge state insights
  const ks = profile.knowledge_state
  if (ks.skillsMastered > 0) {
    insights.push({
      category: 'strength',
      title: 'Mastery Progress',
      description: `You've mastered ${ks.skillsMastered} skill${ks.skillsMastered > 1 ? 's' : ''}. Great progress!`,
      priority: 'low',
      actionable: false,
    })
  }

  if (ks.knowledgeGaps.length > 0) {
    insights.push({
      category: 'improvement',
      title: 'Knowledge Gaps Detected',
      description: `${ks.knowledgeGaps.length} skill${ks.knowledgeGaps.length > 1 ? 's need' : ' needs'} more practice.`,
      priority: 'high',
      actionable: true,
    })
  }

  if (ks.misconceptions.length > 0) {
    insights.push({
      category: 'improvement',
      title: 'Potential Misconceptions',
      description: `High error patterns detected in ${ks.misconceptions.length} area${ks.misconceptions.length > 1 ? 's' : ''}. Consider reviewing fundamentals.`,
      priority: 'high',
      actionable: true,
    })
  }

  // Cognitive insights
  const ci = profile.cognitive_indicators
  if (ci.expertiseLevel === 'expert' || ci.expertiseLevel === 'advanced') {
    insights.push({
      category: 'strength',
      title: 'Strong Performance',
      description: `Your accuracy and speed indicate ${ci.expertiseLevel} level understanding.`,
      priority: 'low',
      actionable: false,
    })
  }

  if (ci.workingMemoryIndicator === 'low') {
    insights.push({
      category: 'recommendation',
      title: 'Break Down Complex Problems',
      description: 'Consider working through problems step-by-step. Taking notes may help.',
      priority: 'medium',
      actionable: true,
    })
  }

  // Metacognitive insights
  const mi = profile.metacognitive_indicators
  if (mi.helpSeekingPattern === 'avoidant') {
    insights.push({
      category: 'recommendation',
      title: 'Use Available Help',
      description: 'Do not hesitate to use hints when stuck. They are designed to support learning.',
      priority: 'medium',
      actionable: true,
    })
  }

  if (mi.helpSeekingPattern === 'excessive') {
    insights.push({
      category: 'recommendation',
      title: 'Try Before Seeking Help',
      description: 'Challenge yourself to attempt problems before requesting hints.',
      priority: 'medium',
      actionable: true,
    })
  }

  if (mi.overconfidenceRate !== null && mi.overconfidenceRate > 0.4) {
    insights.push({
      category: 'improvement',
      title: 'Calibrate Your Confidence',
      description: 'Your confidence sometimes exceeds your accuracy. Double-check your work.',
      priority: 'medium',
      actionable: true,
    })
  }

  // Motivational insights
  const moi = profile.motivational_indicators
  if (moi.persistenceScore !== null && moi.persistenceScore > 0.7) {
    insights.push({
      category: 'strength',
      title: 'Great Persistence',
      description: 'You show excellent persistence after encountering challenges.',
      priority: 'low',
      actionable: false,
    })
  }

  if (moi.persistenceScore !== null && moi.persistenceScore < 0.3) {
    insights.push({
      category: 'recommendation',
      title: 'Embrace Challenges',
      description: 'Mistakes are learning opportunities. Try a few more times before moving on.',
      priority: 'high',
      actionable: true,
    })
  }

  // Behavioral insights
  const bp = profile.behavioral_patterns
  if (bp.hintUsageRate !== null && bp.hintUsageRate < 0.05 && ks.averageMastery < 0.5) {
    insights.push({
      category: 'recommendation',
      title: 'Leverage Learning Aids',
      description: 'Hints are available to help you learn. Consider using them when needed.',
      priority: 'medium',
      actionable: true,
    })
  }

  if (bp.learningVelocity !== null && bp.learningVelocity > 5) {
    insights.push({
      category: 'strength',
      title: 'Fast Learner',
      description: 'You are progressing through skills at an impressive pace!',
      priority: 'low',
      actionable: false,
    })
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}
