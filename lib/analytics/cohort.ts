/**
 * Cohort Analytics
 *
 * Aggregates learning analytics across multiple students
 * for educator dashboards and class-wide insights.
 */

import type { StudentProgress, CohortAnalytics } from './types'

interface StudentData {
  id: string
  name?: string
  email?: string
  skills: Array<{
    skillId: string
    skillName: string
    pMastery: number
    lastPracticeAt: Date | null
  }>
  interactions: Array<{
    type: string
    skillId: string
    timestamp: Date
    metadata?: Record<string, unknown>
  }>
  totalPracticeTimeMs: number
}

interface MisconceptionData {
  skillId: string
  misconception: string
  studentIds: string[]
}

/**
 * Calculate progress metrics for a single student
 */
export function calculateStudentProgress(data: StudentData): StudentProgress {
  const masteredCount = data.skills.filter(s => s.pMastery >= 0.8).length
  const inProgressCount = data.skills.filter(s => s.pMastery > 0 && s.pMastery < 0.8).length
  const notStartedCount = data.skills.filter(s => s.pMastery === 0).length

  const overallMastery = data.skills.length > 0
    ? data.skills.reduce((sum, s) => sum + s.pMastery, 0) / data.skills.length
    : 0

  // Find last activity
  const lastPractices = data.skills
    .filter(s => s.lastPracticeAt)
    .map(s => new Date(s.lastPracticeAt!))
  const lastActiveAt = lastPractices.length > 0
    ? new Date(Math.max(...lastPractices.map(d => d.getTime())))
    : null

  // Identify struggle areas (low mastery with attempts)
  const struggleAreas = data.skills
    .filter(s => s.pMastery < 0.4 && s.pMastery > 0)
    .map(s => s.skillName)

  // Determine if intervention needed
  const isInactive = lastActiveAt ? (Date.now() - lastActiveAt.getTime()) > 7 * 24 * 60 * 60 * 1000 : false
  const needsIntervention = struggleAreas.length >= 3 ||
    overallMastery < 0.3 ||
    isInactive // inactive 7+ days

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    masteredCount,
    inProgressCount,
    notStartedCount,
    overallMastery,
    lastActiveAt,
    totalPracticeTime: data.totalPracticeTimeMs,
    struggleAreas,
    needsIntervention,
  }
}

/**
 * Calculate cohort-wide analytics
 */
export function calculateCohortAnalytics(
  students: StudentData[],
  misconceptions: MisconceptionData[] = []
): CohortAnalytics {
  const progress = students.map(calculateStudentProgress)

  if (progress.length === 0) {
    return {
      studentCount: 0,
      averageMastery: 0,
      masteryDistribution: { high: 0, medium: 0, low: 0 },
      commonStruggleSpots: [],
      commonMisconceptions: [],
      studentsNeedingHelp: [],
      classProgress: [],
    }
  }

  const studentCount = progress.length
  const averageMastery = progress.reduce((sum, p) => sum + p.overallMastery, 0) / studentCount

  // Mastery distribution
  const masteryDistribution = {
    high: progress.filter(p => p.overallMastery >= 0.8).length,
    medium: progress.filter(p => p.overallMastery >= 0.4 && p.overallMastery < 0.8).length,
    low: progress.filter(p => p.overallMastery < 0.4).length,
  }

  // Find common struggle spots
  const struggleMap = new Map<string, { skillId: string; skillName: string; students: string[]; masterySum: number }>()

  for (const student of students) {
    for (const skill of student.skills) {
      if (skill.pMastery < 0.5) { // Struggling
        const existing = struggleMap.get(skill.skillId)
        if (existing) {
          existing.students.push(student.id)
          existing.masterySum += skill.pMastery
        } else {
          struggleMap.set(skill.skillId, {
            skillId: skill.skillId,
            skillName: skill.skillName,
            students: [student.id],
            masterySum: skill.pMastery,
          })
        }
      }
    }
  }

  const commonStruggleSpots = Array.from(struggleMap.values())
    .filter(s => s.students.length >= 2) // At least 2 students struggling
    .map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      studentCount: s.students.length,
      averageMastery: s.masterySum / s.students.length,
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 10) // Top 10

  // Process misconceptions
  const commonMisconceptions = misconceptions
    .filter(m => m.studentIds.length >= 2)
    .map(m => ({
      misconception: m.misconception,
      skillId: m.skillId,
      studentCount: m.studentIds.length,
      frequency: m.studentIds.length / studentCount,
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 10)

  // Students needing help
  const studentsNeedingHelp = progress
    .filter(p => p.needsIntervention)
    .sort((a, b) => a.overallMastery - b.overallMastery)

  return {
    studentCount,
    averageMastery,
    masteryDistribution,
    commonStruggleSpots,
    commonMisconceptions,
    studentsNeedingHelp,
    classProgress: progress,
  }
}

/**
 * Identify at-risk students based on multiple factors
 */
export function identifyAtRiskStudents(
  progress: StudentProgress[],
  options: {
    masteryThreshold?: number
    inactivityDays?: number
    struggleAreaThreshold?: number
  } = {}
): StudentProgress[] {
  const {
    masteryThreshold = 0.3,
    inactivityDays = 7,
    struggleAreaThreshold = 3,
  } = options

  const now = Date.now()
  const inactivityMs = inactivityDays * 24 * 60 * 60 * 1000

  return progress.filter(p => {
    // Low overall mastery
    if (p.overallMastery < masteryThreshold) return true

    // Too many struggle areas
    if (p.struggleAreas.length >= struggleAreaThreshold) return true

    // Inactive for too long
    if (p.lastActiveAt && (now - p.lastActiveAt.getTime()) > inactivityMs) return true

    return false
  })
}

/**
 * Generate intervention recommendations for a student
 */
export function generateInterventionRecommendations(
  student: StudentProgress
): Array<{ type: string; priority: 'high' | 'medium' | 'low'; message: string }> {
  const recommendations: Array<{ type: string; priority: 'high' | 'medium' | 'low'; message: string }> = []

  if (student.overallMastery < 0.2) {
    recommendations.push({
      type: 'fundamental_support',
      priority: 'high',
      message: 'Student needs significant support. Consider one-on-one tutoring or foundational review.',
    })
  }

  if (student.struggleAreas.length >= 3) {
    recommendations.push({
      type: 'targeted_practice',
      priority: 'high',
      message: `Focus on struggle areas: ${student.struggleAreas.slice(0, 3).join(', ')}`,
    })
  }

  if (student.lastActiveAt) {
    const daysSinceActive = Math.floor((Date.now() - student.lastActiveAt.getTime()) / (24 * 60 * 60 * 1000))
    if (daysSinceActive >= 7) {
      recommendations.push({
        type: 'engagement',
        priority: daysSinceActive >= 14 ? 'high' : 'medium',
        message: `Student has been inactive for ${daysSinceActive} days. Check in to re-engage.`,
      })
    }
  }

  if (student.masteredCount === 0 && student.inProgressCount > 0) {
    recommendations.push({
      type: 'encouragement',
      priority: 'medium',
      message: 'Student is working but hasn\'t mastered any skills yet. Encourage persistence.',
    })
  }

  return recommendations
}

/**
 * Calculate class velocity (average mastery gain per week)
 */
export function calculateClassVelocity(
  weeklyMasterySnapshots: Array<{ week: string; averageMastery: number }>
): { velocity: number; trend: 'accelerating' | 'steady' | 'slowing' } {
  if (weeklyMasterySnapshots.length < 2) {
    return { velocity: 0, trend: 'steady' }
  }

  // Calculate week-over-week changes
  const changes: number[] = []
  for (let i = 1; i < weeklyMasterySnapshots.length; i++) {
    changes.push(weeklyMasterySnapshots[i].averageMastery - weeklyMasterySnapshots[i - 1].averageMastery)
  }

  const averageVelocity = changes.reduce((a, b) => a + b, 0) / changes.length

  // Determine trend by comparing recent vs earlier changes
  const recentChanges = changes.slice(-3)
  const earlierChanges = changes.slice(0, -3)

  let trend: 'accelerating' | 'steady' | 'slowing' = 'steady'
  if (recentChanges.length > 0 && earlierChanges.length > 0) {
    const recentAvg = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length
    const earlierAvg = earlierChanges.reduce((a, b) => a + b, 0) / earlierChanges.length

    if (recentAvg > earlierAvg * 1.2) trend = 'accelerating'
    else if (recentAvg < earlierAvg * 0.8) trend = 'slowing'
  }

  return { velocity: averageVelocity, trend }
}

/**
 * Compare student to class average
 */
export function compareToClass(
  student: StudentProgress,
  classAverage: { mastery: number; practiceTime: number }
): {
  masteryDelta: number
  practiceTimeDelta: number
  position: 'above' | 'at' | 'below'
} {
  const masteryDelta = student.overallMastery - classAverage.mastery
  const practiceTimeDelta = student.totalPracticeTime - classAverage.practiceTime

  let position: 'above' | 'at' | 'below' = 'at'
  if (masteryDelta > 0.1) position = 'above'
  else if (masteryDelta < -0.1) position = 'below'

  return { masteryDelta, practiceTimeDelta, position }
}
