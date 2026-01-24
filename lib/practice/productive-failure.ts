/**
 * Productive Failure Implementation
 * Based on Kapur (2016, 2024) research (d=0.68 meta-analytic effect)
 *
 * Core principles:
 * 1. Present challenging problem BEFORE instruction
 * 2. Allow struggle (but not frustration)
 * 3. Consolidate learning after attempt
 * 4. Compare failed approaches to correct solution
 */

export interface ExplorationProblem {
  id: string
  skillId: string
  skillName: string
  problem: string
  context: string
  difficulty: number
  targetConcept: string
  commonMisconceptions: string[]
  maxAttempts: number
  frustrationThreshold: number // minutes
}

export interface ExplorationAttempt {
  id: string
  attemptNumber: number
  content: string
  timestamp: Date
  durationMs: number
  category: AttemptCategory
  partialUnderstanding: string[]
  misconceptions: string[]
  creativityScore: number // 0-1, how novel/creative the approach was
}

export type AttemptCategory =
  | 'correct'
  | 'partial_correct'
  | 'creative_wrong' // Wrong but shows good thinking
  | 'common_misconception'
  | 'off_track'
  | 'incomplete'

export interface ExplorationSession {
  id: string
  problem: ExplorationProblem
  attempts: ExplorationAttempt[]
  startTime: Date
  endTime?: Date
  frustrationLevel: number // 0-1
  productiveStruggleScore: number // 0-1
  readyForConsolidation: boolean
  insightMoment?: string
}

export interface ConsolidationData {
  sessionId: string
  whatYouTried: AttemptSummary[]
  keyInsight: string
  correctApproach: WorkedSolution
  whyItWorks: string[]
  connectionToExploration: string[]
  conceptualGain: number // 0-1
}

export interface AttemptSummary {
  attemptNumber: number
  approach: string
  whatWasRight: string[]
  whatWasMissing: string[]
  ledToInsight: boolean
}

export interface WorkedSolution {
  steps: SolutionStep[]
  finalAnswer: string
  keyPrinciples: string[]
}

export interface SolutionStep {
  stepNumber: number
  description: string
  reasoning: string
  commonMistakeHere?: string
}

// ============ Explore-First Generator ============

/**
 * Generate a productive failure exploration problem
 */
export function generateExplorationProblem(
  skillId: string,
  skillName: string,
  concept: string,
  difficulty: number,
  misconceptions: string[]
): ExplorationProblem {
  return {
    id: `explore-${skillId}-${Date.now()}`,
    skillId,
    skillName,
    problem: '', // To be filled by Gemini
    context: '', // To be filled by Gemini
    difficulty,
    targetConcept: concept,
    commonMisconceptions: misconceptions,
    maxAttempts: 3,
    frustrationThreshold: 10, // minutes
  }
}

/**
 * Gemini prompt for generating exploration problems
 */
export function getExplorationProblemPrompt(
  skillName: string,
  concept: string,
  difficulty: number,
  misconceptions: string[]
): string {
  return `Generate a challenging problem for "productive failure" learning about: ${skillName}

Target concept: ${concept}
Difficulty level: ${difficulty}/10

IMPORTANT: This problem is meant for students to attempt BEFORE they learn the formal method.
The goal is NOT for them to solve it correctly, but to:
1. Activate their prior knowledge
2. Generate multiple possible approaches
3. Discover what they don't yet know
4. Prime their mind for the upcoming instruction

Common misconceptions to potentially surface:
${misconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Requirements:
- Problem should be challenging but approachable
- Multiple solution paths should seem possible
- Students should be able to make meaningful attempts even without formal knowledge
- The problem should reveal gaps in understanding naturally

Return JSON:
{
  "problem": "The problem statement",
  "context": "Real-world context that makes the problem engaging",
  "scaffoldingHints": ["Hint 1 if struggling", "Hint 2 for more help", "Hint 3 for significant struggle"],
  "whatMakesItChallenging": "Why this problem is good for productive failure",
  "expectedAttemptPatterns": ["Type of attempt 1", "Type of attempt 2", "Type of attempt 3"]
}`
}

/**
 * Create an exploration session
 */
export function createExplorationSession(problem: ExplorationProblem): ExplorationSession {
  return {
    id: `session-${Date.now()}`,
    problem,
    attempts: [],
    startTime: new Date(),
    frustrationLevel: 0,
    productiveStruggleScore: 0,
    readyForConsolidation: false,
  }
}

/**
 * Scaffold exploration based on struggle level
 */
export function getScaffoldingLevel(session: ExplorationSession): {
  level: 0 | 1 | 2 | 3
  action: 'continue' | 'hint' | 'guided_question' | 'consolidate'
  message?: string
} {
  const { attempts, frustrationLevel, startTime, problem } = session
  const timeSpentMs = Date.now() - startTime.getTime()
  const timeSpentMin = timeSpentMs / (1000 * 60)

  // Check for frustration threshold
  if (frustrationLevel > 0.8 || timeSpentMin > problem.frustrationThreshold) {
    return {
      level: 3,
      action: 'consolidate',
      message: "You've explored thoroughly! Let's consolidate what you've discovered.",
    }
  }

  // Check attempt count
  if (attempts.length >= problem.maxAttempts) {
    return {
      level: 3,
      action: 'consolidate',
      message: "Great exploration! You've tried multiple approaches. Time to see how it all connects.",
    }
  }

  // Check for prolonged struggle without progress
  if (attempts.length >= 2) {
    const recentAttempts = attempts.slice(-2)
    const noProgress = recentAttempts.every(a =>
      a.category === 'off_track' || a.category === 'incomplete'
    )

    if (noProgress && timeSpentMin > 5) {
      return {
        level: 2,
        action: 'guided_question',
        message: "What's one thing you're certain about in this problem?",
      }
    }
  }

  // Light scaffolding if struggling
  if (frustrationLevel > 0.4 && attempts.length >= 1) {
    return {
      level: 1,
      action: 'hint',
      message: 'Remember, there\'s no "wrong" answer in exploration. What patterns do you notice?',
    }
  }

  // Continue unassisted exploration
  return {
    level: 0,
    action: 'continue',
  }
}

// ============ Frustration Detection ============

/**
 * Detect frustration level from attempt patterns
 */
export function detectFrustrationLevel(
  attempts: ExplorationAttempt[],
  sessionDurationMs: number
): number {
  if (attempts.length === 0) return 0

  let frustration = 0

  // Factor 1: Rapid repeated attempts (frustration indicator)
  const recentAttempts = attempts.slice(-3)
  const avgDuration = recentAttempts.reduce((sum, a) => sum + a.durationMs, 0) / recentAttempts.length
  if (avgDuration < 30000) { // Less than 30 seconds per attempt
    frustration += 0.3
  }

  // Factor 2: No progress in categories
  const categories = attempts.map(a => a.category)
  const lastThree = categories.slice(-3)
  if (lastThree.every(c => c === 'off_track' || c === 'incomplete')) {
    frustration += 0.3
  }

  // Factor 3: Decreasing creativity
  if (attempts.length >= 2) {
    const creativityTrend = attempts
      .slice(-3)
      .map(a => a.creativityScore)
      .reduce((acc, score, i, arr) =>
        i === 0 ? acc : acc + (score - arr[i - 1]), 0)

    if (creativityTrend < -0.2) {
      frustration += 0.2
    }
  }

  // Factor 4: Time spent without meaningful attempt
  const sessionMinutes = sessionDurationMs / (1000 * 60)
  if (sessionMinutes > 8 && attempts.length < 2) {
    frustration += 0.2
  }

  return Math.min(frustration, 1)
}

/**
 * Calculate productive struggle score (higher = better learning potential)
 */
export function calculateProductiveStruggleScore(session: ExplorationSession): number {
  const { attempts, frustrationLevel } = session

  if (attempts.length === 0) return 0

  let score = 0

  // Factor 1: Multiple diverse attempts (good)
  const uniqueCategories = new Set(attempts.map(a => a.category)).size
  score += Math.min(uniqueCategories / 4, 0.25)

  // Factor 2: Increasing creativity (good)
  if (attempts.length >= 2) {
    const creativityTrend = attempts
      .map(a => a.creativityScore)
      .reduce((acc, score, i, arr) =>
        i === 0 ? acc : acc + (score - arr[i - 1]), 0) / (attempts.length - 1)

    score += Math.max(creativityTrend, 0) * 0.25
  }

  // Factor 3: Partial correct attempts (good - shows engagement)
  const partialCorrect = attempts.filter(a =>
    a.category === 'partial_correct' || a.category === 'creative_wrong'
  ).length
  score += Math.min(partialCorrect / attempts.length, 0.25)

  // Factor 4: Moderate frustration (some struggle is good)
  // Optimal range: 0.2-0.5
  if (frustrationLevel >= 0.2 && frustrationLevel <= 0.5) {
    score += 0.25
  } else if (frustrationLevel < 0.2) {
    score += 0.1 // Too easy, less productive
  } else {
    score += 0.05 // Too hard, diminishing returns
  }

  return Math.min(score, 1)
}

// ============ Attempt Analysis ============

/**
 * Categorize an attempt using AI analysis
 */
export function getAttemptCategorizationPrompt(
  problem: string,
  attempt: string,
  correctConcept: string,
  misconceptions: string[]
): string {
  return `Analyze this student attempt at a problem they haven't been formally taught yet.

Problem: ${problem}

Student's Attempt: ${attempt}

Target Concept: ${correctConcept}

Known Misconceptions:
${misconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Categorize the attempt and analyze it for productive failure learning:

Return JSON:
{
  "category": "correct" | "partial_correct" | "creative_wrong" | "common_misconception" | "off_track" | "incomplete",
  "partialUnderstanding": ["What the student got right or close to right"],
  "misconceptions": ["Any misconceptions revealed"],
  "creativityScore": 0.0-1.0, // How novel/creative was the approach
  "whatWasGood": "Specific praise for their thinking",
  "whatToExplore": "What they should consider next without giving the answer",
  "leadsToInsight": true/false // Does this attempt help surface the key concept?
}`
}

/**
 * Record an attempt in the session
 */
export function recordAttempt(
  session: ExplorationSession,
  content: string,
  analysis: {
    category: AttemptCategory
    partialUnderstanding: string[]
    misconceptions: string[]
    creativityScore: number
  },
  durationMs: number
): ExplorationSession {
  const attempt: ExplorationAttempt = {
    id: `attempt-${session.attempts.length + 1}`,
    attemptNumber: session.attempts.length + 1,
    content,
    timestamp: new Date(),
    durationMs,
    ...analysis,
  }

  const newAttempts = [...session.attempts, attempt]
  const sessionDurationMs = Date.now() - session.startTime.getTime()
  const frustrationLevel = detectFrustrationLevel(newAttempts, sessionDurationMs)

  const updatedSession = {
    ...session,
    attempts: newAttempts,
    frustrationLevel,
  }

  return {
    ...updatedSession,
    productiveStruggleScore: calculateProductiveStruggleScore(updatedSession),
    readyForConsolidation: newAttempts.length >= session.problem.maxAttempts ||
      frustrationLevel > 0.8 ||
      analysis.category === 'correct',
  }
}

// ============ Consolidation Engine ============

/**
 * Generate consolidation view from exploration session
 */
export function generateConsolidationData(
  session: ExplorationSession,
  correctSolution: WorkedSolution,
  keyInsight: string
): ConsolidationData {
  const whatYouTried: AttemptSummary[] = session.attempts.map(attempt => ({
    attemptNumber: attempt.attemptNumber,
    approach: attempt.content,
    whatWasRight: attempt.partialUnderstanding,
    whatWasMissing: attempt.misconceptions.length > 0
      ? attempt.misconceptions
      : ['The key concept hadn\'t been discovered yet'],
    ledToInsight: attempt.category === 'creative_wrong' || attempt.category === 'partial_correct',
  }))

  // Find connections between attempts and correct solution
  const connectionToExploration = session.attempts
    .filter(a => a.partialUnderstanding.length > 0)
    .map(a => `Your thinking about "${a.partialUnderstanding[0]}" was on the right track!`)

  return {
    sessionId: session.id,
    whatYouTried,
    keyInsight,
    correctApproach: correctSolution,
    whyItWorks: correctSolution.keyPrinciples,
    connectionToExploration,
    conceptualGain: session.productiveStruggleScore * 0.8 + 0.2, // Base gain + struggle bonus
  }
}

/**
 * Gemini prompt for generating consolidation content
 */
export function getConsolidationPrompt(
  problem: string,
  attempts: ExplorationAttempt[],
  targetConcept: string
): string {
  const attemptsSummary = attempts.map((a, i) =>
    `Attempt ${i + 1} (${a.category}): ${a.content}\n  - Good thinking: ${a.partialUnderstanding.join(', ') || 'Explored the problem'}\n  - Gaps: ${a.misconceptions.join(', ') || 'Missing formal concept'}`
  ).join('\n\n')

  return `Create a consolidation lesson for a student who just explored this problem through "productive failure."

Problem: ${problem}

Their Exploration Attempts:
${attemptsSummary}

Target Concept: ${targetConcept}

Create a consolidation that:
1. Honors their exploration - find value in every attempt
2. Reveals the key insight they were missing
3. Shows the correct solution step by step
4. Connects back to their attempts where possible

Return JSON:
{
  "keyInsight": "The ONE key insight that unlocks this problem",
  "honoring": "Message acknowledging their productive struggle",
  "solution": {
    "steps": [
      {
        "stepNumber": 1,
        "description": "What to do",
        "reasoning": "Why this works",
        "connectionToAttempt": "How this relates to something they tried" // optional
      }
    ],
    "finalAnswer": "The complete solution",
    "keyPrinciples": ["Principle 1", "Principle 2"]
  },
  "ahaConnections": ["Connection between their thinking and the solution"],
  "transferQuestion": "A new problem they can now solve with this knowledge"
}`
}

/**
 * Compare student attempt to correct solution
 */
export function generateComparisonView(
  attempt: ExplorationAttempt,
  correctSolution: WorkedSolution
): {
  similarities: string[]
  differences: string[]
  almostThereAspects: string[]
  pathToCorrect: string
} {
  // This would be enhanced by AI analysis
  return {
    similarities: attempt.partialUnderstanding,
    differences: attempt.misconceptions,
    almostThereAspects: attempt.category === 'creative_wrong' || attempt.category === 'partial_correct'
      ? [`Your approach showed good intuition about ${attempt.partialUnderstanding[0] || 'the problem structure'}`]
      : [],
    pathToCorrect: `The key step you needed was: ${correctSolution.steps[0]?.description || 'the fundamental concept'}`,
  }
}

// ============ Learning Moment Extraction ============

/**
 * Extract key learning moments from exploration session
 */
export function extractLearningMoments(session: ExplorationSession): {
  moment: string
  type: 'discovery' | 'misconception_surfaced' | 'creative_approach' | 'persistence'
  learningValue: number
}[] {
  const moments: {
    moment: string
    type: 'discovery' | 'misconception_surfaced' | 'creative_approach' | 'persistence'
    learningValue: number
  }[] = []

  session.attempts.forEach((attempt, i) => {
    // Creative approaches are valuable
    if (attempt.category === 'creative_wrong' && attempt.creativityScore > 0.6) {
      moments.push({
        moment: `Attempt ${i + 1}: Novel approach with "${attempt.content.slice(0, 50)}..."`,
        type: 'creative_approach',
        learningValue: 0.8,
      })
    }

    // Misconceptions surfaced are learning opportunities
    if (attempt.misconceptions.length > 0) {
      moments.push({
        moment: `Discovered misconception: ${attempt.misconceptions[0]}`,
        type: 'misconception_surfaced',
        learningValue: 0.7,
      })
    }

    // Partial understanding shows progress
    if (attempt.category === 'partial_correct') {
      moments.push({
        moment: `Getting closer: ${attempt.partialUnderstanding[0] || 'Partial insight gained'}`,
        type: 'discovery',
        learningValue: 0.6,
      })
    }
  })

  // Multiple attempts show persistence
  if (session.attempts.length >= 3) {
    moments.push({
      moment: 'Persisted through multiple attempts',
      type: 'persistence',
      learningValue: 0.5,
    })
  }

  return moments.sort((a, b) => b.learningValue - a.learningValue)
}

/**
 * Measure conceptual gain from productive failure
 */
export function measureConceptualGain(
  preExplorationUnderstanding: number, // 0-1 from diagnostic
  postConsolidationUnderstanding: number, // 0-1 from post-test
  productiveStruggleScore: number
): {
  gain: number
  normalizedGain: number // Hake's gain
  attributionToStruggle: number
  interpretation: string
} {
  const rawGain = postConsolidationUnderstanding - preExplorationUnderstanding
  const possibleGain = 1 - preExplorationUnderstanding
  const normalizedGain = possibleGain > 0 ? rawGain / possibleGain : 0

  // Higher productive struggle correlates with better retention
  const attributionToStruggle = Math.min(productiveStruggleScore * normalizedGain, 1)

  let interpretation: string
  if (normalizedGain >= 0.7) {
    interpretation = 'Excellent conceptual gain! The productive struggle phase significantly enhanced learning.'
  } else if (normalizedGain >= 0.4) {
    interpretation = 'Good conceptual gain. The exploration phase activated relevant prior knowledge.'
  } else if (normalizedGain >= 0.2) {
    interpretation = 'Moderate gain. Consider longer exploration or more scaffolded consolidation.'
  } else {
    interpretation = 'Limited gain detected. The problem may need adjustment for better productive failure.'
  }

  return {
    gain: rawGain,
    normalizedGain,
    attributionToStruggle,
    interpretation,
  }
}
