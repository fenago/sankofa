'use client'

import useSWR from 'swr'
import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { fetcher } from '@/lib/swr-config'

// SWR key factories
export const assessmentKeys = {
  list: (notebookId: string, status?: string, type?: string) => {
    let url = `/api/notebooks/${notebookId}/assessments`
    const params: string[] = []
    if (status) params.push(`status=${status}`)
    if (type) params.push(`type=${type}`)
    if (params.length) url += `?${params.join('&')}`
    return url
  },
  detail: (notebookId: string, assessmentId: string) =>
    `/api/notebooks/${notebookId}/assessments?assessmentId=${assessmentId}`,
}

// Assessment types
export type AssessmentType = 'diagnostic' | 'formative' | 'summative'
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned'

export interface Assessment {
  id: string
  notebook_id: string
  user_id: string
  type: AssessmentType
  title: string | null
  description: string | null
  status: AssessmentStatus
  skill_ids: string[]
  question_ids: string[]
  question_count: number | null
  time_limit_ms: number | null
  started_at: string | null
  completed_at: string | null
  answers: Record<string, string>
  score: number | null
  max_score: number | null
  skill_results: Record<string, { correct: number; total: number; score: number }>
  created_at: string
  updated_at: string
}

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  skill_id: string
  type: 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank'
  question: string
  options: string[] | null
  correct_answer: string
  explanation: string | null
  difficulty: number
  bloom_level: number
  position: number
}

export interface AssessmentStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  averageScore: number
}

export interface AssessmentResults {
  score: number
  maxScore: number
  percentage: number
  skillResults: Record<string, { correct: number; total: number; score: number }>
  completedAt: string
}

// List response
interface AssessmentListResponse {
  available: boolean
  assessments: Assessment[]
  stats: AssessmentStats
}

// Detail response
interface AssessmentDetailResponse {
  available: boolean
  assessment: Assessment
  questions: AssessmentQuestion[]
}

// Create response
interface CreateAssessmentResponse {
  available: boolean
  assessmentId: string
  questionCount: number
  timeLimit: number | null
  skillCount: number
}

/**
 * Hook for listing and managing assessments
 */
export function useAssessments(
  notebookId: string,
  options: { status?: AssessmentStatus; type?: AssessmentType } = {}
) {
  const { status, type } = options

  const { data, error, isLoading, mutate } = useSWR<AssessmentListResponse>(
    notebookId ? assessmentKeys.list(notebookId, status, type) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const createAssessment = useCallback(
    async (config: {
      type: AssessmentType
      title?: string
      description?: string
      skillIds?: string[]
      questionCount?: number
      timeLimit?: number
    }): Promise<string | null> => {
      try {
        const response = await fetch(`/api/notebooks/${notebookId}/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })

        if (!response.ok) {
          throw new Error('Failed to create assessment')
        }

        const result: CreateAssessmentResponse = await response.json()
        mutate()
        return result.assessmentId
      } catch (err) {
        console.error('Error creating assessment:', err)
        return null
      }
    },
    [notebookId, mutate]
  )

  return {
    assessments: data?.assessments || [],
    stats: data?.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, averageScore: 0 },
    isLoading,
    error: error?.message || null,
    createAssessment,
    refetch: mutate,
  }
}

/**
 * Hook for taking a specific assessment
 */
export function useAssessment(notebookId: string, assessmentId: string | null) {
  // Local state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<AssessmentResults | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch assessment details
  const { data, error, isLoading, mutate } = useSWR<AssessmentDetailResponse>(
    notebookId && assessmentId ? assessmentKeys.detail(notebookId, assessmentId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const assessment = data?.assessment
  const questions = data?.questions || []

  // Initialize answers from saved progress
  useEffect(() => {
    if (assessment?.answers && Object.keys(answers).length === 0) {
      setAnswers(assessment.answers)
    }
  }, [assessment?.answers])

  // Timer logic
  useEffect(() => {
    if (!assessment) return

    // Calculate remaining time
    if (assessment.status === 'in_progress' && assessment.time_limit_ms && assessment.started_at) {
      const startTime = new Date(assessment.started_at).getTime()
      const endTime = startTime + assessment.time_limit_ms
      const remaining = Math.max(0, endTime - Date.now())
      setTimeRemaining(remaining)

      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1000
        })
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [assessment?.status, assessment?.time_limit_ms, assessment?.started_at])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && assessment?.status === 'in_progress') {
      submitAssessment()
    }
  }, [timeRemaining])

  const currentQuestion = questions[currentIndex] || null

  /**
   * Start the assessment
   */
  const startAssessment = useCallback(async () => {
    if (!notebookId || !assessmentId) return false

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/assessments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, action: 'start' }),
      })

      if (!response.ok) throw new Error('Failed to start assessment')

      mutate()
      return true
    } catch (err) {
      console.error('Error starting assessment:', err)
      return false
    }
  }, [notebookId, assessmentId, mutate])

  /**
   * Set answer for a question
   */
  const setAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  /**
   * Navigate to a specific question
   */
  const navigateTo = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index)
    }
  }, [questions.length])

  /**
   * Go to next question
   */
  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, questions.length])

  /**
   * Go to previous question
   */
  const prevQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  /**
   * Save progress
   */
  const saveProgress = useCallback(async () => {
    if (!notebookId || !assessmentId) return false

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/assessments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, action: 'save_progress', answers }),
      })

      return response.ok
    } catch (err) {
      console.error('Error saving progress:', err)
      return false
    }
  }, [notebookId, assessmentId, answers])

  /**
   * Submit the assessment
   */
  const submitAssessment = useCallback(async () => {
    if (!notebookId || !assessmentId || isSubmitting) return null

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/assessments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, action: 'submit', answers }),
      })

      if (!response.ok) throw new Error('Failed to submit assessment')

      const result: AssessmentResults = await response.json()
      setResults(result)
      mutate()
      return result
    } catch (err) {
      console.error('Error submitting assessment:', err)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [notebookId, assessmentId, answers, isSubmitting, mutate])

  /**
   * Abandon the assessment
   */
  const abandonAssessment = useCallback(async () => {
    if (!notebookId || !assessmentId) return false

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/assessments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, action: 'abandon' }),
      })

      if (response.ok) {
        mutate()
        return true
      }
      return false
    } catch (err) {
      console.error('Error abandoning assessment:', err)
      return false
    }
  }, [notebookId, assessmentId, mutate])

  // Calculate progress
  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const isComplete = answeredCount === questions.length && questions.length > 0

  // Format time remaining
  const formattedTimeRemaining = useMemo(() => {
    if (timeRemaining === null) return null
    const minutes = Math.floor(timeRemaining / 60000)
    const seconds = Math.floor((timeRemaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [timeRemaining])

  return {
    // Assessment data
    assessment,
    questions,
    currentQuestion,
    currentIndex,

    // Answers
    answers,
    answeredCount,
    setAnswer,

    // Progress
    progress,
    isComplete,

    // Timer
    timeRemaining,
    formattedTimeRemaining,
    hasTimeLimit: assessment?.time_limit_ms != null,

    // Results (after completion)
    results,

    // State flags
    isLoading,
    isSubmitting,
    isStarted: assessment?.status === 'in_progress',
    isCompleted: assessment?.status === 'completed',

    // Error
    error: error?.message || null,

    // Actions
    startAssessment,
    navigateTo,
    nextQuestion,
    prevQuestion,
    saveProgress,
    submitAssessment,
    abandonAssessment,
    refetch: mutate,
  }
}

/**
 * Get assessment type label
 */
export function getAssessmentTypeLabel(type: AssessmentType): {
  label: string
  description: string
  color: string
} {
  const types = {
    diagnostic: {
      label: 'Diagnostic',
      description: 'Identify knowledge gaps and starting points',
      color: 'bg-blue-100 text-blue-800',
    },
    formative: {
      label: 'Formative',
      description: 'Check understanding during learning',
      color: 'bg-green-100 text-green-800',
    },
    summative: {
      label: 'Summative',
      description: 'Evaluate mastery at the end of learning',
      color: 'bg-purple-100 text-purple-800',
    },
  }
  return types[type]
}

/**
 * Get assessment status label
 */
export function getAssessmentStatusLabel(status: AssessmentStatus): {
  label: string
  color: string
} {
  const statuses = {
    pending: { label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
    in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
    abandoned: { label: 'Abandoned', color: 'bg-red-100 text-red-800' },
  }
  return statuses[status]
}
