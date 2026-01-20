'use client'

import useSWR from 'swr'
import { useCallback, useRef, useEffect } from 'react'
import { fetcher } from '@/lib/swr-config'
import type {
  LearnerSession,
  DeviceType,
  StartSessionResponse,
  EndSessionResponse,
  GetSessionsResponse,
} from '@/lib/types/interactions'

// SWR key factories for sessions
export const sessionKeys = {
  all: (notebookId: string) => `/api/notebooks/${notebookId}/sessions` as const,
  active: (notebookId: string) => `/api/notebooks/${notebookId}/sessions?action=active` as const,
  byStatus: (notebookId: string, status: string) =>
    `/api/notebooks/${notebookId}/sessions?status=${status}` as const,
}

// Detect device type from user agent
function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/ipad|tablet/i.test(ua) || (window.innerWidth >= 768 && window.innerWidth < 1024)) {
      return 'tablet'
    }
    return 'mobile'
  }
  return 'desktop'
}

interface UseSessionOptions {
  autoStart?: boolean
  idleTimeout?: number // ms before marking session as idle
  onSessionStart?: (sessionId: string) => void
  onSessionEnd?: (summary: EndSessionResponse['session_summary']) => void
}

export function useSession(notebookId: string, options: UseSessionOptions = {}) {
  const {
    autoStart = false,
    idleTimeout = 30 * 60 * 1000, // 30 minutes
    onSessionStart,
    onSessionEnd,
  } = options

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Get active session
  const { data: activeSessionData, mutate: refreshActiveSession } = useSWR<{
    session: LearnerSession | null
    has_active_session: boolean
  }>(
    notebookId ? sessionKeys.active(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const activeSession = activeSessionData?.session || null
  const hasActiveSession = activeSessionData?.has_active_session || false

  // Start a new session
  const startSession = useCallback(async (
    entryPoint: 'direct' | 'notification' | 'email' | 'bookmark' = 'direct'
  ): Promise<StartSessionResponse | null> => {
    try {
      const deviceType = detectDeviceType()

      const res = await fetch(`/api/notebooks/${notebookId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_type: deviceType,
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          entry_point: entryPoint,
        }),
      })

      const data: StartSessionResponse = await res.json()

      if (!res.ok) {
        throw new Error((data as unknown as { error: string }).error || 'Failed to start session')
      }

      // Refresh the active session
      refreshActiveSession()

      // Call callback
      onSessionStart?.(data.session_id)

      return data
    } catch (e) {
      console.error('Failed to start session:', e)
      return null
    }
  }, [notebookId, refreshActiveSession, onSessionStart])

  // End current session
  const endSession = useCallback(async (
    endReason: 'explicit' | 'idle_timeout' | 'page_close' | 'navigation_away' = 'explicit',
    finalSkillId?: string
  ): Promise<EndSessionResponse | null> => {
    if (!activeSession) return null

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/sessions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          end_reason: endReason,
          final_skill_id: finalSkillId,
        }),
      })

      const data: EndSessionResponse = await res.json()

      if (!res.ok) {
        throw new Error((data as unknown as { error: string }).error || 'Failed to end session')
      }

      // Refresh to clear active session
      refreshActiveSession()

      // Call callback
      onSessionEnd?.(data.session_summary)

      return data
    } catch (e) {
      console.error('Failed to end session:', e)
      return null
    }
  }, [notebookId, activeSession, refreshActiveSession, onSessionEnd])

  // Record activity to reset idle timer
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Handle idle timeout
  useEffect(() => {
    if (!hasActiveSession || !idleTimeout) return

    const checkIdle = () => {
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime >= idleTimeout) {
        endSession('idle_timeout')
      }
    }

    // Check every minute
    idleTimerRef.current = setInterval(checkIdle, 60 * 1000)

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current)
      }
    }
  }, [hasActiveSession, idleTimeout, endSession])

  // Handle page visibility changes
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.hidden && hasActiveSession && activeSession) {
        // Record pause interaction
        fetch(`/api/notebooks/${notebookId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'session_paused',
            session_id: activeSession.id,
            payload: { pauseReason: 'tab_hidden' },
          }),
        }).catch(console.error)
      } else if (!document.hidden && hasActiveSession && activeSession) {
        // Record resume interaction
        recordActivity()
        fetch(`/api/notebooks/${notebookId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'session_resumed',
            session_id: activeSession.id,
            payload: { pauseDurationMs: Date.now() - lastActivityRef.current },
          }),
        }).catch(console.error)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [notebookId, hasActiveSession, activeSession, recordActivity])

  // Handle page unload
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      if (hasActiveSession && activeSession) {
        // Use sendBeacon for reliable delivery on page close
        const data = JSON.stringify({
          session_id: activeSession.id,
          end_reason: 'page_close',
        })

        navigator.sendBeacon(
          `/api/notebooks/${notebookId}/sessions`,
          new Blob([data], { type: 'application/json' })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [notebookId, hasActiveSession, activeSession])

  // Auto-start session if enabled
  useEffect(() => {
    if (autoStart && notebookId && !hasActiveSession && activeSessionData !== undefined) {
      startSession('direct')
    }
  }, [autoStart, notebookId, hasActiveSession, activeSessionData, startSession])

  return {
    session: activeSession,
    sessionId: activeSession?.id || null,
    hasActiveSession,
    startSession,
    endSession,
    recordActivity,
    refreshSession: refreshActiveSession,
  }
}

// Hook for getting session history
export function useSessionHistory(notebookId: string, options: { limit?: number } = {}) {
  const { limit = 20 } = options

  const { data, error, isLoading, mutate } = useSWR<GetSessionsResponse>(
    notebookId ? `${sessionKeys.all(notebookId)}?limit=${limit}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Calculate aggregate stats
  const aggregateStats = {
    totalSessions: data?.total_count ?? 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    totalPracticeAttempts: 0,
    totalCorrectAttempts: 0,
    overallAccuracy: 0,
  }

  if (data?.sessions) {
    const completedSessions = data.sessions.filter(s => s.status === 'ended')

    aggregateStats.totalDurationMs = completedSessions.reduce(
      (sum, s) => sum + (s.duration_ms || 0), 0
    )

    if (completedSessions.length > 0) {
      aggregateStats.averageDurationMs = aggregateStats.totalDurationMs / completedSessions.length
    }

    aggregateStats.totalPracticeAttempts = data.sessions.reduce(
      (sum, s) => sum + s.practice_attempts, 0
    )

    aggregateStats.totalCorrectAttempts = data.sessions.reduce(
      (sum, s) => sum + s.correct_attempts, 0
    )

    if (aggregateStats.totalPracticeAttempts > 0) {
      aggregateStats.overallAccuracy =
        aggregateStats.totalCorrectAttempts / aggregateStats.totalPracticeAttempts
    }
  }

  return {
    sessions: data?.sessions ?? [],
    totalCount: data?.total_count ?? 0,
    stats: aggregateStats,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  }
}
