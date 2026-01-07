import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Source } from "@/lib/types";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

const DEFAULT_MODEL = "gemini-3-pro-image-preview"; // Exact match from user example

function buildContentFromSources(sources: Source[], maxChars = 5000) {
  const payload = sources
    .filter((s) => s.status === "success" && (s.text || s.content))
    .map((s, idx) => {
      const text = (s.text || s.content || "").slice(0, maxChars);
      return `[Source ${idx + 1}] ${s.title ?? s.url}\n${text}`;
    })
    .join("\n\n");
  if (!payload) {
    throw new Error("No source text available for generation.");
  }
  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const { notebookId, sources, customPrompt } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Slides] Gemini API key is missing");
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    // Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey });
    
    const model = DEFAULT_MODEL;

    const sourceContent = buildContentFromSources(sources);

    // Use custom prompt if provided, otherwise use default
    // Replace {{sources}} placeholder with actual source content
    const basePrompt = customPrompt || DEFAULT_PROMPTS.slides.defaultPrompt;
    const prompt = basePrompt.replace("{{sources}}", sourceContent);

    // Create chat and send message
    const chat = ai.chats.create({
      model: model,
    });

    const response = await chat.sendMessage({ message: prompt });

    // Extract the generated text from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      console.error("[Slides] No content parts in response");
      throw new Error("No content generated");
    }

    const generatedText = parts.find((part: any) => part.text)?.text;
    if (!generatedText) {
      console.error("[Slides] No text in response parts");
      throw new Error("No text content generated");
    }

    // Parse the JSON response
    let slidesData;
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanedText = generatedText.replace(/```json\s*|\s*```/g, '').trim();
      slidesData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("[Slides] Failed to parse JSON:", generatedText);
      throw new Error("Invalid JSON response from Gemini");
    }

    if (!slidesData.slides || !Array.isArray(slidesData.slides)) {
      console.error("[Slides] Invalid slides structure:", slidesData);
      throw new Error("Invalid slides structure");
    }

    return NextResponse.json({
      notebookId,
      generatedAt: Date.now(),
      slides: slidesData.slides,
    });

  } catch (error) {
    console.error("[Slides] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
