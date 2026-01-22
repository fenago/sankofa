// Bloom's Taxonomy levels (Revised 2001)
export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

export const BLOOM_DESCRIPTIONS: Record<BloomLevel, string> = {
  1: 'Recall facts and basic concepts',
  2: 'Explain ideas or concepts',
  3: 'Use information in new situations',
  4: 'Draw connections among ideas',
  5: 'Justify a decision or course of action',
  6: 'Produce new or original work',
}

// Assessment types for skills
export type AssessmentType = 'formative' | 'summative' | 'performance' | 'diagnostic' | 'peer'

// Suggested assessment with Bloom's alignment
export interface SuggestedAssessment {
  type: AssessmentType
  description: string
  bloomAlignment: BloomLevel[]
}

// Skill/Concept node extracted from content
export interface SkillNode {
  id: string
  name: string
  description: string
  notebookId: string

  // Bloom's Taxonomy
  bloomLevel: BloomLevel
  secondaryBloomLevels?: BloomLevel[]

  // Effort estimation
  estimatedMinutes?: number
  difficulty?: number // 1-10

  // Item Response Theory (IRT) - 3PL model parameters
  irt?: {
    difficulty: number // b parameter: -3 to +3 (higher = harder)
    discrimination: number // a parameter: 0.5 to 2.5 (higher = better differentiates ability)
    guessing: number // c parameter: 0 to 0.5 (probability of guessing correctly)
  }

  // Threshold concepts (transformative, troublesome knowledge)
  isThresholdConcept: boolean
  thresholdProperties?: {
    unlocksDomains?: string[]
    troublesomeAspects?: string[]
  }

  // Cognitive load (from Cognitive Load Theory)
  cognitiveLoadEstimate?: 'low' | 'medium' | 'high'
  chunksRequired?: number // Working memory slots needed
  elementInteractivity?: 'low' | 'medium' | 'high' // How many elements must be processed simultaneously

  // Mastery & Assessment (from Mastery Learning research)
  masteryThreshold?: number // Default 0.80, threshold concepts 0.90
  assessmentTypes?: AssessmentType[]
  suggestedAssessments?: SuggestedAssessment[]

  // Spaced Repetition (from Ebbinghaus forgetting curve research)
  reviewIntervals?: number[] // Days: [1, 3, 7, 14, 30, 60]

  // Common Issues (for proactive teaching)
  commonMisconceptions?: string[]

  // Transfer (where else this skill applies)
  transferDomains?: string[]

  // Scaffolding levels (fading support from Instructional Scaffolding research)
  scaffoldingLevels?: {
    level1: string // Full worked examples
    level2: string // Partial solutions
    level3: string // Hints on request
    level4: string // Independent practice
  }

  // Categorization
  keywords: string[]
  domain?: string
  subdomain?: string

  // Metadata
  sourceDocumentId?: string
  createdAt: number
  updatedAt: number
}

// Prerequisite relationship between skills
export interface PrerequisiteRelationship {
  fromSkillId: string
  toSkillId: string
  strength: 'required' | 'recommended' | 'helpful'
  confidenceScore: number // 0-1
  reasoning?: string
  inferenceMethod?: 'llm_extracted' | 'llm_inferred' | 'semantic_similarity' | 'bloom_heuristic' | 'keyword_overlap'
}

// Extracted from relationship (skill to content source)
export interface ExtractedFromRelationship {
  skillId: string
  sourceId: string
  confidence: number
  extractedAt: number
  textSpan?: string // The specific text that led to extraction
}

// Entity node for general knowledge graph
export interface EntityNode {
  id: string
  name: string
  type: 'concept' | 'person' | 'event' | 'place' | 'term' | 'other'
  description?: string
  notebookId: string
  sourceDocumentId?: string
  createdAt: number
}

// Relationship between entities
export interface EntityRelationship {
  fromEntityId: string
  toEntityId: string
  type: string // e.g., 'related_to', 'part_of', 'causes', 'precedes'
  description?: string
  confidence: number
}

// Learner's mastery state for a skill (BKT-based)
export interface LearnerSkillState {
  learnerId: string
  skillId: string

  // Bayesian Knowledge Tracing
  pMastery: number // P(mastery) - 0 to 1
  bktParams: {
    pL0: number // Prior probability of mastery (default: 0.0)
    pT: number // Probability of learning/transition (default: 0.1)
    pS: number // Probability of slip (default: 0.1)
    pG: number // Probability of guess (default: 0.2)
  }

  // Mastery status
  masteryStatus: 'not_started' | 'learning' | 'mastered'
  masteryThreshold: number // 0.8 regular, 0.9 threshold concepts

  // Practice history
  totalAttempts: number
  correctAttempts: number
  consecutiveSuccesses: number

  // Spaced repetition (SM-2 algorithm)
  spacedRepetition: {
    easeFactor: number // Default: 2.5, min: 1.3
    interval: number // Days until next review
    nextReviewAt: number | null // Timestamp
    repetitions: number
  }

  // Current scaffold level (1-4, fades as mastery increases)
  currentScaffoldLevel: 1 | 2 | 3 | 4

  updatedAt: number
}

// Zone of Proximal Development skill
export interface ZPDSkill {
  skill: SkillNode
  readinessScore: number // 0-1 based on prerequisite mastery
  prerequisitesMastered: string[]
  prerequisitesPending: string[]
}

// Learning path to a goal skill
export interface LearningPath {
  goalSkillId: string
  skills: SkillNode[]
  totalEstimatedMinutes: number
  currentPosition: number // Index of where learner is
}

// Graph extraction result from LLM
export interface GraphExtractionResult {
  skills: SkillNode[]
  prerequisites: PrerequisiteRelationship[]
  entities: EntityNode[]
  entityRelationships: EntityRelationship[]
  existingSkillReferences?: string[] // IDs of existing skills referenced
}

// Cross-document link inference result
export interface CrossDocumentLink {
  fromSkillId: string
  toSkillId: string
  inferenceMethod: 'semantic_similarity' | 'bloom_heuristic' | 'keyword_overlap'
  confidence: number
  reasoning: string
}
