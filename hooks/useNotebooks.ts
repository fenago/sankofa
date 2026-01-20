'use client'

import useSWR, { mutate } from 'swr'
import { fetcher } from '@/lib/swr-config'
import type { Notebook } from '@/lib/types/database'

// SWR key factories
export const notebookKeys = {
  all: '/api/notebooks' as const,
  one: (id: string) => `/api/notebooks/${id}` as const,
  sources: (id: string) => `/api/notebooks/${id}/sources` as const,
  graph: (id: string) => `/api/notebooks/${id}/graph` as const,
  learningPath: (id: string, action: string = 'overview') =>
    `/api/notebooks/${id}/graph/learning-path?action=${action}` as const,
  artifacts: (id: string, audience?: string) =>
    audience ? `/api/notebooks/${id}/artifacts/library?audience=${audience}` : `/api/notebooks/${id}/artifacts/library` as const,
}

export function useNotebooks() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{ notebooks: Notebook[] }>(
    notebookKeys.all,
    fetcher,
    { revalidateOnFocus: false }
  )

  const createNotebook = async (
    name: string,
    description?: string,
    color?: string
  ): Promise<Notebook | null> => {
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to create notebook')
      }

      // Optimistically update the cache
      revalidate()
      return responseData.notebook
    } catch (e) {
      console.error('Failed to create notebook:', e)
      return null
    }
  }

  const updateNotebook = async (
    id: string,
    updates: { name?: string; description?: string; color?: string }
  ): Promise<Notebook | null> => {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to update notebook')
      }

      // Revalidate both list and individual notebook
      revalidate()
      mutate(notebookKeys.one(id))
      return responseData.notebook
    } catch (e) {
      console.error('Failed to update notebook:', e)
      return null
    }
  }

  const deleteNotebook = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || 'Failed to delete notebook')
      }

      // Revalidate the list
      revalidate()
      return true
    } catch (e) {
      console.error('Failed to delete notebook:', e)
      return false
    }
  }

  return {
    notebooks: data?.notebooks ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    fetchNotebooks: revalidate,
    createNotebook,
    updateNotebook,
    deleteNotebook,
  }
}

// Hook for a single notebook with stats
export function useNotebook(id: string) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{
    notebook: Notebook
    stats: { sourceCount: number; messageCount: number }
  }>(
    id ? notebookKeys.one(id) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    notebook: data?.notebook ?? null,
    stats: data?.stats ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: revalidate,
  }
}
