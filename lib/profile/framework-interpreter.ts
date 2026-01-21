/**
 * Framework Interpreter
 *
 * Translates raw educational psychology framework metrics into
 * user-friendly insights and actionable recommendations.
 */

import type { InverseProfile } from '@/lib/types/interactions'

// ============================================
// Types
// ============================================

export type FrameworkId =
  | 'bkt'           // Bayesian Knowledge Tracing
  | 'irt'           // Item Response Theory
  | 'sm2'           // Spaced Repetition
  | 'bloom'         // Bloom's Taxonomy
  | 'cognitive_load' // Cognitive Load Theory
  | 'zpd'           // Zone of Proximal Development
  | 'threshold'     // Threshold Concepts
  | 'metacognitive' // Self-Regulated Learning / Metacognition

export type StatusLevel = 'excellent' | 'good' | 'developing' | 'needs_attention' | 'insufficient_data'

export interface FrameworkStatus {
  id: FrameworkId
  name: string
  shortName: string
  description: string
  researcher: string
  year: number

  // Current state
  status: StatusLevel
  statusLabel: string
  score: number | null  // 0-100 normalized score, null if insufficient data

  // User-friendly display
  headline: string      // e.g., "You've mastered 12 of 45 skills"
  interpretation: string // What this means
  recommendation: string // What to do next

  // Visual indicator
  icon: string          // Emoji for quick recognition
  color: string         // Tailwind color class

  // Detailed metrics (for drill-down)
  metrics: FrameworkMetric[]

  // Data quality
  dataQuality: 'insufficient' | 'limited' | 'adequate' | 'good'
  dataPoints: number
  minDataPoints: number
}

export interface FrameworkMetric {
  key: string
  label: string
  value: string | number | null
  unit?: string
  description: string
  isGood?: boolean  // Green/red indicator
}

export interface FrameworkDashboard {
  learnerId: string
  notebookId: string
  computedAt: string
  overallReadiness: number  // 0-100
  overallMessage: string
  frameworks: FrameworkStatus[]
  topInsights: string[]
  priorityActions: string[]
}

// ============================================
// Status Level Helpers
// ============================================

function getStatusColor(status: StatusLevel): string {
  switch (status) {
    case 'excellent': return 'green'
    case 'good': return 'blue'
    case 'developing': return 'amber'
    case 'needs_attention': return 'red'
    case 'insufficient_data': return 'gray'
  }
}

function getStatusLabel(status: StatusLevel): string {
  switch (status) {
    case 'excellent': return 'Excellent'
    case 'good': return 'Good'
    case 'developing': return 'Developing'
    case 'needs_attention': return 'Needs Attention'
    case 'insufficient_data': return 'Not Enough Data'
  }
}

// ============================================
// BKT Interpreter
// ============================================

export function interpretBKT(
  profile: InverseProfile | null,
  skillStats: { total: number; mastered: number; inProgress: number; notStarted: number }
): FrameworkStatus {
  const knowledge = profile?.knowledge_state

  if (!knowledge || skillStats.total === 0) {
    return {
      id: 'bkt',
      name: 'Bayesian Knowledge Tracing',
      shortName: 'Mastery',
      description: 'Tracks the probability that you have truly learned each skill based on your practice performance.',
      researcher: 'Corbett & Anderson',
      year: 1995,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'Start practicing to track mastery',
      interpretation: 'We need to see you practice before we can estimate your knowledge.',
      recommendation: 'Try some practice questions on any skill to begin tracking.',
      icon: '🎯',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: 0,
      minDataPoints: 5,
    }
  }

  const masteryPercent = Math.round((skillStats.mastered / skillStats.total) * 100)
  const avgMastery = Math.round((knowledge.averageMastery ?? 0) * 100)

  let status: StatusLevel
  let recommendation: string

  if (masteryPercent >= 80) {
    status = 'excellent'
    recommendation = 'You\'re doing great! Focus on the remaining skills or deepen your understanding of mastered ones.'
  } else if (masteryPercent >= 60) {
    status = 'good'
    recommendation = 'Keep up the momentum. Target the skills in your Zone of Proximal Development.'
  } else if (masteryPercent >= 30) {
    status = 'developing'
    recommendation = 'You\'re making progress. Regular practice will accelerate your mastery.'
  } else {
    status = 'needs_attention'
    recommendation = 'Start with foundational skills and work your way up. Consistency is key.'
  }

  const knowledgeGaps = knowledge.knowledgeGaps?.length ?? 0
  const misconceptions = knowledge.misconceptions?.length ?? 0

  return {
    id: 'bkt',
    name: 'Bayesian Knowledge Tracing',
    shortName: 'Mastery',
    description: 'Tracks the probability that you have truly learned each skill based on your practice performance.',
    researcher: 'Corbett & Anderson',
    year: 1995,
    status,
    statusLabel: getStatusLabel(status),
    score: avgMastery,
    headline: `${skillStats.mastered} of ${skillStats.total} skills mastered (${masteryPercent}%)`,
    interpretation: avgMastery >= 70
      ? 'Your overall mastery probability is strong. The model is confident you\'ve learned most attempted skills.'
      : 'Your mastery is still building. Keep practicing to increase the model\'s confidence in your knowledge.',
    recommendation,
    icon: '🎯',
    color: getStatusColor(status),
    metrics: [
      { key: 'mastered', label: 'Skills Mastered', value: skillStats.mastered, description: 'Skills with P(mastery) ≥ 95%' },
      { key: 'inProgress', label: 'In Progress', value: skillStats.inProgress, description: 'Skills you\'ve started but not mastered' },
      { key: 'notStarted', label: 'Not Started', value: skillStats.notStarted, description: 'Skills you haven\'t practiced yet' },
      { key: 'avgMastery', label: 'Average P(Mastery)', value: `${avgMastery}%`, description: 'Mean mastery probability across all attempted skills' },
      { key: 'knowledgeGaps', label: 'Knowledge Gaps', value: knowledgeGaps, description: 'Skills with low mastery despite multiple attempts', isGood: knowledgeGaps === 0 },
      { key: 'misconceptions', label: 'Potential Misconceptions', value: misconceptions, description: 'Skills with high error rates suggesting confusion', isGood: misconceptions === 0 },
    ],
    dataQuality: skillStats.inProgress + skillStats.mastered >= 10 ? 'good' : skillStats.inProgress + skillStats.mastered >= 5 ? 'adequate' : 'limited',
    dataPoints: skillStats.inProgress + skillStats.mastered,
    minDataPoints: 5,
  }
}

// ============================================
// IRT Interpreter
// ============================================

export function interpretIRT(
  profile: InverseProfile | null,
  practiceStats: { totalAttempts: number; avgDifficulty: number; avgAccuracy: number }
): FrameworkStatus {
  const cognitive = profile?.cognitive_indicators

  if (!cognitive || practiceStats.totalAttempts < 10) {
    return {
      id: 'irt',
      name: 'Item Response Theory',
      shortName: 'Ability Level',
      description: 'Estimates your overall ability level based on which difficulty of questions you answer correctly.',
      researcher: 'Lord',
      year: 1980,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'Need more practice to estimate ability',
      interpretation: 'IRT requires seeing your performance across different difficulty levels.',
      recommendation: 'Complete at least 10 practice questions to calibrate your ability estimate.',
      icon: '📊',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: practiceStats.totalAttempts,
      minDataPoints: 10,
    }
  }

  // Map expertise level to IRT-like ability estimate
  const expertiseLevels: Record<string, number> = {
    'novice': 20,
    'beginner': 40,
    'intermediate': 60,
    'advanced': 80,
    'expert': 95,
  }

  const abilityScore = expertiseLevels[cognitive.expertiseLevel] ?? 50
  const optimalDifficulty = cognitive.optimalComplexityLevel ?? 0.5

  let status: StatusLevel
  if (abilityScore >= 80) status = 'excellent'
  else if (abilityScore >= 60) status = 'good'
  else if (abilityScore >= 40) status = 'developing'
  else status = 'needs_attention'

  const levelDescriptions: Record<string, string> = {
    'novice': 'You\'re just getting started. Focus on foundational concepts.',
    'beginner': 'You\'re building a foundation. Keep practicing to solidify basics.',
    'intermediate': 'You have solid understanding. Ready to tackle more complex topics.',
    'advanced': 'You\'re performing well. Challenge yourself with higher-level thinking.',
    'expert': 'Excellent performance! You\'re ready for the most challenging material.',
  }

  return {
    id: 'irt',
    name: 'Item Response Theory',
    shortName: 'Ability Level',
    description: 'Estimates your overall ability level based on which difficulty of questions you answer correctly.',
    researcher: 'Lord',
    year: 1980,
    status,
    statusLabel: getStatusLabel(status),
    score: abilityScore,
    headline: `Estimated ability: ${cognitive.expertiseLevel.charAt(0).toUpperCase() + cognitive.expertiseLevel.slice(1)}`,
    interpretation: levelDescriptions[cognitive.expertiseLevel] ?? 'Keep practicing to refine your ability estimate.',
    recommendation: `Your optimal challenge level is around ${Math.round(optimalDifficulty * 100)}% difficulty. Questions at this level will help you grow most efficiently.`,
    icon: '📊',
    color: getStatusColor(status),
    metrics: [
      { key: 'expertiseLevel', label: 'Expertise Level', value: cognitive.expertiseLevel, description: 'Your overall ability category' },
      { key: 'optimalDifficulty', label: 'Optimal Difficulty', value: `${Math.round(optimalDifficulty * 100)}%`, description: 'Difficulty level where you learn best (~70% success rate)' },
      { key: 'cognitiveLoadThreshold', label: 'Complexity Threshold', value: cognitive.cognitiveLoadThreshold ?? 'unknown', description: 'Difficulty level where performance drops significantly' },
      { key: 'avgResponseTime', label: 'Avg Response Time', value: cognitive.averageResponseTimeMs ? `${Math.round(cognitive.averageResponseTimeMs / 1000)}s` : 'N/A', description: 'How long you typically take to answer' },
      { key: 'accuracy', label: 'Overall Accuracy', value: `${Math.round(practiceStats.avgAccuracy * 100)}%`, description: 'Your average correctness rate' },
    ],
    dataQuality: practiceStats.totalAttempts >= 30 ? 'good' : practiceStats.totalAttempts >= 15 ? 'adequate' : 'limited',
    dataPoints: practiceStats.totalAttempts,
    minDataPoints: 10,
  }
}

// ============================================
// SM-2 Interpreter
// ============================================

export function interpretSM2(
  dueSkills: number,
  totalScheduled: number,
  overdueCount: number,
  avgInterval: number
): FrameworkStatus {
  if (totalScheduled === 0) {
    return {
      id: 'sm2',
      name: 'Spaced Repetition (SM-2)',
      shortName: 'Reviews',
      description: 'Schedules reviews at optimal intervals to maximize long-term retention with minimal effort.',
      researcher: 'Wozniak',
      year: 1987,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'No skills scheduled for review yet',
      interpretation: 'Complete practice sessions to start building your review schedule.',
      recommendation: 'Practice any skill to begin spaced repetition scheduling.',
      icon: '🔄',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: 0,
      minDataPoints: 1,
    }
  }

  const completionRate = totalScheduled > 0 ? Math.round(((totalScheduled - dueSkills) / totalScheduled) * 100) : 0
  const overdueRate = totalScheduled > 0 ? Math.round((overdueCount / totalScheduled) * 100) : 0

  let status: StatusLevel
  let recommendation: string

  if (overdueCount === 0 && dueSkills === 0) {
    status = 'excellent'
    recommendation = 'You\'re all caught up! Check back later for new reviews.'
  } else if (overdueCount === 0 && dueSkills <= 5) {
    status = 'good'
    recommendation = `Complete your ${dueSkills} pending review${dueSkills > 1 ? 's' : ''} to stay on track.`
  } else if (overdueCount <= 3) {
    status = 'developing'
    recommendation = `You have ${overdueCount} overdue review${overdueCount > 1 ? 's' : ''}. Try to catch up today.`
  } else {
    status = 'needs_attention'
    recommendation = `${overdueCount} skills are overdue. Regular review prevents forgetting - try a quick session now.`
  }

  return {
    id: 'sm2',
    name: 'Spaced Repetition (SM-2)',
    shortName: 'Reviews',
    description: 'Schedules reviews at optimal intervals to maximize long-term retention with minimal effort.',
    researcher: 'Wozniak',
    year: 1987,
    status,
    statusLabel: getStatusLabel(status),
    score: Math.max(0, 100 - overdueRate * 2),
    headline: dueSkills === 0 ? 'All caught up!' : `${dueSkills} skill${dueSkills > 1 ? 's' : ''} due for review`,
    interpretation: overdueCount > 0
      ? `You have ${overdueCount} overdue items. The longer you wait, the more you may forget.`
      : 'You\'re keeping up with your review schedule. Great for long-term retention!',
    recommendation,
    icon: '🔄',
    color: getStatusColor(status),
    metrics: [
      { key: 'dueNow', label: 'Due Now', value: dueSkills, description: 'Skills that need review today', isGood: dueSkills === 0 },
      { key: 'overdue', label: 'Overdue', value: overdueCount, description: 'Skills past their review date', isGood: overdueCount === 0 },
      { key: 'totalScheduled', label: 'Total Scheduled', value: totalScheduled, description: 'Skills in your review rotation' },
      { key: 'avgInterval', label: 'Avg Interval', value: avgInterval > 0 ? `${avgInterval} days` : 'N/A', description: 'Average time between reviews' },
    ],
    dataQuality: totalScheduled >= 10 ? 'good' : totalScheduled >= 5 ? 'adequate' : 'limited',
    dataPoints: totalScheduled,
    minDataPoints: 1,
  }
}

// ============================================
// Bloom's Taxonomy Interpreter
// ============================================

export function interpretBloom(
  skillsByLevel: Record<number, { total: number; mastered: number }>
): FrameworkStatus {
  const levels = [1, 2, 3, 4, 5, 6]
  const levelNames = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

  const totalSkills = levels.reduce((sum, l) => sum + (skillsByLevel[l]?.total ?? 0), 0)
  const totalMastered = levels.reduce((sum, l) => sum + (skillsByLevel[l]?.mastered ?? 0), 0)

  if (totalSkills === 0) {
    return {
      id: 'bloom',
      name: 'Bloom\'s Taxonomy',
      shortName: 'Cognitive Levels',
      description: 'Organizes learning from basic recall to complex creation, ensuring you build understanding progressively.',
      researcher: 'Anderson & Krathwohl',
      year: 2001,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'No skills categorized yet',
      interpretation: 'Skills are categorized by cognitive level as they\'re extracted from your content.',
      recommendation: 'Add content to your notebook to see your Bloom\'s Taxonomy breakdown.',
      icon: '🔺',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: 0,
      minDataPoints: 5,
    }
  }

  // Find highest level with mastery and lowest level with gaps
  let highestMastered = 0
  let lowestGap = 7

  for (const level of levels) {
    const stats = skillsByLevel[level]
    if (stats && stats.mastered > 0) {
      highestMastered = Math.max(highestMastered, level)
    }
    if (stats && stats.total > stats.mastered) {
      lowestGap = Math.min(lowestGap, level)
    }
  }

  const masteryPercent = Math.round((totalMastered / totalSkills) * 100)

  let status: StatusLevel
  if (highestMastered >= 5 && masteryPercent >= 60) status = 'excellent'
  else if (highestMastered >= 4 || masteryPercent >= 50) status = 'good'
  else if (highestMastered >= 2 || masteryPercent >= 25) status = 'developing'
  else status = 'needs_attention'

  const gapLevelName = lowestGap <= 6 ? levelNames[lowestGap - 1] : null
  const recommendation = gapLevelName
    ? `Focus on "${gapLevelName}" level skills to build a stronger foundation before advancing.`
    : 'Great coverage! Challenge yourself with higher-level thinking tasks.'

  return {
    id: 'bloom',
    name: 'Bloom\'s Taxonomy',
    shortName: 'Cognitive Levels',
    description: 'Organizes learning from basic recall to complex creation, ensuring you build understanding progressively.',
    researcher: 'Anderson & Krathwohl',
    year: 2001,
    status,
    statusLabel: getStatusLabel(status),
    score: masteryPercent,
    headline: `Reached "${levelNames[highestMastered - 1] ?? 'None'}" level`,
    interpretation: highestMastered >= 4
      ? 'You\'re engaging with higher-order thinking skills like analysis and evaluation.'
      : 'You\'re building foundational understanding. Higher-order skills come with practice.',
    recommendation,
    icon: '🔺',
    color: getStatusColor(status),
    metrics: levels.map(level => ({
      key: `level${level}`,
      label: levelNames[level - 1],
      value: `${skillsByLevel[level]?.mastered ?? 0}/${skillsByLevel[level]?.total ?? 0}`,
      description: `Level ${level}: ${levelNames[level - 1]}`,
      isGood: (skillsByLevel[level]?.mastered ?? 0) === (skillsByLevel[level]?.total ?? 0) && (skillsByLevel[level]?.total ?? 0) > 0,
    })),
    dataQuality: totalSkills >= 20 ? 'good' : totalSkills >= 10 ? 'adequate' : 'limited',
    dataPoints: totalSkills,
    minDataPoints: 5,
  }
}

// ============================================
// Cognitive Load Interpreter
// ============================================

export function interpretCognitiveLoad(
  profile: InverseProfile | null,
  sessionStats: { avgDurationMin: number; totalSessions: number }
): FrameworkStatus {
  const cognitive = profile?.cognitive_indicators
  const behavioral = profile?.behavioral_patterns

  if (!cognitive || sessionStats.totalSessions < 3) {
    return {
      id: 'cognitive_load',
      name: 'Cognitive Load Theory',
      shortName: 'Mental Capacity',
      description: 'Manages how much information you can process at once to prevent overwhelm and optimize learning.',
      researcher: 'Sweller',
      year: 1988,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'Need more sessions to assess',
      interpretation: 'We need to observe your learning patterns across multiple sessions.',
      recommendation: 'Complete a few more learning sessions to understand your cognitive patterns.',
      icon: '🧠',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: sessionStats.totalSessions,
      minDataPoints: 3,
    }
  }

  const workingMemory = cognitive.workingMemoryIndicator ?? 'medium'
  const threshold = cognitive.cognitiveLoadThreshold

  const workingMemoryScores: Record<string, number> = { high: 90, medium: 70, low: 50 }
  const score = workingMemoryScores[workingMemory] ?? 70

  let status: StatusLevel
  if (workingMemory === 'high') status = 'excellent'
  else if (workingMemory === 'medium') status = 'good'
  else status = 'developing'

  const optimalDuration = workingMemory === 'high' ? 60 : workingMemory === 'medium' ? 45 : 30

  return {
    id: 'cognitive_load',
    name: 'Cognitive Load Theory',
    shortName: 'Mental Capacity',
    description: 'Manages how much information you can process at once to prevent overwhelm and optimize learning.',
    researcher: 'Sweller',
    year: 1988,
    status,
    statusLabel: getStatusLabel(status),
    score,
    headline: `Working memory capacity: ${workingMemory.charAt(0).toUpperCase() + workingMemory.slice(1)}`,
    interpretation: workingMemory === 'high'
      ? 'You can handle complex information well. Multi-step problems are within reach.'
      : workingMemory === 'medium'
      ? 'You process information at a typical rate. Chunking complex topics helps.'
      : 'Complex topics may feel overwhelming. Breaking them into smaller pieces helps.',
    recommendation: `Optimal session length for you: ~${optimalDuration} minutes. Take breaks to consolidate learning.`,
    icon: '🧠',
    color: getStatusColor(status),
    metrics: [
      { key: 'workingMemory', label: 'Working Memory', value: workingMemory, description: 'Your capacity to hold and manipulate information' },
      { key: 'threshold', label: 'Complexity Threshold', value: threshold ?? 'unknown', description: 'Difficulty level where performance drops' },
      { key: 'avgSession', label: 'Avg Session', value: `${Math.round(sessionStats.avgDurationMin)} min`, description: 'Your typical session length' },
      { key: 'optimalDuration', label: 'Recommended Session', value: `${optimalDuration} min`, description: 'Optimal session length for you' },
    ],
    dataQuality: sessionStats.totalSessions >= 10 ? 'good' : sessionStats.totalSessions >= 5 ? 'adequate' : 'limited',
    dataPoints: sessionStats.totalSessions,
    minDataPoints: 3,
  }
}

// ============================================
// ZPD Interpreter
// ============================================

export function interpretZPD(
  zpdSkillCount: number,
  masteredCount: number,
  totalSkills: number
): FrameworkStatus {
  if (totalSkills === 0) {
    return {
      id: 'zpd',
      name: 'Zone of Proximal Development',
      shortName: 'Growth Zone',
      description: 'Identifies skills you\'re ready to learn next - challenging but achievable with support.',
      researcher: 'Vygotsky',
      year: 1978,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'No skills available yet',
      interpretation: 'Add content to your notebook to identify your growth zone.',
      recommendation: 'Add sources to begin building your learning path.',
      icon: '🌱',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: 0,
      minDataPoints: 5,
    }
  }

  const zpdPercent = Math.round((zpdSkillCount / totalSkills) * 100)
  const remainingSkills = totalSkills - masteredCount

  let status: StatusLevel
  if (zpdSkillCount >= 10 || zpdPercent >= 30) status = 'excellent'
  else if (zpdSkillCount >= 5 || zpdPercent >= 15) status = 'good'
  else if (zpdSkillCount >= 1) status = 'developing'
  else status = 'needs_attention'

  const recommendation = zpdSkillCount > 0
    ? `You have ${zpdSkillCount} skills ready to tackle. Start with the top recommendation!`
    : 'Focus on prerequisite skills to unlock more of your growth zone.'

  return {
    id: 'zpd',
    name: 'Zone of Proximal Development',
    shortName: 'Growth Zone',
    description: 'Identifies skills you\'re ready to learn next - challenging but achievable with support.',
    researcher: 'Vygotsky',
    year: 1978,
    status,
    statusLabel: getStatusLabel(status),
    score: Math.min(100, zpdSkillCount * 10),
    headline: `${zpdSkillCount} skills in your growth zone`,
    interpretation: zpdSkillCount > 0
      ? 'These are skills where you\'ve mastered the prerequisites and are ready to stretch.'
      : 'You need to master some foundational skills before new ones become available.',
    recommendation,
    icon: '🌱',
    color: getStatusColor(status),
    metrics: [
      { key: 'zpdCount', label: 'Ready to Learn', value: zpdSkillCount, description: 'Skills with all prerequisites met' },
      { key: 'mastered', label: 'Mastered', value: masteredCount, description: 'Skills you\'ve completed' },
      { key: 'remaining', label: 'Remaining', value: remainingSkills, description: 'Skills still to learn' },
      { key: 'total', label: 'Total Skills', value: totalSkills, description: 'Total skills in this notebook' },
    ],
    dataQuality: totalSkills >= 20 ? 'good' : totalSkills >= 10 ? 'adequate' : 'limited',
    dataPoints: totalSkills,
    minDataPoints: 5,
  }
}

// ============================================
// Threshold Concepts Interpreter
// ============================================

export function interpretThreshold(
  thresholdConcepts: { total: number; mastered: number; inProgress: number },
  profile: InverseProfile | null
): FrameworkStatus {
  if (thresholdConcepts.total === 0) {
    return {
      id: 'threshold',
      name: 'Threshold Concepts',
      shortName: 'Breakthroughs',
      description: 'Key concepts that transform your understanding - once you "get it," you can\'t go back.',
      researcher: 'Meyer & Land',
      year: 2003,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'No threshold concepts identified',
      interpretation: 'Threshold concepts are transformative ideas that unlock deeper understanding.',
      recommendation: 'Content analysis will identify key breakthrough concepts in your material.',
      icon: '💡',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: 0,
      minDataPoints: 1,
    }
  }

  const masteryPercent = Math.round((thresholdConcepts.mastered / thresholdConcepts.total) * 100)

  let status: StatusLevel
  if (masteryPercent >= 80) status = 'excellent'
  else if (masteryPercent >= 50) status = 'good'
  else if (masteryPercent >= 20 || thresholdConcepts.inProgress > 0) status = 'developing'
  else status = 'needs_attention'

  const remaining = thresholdConcepts.total - thresholdConcepts.mastered
  const recommendation = remaining > 0
    ? `Focus on the ${remaining} remaining threshold concept${remaining > 1 ? 's' : ''} - they unlock significant understanding.`
    : 'Amazing! You\'ve crossed all threshold concepts. You have deep understanding of this material.'

  return {
    id: 'threshold',
    name: 'Threshold Concepts',
    shortName: 'Breakthroughs',
    description: 'Key concepts that transform your understanding - once you "get it," you can\'t go back.',
    researcher: 'Meyer & Land',
    year: 2003,
    status,
    statusLabel: getStatusLabel(status),
    score: masteryPercent,
    headline: `${thresholdConcepts.mastered} of ${thresholdConcepts.total} breakthroughs achieved`,
    interpretation: thresholdConcepts.mastered > 0
      ? 'You\'ve had transformative insights. These fundamentally change how you see this subject.'
      : 'Threshold concepts are challenging but worth the effort - they unlock everything else.',
    recommendation,
    icon: '💡',
    color: getStatusColor(status),
    metrics: [
      { key: 'mastered', label: 'Crossed', value: thresholdConcepts.mastered, description: 'Threshold concepts you\'ve mastered', isGood: true },
      { key: 'inProgress', label: 'In Progress', value: thresholdConcepts.inProgress, description: 'Working toward understanding' },
      { key: 'remaining', label: 'Remaining', value: remaining, description: 'Still to cross' },
      { key: 'total', label: 'Total', value: thresholdConcepts.total, description: 'Total threshold concepts identified' },
    ],
    dataQuality: thresholdConcepts.total >= 5 ? 'good' : thresholdConcepts.total >= 2 ? 'adequate' : 'limited',
    dataPoints: thresholdConcepts.total,
    minDataPoints: 1,
  }
}

// ============================================
// Metacognitive Interpreter
// ============================================

export function interpretMetacognitive(
  profile: InverseProfile | null
): FrameworkStatus {
  const metacognitive = profile?.metacognitive_indicators

  if (!metacognitive || metacognitive.calibrationAccuracy === null) {
    return {
      id: 'metacognitive',
      name: 'Self-Regulated Learning',
      shortName: 'Self-Awareness',
      description: 'Measures how well you know what you know - crucial for effective self-directed learning.',
      researcher: 'Zimmerman',
      year: 2002,
      status: 'insufficient_data',
      statusLabel: 'Not Enough Data',
      score: null,
      headline: 'Need confidence ratings to assess',
      interpretation: 'Rate your confidence before answering to help us measure your self-awareness.',
      recommendation: 'Use confidence ratings during practice to build your metacognitive profile.',
      icon: '🪞',
      color: 'gray',
      metrics: [],
      dataQuality: 'insufficient',
      dataPoints: 0,
      minDataPoints: 10,
    }
  }

  const calibration = Math.round((metacognitive.calibrationAccuracy ?? 0) * 100)
  const overconfidence = Math.round((metacognitive.overconfidenceRate ?? 0) * 100)
  const underconfidence = Math.round((metacognitive.underconfidenceRate ?? 0) * 100)
  const helpSeeking = metacognitive.helpSeekingPattern ?? 'appropriate'

  let status: StatusLevel
  if (calibration >= 70 && helpSeeking === 'appropriate') status = 'excellent'
  else if (calibration >= 50 || helpSeeking === 'appropriate') status = 'good'
  else if (calibration >= 30) status = 'developing'
  else status = 'needs_attention'

  let recommendation: string
  if (overconfidence > 30) {
    recommendation = 'You tend toward overconfidence. Double-check answers you feel certain about.'
  } else if (underconfidence > 30) {
    recommendation = 'You\'re often more capable than you think. Trust your knowledge more!'
  } else if (helpSeeking === 'avoidant') {
    recommendation = 'Don\'t hesitate to use hints when stuck. It\'s a learning tool, not a weakness.'
  } else if (helpSeeking === 'excessive') {
    recommendation = 'Try solving problems independently first before requesting hints.'
  } else {
    recommendation = 'Your self-awareness is well-calibrated. Keep reflecting on your learning!'
  }

  return {
    id: 'metacognitive',
    name: 'Self-Regulated Learning',
    shortName: 'Self-Awareness',
    description: 'Measures how well you know what you know - crucial for effective self-directed learning.',
    researcher: 'Zimmerman',
    year: 2002,
    status,
    statusLabel: getStatusLabel(status),
    score: calibration,
    headline: `Calibration accuracy: ${calibration}%`,
    interpretation: calibration >= 70
      ? 'You have excellent self-awareness. Your confidence accurately predicts your performance.'
      : calibration >= 50
      ? 'Your self-awareness is developing. Practice reflecting on your certainty.'
      : 'There\'s a gap between your confidence and actual performance. Reflection helps close it.',
    recommendation,
    icon: '🪞',
    color: getStatusColor(status),
    metrics: [
      { key: 'calibration', label: 'Calibration', value: `${calibration}%`, description: 'How well confidence predicts performance', isGood: calibration >= 70 },
      { key: 'overconfidence', label: 'Overconfidence', value: `${overconfidence}%`, description: 'High confidence but incorrect', isGood: overconfidence <= 20 },
      { key: 'underconfidence', label: 'Underconfidence', value: `${underconfidence}%`, description: 'Low confidence but correct', isGood: underconfidence <= 20 },
      { key: 'helpSeeking', label: 'Help-Seeking', value: helpSeeking, description: 'Your pattern of requesting hints', isGood: helpSeeking === 'appropriate' },
    ],
    dataQuality: (profile?.interactions_analyzed ?? 0) >= 20 ? 'good' : (profile?.interactions_analyzed ?? 0) >= 10 ? 'adequate' : 'limited',
    dataPoints: profile?.interactions_analyzed ?? 0,
    minDataPoints: 10,
  }
}

// ============================================
// Dashboard Builder
// ============================================

export function buildFrameworkDashboard(
  learnerId: string,
  notebookId: string,
  profile: InverseProfile | null,
  stats: {
    skills: { total: number; mastered: number; inProgress: number; notStarted: number }
    practice: { totalAttempts: number; avgDifficulty: number; avgAccuracy: number }
    sm2: { dueSkills: number; totalScheduled: number; overdueCount: number; avgInterval: number }
    bloom: Record<number, { total: number; mastered: number }>
    sessions: { avgDurationMin: number; totalSessions: number }
    zpd: { zpdSkillCount: number }
    threshold: { total: number; mastered: number; inProgress: number }
  }
): FrameworkDashboard {
  const frameworks: FrameworkStatus[] = [
    interpretBKT(profile, stats.skills),
    interpretIRT(profile, stats.practice),
    interpretSM2(stats.sm2.dueSkills, stats.sm2.totalScheduled, stats.sm2.overdueCount, stats.sm2.avgInterval),
    interpretBloom(stats.bloom),
    interpretCognitiveLoad(profile, stats.sessions),
    interpretZPD(stats.zpd.zpdSkillCount, stats.skills.mastered, stats.skills.total),
    interpretThreshold(stats.threshold, profile),
    interpretMetacognitive(profile),
  ]

  // Calculate overall readiness
  const validScores = frameworks.filter(f => f.score !== null).map(f => f.score!)
  const overallReadiness = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0

  // Generate top insights
  const topInsights: string[] = []
  const priorityActions: string[] = []

  for (const framework of frameworks) {
    if (framework.status === 'needs_attention') {
      topInsights.push(`${framework.icon} ${framework.shortName}: ${framework.headline}`)
      priorityActions.push(framework.recommendation)
    }
  }

  // Add positive highlights if no major issues
  if (topInsights.length === 0) {
    const excellent = frameworks.filter(f => f.status === 'excellent')
    for (const f of excellent.slice(0, 2)) {
      topInsights.push(`${f.icon} ${f.shortName}: ${f.headline}`)
    }
  }

  // Always add top recommendation
  const dueReviews = stats.sm2.dueSkills
  if (dueReviews > 0) {
    priorityActions.unshift(`Review ${dueReviews} skill${dueReviews > 1 ? 's' : ''} to maintain retention`)
  }

  if (stats.zpd.zpdSkillCount > 0 && priorityActions.length < 3) {
    priorityActions.push(`${stats.zpd.zpdSkillCount} new skills are ready to learn`)
  }

  let overallMessage: string
  if (overallReadiness >= 80) {
    overallMessage = 'Excellent progress! You\'re learning effectively across all dimensions.'
  } else if (overallReadiness >= 60) {
    overallMessage = 'Good progress! Focus on the highlighted areas to continue improving.'
  } else if (overallReadiness >= 40) {
    overallMessage = 'You\'re building momentum. Consistent practice will accelerate your growth.'
  } else if (validScores.length > 0) {
    overallMessage = 'Keep going! Early stages of learning can feel slow, but you\'re building a foundation.'
  } else {
    overallMessage = 'Start practicing to begin tracking your progress across all learning dimensions.'
  }

  return {
    learnerId,
    notebookId,
    computedAt: new Date().toISOString(),
    overallReadiness,
    overallMessage,
    frameworks,
    topInsights,
    priorityActions,
  }
}
