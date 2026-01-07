import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/prompts";
import { ResponseLength } from "@/lib/types";

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

export async function POST(request: NextRequest) {
  try {
    const { messages, context, enableImageGeneration, customPrompt, responseLength } = await request.json() as {
      messages: { role: string; content: string }[];
      context?: string;
      enableImageGeneration?: boolean;
      customPrompt?: string;
      responseLength?: ResponseLength;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use custom prompt if provided, otherwise use default
    const basePrompt = customPrompt || DEFAULT_PROMPTS.chat.defaultPrompt;
    // Replace {{context}} placeholder with actual context
    const lengthInstruction = RESPONSE_LENGTH_INSTRUCTIONS[responseLength || "detailed"];
    const systemPrompt = basePrompt.replace("{{context}}", context || "No specific source context provided.") +
      lengthInstruction +
      (enableImageGeneration ? "\nYou can generate images when it would help explain concepts. When generating images, describe what you're creating." : "");

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

    // Create a ReadableStream from the Gemini stream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.text) {
                  controller.enqueue(new TextEncoder().encode(part.text));
                } else if (part.inlineData) {
                  // For image data, send as a special marker
                  const imageMarker = `\n[IMAGE:data:${part.inlineData.mimeType};base64,${part.inlineData.data}]\n`;
                  controller.enqueue(new TextEncoder().encode(imageMarker));
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
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
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
