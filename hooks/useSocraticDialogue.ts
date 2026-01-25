/**
 * Socratic Dialogue Hook
 *
 * Manages AI-powered Socratic dialogues with full psychometric extraction.
 * Connects to the tutor API endpoints for start_socratic, exchange, and end_socratic actions.
 */

import { useState, useCallback, useRef } from 'react'
import type { DialogueState, QuestionType } from '@/lib/tutoring/socratic-tutor'
import type { SocraticIntervention } from '@/lib/socratic/adaptive-generator'

// Types matching API responses
export interface DialogueSummary {
  totalExchanges: number
  discoveryMade: boolean
  finalUnderstanding: string
  effectivenessScore: number
  keyInsights: string[]
  misconceptions: string[]
  avgEngagement: string
  avgConfidence: string
  duration: string
}

export interface ExchangeExtraction {
  understanding: {
    understandingLevel: 'none' | 'surface' | 'partial' | 'deep' | 'transfer'
    explanationQuality: number
    elaborationDepth: number
    abstractionLevel: number
  }
  confidence: {
    hedgingRate: number
    certaintyRate: number
    isOverconfident: boolean
    isUnderconfident: boolean
  }
  engagement: {
    engagementLevel: 'high' | 'medium' | 'low'
    persistenceIndicator: boolean
  }
}

export interface ProfileUpdates {
  masteryAdjustment: number
  newMisconceptions: string[]
}

interface UseSocraticDialogueOptions {
  notebookId: string
  onDiscovery?: (description: string) => void
  onInterventionNeeded?: (intervention: SocraticIntervention) => void
  onDialogueComplete?: (summary: DialogueSummary, profileUpdates: ProfileUpdates) => void
}

interface UseSocraticDialogueReturn {
  // State
  isActive: boolean
  isLoading: boolean
  dialogueId: string | null
  dialogueState: DialogueState | null
  currentQuestion: string | null
  questionType: QuestionType | null
  error: string | null

  // Actions
  startDialogue: (
    skillId: string,
    skillName: string,
    targetConcept: string,
    misconceptions: string[]
  ) => Promise<void>
  sendResponse: (response: string) => Promise<void>
  endDialogue: () => Promise<DialogueSummary | null>
  resetDialogue: () => void

  // Discovery
  discoveryMade: boolean
  discoveryDescription: string | null

  // Metrics
  exchangeCount: number
  lastExtraction: ExchangeExtraction | null
  currentIntervention: SocraticIntervention | null
  summary: DialogueSummary | null
}

export function useSocraticDialogue(
  options: UseSocraticDialogueOptions
): UseSocraticDialogueReturn {
  const { notebookId, onDiscovery, onInterventionNeeded, onDialogueComplete } = options

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [dialogueId, setDialogueId] = useState<string | null>(null)
  const [dialogueState, setDialogueState] = useState<DialogueState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastExtraction, setLastExtraction] = useState<ExchangeExtraction | null>(null)
  const [currentIntervention, setCurrentIntervention] = useState<SocraticIntervention | null>(null)
  const [summary, setSummary] = useState<DialogueSummary | null>(null)

  // Track response timing
  const responseStartTime = useRef<number>(Date.now())

  // Start a new dialogue
  const startDialogue = useCallback(async (
    skillId: string,
    skillName: string,
    targetConcept: string,
    misconceptions: string[]
  ) => {
    setIsLoading(true)
    setError(null)
    setSummary(null)

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_socratic',
          skillId,
          skillName,
          targetConcept,
          misconceptions,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start dialogue')
      }

      const data = await response.json()

      setDialogueId(data.dialogueId)
      setDialogueState(data.dialogueState)
      setCurrentQuestion(data.openingQuestion)
      setQuestionType(data.questionType)
      responseStartTime.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [notebookId])

  // Send a response
  const sendResponse = useCallback(async (response: string) => {
    if (!dialogueId) {
      setError('No active dialogue')
      return
    }

    setIsLoading(true)
    setError(null)

    const responseLatencyMs = Date.now() - responseStartTime.current

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exchange',
          dialogueId,
          learnerResponse: response,
          responseLatencyMs,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to process response')
      }

      const data = await res.json()

      setDialogueState(data.dialogueState)
      setLastExtraction(data.extraction)
      setCurrentIntervention(data.intervention)

      // Handle discovery
      if (data.isDiscovery && data.dialogueState?.discoveryDescription) {
        onDiscovery?.(data.dialogueState.discoveryDescription)
      }

      // Handle intervention
      if (data.intervention?.type !== 'none') {
        onInterventionNeeded?.(data.intervention)
      }

      // Check if dialogue is complete
      if (data.isDialogueComplete) {
        setCurrentQuestion(null)
        setQuestionType(null)
        // Automatically end and get summary
        await endDialogueInternal()
      } else {
        setCurrentQuestion(data.nextQuestion)
        setQuestionType(data.questionType)
        responseStartTime.current = Date.now()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [dialogueId, notebookId, onDiscovery, onInterventionNeeded])

  // Internal end dialogue (for auto-complete)
  const endDialogueInternal = useCallback(async () => {
    if (!dialogueId) return null

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_socratic',
          dialogueId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to end dialogue')
      }

      const data = await res.json()

      setSummary(data.summary)

      // Notify callback
      onDialogueComplete?.(data.summary, {
        masteryAdjustment: data.masteryAdjustment,
        newMisconceptions: data.newMisconceptions,
      })

      return data.summary
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [dialogueId, notebookId, onDialogueComplete])

  // End dialogue (user-triggered)
  const endDialogue = useCallback(async () => {
    if (!dialogueId) {
      setError('No active dialogue')
      return null
    }

    setIsLoading(true)
    const result = await endDialogueInternal()
    setIsLoading(false)

    setCurrentQuestion(null)
    setQuestionType(null)

    return result
  }, [dialogueId, endDialogueInternal])

  // Reset dialogue
  const resetDialogue = useCallback(() => {
    setDialogueId(null)
    setDialogueState(null)
    setCurrentQuestion(null)
    setQuestionType(null)
    setError(null)
    setLastExtraction(null)
    setCurrentIntervention(null)
    setSummary(null)
  }, [])

  return {
    // State
    isActive: dialogueId !== null && currentQuestion !== null,
    isLoading,
    dialogueId,
    dialogueState,
    currentQuestion,
    questionType,
    error,

    // Actions
    startDialogue,
    sendResponse,
    endDialogue,
    resetDialogue,

    // Discovery
    discoveryMade: dialogueState?.discoveryMade ?? false,
    discoveryDescription: dialogueState?.discoveryDescription ?? null,

    // Metrics
    exchangeCount: dialogueState?.exchanges.length ?? 0,
    lastExtraction,
    currentIntervention,
    summary,
  }
}

export default useSocraticDialogue
