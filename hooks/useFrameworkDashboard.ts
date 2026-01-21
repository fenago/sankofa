/**
 * SWR hook for fetching Framework Dashboard data
 */

import useSWR from 'swr'
import type { FrameworkDashboard } from '@/lib/profile/framework-interpreter'

interface UseFrameworkDashboardResult {
  dashboard: FrameworkDashboard | null
  hasProfile: boolean
  lastUpdated: string | null
  isLoading: boolean
  error: Error | null
  mutate: () => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Failed to fetch framework dashboard')
  }
  return res.json()
}

export function useFrameworkDashboard(notebookId: string | null): UseFrameworkDashboardResult {
  const { data, error, isLoading, mutate } = useSWR(
    notebookId ? `/api/notebooks/${notebookId}/profile/frameworks` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe for 30 seconds
    }
  )

  return {
    dashboard: data?.dashboard ?? null,
    hasProfile: data?.hasProfile ?? false,
    lastUpdated: data?.lastUpdated ?? null,
    isLoading,
    error: error ?? null,
    mutate,
  }
}
