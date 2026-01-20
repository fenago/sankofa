'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { fetcher } from '@/lib/swr-config'
import type { BKTParams, ValidationMetrics, FittingResult } from '@/lib/graph/enhanced-bkt'

// SWR key factories
export const validationKeys = {
  overview: (notebookId: string) =>
    `/api/notebooks/${notebookId}/learner/validate?action=overview` as const,
  skill: (notebookId: string, skillId: string) =>
    `/api/notebooks/${notebookId}/learner/validate?action=skill&skillId=${skillId}` as const,
  params: (notebookId: string) =>
    `/api/notebooks/${notebookId}/learner/validate?action=params` as const,
}

// Response types
interface SkillValidation {
  skillId: string
  skillName?: string
  metrics: ValidationMetrics
  params: BKTParams
  fitQuality: string
  sampleSize: number
}

interface AggregateMetrics {
  avgAuc: number
  avgBrierScore: number
  totalInteractions: number
  validatedSkills: number
  overallQuality: 'good' | 'acceptable' | 'needs_improvement'
}

interface ValidationOverviewResponse {
  available: boolean
  hasData: boolean
  message?: string
  aggregateMetrics?: AggregateMetrics
  skillValidations?: SkillValidation[]
  totalSkillsWithData?: number
}

interface MasteryEstimate {
  pMastery: number
  confidenceInterval: {
    lower: number
    upper: number
    level: number
  }
  nEffective: number
}

interface SkillValidationResponse {
  available: boolean
  hasData: boolean
  message?: string
  skillId?: string
  metrics?: ValidationMetrics
  params?: BKTParams
  masteryEstimate?: MasteryEstimate
  sampleSize?: number
  minRequired?: number
  currentCount?: number
}

interface FitSkillResponse {
  available: boolean
  success: boolean
  message?: string
  skillId?: string
  fittingResult?: FittingResult
  minRequired?: number
  currentCount?: number
}

interface FitAllResponse {
  available: boolean
  success: boolean
  message?: string
  fittedSkills?: number
  skippedSkills?: number
  totalSkills?: number
  results?: Record<string, FittingResult>
}

// Hook for validation overview
export function useValidationOverview(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<ValidationOverviewResponse>(
    notebookId ? validationKeys.overview(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const fitAllSkills = useCallback(async (): Promise<FitAllResponse | null> => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/learner/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fit_all' }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to fit parameters')
      }

      // Revalidate overview
      mutate()

      return responseData
    } catch (e) {
      console.error('Failed to fit all parameters:', e)
      return null
    }
  }, [notebookId, mutate])

  return {
    data,
    hasData: data?.hasData ?? false,
    aggregateMetrics: data?.aggregateMetrics ?? null,
    skillValidations: data?.skillValidations ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    fitAllSkills,
  }
}

// Hook for single skill validation
export function useSkillValidation(notebookId: string, skillId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SkillValidationResponse>(
    notebookId && skillId ? validationKeys.skill(notebookId, skillId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const fitSkill = useCallback(async (): Promise<FitSkillResponse | null> => {
    if (!skillId) return null

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/learner/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fit_skill', skillId }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to fit parameters')
      }

      // Revalidate skill data
      mutate()

      return responseData
    } catch (e) {
      console.error('Failed to fit skill parameters:', e)
      return null
    }
  }, [notebookId, skillId, mutate])

  return {
    data,
    hasData: data?.hasData ?? false,
    metrics: data?.metrics ?? null,
    params: data?.params ?? null,
    masteryEstimate: data?.masteryEstimate ?? null,
    sampleSize: data?.sampleSize ?? 0,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    fitSkill,
  }
}
