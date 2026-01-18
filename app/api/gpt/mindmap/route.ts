import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Source } from "@/lib/types";
import { DEFAULT_PROMPTS } from "@/lib/prompts";
import { isNeo4JAvailable } from "@/lib/graph/neo4j";
import { getSkillGraph, getEntitiesByNotebook } from "@/lib/graph/store";

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Build structured context from the knowledge graph (if available)
 */
async function buildGraphContext(notebookId: string): Promise<string | null> {
  if (!isNeo4JAvailable()) {
    return null;
  }

  try {
    const [skillGraph, entities] = await Promise.all([
      getSkillGraph(notebookId),
      getEntitiesByNotebook(notebookId),
    ]);

    if (skillGraph.skills.length === 0 && entities.length === 0) {
      return null;
    }

    const parts: string[] = [];

    if (skillGraph.skills.length > 0) {
      const skillList = skillGraph.skills
        .map((s) => `- ${s.name}: ${s.description || ""}`)
        .join("\n");
      parts.push(`KEY CONCEPTS/SKILLS IDENTIFIED:\n${skillList}`);

      // Include prerequisites as relationships
      if (skillGraph.prerequisites.length > 0) {
        const prereqList = skillGraph.prerequisites
          .map((p) => {
            const fromSkill = skillGraph.skills.find((s) => s.id === p.fromSkillId);
            const toSkill = skillGraph.skills.find((s) => s.id === p.toSkillId);
            if (fromSkill && toSkill) {
              return `- "${fromSkill.name}" is a prerequisite for "${toSkill.name}"`;
            }
            return null;
          })
          .filter(Boolean)
          .join("\n");
        if (prereqList) {
          parts.push(`\nCONCEPT RELATIONSHIPS:\n${prereqList}`);
        }
      }
    }

    if (entities.length > 0) {
      const entityList = entities
        .slice(0, 20) // Limit to top 20 entities
        .map((e) => `- ${e.name} (${e.type})${e.description ? `: ${e.description}` : ""}`)
        .join("\n");
      parts.push(`\nKEY ENTITIES:\n${entityList}`);
    }

    return parts.join("\n\n");
  } catch (error) {
    console.error("[Mindmap] Error fetching graph context:", error);
    return null;
  }
}

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
    const sourceContent = buildContentFromSources(sources, 4000);

    // Try to get graph context if available (enhances mindmap with extracted knowledge)
    let graphContext: string | null = null;
    if (notebookId) {
      graphContext = await buildGraphContext(notebookId);
      if (graphContext) {
        console.log("[Mindmap] Including graph context with", graphContext.split("\n").length, "lines");
      }
    }

    // Build final content with graph context if available
    const content = graphContext
      ? `${graphContext}\n\n---\n\nSOURCE CONTENT:\n${sourceContent}`
      : sourceContent;

    // Use custom prompt if provided, otherwise use default
    const basePrompt = customPrompt || DEFAULT_PROMPTS.mindmap.defaultPrompt;
    const systemPrompt = graphContext
      ? `${basePrompt}\n\nIMPORTANT: Use the KEY CONCEPTS/SKILLS and their RELATIONSHIPS to structure the mindmap hierarchically. The concept relationships indicate prerequisite knowledge flow.`
      : basePrompt;

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
      graphEnhanced: !!graphContext, // Indicates if knowledge graph data was used
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
