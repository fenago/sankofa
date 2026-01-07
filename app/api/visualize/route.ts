import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Source, VisualizationMode, DiagramType } from "@/lib/types";

// Model configurations by tier
const MODELS = {
  standard: {
    text: "gemini-3-flash-preview",
    image: "gemini-2.5-flash-image",
  },
  pro: {
    text: "gemini-3-pro-preview",
    image: "gemini-3-pro-image-preview",
  },
} as const;

type ModelTier = keyof typeof MODELS;
const DEFAULT_TIER: ModelTier = "pro";
const MAX_VALIDATION_RETRIES = 2;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fixedSyntax?: string;
}

/**
 * Validates and sanitizes Mermaid syntax
 * Returns validation result with any auto-fixes applied
 */
function validateMermaidSyntax(syntax: string, diagramType: DiagramType): ValidationResult {
  const errors: string[] = [];
  let fixedSyntax = syntax.trim();

  // Remove markdown code blocks if present
  fixedSyntax = fixedSyntax.replace(/```mermaid\s*/gi, "").replace(/\s*```/g, "").trim();

  // Check for valid diagram type declaration
  const typePatterns: Record<DiagramType, RegExp> = {
    flowchart: /^flowchart\s+(TD|TB|BT|RL|LR)/i,
    mindmap: /^mindmap/i,
    sequence: /^sequenceDiagram/i,
    classDiagram: /^classDiagram/i,
    stateDiagram: /^stateDiagram(-v2)?/i,
  };

  if (!typePatterns[diagramType].test(fixedSyntax)) {
    errors.push(`Missing or invalid diagram type declaration for ${diagramType}`);
    // Try to add the declaration
    const declarations: Record<DiagramType, string> = {
      flowchart: "flowchart TD",
      mindmap: "mindmap",
      sequence: "sequenceDiagram",
      classDiagram: "classDiagram",
      stateDiagram: "stateDiagram-v2",
    };
    if (!fixedSyntax.startsWith(declarations[diagramType])) {
      fixedSyntax = `${declarations[diagramType]}\n${fixedSyntax}`;
    }
  }

  // Remove problematic characters from node labels
  // Handle parentheses in text (common issue)
  fixedSyntax = fixedSyntax
    .replace(/\[([^\]]*)\(([^)]*)\)([^\]]*)\]/g, "[$1 - $2$3]") // [text(info)] -> [text - info]
    .replace(/\(([^)]+)\)/g, (match, content) => {
      // Only replace parentheses that are in labels, not syntax like subgraph end
      if (content.includes("-->") || content.includes("---")) return match;
      return ` - ${content}`;
    });

  // Remove HTML entities that can cause issues
  fixedSyntax = fixedSyntax
    .replace(/&amp;/g, "and")
    .replace(/&lt;/g, "less than")
    .replace(/&gt;/g, "greater than")
    .replace(/&quot;/g, "'")
    .replace(/&#39;/g, "'");

  // Fix common quote issues in labels
  fixedSyntax = fixedSyntax
    .replace(/[""]|[""]/g, '"') // Normalize smart quotes
    .replace(/['']/g, "'");

  // Check for unbalanced brackets
  const brackets = { "[": 0, "]": 0, "{": 0, "}": 0 };
  for (const char of fixedSyntax) {
    if (char in brackets) {
      brackets[char as keyof typeof brackets]++;
    }
  }
  if (brackets["["] !== brackets["]"]) {
    errors.push("Unbalanced square brackets detected");
  }
  if (brackets["{"] !== brackets["}"]) {
    errors.push("Unbalanced curly braces detected");
  }

  // Check for empty node definitions
  if (/\[\s*\]/.test(fixedSyntax)) {
    errors.push("Empty node label detected");
    fixedSyntax = fixedSyntax.replace(/\[\s*\]/g, "[Node]");
  }

  // Check for invalid arrow syntax
  if (/--[^->]/.test(fixedSyntax) && !/---/.test(fixedSyntax)) {
    errors.push("Potentially invalid arrow syntax");
  }

  // Remove any lines that are just whitespace or incomplete
  const lines = fixedSyntax.split("\n");
  const cleanedLines = lines.filter((line) => {
    const trimmed = line.trim();
    // Keep non-empty lines and diagram declarations
    return trimmed.length > 0;
  });
  fixedSyntax = cleanedLines.join("\n");

  // For mindmaps, ensure proper indentation structure
  if (diagramType === "mindmap") {
    // Mindmap specific fixes
    fixedSyntax = fixedSyntax.replace(/^\s*root\s*\(/gi, "  root(");
  }

  // Final check: ensure we have content beyond just the declaration
  const contentLines = fixedSyntax.split("\n").filter((l) => l.trim().length > 0);
  if (contentLines.length < 2) {
    errors.push("Diagram appears to be empty or incomplete");
  }

  return {
    isValid: errors.length === 0,
    errors,
    fixedSyntax,
  };
}

/**
 * Attempts to fix invalid Mermaid syntax using LLM
 */
async function fixMermaidWithLLM(
  ai: GoogleGenAI,
  model: string,
  invalidSyntax: string,
  errors: string[],
  diagramType: DiagramType
): Promise<string> {
  const fixPrompt = `The following Mermaid ${diagramType} diagram has syntax errors:

ERRORS DETECTED:
${errors.map((e) => `- ${e}`).join("\n")}

INVALID SYNTAX:
\`\`\`
${invalidSyntax}
\`\`\`

Please fix the syntax errors and return ONLY valid Mermaid syntax.
Rules:
- Do NOT use parentheses () in node labels or text
- Do NOT use special characters like &, <, >, or quotes in labels
- Ensure all brackets are properly balanced
- Make sure the diagram type declaration is correct
- Return ONLY the fixed Mermaid code, no explanations`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: fixPrompt }] }],
  });

  const parts = response.candidates?.[0]?.content?.parts;
  let fixed = parts?.find((part: { text?: string }) => part.text)?.text || "";
  fixed = fixed.replace(/```mermaid\s*|\s*```/g, "").trim();
  return fixed;
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
    throw new Error("No source text available for visualization.");
  }
  return payload;
}

const MERMAID_PROMPTS: Record<DiagramType, string> = {
  flowchart: `Analyze the provided content and create a Mermaid flowchart diagram.
Output ONLY valid Mermaid syntax starting with "flowchart TD" or "flowchart LR".
Use clear node labels and meaningful connections.
Keep it focused on the main concepts and their relationships.
IMPORTANT: Do NOT use parentheses (), brackets [], or special characters in node labels. Use simple text only.
If you need to show additional info, use separate nodes connected with edges.
Do not include any explanation, only the Mermaid code.`,

  mindmap: `Analyze the provided content and create a Mermaid mindmap diagram.
Output ONLY valid Mermaid syntax starting with "mindmap".
Structure the main topic in the center with branching subtopics.
Keep it concise with 3-4 main branches and 2-3 sub-branches each.
IMPORTANT: Do NOT use parentheses (), brackets [], or special characters in labels. Use simple text only.
Do not include any explanation, only the Mermaid code.`,

  sequence: `Analyze the provided content and create a Mermaid sequence diagram.
Output ONLY valid Mermaid syntax starting with "sequenceDiagram".
Show the key interactions or steps as a sequence of events.
Include relevant participants and their interactions.
IMPORTANT: Do NOT use parentheses (), brackets [], or special characters in participant names or messages. Use simple text only.
Do not include any explanation, only the Mermaid code.`,

  classDiagram: `Analyze the provided content and create a Mermaid class diagram.
Output ONLY valid Mermaid syntax starting with "classDiagram".
Identify the main entities and their relationships.
Include relevant attributes and methods where applicable.
IMPORTANT: Do NOT use parentheses (), brackets [], or special characters in class names or labels. Use simple text only.
Do not include any explanation, only the Mermaid code.`,

  stateDiagram: `Analyze the provided content and create a Mermaid state diagram.
Output ONLY valid Mermaid syntax starting with "stateDiagram-v2".
Show the key states and transitions based on the content.
Include initial and final states where appropriate.
IMPORTANT: Do NOT use parentheses (), brackets [], or special characters in state names. Use simple text only.
Do not include any explanation, only the Mermaid code.`,
};

const IMAGE_PROMPT = `You are a visual concept designer. Create a clear, educational illustration
that visually explains the main concepts from the provided content.
The image should be:
- Clean and professional
- Use clear visual metaphors
- Include labeled elements
- Be suitable for educational purposes
- Have a modern, minimalist style with good use of color

Create an illustration that would help someone understand the key concepts at a glance.`;

export async function POST(request: NextRequest) {
  try {
    const { sources, mode, diagramType, customPrompt, modelTier } = await request.json() as {
      sources: Source[];
      mode: VisualizationMode;
      diagramType?: DiagramType;
      customPrompt?: string;
      modelTier?: ModelTier;
    };

    const tier = modelTier && modelTier in MODELS ? modelTier : DEFAULT_TIER;
    const textModel = MODELS[tier].text;
    const imageModel = MODELS[tier].image;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Visualize] Gemini API key is missing");
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const content = buildContentFromSources(sources);

    if (mode === "mermaid") {
      // Generate Mermaid diagram
      const basePrompt = MERMAID_PROMPTS[diagramType || "flowchart"];
      // If user provided a custom description, append it to the base prompt
      const systemPrompt = customPrompt
        ? `${basePrompt}\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}`
        : basePrompt;

      const response = await ai.models.generateContent({
        model: textModel,
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Understood. I will output only valid Mermaid syntax." }] },
          { role: "user", parts: [{ text: `Content to visualize:\n\n${content}` }] },
        ],
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error("No content generated");
      }

      let mermaidSyntax = parts.find((part: { text?: string }) => part.text)?.text || "";
      const currentDiagramType = diagramType || "flowchart";

      // Validate and auto-fix the generated syntax
      let validation = validateMermaidSyntax(mermaidSyntax, currentDiagramType);
      mermaidSyntax = validation.fixedSyntax || mermaidSyntax;

      // If validation failed after auto-fix, try to fix with LLM
      let retryCount = 0;
      while (!validation.isValid && retryCount < MAX_VALIDATION_RETRIES) {
        console.log(`[Visualize] Validation failed (attempt ${retryCount + 1}), errors:`, validation.errors);

        try {
          mermaidSyntax = await fixMermaidWithLLM(
            ai,
            textModel,
            mermaidSyntax,
            validation.errors,
            currentDiagramType
          );
          validation = validateMermaidSyntax(mermaidSyntax, currentDiagramType);
          mermaidSyntax = validation.fixedSyntax || mermaidSyntax;
        } catch (fixError) {
          console.error("[Visualize] LLM fix attempt failed:", fixError);
        }

        retryCount++;
      }

      // If still invalid after retries, check severity
      if (!validation.isValid) {
        // Check for critical errors that would definitely break rendering
        const criticalErrors = validation.errors.filter(
          (e) =>
            e.includes("empty or incomplete") ||
            e.includes("Unbalanced") ||
            e.includes("Missing or invalid diagram type")
        );

        if (criticalErrors.length > 0) {
          console.error("[Visualize] Critical validation errors, regenerating:", criticalErrors);
          // One final attempt with explicit instructions
          const lastAttemptPrompt = `Generate a simple, valid Mermaid ${currentDiagramType} diagram.
Keep it simple with just 3-5 nodes.
Use ONLY alphanumeric characters and spaces in labels.
Do NOT use parentheses, brackets in text, or special characters.
Output ONLY the Mermaid code.

Content summary: ${content.slice(0, 500)}`;

          const lastAttempt = await ai.models.generateContent({
            model: textModel,
            contents: [{ role: "user", parts: [{ text: lastAttemptPrompt }] }],
          });

          const lastParts = lastAttempt.candidates?.[0]?.content?.parts;
          if (lastParts) {
            const lastSyntax = lastParts.find((part: { text?: string }) => part.text)?.text || "";
            const lastValidation = validateMermaidSyntax(lastSyntax, currentDiagramType);
            if (lastValidation.fixedSyntax) {
              mermaidSyntax = lastValidation.fixedSyntax;
            }
          }
        } else {
          console.warn("[Visualize] Minor validation issues, proceeding:", validation.errors);
        }
      }

      // Generate a title from the content
      const titleResponse = await ai.models.generateContent({
        model: textModel,
        contents: [
          { role: "user", parts: [{ text: "Generate a short, concise title (5-7 words) for this diagram. Output ONLY the title, nothing else." }] },
          { role: "model", parts: [{ text: "Understood. I will output only a short title." }] },
          { role: "user", parts: [{ text: `Diagram content:\n${mermaidSyntax}\n\nOriginal source:\n${content.slice(0, 500)}` }] },
        ],
      });

      const titleParts = titleResponse.candidates?.[0]?.content?.parts;
      const title = titleParts?.find((part: { text?: string }) => part.text)?.text?.trim() || "Concept Diagram";

      return NextResponse.json({
        mode: "mermaid",
        mermaidSyntax,
        title,
        diagramType: diagramType || "flowchart",
        generatedAt: Date.now(),
      });

    } else {
      // Generate image using Gemini's image generation
      // If user provided a custom description, append it to the base prompt
      const systemPrompt = customPrompt
        ? `${IMAGE_PROMPT}\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}`
        : IMAGE_PROMPT;

      try {
        const response = await ai.models.generateContent({
          model: imageModel,
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "I'll create a clear, educational illustration for this concept." }] },
            { role: "user", parts: [{ text: `Content to visualize:\n\n${content}` }] },
          ],
          config: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts || parts.length === 0) {
          throw new Error("No content generated");
        }

        // Find image data and text parts
        let imageData: string | undefined;
        let imageMimeType: string | undefined;
        let title = "Concept Illustration";

        for (const part of parts) {
          if ('inlineData' in part && part.inlineData) {
            imageData = part.inlineData.data;
            imageMimeType = part.inlineData.mimeType;
          }
          if ('text' in part && part.text) {
            // Use any text as a potential title/description
            const text = part.text.trim();
            if (text.length > 0 && text.length < 100) {
              title = text;
            }
          }
        }

        if (!imageData) {
          throw new Error("No image generated. Try using Mermaid mode for diagram generation.");
        }

        return NextResponse.json({
          mode: "image",
          imageData,
          imageMimeType: imageMimeType || "image/png",
          title,
          generatedAt: Date.now(),
        });
      } catch (imageError) {
        // If image generation fails, provide a helpful error message
        console.error("[Visualize] Image generation failed:", imageError);
        const errorMessage = imageError instanceof Error ? imageError.message : "Unknown error";

        // Check if it's a model not found error
        if (errorMessage.includes("not found") || errorMessage.includes("not supported")) {
          return NextResponse.json(
            {
              error: "Image generation is not available. The experimental image model may not be enabled for your API key. Please use Mermaid diagram mode instead.",
              suggestion: "mermaid"
            },
            { status: 400 }
          );
        }

        throw imageError;
      }
    }

  } catch (error) {
    console.error("[Visualize] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
