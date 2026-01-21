import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/prompts";
import { ResponseLength } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { generateQueryEmbedding } from "@/lib/pipeline/embeddings";
import { buildPersonalizationContext, personalizeForChat } from "@/lib/adaptive/personalization-service";
import type { InverseProfile } from "@/lib/types/interactions";

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = "gemini-2.5-flash";

const RESPONSE_LENGTH_INSTRUCTIONS: Record<ResponseLength, string> = {
  short: `
Keep your response brief and to the point (2-3 sentences).
Only include the most essential information.`,
  medium: `
Provide a balanced response with moderate detail (1-2 paragraphs).
Include key points and some supporting details.`,
  detailed: `
Provide a comprehensive, detailed response.
Include thorough explanations, examples, and supporting details.
Structure your response with clear sections when appropriate.
Aim for 3-5 paragraphs or more if the topic warrants it.`
};

interface SearchResult {
  id: string
  source_id: string
  content: string
  similarity: number
}

interface LearnerStats {
  profile: InverseProfile | null
  masteredCount: number
  totalSkills: number
  avgAccuracy: number
}

/**
 * Fetch learner profile and stats for personalization
 */
async function getLearnerStats(
  notebookId: string,
  userId: string
): Promise<LearnerStats> {
  try {
    const supabase = await createClient();

    // Fetch inverse profile
    const { data: profileData } = await supabase
      .from('inverse_profiles')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', userId)
      .single();

    const profile: InverseProfile | null = profileData
      ? {
          id: profileData.id,
          learner_id: profileData.learner_id,
          notebook_id: profileData.notebook_id,
          version: profileData.version,
          computed_at: profileData.computed_at,
          interactions_analyzed: profileData.interactions_analyzed,
          knowledge_state: profileData.knowledge_state as unknown as InverseProfile['knowledge_state'],
          cognitive_indicators: profileData.cognitive_indicators as unknown as InverseProfile['cognitive_indicators'],
          metacognitive_indicators: profileData.metacognitive_indicators as unknown as InverseProfile['metacognitive_indicators'],
          motivational_indicators: profileData.motivational_indicators as unknown as InverseProfile['motivational_indicators'],
          behavioral_patterns: profileData.behavioral_patterns as unknown as InverseProfile['behavioral_patterns'],
          confidence_scores: profileData.confidence_scores as unknown as InverseProfile['confidence_scores'],
        }
      : null;

    // Fetch practice stats
    const { data: practiceInteractions } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', userId)
      .eq('event_type', 'practice_attempt');

    let avgAccuracy = 0.5;
    if (practiceInteractions && practiceInteractions.length > 0) {
      const correctCount = practiceInteractions.filter(
        i => (i.payload as Record<string, unknown>)?.isCorrect === true
      ).length;
      avgAccuracy = correctCount / practiceInteractions.length;
    }

    // Get skill counts from profile
    const masteredCount = profile?.knowledge_state?.skillsMastered ?? 0;
    const totalSkills = (profile?.knowledge_state?.skillsMastered ?? 0) +
      (profile?.knowledge_state?.skillsInProgress ?? 0) +
      (profile?.knowledge_state?.skillsNotStarted ?? 0);

    return {
      profile,
      masteredCount,
      totalSkills,
      avgAccuracy,
    };
  } catch (error) {
    console.error('[Chat] Error fetching learner stats:', error);
    return {
      profile: null,
      masteredCount: 0,
      totalSkills: 0,
      avgAccuracy: 0.5,
    };
  }
}

/**
 * Perform RAG search to get relevant context from the notebook
 */
async function getRAGContext(
  notebookId: string,
  query: string,
  limit: number = 10
): Promise<{ context: string; sources: { id: string; content: string; similarity: number }[] }> {
  try {
    const supabase = await createClient();

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // Perform vector search with lower threshold for better recall
    const { data: results, error } = await supabase
      .rpc('match_chunks', {
        query_embedding: queryEmbedding,
        p_notebook_id: notebookId,
        match_count: limit,
        similarity_threshold: 0.3,
      });

    console.log(`[RAG] Query: "${query.slice(0, 50)}..." | Chunks found: ${results?.length || 0}`);

    if (error) {
      console.error('[RAG] Search error:', error);
      return { context: "", sources: [] };
    }

    if (!results || results.length === 0) {
      console.log('[RAG] No matching chunks found');
      return { context: "", sources: [] };
    }

    // Get source titles for citations
    const sourceIds = [...new Set(results.map((r: SearchResult) => r.source_id))];
    const { data: sourcesData } = await supabase
      .from('sources')
      .select('id, title, url')
      .in('id', sourceIds);

    const sourceMap = new Map(sourcesData?.map(s => [s.id, s]) || []);

    // Build context with source attribution
    const contextParts = results.map((r: SearchResult, idx: number) => {
      const source = sourceMap.get(r.source_id);
      const sourceRef = source?.title || source?.url || `Source ${idx + 1}`;
      return `[${sourceRef}]\n${r.content}`;
    });

    return {
      context: contextParts.join('\n\n---\n\n'),
      sources: results.map((r: SearchResult) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
      })),
    };
  } catch (error) {
    console.error('RAG search error:', error);
    return { context: "", sources: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      messages,
      context: providedContext,
      enableImageGeneration,
      customPrompt,
      responseLength,
      notebookId,
      useRAG = true,
    } = await request.json() as {
      messages: { role: string; content: string }[];
      context?: string;
      enableImageGeneration?: boolean;
      customPrompt?: string;
      responseLength?: ResponseLength;
      notebookId?: string;
      useRAG?: boolean;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const supabase = await createClient();

    // Get current user for personalization
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch learner profile and stats for personalization (non-blocking)
    let personalizationAddition = '';
    if (notebookId && user) {
      try {
        const learnerStats = await getLearnerStats(notebookId, user.id);
        const personalizationContext = buildPersonalizationContext(
          learnerStats.profile,
          learnerStats.masteredCount,
          learnerStats.totalSkills,
          learnerStats.avgAccuracy
        );
        const chatPersonalization = personalizeForChat(personalizationContext);

        if (chatPersonalization.systemAddition || chatPersonalization.responseGuidelines.length > 0) {
          personalizationAddition = chatPersonalization.systemAddition;
          if (chatPersonalization.responseGuidelines.length > 0) {
            personalizationAddition += `\n\n### Personalized Guidelines\n${chatPersonalization.responseGuidelines.map(g => `- ${g}`).join('\n')}`;
          }
          console.log('[Chat] Applied personalization for learner');
        }
      } catch (personalizationError) {
        console.warn('[Chat] Personalization skipped:', personalizationError);
        // Continue without personalization
      }
    }

    // Determine context - use RAG if notebookId provided and useRAG is true
    let context = providedContext || "";
    let ragSources: { id: string; content: string; similarity: number }[] = [];

    if (notebookId && useRAG && messages.length > 0) {
      // Get the latest user message for RAG query
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMessage) {
        const ragResult = await getRAGContext(notebookId, lastUserMessage.content);
        if (ragResult.context) {
          context = ragResult.context;
          ragSources = ragResult.sources;
        }
      }
    }

    // Use custom prompt if provided, otherwise use default
    const basePrompt = customPrompt || DEFAULT_PROMPTS.chat.defaultPrompt;

    // Build the context section
    let contextSection = "No specific source context provided.";
    if (context) {
      contextSection = `The following is relevant context from the user's sources:\n\n${context}\n\nUse this context to answer questions accurately. When citing information, reference the source it came from.`;
    }

    // Replace {{context}} placeholder with actual context
    const lengthInstruction = RESPONSE_LENGTH_INSTRUCTIONS[responseLength || "detailed"];
    const systemPrompt = basePrompt.replace("{{context}}", contextSection) +
      lengthInstruction +
      (enableImageGeneration ? "\nYou can generate images when it would help explain concepts. When generating images, describe what you're creating." : "") +
      personalizationAddition;

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Add system instruction as the first user message if needed
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I'm LearnGraph, ready to help with questions based on the provided sources." }] },
      ...geminiMessages,
    ];

    // Use streaming for text responses
    const streamResponse = await ai.models.generateContentStream({
      model: enableImageGeneration ? "gemini-2.5-flash-preview-04-17" : model,
      contents,
      config: enableImageGeneration ? {
        responseModalities: ["TEXT", "IMAGE"],
      } : undefined,
    });

    // Create a ReadableStream from the Gemini stream with word-by-word chunking
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.text) {
                  // Break text into words for smoother streaming
                  const words = part.text.split(/(\s+)/); // Split but keep whitespace
                  for (const word of words) {
                    if (word) {
                      controller.enqueue(encoder.encode(word));
                      // Small delay between words for visual streaming effect
                      await new Promise(resolve => setTimeout(resolve, 15));
                    }
                  }
                } else if (part.inlineData) {
                  // For image data, send as a special marker
                  const imageMarker = `\n[IMAGE:data:${part.inlineData.mimeType};base64,${part.inlineData.data}]\n`;
                  controller.enqueue(encoder.encode(imageMarker));
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Transfer-Encoding": "chunked",
        // Include RAG sources info in header if available
        ...(ragSources.length > 0 ? {
          "X-RAG-Source-Count": ragSources.length.toString(),
        } : {}),
      },
    });
  } catch (error) {
    console.error("[Chat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
