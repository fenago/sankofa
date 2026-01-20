'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { fetcher } from '@/lib/swr-config'
import type {
  InverseProfile,
  KnowledgeState,
  CognitiveIndicators,
  MetacognitiveIndicators,
  MotivationalIndicators,
  BehavioralPatterns,
  ConfidenceScores,
} from '@/lib/types/interactions'
import type { ProfileInsight } from '@/lib/profile/inverse-profile-engine'

// SWR key factories
export const profileKeys = {
  profile: (notebookId: string) =>
    `/api/notebooks/${notebookId}/profile?action=get` as const,
  insights: (notebookId: string) =>
    `/api/notebooks/${notebookId}/profile?action=insights` as const,
  summary: (notebookId: string) =>
    `/api/notebooks/${notebookId}/profile?action=summary` as const,
}

// Response types
interface ProfileResponse {
  available: boolean
  hasProfile: boolean
  profile: {
    id: string
    notebook_id: string
    learner_id: string
    version: number
    computed_at: string
    interactions_analyzed: number
    knowledge_state: KnowledgeState
    cognitive_indicators: CognitiveIndicators
    metacognitive_indicators: MetacognitiveIndicators
    motivational_indicators: MotivationalIndicators
    behavioral_patterns: BehavioralPatterns
    confidence_scores: ConfidenceScores
    data_quality: 'insufficient' | 'limited' | 'adequate' | 'good'
    warnings: string[]
  } | null
  lastUpdated: string | null
  interactionsSinceUpdate: number
  needsUpdate: boolean
}

interface InsightsResponse {
  available: boolean
  hasProfile: boolean
  insights: ProfileInsight[]
  profileVersion?: number
  dataQuality?: 'insufficient' | 'limited' | 'adequate' | 'good'
  message?: string
}

interface SummaryResponse {
  available: boolean
  hasProfile: boolean
  summary: {
    overallMastery: number
    expertiseLevel: string
    helpSeekingPattern: string
    goalOrientation: string
    dataQuality: 'insufficient' | 'limited' | 'adequate' | 'good'
    confidence: {
      overall: number
      knowledge: number
      cognitive: number
      metacognitive: number
      motivational: number
      behavioral: number
    }
    keyStats: {
      skillsMastered: number
      skillsInProgress: number
      knowledgeGaps: number
      misconceptions: number
    }
    lastUpdated: string
  } | null
}

interface ComputeResponse {
  available: boolean
  computed: boolean
  profile?: ProfileResponse['profile']
  dataQuality?: 'insufficient' | 'limited' | 'adequate' | 'good'
  warnings?: string[]
  insights?: ProfileInsight[]
  message?: string
  interactionsSinceUpdate?: number
}

/**
 * Hook for accessing the full inverse profile
 */
export function useInverseProfile(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<ProfileResponse>(
    notebookId ? profileKeys.profile(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const computeProfile = useCallback(async (force: boolean = false): Promise<ComputeResponse | null> => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compute', force }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to compute profile')
      }

      // Revalidate profile data
      mutate()

      return responseData
    } catch (e) {
      console.error('Failed to compute profile:', e)
      return null
    }
  }, [notebookId, mutate])

  const deleteProfile = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete profile')
      }

      // Revalidate profile data
      mutate()

      return true
    } catch (e) {
      console.error('Failed to delete profile:', e)
      return false
    }
  }, [notebookId, mutate])

  return {
    // Raw data
    data,

    // Convenience accessors
    hasProfile: data?.hasProfile ?? false,
    profile: data?.profile ?? null,
    lastUpdated: data?.lastUpdated ?? null,
    interactionsSinceUpdate: data?.interactionsSinceUpdate ?? 0,
    needsUpdate: data?.needsUpdate ?? false,

    // Profile dimensions (null-safe)
    knowledgeState: data?.profile?.knowledge_state ?? null,
    cognitiveIndicators: data?.profile?.cognitive_indicators ?? null,
    metacognitiveIndicators: data?.profile?.metacognitive_indicators ?? null,
    motivationalIndicators: data?.profile?.motivational_indicators ?? null,
    behavioralPatterns: data?.profile?.behavioral_patterns ?? null,
    confidenceScores: data?.profile?.confidence_scores ?? null,
    dataQuality: data?.profile?.data_quality ?? null,
    warnings: data?.profile?.warnings ?? [],

    // Loading/error state
    loading: isLoading,
    error: error?.message ?? null,

    // Actions
    computeProfile,
    deleteProfile,
    refetch: mutate,
  }
}

/**
 * Hook for accessing profile insights
 */
export function useProfileInsights(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<InsightsResponse>(
    notebookId ? profileKeys.insights(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    data,
    hasProfile: data?.hasProfile ?? false,
    insights: data?.insights ?? [],
    dataQuality: data?.dataQuality ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  }
}

/**
 * Hook for accessing a compact profile summary
 */
export function useProfileSummary(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<SummaryResponse>(
    notebookId ? profileKeys.summary(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    data,
    hasProfile: data?.hasProfile ?? false,
    summary: data?.summary ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  }
}

/**
 * Composite hook that provides everything for the profile dashboard
 */
export function useProfileDashboard(notebookId: string) {
  const profile = useInverseProfile(notebookId)
  const insights = useProfileInsights(notebookId)

  return {
    // Profile data
    ...profile,

    // Insights data
    insights: insights.insights,
    insightsLoading: insights.loading,

    // Combined loading state
    isReady: !profile.loading && !insights.loading,

    // Combined error
    combinedError: profile.error || insights.error,
  }
}
