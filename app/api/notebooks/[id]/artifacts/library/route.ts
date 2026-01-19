import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

interface SaveArtifactRequest {
  skillName: string
  skillDescription?: string
  artifactType: string
  audience: 'student' | 'teacher' | 'curriculum'
  toolId: string
  imageData: string
  textContent?: string
  modelUsed?: string
}

// POST - Save artifact to library
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params;
    const body: SaveArtifactRequest = await request.json();

    const {
      skillName,
      skillDescription,
      artifactType,
      audience,
      toolId,
      imageData,
      textContent,
      modelUsed,
    } = body;

    // Validate required fields
    if (!skillName || !artifactType || !audience || !toolId || !imageData) {
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

    // Save artifact to library
    const { data: artifact, error: insertError } = await supabase
      .from('artifacts')
      .insert({
        notebook_id: notebookId,
        user_id: user.id,
        skill_name: skillName,
        skill_description: skillDescription,
        artifact_type: artifactType,
        audience,
        tool_id: toolId,
        image_data: imageData,
        text_content: textContent,
        model_used: modelUsed || 'gemini-3-pro-image-preview',
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Artifacts Library] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save artifact" },
        { status: 500 }
      );
    }

    console.log(`[Artifacts Library] Saved artifact ${artifact.id} for notebook ${notebookId}`);

    return NextResponse.json({
      success: true,
      artifact: {
        id: artifact.id,
        skillName: artifact.skill_name,
        artifactType: artifact.artifact_type,
        createdAt: artifact.created_at,
      },
    });

  } catch (error) {
    console.error("[Artifacts Library] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET - List saved artifacts for a notebook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params;
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience');

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('artifacts')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by audience if provided
    if (audience && ['student', 'teacher', 'curriculum'].includes(audience)) {
      query = query.eq('audience', audience as 'student' | 'teacher' | 'curriculum');
    }

    const { data: artifacts, error } = await query;

    if (error) {
      console.error("[Artifacts Library] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch artifacts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      artifacts: artifacts.map((a) => ({
        id: a.id,
        skillName: a.skill_name,
        skillDescription: a.skill_description,
        artifactType: a.artifact_type,
        audience: a.audience,
        toolId: a.tool_id,
        imageData: a.image_data,
        textContent: a.text_content,
        modelUsed: a.model_used,
        createdAt: a.created_at,
      })),
    });

  } catch (error) {
    console.error("[Artifacts Library] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove artifact from library
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const artifactId = searchParams.get('artifactId');

    if (!artifactId) {
      return NextResponse.json(
        { error: "Artifact ID required" },
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

    // Delete artifact (RLS will ensure user owns it)
    const { error: deleteError } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', artifactId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error("[Artifacts Library] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete artifact" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Artifacts Library] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
