/**
 * Desirable Difficulties Implementation
 * Based on Bjork & Bjork research (d=0.5-0.8 effect sizes)
 *
 * Core principles:
 * 1. Interleaving - Mix topics instead of blocking
 * 2. Spacing - Already implemented via SM-2
 * 3. Retrieval Practice - Testing > re-reading
 * 4. Variation - Vary problem contexts/formats
 */

export interface Skill {
  id: string
  name: string
  bloomLevel: number
  difficulty: number
  pMastery?: number
  lastPracticed?: Date
  interleaveCount?: number
}

export interface InterleavedSession {
  questions: InterleavedQuestion[]
  skillMixRatio: Record<string, number>
  blockingPrevented: number
  estimatedRetentionBoost: number
}

export interface InterleavedQuestion {
  questionId: string
  skillId: string
  skillName: string
  position: number
  previousSkillId: string | null
  isSwitchPoint: boolean
}

export interface VariationConfig {
  enableContextVariation: boolean
  enableFormatVariation: boolean
  enableDifficultyVariation: boolean
  variationStrength: number  // 0-1, how different variations should be
}

export type VariationType = 'context' | 'format' | 'numerical' | 'phrasing'

export interface VariedQuestion {
  originalQuestion: string
  variedQuestion: string
  variationType: VariationType
  variationDescription: string
}

// ============ Interleave Scheduler ============

/**
 * Generate an interleaved practice session
 * Instead of AAABBBCCC (blocked), creates ABCBACBCA (interleaved)
 */
export function generateInterleavedSession(
  skills: Skill[],
  questionsPerSkill: number,
  totalQuestions?: number
): InterleavedSession {
  const total = totalQuestions || skills.length * questionsPerSkill

  // Create question pool
  const pool: { skillId: string; skillName: string; index: number }[] = []
  skills.forEach(skill => {
    for (let i = 0; i < questionsPerSkill; i++) {
      pool.push({
        skillId: skill.id,
        skillName: skill.name,
        index: i,
      })
    }
  })

  // Shuffle with constraint: avoid same skill twice in a row when possible
  const interleaved = intelligentShuffle(pool, total)

  // Calculate mix ratio
  const skillCounts: Record<string, number> = {}
  interleaved.forEach(q => {
    skillCounts[q.skillId] = (skillCounts[q.skillId] || 0) + 1
  })

  // Count blocking that was prevented
  let blockingPrevented = 0
  let previousSkillId: string | null = null
  interleaved.forEach(q => {
    if (previousSkillId === q.skillId) {
      blockingPrevented++
    }
    previousSkillId = q.skillId
  })

  // Build result
  const questions: InterleavedQuestion[] = interleaved.map((q, i) => ({
    questionId: `${q.skillId}-${q.index}`,
    skillId: q.skillId,
    skillName: q.skillName,
    position: i,
    previousSkillId: i > 0 ? interleaved[i - 1].skillId : null,
    isSwitchPoint: i > 0 && interleaved[i - 1].skillId !== q.skillId,
  }))

  return {
    questions,
    skillMixRatio: Object.fromEntries(
      Object.entries(skillCounts).map(([k, v]) => [k, v / total])
    ),
    blockingPrevented: pool.length - total - blockingPrevented,
    estimatedRetentionBoost: calculateRetentionBoost(questions),
  }
}

/**
 * Intelligent shuffle that minimizes consecutive same-skill questions
 */
function intelligentShuffle<T extends { skillId: string }>(
  items: T[],
  maxItems: number
): T[] {
  const result: T[] = []
  const remaining = [...items]

  while (result.length < maxItems && remaining.length > 0) {
    // Get the previous skill (if any)
    const lastSkillId = result.length > 0 ? result[result.length - 1].skillId : null

    // Find items that are NOT the same skill
    const candidates = remaining.filter(item => item.skillId !== lastSkillId)

    // If no different skills available, use any remaining
    const pool = candidates.length > 0 ? candidates : remaining

    // Random selection from pool
    const randomIndex = Math.floor(Math.random() * pool.length)
    const selected = pool[randomIndex]

    // Add to result and remove from remaining
    result.push(selected)
    const originalIndex = remaining.indexOf(selected)
    remaining.splice(originalIndex, 1)
  }

  return result
}

/**
 * Calculate optimal skill mix ratio based on learner profile
 */
export function calculateOptimalMixRatio(
  skills: Skill[],
  learnerProfile: { preferenceForChallenge: number; attentionSpan: number }
): Record<string, number> {
  const { preferenceForChallenge, attentionSpan } = learnerProfile

  // Skills with lower mastery should get more questions
  const masteryWeights = skills.map(s => {
    const mastery = s.pMastery ?? 0.5
    // Inverse relationship: lower mastery = higher weight
    return { skillId: s.id, weight: 1 - mastery + 0.3 }  // Minimum 0.3
  })

  // Normalize weights
  const totalWeight = masteryWeights.reduce((sum, w) => sum + w.weight, 0)
  const normalized: Record<string, number> = {}

  masteryWeights.forEach(w => {
    normalized[w.skillId] = w.weight / totalWeight
  })

  return normalized
}

/**
 * Estimate retention boost from interleaving
 */
function calculateRetentionBoost(questions: InterleavedQuestion[]): number {
  if (questions.length < 2) return 0

  // Count skill switches
  let switches = 0
  for (let i = 1; i < questions.length; i++) {
    if (questions[i].skillId !== questions[i - 1].skillId) {
      switches++
    }
  }

  // Switch ratio (0 to 1)
  const switchRatio = switches / (questions.length - 1)

  // Estimated boost based on research (up to 30% improvement)
  return switchRatio * 0.3
}

/**
 * Track interleaving effectiveness over time
 */
export function trackInterleavingEffectiveness(
  preInterleavingAccuracy: number,
  postInterleavingAccuracy: number,
  delayDays: number
): { effectSize: number; isEffective: boolean; recommendation: string } {
  // Calculate improvement
  const improvement = postInterleavingAccuracy - preInterleavingAccuracy

  // Adjust for time decay (longer delays show more benefit)
  const timeAdjustedImprovement = improvement * (1 + delayDays * 0.05)

  // Effect size interpretation
  let recommendation: string
  let isEffective: boolean

  if (timeAdjustedImprovement > 0.1) {
    isEffective = true
    recommendation = 'Interleaving is working well. Continue with this approach.'
  } else if (timeAdjustedImprovement > 0) {
    isEffective = true
    recommendation = 'Slight improvement detected. Consider increasing interleave intensity.'
  } else {
    isEffective = false
    recommendation = 'Interleaving may need adjustment. Try smaller topic mixes first.'
  }

  return {
    effectSize: timeAdjustedImprovement,
    isEffective,
    recommendation,
  }
}

// ============ Variation Engine ============

const CONTEXT_VARIATIONS = [
  'real-world application',
  'historical example',
  'everyday situation',
  'professional scenario',
  'scientific context',
  'creative/artistic context',
]

const FORMAT_VARIATIONS = [
  'multiple choice',
  'fill in the blank',
  'true/false',
  'short answer',
  'matching',
  'ordering/sequencing',
]

/**
 * Generate context variation prompts for Gemini
 */
export function generateVariationPrompt(
  originalQuestion: string,
  variationType: VariationType,
  skillContext: string
): string {
  switch (variationType) {
    case 'context':
      const newContext = CONTEXT_VARIATIONS[Math.floor(Math.random() * CONTEXT_VARIATIONS.length)]
      return `Rewrite this question to use a ${newContext} context while testing the same concept:

Original: ${originalQuestion}
Skill: ${skillContext}

Requirements:
- Keep the same difficulty level
- Test the same underlying concept
- Use the new context naturally
- Maintain clear, unambiguous phrasing`

    case 'format':
      const newFormat = FORMAT_VARIATIONS[Math.floor(Math.random() * FORMAT_VARIATIONS.length)]
      return `Convert this question to ${newFormat} format while testing the same concept:

Original: ${originalQuestion}
Skill: ${skillContext}

Requirements:
- Keep the same difficulty level
- Test the same underlying concept
- Make the new format work naturally
- Provide clear instructions for the new format`

    case 'numerical':
      return `Create a numerical variation of this question with different numbers but the same structure:

Original: ${originalQuestion}
Skill: ${skillContext}

Requirements:
- Change all numerical values
- Keep the same difficulty level
- Ensure the new numbers are realistic
- The solution process should be identical`

    case 'phrasing':
      return `Rephrase this question using different wording while maintaining the same meaning:

Original: ${originalQuestion}
Skill: ${skillContext}

Requirements:
- Keep exact same meaning
- Use different vocabulary/syntax
- Maintain same difficulty
- Ensure clarity is preserved or improved`
  }
}

/**
 * Select appropriate variation type based on skill and history
 */
export function selectVariationType(
  skill: Skill,
  previousVariations: VariationType[]
): VariationType {
  const allTypes: VariationType[] = ['context', 'format', 'numerical', 'phrasing']

  // Avoid recently used variations
  const recentlyUsed = new Set(previousVariations.slice(-3))
  const available = allTypes.filter(t => !recentlyUsed.has(t))

  // If all recently used, allow any
  const pool = available.length > 0 ? available : allTypes

  // Weight based on skill characteristics
  const weights: Record<VariationType, number> = {
    context: skill.bloomLevel >= 3 ? 2 : 1,      // Higher Bloom = more context variation
    format: 1,                                    // Always useful
    numerical: skill.difficulty > 0.5 ? 1.5 : 1, // Harder skills benefit from numerical practice
    phrasing: skill.pMastery && skill.pMastery > 0.7 ? 1.5 : 1, // High mastery can handle rephrasing
  }

  // Weighted random selection
  const totalWeight = pool.reduce((sum, t) => sum + weights[t], 0)
  let random = Math.random() * totalWeight

  for (const type of pool) {
    random -= weights[type]
    if (random <= 0) return type
  }

  return pool[0]
}

// ============ Retrieval Booster ============

/**
 * Generate retrieval practice prompts from content
 * (Testing > re-reading for long-term retention)
 */
export function generateRetrievalPrompts(
  skillName: string,
  keyConcepts: string[],
  previousAttempts: number
): string[] {
  const prompts: string[] = []

  // Start with basic recall
  if (previousAttempts < 3) {
    prompts.push(`Without looking at your notes, what are the key points about ${skillName}?`)
    prompts.push(`Explain ${skillName} in your own words.`)
  }

  // Progress to application
  if (previousAttempts >= 3 && previousAttempts < 6) {
    prompts.push(`Give an example of ${skillName} in practice.`)
    prompts.push(`How would you use ${skillName} to solve a real problem?`)
  }

  // Then to connection/elaboration
  if (previousAttempts >= 6) {
    prompts.push(`How does ${skillName} connect to other concepts you've learned?`)
    prompts.push(`What would happen if ${skillName} didn't exist or work differently?`)
    prompts.push(`Teach ${skillName} to someone who has never heard of it.`)
  }

  // Add concept-specific prompts
  keyConcepts.forEach(concept => {
    prompts.push(`What is the role of "${concept}" in ${skillName}?`)
  })

  return prompts
}

/**
 * Measure retrieval strength based on response quality
 */
export function measureRetrievalStrength(
  responseTimeMs: number,
  isCorrect: boolean,
  confidenceRating: number,  // 1-5
  hintsUsed: number
): number {
  // Base score from correctness
  let strength = isCorrect ? 0.6 : 0.2

  // Faster correct responses = stronger retrieval
  if (isCorrect && responseTimeMs < 10000) {
    strength += 0.15
  } else if (isCorrect && responseTimeMs < 30000) {
    strength += 0.1
  }

  // High confidence correct = strong retrieval
  if (isCorrect && confidenceRating >= 4) {
    strength += 0.15
  } else if (isCorrect && confidenceRating >= 3) {
    strength += 0.05
  }

  // Penalty for hints
  strength -= hintsUsed * 0.1

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, strength))
}

/**
 * Determine if retrieval practice is more beneficial than re-study
 */
export function shouldUseRetrieval(
  currentMastery: number,
  lastRetrievalTest: Date | null,
  attemptCount: number
): { useRetrieval: boolean; reason: string } {
  // New skills: some re-study first
  if (attemptCount < 2) {
    return {
      useRetrieval: false,
      reason: 'Initial learning phase - building foundational knowledge',
    }
  }

  // Haven't done retrieval recently
  if (!lastRetrievalTest) {
    return {
      useRetrieval: true,
      reason: 'Retrieval practice not yet attempted - high potential benefit',
    }
  }

  const daysSinceRetrieval = (Date.now() - lastRetrievalTest.getTime()) / (1000 * 60 * 60 * 24)

  // Regular retrieval for moderate mastery
  if (currentMastery >= 0.4 && currentMastery <= 0.8 && daysSinceRetrieval > 1) {
    return {
      useRetrieval: true,
      reason: 'Optimal mastery range for retrieval practice benefits',
    }
  }

  // High mastery needs spacing before retrieval
  if (currentMastery > 0.8 && daysSinceRetrieval < 3) {
    return {
      useRetrieval: false,
      reason: 'High mastery - spacing before next retrieval test',
    }
  }

  // Default: retrieval is generally beneficial
  return {
    useRetrieval: true,
    reason: 'Regular retrieval practice maintains long-term retention',
  }
}
