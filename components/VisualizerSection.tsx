"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Source, VisualizationMode, DiagramType, ConceptVisualization, ModelTier } from "@/lib/types";

// Dynamic import with SSR disabled to prevent mermaid bundling issues
const MermaidDiagram = dynamic(
  () => import("@/components/MermaidDiagram").then((mod) => mod.MermaidDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 text-gray-400">
        Loading diagram...
      </div>
    )
  }
);
import { Wand2, Download, Image, GitBranch, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VisualizerSectionProps {
  sources: Source[];
  onVisualizationGenerated?: (viz: ConceptVisualization) => void;
}

const DIAGRAM_TYPES: { value: DiagramType; label: string }[] = [
  { value: "flowchart", label: "Flowchart" },
  { value: "mindmap", label: "Mind Map" },
  { value: "sequence", label: "Sequence" },
  { value: "classDiagram", label: "Class Diagram" },
  { value: "stateDiagram", label: "State Diagram" },
];

const MODEL_TIERS: { value: ModelTier; label: string; description: string }[] = [
  { value: "pro", label: "Pro", description: "Higher quality, slower" },
  { value: "standard", label: "Standard", description: "Faster, good quality" },
];

export function VisualizerSection({ sources, onVisualizationGenerated }: VisualizerSectionProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<VisualizationMode>("mermaid");
  const [diagramType, setDiagramType] = useState<DiagramType>("flowchart");
  const [modelTier, setModelTier] = useState<ModelTier>("pro");
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualization, setVisualization] = useState<ConceptVisualization | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const hasSources = sources.filter(s => s.status === "success").length > 0;

  const handleGenerate = async () => {
    if (!hasSources) {
      toast({
        title: "No sources available",
        description: "Add sources to generate visualizations.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setRenderError(null);
    try {
      const response = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          mode,
          diagramType: mode === "mermaid" ? diagramType : undefined,
          modelTier,
          customPrompt: prompt.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If there's a suggestion to use mermaid mode, show it
        if (data.suggestion === "mermaid") {
          toast({
            title: "Image generation unavailable",
            description: "Switching to Mermaid diagram mode. Please try again.",
          });
          setMode("mermaid");
          return;
        }
        throw new Error(data.error || "Failed to generate visualization");
      }

      const viz: ConceptVisualization = {
        notebookId: "nb-1",
        generatedAt: data.generatedAt || Date.now(),
        mode: data.mode,
        diagramType: data.diagramType,
        mermaidSyntax: data.mermaidSyntax,
        imageData: data.imageData,
        imageMimeType: data.imageMimeType,
        title: data.title,
      };

      setVisualization(viz);
      onVisualizationGenerated?.(viz);
      toast({ title: "Visualization generated" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to generate visualization",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!visualization) return;

    if (visualization.mode === "mermaid" && visualization.mermaidSyntax) {
      // Get SVG from rendered mermaid
      const svgElement = document.querySelector(".mermaid-container svg");
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${visualization.title.replace(/\s+/g, "-")}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else if (visualization.mode === "image" && visualization.imageData) {
      const a = document.createElement("a");
      a.href = `data:${visualization.imageMimeType};base64,${visualization.imageData}`;
      a.download = `${visualization.title.replace(/\s+/g, "-")}.png`;
      a.click();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Concept Visualizer</h3>
      </div>

      {/* Description Input */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Describe Your Visualization (optional)
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to visualize... (e.g., 'Focus on the main workflow showing how data flows between components' or 'Create a diagram showing the relationship between the key concepts')"
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("mermaid")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "mermaid"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <GitBranch className="h-4 w-4" />
            Diagram
          </button>
          <button
            onClick={() => setMode("image")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "image"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Image className="h-4 w-4" />
            Image
          </button>
        </div>

        {/* Model Tier Selection */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Model Quality</label>
          <div className="flex gap-2">
            {MODEL_TIERS.map((tier) => (
              <button
                key={tier.value}
                onClick={() => setModelTier(tier.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  modelTier === tier.value
                    ? tier.value === "pro"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                      : "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={tier.description}
              >
                {tier.value === "pro" && <Sparkles className="h-3.5 w-3.5" />}
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Diagram Type Selection (only for Mermaid mode) */}
        {mode === "mermaid" && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Diagram Type</label>
            <select
              value={diagramType}
              onChange={(e) => setDiagramType(e.target.value as DiagramType)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              {DIAGRAM_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !hasSources}
          className="w-full bg-black text-white hover:bg-gray-800"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate {mode === "mermaid" ? "Diagram" : "Image"}
            </>
          )}
        </Button>

        {!hasSources && (
          <p className="text-xs text-gray-500 text-center">
            Add sources to enable visualization
          </p>
        )}
      </div>

      {/* Visualization Display */}
      {visualization && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">{visualization.title}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-gray-500 hover:text-gray-700"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {visualization.mode === "mermaid" && visualization.mermaidSyntax ? (
              <div className="p-4 min-h-[200px] flex flex-col items-center justify-center">
                <MermaidDiagram
                  syntax={visualization.mermaidSyntax}
                  className="max-w-full"
                  onRenderError={(error) => setRenderError(error)}
                />
                {renderError && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-sm text-orange-600">
                      Diagram had rendering issues. Try regenerating.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3 mr-1" />
                          Regenerate Diagram
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : visualization.mode === "image" && visualization.imageData ? (
              <img
                src={`data:${visualization.imageMimeType};base64,${visualization.imageData}`}
                alt={visualization.title}
                className="w-full h-auto"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
