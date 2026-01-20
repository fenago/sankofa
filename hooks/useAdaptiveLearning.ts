'use client'

import useSWR from 'swr'
import { useCallback, useState } from 'react'
import { fetcher } from '@/lib/swr-config'
import type { SkillNode } from '@/lib/types/graph'

// SWR key factories
export const adaptiveKeys = {
  recommendations: (notebookId: string) =>
    `/api/notebooks/${notebookId}/adaptive?action=recommendations` as const,
  nextSkill: (notebookId: string) =>
    `/api/notebooks/${notebookId}/adaptive?action=next-skill` as const,
  learningPath: (notebookId: string, goalSkillId: string) =>
    `/api/notebooks/${notebookId}/adaptive?action=learning-path&goalSkillId=${goalSkillId}` as const,
  interventions: (notebookId: string, dismissed: string[]) =>
    `/api/notebooks/${notebookId}/adaptive?action=interventions&dismissed=${dismissed.join(',')}` as const,
}

// Types for API responses
export interface RecommendationReason {
  factor: string
  weight: number
  description: string
  profileDimension: 'knowledge' | 'cognitive' | 'metacognitive' | 'motivational' | 'behavioral'
}

export interface SkillRecommendation {
  skillId: string
  skill: {
    id: string
    name: string
    description: string
    bloomLevel: number
    difficulty?: number
    estimatedMinutes?: number
    isThresholdConcept?: boolean
    cognitiveLoadEstimate?: number
  }
  score: number
  reasons: RecommendationReason[]
  adjustments: {
    scaffoldLevel: 1 | 2 | 3 | 4
    difficultyAdjustment: number
    cognitiveLoadLimit: 'low' | 'medium' | 'high'
  }
  whyExplanation: string
}

export interface ActiveIntervention {
  triggerId: string
  triggerName: string
  dimension: 'metacognitive' | 'motivational'
  priority: 'low' | 'medium' | 'high'
  message: string
  actionLabel?: string
  emoji?: string
  dismissKey: string
}

export interface ProfileSummary {
  expertiseLevel: string
  optimalComplexity: number
  helpSeekingPattern: string
  goalOrientation: string
  cognitiveLoadThreshold: string
}

interface RecommendationsResponse {
  available: boolean
  hasProfile: boolean
  recommendations: SkillRecommendation[]
  activeInterventions: Record<string, ActiveIntervention>
  profileSummary: ProfileSummary | null
  totalZPDSkills: number
  masteredCount: number
}

interface NextSkillResponse {
  available: boolean
  hasProfile: boolean
  nextSkill: SkillRecommendation | null
  message?: string
}

interface LearningPathResponse {
  available: boolean
  hasProfile: boolean
  learningPath: {
    goalSkillId: string
    skills: (SkillNode & { adjustedMinutes?: number })[]
    totalEstimatedMinutes: number
    thresholdConcepts: SkillNode[]
    personalization: {
      expertiseLevel: string
      timeMultiplier: number
      cognitiveLoadLimit: string
    } | null
  }
}

interface InterventionsResponse {
  available: boolean
  hasProfile: boolean
  interventions: ActiveIntervention[]
  context: {
    consecutiveSuccesses: number
    consecutiveFailures: number
    currentErrors: number
    sessionDurationMs: number
  }
}

/**
 * Hook for accessing adaptive learning recommendations
 */
export function useAdaptiveRecommendations(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<RecommendationsResponse>(
    notebookId ? adaptiveKeys.recommendations(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30000 } // Refresh every 30s
  )

  return {
    // Raw data
    data,

    // Convenience accessors
    available: data?.available ?? false,
    hasProfile: data?.hasProfile ?? false,
    recommendations: data?.recommendations ?? [],
    activeInterventions: data?.activeInterventions ?? {},
    profileSummary: data?.profileSummary ?? null,
    totalZPDSkills: data?.totalZPDSkills ?? 0,
    masteredCount: data?.masteredCount ?? 0,

    // Top recommendation
    topRecommendation: data?.recommendations?.[0] ?? null,

    // Loading/error state
    loading: isLoading,
    error: error?.message ?? null,

    // Actions
    refetch: mutate,
  }
}

/**
 * Hook for getting the single best next skill
 */
export function useNextSkill(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<NextSkillResponse>(
    notebookId ? adaptiveKeys.nextSkill(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    data,
    available: data?.available ?? false,
    hasProfile: data?.hasProfile ?? false,
    nextSkill: data?.nextSkill ?? null,
    message: data?.message ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  }
}

/**
 * Hook for generating a personalized learning path
 */
export function useLearningPath(notebookId: string, goalSkillId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<LearningPathResponse>(
    notebookId && goalSkillId
      ? adaptiveKeys.learningPath(notebookId, goalSkillId)
      : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    data,
    available: data?.available ?? false,
    hasProfile: data?.hasProfile ?? false,
    learningPath: data?.learningPath ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  }
}

/**
 * Hook for managing intervention triggers
 */
export function useInterventions(notebookId: string) {
  const [dismissedTriggers, setDismissedTriggers] = useState<string[]>([])

  const { data, error, isLoading, mutate } = useSWR<InterventionsResponse>(
    notebookId
      ? adaptiveKeys.interventions(notebookId, dismissedTriggers)
      : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 10000 } // Check every 10s
  )

  const dismissIntervention = useCallback((dismissKey: string) => {
    setDismissedTriggers((prev) => [...prev, dismissKey])
  }, [])

  const clearDismissed = useCallback(() => {
    setDismissedTriggers([])
  }, [])

  return {
    data,
    available: data?.available ?? false,
    hasProfile: data?.hasProfile ?? false,
    interventions: data?.interventions ?? [],
    context: data?.context ?? null,

    // Get highest priority intervention
    topIntervention: data?.interventions?.[0] ?? null,

    // Filter by dimension
    metacognitiveInterventions: data?.interventions?.filter(
      (i) => i.dimension === 'metacognitive'
    ) ?? [],
    motivationalInterventions: data?.interventions?.filter(
      (i) => i.dimension === 'motivational'
    ) ?? [],

    // Loading/error state
    loading: isLoading,
    error: error?.message ?? null,

    // Actions
    dismissIntervention,
    clearDismissed,
    refetch: mutate,
  }
}

/**
 * Composite hook that combines all adaptive learning functionality
 */
export function useAdaptiveLearning(notebookId: string) {
  const recommendations = useAdaptiveRecommendations(notebookId)
  const interventions = useInterventions(notebookId)

  // Check for urgent interventions that need immediate attention
  const hasUrgentIntervention = interventions.interventions.some(
    (i) => i.priority === 'high'
  )

  return {
    // Recommendations
    recommendations: recommendations.recommendations,
    topRecommendation: recommendations.topRecommendation,
    profileSummary: recommendations.profileSummary,
    totalZPDSkills: recommendations.totalZPDSkills,
    masteredCount: recommendations.masteredCount,

    // Interventions
    interventions: interventions.interventions,
    topIntervention: interventions.topIntervention,
    metacognitiveInterventions: interventions.metacognitiveInterventions,
    motivationalInterventions: interventions.motivationalInterventions,
    hasUrgentIntervention,

    // State
    available: recommendations.available,
    hasProfile: recommendations.hasProfile,
    loading: recommendations.loading || interventions.loading,
    error: recommendations.error || interventions.error,

    // Actions
    dismissIntervention: interventions.dismissIntervention,
    clearDismissedInterventions: interventions.clearDismissed,
    refetchRecommendations: recommendations.refetch,
    refetchInterventions: interventions.refetch,
    refetchAll: () => {
      recommendations.refetch()
      interventions.refetch()
    },
  }
}

/**
 * Get scaffold level description for display
 */
export function getScaffoldDescription(level: 1 | 2 | 3 | 4): string {
  const descriptions = {
    1: 'Full worked examples provided',
    2: 'Partial solutions with fill-in',
    3: 'Hints available on request',
    4: 'Independent practice',
  }
  return descriptions[level]
}

/**
 * Get Bloom's taxonomy label for a level
 */
export function getBloomLabel(level: number): string {
  const labels: Record<number, string> = {
    1: 'Remember',
    2: 'Understand',
    3: 'Apply',
    4: 'Analyze',
    5: 'Evaluate',
    6: 'Create',
  }
  return labels[level] ?? 'Unknown'
}
