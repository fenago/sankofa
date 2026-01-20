'use client'

import useSWR, { mutate } from 'swr'
import { fetcher } from '@/lib/swr-config'
import { notebookKeys } from './useNotebooks'
import { Source } from '@/lib/types'

interface SourceFromAPI {
  id: string
  url?: string
  filename?: string
  title?: string
  status: 'pending' | 'processing' | 'success' | 'error'
  raw_text?: string
  error_message?: string
  created_at: string
}

// Transform API source to UI source format
function transformSource(s: SourceFromAPI): Source {
  return {
    id: s.id,
    url: s.url || s.filename || '',
    title: s.title || s.filename || 'Untitled',
    status: s.status === 'success' ? 'success' : s.status === 'error' ? 'error' : 'loading',
    text: s.raw_text,
    addedAt: new Date(s.created_at).getTime(),
    error: s.error_message,
  }
}

export function useSources(notebookId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{ sources: SourceFromAPI[] }>(
    notebookId ? notebookKeys.sources(notebookId) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      // Poll every 2 seconds while any source is processing
      refreshInterval: (latestData) => {
        const hasProcessing = latestData?.sources?.some(
          s => s.status === 'pending' || s.status === 'processing'
        )
        return hasProcessing ? 2000 : 0
      },
    }
  )

  const sources: Source[] = data?.sources?.map(transformSource) ?? []

  const deleteSource = async (sourceId: string): Promise<boolean> => {
    if (!notebookId) return false

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || 'Failed to delete source')
      }

      // Revalidate sources and graph (deleting source affects graph)
      revalidate()
      mutate(notebookKeys.graph(notebookId))
      mutate(notebookKeys.learningPath(notebookId))
      return true
    } catch (e) {
      console.error('Failed to delete source:', e)
      return false
    }
  }

  const refreshSources = () => {
    revalidate()
  }

  return {
    sources,
    loading: isLoading,
    error: error?.message ?? null,
    refreshSources,
    deleteSource,
    mutate: revalidate,
  }
}

// Utility to invalidate sources cache after upload/scrape
export function invalidateSources(notebookId: string) {
  mutate(notebookKeys.sources(notebookId))
  mutate(notebookKeys.graph(notebookId))
  mutate(notebookKeys.learningPath(notebookId))
}
