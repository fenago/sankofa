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
      console.error("[Mindmap] Gemini API key is missing");
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const content = buildContentFromSources(sources, 4000);

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = customPrompt || DEFAULT_PROMPTS.mindmap.defaultPrompt;

    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will output only valid JSON in the specified mindmap structure." }] },
        { role: "user", parts: [{ text: content }] },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      console.error("[Mindmap] No content parts in response");
      throw new Error("No content generated");
    }

    let rawContent = parts.find((part: { text?: string }) => part.text)?.text || "{}";
    console.log("[Mindmap] Raw content from Gemini:", rawContent);

    // Cleanup markdown code blocks if present
    rawContent = rawContent.replace(/```json\s*|\s*```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("Failed to parse JSON:", rawContent);
      throw new Error("Failed to parse Gemini response as JSON");
    }

    // Handle case where root object is returned directly or wrapped in "root"
    let rootNode = parsed.root || parsed;
    if (rootNode.title && !rootNode.children) {
      rootNode.children = [];
    }

    // Ensure root node has proper structure
    if (!rootNode || !rootNode.title) {
      console.error("[Mindmap] Invalid root structure:", parsed);
      throw new Error("Invalid mindmap structure returned from Gemini");
    }

    return NextResponse.json({
      notebookId,
      generatedAt: Date.now(),
      root: rootNode,
    });
  } catch (error) {
    console.error("Mindmap generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
