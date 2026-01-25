'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  initializeFreeformDialogue,
  generateWelcomeMessage,
  classifyUserIntent,
  extractConversationalPsychometrics,
  determineAIResponseType,
  generateStrategicElement,
  updateConversationMetrics,
  generateFreeformSummary,
  type FreeformConfig,
  type FreeformState,
  type FreeformExchange,
  type LearnerProfile,
  type ConversationalPsychometrics,
  type FreeformDialogueSummary,
} from '@/lib/socratic'

interface UseFreeformTutorOptions {
  notebookId: string
  skillId: string
  skillName: string
  skillDescription?: string
  targetConcepts?: string[]
  maxExchanges?: number
  initialProfile?: Partial<LearnerProfile>
  onComplete?: (summary: FreeformDialogueSummary) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  userIntent?: string
  responseType?: string
  psychometrics?: ConversationalPsychometrics
  strategicElement?: {
    type: string
    content: string
  }
}

export function useFreeformTutor({
  notebookId,
  skillId,
  skillName,
  skillDescription = '',
  targetConcepts = [],
  maxExchanges = 15,
  initialProfile,
  onComplete,
}: UseFreeformTutorOptions) {
  const [state, setState] = useState<FreeformState | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<FreeformDialogueSummary | null>(null)

  const messageStartTime = useRef<number>(0)

  // Start the freeform dialogue
  const startDialogue = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const config: FreeformConfig = {
        skillId,
        skillName,
        skillDescription,
        targetConcepts: targetConcepts.length > 0 ? targetConcepts : [skillName],
        maxExchanges,
      }

      // Initialize state with optional initial profile
      const initialState = initializeFreeformDialogue(config, initialProfile)
      setState(initialState)

      // Generate welcome message adapted to profile
      const welcomeMessage = generateWelcomeMessage(config, initialState.learnerProfile)

      // Add welcome message
      const welcomeMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      }

      setMessages([welcomeMsg])
      setIsStarted(true)
      messageStartTime.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start dialogue')
    } finally {
      setIsLoading(false)
    }
  }, [skillId, skillName, skillDescription, targetConcepts, maxExchanges, initialProfile])

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!state || isLoading || isComplete) return

    setIsLoading(true)
    setError(null)

    // Calculate response latency
    const latencyMs = Date.now() - messageStartTime.current

    try {
      // Classify user intent
      const userIntent = classifyUserIntent(content)

      // Extract psychometrics
      const psychometrics = extractConversationalPsychometrics(
        content,
        state.exchanges,
        state.config
      )

      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        userIntent,
        psychometrics,
      }

      setMessages(prev => [...prev, userMessage])

      // Determine AI response type
      const responseType = determineAIResponseType(
        userIntent,
        psychometrics,
        state.learnerProfile,
        state.exchanges.length
      )

      // Generate strategic element if appropriate
      const strategicElement = generateStrategicElement(
        state,
        psychometrics,
        responseType
      )

      // Update metrics
      const hadInsight = psychometrics.insightMoments.length > 0
      const updatedMetrics = updateConversationMetrics(
        state.conversationMetrics,
        psychometrics,
        hadInsight
      )

      // Call API for AI response
      const response = await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'freeform_exchange',
          dialogueId: state.dialogueId,
          skillId,
          skillName,
          targetConcepts: state.config.targetConcepts,
          userMessage: content,
          userIntent,
          responseType,
          psychometrics,
          learnerProfile: state.learnerProfile,
          previousExchanges: state.exchanges.slice(-3),
          exchangeNumber: state.exchanges.length + 1,
          strategicElement,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get tutor response')
      }

      const data = await response.json()
      const aiResponse = data.response || generateFallbackResponse(responseType, userIntent)

      // Create exchange record
      const exchange: FreeformExchange = {
        exchangeNumber: state.exchanges.length + 1,
        userMessage: content,
        userIntent,
        extractedPsychometrics: psychometrics,
        aiResponse,
        aiResponseType: responseType,
        strategicElement,
        timestamp: new Date().toISOString(),
      }

      // Add AI message
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        responseType,
        strategicElement: strategicElement ? {
          type: strategicElement.type,
          content: strategicElement.content,
        } : undefined,
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update tracked topics and insights
      const updatedTopicsCovered = [...state.topicsCovered]
      if (psychometrics.questionRelevance > 0.5 && !updatedTopicsCovered.includes(userIntent)) {
        updatedTopicsCovered.push(userIntent)
      }

      const updatedInsights = [...state.insightsGained]
      if (psychometrics.insightMoments.length > 0) {
        updatedInsights.push(...psychometrics.insightMoments)
      }

      const updatedQuestions = [...state.questionsAsked]
      if (userIntent === 'asking_question' || userIntent === 'clarifying') {
        updatedQuestions.push(content)
      }

      // Update state
      const newState: FreeformState = {
        ...state,
        exchanges: [...state.exchanges, exchange],
        conversationMetrics: updatedMetrics,
        topicsCovered: updatedTopicsCovered,
        questionsAsked: updatedQuestions,
        insightsGained: updatedInsights,
      }

      setState(newState)

      // Reset timer for next message
      messageStartTime.current = Date.now()

      // Check if dialogue should end
      if (newState.exchanges.length >= maxExchanges) {
        await completeDialogue(newState)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process message')
    } finally {
      setIsLoading(false)
    }
  }, [state, isLoading, isComplete, notebookId, skillId, skillName, maxExchanges])

  // Complete the dialogue and generate summary
  const completeDialogue = useCallback(async (finalState: FreeformState) => {
    const dialogueSummary = generateFreeformSummary(finalState)

    setSummary(dialogueSummary)
    setIsComplete(true)

    // Update state
    setState(prev => prev ? { ...prev, status: 'completed' } : null)

    // Notify callback
    if (onComplete) {
      onComplete(dialogueSummary)
    }

    // Send completion to API for profile updates
    try {
      await fetch(`/api/notebooks/${notebookId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'freeform_complete',
          dialogueId: finalState.dialogueId,
          skillId,
          summary: dialogueSummary,
          conversationMetrics: finalState.conversationMetrics,
          exchanges: finalState.exchanges.length,
          profileUpdates: dialogueSummary.learnerProfileUpdates,
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
    messageStartTime.current = 0
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
    conversationMetrics: state?.conversationMetrics ?? null,
    learnerProfile: state?.learnerProfile ?? null,
    exchangeCount: state?.exchanges.length ?? 0,
    maxExchanges,
    topicsCovered: state?.topicsCovered ?? [],
    insightsGained: state?.insightsGained ?? [],

    // Actions
    startDialogue,
    sendMessage,
    endDialogue,
    reset,
  }
}

// Fallback responses if API fails
function generateFallbackResponse(
  responseType: string,
  userIntent: string
): string {
  const fallbacks: Record<string, string[]> = {
    direct_answer: [
      "That's a good question. Let me explain...",
      "Here's what you need to know about that...",
    ],
    guided_answer: [
      "Great question! What do you think might be the answer?",
      "Let's think through this together. What do you already know about this?",
    ],
    scaffolded_explanation: [
      "Let me break this down step by step...",
      "Let's start with the basics and work our way up...",
    ],
    example_based: [
      "Here's an example that might help...",
      "Let me give you a concrete example...",
    ],
    clarifying_question: [
      "Could you tell me more about what specifically you'd like to understand?",
      "What part of this are you most curious about?",
    ],
    encouragement: [
      "You're making good progress! Keep exploring.",
      "That's a great observation!",
    ],
    connection_making: [
      "This connects nicely to what we discussed earlier...",
      "You can think of this in relation to...",
    ],
    summary: [
      "Let me summarize what we've covered...",
      "Here are the key points so far...",
    ],
  }

  // Default based on user intent if response type not found
  if (!fallbacks[responseType]) {
    if (userIntent === 'expressing_confusion') {
      return "I can see you're finding this challenging. Let me try explaining it differently..."
    }
    return "That's an interesting point. Let me help you explore that further."
  }

  const options = fallbacks[responseType]
  return options[Math.floor(Math.random() * options.length)]
}

export default useFreeformTutor
