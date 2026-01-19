import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentArtifacts, teacherArtifacts, curriculumArtifacts } from "@/lib/artifacts/types";

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

interface PromptOverrideRequest {
  audience: 'student' | 'teacher' | 'curriculum'
  toolId: string
  artifactId: string
  customPrompt: string
}

// GET - List all prompts with any overrides
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params;
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience') as 'student' | 'teacher' | 'curriculum' | null;
    const toolId = searchParams.get('toolId');
    const artifactId = searchParams.get('artifactId');

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all prompt overrides for this notebook
    let query = supabase
      .from('prompt_overrides')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('user_id', user.id);

    if (audience) {
      query = query.eq('audience', audience);
    }
    if (toolId) {
      query = query.eq('tool_id', toolId);
    }
    if (artifactId) {
      query = query.eq('artifact_id', artifactId);
    }

    const { data: overrides, error: overridesError } = await query;

    if (overridesError) {
      console.error("[Prompts] Query error:", overridesError);
      return NextResponse.json(
        { error: "Failed to fetch prompt overrides" },
        { status: 500 }
      );
    }

    // Build a map of overrides
    const overrideMap: Record<string, typeof overrides[0]> = {};
    for (const override of overrides || []) {
      const key = `${override.audience}:${override.tool_id}:${override.artifact_id}`;
      overrideMap[key] = override;
    }

    // Build the full prompt list with defaults and overrides
    const buildPromptList = (
      artifacts: Record<string, { id: string; name: string; icon: string; description: string; promptTemplate: (skill: string, desc?: string) => string }[]>,
      audience: 'student' | 'teacher' | 'curriculum'
    ) => {
      const result: Array<{
        audience: string;
        toolId: string;
        artifactId: string;
        artifactName: string;
        artifactIcon: string;
        artifactDescription: string;
        defaultPrompt: string;
        customPrompt: string | null;
        hasOverride: boolean;
        overrideId: string | null;
        isActive: boolean;
      }> = [];

      for (const [tid, artifactList] of Object.entries(artifacts)) {
        for (const artifact of artifactList) {
          const key = `${audience}:${tid}:${artifact.id}`;
          const override = overrideMap[key];

          result.push({
            audience,
            toolId: tid,
            artifactId: artifact.id,
            artifactName: artifact.name,
            artifactIcon: artifact.icon,
            artifactDescription: artifact.description,
            defaultPrompt: artifact.promptTemplate('{skillName}', '{skillDescription}'),
            customPrompt: override?.custom_prompt || null,
            hasOverride: !!override,
            overrideId: override?.id || null,
            isActive: override?.is_active ?? true,
          });
        }
      }

      return result;
    };

    let prompts: ReturnType<typeof buildPromptList> = [];

    if (!audience || audience === 'student') {
      prompts = [...prompts, ...buildPromptList(studentArtifacts, 'student')];
    }
    if (!audience || audience === 'teacher') {
      prompts = [...prompts, ...buildPromptList(teacherArtifacts, 'teacher')];
    }
    if (!audience || audience === 'curriculum') {
      prompts = [...prompts, ...buildPromptList(curriculumArtifacts, 'curriculum')];
    }

    // Filter by toolId and artifactId if provided
    if (toolId) {
      prompts = prompts.filter(p => p.toolId === toolId);
    }
    if (artifactId) {
      prompts = prompts.filter(p => p.artifactId === artifactId);
    }

    return NextResponse.json({ prompts });

  } catch (error) {
    console.error("[Prompts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Create or update a prompt override
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params;
    const body: PromptOverrideRequest = await request.json();

    const { audience, toolId, artifactId, customPrompt } = body;

    if (!audience || !toolId || !artifactId || !customPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify notebook belongs to user
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single();

    if (notebookError || !notebook) {
      return NextResponse.json(
        { error: "Notebook not found or access denied" },
        { status: 404 }
      );
    }

    // Upsert the prompt override
    const { data: override, error: upsertError } = await supabase
      .from('prompt_overrides')
      .upsert({
        notebook_id: notebookId,
        user_id: user.id,
        audience,
        tool_id: toolId,
        artifact_id: artifactId,
        custom_prompt: customPrompt,
        is_active: true,
      }, {
        onConflict: 'notebook_id,audience,tool_id,artifact_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error("[Prompts] Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save prompt override" },
        { status: 500 }
      );
    }

    console.log(`[Prompts] Saved override for ${audience}/${toolId}/${artifactId}`);

    return NextResponse.json({
      success: true,
      override,
    });

  } catch (error) {
    console.error("[Prompts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a prompt override (revert to default)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const overrideId = searchParams.get('overrideId');

    if (!overrideId) {
      return NextResponse.json(
        { error: "Override ID required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Delete the override
    const { error: deleteError } = await supabase
      .from('prompt_overrides')
      .delete()
      .eq('id', overrideId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error("[Prompts] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete prompt override" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Prompts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
