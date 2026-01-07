import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function POST(request: NextRequest) {
  try {
    const { context, customPrompt } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is missing" }, { status: 500 });
    }

    if (!context) {
      return NextResponse.json({ summary: "No content to summarize." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = customPrompt || DEFAULT_PROMPTS.summary.defaultPrompt;

    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will provide a structured, professional summary." }] },
        { role: "user", parts: [{ text: `Context:\n${context}` }] },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const summary = parts?.find((part: { text?: string }) => part.text)?.text;

    if (!summary) {
      console.error("[Summary] Empty response from Gemini");
      throw new Error("Gemini returned empty summary content");
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[Summary] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
