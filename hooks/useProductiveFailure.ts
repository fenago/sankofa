/**
 * Productive Failure Hook
 * Manages exploration-first learning sessions with consolidation
 */

import { useState, useCallback, useMemo } from 'react'
import {
  createExplorationSession,
  getScaffoldingLevel,
  recordAttempt,
  detectFrustrationLevel,
  calculateProductiveStruggleScore,
  extractLearningMoments,
  measureConceptualGain,
  generateConsolidationData,
  type ExplorationProblem,
  type ExplorationSession,
  type ExplorationAttempt,
  type AttemptCategory,
  type ConsolidationData,
  type WorkedSolution,
} from '@/lib/practice/productive-failure'

interface UseProductiveFailureOptions {
  onAttemptSubmitted?: (attempt: ExplorationAttempt) => void
  onSessionComplete?: (session: ExplorationSession) => void
  onFrustrationDetected?: (level: number) => void
  onInsightMoment?: (insight: string) => void
}

interface UseProductiveFailureReturn {
  // Session state
  session: ExplorationSession | null
  isExploring: boolean
  isConsolidating: boolean

  // Session management
  startExploration: (problem: ExplorationProblem) => void
  submitAttempt: (
    content: string,
    analysis: {
      category: AttemptCategory
      partialUnderstanding: string[]
      misconceptions: string[]
      creativityScore: number
    },
    durationMs: number
  ) => void
  endExploration: () => void
  resetSession: () => void

  // Scaffolding
  scaffolding: {
    level: 0 | 1 | 2 | 3
    action: 'continue' | 'hint' | 'guided_question' | 'consolidate'
    message?: string
  }
  requestHint: () => void

  // Consolidation
  consolidationData: ConsolidationData | null
  generateConsolidation: (
    correctSolution: WorkedSolution,
    keyInsight: string
  ) => void

  // Metrics
  productiveStruggleScore: number
  frustrationLevel: number
  learningMoments: {
    moment: string
    type: 'discovery' | 'misconception_surfaced' | 'creative_approach' | 'persistence'
    learningValue: number
  }[]

  // Conceptual gain (post-consolidation)
  measureGain: (preUnderstanding: number, postUnderstanding: number) => {
    gain: number
    normalizedGain: number
    attributionToStruggle: number
    interpretation: string
  }
}

export function useProductiveFailure(
  options: UseProductiveFailureOptions = {}
): UseProductiveFailureReturn {
  const {
    onAttemptSubmitted,
    onSessionComplete,
    onFrustrationDetected,
    onInsightMoment,
  } = options

  // State
  const [session, setSession] = useState<ExplorationSession | null>(null)
  const [consolidationData, setConsolidationData] = useState<ConsolidationData | null>(null)
  const [isConsolidating, setIsConsolidating] = useState(false)
  const [hintRequested, setHintRequested] = useState(false)

  // Start exploration
  const startExploration = useCallback((problem: ExplorationProblem) => {
    const newSession = createExplorationSession(problem)
    setSession(newSession)
    setConsolidationData(null)
    setIsConsolidating(false)
    setHintRequested(false)
  }, [])

  // Submit attempt
  const submitAttempt = useCallback((
    content: string,
    analysis: {
      category: AttemptCategory
      partialUnderstanding: string[]
      misconceptions: string[]
      creativityScore: number
    },
    durationMs: number
  ) => {
    if (!session) return

    const updatedSession = recordAttempt(session, content, analysis, durationMs)
    setSession(updatedSession)

    // Create the attempt object for callback
    const attempt: ExplorationAttempt = {
      id: `attempt-${updatedSession.attempts.length}`,
      attemptNumber: updatedSession.attempts.length,
      content,
      timestamp: new Date(),
      durationMs,
      ...analysis,
    }
    onAttemptSubmitted?.(attempt)

    // Check for insight moments
    if (analysis.category === 'partial_correct' || analysis.category === 'creative_wrong') {
      if (analysis.partialUnderstanding.length > 0) {
        onInsightMoment?.(analysis.partialUnderstanding[0])
      }
    }

    // Check frustration
    if (updatedSession.frustrationLevel > 0.6) {
      onFrustrationDetected?.(updatedSession.frustrationLevel)
    }
  }, [session, onAttemptSubmitted, onInsightMoment, onFrustrationDetected])

  // End exploration
  const endExploration = useCallback(() => {
    if (!session) return

    const finalSession = {
      ...session,
      endTime: new Date(),
      readyForConsolidation: true,
    }
    setSession(finalSession)
    setIsConsolidating(true)
    onSessionComplete?.(finalSession)
  }, [session, onSessionComplete])

  // Reset session
  const resetSession = useCallback(() => {
    setSession(null)
    setConsolidationData(null)
    setIsConsolidating(false)
    setHintRequested(false)
  }, [])

  // Get scaffolding level
  const scaffolding = useMemo(() => {
    if (!session) {
      return { level: 0 as const, action: 'continue' as const }
    }

    const baseScaffolding = getScaffoldingLevel(session)

    // Override with hint if requested
    if (hintRequested && baseScaffolding.level === 0) {
      setHintRequested(false)
      return {
        level: 1 as const,
        action: 'hint' as const,
        message: 'What do you already know about this type of problem?',
      }
    }

    return baseScaffolding
  }, [session, hintRequested])

  // Request hint
  const requestHint = useCallback(() => {
    setHintRequested(true)
  }, [])

  // Generate consolidation
  const generateConsolidation = useCallback((
    correctSolution: WorkedSolution,
    keyInsight: string
  ) => {
    if (!session) return

    const data = generateConsolidationData(session, correctSolution, keyInsight)
    setConsolidationData(data)
  }, [session])

  // Extract learning moments
  const learningMoments = useMemo(() => {
    if (!session) return []
    return extractLearningMoments(session)
  }, [session])

  // Measure conceptual gain
  const measureGain = useCallback((
    preUnderstanding: number,
    postUnderstanding: number
  ) => {
    if (!session) {
      return {
        gain: 0,
        normalizedGain: 0,
        attributionToStruggle: 0,
        interpretation: 'No session data',
      }
    }

    return measureConceptualGain(
      preUnderstanding,
      postUnderstanding,
      session.productiveStruggleScore
    )
  }, [session])

  return {
    // Session state
    session,
    isExploring: session !== null && !isConsolidating,
    isConsolidating,

    // Session management
    startExploration,
    submitAttempt,
    endExploration,
    resetSession,

    // Scaffolding
    scaffolding,
    requestHint,

    // Consolidation
    consolidationData,
    generateConsolidation,

    // Metrics
    productiveStruggleScore: session?.productiveStruggleScore ?? 0,
    frustrationLevel: session?.frustrationLevel ?? 0,
    learningMoments,

    // Conceptual gain
    measureGain,
  }
}

export default useProductiveFailure
