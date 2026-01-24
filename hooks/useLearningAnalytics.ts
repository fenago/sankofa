/**
 * useLearningAnalytics Hook
 *
 * Provides access to learning analytics data including:
 * - Learning gains
 * - Retention metrics
 * - Time to mastery
 * - Transfer success
 * - Cohort analytics (for educators)
 */

'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-config'
import type {
  AnalyticsDashboard,
  OverallLearningGain,
  RetentionSummary,
  TimeToMasterySummary,
  TransferSummary,
  CohortAnalytics,
  StudentProgress,
} from '@/lib/analytics/types'

type AnalyticsPeriod = 'week' | 'month' | 'all'
type AnalyticsType = 'dashboard' | 'learning-gains' | 'retention' | 'time-to-mastery' | 'transfer'

interface UseAnalyticsOptions {
  type?: AnalyticsType
  period?: AnalyticsPeriod
}

interface AnalyticsResponse {
  available: boolean
  learningGains?: OverallLearningGain
  retention?: RetentionSummary
  timeToMastery?: TimeToMasterySummary
  transfer?: TransferSummary
  summary?: AnalyticsDashboard['summary']
}

interface CohortResponse {
  available: boolean
  cohort?: CohortAnalytics
  atRiskStudents?: StudentProgress[]
  velocity?: {
    velocity: number
    trend: 'accelerating' | 'steady' | 'slowing'
  }
  studentCount?: number
}

/**
 * Main analytics hook for individual learner analytics
 */
export function useLearningAnalytics(
  notebookId: string | undefined,
  options: UseAnalyticsOptions = {}
) {
  const { type = 'dashboard', period = 'all' } = options

  const queryParams = new URLSearchParams()
  queryParams.set('type', type)
  queryParams.set('period', period)

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
    notebookId ? `/api/notebooks/${notebookId}/analytics?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    available: data?.available ?? false,
    learningGains: data?.learningGains ?? null,
    retention: data?.retention ?? null,
    timeToMastery: data?.timeToMastery ?? null,
    transfer: data?.transfer ?? null,
    summary: data?.summary ?? null,
    isLoading,
    error,
    refetch: mutate,
  }
}

/**
 * Dashboard analytics hook - returns all analytics at once
 */
export function useAnalyticsDashboard(notebookId: string | undefined, period: AnalyticsPeriod = 'all') {
  return useLearningAnalytics(notebookId, { type: 'dashboard', period })
}

/**
 * Learning gains specific hook
 */
export function useLearningGains(notebookId: string | undefined, period: AnalyticsPeriod = 'all') {
  const { learningGains, isLoading, error, refetch } = useLearningAnalytics(notebookId, {
    type: 'learning-gains',
    period,
  })

  return {
    gains: learningGains,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Retention metrics specific hook
 */
export function useRetentionMetrics(notebookId: string | undefined) {
  const { retention, isLoading, error, refetch } = useLearningAnalytics(notebookId, {
    type: 'retention',
  })

  return {
    retention,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Time to mastery specific hook
 */
export function useTimeToMastery(notebookId: string | undefined) {
  const { timeToMastery, isLoading, error, refetch } = useLearningAnalytics(notebookId, {
    type: 'time-to-mastery',
  })

  return {
    timeToMastery,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Transfer success specific hook
 */
export function useTransferSuccess(notebookId: string | undefined) {
  const { transfer, isLoading, error, refetch } = useLearningAnalytics(notebookId, {
    type: 'transfer',
  })

  return {
    transfer,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Cohort analytics hook for educators
 */
export function useCohortAnalytics(notebookId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<CohortResponse>(
    notebookId ? `/api/notebooks/${notebookId}/analytics/cohort` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    available: data?.available ?? false,
    cohort: data?.cohort ?? null,
    atRiskStudents: data?.atRiskStudents ?? [],
    velocity: data?.velocity ?? null,
    studentCount: data?.studentCount ?? 0,
    isLoading,
    error,
    refetch: mutate,
  }
}

/**
 * Export hook for downloading learning data
 */
export function useExport(notebookId: string | undefined) {
  const [isExporting, setIsExporting] = useState(false)

  const exportData = async (options: {
    format?: 'json' | 'csv' | 'pdf'
    anonymize?: boolean
    include?: string[]
  } = {}) => {
    if (!notebookId) return null

    setIsExporting(true)

    try {
      const { format = 'json', anonymize = false, include = ['mastery'] } = options

      const params = new URLSearchParams()
      params.set('format', format)
      params.set('anonymize', String(anonymize))
      params.set('include', include.join(','))

      const response = await fetch(`/api/notebooks/${notebookId}/export?${params}`)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `learngraph-export-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      return true
    } finally {
      setIsExporting(false)
    }
  }

  return { exportData, isExporting }
}

// Utility functions for interpreting analytics

/**
 * Get color for mastery percentage
 */
export function getMasteryColor(mastery: number): string {
  if (mastery >= 0.8) return 'text-green-600'
  if (mastery >= 0.5) return 'text-yellow-600'
  if (mastery >= 0.2) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Get background color for mastery percentage
 */
export function getMasteryBgColor(mastery: number): string {
  if (mastery >= 0.8) return 'bg-green-100'
  if (mastery >= 0.5) return 'bg-yellow-100'
  if (mastery >= 0.2) return 'bg-orange-100'
  return 'bg-red-100'
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * Format duration in ms to human readable
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

/**
 * Interpret learning gain category
 */
export function interpretGain(normalizedGain: number): {
  label: string
  color: string
  description: string
} {
  if (normalizedGain >= 0.7) {
    return {
      label: 'High',
      color: 'text-green-600 bg-green-100',
      description: 'Excellent progress',
    }
  }
  if (normalizedGain >= 0.3) {
    return {
      label: 'Medium',
      color: 'text-yellow-600 bg-yellow-100',
      description: 'Good progress',
    }
  }
  if (normalizedGain >= 0) {
    return {
      label: 'Low',
      color: 'text-orange-600 bg-orange-100',
      description: 'Some progress',
    }
  }
  return {
    label: 'Negative',
    color: 'text-red-600 bg-red-100',
    description: 'Needs review',
  }
}
