/**
 * Framework-Psychometric Mapping
 *
 * Explicit mappings between learner behavioral data points and
 * educational psychology framework dimensions.
 *
 * This bridges the gap between:
 * - Real-time psychometric extraction (from Socratic/Teach/Freeform modes)
 * - Educational psychology framework scores
 *
 * Each framework has explicit data points with weights that determine
 * how learner behavior contributes to framework metrics.
 */

import type { ExtractionResult, AggregatedPsychometrics } from '@/lib/socratic/psychometric-extractor'
import type { TeachingPsychometrics } from '@/lib/socratic/inverse-socratic'
import type { ConversationalPsychometrics } from '@/lib/socratic/freeform-tutor'
import type { InverseProfile } from '@/lib/types/interactions'

// ============================================================================
// Types
// ============================================================================

export interface DataPointMapping {
  source: 'socratic' | 'teach' | 'freeform' | 'practice' | 'profile'
  field: string
  weight: number
  transform?: (value: unknown) => number // Transform raw value to 0-1 scale
  description: string
}

export interface FrameworkMapping {
  frameworkId: string
  frameworkName: string
  researcher: string
  year: number
  dimensions: FrameworkDimensionMapping[]
}

export interface FrameworkDimensionMapping {
  dimensionId: string
  dimensionName: string
  description: string
  dataPoints: DataPointMapping[]
}

export interface BehavioralFrameworkScores {
  computedAt: string
  totalDataPoints: number
  frameworks: {
    [frameworkId: string]: {
      overallScore: number | null
      confidence: number // 0-1 based on data availability
      dimensions: {
        [dimensionId: string]: {
          score: number | null
          dataPointsUsed: number
          breakdown: {
            source: string
            field: string
            rawValue: unknown
            normalizedValue: number
            weight: number
            contribution: number
          }[]
        }
      }
    }
  }
}

// ============================================================================
// Transform Functions
// ============================================================================

const transforms = {
  // Convert 0-1 rate directly
  identity: (v: unknown) => typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0,

  // Invert 0-1 (high hedging = low confidence)
  invert: (v: unknown) => typeof v === 'number' ? 1 - Math.max(0, Math.min(1, v)) : 0.5,

  // Convert count to 0-1 (diminishing returns after 5)
  countToScore: (v: unknown) => typeof v === 'number' ? Math.min(1, v / 5) : 0,

  // Convert engagement level string to number
  engagementToScore: (v: unknown) => {
    if (v === 'high') return 1
    if (v === 'medium') return 0.6
    if (v === 'low') return 0.2
    return 0.5
  },

  // Convert question quality to number
  questionQualityToScore: (v: unknown) => {
    if (v === 'metacognitive') return 1
    if (v === 'deep') return 0.7
    if (v === 'surface') return 0.3
    return 0.5
  },

  // Convert reasoning style (deductive is higher-order)
  reasoningStyleToScore: (v: unknown) => {
    if (v === 'deductive') return 0.9
    if (v === 'mixed') return 0.6
    if (v === 'inductive') return 0.4
    return 0.5
  },

  // Convert abstraction preference
  abstractionToScore: (v: unknown) => {
    if (v === 'abstract') return 0.9
    if (v === 'balanced') return 0.6
    if (v === 'concrete') return 0.3
    return 0.5
  },

  // Boolean to score
  boolToScore: (v: unknown) => v === true ? 1 : 0,

  // Understanding level to score
  understandingToScore: (v: unknown) => {
    if (v === 'transfer') return 1
    if (v === 'deep') return 0.8
    if (v === 'partial') return 0.5
    if (v === 'surface') return 0.3
    if (v === 'none') return 0
    return 0.5
  },

  // Mastery vs performance orientation
  masteryOrientationToScore: (v: unknown) => {
    if (v === 'mastery') return 1
    if (v === 'balanced') return 0.6
    if (v === 'performance') return 0.3
    return 0.5
  },

  // Help seeking pattern
  helpSeekingToScore: (v: unknown) => {
    if (v === 'appropriate') return 1
    if (v === 'excessive') return 0.4
    if (v === 'avoidant') return 0.3
    if (v === 'unknown') return 0.5
    return 0.5
  },

  // Working memory indicator
  workingMemoryToScore: (v: unknown) => {
    if (v === 'high') return 1
    if (v === 'medium') return 0.6
    if (v === 'low') return 0.3
    return 0.5
  },

  // Expertise level
  expertiseToScore: (v: unknown) => {
    if (v === 'expert') return 1
    if (v === 'advanced') return 0.8
    if (v === 'intermediate') return 0.6
    if (v === 'beginner') return 0.4
    if (v === 'novice') return 0.2
    return 0.5
  },

  // Goal orientation
  goalOrientationToScore: (v: unknown) => {
    if (v === 'mastery') return 1
    if (v === 'performance') return 0.5
    if (v === 'avoidance') return 0.2
    return 0.5
  },
}

// ============================================================================
// Framework Mappings
// ============================================================================

export const FRAMEWORK_MAPPINGS: FrameworkMapping[] = [
  // =========================================================================
  // FINK'S TAXONOMY OF SIGNIFICANT LEARNING
  // =========================================================================
  {
    frameworkId: 'fink',
    frameworkName: "Fink's Taxonomy of Significant Learning",
    researcher: 'L. Dee Fink',
    year: 2003,
    dimensions: [
      {
        dimensionId: 'foundational_knowledge',
        dimensionName: 'Foundational Knowledge',
        description: 'Understanding and remembering information and ideas',
        dataPoints: [
          { source: 'socratic', field: 'understanding.explanationQuality', weight: 0.30, transform: transforms.identity, description: 'Quality of explanations in dialogue' },
          { source: 'socratic', field: 'understanding.elaborationDepth', weight: 0.25, transform: transforms.identity, description: 'Depth of elaboration in responses' },
          { source: 'teach', field: 'conceptualAccuracy', weight: 0.25, transform: transforms.identity, description: 'Accuracy when teaching concepts' },
          { source: 'practice', field: 'avgAccuracy', weight: 0.20, transform: transforms.identity, description: 'Practice question accuracy' },
        ],
      },
      {
        dimensionId: 'application',
        dimensionName: 'Application',
        description: 'Skills, thinking critically, creativity, managing projects',
        dataPoints: [
          { source: 'socratic', field: 'reasoning.causalReasoningPresent', weight: 0.25, transform: transforms.boolToScore, description: 'Uses cause-effect reasoning' },
          { source: 'socratic', field: 'reasoning.logicalChainLength', weight: 0.20, transform: transforms.countToScore, description: 'Length of reasoning chains' },
          { source: 'teach', field: 'usesExamples', weight: 0.20, transform: transforms.boolToScore, description: 'Uses examples when teaching' },
          { source: 'freeform', field: 'showsPrerequisiteKnowledge', weight: 0.15, transform: transforms.boolToScore, description: 'Demonstrates prerequisite knowledge' },
          { source: 'profile', field: 'cognitive_indicators.expertiseLevel', weight: 0.20, transform: transforms.expertiseToScore, description: 'Overall expertise level' },
        ],
      },
      {
        dimensionId: 'integration',
        dimensionName: 'Integration',
        description: 'Connecting ideas, people, and realms of life',
        dataPoints: [
          { source: 'socratic', field: 'understanding.conceptualConnections', weight: 0.30, transform: transforms.countToScore, description: 'Cross-concept connections made' },
          { source: 'socratic', field: 'reasoning.divergentThinkingCount', weight: 0.25, transform: transforms.countToScore, description: 'Alternative explanations offered' },
          { source: 'teach', field: 'usesAnalogies', weight: 0.25, transform: transforms.boolToScore, description: 'Uses analogies when teaching' },
          { source: 'freeform', field: 'questionRelevance', weight: 0.20, transform: transforms.identity, description: 'Relevance of questions asked' },
        ],
      },
      {
        dimensionId: 'human_dimension',
        dimensionName: 'Human Dimension',
        description: 'Learning about oneself and others',
        dataPoints: [
          { source: 'socratic', field: 'metacognition.boundaryAwareness', weight: 0.30, transform: transforms.identity, description: 'Awareness of knowledge boundaries' },
          { source: 'teach', field: 'respondsToConfusion', weight: 0.25, transform: transforms.boolToScore, description: 'Responds to learner confusion' },
          { source: 'teach', field: 'patienceLevel', weight: 0.20, transform: transforms.identity, description: 'Patience when teaching' },
          { source: 'profile', field: 'metacognitive_indicators.calibrationAccuracy', weight: 0.25, transform: transforms.identity, description: 'Self-assessment accuracy' },
        ],
      },
      {
        dimensionId: 'caring',
        dimensionName: 'Caring',
        description: 'Developing new feelings, interests, or values',
        dataPoints: [
          { source: 'socratic', field: 'engagement.masteryOrientation', weight: 0.30, transform: transforms.boolToScore, description: 'Shows mastery orientation' },
          { source: 'socratic', field: 'engagement.curiositySignals', weight: 0.25, transform: (v) => Array.isArray(v) ? Math.min(1, v.length / 3) : 0, description: 'Curiosity signals detected' },
          { source: 'freeform', field: 'curiosityLevel', weight: 0.25, transform: transforms.identity, description: 'Overall curiosity level' },
          { source: 'profile', field: 'motivational_indicators.goalOrientation', weight: 0.20, transform: transforms.goalOrientationToScore, description: 'Goal orientation type' },
        ],
      },
      {
        dimensionId: 'learning_how_to_learn',
        dimensionName: 'Learning How to Learn',
        description: 'Becoming a better, self-directed learner',
        dataPoints: [
          { source: 'socratic', field: 'metacognition.selfCorrectionCount', weight: 0.25, transform: transforms.countToScore, description: 'Self-corrections during dialogue' },
          { source: 'socratic', field: 'metacognition.reflectionCount', weight: 0.20, transform: transforms.countToScore, description: 'Reflection statements' },
          { source: 'socratic', field: 'metacognition.monitoringCount', weight: 0.15, transform: transforms.countToScore, description: 'Self-monitoring statements' },
          { source: 'socratic', field: 'metacognition.strategyVerbalization', weight: 0.15, transform: transforms.boolToScore, description: 'Verbalizes learning strategies' },
          { source: 'socratic', field: 'metacognition.questionQuality', weight: 0.15, transform: transforms.questionQualityToScore, description: 'Quality of questions asked' },
          { source: 'profile', field: 'metacognitive_indicators.helpSeekingPattern', weight: 0.10, transform: transforms.helpSeekingToScore, description: 'Help-seeking pattern' },
        ],
      },
    ],
  },

  // =========================================================================
  // BLOOM'S TAXONOMY (REVISED)
  // =========================================================================
  {
    frameworkId: 'bloom',
    frameworkName: "Bloom's Taxonomy (Revised)",
    researcher: 'Anderson & Krathwohl',
    year: 2001,
    dimensions: [
      {
        dimensionId: 'remember',
        dimensionName: 'Remember',
        description: 'Recall facts, terms, basic concepts',
        dataPoints: [
          { source: 'practice', field: 'avgAccuracy', weight: 0.50, transform: transforms.identity, description: 'Basic recall accuracy' },
          { source: 'socratic', field: 'understanding.explanationQuality', weight: 0.30, transform: (v) => typeof v === 'number' ? Math.min(1, v * 1.5) : 0, description: 'Can state information' },
          { source: 'teach', field: 'conceptualAccuracy', weight: 0.20, transform: transforms.identity, description: 'Factual accuracy when teaching' },
        ],
      },
      {
        dimensionId: 'understand',
        dimensionName: 'Understand',
        description: 'Explain ideas, interpret meaning',
        dataPoints: [
          { source: 'socratic', field: 'understanding.explanationQuality', weight: 0.35, transform: transforms.identity, description: 'Quality of explanations' },
          { source: 'socratic', field: 'understanding.elaborationDepth', weight: 0.25, transform: transforms.identity, description: 'Depth of elaboration' },
          { source: 'teach', field: 'explanationClarity', weight: 0.25, transform: transforms.identity, description: 'Clarity when explaining to others' },
          { source: 'freeform', field: 'understandingIndicators', weight: 0.15, transform: (v) => Array.isArray(v) ? Math.min(1, v.length / 3) : 0, description: 'Understanding signals' },
        ],
      },
      {
        dimensionId: 'apply',
        dimensionName: 'Apply',
        description: 'Use knowledge in new situations',
        dataPoints: [
          { source: 'socratic', field: 'reasoning.causalReasoningPresent', weight: 0.30, transform: transforms.boolToScore, description: 'Applies cause-effect reasoning' },
          { source: 'teach', field: 'usesExamples', weight: 0.25, transform: transforms.boolToScore, description: 'Generates own examples' },
          { source: 'socratic', field: 'understanding.proceduralConceptualRatio', weight: 0.25, transform: transforms.identity, description: 'Procedural application' },
          { source: 'profile', field: 'cognitive_indicators.expertiseLevel', weight: 0.20, transform: transforms.expertiseToScore, description: 'Expertise in application' },
        ],
      },
      {
        dimensionId: 'analyze',
        dimensionName: 'Analyze',
        description: 'Draw connections, identify patterns',
        dataPoints: [
          { source: 'socratic', field: 'understanding.conceptualConnections', weight: 0.30, transform: transforms.countToScore, description: 'Connections between concepts' },
          { source: 'socratic', field: 'reasoning.logicalChainLength', weight: 0.25, transform: transforms.countToScore, description: 'Depth of analysis' },
          { source: 'socratic', field: 'reasoning.divergentThinkingCount', weight: 0.25, transform: transforms.countToScore, description: 'Multiple perspectives' },
          { source: 'teach', field: 'structureQuality', weight: 0.20, transform: transforms.identity, description: 'Structural analysis in teaching' },
        ],
      },
      {
        dimensionId: 'evaluate',
        dimensionName: 'Evaluate',
        description: 'Justify decisions, critique',
        dataPoints: [
          { source: 'socratic', field: 'metacognition.questionQuality', weight: 0.30, transform: transforms.questionQualityToScore, description: 'Quality of evaluative questions' },
          { source: 'socratic', field: 'reasoning.reasoningStyle', weight: 0.25, transform: transforms.reasoningStyleToScore, description: 'Reasoning sophistication' },
          { source: 'teach', field: 'distinguishesFactFromOpinion', weight: 0.25, transform: transforms.boolToScore, description: 'Distinguishes fact from opinion' },
          { source: 'profile', field: 'metacognitive_indicators.calibrationAccuracy', weight: 0.20, transform: transforms.identity, description: 'Judgment accuracy' },
        ],
      },
      {
        dimensionId: 'create',
        dimensionName: 'Create',
        description: 'Produce new work, design solutions',
        dataPoints: [
          { source: 'socratic', field: 'reasoning.divergentThinkingCount', weight: 0.35, transform: transforms.countToScore, description: 'Novel ideas generated' },
          { source: 'teach', field: 'usesAnalogies', weight: 0.25, transform: transforms.boolToScore, description: 'Creates novel analogies' },
          { source: 'socratic', field: 'understanding.abstractionLevel', weight: 0.20, transform: transforms.identity, description: 'Abstract thinking' },
          { source: 'socratic', field: 'insightsDetected', weight: 0.20, transform: (v) => Array.isArray(v) ? Math.min(1, v.length / 2) : 0, description: 'Original insights' },
        ],
      },
    ],
  },

  // =========================================================================
  // METACOGNITION (FLAVELL / ZIMMERMAN)
  // =========================================================================
  {
    frameworkId: 'metacognition',
    frameworkName: 'Metacognition & Self-Regulated Learning',
    researcher: 'Flavell / Zimmerman',
    year: 1979,
    dimensions: [
      {
        dimensionId: 'knowledge_of_cognition',
        dimensionName: 'Knowledge of Cognition',
        description: 'Knowing what you know and how you learn',
        dataPoints: [
          { source: 'socratic', field: 'metacognition.boundaryAwareness', weight: 0.35, transform: transforms.identity, description: 'Knows limits of knowledge' },
          { source: 'socratic', field: 'metacognition.strategyVerbalization', weight: 0.30, transform: transforms.boolToScore, description: 'Can describe learning strategies' },
          { source: 'profile', field: 'metacognitive_indicators.calibrationAccuracy', weight: 0.35, transform: transforms.identity, description: 'Accuracy of self-assessment' },
        ],
      },
      {
        dimensionId: 'regulation_of_cognition',
        dimensionName: 'Regulation of Cognition',
        description: 'Planning, monitoring, and evaluating learning',
        dataPoints: [
          { source: 'socratic', field: 'metacognition.monitoringCount', weight: 0.30, transform: transforms.countToScore, description: 'Self-monitoring during learning' },
          { source: 'socratic', field: 'metacognition.selfCorrectionCount', weight: 0.30, transform: transforms.countToScore, description: 'Self-correction behavior' },
          { source: 'socratic', field: 'metacognition.reflectionCount', weight: 0.25, transform: transforms.countToScore, description: 'Reflection on learning' },
          { source: 'profile', field: 'metacognitive_indicators.helpSeekingPattern', weight: 0.15, transform: transforms.helpSeekingToScore, description: 'Strategic help-seeking' },
        ],
      },
    ],
  },

  // =========================================================================
  // DUNNING-KRUGER / CALIBRATION
  // =========================================================================
  {
    frameworkId: 'calibration',
    frameworkName: 'Confidence Calibration',
    researcher: 'Kruger & Dunning',
    year: 1999,
    dimensions: [
      {
        dimensionId: 'accuracy',
        dimensionName: 'Calibration Accuracy',
        description: 'How well confidence matches actual performance',
        dataPoints: [
          { source: 'profile', field: 'metacognitive_indicators.calibrationAccuracy', weight: 0.40, transform: transforms.identity, description: 'Confidence-performance correlation' },
          { source: 'profile', field: 'metacognitive_indicators.overconfidenceRate', weight: 0.30, transform: transforms.invert, description: 'Overconfidence rate (inverted)' },
          { source: 'profile', field: 'metacognitive_indicators.underconfidenceRate', weight: 0.30, transform: transforms.invert, description: 'Underconfidence rate (inverted)' },
        ],
      },
      {
        dimensionId: 'epistemic_humility',
        dimensionName: 'Epistemic Humility',
        description: 'Appropriate uncertainty and hedging',
        dataPoints: [
          { source: 'socratic', field: 'confidence.hedgingRate', weight: 0.30, transform: (v) => typeof v === 'number' ? (v > 0.1 && v < 0.5 ? 1 : 0.5) : 0.5, description: 'Appropriate hedging (not too much/little)' },
          { source: 'socratic', field: 'confidence.isOverconfident', weight: 0.35, transform: (v) => v === true ? 0 : 1, description: 'Not overconfident' },
          { source: 'socratic', field: 'metacognition.boundaryAwareness', weight: 0.35, transform: transforms.identity, description: 'Knows what they don\'t know' },
        ],
      },
    ],
  },

  // =========================================================================
  // ACHIEVEMENT GOAL THEORY (DWECK)
  // =========================================================================
  {
    frameworkId: 'goal_orientation',
    frameworkName: 'Achievement Goal Theory',
    researcher: 'Dweck & Elliot',
    year: 1988,
    dimensions: [
      {
        dimensionId: 'mastery_approach',
        dimensionName: 'Mastery Approach',
        description: 'Motivated by learning and improvement',
        dataPoints: [
          { source: 'socratic', field: 'engagement.masteryOrientation', weight: 0.35, transform: transforms.boolToScore, description: 'Shows mastery orientation' },
          { source: 'socratic', field: 'engagement.persistenceIndicator', weight: 0.25, transform: transforms.boolToScore, description: 'Persists through difficulty' },
          { source: 'socratic', field: 'engagement.curiositySignals', weight: 0.20, transform: (v) => Array.isArray(v) ? Math.min(1, v.length / 3) : 0, description: 'Curiosity and interest' },
          { source: 'profile', field: 'motivational_indicators.persistenceScore', weight: 0.20, transform: transforms.identity, description: 'Overall persistence' },
        ],
      },
      {
        dimensionId: 'performance_avoidance',
        dimensionName: 'Performance Avoidance (Inverted)',
        description: 'Not avoiding challenge or failure (higher = better)',
        dataPoints: [
          { source: 'socratic', field: 'engagement.frustrationSignals', weight: 0.40, transform: (v) => Array.isArray(v) ? Math.max(0, 1 - v.length / 2) : 1, description: 'Low frustration signals' },
          { source: 'profile', field: 'metacognitive_indicators.helpSeekingPattern', weight: 0.30, transform: (v) => v === 'avoidant' ? 0.3 : 1, description: 'Not help-avoidant' },
          { source: 'profile', field: 'motivational_indicators.goalOrientation', weight: 0.30, transform: (v) => v === 'avoidance' ? 0.2 : 1, description: 'Not avoidance-oriented' },
        ],
      },
    ],
  },

  // =========================================================================
  // COGNITIVE LOAD THEORY (SWELLER)
  // =========================================================================
  {
    frameworkId: 'cognitive_load',
    frameworkName: 'Cognitive Load Theory',
    researcher: 'Sweller',
    year: 1988,
    dimensions: [
      {
        dimensionId: 'working_memory',
        dimensionName: 'Working Memory Capacity',
        description: 'Ability to hold and process information',
        dataPoints: [
          { source: 'profile', field: 'cognitive_indicators.workingMemoryIndicator', weight: 0.40, transform: transforms.workingMemoryToScore, description: 'Working memory indicator' },
          { source: 'socratic', field: 'reasoning.logicalChainLength', weight: 0.30, transform: transforms.countToScore, description: 'Can maintain long reasoning chains' },
          { source: 'profile', field: 'cognitive_indicators.cognitiveLoadThreshold', weight: 0.30, transform: transforms.identity, description: 'Cognitive load threshold' },
        ],
      },
      {
        dimensionId: 'germane_load',
        dimensionName: 'Germane Load (Learning)',
        description: 'Mental effort devoted to learning vs confusion',
        dataPoints: [
          { source: 'socratic', field: 'engagement.engagementLevel', weight: 0.35, transform: transforms.engagementToScore, description: 'Active engagement level' },
          { source: 'socratic', field: 'understanding.elaborationDepth', weight: 0.35, transform: transforms.identity, description: 'Depth of processing' },
          { source: 'socratic', field: 'engagement.frustrationSignals', weight: 0.30, transform: (v) => Array.isArray(v) ? Math.max(0, 1 - v.length / 3) : 1, description: 'Low extraneous load (frustration)' },
        ],
      },
    ],
  },

  // =========================================================================
  // ZONE OF PROXIMAL DEVELOPMENT (VYGOTSKY)
  // =========================================================================
  {
    frameworkId: 'zpd',
    frameworkName: 'Zone of Proximal Development',
    researcher: 'Vygotsky',
    year: 1978,
    dimensions: [
      {
        dimensionId: 'scaffolding_responsiveness',
        dimensionName: 'Scaffolding Responsiveness',
        description: 'Benefits from guided support',
        dataPoints: [
          { source: 'socratic', field: 'overallAssessment.understandingLevel', weight: 0.40, transform: transforms.understandingToScore, description: 'Understanding progression with help' },
          { source: 'teach', field: 'respondsToConfusion', weight: 0.30, transform: transforms.boolToScore, description: 'Adapts to learner needs' },
          { source: 'profile', field: 'metacognitive_indicators.helpSeekingPattern', weight: 0.30, transform: transforms.helpSeekingToScore, description: 'Appropriate help-seeking' },
        ],
      },
      {
        dimensionId: 'independence_growth',
        dimensionName: 'Independence Growth',
        description: 'Moving from assisted to independent performance',
        dataPoints: [
          { source: 'socratic', field: 'metacognition.selfCorrectionCount', weight: 0.30, transform: transforms.countToScore, description: 'Self-corrects without prompting' },
          { source: 'profile', field: 'behavioral_patterns.hintUsageRate', weight: 0.35, transform: transforms.invert, description: 'Decreasing hint reliance' },
          { source: 'profile', field: 'cognitive_indicators.expertiseLevel', weight: 0.35, transform: transforms.expertiseToScore, description: 'Growing expertise' },
        ],
      },
    ],
  },

  // =========================================================================
  // EPISTEMIC MARKERS (HOLMES)
  // =========================================================================
  {
    frameworkId: 'epistemic',
    frameworkName: 'Epistemic Markers',
    researcher: 'Holmes',
    year: 1984,
    dimensions: [
      {
        dimensionId: 'certainty_expression',
        dimensionName: 'Certainty Expression',
        description: 'How certainty is communicated',
        dataPoints: [
          { source: 'socratic', field: 'confidence.certaintyRate', weight: 0.50, transform: transforms.identity, description: 'Certainty marker usage' },
          { source: 'socratic', field: 'confidence.certaintyMarkers', weight: 0.50, transform: (v) => Array.isArray(v) ? Math.min(1, v.length / 5) : 0, description: 'Variety of certainty expressions' },
        ],
      },
      {
        dimensionId: 'hedging_behavior',
        dimensionName: 'Hedging Behavior',
        description: 'Appropriate use of uncertainty language',
        dataPoints: [
          { source: 'socratic', field: 'confidence.hedgingRate', weight: 0.50, transform: transforms.identity, description: 'Hedging marker usage' },
          { source: 'socratic', field: 'confidence.hedgingMarkers', weight: 0.50, transform: (v) => Array.isArray(v) ? Math.min(1, v.length / 5) : 0, description: 'Variety of hedging expressions' },
        ],
      },
    ],
  },

  // =========================================================================
  // PROTÉGÉ EFFECT (BARGH & SCHUL)
  // =========================================================================
  {
    frameworkId: 'protege',
    frameworkName: 'Protégé Effect (Learning by Teaching)',
    researcher: 'Bargh & Schul',
    year: 1980,
    dimensions: [
      {
        dimensionId: 'teaching_effectiveness',
        dimensionName: 'Teaching Effectiveness',
        description: 'Quality of teaching others',
        dataPoints: [
          { source: 'teach', field: 'explanationClarity', weight: 0.25, transform: transforms.identity, description: 'Clarity of explanations' },
          { source: 'teach', field: 'explanationCompleteness', weight: 0.20, transform: transforms.identity, description: 'Completeness of coverage' },
          { source: 'teach', field: 'structureQuality', weight: 0.20, transform: transforms.identity, description: 'Logical structure' },
          { source: 'teach', field: 'checksForUnderstanding', weight: 0.20, transform: transforms.boolToScore, description: 'Checks learner understanding' },
          { source: 'teach', field: 'encouragementProvided', weight: 0.15, transform: transforms.boolToScore, description: 'Provides encouragement' },
        ],
      },
      {
        dimensionId: 'knowledge_consolidation',
        dimensionName: 'Knowledge Consolidation',
        description: 'Deepened understanding through teaching',
        dataPoints: [
          { source: 'teach', field: 'conceptualAccuracy', weight: 0.35, transform: transforms.identity, description: 'Accuracy of concepts taught' },
          { source: 'teach', field: 'correctsOwnMistakes', weight: 0.30, transform: transforms.boolToScore, description: 'Self-corrects while teaching' },
          { source: 'teach', field: 'anticipatesQuestions', weight: 0.35, transform: transforms.boolToScore, description: 'Anticipates learner questions' },
        ],
      },
    ],
  },

  // =========================================================================
  // INQUIRY-BASED LEARNING
  // =========================================================================
  {
    frameworkId: 'inquiry',
    frameworkName: 'Inquiry-Based Learning',
    researcher: 'Pedaste et al.',
    year: 2015,
    dimensions: [
      {
        dimensionId: 'question_quality',
        dimensionName: 'Question Quality',
        description: 'Quality and depth of questions asked',
        dataPoints: [
          { source: 'freeform', field: 'questionDepth', weight: 0.35, transform: (v) => v === 'deep' ? 1 : v === 'intermediate' ? 0.6 : 0.3, description: 'Depth of questions' },
          { source: 'freeform', field: 'questionClarity', weight: 0.30, transform: transforms.identity, description: 'Clarity of questions' },
          { source: 'freeform', field: 'questionRelevance', weight: 0.35, transform: transforms.identity, description: 'Relevance of questions' },
        ],
      },
      {
        dimensionId: 'curiosity_driven',
        dimensionName: 'Curiosity-Driven Exploration',
        description: 'Self-directed inquiry and exploration',
        dataPoints: [
          { source: 'freeform', field: 'curiosityLevel', weight: 0.35, transform: transforms.identity, description: 'Overall curiosity level' },
          { source: 'freeform', field: 'followUpBehavior', weight: 0.35, transform: (v) => v === 'proactive' ? 1 : v === 'reactive' ? 0.5 : 0.2, description: 'Follow-up behavior' },
          { source: 'freeform', field: 'examplesSought', weight: 0.30, transform: transforms.boolToScore, description: 'Seeks examples and elaboration' },
        ],
      },
    ],
  },
]

// ============================================================================
// Score Calculation Functions
// ============================================================================

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Calculate behavioral framework scores from available data
 */
export function calculateBehavioralFrameworkScores(
  socraticExtractions: ExtractionResult[],
  teachPsychometrics: TeachingPsychometrics[],
  freeformPsychometrics: ConversationalPsychometrics[],
  practiceStats: { avgAccuracy: number; totalAttempts: number } | null,
  profile: InverseProfile | null
): BehavioralFrameworkScores {
  const result: BehavioralFrameworkScores = {
    computedAt: new Date().toISOString(),
    totalDataPoints: 0,
    frameworks: {},
  }

  // Aggregate socratic extractions
  const aggregatedSocratic: Record<string, unknown> = {}
  if (socraticExtractions.length > 0) {
    // Average numeric values, take latest for others
    const latest = socraticExtractions[socraticExtractions.length - 1]
    aggregatedSocratic.understanding = {
      explanationQuality: socraticExtractions.reduce((s, e) => s + e.understanding.explanationQuality, 0) / socraticExtractions.length,
      elaborationDepth: socraticExtractions.reduce((s, e) => s + e.understanding.elaborationDepth, 0) / socraticExtractions.length,
      abstractionLevel: socraticExtractions.reduce((s, e) => s + e.understanding.abstractionLevel, 0) / socraticExtractions.length,
      proceduralConceptualRatio: socraticExtractions.reduce((s, e) => s + e.understanding.proceduralConceptualRatio, 0) / socraticExtractions.length,
      conceptualConnections: socraticExtractions.reduce((s, e) => s + e.understanding.conceptualConnections, 0),
    }
    aggregatedSocratic.confidence = {
      hedgingRate: socraticExtractions.reduce((s, e) => s + e.confidence.hedgingRate, 0) / socraticExtractions.length,
      certaintyRate: socraticExtractions.reduce((s, e) => s + e.confidence.certaintyRate, 0) / socraticExtractions.length,
      hedgingMarkers: socraticExtractions.flatMap(e => e.confidence.hedgingMarkers),
      certaintyMarkers: socraticExtractions.flatMap(e => e.confidence.certaintyMarkers),
      isOverconfident: latest.confidence.isOverconfident,
      isUnderconfident: latest.confidence.isUnderconfident,
    }
    aggregatedSocratic.metacognition = {
      selfCorrectionCount: socraticExtractions.reduce((s, e) => s + e.metacognition.selfCorrectionCount, 0),
      boundaryAwareness: socraticExtractions.reduce((s, e) => s + e.metacognition.boundaryAwareness, 0) / socraticExtractions.length,
      questionQuality: latest.metacognition.questionQuality,
      reflectionCount: socraticExtractions.reduce((s, e) => s + e.metacognition.reflectionCount, 0),
      monitoringCount: socraticExtractions.reduce((s, e) => s + e.metacognition.monitoringCount, 0),
      strategyVerbalization: socraticExtractions.some(e => e.metacognition.strategyVerbalization),
    }
    aggregatedSocratic.reasoning = {
      reasoningStyle: latest.reasoning.reasoningStyle,
      logicalChainLength: Math.max(...socraticExtractions.map(e => e.reasoning.logicalChainLength)),
      causalReasoningPresent: socraticExtractions.some(e => e.reasoning.causalReasoningPresent),
      divergentThinkingCount: socraticExtractions.reduce((s, e) => s + e.reasoning.divergentThinkingCount, 0),
    }
    aggregatedSocratic.engagement = {
      engagementLevel: latest.engagement.engagementLevel,
      curiositySignals: socraticExtractions.flatMap(e => e.engagement.curiositySignals),
      frustrationSignals: socraticExtractions.flatMap(e => e.engagement.frustrationSignals),
      masteryOrientation: socraticExtractions.some(e => e.engagement.masteryOrientation),
      persistenceIndicator: socraticExtractions.some(e => e.engagement.persistenceIndicator),
    }
    aggregatedSocratic.insightsDetected = socraticExtractions.flatMap(e => e.insightsDetected)
    aggregatedSocratic.overallAssessment = latest.overallAssessment
  }

  // Aggregate teach psychometrics
  const aggregatedTeach: Record<string, unknown> = {}
  if (teachPsychometrics.length > 0) {
    const latest = teachPsychometrics[teachPsychometrics.length - 1]
    aggregatedTeach.explanationClarity = teachPsychometrics.reduce((s, e) => s + e.explanationClarity, 0) / teachPsychometrics.length
    aggregatedTeach.explanationCompleteness = teachPsychometrics.reduce((s, e) => s + e.explanationCompleteness, 0) / teachPsychometrics.length
    aggregatedTeach.usesExamples = teachPsychometrics.some(e => e.usesExamples)
    aggregatedTeach.usesAnalogies = teachPsychometrics.some(e => e.usesAnalogies)
    aggregatedTeach.structureQuality = teachPsychometrics.reduce((s, e) => s + e.structureQuality, 0) / teachPsychometrics.length
    aggregatedTeach.conceptualAccuracy = teachPsychometrics.reduce((s, e) => s + e.conceptualAccuracy, 0) / teachPsychometrics.length
    aggregatedTeach.respondsToConfusion = teachPsychometrics.some(e => e.respondsToConfusion)
    aggregatedTeach.simplifiesWhenNeeded = teachPsychometrics.some(e => e.simplifiesWhenNeeded)
    aggregatedTeach.elaboratesWhenAsked = teachPsychometrics.some(e => e.elaboratesWhenAsked)
    aggregatedTeach.anticipatesQuestions = teachPsychometrics.some(e => e.anticipatesQuestions)
    aggregatedTeach.patienceLevel = teachPsychometrics.reduce((s, e) => s + e.patienceLevel, 0) / teachPsychometrics.length
    aggregatedTeach.checksForUnderstanding = teachPsychometrics.some(e => e.checksForUnderstanding)
    aggregatedTeach.encouragementProvided = teachPsychometrics.some(e => e.encouragementProvided)
    aggregatedTeach.correctsOwnMistakes = teachPsychometrics.some(e => e.correctsOwnMistakes)
    aggregatedTeach.distinguishesFactFromOpinion = teachPsychometrics.some(e => e.distinguishesFactFromOpinion)
  }

  // Aggregate freeform psychometrics
  const aggregatedFreeform: Record<string, unknown> = {}
  if (freeformPsychometrics.length > 0) {
    const latest = freeformPsychometrics[freeformPsychometrics.length - 1]
    aggregatedFreeform.questionDepth = latest.questionDepth
    aggregatedFreeform.questionClarity = freeformPsychometrics.reduce((s, e) => s + e.questionClarity, 0) / freeformPsychometrics.length
    aggregatedFreeform.questionRelevance = freeformPsychometrics.reduce((s, e) => s + e.questionRelevance, 0) / freeformPsychometrics.length
    aggregatedFreeform.showsPrerequisiteKnowledge = freeformPsychometrics.some(e => e.showsPrerequisiteKnowledge)
    aggregatedFreeform.understandingIndicators = freeformPsychometrics.flatMap(e => e.understandingIndicators)
    aggregatedFreeform.confusionIndicators = freeformPsychometrics.flatMap(e => e.confusionIndicators)
    aggregatedFreeform.insightMoments = freeformPsychometrics.flatMap(e => e.insightMoments)
    aggregatedFreeform.curiosityLevel = freeformPsychometrics.reduce((s, e) => s + e.curiosityLevel, 0) / freeformPsychometrics.length
    aggregatedFreeform.engagementLevel = latest.engagementLevel
    aggregatedFreeform.followUpBehavior = latest.followUpBehavior
    aggregatedFreeform.selfAwarenessShown = freeformPsychometrics.some(e => e.selfAwarenessShown)
    aggregatedFreeform.boundaryRecognition = freeformPsychometrics.some(e => e.boundaryRecognition)
    aggregatedFreeform.examplesSought = freeformPsychometrics.some(e => e.examplesSought)
  }

  // Build data sources map
  const dataSources: Record<string, Record<string, unknown>> = {
    socratic: aggregatedSocratic,
    teach: aggregatedTeach,
    freeform: aggregatedFreeform,
    practice: practiceStats ? { avgAccuracy: practiceStats.avgAccuracy, totalAttempts: practiceStats.totalAttempts } : {},
    profile: profile ? {
      cognitive_indicators: profile.cognitive_indicators,
      metacognitive_indicators: profile.metacognitive_indicators,
      motivational_indicators: profile.motivational_indicators,
      behavioral_patterns: profile.behavioral_patterns,
    } : {},
  }

  // Calculate scores for each framework
  for (const framework of FRAMEWORK_MAPPINGS) {
    const frameworkResult: BehavioralFrameworkScores['frameworks'][string] = {
      overallScore: null,
      confidence: 0,
      dimensions: {},
    }

    let totalFrameworkWeight = 0
    let weightedScoreSum = 0
    let totalDataPointsUsed = 0

    for (const dimension of framework.dimensions) {
      const dimensionResult: typeof frameworkResult.dimensions[string] = {
        score: null,
        dataPointsUsed: 0,
        breakdown: [],
      }

      let dimensionWeightedSum = 0
      let dimensionTotalWeight = 0

      for (const dataPoint of dimension.dataPoints) {
        const sourceData = dataSources[dataPoint.source]
        const rawValue = getNestedValue(sourceData, dataPoint.field)

        if (rawValue !== undefined) {
          const transform = dataPoint.transform || transforms.identity
          const normalizedValue = transform(rawValue)
          const contribution = normalizedValue * dataPoint.weight

          dimensionResult.breakdown.push({
            source: dataPoint.source,
            field: dataPoint.field,
            rawValue,
            normalizedValue,
            weight: dataPoint.weight,
            contribution,
          })

          dimensionWeightedSum += contribution
          dimensionTotalWeight += dataPoint.weight
          dimensionResult.dataPointsUsed++
          result.totalDataPoints++
          totalDataPointsUsed++
        }
      }

      // Calculate dimension score if we have data
      if (dimensionTotalWeight > 0) {
        dimensionResult.score = dimensionWeightedSum / dimensionTotalWeight
        weightedScoreSum += dimensionResult.score
        totalFrameworkWeight++
      }

      frameworkResult.dimensions[dimension.dimensionId] = dimensionResult
    }

    // Calculate overall framework score
    if (totalFrameworkWeight > 0) {
      frameworkResult.overallScore = Math.round((weightedScoreSum / totalFrameworkWeight) * 100)
      // Confidence based on data coverage
      const possibleDataPoints = framework.dimensions.reduce((s, d) => s + d.dataPoints.length, 0)
      frameworkResult.confidence = Math.min(1, totalDataPointsUsed / possibleDataPoints)
    }

    result.frameworks[framework.frameworkId] = frameworkResult
  }

  return result
}

/**
 * Get the mapping definition for a specific framework
 */
export function getFrameworkMapping(frameworkId: string): FrameworkMapping | undefined {
  return FRAMEWORK_MAPPINGS.find(f => f.frameworkId === frameworkId)
}

/**
 * Get all framework IDs that have mappings
 */
export function getMappedFrameworkIds(): string[] {
  return FRAMEWORK_MAPPINGS.map(f => f.frameworkId)
}

/**
 * Generate a human-readable explanation of how a framework score was calculated
 */
export function explainFrameworkScore(
  frameworkId: string,
  scores: BehavioralFrameworkScores
): string {
  const framework = getFrameworkMapping(frameworkId)
  if (!framework) return 'Framework not found'

  const frameworkScores = scores.frameworks[frameworkId]
  if (!frameworkScores || frameworkScores.overallScore === null) {
    return `Insufficient data to calculate ${framework.frameworkName} score. Need more dialogue or practice activity.`
  }

  const lines: string[] = [
    `**${framework.frameworkName}** (${framework.researcher}, ${framework.year})`,
    `Overall Score: ${frameworkScores.overallScore}% (Confidence: ${Math.round(frameworkScores.confidence * 100)}%)`,
    '',
    'Dimension Breakdown:',
  ]

  for (const dimension of framework.dimensions) {
    const dimScores = frameworkScores.dimensions[dimension.dimensionId]
    if (!dimScores) continue

    const scoreStr = dimScores.score !== null ? `${Math.round(dimScores.score * 100)}%` : 'N/A'
    lines.push(`\n**${dimension.dimensionName}**: ${scoreStr}`)
    lines.push(`  ${dimension.description}`)

    if (dimScores.breakdown.length > 0) {
      lines.push('  Data points used:')
      for (const bp of dimScores.breakdown) {
        const dataPointDef = dimension.dataPoints.find(dp => dp.source === bp.source && dp.field === bp.field)
        lines.push(`    - ${dataPointDef?.description || bp.field}: ${Math.round(bp.normalizedValue * 100)}% (weight: ${Math.round(bp.weight * 100)}%)`)
      }
    }
  }

  return lines.join('\n')
}
