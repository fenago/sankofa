/**
 * Behavioral Framework Scores API
 *
 * Calculates educational psychology framework scores from learner behavior
 * captured during Socratic, Teach, and Freeform dialogue modes.
 *
 * GET /api/notebooks/[id]/profile/behavioral-frameworks
 * Returns framework scores computed from psychometric extraction data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateBehavioralFrameworkScores,
  explainFrameworkScore,
  FRAMEWORK_MAPPINGS,
  type BehavioralFrameworkScores,
} from '@/lib/profile/framework-psychometric-mapping'
import type { ExtractionResult } from '@/lib/socratic/psychometric-extractor'
import type { TeachingPsychometrics } from '@/lib/socratic/inverse-socratic'
import type { ConversationalPsychometrics } from '@/lib/socratic/freeform-tutor'
import type { InverseProfile } from '@/lib/types/interactions'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: notebookId } = await context.params
  const { searchParams } = new URL(request.url)
  const explain = searchParams.get('explain') // Optional framework ID to explain

  try {
    // Fetch inverse profile
    const { data: profileData } = await supabase
      .from('inverse_profiles')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .single()

    const profile: InverseProfile | null = profileData ? {
      id: profileData.id,
      learner_id: profileData.learner_id,
      notebook_id: profileData.notebook_id,
      version: profileData.version,
      computed_at: profileData.computed_at,
      interactions_analyzed: profileData.interactions_analyzed,
      knowledge_state: profileData.knowledge_state as InverseProfile['knowledge_state'],
      cognitive_indicators: profileData.cognitive_indicators as InverseProfile['cognitive_indicators'],
      metacognitive_indicators: profileData.metacognitive_indicators as InverseProfile['metacognitive_indicators'],
      motivational_indicators: profileData.motivational_indicators as InverseProfile['motivational_indicators'],
      behavioral_patterns: profileData.behavioral_patterns as InverseProfile['behavioral_patterns'],
      confidence_scores: profileData.confidence_scores as InverseProfile['confidence_scores'],
    } : null

    // Fetch recent Socratic dialogue interactions
    const { data: socraticInteractions } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .eq('event_type', 'socratic_exchange')
      .order('created_at', { ascending: false })
      .limit(50)

    // Extract psychometrics from Socratic interactions
    const socraticExtractions: ExtractionResult[] = []
    if (socraticInteractions) {
      for (const interaction of socraticInteractions) {
        const payload = interaction.payload as Record<string, unknown>
        if (payload?.extractedPsychometrics) {
          // Reconstruct ExtractionResult from stored payload
          const extracted = payload.extractedPsychometrics as Record<string, unknown>
          socraticExtractions.push({
            understanding: {
              explanationQuality: (extracted.explanationQuality as number) ?? 0.5,
              analogyAptness: 0.5,
              elaborationDepth: 0.5,
              abstractionLevel: 0.5,
              proceduralConceptualRatio: 0.5,
              conceptualConnections: 0,
            },
            confidence: {
              hedgingRate: (extracted.hedgingRate as number) ?? 0.3,
              certaintyRate: (extracted.certaintyRate as number) ?? 0.3,
              hedgingMarkers: [],
              certaintyMarkers: [],
              isOverconfident: false,
              isUnderconfident: false,
            },
            metacognition: {
              selfCorrectionCount: (extracted.selfCorrectionCount as number) ?? 0,
              selfCorrections: [],
              boundaryAwareness: 0.5,
              questionQuality: 'surface',
              reflectionCount: 0,
              monitoringCount: 0,
              strategyVerbalization: false,
            },
            reasoning: {
              reasoningStyle: (extracted.reasoningStyle as 'deductive' | 'inductive' | 'mixed') ?? 'mixed',
              abstractionPreference: 'balanced',
              processingStyle: 'flexible',
              logicalChainLength: 1,
              causalReasoningPresent: false,
              divergentThinkingCount: 0,
            },
            engagement: {
              responseLatencyMs: 0,
              wordCount: 0,
              engagementLevel: (extracted.engagementLevel as 'high' | 'medium' | 'low') ?? 'medium',
              curiositySignals: [],
              frustrationSignals: [],
              persistenceIndicator: false,
              masteryOrientation: false,
            },
            communication: {
              turnLength: 0,
              responsiveness: 0.5,
              topicCoherence: 0.5,
              vocabularySophistication: 0.5,
              grammaticalComplexity: 0.5,
            },
            misconceptions: (payload.misconceptionsDetected as string[]) ?? [],
            insightsDetected: [],
            overallAssessment: {
              understandingLevel: (payload.understandingLevel as 'none' | 'surface' | 'partial' | 'deep' | 'transfer') ?? 'partial',
              isDiscoveryMoment: (payload.ledToDiscovery as boolean) ?? false,
              recommendedNextQuestionType: 'scaffolding',
            },
          })
        }
      }
    }

    // Fetch recent Teach (inverse socratic) interactions
    const { data: teachInteractions } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .eq('event_type', 'inverse_socratic_exchange')
      .order('created_at', { ascending: false })
      .limit(30)

    const teachPsychometrics: TeachingPsychometrics[] = []
    if (teachInteractions) {
      for (const interaction of teachInteractions) {
        const payload = interaction.payload as Record<string, unknown>
        if (payload?.psychometrics) {
          const psych = payload.psychometrics as Record<string, unknown>
          teachPsychometrics.push({
            explanationClarity: (psych.explanationClarity as number) ?? 0.5,
            explanationCompleteness: (psych.explanationCompleteness as number) ?? 0.5,
            usesExamples: (psych.usesExamples as boolean) ?? false,
            usesAnalogies: (psych.usesAnalogies as boolean) ?? false,
            structureQuality: (psych.structureQuality as number) ?? 0.5,
            surfaceVsDeep: 'mixed',
            conceptualAccuracy: (psych.conceptAccuracy as number) ?? 0.5,
            misconceptionsInExplanation: [],
            correctsOwnMistakes: false,
            respondsToConfusion: (psych.respondsToConfusion as boolean) ?? false,
            simplifiesWhenNeeded: (psych.simplifiesWhenNeeded as boolean) ?? false,
            elaboratesWhenAsked: (psych.elaboratesWhenAsked as boolean) ?? false,
            anticipatesQuestions: (psych.anticipatesQuestions as boolean) ?? false,
            acknowledgesUncertainty: (psych.acknowledgesUncertainty as boolean) ?? false,
            distinguishesFactFromOpinion: (psych.distinguishesFactFromOpinion as boolean) ?? false,
            identifiesPrerequisites: (psych.identifiesPrerequisites as boolean) ?? false,
            patienceLevel: (psych.patienceLevel as number) ?? 0.5,
            encouragementProvided: (psych.encouragementProvided as boolean) ?? false,
            checksForUnderstanding: (psych.checksForUnderstanding as boolean) ?? false,
          })
        }
      }
    }

    // Fetch recent Freeform interactions
    const { data: freeformInteractions } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .eq('event_type', 'freeform_exchange')
      .order('created_at', { ascending: false })
      .limit(30)

    const freeformPsychometrics: ConversationalPsychometrics[] = []
    if (freeformInteractions) {
      for (const interaction of freeformInteractions) {
        const payload = interaction.payload as Record<string, unknown>
        if (payload?.psychometrics) {
          const psych = payload.psychometrics as Record<string, unknown>
          freeformPsychometrics.push({
            questionDepth: (psych.questionDepth as 'surface' | 'intermediate' | 'deep') ?? 'surface',
            questionClarity: (psych.questionClarity as number) ?? 0.5,
            questionRelevance: (psych.questionRelevance as number) ?? 0.5,
            showsPrerequisiteKnowledge: (psych.showsPrerequisiteKnowledge as boolean) ?? false,
            understandingIndicators: (psych.understandingIndicators as string[]) ?? [],
            confusionIndicators: (psych.confusionIndicators as string[]) ?? [],
            insightMoments: (psych.insightMoments as string[]) ?? [],
            curiosityLevel: (psych.curiosityLevel as number) ?? 0.5,
            engagementLevel: (psych.engagementLevel as 'high' | 'medium' | 'low') ?? 'medium',
            followUpBehavior: (psych.followUpBehavior as 'proactive' | 'reactive' | 'passive') ?? 'reactive',
            selfAwarenessShown: (psych.selfAwarenessShown as boolean) ?? false,
            boundaryRecognition: (psych.boundaryRecognition as boolean) ?? false,
            strategyMentioned: (psych.strategyMentioned as boolean) ?? false,
            confidenceInQuestion: (psych.confidenceInQuestion as number) ?? 0.5,
            uncertaintyExpressed: (psych.uncertaintyExpressed as boolean) ?? false,
            overconfidenceSignals: (psych.overconfidenceSignals as string[]) ?? [],
            technicalVocabularyUsed: (psych.technicalVocabularyUsed as boolean) ?? false,
            examplesSought: (psych.examplesSought as boolean) ?? false,
            analogiesRequested: (psych.analogiesRequested as boolean) ?? false,
          })
        }
      }
    }

    // Fetch practice stats
    const { data: practiceData } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', user.id)
      .eq('event_type', 'practice_attempt')
      .order('created_at', { ascending: false })
      .limit(100)

    let practiceStats: { avgAccuracy: number; totalAttempts: number } | null = null
    if (practiceData && practiceData.length > 0) {
      const attempts = practiceData.map(d => d.payload as { isCorrect?: boolean })
      const correct = attempts.filter(a => a.isCorrect === true).length
      practiceStats = {
        avgAccuracy: correct / attempts.length,
        totalAttempts: attempts.length,
      }
    }

    // Calculate behavioral framework scores
    const scores = calculateBehavioralFrameworkScores(
      socraticExtractions,
      teachPsychometrics,
      freeformPsychometrics,
      practiceStats,
      profile
    )

    // If explain parameter provided, include detailed explanation
    let explanation: string | null = null
    if (explain) {
      explanation = explainFrameworkScore(explain, scores)
    }

    // Build summary for each framework
    const frameworkSummaries = FRAMEWORK_MAPPINGS.map(fm => {
      const frameworkScores = scores.frameworks[fm.frameworkId]
      return {
        id: fm.frameworkId,
        name: fm.frameworkName,
        shortName: fm.frameworkName.split(' ')[0],
        researcher: fm.researcher,
        year: fm.year,
        score: frameworkScores?.overallScore ?? null,
        confidence: Math.round((frameworkScores?.confidence ?? 0) * 100),
        dimensions: fm.dimensions.map(d => ({
          id: d.dimensionId,
          name: d.dimensionName,
          description: d.description,
          score: frameworkScores?.dimensions[d.dimensionId]?.score !== undefined
            ? Math.round((frameworkScores.dimensions[d.dimensionId].score ?? 0) * 100)
            : null,
          dataPointsUsed: frameworkScores?.dimensions[d.dimensionId]?.dataPointsUsed ?? 0,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      computedAt: scores.computedAt,
      totalDataPoints: scores.totalDataPoints,
      dataSources: {
        socraticExchanges: socraticExtractions.length,
        teachExchanges: teachPsychometrics.length,
        freeformExchanges: freeformPsychometrics.length,
        practiceAttempts: practiceStats?.totalAttempts ?? 0,
        hasProfile: profile !== null,
      },
      frameworks: frameworkSummaries,
      explanation,
    })
  } catch (error) {
    console.error('Error calculating behavioral framework scores:', error)
    return NextResponse.json(
      { error: 'Failed to calculate framework scores' },
      { status: 500 }
    )
  }
}
