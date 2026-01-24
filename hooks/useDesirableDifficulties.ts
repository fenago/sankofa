/**
 * Desirable Difficulties Hook
 * Integrates interleaving, spacing, retrieval, and variation into practice
 */

import { useState, useCallback, useMemo } from 'react'
import {
  generateInterleavedSession,
  calculateOptimalMixRatio,
  trackInterleavingEffectiveness,
  selectVariationType,
  generateVariationPrompt,
  shouldUseRetrieval,
  measureRetrievalStrength,
  type Skill,
  type InterleavedSession,
  type VariationType,
} from '@/lib/practice/desirable-difficulties'

interface UseDesirableDifficultiesOptions {
  enabled?: boolean
  skills: Skill[]
  questionsPerSkill?: number
  totalQuestions?: number
  learnerProfile?: {
    preferenceForChallenge: number
    attentionSpan: number
  }
}

interface DifficultySetting {
  interleaving: boolean
  spacing: boolean  // Typically handled by SM-2 separately
  retrieval: boolean
  variation: boolean
}

interface UseDesirableDifficultiesReturn {
  // Settings
  settings: DifficultySetting
  toggleSetting: (setting: keyof DifficultySetting) => void
  setSettings: (settings: Partial<DifficultySetting>) => void

  // Interleaving
  interleavedSession: InterleavedSession | null
  generateSession: () => void
  getCurrentSkillId: () => string | null
  advanceQuestion: () => void
  currentQuestionIndex: number
  skillMixRatio: Record<string, number>
  estimatedRetentionBoost: number

  // Variation
  currentVariationType: VariationType | null
  getVariationPrompt: (originalQuestion: string, skillContext: string) => string
  recordVariationUsed: (type: VariationType) => void

  // Retrieval
  shouldUseRetrievalPractice: (
    skillId: string,
    currentMastery: number,
    lastRetrievalTest: Date | null,
    attemptCount: number
  ) => { useRetrieval: boolean; reason: string }
  recordRetrievalAttempt: (
    skillId: string,
    responseTimeMs: number,
    isCorrect: boolean,
    confidenceRating: number,
    hintsUsed: number
  ) => number

  // Tracking
  trackingData: {
    variationsUsed: VariationType[]
    retrievalStrengths: Record<string, number[]>
    interleaveSwitches: number
    preInterleavingAccuracy: number | null
    postInterleavingAccuracy: number | null
  }
  setPreInterleavingAccuracy: (accuracy: number) => void
  setPostInterleavingAccuracy: (accuracy: number) => void
  getEffectivenessReport: (delayDays: number) => {
    effectSize: number
    isEffective: boolean
    recommendation: string
  } | null

  // Active difficulties for indicator
  activeDifficulties: (keyof DifficultySetting)[]
  difficultyStrengths: {
    interleaving: number
    spacing: number
    retrieval: number
    variation: number
  }
}

export function useDesirableDifficulties(
  options: UseDesirableDifficultiesOptions
): UseDesirableDifficultiesReturn {
  const {
    enabled = true,
    skills,
    questionsPerSkill = 3,
    totalQuestions,
    learnerProfile = { preferenceForChallenge: 0.5, attentionSpan: 0.5 },
  } = options

  // Settings state
  const [settings, setSettingsState] = useState<DifficultySetting>({
    interleaving: enabled && skills.length >= 2,
    spacing: true, // SM-2 handles this
    retrieval: true,
    variation: true,
  })

  // Interleaving state
  const [interleavedSession, setInterleavedSession] = useState<InterleavedSession | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Variation state
  const [variationsUsed, setVariationsUsed] = useState<VariationType[]>([])
  const [currentVariationType, setCurrentVariationType] = useState<VariationType | null>(null)

  // Retrieval state
  const [retrievalStrengths, setRetrievalStrengths] = useState<Record<string, number[]>>({})

  // Tracking state
  const [preInterleavingAccuracy, setPreInterleavingAccuracy] = useState<number | null>(null)
  const [postInterleavingAccuracy, setPostInterleavingAccuracy] = useState<number | null>(null)

  // Toggle individual setting
  const toggleSetting = useCallback((setting: keyof DifficultySetting) => {
    setSettingsState(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }, [])

  // Set multiple settings
  const setSettings = useCallback((newSettings: Partial<DifficultySetting>) => {
    setSettingsState(prev => ({
      ...prev,
      ...newSettings,
    }))
  }, [])

  // Generate interleaved session
  const generateSession = useCallback(() => {
    if (!settings.interleaving || skills.length < 2) {
      setInterleavedSession(null)
      return
    }

    const session = generateInterleavedSession(skills, questionsPerSkill, totalQuestions)
    setInterleavedSession(session)
    setCurrentQuestionIndex(0)
  }, [settings.interleaving, skills, questionsPerSkill, totalQuestions])

  // Get current skill ID from interleaved session
  const getCurrentSkillId = useCallback(() => {
    if (!interleavedSession || currentQuestionIndex >= interleavedSession.questions.length) {
      return null
    }
    return interleavedSession.questions[currentQuestionIndex].skillId
  }, [interleavedSession, currentQuestionIndex])

  // Advance to next question
  const advanceQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => prev + 1)
  }, [])

  // Calculate optimal mix ratio
  const skillMixRatio = useMemo(() => {
    if (!settings.interleaving || skills.length < 2) {
      return {}
    }
    return calculateOptimalMixRatio(skills, learnerProfile)
  }, [settings.interleaving, skills, learnerProfile])

  // Estimated retention boost
  const estimatedRetentionBoost = useMemo(() => {
    return interleavedSession?.estimatedRetentionBoost ?? 0
  }, [interleavedSession])

  // Get variation prompt for a question
  const getVariationPrompt = useCallback((originalQuestion: string, skillContext: string) => {
    if (!settings.variation) {
      return originalQuestion
    }

    const skill = skills.find(s => s.name === skillContext) || skills[0]
    if (!skill) return originalQuestion

    const variationType = selectVariationType(skill, variationsUsed)
    setCurrentVariationType(variationType)

    return generateVariationPrompt(originalQuestion, variationType, skillContext)
  }, [settings.variation, skills, variationsUsed])

  // Record variation used
  const recordVariationUsed = useCallback((type: VariationType) => {
    setVariationsUsed(prev => [...prev, type])
    setCurrentVariationType(type)
  }, [])

  // Check if retrieval practice should be used
  const shouldUseRetrievalPractice = useCallback((
    skillId: string,
    currentMastery: number,
    lastRetrievalTest: Date | null,
    attemptCount: number
  ) => {
    if (!settings.retrieval) {
      return { useRetrieval: false, reason: 'Retrieval practice disabled' }
    }
    return shouldUseRetrieval(currentMastery, lastRetrievalTest, attemptCount)
  }, [settings.retrieval])

  // Record retrieval attempt
  const recordRetrievalAttempt = useCallback((
    skillId: string,
    responseTimeMs: number,
    isCorrect: boolean,
    confidenceRating: number,
    hintsUsed: number
  ) => {
    const strength = measureRetrievalStrength(
      responseTimeMs,
      isCorrect,
      confidenceRating,
      hintsUsed
    )

    setRetrievalStrengths(prev => ({
      ...prev,
      [skillId]: [...(prev[skillId] || []), strength],
    }))

    return strength
  }, [])

  // Get effectiveness report
  const getEffectivenessReport = useCallback((delayDays: number) => {
    if (preInterleavingAccuracy === null || postInterleavingAccuracy === null) {
      return null
    }
    return trackInterleavingEffectiveness(
      preInterleavingAccuracy,
      postInterleavingAccuracy,
      delayDays
    )
  }, [preInterleavingAccuracy, postInterleavingAccuracy])

  // Count interleave switches
  const interleaveSwitches = useMemo(() => {
    if (!interleavedSession) return 0
    return interleavedSession.questions.filter(q => q.isSwitchPoint).length
  }, [interleavedSession])

  // Active difficulties for indicator
  const activeDifficulties = useMemo(() => {
    const active: (keyof DifficultySetting)[] = []
    if (settings.interleaving && skills.length >= 2) active.push('interleaving')
    if (settings.spacing) active.push('spacing')
    if (settings.retrieval) active.push('retrieval')
    if (settings.variation) active.push('variation')
    return active
  }, [settings, skills.length])

  // Calculate difficulty strengths
  const difficultyStrengths = useMemo(() => {
    // Interleaving strength based on session config
    const interleavingStrength = settings.interleaving && interleavedSession
      ? interleavedSession.estimatedRetentionBoost / 0.3 // Normalize to 0-1
      : 0

    // Spacing strength (assume SM-2 is working)
    const spacingStrength = settings.spacing ? 0.7 : 0

    // Retrieval strength based on recent attempts
    const allStrengths = Object.values(retrievalStrengths).flat()
    const retrievalStrength = allStrengths.length > 0
      ? allStrengths.reduce((sum, s) => sum + s, 0) / allStrengths.length
      : settings.retrieval ? 0.5 : 0

    // Variation strength based on variety of types used
    const uniqueVariations = new Set(variationsUsed).size
    const variationStrength = settings.variation
      ? Math.min(uniqueVariations / 4, 1) // 4 types = max strength
      : 0

    return {
      interleaving: Math.min(interleavingStrength, 1),
      spacing: spacingStrength,
      retrieval: retrievalStrength,
      variation: variationStrength,
    }
  }, [settings, interleavedSession, retrievalStrengths, variationsUsed])

  return {
    // Settings
    settings,
    toggleSetting,
    setSettings,

    // Interleaving
    interleavedSession,
    generateSession,
    getCurrentSkillId,
    advanceQuestion,
    currentQuestionIndex,
    skillMixRatio,
    estimatedRetentionBoost,

    // Variation
    currentVariationType,
    getVariationPrompt,
    recordVariationUsed,

    // Retrieval
    shouldUseRetrievalPractice,
    recordRetrievalAttempt,

    // Tracking
    trackingData: {
      variationsUsed,
      retrievalStrengths,
      interleaveSwitches,
      preInterleavingAccuracy,
      postInterleavingAccuracy,
    },
    setPreInterleavingAccuracy,
    setPostInterleavingAccuracy,
    getEffectivenessReport,

    // Active difficulties
    activeDifficulties,
    difficultyStrengths,
  }
}

export default useDesirableDifficulties
