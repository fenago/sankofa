import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

// Increase max duration for serverless (Netlify Pro: 26s, Vercel: 60s)
export const maxDuration = 60;

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
  refinePrompt?: boolean // Whether to use text model to refine prompt first (default: false for speed)
}

// Helper to log with timestamps
function logWithTime(startTime: number, message: string) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Artifacts +${elapsed}s] ${message}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    logWithTime(startTime, "Starting artifact generation...");

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
      useHighQuality = true,
      refinePrompt = false, // Default to false to save ~3-5 seconds
    } = body;

    logWithTime(startTime, `Request: ${artifactType} for "${skillName}" (refinePrompt=${refinePrompt})`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logWithTime(startTime, "ERROR: Gemini API key is missing");
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
        logWithTime(startTime, "Checking for custom prompt override...");
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
            finalPrompt = override.custom_prompt
              .replace(/\{skillName\}/g, skillName)
              .replace(/\{skillDescription\}/g, skillDescription || '');
            usingCustomPrompt = true;
            logWithTime(startTime, `Using custom prompt for ${audience}/${toolId}/${artifactId}`);
          }
        }
        logWithTime(startTime, "Custom prompt check complete");
      } catch (error) {
        logWithTime(startTime, `Custom prompt check failed (using default): ${error}`);
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    const selectedImageModel = useHighQuality ? IMAGE_MODEL : IMAGE_MODEL_FALLBACK;

    logWithTime(startTime, `Using image model: ${selectedImageModel}`);

    let promptForImage = finalPrompt;

    // Optional: Refine prompt with text model (adds ~3-5 seconds)
    if (refinePrompt) {
      logWithTime(startTime, "Refining prompt with text model...");

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

      try {
        const textResponse = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: [{ role: "user", parts: [{ text: promptRefinementRequest }] }],
        });
        promptForImage = textResponse.text || finalPrompt;
        logWithTime(startTime, `Prompt refined (${promptForImage.length} chars)`);
      } catch (textError) {
        logWithTime(startTime, `Text model failed, using original prompt: ${textError}`);
        promptForImage = finalPrompt;
      }
    } else {
      // Build a good prompt directly without the extra API call
      promptForImage = `Create a high-quality educational illustration for ${audience}s:

**Type:** ${artifactType}
**Topic:** ${skillName}
${skillDescription ? `**Context:** ${skillDescription}` : ''}

**Requirements:**
${finalPrompt}

Style: Clean, professional, educational. Use clear typography, good contrast, and organized layout. Make it visually engaging and easy to understand.`;

      logWithTime(startTime, "Using direct prompt (skipping refinement for speed)");
    }

    // Generate the image
    logWithTime(startTime, "Starting image generation...");

    let imageResponse;
    let usedModel = selectedImageModel;

    try {
      imageResponse = await ai.models.generateContent({
        model: selectedImageModel,
        contents: [{ role: "user", parts: [{ text: promptForImage }] }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });
      logWithTime(startTime, `Image generated with ${selectedImageModel}`);
    } catch (imageError) {
      logWithTime(startTime, `Primary model failed: ${imageError}, trying fallback...`);

      try {
        imageResponse = await ai.models.generateContent({
          model: IMAGE_MODEL_FALLBACK,
          contents: [{ role: "user", parts: [{ text: promptForImage }] }],
          config: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        });
        usedModel = IMAGE_MODEL_FALLBACK;
        logWithTime(startTime, `Image generated with fallback ${IMAGE_MODEL_FALLBACK}`);
      } catch (fallbackError) {
        logWithTime(startTime, `All models failed: ${fallbackError}`);
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
      logWithTime(startTime, "ERROR: No image data in response");
      return NextResponse.json(
        { error: "No image was generated. The model may not support image generation for this prompt." },
        { status: 500 }
      );
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logWithTime(startTime, `SUCCESS! Total time: ${totalTime}s, model: ${usedModel}`);

    return NextResponse.json({
      success: true,
      artifact: {
        type: artifactType,
        skillName,
        audience,
        toolId,
        imageData: `data:${imageMimeType};base64,${imageData}`,
        textContent: textContent || null,
        refinedPrompt: promptForImage,
        model: usedModel,
        notebookId,
        generationTimeMs: Date.now() - startTime,
      },
    });

  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Artifacts +${totalTime}s] ERROR:`, error);
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
