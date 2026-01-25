/**
 * Profile Updater for Socratic Mode
 *
 * Updates both the InverseProfile and SocraticProfile based on
 * dialogue results and aggregated psychometrics.
 *
 * Uses Exponential Moving Average (EMA) for smooth updates:
 * new_value = α * observation + (1 - α) * old_value
 *
 * where α = 0.3 for most indicators (giving more weight to history)
 */

import type {
  InverseProfile,
  MetacognitiveIndicators,
  CognitiveIndicators,
  MotivationalIndicators,
  BehavioralPatterns,
} from '@/lib/types/interactions'
import type { SocraticProfile } from './adaptive-generator'
import type { ExtractionResult, AggregatedPsychometrics } from './psychometric-extractor'
import { createDefaultSocraticProfile } from './adaptive-generator'

// ============================================================================
// Types
// ============================================================================

// Deep partial type for profile updates
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export interface DialogueResults {
  skillId: string
  skillName: string
  totalExchanges: number
  discoveryAchieved: boolean
  finalUnderstandingLevel: 'none' | 'surface' | 'partial' | 'deep' | 'transfer'
  effectivenessScore: number
  extractions: ExtractionResult[]
  correctnessRecord: boolean[]
  aggregatedPsychometrics: AggregatedPsychometrics
  keyInsights: string[]
  misconceptionsIdentified: string[]
  durationMs: number
  timestamp: string
}

export interface ProfileUpdateResult {
  inverseProfileUpdates: DeepPartial<InverseProfile>
  socraticProfileUpdates: Partial<SocraticProfile>
  updatedInverseProfile: InverseProfile | null
  updatedSocraticProfile: SocraticProfile | null
  newMisconceptions: string[]
  masteryAdjustment: number // -1 to 1, how much to adjust BKT
  confidenceUpdated: boolean
}

// ============================================================================
// EMA Update Helper
// ============================================================================

const EMA_ALPHA = 0.3 // Weight for new observations

function emaUpdate(oldValue: number | null, newValue: number): number {
  if (oldValue === null || oldValue === undefined) {
    return newValue
  }
  return EMA_ALPHA * newValue + (1 - EMA_ALPHA) * oldValue
}

function emaUpdateWithConfidence(
  oldValue: number | null,
  newValue: number,
  confidence: number
): { value: number; newConfidence: number } {
  // Higher confidence in the new observation = higher alpha
  const adjustedAlpha = EMA_ALPHA * (0.5 + 0.5 * confidence)

  const value = oldValue === null ? newValue : adjustedAlpha * newValue + (1 - adjustedAlpha) * oldValue

  // Update confidence (increases with more observations)
  const newConfidence = Math.min(1, (confidence || 0.3) + 0.1)

  return { value, newConfidence }
}

// ============================================================================
// Update Inverse Profile from Socratic Dialogue
// ============================================================================

export function updateInverseProfileFromDialogue(
  currentProfile: InverseProfile | null,
  dialogueResults: DialogueResults
): DeepPartial<InverseProfile> {
  const agg = dialogueResults.aggregatedPsychometrics

  const updates: DeepPartial<InverseProfile> = {}

  // Update cognitive indicators
  const cognitiveUpdates: DeepPartial<CognitiveIndicators> = {}

  // Update average response time
  cognitiveUpdates.averageResponseTimeMs = emaUpdate(
    currentProfile?.cognitive_indicators?.averageResponseTimeMs ?? null,
    agg.avgResponseLatencyMs
  )

  // Infer working memory from logical chain length and response latency
  const logicalChainIndicator = agg.dominantProcessingStyle === 'sequential' ? 'high' : 'medium'
  if (agg.avgResponseLatencyMs > 60000 && agg.avgElaborationDepth < 0.3) {
    cognitiveUpdates.workingMemoryIndicator = 'low'
  } else if (agg.avgElaborationDepth > 0.7 && agg.avgResponseLatencyMs < 45000) {
    cognitiveUpdates.workingMemoryIndicator = 'high'
  } else {
    cognitiveUpdates.workingMemoryIndicator = logicalChainIndicator
  }

  updates.cognitive_indicators = cognitiveUpdates

  // Update metacognitive indicators
  const metacogUpdates: DeepPartial<MetacognitiveIndicators> = {}

  // Update calibration accuracy from dialogue
  metacogUpdates.calibrationAccuracy = emaUpdate(
    currentProfile?.metacognitive_indicators?.calibrationAccuracy ?? null,
    agg.calibrationAccuracy
  )

  // Update self-monitoring accuracy based on self-correction rate
  metacogUpdates.selfMonitoringAccuracy = emaUpdate(
    currentProfile?.metacognitive_indicators?.selfMonitoringAccuracy ?? null,
    Math.min(1, agg.totalSelfCorrections / Math.max(1, dialogueResults.totalExchanges) * 5)
  )

  // Update overconfidence/underconfidence rates
  const overconfidentExchanges = dialogueResults.extractions.filter(
    (e) => e.confidence.isOverconfident
  ).length
  const underconfidentExchanges = dialogueResults.extractions.filter(
    (e) => e.confidence.isUnderconfident
  ).length
  const totalExchanges = dialogueResults.extractions.length

  if (totalExchanges > 0) {
    metacogUpdates.overconfidenceRate = emaUpdate(
      currentProfile?.metacognitive_indicators?.overconfidenceRate ?? null,
      overconfidentExchanges / totalExchanges
    )
    metacogUpdates.underconfidenceRate = emaUpdate(
      currentProfile?.metacognitive_indicators?.underconfidenceRate ?? null,
      underconfidentExchanges / totalExchanges
    )
  }

  // Update help-seeking pattern based on curiosity and question quality
  // High curiosity + deep questions = appropriate help-seeking
  // No questions asked = avoidant
  // Too many questions without trying = excessive
  const avgCuriosity = dialogueResults.extractions.reduce(
    (sum, e) => sum + e.engagement.curiositySignals.length,
    0
  ) / Math.max(1, totalExchanges)

  if (avgCuriosity > 0.5 && agg.avgExplanationQuality > 0.5) {
    metacogUpdates.helpSeekingPattern = 'appropriate'
  } else if (avgCuriosity < 0.1 && agg.avgExplanationQuality < 0.4) {
    metacogUpdates.helpSeekingPattern = 'avoidant'
  }

  updates.metacognitive_indicators = metacogUpdates

  // Update motivational indicators
  const motivationalUpdates: DeepPartial<MotivationalIndicators> = {}

  // Update persistence score based on self-corrections and continued engagement
  const persistenceIndicator = dialogueResults.extractions.filter(
    (e) => e.engagement.persistenceIndicator
  ).length / Math.max(1, totalExchanges)

  motivationalUpdates.persistenceScore = emaUpdate(
    currentProfile?.motivational_indicators?.persistenceScore ?? null,
    persistenceIndicator
  )

  // Update goal orientation based on mastery vs performance language
  if (agg.masteryVsPerformance === 'mastery') {
    motivationalUpdates.goalOrientation = 'mastery'
  } else if (agg.masteryVsPerformance === 'performance') {
    motivationalUpdates.goalOrientation = 'performance'
  }

  updates.motivational_indicators = motivationalUpdates

  // Update behavioral patterns
  const behavioralUpdates: DeepPartial<BehavioralPatterns> = {}

  // Update average response time
  behavioralUpdates.averageResponseTime = emaUpdate(
    currentProfile?.behavioral_patterns?.averageResponseTime ?? null,
    agg.avgResponseLatencyMs
  )

  // Add new error patterns (misconceptions)
  const existingPatterns = currentProfile?.behavioral_patterns?.errorPatterns || []
  const newPatterns = dialogueResults.misconceptionsIdentified.filter(
    (m) => !existingPatterns.includes(m)
  )
  if (newPatterns.length > 0) {
    behavioralUpdates.errorPatterns = [...existingPatterns, ...newPatterns].slice(-20) // Keep last 20
  }

  updates.behavioral_patterns = behavioralUpdates

  return updates
}

// ============================================================================
// Update Socratic Profile from Dialogue
// ============================================================================

export function updateSocraticProfileFromDialogue(
  currentProfile: SocraticProfile | null,
  dialogueResults: DialogueResults
): SocraticProfile {
  const profile = currentProfile || createDefaultSocraticProfile()
  const agg = dialogueResults.aggregatedPsychometrics
  const indicators = profile.conversational_indicators
  const confidence = profile.conversational_confidence

  // Update understanding indicators with EMA
  const explanationUpdate = emaUpdateWithConfidence(
    indicators.explanationQuality,
    agg.avgExplanationQuality,
    confidence.understanding
  )
  const elaborationUpdate = emaUpdateWithConfidence(
    indicators.elaborationDepth,
    agg.avgElaborationDepth,
    confidence.understanding
  )

  // Update confidence/calibration indicators
  const hedgingUpdate = emaUpdateWithConfidence(
    indicators.hedgingRate,
    agg.avgHedgingRate,
    confidence.calibration
  )
  const certaintyUpdate = emaUpdateWithConfidence(
    indicators.certaintyRate,
    agg.avgCertaintyRate,
    confidence.calibration
  )
  const calibrationUpdate = emaUpdateWithConfidence(
    indicators.calibrationAccuracy,
    agg.calibrationAccuracy,
    confidence.calibration
  )

  // Calculate confidence trajectory
  const prevCalibration = indicators.calibrationAccuracy
  const newCalibration = calibrationUpdate.value
  let confidenceTrajectory: 'stable' | 'increasing' | 'decreasing' = 'stable'
  if (newCalibration > prevCalibration + 0.1) {
    confidenceTrajectory = 'increasing'
  } else if (newCalibration < prevCalibration - 0.1) {
    confidenceTrajectory = 'decreasing'
  }

  // Update metacognition indicators
  const selfCorrectionRate = agg.totalSelfCorrections / Math.max(1, dialogueResults.totalExchanges)

  const avgReflection = dialogueResults.extractions.reduce(
    (sum, e) => sum + e.metacognition.reflectionCount,
    0
  ) / Math.max(1, dialogueResults.extractions.length)

  const avgMonitoring = dialogueResults.extractions.reduce(
    (sum, e) => sum + e.metacognition.monitoringCount,
    0
  ) / Math.max(1, dialogueResults.extractions.length)

  const avgBoundaryAwareness = dialogueResults.extractions.reduce(
    (sum, e) => sum + e.metacognition.boundaryAwareness,
    0
  ) / Math.max(1, dialogueResults.extractions.length)

  // Determine dominant question quality
  const questionQualityCounts = { surface: 0, deep: 0, metacognitive: 0 }
  for (const e of dialogueResults.extractions) {
    questionQualityCounts[e.metacognition.questionQuality]++
  }
  const dominantQuestionQuality = (
    Object.entries(questionQualityCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as 'surface' | 'deep' | 'metacognitive'

  // Update engagement indicators
  const avgEngagement = dialogueResults.extractions.reduce(
    (sum, e) => sum + (e.engagement.engagementLevel === 'high' ? 1 : e.engagement.engagementLevel === 'medium' ? 0.5 : 0),
    0
  ) / Math.max(1, dialogueResults.extractions.length)

  // Determine engagement trend from first half vs second half
  const halfPoint = Math.floor(dialogueResults.extractions.length / 2)
  const firstHalfEngagement = dialogueResults.extractions.slice(0, halfPoint).reduce(
    (sum, e) => sum + (e.engagement.engagementLevel === 'high' ? 1 : e.engagement.engagementLevel === 'medium' ? 0.5 : 0),
    0
  ) / Math.max(1, halfPoint)
  const secondHalfEngagement = dialogueResults.extractions.slice(halfPoint).reduce(
    (sum, e) => sum + (e.engagement.engagementLevel === 'high' ? 1 : e.engagement.engagementLevel === 'medium' ? 0.5 : 0),
    0
  ) / Math.max(1, dialogueResults.extractions.length - halfPoint)

  let engagementTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
  if (secondHalfEngagement > firstHalfEngagement + 0.2) {
    engagementTrend = 'increasing'
  } else if (secondHalfEngagement < firstHalfEngagement - 0.2) {
    engagementTrend = 'decreasing'
  }

  // Calculate curiosity score
  const avgCuriosity = dialogueResults.extractions.reduce(
    (sum, e) => sum + Math.min(1, e.engagement.curiositySignals.length / 2),
    0
  ) / Math.max(1, dialogueResults.extractions.length)

  // Calculate persistence after error
  let errorsFollowedByPersistence = 0
  let totalErrors = 0
  for (let i = 0; i < dialogueResults.extractions.length - 1; i++) {
    if (dialogueResults.extractions[i].overallAssessment.understandingLevel === 'none' ||
        dialogueResults.extractions[i].overallAssessment.understandingLevel === 'surface') {
      totalErrors++
      if (dialogueResults.extractions[i + 1].engagement.persistenceIndicator) {
        errorsFollowedByPersistence++
      }
    }
  }
  const persistenceAfterError = totalErrors > 0 ? errorsFollowedByPersistence / totalErrors : 0.5

  // Calculate frustration threshold (exchanges before frustration signals)
  let frustrationExchange = dialogueResults.totalExchanges
  for (let i = 0; i < dialogueResults.extractions.length; i++) {
    if (dialogueResults.extractions[i].engagement.frustrationSignals.length > 0) {
      frustrationExchange = i + 1
      break
    }
  }

  // Calculate average logical chain length
  const avgLogicalChainLength = dialogueResults.extractions.reduce(
    (sum, e) => sum + e.reasoning.logicalChainLength,
    0
  ) / Math.max(1, dialogueResults.extractions.length)

  // Build updated profile
  return {
    conversational_indicators: {
      explanationQuality: explanationUpdate.value,
      analogyAptness: emaUpdate(indicators.analogyAptness, agg.avgExplanationQuality > 0.6 ? 0.7 : 0.4),
      elaborationDepth: elaborationUpdate.value,
      abstractionLevel: emaUpdate(
        indicators.abstractionLevel,
        dialogueResults.extractions.reduce((sum, e) => sum + e.understanding.abstractionLevel, 0) /
          Math.max(1, dialogueResults.extractions.length)
      ),
      proceduralConceptualRatio: emaUpdate(
        indicators.proceduralConceptualRatio,
        agg.dominantReasoningStyle === 'deductive' ? 0.7 : 0.4
      ),
      hedgingRate: hedgingUpdate.value,
      certaintyRate: certaintyUpdate.value,
      calibrationAccuracy: calibrationUpdate.value,
      confidenceTrajectory,
      selfCorrectionRate: emaUpdate(indicators.selfCorrectionRate, selfCorrectionRate),
      boundaryAwareness: emaUpdate(indicators.boundaryAwareness, avgBoundaryAwareness),
      questionQuality: dominantQuestionQuality,
      reflectionFrequency: emaUpdate(indicators.reflectionFrequency, avgReflection),
      monitoringFrequency: emaUpdate(indicators.monitoringFrequency, avgMonitoring),
      reasoningStyle: agg.dominantReasoningStyle,
      abstractionPreference: dialogueResults.extractions.length > 0
        ? dialogueResults.extractions[dialogueResults.extractions.length - 1].reasoning.abstractionPreference
        : indicators.abstractionPreference,
      processingStyle: agg.dominantProcessingStyle,
      averageLogicalChainLength: emaUpdate(indicators.averageLogicalChainLength, avgLogicalChainLength),
      averageResponseLatencyMs: emaUpdate(indicators.averageResponseLatencyMs, agg.avgResponseLatencyMs),
      engagementTrend,
      curiosityScore: emaUpdate(indicators.curiosityScore, avgCuriosity),
      frustrationThreshold: emaUpdate(indicators.frustrationThreshold, frustrationExchange),
      persistenceAfterError: emaUpdate(indicators.persistenceAfterError, persistenceAfterError),
    },
    conversational_confidence: {
      understanding: explanationUpdate.newConfidence,
      calibration: calibrationUpdate.newConfidence,
      metacognition: Math.min(1, confidence.metacognition + 0.1),
      reasoning: Math.min(1, confidence.reasoning + 0.1),
      engagement: Math.min(1, confidence.engagement + 0.1),
      communication: Math.min(1, confidence.communication + 0.1),
    },
    last_dialogue_summary: {
      skillId: dialogueResults.skillId,
      exchangeCount: dialogueResults.totalExchanges,
      discoveryMade: dialogueResults.discoveryAchieved,
      understandingProgression: dialogueResults.extractions.map(
        (e) => {
          switch (e.overallAssessment.understandingLevel) {
            case 'none': return 0
            case 'surface': return 0.25
            case 'partial': return 0.5
            case 'deep': return 0.75
            case 'transfer': return 1
          }
        }
      ),
      keyInsights: dialogueResults.keyInsights,
      misconceptionsIdentified: dialogueResults.misconceptionsIdentified,
      timestamp: dialogueResults.timestamp,
    },
  }
}

// ============================================================================
// Calculate Skill Mastery Adjustment
// ============================================================================

export function calculateMasteryAdjustment(dialogueResults: DialogueResults): number {
  // Base adjustment from understanding level
  const understandingMap: Record<string, number> = {
    'none': -0.1,
    'surface': -0.05,
    'partial': 0.05,
    'deep': 0.15,
    'transfer': 0.25,
  }

  let adjustment = understandingMap[dialogueResults.finalUnderstandingLevel] || 0

  // Bonus for discovery
  if (dialogueResults.discoveryAchieved) {
    adjustment += 0.1
  }

  // Penalty for persistent misconceptions
  if (dialogueResults.misconceptionsIdentified.length > 2) {
    adjustment -= 0.1
  }

  // Bonus for high effectiveness score
  if (dialogueResults.effectivenessScore > 0.7) {
    adjustment += 0.05
  }

  // Clamp to -0.2 to 0.35 range
  return Math.max(-0.2, Math.min(0.35, adjustment))
}

// ============================================================================
// Main Update Function
// ============================================================================

export function updateProfileFromSocraticDialogue(
  currentInverseProfile: InverseProfile | null,
  currentSocraticProfile: SocraticProfile | null,
  dialogueResults: DialogueResults
): ProfileUpdateResult {
  // Update InverseProfile
  const inverseProfileUpdates = updateInverseProfileFromDialogue(
    currentInverseProfile,
    dialogueResults
  )

  // Update SocraticProfile
  const updatedSocraticProfile = updateSocraticProfileFromDialogue(
    currentSocraticProfile,
    dialogueResults
  )

  // Calculate mastery adjustment
  const masteryAdjustment = calculateMasteryAdjustment(dialogueResults)

  // Collect new misconceptions
  const existingMisconceptions = currentInverseProfile?.knowledge_state?.misconceptions || []
  const newMisconceptions = dialogueResults.misconceptionsIdentified.filter(
    (m) => !existingMisconceptions.includes(m)
  )

  // Build full updated inverse profile if we have a base
  let updatedInverseProfile: InverseProfile | null = null
  if (currentInverseProfile) {
    // Merge behavioral patterns, ensuring errorPatterns is a clean string[]
    const mergedErrorPatterns = inverseProfileUpdates.behavioral_patterns?.errorPatterns
      ? inverseProfileUpdates.behavioral_patterns.errorPatterns.filter((p): p is string => p !== undefined)
      : currentInverseProfile.behavioral_patterns.errorPatterns

    updatedInverseProfile = {
      ...currentInverseProfile,
      cognitive_indicators: {
        ...currentInverseProfile.cognitive_indicators,
        ...(inverseProfileUpdates.cognitive_indicators as Partial<CognitiveIndicators>),
      },
      metacognitive_indicators: {
        ...currentInverseProfile.metacognitive_indicators,
        ...(inverseProfileUpdates.metacognitive_indicators as Partial<MetacognitiveIndicators>),
      },
      motivational_indicators: {
        ...currentInverseProfile.motivational_indicators,
        ...(inverseProfileUpdates.motivational_indicators as Partial<MotivationalIndicators>),
      },
      behavioral_patterns: {
        ...currentInverseProfile.behavioral_patterns,
        ...(inverseProfileUpdates.behavioral_patterns as Partial<BehavioralPatterns>),
        errorPatterns: mergedErrorPatterns,
      },
      knowledge_state: {
        ...currentInverseProfile.knowledge_state,
        misconceptions: [
          ...currentInverseProfile.knowledge_state.misconceptions,
          ...newMisconceptions,
        ],
      },
    }
  }

  return {
    inverseProfileUpdates,
    socraticProfileUpdates: updatedSocraticProfile,
    updatedInverseProfile,
    updatedSocraticProfile,
    newMisconceptions,
    masteryAdjustment,
    confidenceUpdated: true,
  }
}

// ============================================================================
// Serialize/Deserialize for Storage
// ============================================================================

export function serializeSocraticProfile(profile: SocraticProfile): Record<string, unknown> {
  return JSON.parse(JSON.stringify(profile))
}

export function deserializeSocraticProfile(
  data: string | Record<string, unknown> | null
): SocraticProfile | null {
  if (!data) return null
  try {
    if (typeof data === 'string') {
      return JSON.parse(data) as SocraticProfile
    }
    // Already an object, validate basic structure
    if (data.conversational_indicators && data.conversational_confidence) {
      return data as unknown as SocraticProfile
    }
    return null
  } catch {
    return null
  }
}
