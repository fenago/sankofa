/**
 * Retention Metrics Calculator
 *
 * Measures knowledge retention over time using:
 * - Ebbinghaus forgetting curve model
 * - SM-2 review completion tracking
 * - Retention rate calculations
 */

import type { RetentionMetrics, RetentionSummary } from './types'

interface SkillRetentionData {
  skillId: string
  skillName: string
  initialMastery: number // mastery at time of last practice
  currentMastery: number
  lastPracticeAt: Date
  reviews: Array<{
    scheduledAt: Date
    completedAt: Date | null
  }>
}

/**
 * Ebbinghaus forgetting curve: R = e^(-t/S)
 * Where R is retention, t is time, S is stability
 *
 * We use SM-2's easiness factor to estimate stability
 */
export function calculatePredictedRetention(
  daysSinceLastPractice: number,
  easeFactor: number = 2.5
): number {
  // Convert ease factor to stability (higher ease = higher stability)
  const stability = easeFactor * 10 // rough conversion

  // Forgetting curve
  const retention = Math.exp(-daysSinceLastPractice / stability)

  return Math.max(0, Math.min(1, retention))
}

/**
 * Calculate retention metrics for a single skill
 */
export function calculateSkillRetention(data: SkillRetentionData): RetentionMetrics {
  const now = new Date()
  const lastPractice = new Date(data.lastPracticeAt)
  const daysSinceLastPractice = Math.floor(
    (now.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate actual retention rate
  const retentionRate = data.initialMastery > 0
    ? data.currentMastery / data.initialMastery
    : 0

  // Calculate predicted decay based on forgetting curve
  const predictedDecay = 1 - calculatePredictedRetention(daysSinceLastPractice)

  // Count completed vs missed reviews
  const now_ts = now.getTime()
  const reviewsCompleted = data.reviews.filter(r => r.completedAt !== null).length
  const reviewsMissed = data.reviews.filter(
    r => r.completedAt === null && new Date(r.scheduledAt).getTime() < now_ts
  ).length

  return {
    skillId: data.skillId,
    skillName: data.skillName,
    initialMastery: data.initialMastery,
    currentMastery: data.currentMastery,
    daysSinceLastPractice,
    retentionRate: Math.min(1, retentionRate), // Can exceed 1 if improved
    predictedDecay,
    reviewsCompleted,
    reviewsMissed,
  }
}

/**
 * Calculate retention summary across all skills
 */
export function calculateRetentionSummary(
  skills: SkillRetentionData[]
): RetentionSummary {
  const metrics = skills.map(calculateSkillRetention)

  if (metrics.length === 0) {
    return {
      averageRetention: 0,
      skillsNeedingReview: [],
      wellRetainedSkills: [],
      forgettingCurveData: [],
    }
  }

  const averageRetention = metrics.reduce((sum, m) => sum + m.retentionRate, 0) / metrics.length

  // Skills needing review: retention < 80% or missed reviews
  const skillsNeedingReview = metrics.filter(
    m => m.retentionRate < 0.8 || m.reviewsMissed > 0
  ).sort((a, b) => a.retentionRate - b.retentionRate)

  // Well retained: retention >= 90%
  const wellRetainedSkills = metrics.filter(m => m.retentionRate >= 0.9)

  // Generate forgetting curve data points
  const forgettingCurveData = generateForgettingCurveData(metrics)

  return {
    averageRetention,
    skillsNeedingReview,
    wellRetainedSkills,
    forgettingCurveData,
  }
}

/**
 * Generate empirical forgetting curve data from actual retention metrics
 */
function generateForgettingCurveData(
  metrics: RetentionMetrics[]
): Array<{ daysAgo: number; averageRetention: number }> {
  // Group by days since practice
  const buckets: Record<number, number[]> = {}

  for (const m of metrics) {
    // Bucket into week ranges for smoothing
    const bucket = Math.floor(m.daysSinceLastPractice / 7) * 7
    if (!buckets[bucket]) buckets[bucket] = []
    buckets[bucket].push(m.retentionRate)
  }

  // Calculate average for each bucket
  return Object.entries(buckets)
    .map(([days, retentions]) => ({
      daysAgo: parseInt(days),
      averageRetention: retentions.reduce((a, b) => a + b, 0) / retentions.length,
    }))
    .sort((a, b) => a.daysAgo - b.daysAgo)
}

/**
 * Calculate optimal review time based on desired retention
 */
export function calculateOptimalReviewTime(
  currentRetention: number,
  targetRetention: number,
  easeFactor: number = 2.5
): number {
  // Solve for t in: targetRetention = currentRetention * e^(-t/S)
  const stability = easeFactor * 10
  const daysTillTarget = -stability * Math.log(targetRetention / currentRetention)

  return Math.max(0, Math.ceil(daysTillTarget))
}

/**
 * Estimate skill stability based on review history
 */
export function estimateSkillStability(
  reviewHistory: Array<{
    interval: number // days since previous review
    retention: number // score on review
  }>
): number {
  if (reviewHistory.length < 2) return 25 // default stability

  // Use linear regression to estimate stability from retention decay
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  const n = reviewHistory.length

  for (const review of reviewHistory) {
    const x = review.interval
    const y = Math.log(review.retention) // linearize the exponential
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  // Slope of the line is -1/S
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  if (slope >= 0) return 100 // very stable (or not enough data)

  const stability = -1 / slope
  return Math.max(5, Math.min(100, stability)) // clamp to reasonable range
}

/**
 * Identify retention risk level
 */
export function getRetentionRisk(metrics: RetentionMetrics): 'high' | 'medium' | 'low' {
  if (metrics.retentionRate < 0.6 || metrics.reviewsMissed >= 3) {
    return 'high'
  } else if (metrics.retentionRate < 0.8 || metrics.reviewsMissed >= 1) {
    return 'medium'
  }
  return 'low'
}
