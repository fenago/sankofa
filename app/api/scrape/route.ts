import { NextRequest, NextResponse } from "next/server";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { createClient } from "@/lib/supabase/server";
import { createSource, processSource } from "@/lib/pipeline/process";

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

    const client = new Hyperbrowser({ apiKey });

    const scrapeResult = await client.scrape.startAndWait({
      url,
      sessionOptions: {
        useProxy: true,
        solveCaptchas: true,
        proxyCountry: "US",
      },
    });

    // Extract data from the result
    const data = scrapeResult.data as any;
    const title = data?.metadata?.title || new URL(url).hostname;
    const content = data?.markdown || data?.text || "";
    const text = data?.text || data?.markdown || "";

    // If notebookId is provided, process through the RAG pipeline
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

      // Create source record
      const sourceId = await createSource({
        notebookId,
        userId: user.id,
        sourceType: "url",
        url,
        title,
      });

      // Process through pipeline (async - don't wait)
      processSource({
        sourceId,
        notebookId,
        userId: user.id,
        text,
        title,
        url,
        sourceType: "url",
      }).catch(err => console.error("Pipeline processing failed:", err));

      return NextResponse.json({
        sourceId,
        title,
        content,
        text,
        url,
        processing: true,
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
