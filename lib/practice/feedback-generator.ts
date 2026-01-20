/**
 * Feedback Generator for Practice Sessions
 *
 * Generates personalized, encouraging feedback based on:
 * - Answer correctness
 * - Scaffold level
 * - Learner profile (help-seeking pattern, goal orientation)
 * - Performance patterns (consecutive successes/failures)
 */

import type { EvaluationResult } from './answer-evaluator'
import type { GeneratedQuestion } from './question-generator'
import type { LearnerSkillState } from '@/lib/types/graph'
import type { InverseProfile } from '@/lib/types/interactions'

// Feedback types
export type FeedbackType = 'correct' | 'incorrect' | 'partial' | 'encouraging' | 'celebratory'

// Feedback structure
export interface PracticeFeedback {
  type: FeedbackType
  message: string
  emoji?: string
  encouragement?: string
  nextSteps?: string
  motivationalMessage?: string
  showWorkedExample?: boolean
}

// Session feedback summary
export interface SessionFeedback {
  overallMessage: string
  score: number
  totalQuestions: number
  accuracy: number
  strengths: string[]
  areasForImprovement: string[]
  recommendations: string[]
  masteryProgress: string
  nextSessionSuggestion?: string
}

// Encouragement messages by scenario
const ENCOURAGEMENT_MESSAGES = {
  firstAttempt: [
    "Great job getting started! Every expert was once a beginner.",
    "You're taking the first step - that's what matters most!",
    "Starting is often the hardest part. You're doing great!",
  ],
  correctAfterStruggle: [
    "You persevered and got it! That's how real learning happens.",
    "See? Your persistence paid off! Keep going!",
    "Excellent! You worked through the challenge.",
  ],
  consecutiveCorrect: [
    "You're on a roll! Keep this momentum going.",
    "Fantastic streak! You're really getting the hang of this.",
    "Outstanding consistency! Your hard work is showing.",
  ],
  incorrectButTrying: [
    "Mistakes help us learn. Let's look at this together.",
    "Not quite, but asking questions is how we grow.",
    "This is a tricky one! Let's break it down.",
  ],
  masteryAchieved: [
    "Congratulations! You've mastered this skill!",
    "You did it! This skill is now in your toolkit.",
    "Excellent mastery! You've proven deep understanding.",
  ],
}

/**
 * Get random message from array
 */
function randomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

/**
 * Generate immediate feedback after an answer
 */
export function generateImmediateFeedback(
  evaluation: EvaluationResult,
  question: GeneratedQuestion,
  learnerState?: LearnerSkillState | null,
  profile?: InverseProfile | null
): PracticeFeedback {
  const { isCorrect, score } = evaluation
  const scaffoldLevel = question.scaffoldLevel

  // Determine feedback type
  let type: FeedbackType
  if (isCorrect) {
    type = score === 1 ? 'correct' : 'partial'
  } else {
    type = score >= 0.3 ? 'partial' : 'incorrect'
  }

  // Check for consecutive successes/failures
  const consecutiveSuccesses = learnerState?.consecutiveSuccesses || 0
  const wasPreviouslyStruggling = consecutiveSuccesses === 0 && learnerState && learnerState.totalAttempts > 0

  // Base message from evaluation
  let message = evaluation.explanation
  let emoji = isCorrect ? '✓' : '✗'
  let encouragement: string | undefined
  let nextSteps: string | undefined
  let motivationalMessage: string | undefined
  let showWorkedExample = false

  // Personalize based on correctness and context
  if (isCorrect) {
    emoji = score === 1 ? '🎉' : '👍'

    // Celebrate streaks
    if (consecutiveSuccesses >= 2) {
      encouragement = randomMessage(ENCOURAGEMENT_MESSAGES.consecutiveCorrect)
    } else if (wasPreviouslyStruggling) {
      encouragement = randomMessage(ENCOURAGEMENT_MESSAGES.correctAfterStruggle)
    }

    // Check for mastery
    if (learnerState && learnerState.pMastery >= learnerState.masteryThreshold) {
      motivationalMessage = randomMessage(ENCOURAGEMENT_MESSAGES.masteryAchieved)
      emoji = '🏆'
    }
  } else {
    emoji = score >= 0.3 ? '🤔' : '💭'
    encouragement = randomMessage(ENCOURAGEMENT_MESSAGES.incorrectButTrying)

    // Suggest next steps based on scaffold level
    if (scaffoldLevel <= 2) {
      showWorkedExample = true
      nextSteps = "Review the worked example to see how to approach this type of problem."
    } else if (scaffoldLevel === 3) {
      nextSteps = "Try using the hints if you get stuck on the next similar question."
    } else {
      nextSteps = "Consider reviewing the source material for this topic."
    }

    // Personalize based on profile
    if (profile) {
      const { helpSeekingPattern } = profile.metacognitive_indicators
      const { goalOrientation } = profile.motivational_indicators

      if (helpSeekingPattern === 'avoidant') {
        motivationalMessage = "Remember, using hints and examples is part of effective learning, not a sign of weakness."
      } else if (goalOrientation === 'avoidance') {
        motivationalMessage = "Focus on what you're learning, not on avoiding mistakes. Mistakes are valuable!"
      }
    }
  }

  // First attempt special encouragement
  if (learnerState && learnerState.totalAttempts === 0) {
    encouragement = randomMessage(ENCOURAGEMENT_MESSAGES.firstAttempt)
  }

  return {
    type,
    message,
    emoji,
    encouragement,
    nextSteps,
    motivationalMessage,
    showWorkedExample,
  }
}

/**
 * Generate session summary feedback
 */
export function generateSessionFeedback(
  results: EvaluationResult[],
  questions: GeneratedQuestion[],
  learnerState?: LearnerSkillState | null,
  skillName?: string
): SessionFeedback {
  if (results.length === 0) {
    return {
      overallMessage: "No questions were answered in this session.",
      score: 0,
      totalQuestions: 0,
      accuracy: 0,
      strengths: [],
      areasForImprovement: [],
      recommendations: [],
      masteryProgress: "No progress data available.",
    }
  }

  // Calculate statistics
  const correctCount = results.filter(r => r.isCorrect).length
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const accuracy = (correctCount / results.length) * 100
  const averageScore = (totalScore / results.length) * 100

  // Generate overall message
  let overallMessage: string
  if (accuracy >= 90) {
    overallMessage = "Excellent session! You demonstrated strong understanding."
  } else if (accuracy >= 70) {
    overallMessage = "Good work! You're making solid progress."
  } else if (accuracy >= 50) {
    overallMessage = "Keep practicing! You're building your skills."
  } else {
    overallMessage = "This topic is challenging, but every attempt helps you learn."
  }

  // Identify strengths and areas for improvement
  const strengths: string[] = []
  const areasForImprovement: string[] = []

  // Analyze by question type
  const typeResults: Record<string, { correct: number; total: number }> = {}
  questions.forEach((q, i) => {
    if (!typeResults[q.type]) {
      typeResults[q.type] = { correct: 0, total: 0 }
    }
    typeResults[q.type].total++
    if (results[i]?.isCorrect) {
      typeResults[q.type].correct++
    }
  })

  for (const [type, stats] of Object.entries(typeResults)) {
    const typeAccuracy = (stats.correct / stats.total) * 100
    const typeName = type.replace('_', ' ')
    if (typeAccuracy >= 80) {
      strengths.push(`Strong at ${typeName} questions`)
    } else if (typeAccuracy < 50) {
      areasForImprovement.push(`Practice more ${typeName} questions`)
    }
  }

  // Check for misconceptions
  const misconceptions = results
    .filter(r => r.misconceptionIdentified)
    .map(r => r.misconceptionIdentified!)
    .filter((v, i, a) => a.indexOf(v) === i)

  areasForImprovement.push(...misconceptions.map(m => `Address misconception: ${m}`))

  // Generate recommendations
  const recommendations: string[] = []

  if (accuracy < 70) {
    recommendations.push("Consider reviewing the source material before your next practice session.")
  }
  if (learnerState && learnerState.currentScaffoldLevel <= 2) {
    recommendations.push("Use worked examples and hints to build understanding.")
  }
  if (accuracy >= 80 && learnerState && learnerState.pMastery < 0.8) {
    recommendations.push("You're doing great! A few more practice sessions should achieve mastery.")
  }
  if (results.some(r => !r.isCorrect && r.score >= 0.3)) {
    recommendations.push("Your partial understanding is showing - focus on filling in the gaps.")
  }

  // Mastery progress message
  let masteryProgress: string
  if (learnerState) {
    const pMastery = Math.round(learnerState.pMastery * 100)
    const threshold = Math.round(learnerState.masteryThreshold * 100)

    if (learnerState.masteryStatus === 'mastered') {
      masteryProgress = `You've mastered ${skillName || 'this skill'}! (${pMastery}%)`
    } else if (learnerState.pMastery >= learnerState.masteryThreshold * 0.9) {
      masteryProgress = `Almost there! You're at ${pMastery}% mastery (${threshold}% needed).`
    } else {
      masteryProgress = `Current mastery: ${pMastery}% (${threshold}% needed for mastery).`
    }
  } else {
    masteryProgress = `This session: ${Math.round(accuracy)}% accuracy.`
  }

  // Next session suggestion
  let nextSessionSuggestion: string | undefined
  if (accuracy < 50) {
    nextSessionSuggestion = "Focus on understanding the fundamentals before moving on."
  } else if (accuracy >= 90 && learnerState?.pMastery && learnerState.pMastery >= 0.8) {
    nextSessionSuggestion = "Consider trying a more challenging skill or reviewing after a few days."
  } else {
    nextSessionSuggestion = "Continue practicing to strengthen your understanding."
  }

  return {
    overallMessage,
    score: correctCount,
    totalQuestions: results.length,
    accuracy,
    strengths,
    areasForImprovement,
    recommendations,
    masteryProgress,
    nextSessionSuggestion,
  }
}

/**
 * Generate motivational message based on streak
 */
export function generateStreakMessage(streak: number, isCorrect: boolean): string | undefined {
  if (!isCorrect) return undefined

  switch (streak) {
    case 3:
      return "🔥 Three in a row! You're heating up!"
    case 5:
      return "🔥🔥 Five streak! You're on fire!"
    case 7:
      return "🌟 Seven streak! Incredible focus!"
    case 10:
      return "🏆 Ten streak! You're a champion!"
    default:
      if (streak > 10 && streak % 5 === 0) {
        return `🎯 ${streak} streak! Unstoppable!`
      }
      return undefined
  }
}

/**
 * Generate hint usage feedback
 */
export function generateHintFeedback(
  hintsUsed: number,
  isCorrect: boolean,
  profile?: InverseProfile | null
): string | undefined {
  if (hintsUsed === 0) {
    if (isCorrect) {
      return "Great job solving it without hints!"
    }
    // Check if user might be avoiding hints
    if (profile?.metacognitive_indicators.helpSeekingPattern === 'avoidant') {
      return "Tip: Using hints is a smart learning strategy, not a weakness."
    }
    return undefined
  }

  if (isCorrect) {
    if (hintsUsed === 1) {
      return "Good use of a hint! Sometimes one nudge is all we need."
    } else if (hintsUsed === 2) {
      return "Hints helped you get there! That's effective learning."
    } else {
      return "You used all the hints and got it right - that's progress!"
    }
  } else {
    return "Even with hints, this one was tough. Review the explanation carefully."
  }
}

/**
 * Generate scaffold level transition message
 */
export function generateScaffoldTransitionMessage(
  oldLevel: 1 | 2 | 3 | 4,
  newLevel: 1 | 2 | 3 | 4
): string | undefined {
  if (newLevel > oldLevel) {
    // Moving to less support
    switch (newLevel) {
      case 2:
        return "🌱 Level up! You'll now see partial solutions instead of full examples."
      case 3:
        return "🌿 Growing! Hints are now available on request."
      case 4:
        return "🌳 Independent mode! You've earned minimal scaffolding."
      default:
        return undefined
    }
  } else if (newLevel < oldLevel) {
    // Moving to more support
    return "We've added more support to help you build confidence. Take your time!"
  }
  return undefined
}
