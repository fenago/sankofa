import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

// Model configuration
const TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

// Fallback models
const TEXT_MODEL_FALLBACK = "gemini-2.5-flash";
const IMAGE_MODEL_FALLBACK = "gemini-2.5-flash-image";

interface ArtifactRequest {
  skillName: string
  skillDescription?: string
  artifactType: string
  artifactId: string
  artifactPrompt: string
  audience: 'student' | 'teacher' | 'curriculum'
  toolId: string
  useHighQuality?: boolean // Use Pro image model if true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params;
    const body: ArtifactRequest = await request.json();

    const {
      skillName,
      skillDescription,
      artifactType,
      artifactId,
      artifactPrompt,
      audience,
      toolId,
      useHighQuality = true, // Default to high quality
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing" },
        { status: 500 }
      );
    }

    // Check for custom prompt override
    let finalPrompt = artifactPrompt;
    let usingCustomPrompt = false;

    if (artifactId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: override } = await supabase
            .from('prompt_overrides')
            .select('custom_prompt, is_active')
            .eq('notebook_id', notebookId)
            .eq('user_id', user.id)
            .eq('audience', audience)
            .eq('tool_id', toolId)
            .eq('artifact_id', artifactId)
            .single();

          if (override?.custom_prompt && override.is_active !== false) {
            // Replace placeholders in custom prompt
            finalPrompt = override.custom_prompt
              .replace(/\{skillName\}/g, skillName)
              .replace(/\{skillDescription\}/g, skillDescription || '');
            usingCustomPrompt = true;
            console.log(`[Artifacts] Using custom prompt for ${audience}/${toolId}/${artifactId}`);
          }
        }
      } catch (error) {
        // Silently fall back to default prompt if override lookup fails
        console.warn(`[Artifacts] Failed to check for custom prompt:`, error);
      }
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log(`[Artifacts] Generating ${artifactType} for "${skillName}" (${audience}/${toolId})${usingCustomPrompt ? ' [custom prompt]' : ''}`);
    console.log(`[Artifacts] Using text model: ${TEXT_MODEL}, image model: ${useHighQuality ? IMAGE_MODEL : IMAGE_MODEL_FALLBACK}`);

    // Step 1: Use text model to refine the prompt for better image generation
    const promptRefinementRequest = `You are an expert at creating prompts for AI image generation, specifically for educational illustrations.

Given this request to create a visual artifact:

**Artifact Type:** ${artifactType}
**Topic:** ${skillName}
${skillDescription ? `**Context:** ${skillDescription}` : ''}
**Audience:** ${audience}
**Original Prompt:**
${finalPrompt}

Create an OPTIMIZED IMAGE GENERATION PROMPT that will produce a high-quality educational illustration. The prompt should:

1. Be specific about visual style (infographic, diagram, poster, etc.)
2. Specify colors, layout, and composition
3. Include text elements that should appear in the image
4. Be clear about what educational content to show
5. Specify it should be clean, professional, and suitable for educational use

Return ONLY the optimized prompt, nothing else. Make it detailed and specific for image generation.`;

    let refinedPrompt: string;

    try {
      const textResponse = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: [{ role: "user", parts: [{ text: promptRefinementRequest }] }],
      });

      refinedPrompt = textResponse.text || artifactPrompt;
    } catch (textError) {
      console.warn(`[Artifacts] Text model ${TEXT_MODEL} failed, trying fallback:`, textError);

      // Try fallback text model
      try {
        const textResponse = await ai.models.generateContent({
          model: TEXT_MODEL_FALLBACK,
          contents: [{ role: "user", parts: [{ text: promptRefinementRequest }] }],
        });
        refinedPrompt = textResponse.text || artifactPrompt;
      } catch (fallbackError) {
        console.warn(`[Artifacts] Fallback text model also failed, using original prompt`);
        refinedPrompt = artifactPrompt;
      }
    }

    console.log(`[Artifacts] Refined prompt length: ${refinedPrompt.length} chars`);

    // Step 2: Generate the image using the image model
    const selectedImageModel = useHighQuality ? IMAGE_MODEL : IMAGE_MODEL_FALLBACK;

    let imageResponse;
    let usedModel = selectedImageModel;

    try {
      imageResponse = await ai.models.generateContent({
        model: selectedImageModel,
        contents: [{ role: "user", parts: [{ text: refinedPrompt }] }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });
    } catch (imageError) {
      console.warn(`[Artifacts] Image model ${selectedImageModel} failed, trying fallback:`, imageError);

      // Try fallback image model
      try {
        imageResponse = await ai.models.generateContent({
          model: IMAGE_MODEL_FALLBACK,
          contents: [{ role: "user", parts: [{ text: refinedPrompt }] }],
          config: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        });
        usedModel = IMAGE_MODEL_FALLBACK;
      } catch (fallbackError) {
        console.error(`[Artifacts] All image models failed:`, fallbackError);
        return NextResponse.json(
          { error: "Failed to generate image with all available models" },
          { status: 500 }
        );
      }
    }

    // Extract image and text from response
    const parts = imageResponse.candidates?.[0]?.content?.parts || [];

    let imageData: string | null = null;
    let imageMimeType: string = "image/png";
    let textContent: string = "";

    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data || null;
        imageMimeType = part.inlineData.mimeType || "image/png";
      } else if (part.text) {
        textContent += part.text;
      }
    }

    if (!imageData) {
      console.error(`[Artifacts] No image data in response`);
      return NextResponse.json(
        { error: "No image was generated. The model may not support image generation for this prompt." },
        { status: 500 }
      );
    }

    console.log(`[Artifacts] Successfully generated image using ${usedModel}`);

    return NextResponse.json({
      success: true,
      artifact: {
        type: artifactType,
        skillName,
        audience,
        toolId,
        imageData: `data:${imageMimeType};base64,${imageData}`,
        textContent: textContent || null,
        refinedPrompt,
        model: usedModel,
        notebookId,
      },
    });

  } catch (error) {
    console.error("[Artifacts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list available artifact types
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get('audience') as 'student' | 'teacher' | 'curriculum' | null;
  const toolId = searchParams.get('toolId');

  // Import artifact types dynamically
  const { studentArtifacts, teacherArtifacts, curriculumArtifacts } = await import('@/lib/artifacts/types');

  if (!audience) {
    return NextResponse.json({
      student: Object.keys(studentArtifacts),
      teacher: Object.keys(teacherArtifacts),
      curriculum: Object.keys(curriculumArtifacts),
    });
  }

  let artifacts;
  if (audience === 'student') {
    artifacts = toolId ? studentArtifacts[toolId] : studentArtifacts;
  } else if (audience === 'teacher') {
    artifacts = toolId ? teacherArtifacts[toolId] : teacherArtifacts;
  } else {
    artifacts = toolId ? curriculumArtifacts[toolId] : curriculumArtifacts;
  }

  return NextResponse.json({ artifacts });
}
