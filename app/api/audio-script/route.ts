import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(request: NextRequest) {
  try {
    const { content, customPrompt } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    // Use custom prompt or default
    const basePrompt = customPrompt || DEFAULT_PROMPTS.audioScript.defaultPrompt;
    const userPrompt = basePrompt.replace("{{content}}", content);

    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: DEFAULT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: "You are a skilled podcast script writer.",
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const script = response.text || "";

    return NextResponse.json({ script });
  } catch (error) {
    console.error("[AudioScript] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
