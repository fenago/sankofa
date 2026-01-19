/**
 * Learner State Management for Neo4J
 *
 * Implements:
 * - Bayesian Knowledge Tracing (BKT) for mastery estimation
 * - SM-2 Spaced Repetition algorithm for review scheduling
 * - Scaffolding level progression
 */

import { runQuery, runWriteTransaction } from './neo4j'
import type { LearnerSkillState, SkillNode } from '@/lib/types/graph'

// Neo4J Node type
interface Neo4JNode<T> {
  identity: { low: number; high: number }
  labels: string[]
  properties: T
}

// Helper to extract properties from Neo4J node
function extractProperties<T>(node: Neo4JNode<T> | T): T {
  if (node && typeof node === 'object' && 'properties' in node) {
    return (node as Neo4JNode<T>).properties
  }
  return node as T
}

// ============================================================================
// BKT (Bayesian Knowledge Tracing) Algorithm
// ============================================================================

/**
 * Default BKT parameters (can be calibrated per skill)
 */
export const DEFAULT_BKT_PARAMS = {
  pL0: 0.0,   // Prior probability of mastery
  pT: 0.1,    // Probability of learning (transitioning to mastered)
  pS: 0.1,    // Probability of slip (making error despite mastery)
  pG: 0.2,    // Probability of guess (correct despite not mastered)
}

/**
 * Update P(mastery) using Bayesian Knowledge Tracing
 * Based on: Corbett & Anderson (1994)
 *
 * @param currentPMastery Current P(mastery)
 * @param isCorrect Whether the learner answered correctly
 * @param params BKT parameters
 * @returns Updated P(mastery)
 */
export function updateBKT(
  currentPMastery: number,
  isCorrect: boolean,
  params: typeof DEFAULT_BKT_PARAMS = DEFAULT_BKT_PARAMS
): number {
  const { pT, pS, pG } = params

  // P(correct | mastered) = 1 - pS
  // P(correct | not mastered) = pG
  const pCorrectGivenMastered = 1 - pS
  const pCorrectGivenNotMastered = pG

  if (isCorrect) {
    // Bayesian update for correct response
    // P(mastered | correct) = P(correct | mastered) * P(mastered) / P(correct)
    const pCorrect =
      pCorrectGivenMastered * currentPMastery +
      pCorrectGivenNotMastered * (1 - currentPMastery)

    const pMasteredGivenCorrect = (pCorrectGivenMastered * currentPMastery) / pCorrect

    // Apply learning transition
    // Even if not yet mastered, there's a chance they learned from this attempt
    return pMasteredGivenCorrect + (1 - pMasteredGivenCorrect) * pT
  } else {
    // Bayesian update for incorrect response
    // P(mastered | incorrect) = P(incorrect | mastered) * P(mastered) / P(incorrect)
    const pIncorrect =
      pS * currentPMastery +
      (1 - pG) * (1 - currentPMastery)

    const pMasteredGivenIncorrect = (pS * currentPMastery) / pIncorrect

    // Apply learning transition
    return pMasteredGivenIncorrect + (1 - pMasteredGivenIncorrect) * pT
  }
}

/**
 * Calculate probability of correct response given current mastery
 * Useful for predicting performance
 */
export function predictCorrectProbability(
  pMastery: number,
  params: typeof DEFAULT_BKT_PARAMS = DEFAULT_BKT_PARAMS
): number {
  const { pS, pG } = params
  return (1 - pS) * pMastery + pG * (1 - pMastery)
}

// ============================================================================
// SM-2 Spaced Repetition Algorithm
// ============================================================================

/**
 * SM-2 Algorithm result
 */
interface SM2Result {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewAt: number
}

/**
 * Update spaced repetition schedule using SM-2 algorithm
 * Based on: Pimsleur (1967), Wozniak & Gorzelanczyk (1994)
 *
 * @param currentState Current spaced repetition state
 * @param quality Response quality 0-5 (0-2 = incorrect, 3-5 = correct)
 * @returns Updated SM-2 state
 */
export function updateSM2(
  currentState: LearnerSkillState['spacedRepetition'],
  quality: number // 0-5: 0=complete blackout, 5=perfect recall
): SM2Result {
  // Clamp quality to valid range
  quality = Math.max(0, Math.min(5, Math.round(quality)))

  let { easeFactor, interval, repetitions } = currentState

  // If quality < 3, reset repetitions (failed recall)
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    // Successful recall - update interval
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  }

  // Update ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  // Minimum ease factor is 1.3
  easeFactor = Math.max(1.3, easeFactor)

  // Calculate next review timestamp
  const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewAt,
  }
}

/**
 * Convert BKT response (correct/incorrect) to SM-2 quality (0-5)
 * Uses response time and confidence if available
 */
export function bktToSM2Quality(
  isCorrect: boolean,
  responseTimeMs?: number,
  expectedTimeMs?: number
): number {
  if (!isCorrect) {
    // Incorrect responses: 0-2
    return 1 // Default to "with serious difficulty"
  }

  // Correct responses: 3-5 based on response time
  if (responseTimeMs && expectedTimeMs) {
    const ratio = responseTimeMs / expectedTimeMs
    if (ratio < 0.5) return 5      // Very fast = perfect recall
    if (ratio < 1.0) return 4      // Normal speed = correct with hesitation
    return 3                        // Slow = correct with difficulty
  }

  return 4 // Default for correct without timing data
}

// ============================================================================
// Scaffolding Level Management
// ============================================================================

/**
 * Determine appropriate scaffolding level based on mastery
 * Implements "fading" - gradually removing support as learner improves
 */
export function calculateScaffoldLevel(pMastery: number): 1 | 2 | 3 | 4 {
  if (pMastery < 0.3) return 1      // Full worked examples
  if (pMastery < 0.5) return 2      // Partial solutions
  if (pMastery < 0.7) return 3      // Hints on request
  return 4                           // Independent practice
}

// ============================================================================
// Neo4J Storage Operations
// ============================================================================

/**
 * Create or update learner skill state in Neo4J
 */
export async function upsertLearnerSkillState(
  state: LearnerSkillState
): Promise<void> {
  await runWriteTransaction(async (tx) => {
    await tx.run(
      `
      MERGE (ls:LearnerSkillState {learnerId: $learnerId, skillId: $skillId})
      SET ls.pMastery = $pMastery,
          ls.bktPL0 = $bktPL0,
          ls.bktPT = $bktPT,
          ls.bktPS = $bktPS,
          ls.bktPG = $bktPG,
          ls.masteryStatus = $masteryStatus,
          ls.masteryThreshold = $masteryThreshold,
          ls.totalAttempts = $totalAttempts,
          ls.correctAttempts = $correctAttempts,
          ls.consecutiveSuccesses = $consecutiveSuccesses,
          ls.srEaseFactor = $srEaseFactor,
          ls.srInterval = $srInterval,
          ls.srNextReviewAt = $srNextReviewAt,
          ls.srRepetitions = $srRepetitions,
          ls.currentScaffoldLevel = $currentScaffoldLevel,
          ls.updatedAt = $updatedAt
      `,
      {
        learnerId: state.learnerId,
        skillId: state.skillId,
        pMastery: state.pMastery,
        bktPL0: state.bktParams.pL0,
        bktPT: state.bktParams.pT,
        bktPS: state.bktParams.pS,
        bktPG: state.bktParams.pG,
        masteryStatus: state.masteryStatus,
        masteryThreshold: state.masteryThreshold,
        totalAttempts: state.totalAttempts,
        correctAttempts: state.correctAttempts,
        consecutiveSuccesses: state.consecutiveSuccesses,
        srEaseFactor: state.spacedRepetition.easeFactor,
        srInterval: state.spacedRepetition.interval,
        srNextReviewAt: state.spacedRepetition.nextReviewAt,
        srRepetitions: state.spacedRepetition.repetitions,
        currentScaffoldLevel: state.currentScaffoldLevel,
        updatedAt: state.updatedAt,
      }
    )

    // Create relationship to Skill node
    await tx.run(
      `
      MATCH (ls:LearnerSkillState {learnerId: $learnerId, skillId: $skillId})
      MATCH (s:Skill {id: $skillId})
      MERGE (ls)-[:TRACKS]->(s)
      `,
      { learnerId: state.learnerId, skillId: state.skillId }
    )
  })
}

/**
 * Get learner skill state from Neo4J
 */
export async function getLearnerSkillState(
  learnerId: string,
  skillId: string
): Promise<LearnerSkillState | null> {
  const result = await runQuery<{
    ls: Neo4JNode<{
      learnerId: string
      skillId: string
      pMastery: number
      bktPL0: number
      bktPT: number
      bktPS: number
      bktPG: number
      masteryStatus: 'not_started' | 'learning' | 'mastered'
      masteryThreshold: number
      totalAttempts: number
      correctAttempts: number
      consecutiveSuccesses: number
      srEaseFactor: number
      srInterval: number
      srNextReviewAt: number | null
      srRepetitions: number
      currentScaffoldLevel: 1 | 2 | 3 | 4
      updatedAt: number
    }>
  }>(
    `
    MATCH (ls:LearnerSkillState {learnerId: $learnerId, skillId: $skillId})
    RETURN ls
    `,
    { learnerId, skillId }
  )

  if (result.length === 0) return null

  const props = extractProperties(result[0].ls)
  return {
    learnerId: props.learnerId,
    skillId: props.skillId,
    pMastery: props.pMastery,
    bktParams: {
      pL0: props.bktPL0,
      pT: props.bktPT,
      pS: props.bktPS,
      pG: props.bktPG,
    },
    masteryStatus: props.masteryStatus,
    masteryThreshold: props.masteryThreshold,
    totalAttempts: props.totalAttempts,
    correctAttempts: props.correctAttempts,
    consecutiveSuccesses: props.consecutiveSuccesses,
    spacedRepetition: {
      easeFactor: props.srEaseFactor,
      interval: props.srInterval,
      nextReviewAt: props.srNextReviewAt,
      repetitions: props.srRepetitions,
    },
    currentScaffoldLevel: props.currentScaffoldLevel,
    updatedAt: props.updatedAt,
  }
}

/**
 * Get all learner states for a learner in a notebook
 */
export async function getLearnerStatesByNotebook(
  learnerId: string,
  notebookId: string
): Promise<LearnerSkillState[]> {
  const result = await runQuery<{
    ls: Neo4JNode<{
      learnerId: string
      skillId: string
      pMastery: number
      bktPL0: number
      bktPT: number
      bktPS: number
      bktPG: number
      masteryStatus: 'not_started' | 'learning' | 'mastered'
      masteryThreshold: number
      totalAttempts: number
      correctAttempts: number
      consecutiveSuccesses: number
      srEaseFactor: number
      srInterval: number
      srNextReviewAt: number | null
      srRepetitions: number
      currentScaffoldLevel: 1 | 2 | 3 | 4
      updatedAt: number
    }>
  }>(
    `
    MATCH (ls:LearnerSkillState {learnerId: $learnerId})-[:TRACKS]->(s:Skill {notebookId: $notebookId})
    RETURN ls
    `,
    { learnerId, notebookId }
  )

  return result.map(r => {
    const props = extractProperties(r.ls)
    return {
      learnerId: props.learnerId,
      skillId: props.skillId,
      pMastery: props.pMastery,
      bktParams: {
        pL0: props.bktPL0,
        pT: props.bktPT,
        pS: props.bktPS,
        pG: props.bktPG,
      },
      masteryStatus: props.masteryStatus,
      masteryThreshold: props.masteryThreshold,
      totalAttempts: props.totalAttempts,
      correctAttempts: props.correctAttempts,
      consecutiveSuccesses: props.consecutiveSuccesses,
      spacedRepetition: {
        easeFactor: props.srEaseFactor,
        interval: props.srInterval,
        nextReviewAt: props.srNextReviewAt,
        repetitions: props.srRepetitions,
      },
      currentScaffoldLevel: props.currentScaffoldLevel,
      updatedAt: props.updatedAt,
    }
  })
}

/**
 * Get skills due for review (spaced repetition)
 */
export async function getSkillsDueForReview(
  learnerId: string,
  notebookId: string,
  limit: number = 10
): Promise<{ skill: SkillNode; state: LearnerSkillState }[]> {
  const now = Date.now()

  const result = await runQuery<{
    s: Neo4JNode<SkillNode>
    ls: Neo4JNode<{
      learnerId: string
      skillId: string
      pMastery: number
      bktPL0: number
      bktPT: number
      bktPS: number
      bktPG: number
      masteryStatus: 'not_started' | 'learning' | 'mastered'
      masteryThreshold: number
      totalAttempts: number
      correctAttempts: number
      consecutiveSuccesses: number
      srEaseFactor: number
      srInterval: number
      srNextReviewAt: number | null
      srRepetitions: number
      currentScaffoldLevel: 1 | 2 | 3 | 4
      updatedAt: number
    }>
  }>(
    `
    MATCH (ls:LearnerSkillState {learnerId: $learnerId})-[:TRACKS]->(s:Skill {notebookId: $notebookId})
    WHERE ls.srNextReviewAt IS NOT NULL AND ls.srNextReviewAt <= $now
    RETURN s, ls
    ORDER BY ls.srNextReviewAt ASC
    LIMIT $limit
    `,
    { learnerId, notebookId, now, limit }
  )

  return result.map(r => {
    const skillProps = extractProperties(r.s)
    const stateProps = extractProperties(r.ls)

    return {
      skill: skillProps,
      state: {
        learnerId: stateProps.learnerId,
        skillId: stateProps.skillId,
        pMastery: stateProps.pMastery,
        bktParams: {
          pL0: stateProps.bktPL0,
          pT: stateProps.bktPT,
          pS: stateProps.bktPS,
          pG: stateProps.bktPG,
        },
        masteryStatus: stateProps.masteryStatus,
        masteryThreshold: stateProps.masteryThreshold,
        totalAttempts: stateProps.totalAttempts,
        correctAttempts: stateProps.correctAttempts,
        consecutiveSuccesses: stateProps.consecutiveSuccesses,
        spacedRepetition: {
          easeFactor: stateProps.srEaseFactor,
          interval: stateProps.srInterval,
          nextReviewAt: stateProps.srNextReviewAt,
          repetitions: stateProps.srRepetitions,
        },
        currentScaffoldLevel: stateProps.currentScaffoldLevel,
        updatedAt: stateProps.updatedAt,
      },
    }
  })
}

/**
 * Get mastered skill IDs for a learner in a notebook
 */
export async function getMasteredSkillIds(
  learnerId: string,
  notebookId: string
): Promise<string[]> {
  const result = await runQuery<{ skillId: string }>(
    `
    MATCH (ls:LearnerSkillState {learnerId: $learnerId})-[:TRACKS]->(s:Skill {notebookId: $notebookId})
    WHERE ls.masteryStatus = 'mastered'
    RETURN s.id as skillId
    `,
    { learnerId, notebookId }
  )

  return result.map(r => r.skillId)
}

// ============================================================================
// High-Level Operations
// ============================================================================

/**
 * Create initial learner state for a skill
 */
export function createInitialLearnerState(
  learnerId: string,
  skillId: string,
  masteryThreshold: number = 0.8
): LearnerSkillState {
  return {
    learnerId,
    skillId,
    pMastery: DEFAULT_BKT_PARAMS.pL0,
    bktParams: { ...DEFAULT_BKT_PARAMS },
    masteryStatus: 'not_started',
    masteryThreshold,
    totalAttempts: 0,
    correctAttempts: 0,
    consecutiveSuccesses: 0,
    spacedRepetition: {
      easeFactor: 2.5,
      interval: 0,
      nextReviewAt: null,
      repetitions: 0,
    },
    currentScaffoldLevel: 1,
    updatedAt: Date.now(),
  }
}

/**
 * Record a practice attempt and update all relevant state
 */
export async function recordPracticeAttempt(
  learnerId: string,
  skillId: string,
  isCorrect: boolean,
  masteryThreshold: number = 0.8,
  responseTimeMs?: number,
  expectedTimeMs?: number
): Promise<LearnerSkillState> {
  // Get or create current state
  let state = await getLearnerSkillState(learnerId, skillId)
  if (!state) {
    state = createInitialLearnerState(learnerId, skillId, masteryThreshold)
  }

  // Update BKT
  const newPMastery = updateBKT(state.pMastery, isCorrect, state.bktParams)

  // Update SM-2
  const quality = bktToSM2Quality(isCorrect, responseTimeMs, expectedTimeMs)
  const newSR = updateSM2(state.spacedRepetition, quality)

  // Update practice history
  const newTotalAttempts = state.totalAttempts + 1
  const newCorrectAttempts = state.correctAttempts + (isCorrect ? 1 : 0)
  const newConsecutiveSuccesses = isCorrect ? state.consecutiveSuccesses + 1 : 0

  // Determine mastery status
  let newMasteryStatus: 'not_started' | 'learning' | 'mastered' = state.masteryStatus
  if (newPMastery >= masteryThreshold && newConsecutiveSuccesses >= 3) {
    newMasteryStatus = 'mastered'
  } else if (newTotalAttempts > 0) {
    newMasteryStatus = 'learning'
  }

  // Calculate scaffold level
  const newScaffoldLevel = calculateScaffoldLevel(newPMastery)

  // Build updated state
  const updatedState: LearnerSkillState = {
    ...state,
    pMastery: newPMastery,
    masteryStatus: newMasteryStatus,
    totalAttempts: newTotalAttempts,
    correctAttempts: newCorrectAttempts,
    consecutiveSuccesses: newConsecutiveSuccesses,
    spacedRepetition: newSR,
    currentScaffoldLevel: newScaffoldLevel,
    updatedAt: Date.now(),
  }

  // Persist to Neo4J
  await upsertLearnerSkillState(updatedState)

  return updatedState
}

/**
 * Get learner progress summary for a notebook
 */
export async function getLearnerProgress(
  learnerId: string,
  notebookId: string
): Promise<{
  totalSkills: number
  masteredSkills: number
  learningSkills: number
  notStartedSkills: number
  averageMastery: number
  skillsDueForReview: number
  nextReviewAt: number | null
}> {
  const result = await runQuery<{
    totalSkills: number
    masteredSkills: number
    learningSkills: number
    avgMastery: number
    dueCount: number
    nextReview: number | null
  }>(
    `
    MATCH (s:Skill {notebookId: $notebookId})
    OPTIONAL MATCH (ls:LearnerSkillState {learnerId: $learnerId})-[:TRACKS]->(s)
    WITH s, ls, $now as now
    RETURN
      count(DISTINCT s) as totalSkills,
      count(DISTINCT CASE WHEN ls.masteryStatus = 'mastered' THEN s END) as masteredSkills,
      count(DISTINCT CASE WHEN ls.masteryStatus = 'learning' THEN s END) as learningSkills,
      avg(COALESCE(ls.pMastery, 0)) as avgMastery,
      count(DISTINCT CASE WHEN ls.srNextReviewAt <= now THEN s END) as dueCount,
      min(CASE WHEN ls.srNextReviewAt > now THEN ls.srNextReviewAt END) as nextReview
    `,
    { learnerId, notebookId, now: Date.now() }
  )

  if (result.length === 0) {
    return {
      totalSkills: 0,
      masteredSkills: 0,
      learningSkills: 0,
      notStartedSkills: 0,
      averageMastery: 0,
      skillsDueForReview: 0,
      nextReviewAt: null,
    }
  }

  const r = result[0]
  return {
    totalSkills: r.totalSkills,
    masteredSkills: r.masteredSkills,
    learningSkills: r.learningSkills,
    notStartedSkills: r.totalSkills - r.masteredSkills - r.learningSkills,
    averageMastery: r.avgMastery || 0,
    skillsDueForReview: r.dueCount,
    nextReviewAt: r.nextReview,
  }
}

/**
 * Delete all learner state for a notebook
 */
export async function deleteLearnerStateForNotebook(
  learnerId: string,
  notebookId: string
): Promise<void> {
  await runWriteTransaction(async (tx) => {
    await tx.run(
      `
      MATCH (ls:LearnerSkillState {learnerId: $learnerId})-[:TRACKS]->(s:Skill {notebookId: $notebookId})
      DETACH DELETE ls
      `,
      { learnerId, notebookId }
    )
  })
}
