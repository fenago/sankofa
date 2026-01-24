/**
 * Transfer Success Analytics
 *
 * Measures how well learners can apply knowledge to novel situations
 * (transfer learning) vs. practiced scenarios.
 */

import type { TransferMetrics, TransferSummary } from './types'

interface SkillTransferData {
  skillId: string
  skillName: string
  practiceAttempts: Array<{
    isNovel: boolean // true if question was varied/novel
    correct: boolean
    questionType: string
  }>
}

/**
 * Calculate transfer metrics for a single skill
 */
export function calculateSkillTransfer(data: SkillTransferData): TransferMetrics {
  const practiceQuestions = data.practiceAttempts.filter(a => !a.isNovel)
  const novelQuestions = data.practiceAttempts.filter(a => a.isNovel)

  const practiceAccuracy = practiceQuestions.length > 0
    ? practiceQuestions.filter(a => a.correct).length / practiceQuestions.length
    : 0

  const transferAccuracy = novelQuestions.length > 0
    ? novelQuestions.filter(a => a.correct).length / novelQuestions.length
    : 0

  const transferRatio = practiceAccuracy > 0
    ? transferAccuracy / practiceAccuracy
    : 0

  return {
    skillId: data.skillId,
    skillName: data.skillName,
    practiceAccuracy,
    transferAccuracy,
    transferRatio: Math.min(1.5, transferRatio), // Cap at 150% (can exceed if novel easier)
    novelProblemCount: novelQuestions.length,
  }
}

/**
 * Calculate transfer summary across all skills
 */
export function calculateTransferSummary(skills: SkillTransferData[]): TransferSummary {
  const metrics = skills
    .map(calculateSkillTransfer)
    .filter(m => m.novelProblemCount > 0) // Only include skills with transfer data

  if (metrics.length === 0) {
    return {
      averageTransferRatio: 0,
      skillsWithGoodTransfer: [],
      skillsWithPoorTransfer: [],
      overallPracticeAccuracy: 0,
      overallTransferAccuracy: 0,
      skills: [],
    }
  }

  const averageTransferRatio = metrics.reduce((sum, m) => sum + m.transferRatio, 0) / metrics.length

  // Calculate overall accuracies
  const allPractice = skills.flatMap(s => s.practiceAttempts.filter(a => !a.isNovel))
  const allNovel = skills.flatMap(s => s.practiceAttempts.filter(a => a.isNovel))

  const overallPracticeAccuracy = allPractice.length > 0
    ? allPractice.filter(a => a.correct).length / allPractice.length
    : 0

  const overallTransferAccuracy = allNovel.length > 0
    ? allNovel.filter(a => a.correct).length / allNovel.length
    : 0

  return {
    averageTransferRatio,
    skillsWithGoodTransfer: metrics.filter(m => m.transferRatio >= 0.8),
    skillsWithPoorTransfer: metrics.filter(m => m.transferRatio < 0.5 && m.novelProblemCount >= 3),
    overallPracticeAccuracy,
    overallTransferAccuracy,
    skills: metrics,
  }
}

/**
 * Interpret transfer ratio
 */
export function interpretTransferRatio(ratio: number): {
  level: 'excellent' | 'good' | 'moderate' | 'poor'
  description: string
  recommendation: string
} {
  if (ratio >= 0.9) {
    return {
      level: 'excellent',
      description: 'Strong knowledge transfer - applies well to new situations',
      recommendation: 'Ready for more challenging novel problems',
    }
  } else if (ratio >= 0.7) {
    return {
      level: 'good',
      description: 'Good transfer - can handle most variations',
      recommendation: 'Practice with more diverse problem types',
    }
  } else if (ratio >= 0.5) {
    return {
      level: 'moderate',
      description: 'Moderate transfer - some difficulty with novel problems',
      recommendation: 'Focus on understanding underlying principles',
    }
  } else {
    return {
      level: 'poor',
      description: 'Limited transfer - struggles with unfamiliar contexts',
      recommendation: 'Review fundamentals and practice varied examples',
    }
  }
}

/**
 * Identify knowledge that appears rote (high practice, low transfer)
 */
export function identifyRoteKnowledge(metrics: TransferMetrics[]): TransferMetrics[] {
  return metrics.filter(m =>
    m.practiceAccuracy >= 0.8 && // Good at practiced questions
    m.transferRatio < 0.5 && // Poor at novel questions
    m.novelProblemCount >= 3 // Enough data to be confident
  )
}

/**
 * Identify robust knowledge (good transfer)
 */
export function identifyRobustKnowledge(metrics: TransferMetrics[]): TransferMetrics[] {
  return metrics.filter(m =>
    m.practiceAccuracy >= 0.7 &&
    m.transferRatio >= 0.8 &&
    m.novelProblemCount >= 3
  )
}

/**
 * Calculate transfer readiness score for a skill
 */
export function calculateTransferReadiness(
  practiceAccuracy: number,
  attemptCount: number,
  variationExposure: number // number of different question types seen
): number {
  // Need sufficient practice attempts
  const practiceScore = Math.min(1, attemptCount / 10) * 30

  // Need high accuracy
  const accuracyScore = practiceAccuracy * 40

  // Need exposure to variations
  const variationScore = Math.min(1, variationExposure / 5) * 30

  return Math.round(practiceScore + accuracyScore + variationScore)
}

/**
 * Recommend next steps based on transfer performance
 */
export function getTransferRecommendations(
  summary: TransferSummary
): Array<{ type: string; message: string; skillIds: string[] }> {
  const recommendations: Array<{ type: string; message: string; skillIds: string[] }> = []

  // Skills needing fundamental review
  const roteSkills = identifyRoteKnowledge(summary.skills)
  if (roteSkills.length > 0) {
    recommendations.push({
      type: 'review_fundamentals',
      message: 'These skills may be memorized rather than understood. Focus on "why" not just "how".',
      skillIds: roteSkills.map(s => s.skillId),
    })
  }

  // Skills ready for advanced application
  const robustSkills = identifyRobustKnowledge(summary.skills)
  if (robustSkills.length > 0) {
    recommendations.push({
      type: 'ready_for_advanced',
      message: 'These skills show strong transfer. Try more complex applications.',
      skillIds: robustSkills.map(s => s.skillId),
    })
  }

  // Skills needing more varied practice
  const needVariation = summary.skills.filter(s =>
    s.transferRatio >= 0.5 && s.transferRatio < 0.8 && s.novelProblemCount < 5
  )
  if (needVariation.length > 0) {
    recommendations.push({
      type: 'need_variation',
      message: 'Practice these skills with more varied problem types.',
      skillIds: needVariation.map(s => s.skillId),
    })
  }

  return recommendations
}
