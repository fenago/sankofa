import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Source } from "@/lib/types";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

const DEFAULT_MODEL = "gemini-2.5-flash";

function buildContentFromSources(sources: Source[], maxChars = 4000) {
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
      console.error("[Overview] Gemini API key is missing");
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const content = buildContentFromSources(sources, 3000);

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = customPrompt || DEFAULT_PROMPTS.overview.defaultPrompt;

    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will respond with JSON containing bullets and keyStats arrays." }] },
        { role: "user", parts: [{ text: content }] },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      console.error("[Overview] No content parts in response");
      throw new Error("No content generated");
    }

    let rawContent = parts.find((part: { text?: string }) => part.text)?.text || "{}";

    // Cleanup markdown code blocks if present
    rawContent = rawContent.replace(/```json\s*|\s*```/g, "").trim();

    const parsed = JSON.parse(rawContent);

    return NextResponse.json({
      notebookId,
      generatedAt: Date.now(),
      bullets: parsed.bullets || [],
      keyStats: parsed.keyStats || [],
    });
  } catch (error) {
    console.error("Overview generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
