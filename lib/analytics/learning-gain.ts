/**
 * Learning Gain Calculator
 *
 * Calculates normalized learning gains using Hake's formula:
 * g = (post - pre) / (1 - pre)
 *
 * This measures what fraction of possible improvement was achieved.
 */

import type { LearningGain, OverallLearningGain } from './types'

interface SkillMasteryHistory {
  skillId: string
  skillName: string
  masteryHistory: Array<{
    pMastery: number
    recordedAt: Date
  }>
}

/**
 * Calculate normalized learning gain for a single skill
 */
export function calculateNormalizedGain(preScore: number, postScore: number): number {
  // Clamp values to [0, 1]
  const pre = Math.max(0, Math.min(1, preScore))
  const post = Math.max(0, Math.min(1, postScore))

  // If already at maximum, no gain possible
  if (pre >= 0.99) return 0

  // Hake's formula: g = (post - pre) / (1 - pre)
  const normalizedGain = (post - pre) / (1 - pre)

  // Clamp result to [-1, 1] (can be negative if performance decreased)
  return Math.max(-1, Math.min(1, normalizedGain))
}

/**
 * Calculate learning gains for a skill given its mastery history
 */
export function calculateSkillLearningGain(
  skill: SkillMasteryHistory,
  periodStart?: Date,
  periodEnd?: Date
): LearningGain | null {
  const history = skill.masteryHistory
    .filter(h => {
      if (periodStart && new Date(h.recordedAt) < periodStart) return false
      if (periodEnd && new Date(h.recordedAt) > periodEnd) return false
      return true
    })
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())

  if (history.length < 2) return null

  const preScore = history[0].pMastery
  const postScore = history[history.length - 1].pMastery

  return {
    skillId: skill.skillId,
    skillName: skill.skillName,
    preScore,
    postScore,
    normalizedGain: calculateNormalizedGain(preScore, postScore),
    absoluteGain: postScore - preScore,
    measurementPeriod: {
      start: new Date(history[0].recordedAt),
      end: new Date(history[history.length - 1].recordedAt),
    },
  }
}

/**
 * Calculate overall learning gains across all skills
 */
export function calculateOverallLearningGains(
  skills: SkillMasteryHistory[],
  periodStart?: Date,
  periodEnd?: Date
): OverallLearningGain {
  const gains = skills
    .map(skill => calculateSkillLearningGain(skill, periodStart, periodEnd))
    .filter((g): g is LearningGain => g !== null)

  if (gains.length === 0) {
    return {
      totalSkills: 0,
      averageNormalizedGain: 0,
      averageAbsoluteGain: 0,
      highGainSkills: [],
      lowGainSkills: [],
      gains: [],
    }
  }

  const totalNormalizedGain = gains.reduce((sum, g) => sum + g.normalizedGain, 0)
  const totalAbsoluteGain = gains.reduce((sum, g) => sum + g.absoluteGain, 0)

  return {
    totalSkills: gains.length,
    averageNormalizedGain: totalNormalizedGain / gains.length,
    averageAbsoluteGain: totalAbsoluteGain / gains.length,
    highGainSkills: gains.filter(g => g.normalizedGain > 0.7),
    lowGainSkills: gains.filter(g => g.normalizedGain < 0.3 && g.normalizedGain >= 0),
    gains,
  }
}

/**
 * Interpret normalized gain based on Hake's categories
 */
export function interpretNormalizedGain(gain: number): {
  category: 'high' | 'medium' | 'low' | 'negative'
  description: string
} {
  if (gain >= 0.7) {
    return {
      category: 'high',
      description: 'High learning gain - excellent progress',
    }
  } else if (gain >= 0.3) {
    return {
      category: 'medium',
      description: 'Medium learning gain - good progress',
    }
  } else if (gain >= 0) {
    return {
      category: 'low',
      description: 'Low learning gain - some progress',
    }
  } else {
    return {
      category: 'negative',
      description: 'Performance decreased - may need review',
    }
  }
}

/**
 * Calculate learning velocity (rate of gain over time)
 */
export function calculateLearningVelocity(gain: LearningGain): number {
  const durationMs = gain.measurementPeriod.end.getTime() - gain.measurementPeriod.start.getTime()
  const durationDays = durationMs / (1000 * 60 * 60 * 24)

  if (durationDays === 0) return 0

  // Gain per day
  return gain.normalizedGain / durationDays
}

/**
 * Project future mastery based on current velocity
 */
export function projectMastery(
  currentMastery: number,
  dailyVelocity: number,
  targetMastery: number
): { daysToTarget: number; achievable: boolean } {
  if (currentMastery >= targetMastery) {
    return { daysToTarget: 0, achievable: true }
  }

  if (dailyVelocity <= 0) {
    return { daysToTarget: Infinity, achievable: false }
  }

  // Using normalized gain formula in reverse
  // g = (target - current) / (1 - current)
  const requiredGain = (targetMastery - currentMastery) / (1 - currentMastery)
  const daysToTarget = requiredGain / dailyVelocity

  return {
    daysToTarget: Math.ceil(daysToTarget),
    achievable: daysToTarget < 365, // reasonable timeframe
  }
}
