'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { MicroAssessmentQuestion, MicroAssessmentResult, AssessmentType } from '@/lib/adaptive/micro-assessment-service'

interface MicroAssessmentState {
  shouldShow: boolean
  assessmentType: AssessmentType | null
  assessmentTypeName: string
  assessmentTypeDescription: string
  priority: 'low' | 'medium' | 'high'
  questions: MicroAssessmentQuestion[]
  reason: string
}

interface UseMicroAssessmentOptions {
  notebookId: string
  enabled?: boolean
  minTimeBetweenAssessments?: number // ms
  minInteractionsBetweenAssessments?: number
}

interface UseMicroAssessmentReturn {
  // State
  assessment: MicroAssessmentState | null
  isLoading: boolean
  error: string | null

  // Actions
  checkForAssessment: () => Promise<void>
  submitResults: (results: MicroAssessmentResult[]) => Promise<void>
  skipAssessment: () => void
  dismiss: () => void

  // Tracking
  recordInteraction: () => void
  interactionCount: number
  timeSinceLastAssessment: number
}

const DEFAULT_MIN_TIME = 10 * 60 * 1000 // 10 minutes
const DEFAULT_MIN_INTERACTIONS = 5

export function useMicroAssessment({
  notebookId,
  enabled = true,
  minTimeBetweenAssessments = DEFAULT_MIN_TIME,
  minInteractionsBetweenAssessments = DEFAULT_MIN_INTERACTIONS,
}: UseMicroAssessmentOptions): UseMicroAssessmentReturn {
  const [assessment, setAssessment] = useState<MicroAssessmentState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track interactions and time
  const [interactionCount, setInteractionCount] = useState(0)
  const lastAssessmentTimeRef = useRef<number>(Date.now())
  const sessionStartTimeRef = useRef<number>(Date.now())

  const timeSinceLastAssessment = Date.now() - lastAssessmentTimeRef.current

  // Record an interaction (e.g., chat message, practice attempt)
  const recordInteraction = useCallback(() => {
    setInteractionCount(prev => prev + 1)
  }, [])

  // Check if an assessment should be triggered
  const checkForAssessment = useCallback(async () => {
    if (!enabled) return

    // Check minimum thresholds
    const timeSince = Date.now() - lastAssessmentTimeRef.current
    if (timeSince < minTimeBetweenAssessments) return
    if (interactionCount < minInteractionsBetweenAssessments) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        timeSinceLastAssessment: timeSince.toString(),
        interactionsSinceLastAssessment: interactionCount.toString(),
        currentSessionDurationMs: (Date.now() - sessionStartTimeRef.current).toString(),
      })

      const response = await fetch(
        `/api/notebooks/${notebookId}/micro-assessment?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to check for assessment')
      }

      const data = await response.json()

      if (data.shouldTrigger) {
        setAssessment({
          shouldShow: true,
          assessmentType: data.assessmentType,
          assessmentTypeName: data.assessmentTypeName,
          assessmentTypeDescription: data.assessmentTypeDescription,
          priority: data.priority,
          questions: data.questions,
          reason: data.reason,
        })
      }
    } catch (err) {
      console.error('[MicroAssessment] Check error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [enabled, notebookId, interactionCount, minTimeBetweenAssessments, minInteractionsBetweenAssessments])

  // Submit assessment results
  const submitResults = useCallback(async (results: MicroAssessmentResult[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/micro-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit assessment results')
      }

      // Reset tracking after successful submission
      setInteractionCount(0)
      lastAssessmentTimeRef.current = Date.now()
      setAssessment(null)
    } catch (err) {
      console.error('[MicroAssessment] Submit error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [notebookId])

  // Skip the assessment (will be shown again later)
  const skipAssessment = useCallback(() => {
    // Only reset interaction count, keep the time so it triggers again soon
    setInteractionCount(0)
    setAssessment(null)
  }, [])

  // Dismiss the assessment completely (reset everything)
  const dismiss = useCallback(() => {
    setInteractionCount(0)
    lastAssessmentTimeRef.current = Date.now()
    setAssessment(null)
  }, [])

  // Auto-check when thresholds are met
  useEffect(() => {
    if (!enabled) return
    if (assessment) return // Don't check if already showing

    const timeSince = Date.now() - lastAssessmentTimeRef.current
    if (timeSince >= minTimeBetweenAssessments && interactionCount >= minInteractionsBetweenAssessments) {
      checkForAssessment()
    }
  }, [enabled, assessment, interactionCount, minTimeBetweenAssessments, minInteractionsBetweenAssessments, checkForAssessment])

  return {
    assessment,
    isLoading,
    error,
    checkForAssessment,
    submitResults,
    skipAssessment,
    dismiss,
    recordInteraction,
    interactionCount,
    timeSinceLastAssessment,
  }
}
