/**
 * Analytics Types - Learning analytics and impact measurement
 */

// Learning gain metrics
export interface LearningGain {
  skillId: string
  skillName: string
  preScore: number // Initial mastery
  postScore: number // Current mastery
  normalizedGain: number // (post - pre) / (1 - pre)
  absoluteGain: number // post - pre
  measurementPeriod: {
    start: Date
    end: Date
  }
}

export interface OverallLearningGain {
  totalSkills: number
  averageNormalizedGain: number
  averageAbsoluteGain: number
  highGainSkills: LearningGain[] // normalized > 0.7
  lowGainSkills: LearningGain[] // normalized < 0.3
  gains: LearningGain[]
}

// Retention metrics
export interface RetentionMetrics {
  skillId: string
  skillName: string
  initialMastery: number
  currentMastery: number
  daysSinceLastPractice: number
  retentionRate: number // current / initial
  predictedDecay: number // based on forgetting curve
  reviewsCompleted: number
  reviewsMissed: number
}

export interface RetentionSummary {
  averageRetention: number
  skillsNeedingReview: RetentionMetrics[]
  wellRetainedSkills: RetentionMetrics[]
  forgettingCurveData: Array<{
    daysAgo: number
    averageRetention: number
  }>
}

// Time to mastery metrics
export interface TimeToMasteryMetrics {
  skillId: string
  skillName: string
  startedAt: Date
  masteredAt: Date | null
  totalPracticeTime: number // ms
  attemptCount: number
  averageTimePerAttempt: number
  efficiency: number // attempts needed vs expected
  bloomLevel: number
  difficulty: number
}

export interface TimeToMasterySummary {
  averageTimeToMastery: number // ms
  medianTimeToMastery: number
  fastestSkill: TimeToMasteryMetrics | null
  slowestSkill: TimeToMasteryMetrics | null
  byBloomLevel: Record<number, number> // bloomLevel -> avgTime
  byDifficulty: Record<string, number> // difficulty bucket -> avgTime
  skills: TimeToMasteryMetrics[]
}

// Transfer success (novel problem performance)
export interface TransferMetrics {
  skillId: string
  skillName: string
  practiceAccuracy: number // on practiced question types
  transferAccuracy: number // on novel/varied questions
  transferRatio: number // transfer / practice
  novelProblemCount: number
}

export interface TransferSummary {
  averageTransferRatio: number
  skillsWithGoodTransfer: TransferMetrics[] // ratio > 0.8
  skillsWithPoorTransfer: TransferMetrics[] // ratio < 0.5
  overallPracticeAccuracy: number
  overallTransferAccuracy: number
  skills: TransferMetrics[]
}

// Cohort/class analytics
export interface StudentProgress {
  id: string
  name?: string
  email?: string
  masteredCount: number
  inProgressCount: number
  notStartedCount: number
  overallMastery: number
  lastActiveAt: Date | null
  totalPracticeTime: number
  struggleAreas: string[] // skill names
  needsIntervention: boolean
}

export interface CohortAnalytics {
  studentCount: number
  averageMastery: number
  masteryDistribution: {
    high: number // >80%
    medium: number // 40-80%
    low: number // <40%
  }
  commonStruggleSpots: Array<{
    skillId: string
    skillName: string
    studentCount: number
    averageMastery: number
  }>
  commonMisconceptions: Array<{
    misconception: string
    skillId: string
    studentCount: number
    frequency: number
  }>
  studentsNeedingHelp: StudentProgress[]
  classProgress: StudentProgress[]
}

// Combined analytics response
export interface AnalyticsDashboard {
  learningGains: OverallLearningGain
  retention: RetentionSummary
  timeToMastery: TimeToMasterySummary
  transfer: TransferSummary
  summary: {
    totalSkills: number
    masteredSkills: number
    inProgressSkills: number
    totalPracticeTime: number
    totalAttempts: number
    averageAccuracy: number
    streakDays: number
  }
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'pdf'

export interface ExportOptions {
  format: ExportFormat
  includeSkillMastery?: boolean
  includeInteractions?: boolean
  includeAssessments?: boolean
  includeMetadata?: boolean
  anonymize?: boolean
  dateRange?: 'week' | 'month'
}

export interface ExportResult {
  format: ExportFormat
  filename: string
  data: string | Buffer
  recordCount: number
  generatedAt: Date
}
