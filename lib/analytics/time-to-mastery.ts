/**
 * Time to Mastery Analytics
 *
 * Measures learning efficiency by tracking how long it takes
 * learners to achieve mastery of skills.
 */

import type { TimeToMasteryMetrics, TimeToMasterySummary } from './types'

interface SkillPracticeData {
  skillId: string
  skillName: string
  bloomLevel: number
  difficulty: number
  firstAttemptAt: Date
  masteredAt: Date | null
  currentMastery: number
  attempts: Array<{
    attemptedAt: Date
    responseTimeMs: number
    correct: boolean
  }>
}

/**
 * Calculate time to mastery metrics for a single skill
 */
export function calculateTimeToMastery(data: SkillPracticeData): TimeToMasteryMetrics {
  const startedAt = new Date(data.firstAttemptAt)
  const masteredAt = data.masteredAt ? new Date(data.masteredAt) : null

  // Total practice time (sum of response times)
  const totalPracticeTime = data.attempts.reduce((sum, a) => sum + a.responseTimeMs, 0)

  const attemptCount = data.attempts.length
  const averageTimePerAttempt = attemptCount > 0 ? totalPracticeTime / attemptCount : 0

  // Calculate efficiency based on expected attempts for this difficulty
  const expectedAttempts = getExpectedAttempts(data.bloomLevel, data.difficulty)
  const efficiency = attemptCount > 0 ? expectedAttempts / attemptCount : 0

  return {
    skillId: data.skillId,
    skillName: data.skillName,
    startedAt,
    masteredAt,
    totalPracticeTime,
    attemptCount,
    averageTimePerAttempt,
    efficiency: Math.min(2, efficiency), // Cap at 2x (very efficient)
    bloomLevel: data.bloomLevel,
    difficulty: data.difficulty,
  }
}

/**
 * Get expected number of attempts based on Bloom level and difficulty
 *
 * Higher Bloom levels and higher difficulty = more expected attempts
 */
export function getExpectedAttempts(bloomLevel: number, difficulty: number): number {
  // Base attempts by Bloom level
  const baseByBloom: Record<number, number> = {
    1: 3, // Remember
    2: 5, // Understand
    3: 7, // Apply
    4: 10, // Analyze
    5: 12, // Evaluate
    6: 15, // Create
  }

  const base = baseByBloom[bloomLevel] || 5

  // Adjust by difficulty (1-10 scale)
  const difficultyMultiplier = 0.5 + (difficulty / 10)

  return Math.round(base * difficultyMultiplier)
}

/**
 * Calculate summary statistics across all skills
 */
export function calculateTimeToMasterySummary(
  skills: SkillPracticeData[]
): TimeToMasterySummary {
  const metrics = skills.map(calculateTimeToMastery)

  if (metrics.length === 0) {
    return {
      averageTimeToMastery: 0,
      medianTimeToMastery: 0,
      fastestSkill: null,
      slowestSkill: null,
      byBloomLevel: {},
      byDifficulty: {},
      skills: [],
    }
  }

  // Only consider mastered skills for time calculations
  const masteredMetrics = metrics.filter(m => m.masteredAt !== null)

  // Calculate times to mastery in milliseconds
  const timesToMastery = masteredMetrics.map(m =>
    m.masteredAt!.getTime() - m.startedAt.getTime()
  )

  const averageTimeToMastery = timesToMastery.length > 0
    ? timesToMastery.reduce((a, b) => a + b, 0) / timesToMastery.length
    : 0

  const sortedTimes = [...timesToMastery].sort((a, b) => a - b)
  const medianTimeToMastery = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length / 2)]
    : 0

  // Find fastest and slowest
  const sortedByEfficiency = [...masteredMetrics].sort((a, b) => b.efficiency - a.efficiency)
  const fastestSkill = sortedByEfficiency[0] || null
  const slowestSkill = sortedByEfficiency[sortedByEfficiency.length - 1] || null

  // Group by Bloom level
  const byBloomLevel: Record<number, number> = {}
  for (let level = 1; level <= 6; level++) {
    const levelMetrics = masteredMetrics.filter(m => m.bloomLevel === level)
    if (levelMetrics.length > 0) {
      byBloomLevel[level] = levelMetrics.reduce((sum, m) => {
        const time = m.masteredAt!.getTime() - m.startedAt.getTime()
        return sum + time
      }, 0) / levelMetrics.length
    }
  }

  // Group by difficulty bucket
  const byDifficulty: Record<string, number> = {}
  const difficultyBuckets = ['easy', 'medium', 'hard']
  for (const bucket of difficultyBuckets) {
    const bucketMetrics = masteredMetrics.filter(m => getDifficultyBucket(m.difficulty) === bucket)
    if (bucketMetrics.length > 0) {
      byDifficulty[bucket] = bucketMetrics.reduce((sum, m) => {
        const time = m.masteredAt!.getTime() - m.startedAt.getTime()
        return sum + time
      }, 0) / bucketMetrics.length
    }
  }

  return {
    averageTimeToMastery,
    medianTimeToMastery,
    fastestSkill,
    slowestSkill,
    byBloomLevel,
    byDifficulty,
    skills: metrics,
  }
}

/**
 * Get difficulty bucket from numeric difficulty
 */
function getDifficultyBucket(difficulty: number): 'easy' | 'medium' | 'hard' {
  if (difficulty <= 3) return 'easy'
  if (difficulty <= 6) return 'medium'
  return 'hard'
}

/**
 * Format time duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Calculate learning efficiency score (0-100)
 */
export function calculateEfficiencyScore(metrics: TimeToMasteryMetrics): number {
  // Combine efficiency (attempts) and time factors
  const attemptScore = Math.min(100, metrics.efficiency * 50)

  // Time score: faster = better (compare to expected time)
  const expectedTimeMs = getExpectedAttempts(metrics.bloomLevel, metrics.difficulty) * 60000 // 1 min per attempt
  const actualTimeMs = metrics.totalPracticeTime
  const timeScore = actualTimeMs > 0
    ? Math.min(100, (expectedTimeMs / actualTimeMs) * 50)
    : 50

  return Math.round((attemptScore + timeScore) / 2)
}

/**
 * Predict time to mastery for a skill not yet mastered
 */
export function predictTimeToMastery(
  currentMastery: number,
  targetMastery: number,
  averageGainPerAttempt: number,
  averageTimePerAttempt: number
): { attempts: number; timeMs: number } | null {
  if (currentMastery >= targetMastery) {
    return { attempts: 0, timeMs: 0 }
  }

  if (averageGainPerAttempt <= 0) {
    return null // Cannot predict
  }

  const masteryNeeded = targetMastery - currentMastery
  const attemptsNeeded = Math.ceil(masteryNeeded / averageGainPerAttempt)
  const timeNeeded = attemptsNeeded * averageTimePerAttempt

  return {
    attempts: attemptsNeeded,
    timeMs: timeNeeded,
  }
}
