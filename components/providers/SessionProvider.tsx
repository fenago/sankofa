'use client'

import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import { usePracticeTracking, useInteractions } from '@/hooks/useInteractions'
import { useNotebookSettings } from '@/hooks/useNotebookSettings'
import type {
  LearnerSession,
  InteractionEventType,
  InteractionPayload,
  StartSessionResponse,
  EndSessionResponse,
} from '@/lib/types/interactions'
import type { NotebookSettings } from '@/lib/types/database'

interface SessionContextValue {
  // Session state
  session: LearnerSession | null
  sessionId: string | null
  hasActiveSession: boolean
  isLoading: boolean

  // Settings state
  settings: NotebookSettings | null
  isTrackingEnabled: boolean

  // Session actions
  startSession: (entryPoint?: 'direct' | 'notification' | 'email' | 'bookmark') => Promise<StartSessionResponse | null>
  endSession: (endReason?: 'explicit' | 'idle_timeout' | 'page_close' | 'navigation_away', finalSkillId?: string) => Promise<EndSessionResponse | null>
  recordActivity: () => void

  // Interaction recording
  recordInteraction: (
    eventType: InteractionEventType,
    payload?: InteractionPayload,
    skillId?: string
  ) => Promise<void>

  // Practice-specific recording
  recordPracticeAttempt: (
    skillId: string,
    questionId: string,
    isCorrect: boolean,
    userAnswer: string,
    responseTimeMs: number,
    options?: {
      questionType?: 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank'
      correctAnswer?: string
      hintUsedCount?: number
      attemptNumber?: number
      difficulty?: number
    }
  ) => Promise<void>

  recordHintRequested: (
    skillId: string,
    questionId: string,
    hintNumber: number,
    totalHintsAvailable: number,
    timeBeforeHintMs: number
  ) => Promise<void>

  recordSkillViewed: (skillId: string) => Promise<void>

  recordConfidenceRated: (
    skillId: string,
    rating: number,
    ratingType: 'pre_attempt' | 'post_attempt' | 'self_assessment',
    actualOutcome?: boolean
  ) => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

interface SessionProviderProps {
  notebookId: string
  children: React.ReactNode
  autoStart?: boolean
  idleTimeoutMs?: number
  onSessionStart?: (sessionId: string) => void
  onSessionEnd?: (summary: EndSessionResponse['session_summary']) => void
}

export function SessionProvider({
  notebookId,
  children,
  autoStart = true,
  idleTimeoutMs = 30 * 60 * 1000, // 30 minutes
  onSessionStart,
  onSessionEnd,
}: SessionProviderProps) {
  const isInitializedRef = useRef(false)

  // Get notebook settings to check if tracking is enabled
  const {
    settings,
    isTrackingEnabled,
    isInverseProfilingActive,
  } = useNotebookSettings(notebookId)

  // Use the session hook
  const {
    session,
    sessionId,
    hasActiveSession,
    startSession: startSessionBase,
    endSession: endSessionBase,
    recordActivity,
  } = useSession(notebookId, {
    autoStart: false, // We'll handle autoStart ourselves
    idleTimeout: idleTimeoutMs,
    onSessionStart,
    onSessionEnd,
  })

  // Use practice tracking
  const {
    recordPracticeAttempt: recordPracticeAttemptBase,
    recordHintRequested: recordHintRequestedBase,
    recordSkillViewed: recordSkillViewedBase,
    recordConfidenceRated: recordConfidenceRatedBase,
  } = usePracticeTracking(notebookId, sessionId)

  // Use interactions for general recording
  const { recordInteraction: recordInteractionBase } = useInteractions(notebookId, { enabled: false })

  // Wrap startSession to handle initialization and settings check
  const startSession = useCallback(async (
    entryPoint: 'direct' | 'notification' | 'email' | 'bookmark' = 'direct'
  ) => {
    // Check if session tracking is enabled
    if (!settings?.session_tracking_enabled) {
      return null
    }
    const result = await startSessionBase(entryPoint)
    return result
  }, [startSessionBase, settings?.session_tracking_enabled])

  // Wrap endSession
  const endSession = useCallback(async (
    endReason: 'explicit' | 'idle_timeout' | 'page_close' | 'navigation_away' = 'explicit',
    finalSkillId?: string
  ) => {
    const result = await endSessionBase(endReason, finalSkillId)
    return result
  }, [endSessionBase])

  // Wrap record interaction - respects settings
  const recordInteraction = useCallback(async (
    eventType: InteractionEventType,
    payload?: InteractionPayload,
    skillId?: string
  ) => {
    // Check if interaction logging is enabled
    if (!settings?.interaction_logging_enabled) {
      return
    }
    if (!sessionId) {
      console.warn('Cannot record interaction: no active session')
      return
    }
    await recordInteractionBase(sessionId, eventType, payload, skillId)
    recordActivity()
  }, [sessionId, recordInteractionBase, recordActivity, settings?.interaction_logging_enabled])

  // Wrap practice attempt - respects settings
  const recordPracticeAttempt = useCallback(async (
    skillId: string,
    questionId: string,
    isCorrect: boolean,
    userAnswer: string,
    responseTimeMs: number,
    options?: {
      questionType?: 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank'
      correctAnswer?: string
      hintUsedCount?: number
      attemptNumber?: number
      difficulty?: number
    }
  ) => {
    if (!settings?.interaction_logging_enabled) {
      return
    }
    await recordPracticeAttemptBase(skillId, questionId, isCorrect, userAnswer, responseTimeMs, options)
    recordActivity()
  }, [recordPracticeAttemptBase, recordActivity, settings?.interaction_logging_enabled])

  // Wrap hint requested - respects settings
  const recordHintRequested = useCallback(async (
    skillId: string,
    questionId: string,
    hintNumber: number,
    totalHintsAvailable: number,
    timeBeforeHintMs: number
  ) => {
    if (!settings?.interaction_logging_enabled) {
      return
    }
    await recordHintRequestedBase(skillId, questionId, hintNumber, totalHintsAvailable, timeBeforeHintMs)
    recordActivity()
  }, [recordHintRequestedBase, recordActivity, settings?.interaction_logging_enabled])

  // Wrap skill viewed - respects settings
  const recordSkillViewed = useCallback(async (skillId: string) => {
    if (!settings?.interaction_logging_enabled) {
      return
    }
    await recordSkillViewedBase(skillId)
    recordActivity()
  }, [recordSkillViewedBase, recordActivity, settings?.interaction_logging_enabled])

  // Wrap confidence rated - respects settings
  const recordConfidenceRated = useCallback(async (
    skillId: string,
    rating: number,
    ratingType: 'pre_attempt' | 'post_attempt' | 'self_assessment',
    actualOutcome?: boolean
  ) => {
    if (!settings?.interaction_logging_enabled) {
      return
    }
    await recordConfidenceRatedBase(skillId, rating, ratingType, actualOutcome)
    recordActivity()
  }, [recordConfidenceRatedBase, recordActivity, settings?.interaction_logging_enabled])

  // Auto-start session on mount if enabled and settings allow
  useEffect(() => {
    if (
      autoStart &&
      notebookId &&
      !hasActiveSession &&
      !isInitializedRef.current &&
      settings?.session_tracking_enabled // Only auto-start if session tracking is enabled
    ) {
      isInitializedRef.current = true
      startSession('direct')
    }
  }, [autoStart, notebookId, hasActiveSession, startSession, settings?.session_tracking_enabled])

  // Track mouse/keyboard activity
  useEffect(() => {
    if (typeof window === 'undefined' || !hasActiveSession) return

    const handleActivity = () => {
      recordActivity()
    }

    // Throttle activity recording
    let lastRecord = 0
    const throttledHandler = () => {
      const now = Date.now()
      if (now - lastRecord > 60000) { // Record at most once per minute
        lastRecord = now
        handleActivity()
      }
    }

    window.addEventListener('mousemove', throttledHandler, { passive: true })
    window.addEventListener('keydown', throttledHandler, { passive: true })
    window.addEventListener('scroll', throttledHandler, { passive: true })
    window.addEventListener('click', throttledHandler, { passive: true })

    return () => {
      window.removeEventListener('mousemove', throttledHandler)
      window.removeEventListener('keydown', throttledHandler)
      window.removeEventListener('scroll', throttledHandler)
      window.removeEventListener('click', throttledHandler)
    }
  }, [hasActiveSession, recordActivity])

  const value: SessionContextValue = {
    session,
    sessionId,
    hasActiveSession,
    isLoading: session === undefined,
    settings: settings || null,
    isTrackingEnabled,
    startSession,
    endSession,
    recordActivity,
    recordInteraction,
    recordPracticeAttempt,
    recordHintRequested,
    recordSkillViewed,
    recordConfidenceRated,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

// Hook to use session context
export function useSessionContext() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  return context
}

// Optional hook that returns null if not in provider (for optional session tracking)
export function useOptionalSessionContext() {
  return useContext(SessionContext)
}
