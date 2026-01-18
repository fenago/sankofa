'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Notebook } from '@/lib/types/database'

interface UseNotebooksOptions {
  autoFetch?: boolean
}

export function useNotebooks(options: UseNotebooksOptions = { autoFetch: true }) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotebooks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/notebooks')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch notebooks')
      }

      setNotebooks(data.notebooks)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const createNotebook = useCallback(async (
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

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create notebook')
      }

      setNotebooks(prev => [data.notebook, ...prev])
      return data.notebook
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return null
    }
  }, [])

  const updateNotebook = useCallback(async (
    id: string,
    updates: { name?: string; description?: string; color?: string }
  ): Promise<Notebook | null> => {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update notebook')
      }

      setNotebooks(prev =>
        prev.map(n => n.id === id ? data.notebook : n)
      )
      return data.notebook
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return null
    }
  }, [])

  const deleteNotebook = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete notebook')
      }

      setNotebooks(prev => prev.filter(n => n.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return false
    }
  }, [])

  useEffect(() => {
    if (options.autoFetch) {
      fetchNotebooks()
    }
  }, [options.autoFetch, fetchNotebooks])

  return {
    notebooks,
    loading,
    error,
    fetchNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
  }
}

// Hook for a single notebook
export function useNotebook(id: string) {
  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [stats, setStats] = useState<{ sourceCount: number; messageCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotebook = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/notebooks/${id}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch notebook')
      }

      setNotebook(data.notebook)
      setStats(data.stats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchNotebook()
    }
  }, [id, fetchNotebook])

  return {
    notebook,
    stats,
    loading,
    error,
    refetch: fetchNotebook,
  }
}
