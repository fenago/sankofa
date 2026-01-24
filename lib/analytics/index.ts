/**
 * Analytics Module - Learning analytics and impact measurement
 */

export * from './types'
export * from './learning-gain'
export * from './retention'
export * from './time-to-mastery'
export * from './transfer'
export * from './cohort'

// Re-export commonly used functions
export {
  calculateNormalizedGain,
  calculateOverallLearningGains,
  interpretNormalizedGain,
  calculateLearningVelocity,
  projectMastery,
} from './learning-gain'

export {
  calculateSkillRetention,
  calculateRetentionSummary,
  calculatePredictedRetention,
  calculateOptimalReviewTime,
  getRetentionRisk,
} from './retention'

export {
  calculateTimeToMastery,
  calculateTimeToMasterySummary,
  formatDuration,
  calculateEfficiencyScore,
  predictTimeToMastery,
} from './time-to-mastery'

export {
  calculateSkillTransfer,
  calculateTransferSummary,
  interpretTransferRatio,
  identifyRoteKnowledge,
  identifyRobustKnowledge,
  getTransferRecommendations,
} from './transfer'

export {
  calculateStudentProgress,
  calculateCohortAnalytics,
  identifyAtRiskStudents,
  generateInterventionRecommendations,
  calculateClassVelocity,
  compareToClass,
} from './cohort'
