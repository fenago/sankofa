/**
 * AI Socratic Tutoring Implementation
 * Based on Ma et al. (Nature 2025) showing 2x improvement over answer-giving
 *
 * Core principles:
 * 1. Ask questions instead of telling answers
 * 2. Guide through reasoning with prompts
 * 3. Help learner discover insight themselves
 * 4. Celebrate self-discovery moments
 */

export type QuestionType =
  | 'clarifying'        // Understand their thinking
  | 'probing'          // Dig deeper into reasoning
  | 'scaffolding'      // Build toward the answer
  | 'challenging'      // Test their understanding
  | 'reflection'       // Help them see what they learned
  | 'metacognitive'    // Think about their thinking

export type UnderstandingLevel =
  | 'none'
  | 'partial'
  | 'correct'
  | 'misconception'
  | 'advanced'

export interface SocraticExchange {
  id: string
  skillId: string
  questionType: QuestionType
  tutorQuestion: string
  studentResponse?: string
  detectedUnderstanding?: UnderstandingLevel
  ledToDiscovery: boolean
  timestamp: Date
}

export interface DialogueState {
  skillId: string
  skillName: string
  targetConcept: string
  knownMisconceptions: string[]
  exchanges: SocraticExchange[]
  currentUnderstanding: UnderstandingLevel
  discoveryMade: boolean
  discoveryDescription?: string
  dialoguePath: QuestionType[]
  currentPathIndex: number
}

export interface SocraticContext {
  skillName: string
  targetConcept: string
  studentPriorKnowledge: string[]
  misconception?: string
  previousAttempt?: string
  confidenceLevel?: number
}

// ============ Prompt Templates ============

export const CLARIFYING_PROMPTS = [
  "What do you think is happening here?",
  "Can you tell me more about your reasoning?",
  "What made you think of that approach?",
  "What do you already know about {concept}?",
  "How would you explain this to a friend?",
  "What parts of this are you certain about?",
  "What seems confusing or unclear?",
]

export const PROBING_PROMPTS = [
  "Why do you think that's the case?",
  "What would happen if {hypothetical}?",
  "How does this connect to {relatedConcept}?",
  "What evidence supports your thinking?",
  "Is there another way to look at this?",
  "What assumptions are you making?",
  "How confident are you in that reasoning?",
]

export const SCAFFOLDING_PROMPTS = [
  "Let's break this down. What's the first step?",
  "What would you need to know to solve this?",
  "Can you think of a simpler case?",
  "What patterns do you notice?",
  "If we knew {key_fact}, what could we figure out?",
  "Let's start with what we know for certain.",
  "What's the relationship between {A} and {B}?",
]

export const CHALLENGING_PROMPTS = [
  "That's interesting - but what about {counterexample}?",
  "How would you handle the case where {edge_case}?",
  "Can you prove that's always true?",
  "What would someone who disagrees say?",
  "Does this work when {boundary_condition}?",
  "How is this different from {similar_concept}?",
]

export const REFLECTION_PROMPTS = [
  "What do you understand now that you didn't before?",
  "How did your thinking change?",
  "What was the key insight that helped?",
  "Could you teach this to someone else?",
  "What would you do differently next time?",
  "How does this connect to other things you've learned?",
]

export const METACOGNITIVE_PROMPTS = [
  "What's your thinking process here?",
  "How do you know when you've understood something?",
  "What strategies are you using?",
  "What made this challenging?",
  "How did you monitor your own understanding?",
  "What questions are you asking yourself?",
]

export const CELEBRATION_PROMPTS = [
  "Yes! You've discovered a key insight!",
  "Excellent reasoning - you figured it out yourself!",
  "That's exactly it! Your thinking led you there.",
  "Brilliant! That's the breakthrough moment.",
  "You've got it! That understanding came from your own thinking.",
  "Perfect! Notice how you worked through that yourself?",
]

// ============ System Prompts ============

export function getSocraticSystemPrompt(context: SocraticContext): string {
  return `You are a Socratic tutor helping a student understand ${context.skillName}.

CRITICAL RULE: NEVER give direct answers or solutions. Instead:
1. Ask clarifying questions to understand the student's thinking
2. Point out contradictions gently using questions
3. Guide toward the answer with leading questions
4. When they get it, celebrate their discovery

Target concept: ${context.targetConcept}

${context.misconception ? `Common misconception to address: ${context.misconception}` : ''}

Student's prior knowledge:
${context.studentPriorKnowledge.map(k => `- ${k}`).join('\n')}

${context.previousAttempt ? `Their previous attempt: "${context.previousAttempt}"` : ''}

${context.confidenceLevel !== undefined ? `Their confidence level: ${context.confidenceLevel}/5` : ''}

Your approach:
1. Start by understanding what they currently think
2. Find the gap between their understanding and the target concept
3. Ask questions that illuminate this gap
4. Guide them to bridge it themselves
5. When they show understanding, celebrate genuinely

NEVER:
- Give the answer directly
- Explain the concept to them
- Tell them they're wrong (ask questions instead)
- Rush to the solution

ALWAYS:
- Be patient and encouraging
- Find value in partial understanding
- Build on what they already know
- Celebrate self-discovery

Respond with your next Socratic question or response.`
}

// ============ Question Generator ============

/**
 * Generate a guiding question based on context and dialogue state
 */
export function generateGuidingQuestion(
  state: DialogueState,
  questionType: QuestionType
): string {
  const templates = getTemplatesForType(questionType)
  const template = templates[Math.floor(Math.random() * templates.length)]

  // Replace placeholders
  return replacePlaceholders(template, {
    concept: state.targetConcept,
    skillName: state.skillName,
  })
}

function getTemplatesForType(type: QuestionType): string[] {
  switch (type) {
    case 'clarifying': return CLARIFYING_PROMPTS
    case 'probing': return PROBING_PROMPTS
    case 'scaffolding': return SCAFFOLDING_PROMPTS
    case 'challenging': return CHALLENGING_PROMPTS
    case 'reflection': return REFLECTION_PROMPTS
    case 'metacognitive': return METACOGNITIVE_PROMPTS
  }
}

function replacePlaceholders(template: string, values: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

/**
 * Gemini prompt for generating contextual Socratic questions
 */
export function getQuestionGenerationPrompt(
  state: DialogueState,
  questionType: QuestionType,
  studentResponse: string
): string {
  return `Generate a Socratic ${questionType} question for this tutoring situation:

Skill: ${state.skillName}
Target concept: ${state.targetConcept}
Current understanding level: ${state.currentUnderstanding}

Previous exchanges:
${state.exchanges.slice(-3).map(e => `
Tutor: ${e.tutorQuestion}
Student: ${e.studentResponse || '(no response yet)'}
`).join('\n')}

Latest student response: "${studentResponse}"

Known misconceptions to address:
${state.knownMisconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Generate a ${questionType} question that:
${getQuestionTypeGuidelines(questionType)}

Return JSON:
{
  "question": "Your Socratic question",
  "reasoning": "Why this question will help",
  "expectedInsight": "What understanding this should surface",
  "followUpIfCorrect": "Brief follow-up if they get it",
  "followUpIfIncorrect": "Brief follow-up if they don't"
}`
}

function getQuestionTypeGuidelines(type: QuestionType): string {
  switch (type) {
    case 'clarifying':
      return '- Helps you understand their current thinking\n- Is open-ended and non-judgmental\n- Invites them to explain their reasoning'
    case 'probing':
      return '- Digs deeper into their reasoning\n- Asks for evidence or justification\n- Explores the limits of their understanding'
    case 'scaffolding':
      return '- Breaks down the problem into smaller steps\n- Builds on what they know\n- Points toward the missing piece without revealing it'
    case 'challenging':
      return '- Tests the robustness of their understanding\n- Presents edge cases or counterexamples\n- Strengthens their reasoning'
    case 'reflection':
      return '- Helps them see what they learned\n- Connects new and old knowledge\n- Reinforces the discovery'
    case 'metacognitive':
      return '- Helps them think about their thinking\n- Builds self-awareness\n- Develops learning strategies'
  }
}

// ============ Response Analyzer ============

/**
 * Analyze student response to determine understanding level
 */
export function getResponseAnalysisPrompt(
  skillName: string,
  targetConcept: string,
  tutorQuestion: string,
  studentResponse: string,
  misconceptions: string[]
): string {
  return `Analyze this student response in a Socratic tutoring dialogue:

Skill: ${skillName}
Target concept: ${targetConcept}

Tutor's question: "${tutorQuestion}"
Student's response: "${studentResponse}"

Known misconceptions:
${misconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Analyze the response for:
1. What understanding is demonstrated?
2. What misconceptions appear?
3. What partial understanding is present?
4. Is this a discovery moment?

Return JSON:
{
  "understandingLevel": "none" | "partial" | "correct" | "misconception" | "advanced",
  "demonstratedKnowledge": ["What they clearly understand"],
  "misconceptions": ["Any misconceptions revealed"],
  "partialUnderstanding": ["What they're close to getting"],
  "isDiscoveryMoment": true/false,
  "discoveryDescription": "What they discovered (if applicable)",
  "confidenceIndicators": "How confident they seem",
  "nextQuestionType": "clarifying" | "probing" | "scaffolding" | "challenging" | "reflection" | "metacognitive",
  "reasoning": "Why this next question type"
}`
}

/**
 * Check if response indicates a discovery moment
 */
export function detectDiscoveryMoment(response: string, targetConcept: string): {
  isDiscovery: boolean
  confidence: number
  indicators: string[]
} {
  const indicators: string[] = []
  let confidence = 0

  // Check for insight language
  const insightPhrases = [
    'oh!', 'aha', 'I see', 'I get it', 'that makes sense',
    'now I understand', 'so that\'s why', 'I didn\'t realize',
    'wait, so', 'oh, because', 'that means', 'I think I see'
  ]

  const lowerResponse = response.toLowerCase()
  for (const phrase of insightPhrases) {
    if (lowerResponse.includes(phrase)) {
      indicators.push(`Used insight language: "${phrase}"`)
      confidence += 0.2
    }
  }

  // Check for explanation attempts
  if (response.includes('because') || response.includes('so that') || response.includes('which means')) {
    indicators.push('Attempted to explain reasoning')
    confidence += 0.15
  }

  // Check for self-correction
  if (response.includes('wait') || response.includes('actually') || response.includes('I was wrong')) {
    indicators.push('Showed self-correction')
    confidence += 0.2
  }

  // Check for connection-making
  if (response.includes('like') || response.includes('similar to') || response.includes('connects to')) {
    indicators.push('Made connections to other knowledge')
    confidence += 0.15
  }

  return {
    isDiscovery: confidence >= 0.3,
    confidence: Math.min(confidence, 1),
    indicators,
  }
}

// ============ Dialogue Manager ============

/**
 * Create initial dialogue state
 */
export function createDialogueState(
  skillId: string,
  skillName: string,
  targetConcept: string,
  misconceptions: string[]
): DialogueState {
  return {
    skillId,
    skillName,
    targetConcept,
    knownMisconceptions: misconceptions,
    exchanges: [],
    currentUnderstanding: 'none',
    discoveryMade: false,
    dialoguePath: planDialoguePath('none', misconceptions.length > 0),
    currentPathIndex: 0,
  }
}

/**
 * Plan optimal dialogue path based on starting state
 */
export function planDialoguePath(
  startingUnderstanding: UnderstandingLevel,
  hasMisconception: boolean
): QuestionType[] {
  const path: QuestionType[] = []

  // Start with clarification to understand their thinking
  path.push('clarifying')

  if (hasMisconception) {
    // For misconceptions: probe -> challenge -> scaffold
    path.push('probing')
    path.push('challenging')
    path.push('scaffolding')
  } else if (startingUnderstanding === 'partial') {
    // For partial: scaffold -> probe -> challenge
    path.push('scaffolding')
    path.push('probing')
    path.push('challenging')
  } else {
    // Default: scaffold through to understanding
    path.push('scaffolding')
    path.push('probing')
    path.push('scaffolding')
  }

  // Always end with reflection on discovery
  path.push('reflection')
  path.push('metacognitive')

  return path
}

/**
 * Adapt dialogue path based on response
 */
export function adaptDialoguePath(
  currentPath: QuestionType[],
  currentIndex: number,
  understandingLevel: UnderstandingLevel,
  isDiscovery: boolean
): { path: QuestionType[]; newIndex: number } {
  // If discovery made, skip to reflection
  if (isDiscovery) {
    return {
      path: ['reflection', 'metacognitive'],
      newIndex: 0,
    }
  }

  // If correct understanding, move faster
  if (understandingLevel === 'correct' || understandingLevel === 'advanced') {
    // Remove scaffolding steps, go to challenging
    const remaining = currentPath.slice(currentIndex + 1)
    const newPath = remaining.filter(q => q !== 'scaffolding')
    if (newPath.length === 0 || !newPath.includes('reflection')) {
      newPath.push('reflection')
    }
    return { path: newPath, newIndex: 0 }
  }

  // If misconception detected, insert challenging question
  if (understandingLevel === 'misconception') {
    const remaining = currentPath.slice(currentIndex + 1)
    return {
      path: ['probing', 'challenging', ...remaining],
      newIndex: 0,
    }
  }

  // Otherwise continue on path
  return { path: currentPath, newIndex: currentIndex + 1 }
}

/**
 * Record an exchange and update state
 */
export function recordExchange(
  state: DialogueState,
  tutorQuestion: string,
  questionType: QuestionType,
  studentResponse: string,
  analysis: {
    understandingLevel: UnderstandingLevel
    isDiscovery: boolean
    discoveryDescription?: string
  }
): DialogueState {
  const exchange: SocraticExchange = {
    id: `exchange-${state.exchanges.length + 1}`,
    skillId: state.skillId,
    questionType,
    tutorQuestion,
    studentResponse,
    detectedUnderstanding: analysis.understandingLevel,
    ledToDiscovery: analysis.isDiscovery,
    timestamp: new Date(),
  }

  const { path, newIndex } = adaptDialoguePath(
    state.dialoguePath,
    state.currentPathIndex,
    analysis.understandingLevel,
    analysis.isDiscovery
  )

  return {
    ...state,
    exchanges: [...state.exchanges, exchange],
    currentUnderstanding: analysis.understandingLevel,
    discoveryMade: state.discoveryMade || analysis.isDiscovery,
    discoveryDescription: analysis.discoveryDescription || state.discoveryDescription,
    dialoguePath: path,
    currentPathIndex: newIndex,
  }
}

/**
 * Get next question type from dialogue path
 */
export function getNextQuestionType(state: DialogueState): QuestionType | null {
  if (state.currentPathIndex >= state.dialoguePath.length) {
    return null // Dialogue complete
  }
  return state.dialoguePath[state.currentPathIndex]
}

/**
 * Generate celebration message for discovery
 */
export function generateCelebration(discoveryDescription?: string): string {
  const celebration = CELEBRATION_PROMPTS[Math.floor(Math.random() * CELEBRATION_PROMPTS.length)]

  if (discoveryDescription) {
    return `${celebration} ${discoveryDescription}`
  }
  return celebration
}

// ============ Dialogue Quality Metrics ============

/**
 * Calculate dialogue effectiveness score
 */
export function calculateDialogueEffectiveness(state: DialogueState): {
  score: number
  selfDiscoveryRate: number
  exchangeEfficiency: number
  misconceptionAddressed: boolean
  interpretation: string
} {
  if (state.exchanges.length === 0) {
    return {
      score: 0,
      selfDiscoveryRate: 0,
      exchangeEfficiency: 0,
      misconceptionAddressed: false,
      interpretation: 'No exchanges yet',
    }
  }

  // Self-discovery rate
  const discoveryExchanges = state.exchanges.filter(e => e.ledToDiscovery).length
  const selfDiscoveryRate = discoveryExchanges / state.exchanges.length

  // Exchange efficiency (fewer exchanges to reach understanding = better)
  const maxExpectedExchanges = 8
  const exchangeEfficiency = Math.max(0, 1 - (state.exchanges.length / maxExpectedExchanges))

  // Was misconception addressed?
  const misconceptionAddressed = state.knownMisconceptions.length > 0 &&
    (state.currentUnderstanding === 'correct' || state.currentUnderstanding === 'advanced')

  // Overall score
  let score = 0
  score += selfDiscoveryRate * 0.4 // Self-discovery is most important
  score += exchangeEfficiency * 0.3 // Efficiency matters
  score += (state.discoveryMade ? 0.2 : 0) // Discovery moment bonus
  score += (misconceptionAddressed ? 0.1 : 0) // Misconception bonus

  let interpretation: string
  if (score >= 0.7) {
    interpretation = 'Excellent Socratic dialogue - the student discovered the insight themselves!'
  } else if (score >= 0.5) {
    interpretation = 'Good dialogue with meaningful progress toward understanding.'
  } else if (score >= 0.3) {
    interpretation = 'Some progress made, but may need more scaffolding.'
  } else {
    interpretation = 'Consider adjusting the question types or adding more scaffolding.'
  }

  return {
    score,
    selfDiscoveryRate,
    exchangeEfficiency,
    misconceptionAddressed,
    interpretation,
  }
}
