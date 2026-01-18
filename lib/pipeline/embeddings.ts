/**
 * Embedding generation using Google's Gemini embedding model
 * Model: gemini-embedding-001
 * Output: 3072 dimensions (full precision)
 */

import { GoogleGenAI } from '@google/genai'

// Task types for optimized embeddings
export type EmbeddingTaskType =
  | 'RETRIEVAL_DOCUMENT' // For documents to be retrieved
  | 'RETRIEVAL_QUERY' // For search queries
  | 'SEMANTIC_SIMILARITY' // For comparing text similarity
  | 'CLASSIFICATION' // For text classification
  | 'CLUSTERING' // For clustering similar texts
  | 'QUESTION_ANSWERING' // For Q&A contexts
  | 'FACT_VERIFICATION' // For fact-checking

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 3072

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const ai = getClient()

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  })

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error('No embedding returned from API')
  }

  const embedding = response.embeddings[0].values
  if (!embedding) {
    throw new Error('Empty embedding values')
  }

  // Normalize embedding for cosine similarity (required for non-3072 dimensions)
  return normalizeEmbedding(embedding)
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[][]> {
  if (texts.length === 0) return []

  const ai = getClient()

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  })

  if (!response.embeddings) {
    throw new Error('No embeddings returned from API')
  }

  return response.embeddings.map(e => {
    if (!e.values) throw new Error('Empty embedding values')
    return normalizeEmbedding(e.values)
  })
}

/**
 * Generate embedding for a search query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query, 'RETRIEVAL_QUERY')
}

/**
 * Generate embeddings for documents to be stored
 */
export async function generateDocumentEmbeddings(
  documents: string[]
): Promise<number[][]> {
  return generateEmbeddings(documents, 'RETRIEVAL_DOCUMENT')
}

/**
 * Normalize embedding vector (L2 normalization)
 * Required for accurate cosine similarity with reduced dimensions
 */
function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  )

  if (magnitude === 0) return embedding

  return embedding.map(val => val / magnitude)
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) return 0

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Batch embeddings with rate limiting
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT',
  batchSize: number = 100,
  delayMs: number = 100
): Promise<number[][]> {
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const embeddings = await generateEmbeddings(batch, taskType)
    results.push(...embeddings)

    // Rate limiting delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}

export { EMBEDDING_DIMENSIONS }
