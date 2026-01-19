"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVeoVideo } from "@/hooks/useVeoVideo";
import { Source } from "@/lib/types";
import { Video, Loader2, Download, X, RotateCcw } from "lucide-react";

interface VideoStudioProps {
  sources: Source[];
  expanded?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoStudio({ sources, expanded }: VideoStudioProps) {
  const [prompt, setPrompt] = useState("");
  const [useSources, setUseSources] = useState(false);

  const {
    status,
    videoUrl,
    elapsedTime,
    error,
    isGenerating,
    generateVideo,
    cancel,
    reset,
  } = useVeoVideo();

  const hasSources = sources.filter((s) => s.status === "success").length > 0;

  const handleGenerate = () => {
    let finalPrompt = prompt.trim();

    if (useSources && hasSources) {
      const sourceContext = sources
        .filter((s) => s.status === "success")
        .map((s) => s.title || s.url)
        .join(", ");
      finalPrompt = `${finalPrompt}\n\nContext from sources: ${sourceContext}`;
    }

    if (!finalPrompt) {
      return;
    }

    generateVideo(finalPrompt);
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    window.open(videoUrl, "_blank");
  };

  return (
    <div className={`p-4 space-y-4 ${expanded ? "h-full flex flex-col" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Video Studio</h3>
      </div>

      {/* Idle State */}
      {status === "idle" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Video Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create... (e.g., 'An animated explainer video about machine learning concepts with smooth transitions')"
              className="min-h-[100px]"
            />
          </div>

          {hasSources && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useSources}
                onChange={(e) => setUseSources(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-600">Include source context</span>
            </label>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            <Video className="h-4 w-4 mr-2" />
            Generate Video (~10 sec)
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Video generation typically takes 2-5 minutes
          </p>
        </div>
      )}

      {/* Generating State */}
      {isGenerating && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
              <div
                className="absolute top-0 left-0 w-16 h-16 border-4 border-black rounded-full animate-spin"
                style={{ borderTopColor: "transparent" }}
              />
            </div>

            <div className="text-center">
              <p className="font-medium text-gray-900">
                {status === "starting" ? "Starting video generation..." : "Generating video..."}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Elapsed: {formatTime(elapsedTime)}
              </p>
            </div>

            <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-1000"
                style={{
                  width: `${Math.min((elapsedTime / 300) * 100, 95)}%`,
                }}
              />
            </div>

            <p className="text-xs text-gray-400">
              This may take a few minutes. Please wait...
            </p>
          </div>

          <Button
            variant="outline"
            onClick={cancel}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Complete State */}
      {status === "complete" && videoUrl && (
        <div className={`space-y-3 ${expanded ? "flex-1 flex flex-col" : ""}`}>
          <div className={`border border-gray-200 rounded-lg overflow-hidden bg-black ${expanded ? "flex-1" : ""}`}>
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className={`w-full ${expanded ? "h-full object-contain" : "aspect-video"}`}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-black text-white hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Video
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Generated in {formatTime(elapsedTime)}
          </p>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Generation Failed</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>

          <Button
            onClick={reset}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
