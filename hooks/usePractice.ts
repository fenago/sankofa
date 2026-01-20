'use client'

import useSWR from 'swr'
import { useCallback, useState, useMemo } from 'react'
import { fetcher } from '@/lib/swr-config'
import type { BloomLevel } from '@/lib/types/graph'

// SWR key factories
export const practiceKeys = {
  questions: (
    notebookId: string,
    mode: 'zpd' | 'review' | 'skill',
    skillId?: string,
    count?: number
  ) => {
    let url = `/api/notebooks/${notebookId}/practice?mode=${mode}`
    if (skillId) url += `&skillId=${skillId}`
    if (count) url += `&count=${count}`
    return url
  },
  adaptive: (
    notebookId: string,
    targetMastery?: number,
    sessionLength?: number
  ) => {
    let url = `/api/notebooks/${notebookId}/practice/adaptive`
    const params: string[] = []
    if (targetMastery) params.push(`targetMastery=${targetMastery}`)
    if (sessionLength) params.push(`sessionLength=${sessionLength}`)
    if (params.length) url += `?${params.join('&')}`
    return url
  },
}

// Question types
export type QuestionType = 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank'

// Generated question structure
export interface PracticeQuestion {
  id: string
  skillId: string
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: string
  explanation: string
  hints: string[]
  difficulty: number
  bloomLevel: BloomLevel
  scaffoldLevel: 1 | 2 | 3 | 4
  workedExample?: string
  partialSolution?: string
}

// Practice session info
export interface PracticeSession {
  id: string
  skillId: string
  skillName: string
  scaffoldLevel: 1 | 2 | 3 | 4
  mode: 'zpd' | 'review' | 'skill' | 'adaptive'
}

// Skill info returned with questions
export interface SkillInfo {
  id: string
  name: string
  description: string
  bloomLevel: BloomLevel
  difficulty?: number
  isThresholdConcept?: boolean
  pMastery: number
  masteryStatus: 'not_started' | 'learning' | 'mastered'
}

// Feedback structure
export interface PracticeFeedback {
  type: 'correct' | 'incorrect' | 'partial' | 'encouraging' | 'celebratory'
  message: string
  emoji?: string
  encouragement?: string
  nextSteps?: string
  motivationalMessage?: string
  showWorkedExample?: boolean
  hintFeedback?: string
}

// Submit answer response
export interface AnswerResult {
  isCorrect: boolean
  score: number
  correctAnswer: string
  explanation: string
  feedback: PracticeFeedback
  updatedState?: {
    pMastery: number
    masteryStatus: string
    scaffoldLevel: number
    consecutiveSuccesses: number
  }
  progress: {
    totalSkills: number
    masteredSkills: number
    averageMastery: number
  }
  workedExample?: string
}

// Questions response
interface QuestionsResponse {
  available: boolean
  questions: PracticeQuestion[]
  session: PracticeSession | null
  skillInfo?: SkillInfo
  message?: string
}

// Practice options
export interface PracticeOptions {
  mode?: 'zpd' | 'review' | 'skill' | 'adaptive'
  skillId?: string
  count?: number
  targetMastery?: number
  sessionLength?: number
}

/**
 * Hook for managing practice sessions
 */
export function usePractice(notebookId: string, options: PracticeOptions = {}) {
  const {
    mode = 'zpd',
    skillId,
    count = 5,
    targetMastery = 0.8,
    sessionLength = 10,
  } = options

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [totalHintsUsed, setTotalHintsUsed] = useState(0)
  const [currentHintsUsed, setCurrentHintsUsed] = useState(0)
  const [lastFeedback, setLastFeedback] = useState<AnswerResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)

  // Determine API endpoint based on mode
  const apiUrl = useMemo(() => {
    if (mode === 'adaptive') {
      return practiceKeys.adaptive(notebookId, targetMastery, sessionLength)
    }
    return practiceKeys.questions(notebookId, mode, skillId, count)
  }, [notebookId, mode, skillId, count, targetMastery, sessionLength])

  // Fetch questions
  const { data, error, isLoading, mutate } = useSWR<QuestionsResponse>(
    notebookId && !sessionEnded ? apiUrl : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  // Set session ID when questions are loaded
  if (data?.session?.id && !sessionId) {
    setSessionId(data.session.id)
  }

  // Current question
  const questions = data?.questions || []
  const currentQuestion = questions[currentIndex] || null
  const scaffoldLevel = data?.session?.scaffoldLevel || 2
  const skillInfo = data?.skillInfo || null

  /**
   * Submit an answer
   */
  const submitAnswer = useCallback(
    async (
      userAnswer: string,
      responseTimeMs: number,
      confidenceRating?: number
    ): Promise<AnswerResult | null> => {
      if (!currentQuestion || !notebookId || isSubmitting) return null

      setIsSubmitting(true)

      try {
        const endpoint = mode === 'adaptive'
          ? `/api/notebooks/${notebookId}/practice/adaptive`
          : `/api/notebooks/${notebookId}/practice`

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            userAnswer,
            responseTimeMs,
            hintsUsed: currentHintsUsed,
            confidenceRating,
            sessionId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to submit answer')
        }

        const result: AnswerResult = await response.json()

        // Update session stats
        setAnswered((prev) => prev + 1)
        if (result.isCorrect) {
          setCorrect((prev) => prev + 1)
        }
        setTotalHintsUsed((prev) => prev + currentHintsUsed)
        setLastFeedback(result)
        setCurrentHintsUsed(0)

        return result
      } catch (err) {
        console.error('Error submitting answer:', err)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentQuestion, notebookId, mode, sessionId, currentHintsUsed, isSubmitting]
  )

  /**
   * Request a hint
   */
  const requestHint = useCallback((): string | null => {
    if (!currentQuestion) return null

    const hints = currentQuestion.hints || []
    if (currentHintsUsed >= hints.length) return null

    const hint = hints[currentHintsUsed]
    setCurrentHintsUsed((prev) => prev + 1)

    return hint
  }, [currentQuestion, currentHintsUsed])

  /**
   * Move to next question
   */
  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setLastFeedback(null)
      setCurrentHintsUsed(0)
    } else {
      // End of session
      setSessionEnded(true)
    }
  }, [currentIndex, questions.length])

  /**
   * Skip current question
   */
  const skipQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setCurrentHintsUsed(0)
    }
  }, [currentIndex, questions.length])

  /**
   * End the session early
   */
  const endSession = useCallback(() => {
    setSessionEnded(true)
  }, [])

  /**
   * Reset and start a new session
   */
  const resetSession = useCallback(() => {
    setSessionId(null)
    setCurrentIndex(0)
    setAnswered(0)
    setCorrect(0)
    setTotalHintsUsed(0)
    setCurrentHintsUsed(0)
    setLastFeedback(null)
    setSessionEnded(false)
    mutate()
  }, [mutate])

  // Available hints for current question
  const availableHints = currentQuestion
    ? Math.max(0, (currentQuestion.hints?.length || 0) - currentHintsUsed)
    : 0

  // Session stats
  const accuracy = answered > 0 ? (correct / answered) * 100 : 0
  const progress = answered > 0 ? (answered / questions.length) * 100 : 0

  return {
    // Questions
    questions,
    currentQuestion,
    currentIndex,
    totalQuestions: questions.length,

    // Session info
    sessionId,
    scaffoldLevel,
    skillInfo,
    mode,

    // Progress
    answered,
    correct,
    totalHintsUsed,
    currentHintsUsed,
    availableHints,
    accuracy,
    progress,

    // Feedback
    lastFeedback,

    // State flags
    isLoading,
    isSubmitting,
    sessionEnded,
    hasQuestions: questions.length > 0,
    isLastQuestion: currentIndex >= questions.length - 1,

    // Error
    error: error?.message || null,
    message: data?.message || null,

    // Actions
    submitAnswer,
    requestHint,
    nextQuestion,
    skipQuestion,
    endSession,
    resetSession,
    refetch: mutate,
  }
}

/**
 * Hook for quick practice of a specific skill
 */
export function useSkillPractice(notebookId: string, skillId: string | null) {
  return usePractice(notebookId, {
    mode: 'skill',
    skillId: skillId || undefined,
    count: 3,
  })
}

/**
 * Hook for spaced repetition review
 */
export function useReviewPractice(notebookId: string) {
  return usePractice(notebookId, {
    mode: 'review',
    count: 5,
  })
}

/**
 * Hook for fully adaptive practice
 */
export function useAdaptivePractice(
  notebookId: string,
  targetMastery = 0.8,
  sessionLength = 10
) {
  return usePractice(notebookId, {
    mode: 'adaptive',
    targetMastery,
    sessionLength,
  })
}

/**
 * Get question type label for display
 */
export function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    multiple_choice: 'Multiple Choice',
    free_response: 'Short Answer',
    true_false: 'True/False',
    fill_blank: 'Fill in the Blank',
  }
  return labels[type]
}

/**
 * Get scaffold level description
 */
export function getScaffoldLevelDescription(level: 1 | 2 | 3 | 4): {
  label: string
  description: string
  icon: string
} {
  const descriptions = {
    1: {
      label: 'Full Support',
      description: 'Complete worked examples provided',
      icon: '🎓',
    },
    2: {
      label: 'Guided',
      description: 'Partial solutions to complete',
      icon: '🤝',
    },
    3: {
      label: 'Hints Available',
      description: 'Hints on request',
      icon: '💡',
    },
    4: {
      label: 'Independent',
      description: 'Minimal scaffolding',
      icon: '🚀',
    },
  }
  return descriptions[level]
}

/**
 * Get difficulty label based on 0-1 scale
 */
export function getDifficultyLabel(difficulty: number): {
  label: string
  color: string
} {
  if (difficulty <= 0.3) {
    return { label: 'Easy', color: 'text-green-600' }
  } else if (difficulty <= 0.6) {
    return { label: 'Medium', color: 'text-yellow-600' }
  } else if (difficulty <= 0.8) {
    return { label: 'Hard', color: 'text-orange-600' }
  } else {
    return { label: 'Challenging', color: 'text-red-600' }
  }
}
