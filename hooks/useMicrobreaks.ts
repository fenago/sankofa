/**
 * Microbreak Management Hook
 * Integrates microbreak scheduling with practice sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  createSessionState,
  recordResponse,
  recordBreak,
  getBreakRecommendation,
  type SessionState,
  type BreakRecommendation,
  type MicrobreakConfig,
  type BreakType,
  DEFAULT_CONFIG,
} from '@/lib/attention/microbreak-scheduler'

interface UseMicrobreaksOptions {
  enabled?: boolean
  config?: Partial<MicrobreakConfig>
  onBreakSuggested?: (recommendation: BreakRecommendation) => void
  onBreakCompleted?: (breakType: BreakType, durationMs: number) => void
  onBreakSkipped?: () => void
}

interface UseMicrobreaksReturn {
  // State
  sessionState: SessionState
  recommendation: BreakRecommendation | null
  isBreakActive: boolean
  snoozedUntil: number | null

  // Actions
  startBreak: (breakType?: BreakType) => void
  completeBreak: () => void
  skipBreak: () => void
  snoozeBreak: (minutes: number) => void
  dismissRecommendation: () => void
  recordPracticeResponse: (responseTimeMs: number, isCorrect: boolean, cognitiveLoad?: number) => void
  resetSession: () => void

  // Computed
  timeSinceLastBreak: number
  totalBreaksTaken: number
  totalBreaksSkipped: number
  shouldShowReminder: boolean
}

export function useMicrobreaks(options: UseMicrobreaksOptions = {}): UseMicrobreaksReturn {
  const {
    enabled = true,
    config: userConfig,
    onBreakSuggested,
    onBreakCompleted,
    onBreakSkipped,
  } = options

  const config = { ...DEFAULT_CONFIG, ...userConfig }

  // State
  const [sessionState, setSessionState] = useState<SessionState>(createSessionState)
  const [recommendation, setRecommendation] = useState<BreakRecommendation | null>(null)
  const [isBreakActive, setIsBreakActive] = useState(false)
  const [currentBreakType, setCurrentBreakType] = useState<BreakType | null>(null)
  const [breakStartTime, setBreakStartTime] = useState<number | null>(null)
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check for break recommendation periodically
  useEffect(() => {
    if (!enabled) return

    const checkForBreak = () => {
      // Skip if snoozed
      if (snoozedUntil && Date.now() < snoozedUntil) {
        return
      }

      // Skip if break is active
      if (isBreakActive) return

      // Skip if dismissed recently
      if (isDismissed) return

      const rec = getBreakRecommendation(sessionState, config)
      setRecommendation(rec)

      if (rec.shouldBreak && !recommendation?.shouldBreak) {
        onBreakSuggested?.(rec)
      }
    }

    // Initial check
    checkForBreak()

    // Set up interval
    checkIntervalRef.current = setInterval(checkForBreak, 30000) // Check every 30 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [enabled, sessionState, config, isBreakActive, snoozedUntil, isDismissed, onBreakSuggested, recommendation?.shouldBreak])

  // Clear snooze when time expires
  useEffect(() => {
    if (!snoozedUntil) return

    const timeout = setTimeout(() => {
      setSnoozedUntil(null)
    }, snoozedUntil - Date.now())

    return () => clearTimeout(timeout)
  }, [snoozedUntil])

  // Record practice response
  const recordPracticeResponse = useCallback((
    responseTimeMs: number,
    isCorrect: boolean,
    cognitiveLoad?: number
  ) => {
    setSessionState(prev => recordResponse(prev, responseTimeMs, isCorrect, cognitiveLoad))
  }, [])

  // Start break
  const startBreak = useCallback((breakType?: BreakType) => {
    const type = breakType || recommendation?.suggestedBreakType || 'breathing'
    setCurrentBreakType(type)
    setBreakStartTime(Date.now())
    setIsBreakActive(true)
    setIsDismissed(false)
  }, [recommendation])

  // Complete break
  const completeBreak = useCallback(() => {
    if (breakStartTime && currentBreakType) {
      const durationMs = Date.now() - breakStartTime
      onBreakCompleted?.(currentBreakType, durationMs)
    }

    setSessionState(prev => recordBreak(prev, true))
    setIsBreakActive(false)
    setCurrentBreakType(null)
    setBreakStartTime(null)
    setRecommendation(null)
  }, [breakStartTime, currentBreakType, onBreakCompleted])

  // Skip break
  const skipBreak = useCallback(() => {
    setSessionState(prev => recordBreak(prev, false))
    setIsBreakActive(false)
    setCurrentBreakType(null)
    setBreakStartTime(null)
    onBreakSkipped?.()
  }, [onBreakSkipped])

  // Snooze break
  const snoozeBreak = useCallback((minutes: number) => {
    setSnoozedUntil(Date.now() + minutes * 60 * 1000)
    setRecommendation(null)
  }, [])

  // Dismiss recommendation (without snoozing)
  const dismissRecommendation = useCallback(() => {
    setIsDismissed(true)
    setRecommendation(null)
    // Auto-clear dismiss after 5 minutes
    setTimeout(() => setIsDismissed(false), 5 * 60 * 1000)
  }, [])

  // Reset session
  const resetSession = useCallback(() => {
    setSessionState(createSessionState())
    setRecommendation(null)
    setIsBreakActive(false)
    setCurrentBreakType(null)
    setBreakStartTime(null)
    setSnoozedUntil(null)
    setIsDismissed(false)
  }, [])

  // Computed values
  const timeSinceLastBreak = sessionState.lastBreakTime
    ? Date.now() - sessionState.lastBreakTime
    : Date.now() - sessionState.sessionStartTime

  const shouldShowReminder = !!(
    enabled &&
    recommendation?.shouldBreak &&
    !isBreakActive &&
    !isDismissed &&
    (!snoozedUntil || Date.now() >= snoozedUntil)
  )

  return {
    // State
    sessionState,
    recommendation,
    isBreakActive,
    snoozedUntil,

    // Actions
    startBreak,
    completeBreak,
    skipBreak,
    snoozeBreak,
    dismissRecommendation,
    recordPracticeResponse,
    resetSession,

    // Computed
    timeSinceLastBreak,
    totalBreaksTaken: sessionState.totalBreaksTaken,
    totalBreaksSkipped: sessionState.totalBreaksSkipped,
    shouldShowReminder,
  }
}

export default useMicrobreaks
