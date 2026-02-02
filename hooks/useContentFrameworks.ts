/**
 * SWR hook for fetching Content Framework Stats
 * Shows what educational psychology metadata was extracted from content
 */

import useSWR from 'swr'
import type { ContentFrameworkStats } from '@/app/api/notebooks/[id]/frameworks/content/route'

interface UseContentFrameworksResult {
  stats: ContentFrameworkStats | null
  hasContent: boolean
  isLoading: boolean
  error: Error | null
  mutate: () => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Failed to fetch content framework stats')
  }
  return res.json()
}

export function useContentFrameworks(notebookId: string | null): UseContentFrameworksResult {
  const { data, error, isLoading, mutate } = useSWR(
    notebookId ? `/api/notebooks/${notebookId}/frameworks/content` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe for 60 seconds (content changes less frequently)
    }
  )

  return {
    stats: data?.stats ?? null,
    hasContent: data?.hasContent ?? false,
    isLoading,
    error: error ?? null,
    mutate,
  }
}
