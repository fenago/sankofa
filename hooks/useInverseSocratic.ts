'use client'

import { useState, useCallback, useRef } from 'react'
import {
  initializeInverseSocratic,
  generateOpeningPrompt,
  extractTeachingPsychometrics,
  classifyUserRole,
  determineAILearnerRole,
  updateTeachingMetrics,
  updateLearnerUnderstanding,
  generateInverseSocraticSummary,
  type InverseSocraticConfig,
  type InverseSocraticState,
  type InverseExchange,
  type LearnerPersona,
  type TeachingPsychometrics,
} from '@/lib/socratic'

interface UseInverseSocraticOptions {
  notebookId: string
  skillId: string
  skillName: string
  targetConcept: string
  learnerPersona?: LearnerPersona
  maxExchanges?: number
  onComplete?: (summary: InverseSocraticSummary) => void
}

export interface InverseSocraticSummary {
  overallTeachingScore: number
  strengthSummary: string
  improvementSummary: string
  learnerFeedback: string
  psychometricHighlights: {
    category: string
    score: number
    interpretation: string
  }[]
  researchConnection: string
  totalExchanges: number
  learnerUnderstanding: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  teachingRole?: string
  learnerRole?: string
  psychometrics?: TeachingPsychometrics
}

export function useInverseSocratic({
  notebookId,
  skillId,
  skillName,
  targetConcept,
  learnerPersona = 'curious_beginner',
  maxExchanges = 8,
  onComplete,
}: UseInverseSocraticOptions) {
  const [state, setState] = useState<InverseSocraticState | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<InverseSocraticSummary | null>(null)

  const lastAIRole = useRef<'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking' | null>(null)

  // Start the inverse socratic dialogue
  const startDialogue = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const config: InverseSocraticConfig = {
        skillId,
        skillName,
        targetConcept,
        learnerPersona,
        difficultyLevel: 0.5,
        maxExchanges,
      }

      // Initialize state
      const initialState = initializeInverseSocratic(config)
      setState(initialState)

      // Generate opening prompt from AI learner
      const openingPrompt = generateOpeningPrompt(config)

      // Add opening message
      const openingMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: openingPrompt,
        timestamp: new Date().toISOString(),
        learnerRole: 'asking',
      }

      setMessages([openingMessage])
      lastAIRole.current = 'asking'
      setIsStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start dialogue')
    } finally {
      setIsLoading(false)
    }
  }, [skillId, skillName, targetConcept, learnerPersona, maxExchanges])

  // Send a teaching message
  const sendMessage = useCallback(async (content: string) => {
    if (!state || isLoading || isComplete) return

    setIsLoading(true)
    setError(null)

    try {
      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }

      // Extract teaching psychometrics
      const psychometrics = extractTeachingPsychometrics(
        content,
        state.exchanges,
        lastAIRole.current
      )

      // Classify user's role
      const userRole = classifyUserRole(content, lastAIRole.current)
      userMessage.teachingRole = userRole
      userMessage.psychometrics = psychometrics

      setMessages(prev => [...prev, userMessage])

      // Update state metrics
      const updatedMetrics = updateTeachingMetrics(
        state.teachingMetrics,
        psychometrics,
        state.exchanges.length
      )

      const updatedUnderstanding = updateLearnerUnderstanding(
        state.currentLearnerUnderstanding,
        psychometrics
      )

      // Create exchange record
      const exchange: InverseExchange = {
        exchangeNumber: state.exchanges.length + 1,
        userMessage: content,
        userRole,
        extractedPsychometrics: psychometrics,
        aiLearnerResponse: '', // Will be filled after API call
        aiLearnerRole: 'asking', // Will be determined
        timestamp: new Date().toISOString(),
      }

      // Determine AI learner's response type
      const aiRole = determineAILearnerRole(
        { ...state, teachingMetrics: updatedMetrics, currentLearnerUnderstanding: updatedUnderstanding },
        psychometrics
      )

      // Call API for AI learner response
      const response = await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inverse_socratic_exchange',
          dialogueId: state.dialogueId,
          skillId,
          skillName,
          targetConcept,
          userMessage: content,
          learnerPersona,
          currentUnderstanding: updatedUnderstanding,
          aiRole,
          exchangeNumber: state.exchanges.length + 1,
          psychometrics,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get learner response')
      }

      const data = await response.json()
      const aiResponse = data.response || generateFallbackResponse(aiRole, updatedUnderstanding)

      // Update exchange with AI response
      exchange.aiLearnerResponse = aiResponse
      exchange.aiLearnerRole = aiRole

      // Add AI message
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        learnerRole: aiRole,
      }

      setMessages(prev => [...prev, assistantMessage])
      lastAIRole.current = aiRole

      // Update state
      const newState: InverseSocraticState = {
        ...state,
        exchanges: [...state.exchanges, exchange],
        teachingMetrics: updatedMetrics,
        currentLearnerUnderstanding: updatedUnderstanding,
        learnerSatisfaction: Math.min(1, state.learnerSatisfaction + psychometrics.explanationClarity * 0.1),
      }

      setState(newState)

      // Check if dialogue should end
      if (newState.exchanges.length >= maxExchanges || aiRole === 'thanking') {
        await completeDialogue(newState)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process message')
    } finally {
      setIsLoading(false)
    }
  }, [state, isLoading, isComplete, notebookId, skillId, skillName, targetConcept, learnerPersona, maxExchanges])

  // Complete the dialogue and generate summary
  const completeDialogue = useCallback(async (finalState: InverseSocraticState) => {
    const dialogueSummary = generateInverseSocraticSummary(finalState)

    const fullSummary: InverseSocraticSummary = {
      ...dialogueSummary,
      totalExchanges: finalState.exchanges.length,
      learnerUnderstanding: finalState.currentLearnerUnderstanding,
    }

    setSummary(fullSummary)
    setIsComplete(true)

    // Update state
    setState(prev => prev ? { ...prev, status: 'completed' } : null)

    // Notify callback
    if (onComplete) {
      onComplete(fullSummary)
    }

    // Send completion to API for profile updates
    try {
      await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inverse_socratic_complete',
          dialogueId: finalState.dialogueId,
          skillId,
          summary: fullSummary,
          teachingMetrics: finalState.teachingMetrics,
          exchanges: finalState.exchanges.length,
        }),
      })
    } catch (err) {
      console.error('Failed to save dialogue completion:', err)
    }
  }, [notebookId, skillId, onComplete])

  // End dialogue early
  const endDialogue = useCallback(() => {
    if (state) {
      completeDialogue({ ...state, status: 'ended_early' })
    }
  }, [state, completeDialogue])

  // Reset for new dialogue
  const reset = useCallback(() => {
    setState(null)
    setMessages([])
    setIsStarted(false)
    setIsComplete(false)
    setSummary(null)
    setError(null)
    lastAIRole.current = null
  }, [])

  return {
    // State
    state,
    messages,
    isLoading,
    isStarted,
    isComplete,
    error,
    summary,

    // Metrics
    currentUnderstanding: state?.currentLearnerUnderstanding ?? 0,
    teachingMetrics: state?.teachingMetrics ?? null,
    exchangeCount: state?.exchanges.length ?? 0,
    maxExchanges,

    // Actions
    startDialogue,
    sendMessage,
    endDialogue,
    reset,
  }
}

// Fallback responses if API fails
function generateFallbackResponse(
  role: 'asking' | 'confirming' | 'confused' | 'connecting' | 'thanking',
  understanding: number
): string {
  const responses: Record<string, string[]> = {
    asking: [
      "That's interesting! Can you explain a bit more?",
      "I see... but why does that happen?",
      "Can you give me an example?",
    ],
    confirming: [
      "Oh, I think I'm starting to understand!",
      "So if I got this right...",
      "That makes sense!",
    ],
    confused: [
      "Hmm, I'm a bit confused. Could you explain it differently?",
      "I'm not sure I follow. Can you break it down?",
      "Wait, can you clarify that part?",
    ],
    connecting: [
      "Oh, is that similar to something else?",
      "So this relates to...?",
      "Does that mean...?",
    ],
    thanking: [
      "Thank you so much for explaining that! I learned a lot!",
      "That was really helpful! I feel like I understand it now!",
      "Great explanation! Thanks for being patient with me!",
    ],
  }

  const options = responses[role] || responses.asking
  return options[Math.floor(Math.random() * options.length)]
}

export default useInverseSocratic
