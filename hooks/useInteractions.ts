'use client'

import useSWR, { mutate } from 'swr'
import { fetcher } from '@/lib/swr-config'
import type {
  InteractionEventType,
  InteractionPayload,
  LearnerInteraction,
  RecordInteractionRequest,
  RecordInteractionResponse,
  GetInteractionsResponse,
} from '@/lib/types/interactions'

// SWR key factories for interactions
export const interactionKeys = {
  all: (notebookId: string) => `/api/notebooks/${notebookId}/interactions` as const,
  byType: (notebookId: string, eventType: InteractionEventType) =>
    `/api/notebooks/${notebookId}/interactions?event_type=${eventType}` as const,
  bySkill: (notebookId: string, skillId: string) =>
    `/api/notebooks/${notebookId}/interactions?skill_id=${skillId}` as const,
  bySession: (notebookId: string, sessionId: string) =>
    `/api/notebooks/${notebookId}/interactions?session_id=${sessionId}` as const,
  recent: (notebookId: string, limit: number = 20) =>
    `/api/notebooks/${notebookId}/interactions?limit=${limit}` as const,
}

interface UseInteractionsOptions {
  eventType?: InteractionEventType
  skillId?: string
  sessionId?: string
  since?: string
  limit?: number
  enabled?: boolean
}

export function useInteractions(notebookId: string, options: UseInteractionsOptions = {}) {
  const { eventType, skillId, sessionId, since, limit = 50, enabled = true } = options

  // Build the URL with query params
  const buildUrl = () => {
    if (!notebookId || !enabled) return null

    const params = new URLSearchParams()
    if (eventType) params.set('event_type', eventType)
    if (skillId) params.set('skill_id', skillId)
    if (sessionId) params.set('session_id', sessionId)
    if (since) params.set('since', since)
    params.set('limit', String(limit))

    const queryString = params.toString()
    return `/api/notebooks/${notebookId}/interactions${queryString ? `?${queryString}` : ''}`
  }

  const { data, error, isLoading, mutate: revalidate } = useSWR<GetInteractionsResponse>(
    buildUrl(),
    fetcher,
    { revalidateOnFocus: false }
  )

  const recordInteraction = async (
    sessionId: string,
    eventType: InteractionEventType,
    payload?: InteractionPayload,
    skillId?: string
  ): Promise<RecordInteractionResponse | null> => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          session_id: sessionId,
          skill_id: skillId,
          payload,
        } as RecordInteractionRequest),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to record interaction')
      }

      // Revalidate the interactions list
      revalidate()

      // Also revalidate any session-specific queries
      mutate(interactionKeys.bySession(notebookId, sessionId))

      return responseData
    } catch (e) {
      console.error('Failed to record interaction:', e)
      return null
    }
  }

  return {
    interactions: data?.interactions ?? [],
    totalCount: data?.total_count ?? 0,
    hasMore: data?.has_more ?? false,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: revalidate,
    recordInteraction,
  }
}

// Hook for tracking practice attempts with automatic interaction recording
export function usePracticeTracking(notebookId: string, sessionId: string | null) {
  const { recordInteraction } = useInteractions(notebookId, { enabled: false })

  const recordPracticeAttempt = async (
    skillId: string,
    questionId: string,
    isCorrect: boolean,
    userAnswer: string,
    responseTimeMs: number,
    options: {
      questionType?: 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank'
      correctAnswer?: string
      hintUsedCount?: number
      attemptNumber?: number
      difficulty?: number
    } = {}
  ) => {
    if (!sessionId) {
      console.warn('No active session for practice tracking')
      return null
    }

    return recordInteraction(
      sessionId,
      'practice_attempt',
      {
        questionId,
        questionType: options.questionType || 'multiple_choice',
        isCorrect,
        userAnswer,
        correctAnswer: options.correctAnswer,
        responseTimeMs,
        hintUsedCount: options.hintUsedCount || 0,
        attemptNumber: options.attemptNumber || 1,
        difficulty: options.difficulty,
      },
      skillId
    )
  }

  const recordHintRequested = async (
    skillId: string,
    questionId: string,
    hintNumber: number,
    totalHintsAvailable: number,
    timeBeforeHintMs: number
  ) => {
    if (!sessionId) return null

    return recordInteraction(
      sessionId,
      'hint_requested',
      {
        questionId,
        hintNumber,
        totalHintsAvailable,
        timeBeforeHintMs,
      },
      skillId
    )
  }

  const recordSkillViewed = async (skillId: string) => {
    if (!sessionId) return null

    return recordInteraction(
      sessionId,
      'skill_viewed',
      {},
      skillId
    )
  }

  const recordConfidenceRated = async (
    skillId: string,
    rating: number,
    ratingType: 'pre_attempt' | 'post_attempt' | 'self_assessment',
    actualOutcome?: boolean
  ) => {
    if (!sessionId) return null

    return recordInteraction(
      sessionId,
      'confidence_rated',
      {
        ratingType,
        rating,
        scale: '1-5',
        actualOutcome,
      },
      skillId
    )
  }

  return {
    recordPracticeAttempt,
    recordHintRequested,
    recordSkillViewed,
    recordConfidenceRated,
  }
}

// Hook for getting practice statistics
export function usePracticeStats(notebookId: string, skillId?: string) {
  const options: UseInteractionsOptions = {
    eventType: 'practice_attempt',
    skillId,
    enabled: true,
  }

  const { interactions, loading, error } = useInteractions(notebookId, options)

  // Calculate stats from interactions
  const stats = {
    totalAttempts: interactions.length,
    correctAttempts: interactions.filter(
      i => (i.payload as { isCorrect?: boolean })?.isCorrect
    ).length,
    accuracy: 0,
    averageResponseTimeMs: 0,
    hintsUsed: 0,
  }

  if (stats.totalAttempts > 0) {
    stats.accuracy = stats.correctAttempts / stats.totalAttempts

    const responseTimes = interactions
      .map(i => (i.payload as { responseTimeMs?: number })?.responseTimeMs)
      .filter((t): t is number => typeof t === 'number')

    if (responseTimes.length > 0) {
      stats.averageResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    }

    stats.hintsUsed = interactions.reduce(
      (sum, i) => sum + ((i.payload as { hintUsedCount?: number })?.hintUsedCount || 0),
      0
    )
  }

  return {
    stats,
    loading,
    error,
  }
}
