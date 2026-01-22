import { NextRequest, NextResponse } from "next/server";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, notebookId } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.HYPERBROWSER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Hyperbrowser API key is missing" },
        { status: 500 }
      );
    }

    console.log(`[Scrape] Starting scrape for URL: ${url}`);
    const startTime = Date.now();

    const client = new Hyperbrowser({ apiKey });

    const scrapeResult = await client.scrape.startAndWait({
      url,
      sessionOptions: {
        useProxy: true,
        solveCaptchas: true,
        proxyCountry: "US",
      },
    });

    console.log(`[Scrape] Hyperbrowser scrape completed in ${Date.now() - startTime}ms`);

    // Extract data from the result
    const data = scrapeResult.data as any;
    const title = data?.metadata?.title || new URL(url).hostname;
    const content = data?.markdown || data?.text || "";
    const text = data?.text || data?.markdown || "";

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

      // Create source record with scraped text (status: pending)
      // The client will call /api/notebooks/[id]/sources/[sourceId]/process to complete
      const adminSupabase = createAdminClient();
      const { data: source, error: sourceError } = await adminSupabase
        .from("sources")
        .insert({
          notebook_id: notebookId,
          user_id: user.id,
          source_type: "url",
          url,
          title,
          raw_text: text, // Save text immediately so processing endpoint can use it
          status: "pending",
        })
        .select("id")
        .single();

      if (sourceError || !source) {
        console.error("[Scrape] Failed to create source:", sourceError);
        return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
      }

      console.log(`[Scrape] Created source ${source.id}, returning for client to trigger processing`);

      return NextResponse.json({
        sourceId: source.id,
        title,
        content,
        text,
        url,
        needsProcessing: true, // Signal to client to call process endpoint
      });
    }

    // Legacy response (no notebookId - for backwards compatibility)
    return NextResponse.json({
      title,
      content,
      text,
      url,
    });
  } catch (error) {
    console.error("[Scrape] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
