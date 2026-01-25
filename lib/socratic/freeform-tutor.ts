/**
 * Freeform Tutoring Mode Implementation
 *
 * In Freeform Mode:
 * - The USER leads the conversation by asking questions
 * - The AI responds adaptively based on the user's profile
 * - Psychometrics are extracted from how the user asks and responds
 * - AI strategically asks guiding questions to deepen understanding
 *
 * This is distinct from:
 * - Socratic Mode: AI leads with questions
 * - Inverse Socratic: User teaches AI
 * - Freeform: User asks questions, AI tutors adaptively
 *
 * Research basis:
 * - Zone of Proximal Development (Vygotsky, 1978)
 * - Adaptive Learning (Park & Lee, 2003)
 * - Inquiry-Based Learning (Pedaste et al., 2015)
 */

import type { ExtractionResult } from './psychometric-extractor'

// ============================================================================
// TYPES
// ============================================================================

export interface FreeformConfig {
  skillId: string
  skillName: string
  skillDescription?: string
  targetConcepts: string[]
  maxExchanges: number
}

export interface LearnerProfile {
  expertiseLevel: 'novice' | 'intermediate' | 'advanced'
  learningStyle: 'visual' | 'verbal' | 'kinesthetic' | 'reading_writing'
  preferredPace: 'slow' | 'moderate' | 'fast'
  vocabularySophistication: number  // 0-1
  abstractionPreference: 'concrete' | 'abstract' | 'balanced'
  confidenceLevel: 'low' | 'medium' | 'high'
}

export interface FreeformState {
  dialogueId: string
  config: FreeformConfig
  exchanges: FreeformExchange[]
  learnerProfile: LearnerProfile
  conversationMetrics: ConversationMetrics
  topicsCovered: string[]
  questionsAsked: string[]
  insightsGained: string[]
  misconceptionsAddressed: string[]
  status: 'active' | 'completed' | 'ended_early'
}

export interface FreeformExchange {
  exchangeNumber: number
  // User's input
  userMessage: string
  userIntent: UserIntent
  extractedPsychometrics: ConversationalPsychometrics
  // AI's response
  aiResponse: string
  aiResponseType: AIResponseType
  strategicElement?: StrategicElement
  timestamp: string
}

export type UserIntent =
  | 'asking_question'       // Seeking new information
  | 'clarifying'            // Asking for clarification
  | 'confirming'            // Checking understanding
  | 'exploring'             // Open-ended exploration
  | 'challenging'           // Questioning or pushing back
  | 'applying'              // Trying to apply knowledge
  | 'reflecting'            // Thinking about what was learned
  | 'expressing_confusion'  // Showing they don't understand
  | 'other'

export type AIResponseType =
  | 'direct_answer'         // Answering the question directly
  | 'guided_answer'         // Leading toward the answer
  | 'clarifying_question'   // Asking for clarification
  | 'probing_question'      // Deepening the inquiry
  | 'scaffolded_explanation' // Breaking down complex topic
  | 'example_based'         // Using examples to explain
  | 'connection_making'     // Connecting to prior knowledge
  | 'encouragement'         // Building confidence
  | 'summary'               // Summarizing key points

export interface StrategicElement {
  type: 'guiding_question' | 'challenge' | 'application_prompt' | 'reflection_prompt'
  content: string
  purpose: string
}

export interface ConversationalPsychometrics {
  // Question Quality (when asking)
  questionDepth: 'surface' | 'intermediate' | 'deep'
  questionClarity: number           // 0-1
  questionRelevance: number         // 0-1
  showsPrerequisiteKnowledge: boolean

  // Understanding Signals
  understandingIndicators: string[]
  confusionIndicators: string[]
  insightMoments: string[]

  // Engagement & Curiosity
  curiosityLevel: number            // 0-1
  engagementLevel: 'high' | 'medium' | 'low'
  followUpBehavior: 'proactive' | 'reactive' | 'passive'

  // Metacognitive Signals
  selfAwarenessShown: boolean
  boundaryRecognition: boolean      // Knows what they don't know
  strategyMentioned: boolean

  // Confidence Calibration
  confidenceInQuestion: number      // 0-1 (how sure about what they're asking)
  uncertaintyExpressed: boolean
  overconfidenceSignals: string[]

  // Communication Style
  technicalVocabularyUsed: boolean
  examplesSought: boolean
  analogiesRequested: boolean
}

export interface ConversationMetrics {
  // Question patterns
  totalQuestionsAsked: number
  averageQuestionDepth: number      // 0-1
  questionDiversityScore: number    // 0-1 (variety of question types)

  // Understanding progression
  understandingProgression: number[] // 0-1 per exchange
  misconceptionsCorrected: number
  insightsReached: number

  // Engagement
  averageEngagement: number         // 0-1
  curiosityTrend: 'increasing' | 'stable' | 'decreasing'
  sessionMomentum: number           // 0-1

  // AI adaptation effectiveness
  adaptationSuccessRate: number     // How well AI responses matched needs
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUESTION_DEPTH_INDICATORS = {
  surface: [
    'what is', 'define', 'list', 'name', 'when did', 'who',
    'what does', 'what are', 'tell me about'
  ],
  intermediate: [
    'how does', 'why does', 'explain', 'compare', 'difference between',
    'what happens when', 'what causes', 'how can', 'describe'
  ],
  deep: [
    'why is it that', 'what if', 'how would', 'what are the implications',
    'how does this relate to', 'can you analyze', 'what would happen if',
    'how might', 'what are the consequences', 'evaluate', 'synthesize'
  ]
}

const CONFUSION_MARKERS = [
  "i don't understand", "i'm confused", "this doesn't make sense",
  "what do you mean", "i'm lost", "could you explain again",
  "i'm not following", "huh?", "wait, what?", "this is confusing"
]

const INSIGHT_MARKERS = [
  'oh!', 'aha', 'i see', 'i get it now', 'that makes sense',
  'so that means', 'oh, so', 'now i understand', 'i think i see',
  "so that's why", 'eureka', 'it clicked'
]

const CURIOSITY_MARKERS = [
  'i wonder', "that's interesting", 'tell me more', 'what about',
  "i'm curious", 'can you elaborate', 'why is that', 'how come',
  'fascinating', "i'd like to know more"
]

const SELF_AWARENESS_MARKERS = [
  "i think i understand", "i'm not sure if", "let me see if i got this",
  "i might be wrong but", "my understanding is", "if i understand correctly",
  "i need to think about", "i realize i don't know"
]

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize a freeform tutoring dialogue
 */
export function initializeFreeformDialogue(
  config: FreeformConfig,
  initialProfile?: Partial<LearnerProfile>
): FreeformState {
  const defaultProfile: LearnerProfile = {
    expertiseLevel: 'intermediate',
    learningStyle: 'verbal',
    preferredPace: 'moderate',
    vocabularySophistication: 0.5,
    abstractionPreference: 'balanced',
    confidenceLevel: 'medium',
    ...initialProfile
  }

  return {
    dialogueId: `freeform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    config,
    exchanges: [],
    learnerProfile: defaultProfile,
    conversationMetrics: {
      totalQuestionsAsked: 0,
      averageQuestionDepth: 0.5,
      questionDiversityScore: 0.5,
      understandingProgression: [],
      misconceptionsCorrected: 0,
      insightsReached: 0,
      averageEngagement: 0.5,
      curiosityTrend: 'stable',
      sessionMomentum: 0.5,
      adaptationSuccessRate: 0.5,
    },
    topicsCovered: [],
    questionsAsked: [],
    insightsGained: [],
    misconceptionsAddressed: [],
    status: 'active',
  }
}

/**
 * Generate welcoming message that invites questions
 */
export function generateWelcomeMessage(config: FreeformConfig, profile: LearnerProfile): string {
  const skillName = config.skillName

  // Adapt welcome based on expertise
  if (profile.expertiseLevel === 'novice') {
    return `Hi! I'm here to help you learn about **${skillName}**. Feel free to ask me anything - there are no silly questions! What would you like to know? I'll explain things step by step and make sure everything is clear.`
  } else if (profile.expertiseLevel === 'advanced') {
    return `Hello! Ready to explore **${skillName}** with you. Whether you want to dive deep into specific aspects, discuss edge cases, or explore connections to other concepts - just ask. What's on your mind?`
  } else {
    return `Hi there! I'm here to help you understand **${skillName}** better. Ask me anything you're curious about - we can go at whatever pace works for you. What would you like to explore?`
  }
}

/**
 * Classify the user's intent from their message
 */
export function classifyUserIntent(message: string): UserIntent {
  const lower = message.toLowerCase()
  const hasQuestion = message.includes('?')

  // Check for confusion first
  for (const marker of CONFUSION_MARKERS) {
    if (lower.includes(marker)) {
      return 'expressing_confusion'
    }
  }

  // Check for reflection/insight
  for (const marker of INSIGHT_MARKERS) {
    if (lower.includes(marker)) {
      return 'reflecting'
    }
  }

  // Check question types
  if (hasQuestion || lower.startsWith('what') || lower.startsWith('how') ||
      lower.startsWith('why') || lower.startsWith('when') || lower.startsWith('where') ||
      lower.startsWith('can you') || lower.startsWith('could you')) {

    // Is it a clarification?
    if (/could you (explain|clarify)|what do you mean|can you be more|not sure i follow/i.test(lower)) {
      return 'clarifying'
    }

    // Is it confirmation?
    if (/is that right|did i understand|so basically|am i correct|let me check/i.test(lower)) {
      return 'confirming'
    }

    // Is it challenging?
    if (/but what about|what if|doesn't that contradict|how do you know|are you sure/i.test(lower)) {
      return 'challenging'
    }

    // Is it applying?
    if (/how would i|how can i use|in practice|real world|apply this/i.test(lower)) {
      return 'applying'
    }

    // Is it exploring?
    if (/what about|i wonder|could there be|is it possible|what else/i.test(lower)) {
      return 'exploring'
    }

    return 'asking_question'
  }

  // Check for reflection without explicit insight markers
  if (/i think|i realize|looking back|now that i|it seems like/i.test(lower)) {
    return 'reflecting'
  }

  return 'other'
}

/**
 * Extract psychometrics from user's conversational input
 */
export function extractConversationalPsychometrics(
  message: string,
  previousExchanges: FreeformExchange[],
  config: FreeformConfig
): ConversationalPsychometrics {
  const lower = message.toLowerCase()
  const words = message.split(/\s+/)
  const sentences = message.split(/[.!?]+/).filter(s => s.trim())

  // Determine question depth
  let questionDepth: 'surface' | 'intermediate' | 'deep' = 'intermediate'
  for (const indicator of QUESTION_DEPTH_INDICATORS.deep) {
    if (lower.includes(indicator)) {
      questionDepth = 'deep'
      break
    }
  }
  if (questionDepth !== 'deep') {
    for (const indicator of QUESTION_DEPTH_INDICATORS.surface) {
      if (lower.includes(indicator)) {
        questionDepth = 'surface'
        break
      }
    }
  }

  // Question clarity - clear questions are specific and well-formed
  const hasSpecificSubject = config.targetConcepts.some(c => lower.includes(c.toLowerCase()))
  const questionClarity = Math.min(1, 0.3 +
    (message.includes('?') ? 0.2 : 0) +
    (hasSpecificSubject ? 0.3 : 0) +
    (words.length > 5 && words.length < 30 ? 0.2 : 0)
  )

  // Question relevance to skill
  const questionRelevance = Math.min(1, 0.3 +
    (lower.includes(config.skillName.toLowerCase()) ? 0.3 : 0) +
    (hasSpecificSubject ? 0.4 : 0)
  )

  // Collect understanding indicators
  const understandingIndicators: string[] = []
  for (const marker of INSIGHT_MARKERS) {
    if (lower.includes(marker)) {
      understandingIndicators.push(marker)
    }
  }
  if (/i understand|makes sense|got it|i see/i.test(lower)) {
    understandingIndicators.push('explicit understanding')
  }

  // Collect confusion indicators
  const confusionIndicators: string[] = []
  for (const marker of CONFUSION_MARKERS) {
    if (lower.includes(marker)) {
      confusionIndicators.push(marker)
    }
  }

  // Insight moments
  const insightMoments: string[] = []
  for (const marker of INSIGHT_MARKERS) {
    if (lower.includes(marker)) {
      const matchingSentence = sentences.find(s => s.toLowerCase().includes(marker))
      if (matchingSentence) {
        insightMoments.push(matchingSentence.trim())
      }
    }
  }

  // Curiosity level
  let curiosityCount = 0
  for (const marker of CURIOSITY_MARKERS) {
    if (lower.includes(marker)) curiosityCount++
  }
  const curiosityLevel = Math.min(1, 0.3 + curiosityCount * 0.2 + (message.includes('?') ? 0.2 : 0))

  // Engagement level
  let engagementLevel: 'high' | 'medium' | 'low' = 'medium'
  if (words.length > 30 || curiosityCount >= 2 || insightMoments.length > 0) {
    engagementLevel = 'high'
  } else if (words.length < 5 || confusionIndicators.length > 1) {
    engagementLevel = 'low'
  }

  // Follow-up behavior based on history
  let followUpBehavior: 'proactive' | 'reactive' | 'passive' = 'reactive'
  if (previousExchanges.length >= 2) {
    const recentQuestions = previousExchanges.slice(-2).filter(e =>
      e.userIntent === 'asking_question' || e.userIntent === 'exploring'
    )
    if (recentQuestions.length >= 2) {
      followUpBehavior = 'proactive'
    } else if (previousExchanges.slice(-2).every(e => e.userIntent === 'other')) {
      followUpBehavior = 'passive'
    }
  }

  // Self-awareness
  let selfAwarenessShown = false
  for (const marker of SELF_AWARENESS_MARKERS) {
    if (lower.includes(marker)) {
      selfAwarenessShown = true
      break
    }
  }

  // Boundary recognition
  const boundaryRecognition = /i don't know|not sure about|beyond my|haven't learned|need to understand/i.test(lower)

  // Strategy mentioned
  const strategyMentioned = /my approach|i'm trying to|let me think|first i|i'll try/i.test(lower)

  // Confidence in question
  const confidenceInQuestion = confusionIndicators.length === 0 && questionClarity > 0.6 ? 0.7 : 0.4

  // Uncertainty expressed
  const uncertaintyExpressed = /maybe|might|perhaps|possibly|not sure|i think/i.test(lower)

  // Overconfidence signals
  const overconfidenceSignals: string[] = []
  if (/obviously|of course|everyone knows|clearly|definitely/i.test(lower)) {
    const matches = lower.match(/obviously|of course|everyone knows|clearly|definitely/gi)
    if (matches) overconfidenceSignals.push(...matches)
  }

  // Technical vocabulary
  const technicalVocabularyUsed = config.targetConcepts.some(c => lower.includes(c.toLowerCase()))

  // Examples/analogies sought
  const examplesSought = /example|for instance|such as|like what|show me/i.test(lower)
  const analogiesRequested = /analogy|like|similar to|compare|metaphor/i.test(lower)

  // Shows prerequisite knowledge
  const showsPrerequisiteKnowledge = previousExchanges.length > 0 &&
    questionDepth !== 'surface' &&
    !confusionIndicators.length

  return {
    questionDepth,
    questionClarity,
    questionRelevance,
    showsPrerequisiteKnowledge,
    understandingIndicators,
    confusionIndicators,
    insightMoments,
    curiosityLevel,
    engagementLevel,
    followUpBehavior,
    selfAwarenessShown,
    boundaryRecognition,
    strategyMentioned,
    confidenceInQuestion,
    uncertaintyExpressed,
    overconfidenceSignals,
    technicalVocabularyUsed,
    examplesSought,
    analogiesRequested,
  }
}

/**
 * Determine appropriate AI response type based on user input and profile
 */
export function determineAIResponseType(
  userIntent: UserIntent,
  psychometrics: ConversationalPsychometrics,
  profile: LearnerProfile,
  exchangeCount: number
): AIResponseType {
  // Handle confusion explicitly
  if (userIntent === 'expressing_confusion') {
    return profile.expertiseLevel === 'novice' ? 'scaffolded_explanation' : 'clarifying_question'
  }

  // Handle different intents
  switch (userIntent) {
    case 'asking_question':
      // Novices get more scaffolding
      if (profile.expertiseLevel === 'novice') {
        return psychometrics.questionDepth === 'surface' ? 'scaffolded_explanation' : 'guided_answer'
      }
      // Advanced learners get direct answers unless asking deep questions
      if (profile.expertiseLevel === 'advanced' && psychometrics.questionDepth !== 'deep') {
        return 'direct_answer'
      }
      return 'guided_answer'

    case 'clarifying':
      return psychometrics.examplesSought ? 'example_based' : 'scaffolded_explanation'

    case 'confirming':
      if (psychometrics.understandingIndicators.length > 0) {
        return 'encouragement'
      }
      return 'direct_answer'

    case 'exploring':
      return profile.confidenceLevel === 'low' ? 'guided_answer' : 'connection_making'

    case 'challenging':
      return 'direct_answer' // Meet challenges with clear explanations

    case 'applying':
      return 'example_based'

    case 'reflecting':
      // Encourage more reflection
      if (exchangeCount >= 3) {
        return 'summary'
      }
      return 'encouragement'

    default:
      return 'guided_answer'
  }
}

/**
 * Generate a strategic element to deepen learning
 */
export function generateStrategicElement(
  state: FreeformState,
  currentPsychometrics: ConversationalPsychometrics,
  responseType: AIResponseType
): StrategicElement | undefined {
  const exchangeCount = state.exchanges.length

  // Don't add strategic elements early in the conversation
  if (exchangeCount < 2) return undefined

  // Don't add if user is confused or struggling
  if (currentPsychometrics.confusionIndicators.length > 0) return undefined

  // Don't add if engagement is low
  if (currentPsychometrics.engagementLevel === 'low') return undefined

  // Add guiding question every few exchanges if user is engaged
  if (exchangeCount % 3 === 0 && currentPsychometrics.engagementLevel === 'high') {
    return {
      type: 'guiding_question',
      content: generateGuidingQuestion(state),
      purpose: 'Deepen understanding through guided inquiry'
    }
  }

  // Add challenge if user shows high confidence
  if (currentPsychometrics.overconfidenceSignals.length > 0) {
    return {
      type: 'challenge',
      content: generateChallenge(state),
      purpose: 'Test understanding and encourage deeper thinking'
    }
  }

  // Add application prompt if user has been understanding well
  if (state.insightsGained.length >= 2 && exchangeCount % 4 === 0) {
    return {
      type: 'application_prompt',
      content: 'How might you apply what you\'ve learned so far?',
      purpose: 'Encourage transfer of knowledge'
    }
  }

  // Add reflection prompt periodically
  if (exchangeCount >= 5 && exchangeCount % 5 === 0) {
    return {
      type: 'reflection_prompt',
      content: 'What\'s the most interesting thing you\'ve learned so far?',
      purpose: 'Encourage metacognitive reflection'
    }
  }

  return undefined
}

function generateGuidingQuestion(state: FreeformState): string {
  const recentTopics = state.topicsCovered.slice(-2)
  if (recentTopics.length === 0) {
    return 'What aspects of this topic interest you most?'
  }
  return `How do you think ${recentTopics[0]} relates to what we discussed earlier?`
}

function generateChallenge(state: FreeformState): string {
  const questions = [
    'What do you think would happen if the opposite were true?',
    'Can you think of a case where this might not apply?',
    'How would you explain this to someone with no background?',
    'What questions does this raise for you?'
  ]
  return questions[Math.floor(Math.random() * questions.length)]
}

/**
 * Generate system prompt for adaptive AI tutor
 */
export function generateTutorSystemPrompt(
  state: FreeformState,
  userMessage: string,
  userIntent: UserIntent,
  responseType: AIResponseType,
  psychometrics: ConversationalPsychometrics,
  strategicElement?: StrategicElement
): string {
  const { config, learnerProfile } = state

  let prompt = `You are an adaptive tutor helping a learner explore "${config.skillName}".

LEARNER PROFILE:
- Expertise level: ${learnerProfile.expertiseLevel}
- Learning style: ${learnerProfile.learningStyle}
- Abstraction preference: ${learnerProfile.abstractionPreference}
- Confidence level: ${learnerProfile.confidenceLevel}
- Vocabulary sophistication: ${Math.round(learnerProfile.vocabularySophistication * 100)}%

USER'S MESSAGE ANALYSIS:
- Intent: ${userIntent}
- Question depth: ${psychometrics.questionDepth}
- Engagement: ${psychometrics.engagementLevel}
${psychometrics.confusionIndicators.length > 0 ? `- SHOWING CONFUSION: ${psychometrics.confusionIndicators.join(', ')}` : ''}
${psychometrics.insightMoments.length > 0 ? `- HAD INSIGHT: ${psychometrics.insightMoments.join(', ')}` : ''}
${psychometrics.examplesSought ? '- SEEKING EXAMPLES' : ''}

YOUR RESPONSE TYPE: ${responseType}
`

  // Add response type guidance
  switch (responseType) {
    case 'scaffolded_explanation':
      prompt += `
APPROACH: Break down your explanation into simple steps. Start from basics.
- Use simple language appropriate for a ${learnerProfile.expertiseLevel}
- Give one concept at a time
- Check understanding at each step`
      break

    case 'guided_answer':
      prompt += `
APPROACH: Lead them toward understanding rather than just giving the answer.
- Ask a leading question OR
- Provide partial information that prompts thinking
- Encourage them to connect the dots`
      break

    case 'direct_answer':
      prompt += `
APPROACH: Give a clear, direct answer.
- Be concise but complete
- Match their vocabulary level
- Include relevant context`
      break

    case 'example_based':
      prompt += `
APPROACH: Use concrete examples to illustrate.
- Use ${learnerProfile.abstractionPreference === 'concrete' ? 'everyday, relatable' : 'varied'} examples
- Walk through the example step by step
- Connect the example back to the concept`
      break

    case 'connection_making':
      prompt += `
APPROACH: Help them see connections to other concepts.
- Reference topics they've asked about: ${state.topicsCovered.slice(-3).join(', ')}
- Show how ideas relate
- Build on their existing understanding`
      break

    case 'encouragement':
      prompt += `
APPROACH: Reinforce their understanding and build confidence.
- Acknowledge what they got right
- Highlight their progress
- Gently correct any minor misunderstandings`
      break

    case 'clarifying_question':
      prompt += `
APPROACH: Ask for clarification to better help them.
- Be specific about what you need to know
- Keep your question short
- Show you want to help`
      break

    case 'probing_question':
      prompt += `
APPROACH: Ask a deeper question to extend their thinking.
- Build on what they just said
- Push them to think one level deeper
- Don't make them feel interrogated`
      break

    case 'summary':
      prompt += `
APPROACH: Summarize the key points covered.
- Highlight 2-3 main takeaways
- Reference their insights
- Suggest what to explore next`
      break
  }

  // Add strategic element if present
  if (strategicElement) {
    prompt += `

STRATEGIC ELEMENT TO INCLUDE:
End your response with this ${strategicElement.type}:
"${strategicElement.content}"
(Purpose: ${strategicElement.purpose})`
  }

  prompt += `

IMPORTANT RULES:
1. Keep responses concise (2-4 sentences unless explaining something complex)
2. Match their vocabulary level
3. Be warm and encouraging
4. Don't lecture - respond to what THEY asked
5. NEVER start with "Great question!" - just answer naturally
6. If they're confused, acknowledge it and simplify
7. Use markdown formatting sparingly for emphasis only`

  return prompt
}

/**
 * Update conversation metrics after an exchange
 */
export function updateConversationMetrics(
  current: ConversationMetrics,
  psychometrics: ConversationalPsychometrics,
  hadInsight: boolean
): ConversationMetrics {
  const alpha = 0.3 // EMA factor

  // Update question depth average
  const depthScore = psychometrics.questionDepth === 'deep' ? 1 :
                    psychometrics.questionDepth === 'intermediate' ? 0.5 : 0.25

  // Calculate understanding for this exchange
  const understandingScore = (
    (psychometrics.insightMoments.length > 0 ? 0.3 : 0) +
    (psychometrics.understandingIndicators.length > 0 ? 0.3 : 0) +
    (psychometrics.confusionIndicators.length === 0 ? 0.2 : 0) +
    (psychometrics.selfAwarenessShown ? 0.2 : 0)
  )

  // Determine curiosity trend
  const recentCuriosity = psychometrics.curiosityLevel
  let curiosityTrend: 'increasing' | 'stable' | 'decreasing' = current.curiosityTrend
  const engagementDiff = recentCuriosity - current.averageEngagement
  if (engagementDiff > 0.1) curiosityTrend = 'increasing'
  else if (engagementDiff < -0.1) curiosityTrend = 'decreasing'
  else curiosityTrend = 'stable'

  return {
    totalQuestionsAsked: current.totalQuestionsAsked + (psychometrics.questionClarity > 0.3 ? 1 : 0),
    averageQuestionDepth: alpha * depthScore + (1 - alpha) * current.averageQuestionDepth,
    questionDiversityScore: current.questionDiversityScore, // Would need more sophisticated tracking
    understandingProgression: [...current.understandingProgression, understandingScore],
    misconceptionsCorrected: current.misconceptionsCorrected + (psychometrics.confusionIndicators.length > 0 ? 1 : 0),
    insightsReached: current.insightsReached + (hadInsight ? 1 : 0),
    averageEngagement: alpha * (
      psychometrics.engagementLevel === 'high' ? 0.9 :
      psychometrics.engagementLevel === 'medium' ? 0.6 : 0.3
    ) + (1 - alpha) * current.averageEngagement,
    curiosityTrend,
    sessionMomentum: Math.min(1, current.sessionMomentum + (psychometrics.engagementLevel === 'high' ? 0.1 : -0.05)),
    adaptationSuccessRate: current.adaptationSuccessRate, // Updated based on user feedback
  }
}

/**
 * Generate dialogue summary
 */
export function generateFreeformSummary(state: FreeformState): FreeformDialogueSummary {
  const metrics = state.conversationMetrics
  const exchangeCount = state.exchanges.length

  // Calculate overall scores
  const engagementScore = metrics.averageEngagement
  const understandingScore = metrics.understandingProgression.length > 0
    ? metrics.understandingProgression.reduce((a, b) => a + b, 0) / metrics.understandingProgression.length
    : 0.5
  const questionQualityScore = metrics.averageQuestionDepth

  // Generate highlights
  const highlights: string[] = []
  if (state.insightsGained.length > 0) {
    highlights.push(`You had ${state.insightsGained.length} "aha" moment${state.insightsGained.length > 1 ? 's' : ''}!`)
  }
  if (metrics.curiosityTrend === 'increasing') {
    highlights.push('Your curiosity grew throughout the session.')
  }
  if (metrics.averageQuestionDepth > 0.6) {
    highlights.push('You asked thoughtful, deep questions.')
  }
  if (state.topicsCovered.length > 2) {
    highlights.push(`You explored ${state.topicsCovered.length} different aspects of the topic.`)
  }

  // Generate suggestions
  const suggestions: string[] = []
  if (metrics.averageQuestionDepth < 0.4) {
    suggestions.push('Try asking more "why" and "how" questions to deepen understanding.')
  }
  if (state.misconceptionsAddressed.length > 0) {
    suggestions.push('Review the areas where you initially had questions.')
  }
  if (engagementScore < 0.5) {
    suggestions.push('Consider shorter, more focused practice sessions.')
  }

  return {
    totalExchanges: exchangeCount,
    topicsCovered: state.topicsCovered,
    insightsGained: state.insightsGained,
    questionsAsked: state.questionsAsked,
    metrics: {
      engagementScore,
      understandingScore,
      questionQualityScore,
      curiosityTrend: metrics.curiosityTrend,
    },
    highlights,
    suggestions,
    learnerProfileUpdates: inferProfileUpdates(state),
  }
}

export interface FreeformDialogueSummary {
  totalExchanges: number
  topicsCovered: string[]
  insightsGained: string[]
  questionsAsked: string[]
  metrics: {
    engagementScore: number
    understandingScore: number
    questionQualityScore: number
    curiosityTrend: 'increasing' | 'stable' | 'decreasing'
  }
  highlights: string[]
  suggestions: string[]
  learnerProfileUpdates: Partial<LearnerProfile>
}

/**
 * Infer profile updates from conversation
 */
function inferProfileUpdates(state: FreeformState): Partial<LearnerProfile> {
  const updates: Partial<LearnerProfile> = {}
  const metrics = state.conversationMetrics

  // Update confidence based on behavior
  const avgConfidence = state.exchanges.reduce((sum, e) =>
    sum + e.extractedPsychometrics.confidenceInQuestion, 0) / Math.max(1, state.exchanges.length)

  if (avgConfidence > 0.7) updates.confidenceLevel = 'high'
  else if (avgConfidence < 0.3) updates.confidenceLevel = 'low'

  // Update vocabulary sophistication based on technical term usage
  const techVocabUsage = state.exchanges.filter(e =>
    e.extractedPsychometrics.technicalVocabularyUsed).length / Math.max(1, state.exchanges.length)
  if (techVocabUsage > 0.5) updates.vocabularySophistication = 0.7
  else if (techVocabUsage < 0.2) updates.vocabularySophistication = 0.3

  // Update abstraction preference
  const exampleSeeking = state.exchanges.filter(e =>
    e.extractedPsychometrics.examplesSought).length / Math.max(1, state.exchanges.length)
  if (exampleSeeking > 0.5) updates.abstractionPreference = 'concrete'

  return updates
}

export default {
  initializeFreeformDialogue,
  generateWelcomeMessage,
  classifyUserIntent,
  extractConversationalPsychometrics,
  determineAIResponseType,
  generateStrategicElement,
  generateTutorSystemPrompt,
  updateConversationMetrics,
  generateFreeformSummary,
}
