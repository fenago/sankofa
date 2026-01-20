/**
 * Answer Evaluator for Practice Sessions
 *
 * Evaluates learner answers against correct answers.
 * Supports exact matching for objective questions and semantic similarity for free response.
 */

import { GoogleGenAI } from '@google/genai'
import type { GeneratedQuestion, QuestionType } from './question-generator'

// Model configuration
const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const TEXT_MODEL_FALLBACK = 'gemini-2.5-flash'

// Evaluation result structure
export interface EvaluationResult {
  isCorrect: boolean
  score: number // 0-1, allows partial credit
  correctAnswer: string
  userAnswer: string
  explanation: string
  misconceptionIdentified?: string
  suggestedRemediation?: string
}

// Free response evaluation from Gemini
interface FreeResponseEvaluation {
  isCorrect: boolean
  partialCredit: number
  feedbackMessage: string
  misconception?: string
  keyConceptsMissing?: string[]
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"]/g, '')
}

/**
 * Check if two strings are approximately equal
 */
function stringsApproximatelyEqual(a: string, b: string, threshold = 0.9): boolean {
  const normA = normalizeString(a)
  const normB = normalizeString(b)

  if (normA === normB) return true

  // Calculate Levenshtein similarity
  const distance = levenshteinDistance(normA, normB)
  const maxLength = Math.max(normA.length, normB.length)
  const similarity = 1 - distance / maxLength

  return similarity >= threshold
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Evaluate a multiple choice answer
 */
function evaluateMultipleChoice(
  userAnswer: string,
  correctAnswer: string,
  explanation: string
): EvaluationResult {
  const isCorrect = stringsApproximatelyEqual(userAnswer, correctAnswer, 0.85)

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer,
    userAnswer,
    explanation: isCorrect
      ? `Correct! ${explanation}`
      : `Incorrect. The correct answer is: ${correctAnswer}. ${explanation}`,
  }
}

/**
 * Evaluate a true/false answer
 */
function evaluateTrueFalse(
  userAnswer: string,
  correctAnswer: string,
  explanation: string
): EvaluationResult {
  const normalizedUser = normalizeString(userAnswer)
  const normalizedCorrect = normalizeString(correctAnswer)

  const userTrue = ['true', 't', 'yes', '1'].includes(normalizedUser)
  const userFalse = ['false', 'f', 'no', '0'].includes(normalizedUser)
  const correctTrue = ['true', 't', 'yes', '1'].includes(normalizedCorrect)

  const isCorrect = (userTrue && correctTrue) || (userFalse && !correctTrue)

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer,
    userAnswer,
    explanation: isCorrect
      ? `Correct! ${explanation}`
      : `Incorrect. The correct answer is: ${correctAnswer}. ${explanation}`,
  }
}

/**
 * Evaluate a fill-in-the-blank answer
 */
function evaluateFillBlank(
  userAnswer: string,
  correctAnswer: string,
  explanation: string
): EvaluationResult {
  // More lenient matching for fill-in-blank
  const isCorrect = stringsApproximatelyEqual(userAnswer, correctAnswer, 0.8)

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer,
    userAnswer,
    explanation: isCorrect
      ? `Correct! ${explanation}`
      : `Incorrect. The correct answer is: "${correctAnswer}". ${explanation}`,
  }
}

/**
 * Evaluate a free response answer using Gemini
 */
async function evaluateFreeResponse(
  question: GeneratedQuestion,
  userAnswer: string
): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Fall back to simple keyword matching
    return evaluateFreeResponseSimple(question, userAnswer)
  }

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `You are an expert educational assessor. Evaluate a student's free-response answer.

**QUESTION:** ${question.question}

**CORRECT ANSWER (reference):** ${question.correctAnswer}

**STUDENT'S ANSWER:** ${userAnswer}

**SKILL BEING ASSESSED:** ${question.skillId}

Evaluate the answer for:
1. Correctness - Does it accurately answer the question?
2. Completeness - Are all key points covered?
3. Understanding - Does it demonstrate real understanding vs. surface knowledge?

Return a JSON object:
{
  "isCorrect": true/false (true if answer demonstrates understanding),
  "partialCredit": 0.0-1.0 (0 = completely wrong, 1 = perfect),
  "feedbackMessage": "2-3 sentences explaining what was good/wrong",
  "misconception": "If incorrect, what misconception might the student have? (or null)",
  "keyConceptsMissing": ["concept1", "concept2"] (or empty array)
}

Be fair but rigorous. Partial credit should reflect genuine partial understanding.
Return ONLY the JSON object, no other text.`

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const responseText = response.text || ''
    const cleanedResponse = responseText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const evaluation: FreeResponseEvaluation = JSON.parse(cleanedResponse)

    return {
      isCorrect: evaluation.isCorrect,
      score: evaluation.partialCredit,
      correctAnswer: question.correctAnswer,
      userAnswer,
      explanation: evaluation.feedbackMessage,
      misconceptionIdentified: evaluation.misconception || undefined,
      suggestedRemediation: evaluation.keyConceptsMissing?.length
        ? `Review these concepts: ${evaluation.keyConceptsMissing.join(', ')}`
        : undefined,
    }
  } catch (error) {
    console.warn('[AnswerEvaluator] Gemini evaluation failed, using simple matching:', error)
    return evaluateFreeResponseSimple(question, userAnswer)
  }
}

/**
 * Simple free response evaluation (fallback)
 */
function evaluateFreeResponseSimple(
  question: GeneratedQuestion,
  userAnswer: string
): EvaluationResult {
  const normalizedUser = normalizeString(userAnswer)
  const normalizedCorrect = normalizeString(question.correctAnswer)

  // Check for keyword overlap
  const correctWords = normalizedCorrect.split(' ').filter(w => w.length > 3)
  const userWords = normalizedUser.split(' ').filter(w => w.length > 3)

  let matchingWords = 0
  for (const word of correctWords) {
    if (userWords.some(uw => stringsApproximatelyEqual(word, uw, 0.8))) {
      matchingWords++
    }
  }

  const keywordScore = correctWords.length > 0
    ? matchingWords / correctWords.length
    : 0

  // Check for exact match
  const exactSimilarity = stringsApproximatelyEqual(userAnswer, question.correctAnswer, 0.7)

  const score = exactSimilarity ? 1 : Math.min(0.7, keywordScore)
  const isCorrect = score >= 0.7

  return {
    isCorrect,
    score,
    correctAnswer: question.correctAnswer,
    userAnswer,
    explanation: isCorrect
      ? `Good answer! ${question.explanation}`
      : score > 0.3
      ? `Partially correct. ${question.explanation}`
      : `Incorrect. The expected answer was: ${question.correctAnswer}. ${question.explanation}`,
  }
}

/**
 * Main evaluation function
 */
export async function evaluateAnswer(
  question: GeneratedQuestion,
  userAnswer: string
): Promise<EvaluationResult> {
  // Validate inputs
  if (!userAnswer || userAnswer.trim().length === 0) {
    return {
      isCorrect: false,
      score: 0,
      correctAnswer: question.correctAnswer,
      userAnswer: '',
      explanation: 'No answer provided.',
    }
  }

  // Route to appropriate evaluator based on question type
  switch (question.type) {
    case 'multiple_choice':
      return evaluateMultipleChoice(
        userAnswer,
        question.correctAnswer,
        question.explanation
      )

    case 'true_false':
      return evaluateTrueFalse(
        userAnswer,
        question.correctAnswer,
        question.explanation
      )

    case 'fill_blank':
      return evaluateFillBlank(
        userAnswer,
        question.correctAnswer,
        question.explanation
      )

    case 'free_response':
      return evaluateFreeResponse(question, userAnswer)

    default:
      return evaluateFreeResponse(question, userAnswer)
  }
}

/**
 * Batch evaluate multiple answers
 */
export async function evaluateAnswers(
  questionsAndAnswers: Array<{ question: GeneratedQuestion; answer: string }>
): Promise<EvaluationResult[]> {
  const results = await Promise.all(
    questionsAndAnswers.map(({ question, answer }) =>
      evaluateAnswer(question, answer)
    )
  )
  return results
}

/**
 * Calculate overall session score
 */
export function calculateSessionScore(results: EvaluationResult[]): {
  totalScore: number
  percentCorrect: number
  averagePartialCredit: number
  strongAreas: string[]
  weakAreas: string[]
} {
  if (results.length === 0) {
    return {
      totalScore: 0,
      percentCorrect: 0,
      averagePartialCredit: 0,
      strongAreas: [],
      weakAreas: [],
    }
  }

  const correctCount = results.filter(r => r.isCorrect).length
  const totalPartialCredit = results.reduce((sum, r) => sum + r.score, 0)

  return {
    totalScore: correctCount,
    percentCorrect: (correctCount / results.length) * 100,
    averagePartialCredit: totalPartialCredit / results.length,
    strongAreas: [], // Could be populated with skill analysis
    weakAreas: results
      .filter(r => !r.isCorrect && r.misconceptionIdentified)
      .map(r => r.misconceptionIdentified!)
      .filter((v, i, a) => a.indexOf(v) === i), // Unique values
  }
}
