/**
 * Text chunking utilities for RAG pipeline
 * Uses character-based chunking with overlap for simplicity and reliability
 */

export interface ChunkOptions {
  maxChunkSize?: number // Characters per chunk (default: 1500 ~= 375 tokens)
  overlap?: number // Overlap characters (default: 200)
  minChunkSize?: number // Minimum chunk size (default: 100)
}

export interface TextChunk {
  content: string
  index: number
  startChar: number
  endChar: number
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1500, // ~375 tokens at 4 chars/token
  overlap: 200,
  minChunkSize: 100,
}

/**
 * Split text into overlapping chunks
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: TextChunk[] = []

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleanedText || cleanedText.length === 0) {
    return []
  }

  if (cleanedText.length <= opts.maxChunkSize) {
    return [{
      content: cleanedText,
      index: 0,
      startChar: 0,
      endChar: cleanedText.length,
    }]
  }

  let startIndex = 0
  let chunkIndex = 0
  const maxIterations = Math.ceil(cleanedText.length / Math.max(opts.minChunkSize, 1)) + 10
  let iterations = 0

  while (startIndex < cleanedText.length && iterations < maxIterations) {
    iterations++
    let endIndex = Math.min(startIndex + opts.maxChunkSize, cleanedText.length)

    // If not at the end, try to break at a natural boundary
    if (endIndex < cleanedText.length) {
      const searchStart = Math.max(startIndex + opts.minChunkSize, endIndex - 200)
      if (searchStart < endIndex) {
        const searchText = cleanedText.slice(searchStart, endIndex)

        // Find the best break point (paragraph > sentence > word)
        const paragraphBreak = searchText.lastIndexOf('\n\n')
        const sentenceBreak = Math.max(
          searchText.lastIndexOf('. '),
          searchText.lastIndexOf('? '),
          searchText.lastIndexOf('! ')
        )
        const wordBreak = searchText.lastIndexOf(' ')

        if (paragraphBreak > 0) {
          endIndex = searchStart + paragraphBreak + 2
        } else if (sentenceBreak > 0) {
          endIndex = searchStart + sentenceBreak + 2
        } else if (wordBreak > 0) {
          endIndex = searchStart + wordBreak + 1
        }
      }
    }

    const chunkContent = cleanedText.slice(startIndex, endIndex).trim()

    if (chunkContent.length >= opts.minChunkSize) {
      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        startChar: startIndex,
        endChar: endIndex,
      })
      chunkIndex++
    }

    // Move start index, accounting for overlap - ensure forward progress
    const nextStart = endIndex - opts.overlap
    startIndex = Math.max(nextStart, startIndex + 1) // Always move forward at least 1 char

    if (startIndex >= cleanedText.length - opts.minChunkSize) {
      break
    }
  }

  return chunks
}

/**
 * Estimate token count (rough approximation: 4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Chunk text with token-based sizing
 */
export function chunkByTokens(
  text: string,
  maxTokens: number = 512,
  overlapTokens: number = 50
): TextChunk[] {
  return chunkText(text, {
    maxChunkSize: maxTokens * 4,
    overlap: overlapTokens * 4,
    minChunkSize: 50 * 4,
  })
}

/**
 * Smart chunking that respects document structure (headers, lists, etc.)
 */
export function chunkDocument(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Split by major sections (markdown headers)
  const sections = text.split(/(?=^#{1,3}\s)/m)

  const chunks: TextChunk[] = []
  let globalIndex = 0
  let charOffset = 0

  for (const section of sections) {
    if (section.trim().length === 0) continue

    if (section.length <= opts.maxChunkSize) {
      chunks.push({
        content: section.trim(),
        index: globalIndex++,
        startChar: charOffset,
        endChar: charOffset + section.length,
      })
    } else {
      // Section is too large, chunk it further
      const subChunks = chunkText(section, opts)
      for (const subChunk of subChunks) {
        chunks.push({
          content: subChunk.content,
          index: globalIndex++,
          startChar: charOffset + subChunk.startChar,
          endChar: charOffset + subChunk.endChar,
        })
      }
    }

    charOffset += section.length
  }

  return chunks
}
