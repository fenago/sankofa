import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Configure body size limit for PDF uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const notebookId = formData.get("notebookId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith(".pdf");
    const isTXT = fileName.endsWith(".txt");

    if (!isPDF && !isTXT) {
      return NextResponse.json({ error: "Only PDF and TXT files are supported" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    console.log(`[Upload] Processing file: ${file.name}, size: ${file.size}`);
    const startTime = Date.now();

    let text = "";
    let totalPages = 1;

    if (isTXT) {
      // Handle TXT files - just read as text
      text = await file.text();
    } else {
      // Handle PDF files
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Extract text using unpdf
      const result = await extractText(uint8Array);
      text = Array.isArray(result.text) ? result.text.join('\n') : result.text;
      totalPages = result.totalPages;
    }

    console.log(`[Upload] Text extracted in ${Date.now() - startTime}ms, length: ${text.length}`);

    const title = file.name.replace(/\.(pdf|txt)$/i, "");

    // If notebookId is provided, create source record and save text
    // Processing will happen in a separate request to avoid timeout
    if (notebookId) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Verify notebook ownership
      const { data: notebook } = await supabase
        .from("notebooks")
        .select("id")
        .eq("id", notebookId)
        .eq("user_id", user.id)
        .single();

      if (!notebook) {
        return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
      }

      // Create source record with text (status: pending)
      // Client will call /api/notebooks/[id]/sources/[sourceId]/process
      const adminSupabase = createAdminClient();
      const { data: source, error: sourceError } = await adminSupabase
        .from("sources")
        .insert({
          notebook_id: notebookId,
          user_id: user.id,
          source_type: isPDF ? "pdf" : "txt",
          filename: file.name,
          title,
          raw_text: text, // Save text immediately
          status: "pending",
        })
        .select("id")
        .single();

      if (sourceError || !source) {
        console.error("[Upload] Failed to create source:", sourceError);
        return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
      }

      console.log(`[Upload] Created source ${source.id}, returning for client to trigger processing`);

      return NextResponse.json({
        sourceId: source.id,
        title,
        text,
        content: text,
        filename: file.name,
        pages: totalPages,
        needsProcessing: true, // Signal to client to call process endpoint
      });
    }

    // Legacy response (no notebookId - for backwards compatibility)
    return NextResponse.json({
      title,
      text,
      content: text,
      filename: file.name,
      pages: totalPages,
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to parse file",
      },
      { status: 500 }
    );
  }
}
