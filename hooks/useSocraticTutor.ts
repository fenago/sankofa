/**
 * Socratic Tutor Hook
 * Manages AI-powered Socratic tutoring dialogues
 */

import { useState, useCallback, useMemo } from 'react'
import {
  createDialogueState,
  recordExchange,
  getNextQuestionType,
  generateGuidingQuestion,
  detectDiscoveryMoment,
  calculateDialogueEffectiveness,
  generateCelebration,
  type DialogueState,
  type SocraticExchange,
  type QuestionType,
  type UnderstandingLevel,
} from '@/lib/tutoring/socratic-tutor'

interface UseSocraticTutorOptions {
  onDiscovery?: (description: string) => void
  onDialogueComplete?: (state: DialogueState) => void
  onExchangeComplete?: (exchange: SocraticExchange) => void
}

interface AnalysisResult {
  understandingLevel: UnderstandingLevel
  isDiscovery: boolean
  discoveryDescription?: string
  nextQuestionType?: QuestionType
}

interface UseSocraticTutorReturn {
  // State
  dialogueState: DialogueState | null
  isActive: boolean
  currentQuestion: string | null
  currentQuestionType: QuestionType | null

  // Actions
  startDialogue: (
    skillId: string,
    skillName: string,
    targetConcept: string,
    misconceptions: string[]
  ) => void
  processResponse: (
    response: string,
    analysis: AnalysisResult
  ) => void
  addTutorQuestion: (question: string, questionType: QuestionType) => void
  endDialogue: () => void
  resetDialogue: () => void

  // Discovery
  discoveryMade: boolean
  discoveryDescription?: string
  celebrationMessage: string | null

  // Metrics
  effectiveness: {
    score: number
    selfDiscoveryRate: number
    exchangeEfficiency: number
    misconceptionAddressed: boolean
    interpretation: string
  } | null
  exchangeCount: number

  // Helpers
  suggestNextQuestion: () => { type: QuestionType; question: string } | null
}

export function useSocraticTutor(
  options: UseSocraticTutorOptions = {}
): UseSocraticTutorReturn {
  const { onDiscovery, onDialogueComplete, onExchangeComplete } = options

  // State
  const [dialogueState, setDialogueState] = useState<DialogueState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType | null>(null)
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null)

  // Start a new dialogue
  const startDialogue = useCallback((
    skillId: string,
    skillName: string,
    targetConcept: string,
    misconceptions: string[]
  ) => {
    const state = createDialogueState(skillId, skillName, targetConcept, misconceptions)
    setDialogueState(state)
    setCelebrationMessage(null)

    // Generate first question
    const firstType = getNextQuestionType(state)
    if (firstType) {
      const question = generateGuidingQuestion(state, firstType)
      setCurrentQuestion(question)
      setCurrentQuestionType(firstType)
    }
  }, [])

  // Process student response
  const processResponse = useCallback((
    response: string,
    analysis: AnalysisResult
  ) => {
    if (!dialogueState || !currentQuestion || !currentQuestionType) return

    // Record the exchange
    const updatedState = recordExchange(
      dialogueState,
      currentQuestion,
      currentQuestionType,
      response,
      analysis
    )
    setDialogueState(updatedState)

    // Create exchange for callback
    const exchange: SocraticExchange = {
      id: `exchange-${updatedState.exchanges.length}`,
      skillId: dialogueState.skillId,
      questionType: currentQuestionType,
      tutorQuestion: currentQuestion,
      studentResponse: response,
      detectedUnderstanding: analysis.understandingLevel,
      ledToDiscovery: analysis.isDiscovery,
      timestamp: new Date(),
    }
    onExchangeComplete?.(exchange)

    // Handle discovery
    if (analysis.isDiscovery) {
      const celebration = generateCelebration(analysis.discoveryDescription)
      setCelebrationMessage(celebration)
      onDiscovery?.(analysis.discoveryDescription || 'Key insight discovered!')
    }

    // Get next question
    const nextType = getNextQuestionType(updatedState)
    if (nextType) {
      const nextQuestion = generateGuidingQuestion(updatedState, nextType)
      setCurrentQuestion(nextQuestion)
      setCurrentQuestionType(nextType)
    } else {
      // Dialogue complete
      setCurrentQuestion(null)
      setCurrentQuestionType(null)
      onDialogueComplete?.(updatedState)
    }
  }, [dialogueState, currentQuestion, currentQuestionType, onExchangeComplete, onDiscovery, onDialogueComplete])

  // Add tutor question (for AI-generated questions)
  const addTutorQuestion = useCallback((question: string, questionType: QuestionType) => {
    setCurrentQuestion(question)
    setCurrentQuestionType(questionType)
  }, [])

  // End dialogue early
  const endDialogue = useCallback(() => {
    if (dialogueState) {
      onDialogueComplete?.(dialogueState)
    }
    setCurrentQuestion(null)
    setCurrentQuestionType(null)
  }, [dialogueState, onDialogueComplete])

  // Reset everything
  const resetDialogue = useCallback(() => {
    setDialogueState(null)
    setCurrentQuestion(null)
    setCurrentQuestionType(null)
    setCelebrationMessage(null)
  }, [])

  // Suggest next question
  const suggestNextQuestion = useCallback(() => {
    if (!dialogueState) return null

    const nextType = getNextQuestionType(dialogueState)
    if (!nextType) return null

    const question = generateGuidingQuestion(dialogueState, nextType)
    return { type: nextType, question }
  }, [dialogueState])

  // Calculate effectiveness
  const effectiveness = useMemo(() => {
    if (!dialogueState || dialogueState.exchanges.length === 0) return null
    return calculateDialogueEffectiveness(dialogueState)
  }, [dialogueState])

  return {
    // State
    dialogueState,
    isActive: dialogueState !== null && currentQuestion !== null,
    currentQuestion,
    currentQuestionType,

    // Actions
    startDialogue,
    processResponse,
    addTutorQuestion,
    endDialogue,
    resetDialogue,

    // Discovery
    discoveryMade: dialogueState?.discoveryMade ?? false,
    discoveryDescription: dialogueState?.discoveryDescription,
    celebrationMessage,

    // Metrics
    effectiveness,
    exchangeCount: dialogueState?.exchanges.length ?? 0,

    // Helpers
    suggestNextQuestion,
  }
}

export default useSocraticTutor
