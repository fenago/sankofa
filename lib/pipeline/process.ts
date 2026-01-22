/**
 * Pipeline processing for ingested documents
 * Chunks text, generates embeddings, and stores in Supabase
 *
 * NOTE: Graph extraction is disabled here - too slow for serverless.
 * Users can trigger graph building manually via "Build Graph" button.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { chunkDocument, estimateTokens } from './chunking'
import { batchGenerateEmbeddings } from './embeddings'
import type { SourceType } from '@/lib/types/database'

interface ProcessSourceOptions {
  sourceId: string
  notebookId: string
  userId: string
  text: string
  title?: string
  url?: string
  filename?: string
  sourceType: SourceType
}

/**
 * Process a source through the RAG pipeline:
 * 1. Store source metadata
 * 2. Chunk the text
 * 3. Generate embeddings
 * 4. Store chunks with embeddings
 */
export async function processSource(options: ProcessSourceOptions): Promise<{
  success: boolean
  sourceId: string
  chunkCount: number
  error?: string
}> {
  const { sourceId, notebookId, userId, text, title, url, filename, sourceType } = options
  const supabase = createAdminClient()

  try {
    // Update source status to processing
    await supabase
      .from('sources')
      .update({ status: 'processing' })
      .eq('id', sourceId)

    // Chunk the text
    const chunks = chunkDocument(text, {
      maxChunkSize: 1500, // ~375 tokens
      overlap: 200,
    })

    if (chunks.length === 0) {
      throw new Error('No content to process')
    }

    // Generate embeddings for all chunks (batched to avoid API limits)
    const chunkTexts = chunks.map(c => c.content)
    const embeddings = await batchGenerateEmbeddings(chunkTexts, 'RETRIEVAL_DOCUMENT', 100, 100)

    // Prepare chunks for insertion
    const chunkInserts = chunks.map((chunk, idx) => ({
      source_id: sourceId,
      notebook_id: notebookId,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: embeddings[idx],
      token_count: estimateTokens(chunk.content),
    }))

    // Insert chunks in batches (Supabase has a limit)
    const BATCH_SIZE = 50
    for (let i = 0; i < chunkInserts.length; i += BATCH_SIZE) {
      const batch = chunkInserts.slice(i, i + BATCH_SIZE)
      const { error: insertError } = await supabase
        .from('chunks')
        .insert(batch)

      if (insertError) {
        throw insertError
      }
    }

    // Update source status to success
    await supabase
      .from('sources')
      .update({
        status: 'success',
        raw_text: text,
        title: title || filename || url,
      })
      .eq('id', sourceId)

    console.log(`[Pipeline] Source ${sourceId} complete: ${chunks.length} chunks`)

    // Graph extraction is intentionally skipped - too slow for serverless
    // Users can trigger graph building manually via "Build Graph" button

    return {
      success: true,
      sourceId,
      chunkCount: chunks.length,
    }
  } catch (error) {
    console.error('Pipeline processing error:', error)

    // Update source status to error
    await supabase
      .from('sources')
      .update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Processing failed',
      })
      .eq('id', sourceId)

    return {
      success: false,
      sourceId,
      chunkCount: 0,
      error: error instanceof Error ? error.message : 'Processing failed',
    }
  }
}

/**
 * Create a source record and return its ID
 */
export async function createSource(options: {
  notebookId: string
  userId: string
  sourceType: SourceType
  url?: string
  title?: string
  filename?: string
}): Promise<string> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sources')
    .insert({
      notebook_id: options.notebookId,
      user_id: options.userId,
      source_type: options.sourceType,
      url: options.url,
      title: options.title,
      filename: options.filename,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Failed to create source record')
  }

  return data.id
}

/**
 * Delete a source and all associated chunks
 */
export async function deleteSource(sourceId: string): Promise<void> {
  const supabase = createAdminClient()

  // Chunks will cascade delete due to foreign key
  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', sourceId)

  if (error) {
    throw error
  }
}
