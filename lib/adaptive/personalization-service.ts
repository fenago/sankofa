/**
 * Personalization Service
 *
 * Uses learner profile data from educational psychology frameworks
 * to personalize outputs (chat, study tools, artifacts).
 */

import type { InverseProfile } from '@/lib/types/interactions'

// ============================================
// Types
// ============================================

export interface PersonalizationContext {
  // Learner characteristics
  expertiseLevel: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  cognitiveLoadCapacity: 'low' | 'medium' | 'high'
  optimalDifficulty: number // 0-1
  scaffoldLevel: number // 1-4

  // Learning preferences inferred from behavior
  preferredPacing: 'slow' | 'moderate' | 'fast'
  needsMoreExamples: boolean
  needsSimplifiedLanguage: boolean

  // Metacognitive adjustments
  confidenceCalibration: 'overconfident' | 'calibrated' | 'underconfident' | 'unknown'
  helpSeekingPattern: 'avoidant' | 'appropriate' | 'excessive' | 'unknown'

  // Content adjustments
  bloomTargetLevel: number // 1-6
  emphasizePrerequisites: boolean
  includeVerificationPrompts: boolean

  // Specific recommendations
  recommendations: string[]
}

export interface PersonalizationPromptAdditions {
  systemPromptAddition: string
  contentGuidelines: string[]
  toneAdjustments: string[]
  structuralAdjustments: string[]
}

// ============================================
// Build Personalization Context
// ============================================

export function buildPersonalizationContext(
  profile: InverseProfile | null,
  masteredCount: number = 0,
  totalSkills: number = 0,
  avgAccuracy: number = 0.5
): PersonalizationContext {
  // Default context for new/unknown learners
  const defaultContext: PersonalizationContext = {
    expertiseLevel: 'beginner',
    cognitiveLoadCapacity: 'medium',
    optimalDifficulty: 0.5,
    scaffoldLevel: 2,
    preferredPacing: 'moderate',
    needsMoreExamples: true,
    needsSimplifiedLanguage: false,
    confidenceCalibration: 'unknown',
    helpSeekingPattern: 'unknown',
    bloomTargetLevel: 2,
    emphasizePrerequisites: true,
    includeVerificationPrompts: false,
    recommendations: [],
  }

  if (!profile) {
    return defaultContext
  }

  const cognitive = profile.cognitive_indicators
  const metacognitive = profile.metacognitive_indicators
  const motivational = profile.motivational_indicators
  const behavioral = profile.behavioral_patterns

  // Determine expertise level
  const expertiseLevel = cognitive?.expertiseLevel ?? 'beginner'

  // Determine cognitive load capacity
  const workingMemory = cognitive?.workingMemoryIndicator ?? 'medium'
  const cognitiveLoadCapacity = workingMemory as 'low' | 'medium' | 'high'

  // Calculate optimal difficulty
  const optimalDifficulty = cognitive?.optimalComplexityLevel ?? 0.5

  // Determine scaffold level based on mastery and accuracy
  let scaffoldLevel = 2
  if (avgAccuracy >= 0.85 && masteredCount > totalSkills * 0.5) {
    scaffoldLevel = 4 // Minimal scaffolding
  } else if (avgAccuracy >= 0.7 && masteredCount > totalSkills * 0.25) {
    scaffoldLevel = 3 // Some scaffolding
  } else if (avgAccuracy >= 0.5) {
    scaffoldLevel = 2 // Moderate scaffolding
  } else {
    scaffoldLevel = 1 // Full scaffolding
  }

  // Determine pacing from response times
  const avgResponseTime = cognitive?.averageResponseTimeMs ?? 30000
  let preferredPacing: 'slow' | 'moderate' | 'fast' = 'moderate'
  if (avgResponseTime > 60000) {
    preferredPacing = 'slow'
  } else if (avgResponseTime < 15000) {
    preferredPacing = 'fast'
  }

  // Determine if needs more examples
  const needsMoreExamples = expertiseLevel === 'novice' || expertiseLevel === 'beginner' || avgAccuracy < 0.6

  // Determine if needs simplified language
  const needsSimplifiedLanguage = expertiseLevel === 'novice' || cognitiveLoadCapacity === 'low'

  // Determine confidence calibration
  let confidenceCalibration: 'overconfident' | 'calibrated' | 'underconfident' | 'unknown' = 'unknown'
  if (metacognitive?.calibrationAccuracy !== null && metacognitive?.calibrationAccuracy !== undefined) {
    const overconfidence = metacognitive.overconfidenceRate ?? 0
    const underconfidence = metacognitive.underconfidenceRate ?? 0

    if (overconfidence > 0.3) {
      confidenceCalibration = 'overconfident'
    } else if (underconfidence > 0.3) {
      confidenceCalibration = 'underconfident'
    } else if (metacognitive.calibrationAccuracy > 0.5) {
      confidenceCalibration = 'calibrated'
    }
  }

  // Get help-seeking pattern
  const helpSeekingPattern = (metacognitive?.helpSeekingPattern ?? 'unknown') as PersonalizationContext['helpSeekingPattern']

  // Determine Bloom target level based on expertise
  const bloomTargetMap: Record<string, number> = {
    novice: 1,
    beginner: 2,
    intermediate: 3,
    advanced: 4,
    expert: 5,
  }
  const bloomTargetLevel = bloomTargetMap[expertiseLevel] ?? 2

  // Determine if should emphasize prerequisites
  const emphasizePrerequisites = expertiseLevel === 'novice' || expertiseLevel === 'beginner' || avgAccuracy < 0.5

  // Determine if should include verification prompts
  const includeVerificationPrompts = confidenceCalibration === 'overconfident'

  // Build recommendations
  const recommendations: string[] = []

  if (confidenceCalibration === 'overconfident') {
    recommendations.push('Include "Are you sure?" prompts before revealing answers')
  }
  if (confidenceCalibration === 'underconfident') {
    recommendations.push('Provide encouragement and highlight correct reasoning')
  }
  if (helpSeekingPattern === 'avoidant') {
    recommendations.push('Proactively offer hints without requiring explicit requests')
  }
  if (helpSeekingPattern === 'excessive') {
    recommendations.push('Encourage attempting problems before seeking help')
  }
  if (needsMoreExamples) {
    recommendations.push('Include worked examples before practice')
  }
  if (cognitiveLoadCapacity === 'low') {
    recommendations.push('Break content into smaller chunks')
  }

  return {
    expertiseLevel: expertiseLevel as PersonalizationContext['expertiseLevel'],
    cognitiveLoadCapacity,
    optimalDifficulty,
    scaffoldLevel,
    preferredPacing,
    needsMoreExamples,
    needsSimplifiedLanguage,
    confidenceCalibration,
    helpSeekingPattern,
    bloomTargetLevel,
    emphasizePrerequisites,
    includeVerificationPrompts,
    recommendations,
  }
}

// ============================================
// Generate Prompt Additions
// ============================================

export function generatePromptAdditions(context: PersonalizationContext): PersonalizationPromptAdditions {
  const systemPromptParts: string[] = []
  const contentGuidelines: string[] = []
  const toneAdjustments: string[] = []
  const structuralAdjustments: string[] = []

  // Expertise level adjustments
  switch (context.expertiseLevel) {
    case 'novice':
      systemPromptParts.push('The learner is a novice. Use simple, accessible language and avoid jargon.')
      contentGuidelines.push('Define all technical terms when first used')
      contentGuidelines.push('Start with fundamental concepts before building up')
      toneAdjustments.push('Be encouraging and patient')
      break
    case 'beginner':
      systemPromptParts.push('The learner is a beginner building foundational knowledge.')
      contentGuidelines.push('Explain technical terms briefly')
      contentGuidelines.push('Connect new concepts to familiar ideas')
      break
    case 'intermediate':
      systemPromptParts.push('The learner has intermediate knowledge. You can use technical terms with brief context.')
      contentGuidelines.push('Focus on deeper understanding and connections')
      break
    case 'advanced':
      systemPromptParts.push('The learner is advanced. You can use technical language and discuss nuances.')
      contentGuidelines.push('Explore edge cases and advanced applications')
      break
    case 'expert':
      systemPromptParts.push('The learner is an expert. Engage at a peer level with sophisticated discussion.')
      contentGuidelines.push('Focus on cutting-edge topics and research')
      break
  }

  // Cognitive load adjustments
  if (context.cognitiveLoadCapacity === 'low') {
    structuralAdjustments.push('Break information into small, digestible chunks')
    structuralAdjustments.push('Use bullet points and clear headings')
    structuralAdjustments.push('Limit to 2-3 main points per response')
  } else if (context.cognitiveLoadCapacity === 'high') {
    structuralAdjustments.push('Can include more comprehensive explanations')
    structuralAdjustments.push('Okay to discuss multiple related concepts together')
  }

  // Scaffold level adjustments
  if (context.scaffoldLevel <= 2) {
    contentGuidelines.push('Provide step-by-step guidance')
    contentGuidelines.push('Include worked examples before asking learner to try')
  } else if (context.scaffoldLevel >= 3) {
    contentGuidelines.push('Give learner space to work through problems')
    contentGuidelines.push('Provide hints rather than full solutions when asked for help')
  }

  // Examples preference
  if (context.needsMoreExamples) {
    contentGuidelines.push('Include concrete examples for every concept')
    contentGuidelines.push('Use analogies to familiar situations')
  }

  // Language simplification
  if (context.needsSimplifiedLanguage) {
    contentGuidelines.push('Use shorter sentences')
    contentGuidelines.push('Prefer common words over technical jargon')
    structuralAdjustments.push('Include visual descriptions or analogies')
  }

  // Confidence calibration adjustments
  if (context.confidenceCalibration === 'overconfident') {
    contentGuidelines.push('Include prompts like "Take a moment to verify your understanding"')
    contentGuidelines.push('Present common misconceptions to address')
    toneAdjustments.push('Gently challenge assumptions')
  } else if (context.confidenceCalibration === 'underconfident') {
    toneAdjustments.push('Highlight what the learner is doing well')
    toneAdjustments.push('Reinforce correct reasoning explicitly')
    contentGuidelines.push('Acknowledge difficulty while expressing confidence in their ability')
  }

  // Help-seeking pattern adjustments
  if (context.helpSeekingPattern === 'avoidant') {
    contentGuidelines.push('Proactively offer additional resources or explanations')
    toneAdjustments.push('Normalize asking for help')
  } else if (context.helpSeekingPattern === 'excessive') {
    contentGuidelines.push('Encourage attempting the problem first')
    contentGuidelines.push('When giving hints, ask what they\'ve tried so far')
  }

  // Prerequisites emphasis
  if (context.emphasizePrerequisites) {
    contentGuidelines.push('Check understanding of prerequisite concepts')
    contentGuidelines.push('Offer to review foundational material if needed')
  }

  // Bloom level targeting
  const bloomDescriptions: Record<number, string> = {
    1: 'Focus on recall and recognition of facts',
    2: 'Help with understanding and explaining concepts',
    3: 'Guide application of knowledge to new situations',
    4: 'Encourage analysis and breaking down complex ideas',
    5: 'Support evaluation and making judgments',
    6: 'Foster creation of new ideas and synthesis',
  }
  if (bloomDescriptions[context.bloomTargetLevel]) {
    contentGuidelines.push(bloomDescriptions[context.bloomTargetLevel])
  }

  // Build final system prompt addition
  const systemPromptAddition = systemPromptParts.length > 0
    ? `\n\n## Learner Profile Personalization\n${systemPromptParts.join(' ')}`
    : ''

  return {
    systemPromptAddition,
    contentGuidelines,
    toneAdjustments,
    structuralAdjustments,
  }
}

// ============================================
// Generate Full Personalized System Prompt
// ============================================

export function generatePersonalizedSystemPrompt(
  basePrompt: string,
  context: PersonalizationContext
): string {
  const additions = generatePromptAdditions(context)

  let personalizedPrompt = basePrompt + additions.systemPromptAddition

  if (additions.contentGuidelines.length > 0) {
    personalizedPrompt += `\n\n### Content Guidelines\n${additions.contentGuidelines.map(g => `- ${g}`).join('\n')}`
  }

  if (additions.toneAdjustments.length > 0) {
    personalizedPrompt += `\n\n### Tone\n${additions.toneAdjustments.map(t => `- ${t}`).join('\n')}`
  }

  if (additions.structuralAdjustments.length > 0) {
    personalizedPrompt += `\n\n### Structure\n${additions.structuralAdjustments.map(s => `- ${s}`).join('\n')}`
  }

  return personalizedPrompt
}

// ============================================
// Personalize for Specific Use Cases
// ============================================

export function personalizeForChat(
  context: PersonalizationContext
): { systemAddition: string; responseGuidelines: string[] } {
  const additions = generatePromptAdditions(context)

  return {
    systemAddition: additions.systemPromptAddition,
    responseGuidelines: [
      ...additions.contentGuidelines,
      ...additions.toneAdjustments,
      ...additions.structuralAdjustments,
    ],
  }
}

export function personalizeForStudyTool(
  context: PersonalizationContext,
  toolType: 'study_guide' | 'practice_questions' | 'concept_explainer' | 'misconception' | 'prerequisite'
): { difficultyLevel: string; scaffoldingLevel: string; additionalInstructions: string[] } {
  const difficultyMap: Record<string, string> = {
    novice: 'introductory',
    beginner: 'foundational',
    intermediate: 'intermediate',
    advanced: 'advanced',
    expert: 'expert',
  }

  const scaffoldMap: Record<number, string> = {
    1: 'full scaffolding with step-by-step guidance',
    2: 'moderate scaffolding with hints available',
    3: 'light scaffolding with occasional prompts',
    4: 'minimal scaffolding for independent practice',
  }

  const additionalInstructions: string[] = []

  // Tool-specific personalization
  switch (toolType) {
    case 'study_guide':
      if (context.needsMoreExamples) {
        additionalInstructions.push('Include 2-3 worked examples per concept')
      }
      if (context.needsSimplifiedLanguage) {
        additionalInstructions.push('Use clear, simple language throughout')
      }
      break

    case 'practice_questions':
      additionalInstructions.push(`Target difficulty: ${Math.round(context.optimalDifficulty * 100)}%`)
      if (context.scaffoldLevel <= 2) {
        additionalInstructions.push('Include hints with each question')
      }
      if (context.includeVerificationPrompts) {
        additionalInstructions.push('Add "check your answer" prompts')
      }
      break

    case 'concept_explainer':
      if (context.emphasizePrerequisites) {
        additionalInstructions.push('Start by reviewing prerequisite concepts')
      }
      additionalInstructions.push(`Target Bloom level: ${context.bloomTargetLevel}`)
      break

    case 'misconception':
      if (context.confidenceCalibration === 'overconfident') {
        additionalInstructions.push('Emphasize why the misconception seems reasonable')
      }
      break

    case 'prerequisite':
      additionalInstructions.push('Be thorough in covering foundational gaps')
      break
  }

  return {
    difficultyLevel: difficultyMap[context.expertiseLevel] ?? 'intermediate',
    scaffoldingLevel: scaffoldMap[context.scaffoldLevel] ?? 'moderate scaffolding',
    additionalInstructions,
  }
}

export function personalizeForArtifact(
  context: PersonalizationContext
): { complexity: string; visualStyle: string; textDensity: string } {
  // Determine visual complexity based on cognitive load
  const complexityMap: Record<string, string> = {
    low: 'simple and clean with minimal elements',
    medium: 'balanced with moderate detail',
    high: 'detailed and comprehensive',
  }

  // Determine text density
  const textDensityMap: Record<string, string> = {
    novice: 'minimal text, focus on visuals',
    beginner: 'brief labels and short explanations',
    intermediate: 'balanced text and visuals',
    advanced: 'detailed annotations acceptable',
    expert: 'can include technical detail',
  }

  // Visual style based on expertise
  const visualStyleMap: Record<string, string> = {
    novice: 'friendly, approachable, use icons and simple graphics',
    beginner: 'clear and organized with helpful labels',
    intermediate: 'professional with good information hierarchy',
    advanced: 'sophisticated with detailed information',
    expert: 'technical and precise',
  }

  return {
    complexity: complexityMap[context.cognitiveLoadCapacity] ?? 'balanced with moderate detail',
    visualStyle: visualStyleMap[context.expertiseLevel] ?? 'clear and organized',
    textDensity: textDensityMap[context.expertiseLevel] ?? 'balanced text and visuals',
  }
}
