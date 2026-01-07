import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { content, customPrompt } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is missing" },
        { status: 500 }
      );
    }

    // Use custom prompt or default
    const basePrompt = customPrompt || DEFAULT_PROMPTS.audioScript.defaultPrompt;
    const systemPrompt = basePrompt.replace("{{content}}", content);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a skilled podcast script writer." },
          { role: "user", content: systemPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[AudioScript] OpenAI API error:", error);
      return NextResponse.json(
        { error: error.error?.message || "Failed to generate script" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ script });
  } catch (error) {
    console.error("[AudioScript] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
