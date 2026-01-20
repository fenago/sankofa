/**
 * Question Generator for Practice Sessions
 *
 * Generates practice questions using Gemini based on skill content and scaffold level.
 * Implements adaptive question difficulty based on IRT and Bloom's Taxonomy.
 */

import { GoogleGenAI } from '@google/genai'
import type { SkillNode, BloomLevel } from '@/lib/types/graph'
import { createClient } from '@/lib/supabase/server'

// Model configuration
const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const TEXT_MODEL_FALLBACK = 'gemini-2.5-flash'

// Question types
export type QuestionType = 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank'

// Generated question structure
export interface GeneratedQuestion {
  id: string
  skillId: string
  type: QuestionType
  question: string
  options?: string[] // For multiple choice
  correctAnswer: string
  explanation: string
  hints: string[] // 3 progressive hints
  difficulty: number // 0-1 scale
  bloomLevel: BloomLevel
  scaffoldLevel: 1 | 2 | 3 | 4
  workedExample?: string // For scaffold level 1
  partialSolution?: string // For scaffold level 2
}

// Question generation config
export interface QuestionGenerationConfig {
  count: number
  scaffoldLevel: 1 | 2 | 3 | 4
  bloomLevels?: BloomLevel[]
  questionTypes?: QuestionType[]
  difficultyAdjustment?: number // -0.3 to +0.3 from adaptive service
  includeWorkedExamples?: boolean
}

// Cache key for questions
interface CacheKey {
  skillId: string
  scaffoldLevel: number
  bloomLevel?: BloomLevel
  type?: QuestionType
}

/**
 * Generate a unique question ID
 */
function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Map Bloom's level to appropriate question types
 */
function getQuestionTypesForBloom(bloomLevel: BloomLevel): QuestionType[] {
  switch (bloomLevel) {
    case 1: // Remember
      return ['multiple_choice', 'true_false', 'fill_blank']
    case 2: // Understand
      return ['multiple_choice', 'free_response', 'true_false']
    case 3: // Apply
      return ['free_response', 'multiple_choice', 'fill_blank']
    case 4: // Analyze
      return ['free_response', 'multiple_choice']
    case 5: // Evaluate
      return ['free_response']
    case 6: // Create
      return ['free_response']
    default:
      return ['multiple_choice', 'free_response']
  }
}

/**
 * Generate prompt for question generation
 */
function buildQuestionPrompt(
  skill: SkillNode,
  sourceContent: string,
  config: QuestionGenerationConfig
): string {
  const { count, scaffoldLevel, bloomLevels, questionTypes, difficultyAdjustment = 0 } = config

  const targetBloom = bloomLevels?.[0] || skill.bloomLevel
  const types = questionTypes || getQuestionTypesForBloom(targetBloom)

  // Difficulty description based on scaffold level and adjustment
  const baseDifficulty = scaffoldLevel === 1 ? 'easy' :
                         scaffoldLevel === 2 ? 'easy to medium' :
                         scaffoldLevel === 3 ? 'medium' : 'medium to challenging'

  const adjustmentNote = difficultyAdjustment > 0.1
    ? 'Lean toward the harder end of the range.'
    : difficultyAdjustment < -0.1
    ? 'Lean toward the easier end of the range.'
    : ''

  // Scaffold-specific instructions
  const scaffoldInstructions = scaffoldLevel === 1
    ? `For scaffold level 1 (FULL SUPPORT):
       - Include a complete worked example showing step-by-step solution
       - Make questions straightforward and confidence-building
       - Provide very explicit hints that nearly give away the answer`
    : scaffoldLevel === 2
    ? `For scaffold level 2 (PARTIAL SUPPORT):
       - Include a partial solution that gets them started
       - Leave the final 1-2 steps for them to complete
       - Provide helpful but not obvious hints`
    : scaffoldLevel === 3
    ? `For scaffold level 3 (HINTS ON REQUEST):
       - No worked examples or partial solutions
       - Hints should guide thinking without giving answers
       - Questions should require genuine problem-solving`
    : `For scaffold level 4 (INDEPENDENT):
       - No scaffolding provided
       - Challenging questions that test deep understanding
       - Minimal hints that only clarify the question, not the solution`

  return `You are an expert educational assessment designer. Generate ${count} practice question(s) for the following skill.

**SKILL INFORMATION:**
- Name: ${skill.name}
- Description: ${skill.description}
- Bloom's Taxonomy Level: ${targetBloom} (${getBloomLabel(targetBloom)})
- Domain: ${skill.domain || 'General'}
${skill.commonMisconceptions?.length ? `- Common Misconceptions: ${skill.commonMisconceptions.join(', ')}` : ''}

**SOURCE CONTENT:**
${sourceContent.slice(0, 3000)}

**REQUIREMENTS:**
1. Difficulty: ${baseDifficulty}. ${adjustmentNote}
2. Question types to use: ${types.join(', ')}
3. ${scaffoldInstructions}

**OUTPUT FORMAT:**
Return a JSON array of questions with this structure:
[
  {
    "type": "multiple_choice" | "free_response" | "true_false" | "fill_blank",
    "question": "The question text",
    "options": ["A", "B", "C", "D"], // Only for multiple_choice, 4 options
    "correctAnswer": "The correct answer (for MC, use the option text not letter)",
    "explanation": "Why this answer is correct (2-3 sentences)",
    "hints": [
      "Hint 1: Very subtle hint",
      "Hint 2: More helpful hint",
      "Hint 3: Nearly gives the answer away"
    ],
    "difficulty": 0.3, // 0-1 scale
    "workedExample": "Full solution walkthrough (only for scaffold level 1)",
    "partialSolution": "Starting steps of solution (only for scaffold level 2)"
  }
]

IMPORTANT:
- For fill_blank questions, use _____ to indicate the blank in the question
- For multiple_choice, always provide exactly 4 options
- Make distractors (wrong options) plausible but clearly incorrect
- Avoid tricky wording - test understanding, not reading comprehension
- Ensure questions are solvable using ONLY the provided source content
- Return ONLY the JSON array, no other text`
}

/**
 * Get Bloom's Taxonomy label
 */
function getBloomLabel(level: BloomLevel): string {
  const labels: Record<BloomLevel, string> = {
    1: 'Remember',
    2: 'Understand',
    3: 'Apply',
    4: 'Analyze',
    5: 'Evaluate',
    6: 'Create',
  }
  return labels[level]
}

/**
 * Generate questions using Gemini
 */
export async function generateQuestions(
  skill: SkillNode,
  sourceContent: string,
  config: QuestionGenerationConfig
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const ai = new GoogleGenAI({ apiKey })
  const prompt = buildQuestionPrompt(skill, sourceContent, config)

  let responseText: string

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    })
    responseText = response.text || ''
  } catch (error) {
    console.warn(`[QuestionGenerator] Primary model failed, trying fallback:`, error)

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_FALLBACK,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    })
    responseText = response.text || ''
  }

  // Parse the response
  let rawQuestions: unknown[]
  try {
    // Clean up response if needed
    const cleanedResponse = responseText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    rawQuestions = JSON.parse(cleanedResponse)
    if (!Array.isArray(rawQuestions)) {
      throw new Error('Response is not an array')
    }
  } catch (parseError) {
    console.error('[QuestionGenerator] Failed to parse response:', responseText)
    throw new Error('Failed to parse generated questions')
  }

  // Transform to GeneratedQuestion format
  const questions: GeneratedQuestion[] = rawQuestions.map((q: unknown) => {
    const raw = q as Record<string, unknown>
    return {
      id: generateQuestionId(),
      skillId: skill.id,
      type: (raw.type as QuestionType) || 'multiple_choice',
      question: (raw.question as string) || '',
      options: raw.options as string[] | undefined,
      correctAnswer: (raw.correctAnswer as string) || '',
      explanation: (raw.explanation as string) || '',
      hints: (raw.hints as string[]) || ['Think about the key concept.', 'Review the definition.', 'The answer relates to the main idea.'],
      difficulty: typeof raw.difficulty === 'number' ? raw.difficulty : 0.5,
      bloomLevel: skill.bloomLevel,
      scaffoldLevel: config.scaffoldLevel,
      workedExample: raw.workedExample as string | undefined,
      partialSolution: raw.partialSolution as string | undefined,
    }
  })

  return questions
}

/**
 * Cache questions in Supabase for reuse
 */
export async function cacheQuestions(
  notebookId: string,
  questions: GeneratedQuestion[]
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  // Store in practice_questions table (create if needed)
  // Note: Type assertion needed until practice_questions table is created
  const { error } = await (supabase as any)
    .from('practice_questions')
    .upsert(
      questions.map(q => ({
        id: q.id,
        notebook_id: notebookId,
        user_id: user.id,
        skill_id: q.skillId,
        question_type: q.type,
        question_data: {
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          hints: q.hints,
          workedExample: q.workedExample,
          partialSolution: q.partialSolution,
        },
        difficulty: q.difficulty,
        bloom_level: q.bloomLevel,
        scaffold_level: q.scaffoldLevel,
        created_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    )

  if (error) {
    console.warn('[QuestionGenerator] Failed to cache questions:', error)
  }
}

/**
 * Get cached questions or generate new ones
 */
export async function getOrGenerateQuestions(
  skill: SkillNode,
  sourceContent: string,
  config: QuestionGenerationConfig,
  notebookId: string
): Promise<GeneratedQuestion[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Try to get cached questions first
  // Note: Type assertion needed until practice_questions table is created
  const { data: cached } = await (supabase as any)
    .from('practice_questions')
    .select('*')
    .eq('notebook_id', notebookId)
    .eq('skill_id', skill.id)
    .eq('scaffold_level', config.scaffoldLevel)
    .limit(config.count)

  if (cached && cached.length >= config.count) {
    // Transform cached questions back to GeneratedQuestion format
    return cached.slice(0, config.count).map((c: any) => ({
      id: c.id,
      skillId: c.skill_id,
      type: c.question_type as QuestionType,
      question: c.question_data.question,
      options: c.question_data.options,
      correctAnswer: c.question_data.correctAnswer,
      explanation: c.question_data.explanation,
      hints: c.question_data.hints,
      difficulty: c.difficulty,
      bloomLevel: c.bloom_level as BloomLevel,
      scaffoldLevel: c.scaffold_level as 1 | 2 | 3 | 4,
      workedExample: c.question_data.workedExample,
      partialSolution: c.question_data.partialSolution,
    }))
  }

  // Generate new questions
  const questions = await generateQuestions(skill, sourceContent, config)

  // Cache for future use
  await cacheQuestions(notebookId, questions)

  return questions
}

/**
 * Get source content for a skill
 */
export async function getSkillSourceContent(
  notebookId: string,
  skillId: string
): Promise<string> {
  const supabase = await createClient()

  // Get the skill's source document
  const { data: sources } = await supabase
    .from('sources')
    .select('raw_text, title')
    .eq('notebook_id', notebookId)
    .eq('status', 'success')
    .limit(5)

  if (!sources || sources.length === 0) {
    return 'No source content available. Generate questions based on the skill name and description only.'
  }

  // Combine source content
  const combinedContent = sources
    .map(s => `## ${s.title || 'Source'}\n${s.raw_text || ''}`)
    .join('\n\n')
    .slice(0, 8000) // Limit total content

  return combinedContent
}

/**
 * Generate a worked example for a skill
 */
export async function generateWorkedExample(
  skill: SkillNode,
  sourceContent: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `Create a detailed worked example for teaching this skill:

**SKILL:** ${skill.name}
**DESCRIPTION:** ${skill.description}
**BLOOM LEVEL:** ${skill.bloomLevel} (${getBloomLabel(skill.bloomLevel)})

**SOURCE CONTENT:**
${sourceContent.slice(0, 2000)}

Create a step-by-step worked example that:
1. Presents a realistic problem or scenario
2. Shows the complete solution with clear steps
3. Explains the reasoning at each step
4. Highlights key concepts and potential pitfalls
5. Uses simple, clear language

Format with markdown. Include:
- **Problem:** The scenario or question
- **Step 1, 2, 3...:** Numbered solution steps with explanations
- **Key Takeaway:** Summary of what to remember

Return ONLY the worked example, no other text.`

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return response.text || 'Worked example not available.'
}
