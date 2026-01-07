"use client";

import { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface MermaidDiagramProps {
  syntax: string;
  className?: string;
  onRenderError?: (error: string) => void;
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
      <button
        onClick={() => zoomIn()}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4 text-gray-700" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4 text-gray-700" />
      </button>
      <div className="h-px bg-gray-200 my-0.5" />
      <button
        onClick={() => resetTransform()}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="Reset View"
      >
        <Maximize className="h-4 w-4 text-gray-700" />
      </button>
    </div>
  );
}

export function MermaidDiagram({ syntax, className = "", onRenderError }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!syntax) {
      setIsLoading(false);
      return;
    }

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;

        // Initialize mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });

        // Generate a unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Clean the syntax
        const cleanSyntax = syntax.trim();

        // Validate and render
        const isValid = await mermaid.parse(cleanSyntax);
        if (!isValid) {
          throw new Error("Invalid Mermaid syntax");
        }

        const { svg } = await mermaid.render(id, cleanSyntax);
        setSvgContent(svg);
      } catch (err) {
        console.error("[MermaidDiagram] Render error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to render diagram";
        setError(errorMessage);
        setSvgContent("");
        onRenderError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [syntax]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-sm text-red-600 font-medium">Failed to render diagram</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
        <details className="mt-2">
          <summary className="text-xs text-red-400 cursor-pointer">View raw syntax</summary>
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">{syntax}</pre>
        </details>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-pulse text-gray-400">Rendering diagram...</div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-400 ${className}`}>
        No diagram to display
      </div>
    );
  }

  return (
    <div className={`mermaid-container relative ${className}`} style={{ minHeight: "200px" }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.25}
        maxScale={3}
        wheel={{ step: 0.1 }}
        centerOnInit={true}
      >
        <ZoomControls />
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!flex !items-center !justify-center"
        >
          <div
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </TransformComponent>
      </TransformWrapper>
      <p className="absolute bottom-2 left-2 text-xs text-gray-400">
        Scroll to zoom • Drag to pan
      </p>
    </div>
  );
}
