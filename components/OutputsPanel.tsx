"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Play, Pause, Download, Loader2, ChevronDown, ChevronUp, Sparkles, Network, Maximize2, BookOpen, GraduationCap, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MindMap } from "./MindMap";
import { VisualizerSection } from "./VisualizerSection";
import { VideoStudio } from "./VideoStudio";
import { Source } from "@/lib/types";

type ExpandedSection = "audio" | "mindmap" | "summary" | "slides" | "visualizer" | "video" | "graph" | null;

// Dynamically import KnowledgeGraphPanel with SSR disabled (React Flow doesn't support SSR)
const KnowledgeGraphPanel = dynamic(
  () => import("./KnowledgeGraphPanel").then((mod) => mod.KnowledgeGraphPanel),
  {
    ssr: false,
    loading: () => (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Network className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-black">Knowledge Graph</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    ),
  }
);

function FormattedSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!text) return <p className="text-gray-400 italic text-sm">Summary will appear here after analysis...</p>;

  // Normalize newlines and split
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const shouldTruncate = lines.length > 5;
  const displayedLines = expanded || !shouldTruncate ? lines : lines.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {displayedLines.map((line, i) => {
          const trimmed = line.trim();
          
          // Heading (bold with **)
          if (trimmed.includes('**')) {
             const cleanLine = trimmed.replace(/\*\*/g, '').replace(/^#+\s*/, '').replace(/:$/, ''); 
             return <h4 key={i} className="font-bold text-black mt-4 first:mt-0 mb-1 text-sm uppercase tracking-wide">{cleanLine}</h4>
          }
          
          // Bullet point
          if (trimmed.startsWith('-') || trimmed.startsWith('* ')) {
              const content = trimmed.replace(/^[-*]\s*/, '');
              return (
                  <div key={i} className="flex gap-2 text-sm text-gray-700 ml-2 items-start">
                      <span className="text-black mt-2 h-1 w-1 rounded-full bg-black shrink-0" />
                      <span className="leading-relaxed">{content}</span>
                  </div>
              )
          }
          
          // Regular paragraph
          return <p key={i} className="text-sm text-gray-700 leading-relaxed">{trimmed}</p>
        })}
      </div>
      
      {shouldTruncate && (
        <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-black mt-2 transition-colors"
        >
            {expanded ? (
                <>Show Less <ChevronUp className="h-3 w-3" /></>
            ) : (
                <>Read More <ChevronDown className="h-3 w-3" /></>
            )}
        </button>
      )}
    </div>
  )
}

interface OutputsPanelProps {
  notebookId?: string;
  sources: Source[];
  summary: string | null;
  slides: any[];
  audioUrl: string | null;
  mindmapData: any;
  graphEnhanced?: boolean;
  isGeneratingAudio: boolean;
  isGeneratingSlides: boolean;
  isGeneratingMindmap: boolean;
  isGeneratingSummary: boolean;
  onGenerateAudio: () => void;
  onGenerateSlides: () => void;
  onGenerateMindmap: () => void;
  onGenerateSummary: () => void;
}

export function OutputsPanel({
  notebookId,
  sources,
  summary,
  slides,
  audioUrl,
  mindmapData,
  graphEnhanced,
  isGeneratingAudio,
  isGeneratingSlides,
  isGeneratingMindmap,
  isGeneratingSummary,
  onGenerateAudio,
  onGenerateSlides,
  onGenerateMindmap,
  onGenerateSummary,
}: OutputsPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const ExpandButton = ({ section, title }: { section: ExpandedSection; title: string }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setExpandedSection(section)}
      className="text-xs h-8 text-gray-500 hover:text-black hover:bg-gray-100"
      title={`Expand ${title}`}
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
  );

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownloadSlides = () => {
    if (slides.length === 0) return;

    const content = slides.map(slide =>
      `# ${slide.title}\n${slide.bullets.map((b: string) => `* ${b}`).join('\n')}\n`
    ).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation-slides.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMindmap = () => {
    if (!mindmapData) return;

    // Get the SVG from the ReactFlow container
    const svgElement = document.querySelector('.react-flow svg.react-flow__edges')?.closest('svg');
    const viewportElement = document.querySelector('.react-flow__viewport');

    if (viewportElement) {
      // Create an SVG from the viewport content
      const nodes = document.querySelectorAll('.react-flow__nodes');
      const edges = document.querySelector('.react-flow__edges');

      // Clone and create a standalone SVG
      const container = document.querySelector('.react-flow');
      if (container) {
        const bbox = container.getBoundingClientRect();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(bbox.width));
        svg.setAttribute('height', String(bbox.height));
        svg.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Add a white background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#f9fafb');
        svg.appendChild(bg);

        // Clone the viewport
        const clonedViewport = viewportElement.cloneNode(true) as Element;
        svg.appendChild(clonedViewport);

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleDownloadSummary = () => {
    if (!summary) return;

    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research-summary.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-6 p-4">
      {/* LearnGraph Features - only shown when in a notebook context */}
      {notebookId && (
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-black">LearnGraph Features</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            AI-powered educational tools grounded in learning science research
          </p>
          <div className="space-y-2">
            <Link
              href={`/notebooks/${notebookId}/curriculum`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">Content Features</div>
                  <div className="text-xs text-gray-500">10 features powered by ed psych research</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
            </Link>
            <Link
              href={`/notebooks/${notebookId}/for-teachers`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <GraduationCap className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">For Teachers</div>
                  <div className="text-xs text-gray-500">6 AI tools for teaching materials</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-500" />
            </Link>
            <Link
              href={`/notebooks/${notebookId}/for-students`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">For Students</div>
                  <div className="text-xs text-gray-500">5 AI tools for learning & practice</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500" />
            </Link>
          </div>
        </section>
      )}

      {/* Audio Overview */}
      <section className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Audio Overview</h3>
          <div className="flex gap-1">
            {audioUrl && <ExpandButton section="audio" title="Audio Overview" />}
            {!audioUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerateAudio}
                disabled={isGeneratingAudio}
                className="text-xs h-8 bg-black text-white hover:bg-gray-800 hover:text-white border-none"
              >
                {isGeneratingAudio ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
              </Button>
            )}
          </div>
        </div>
        
        {audioUrl ? (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full p-2 pr-4 shadow-sm w-full max-w-sm mx-auto">
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-black text-white hover:bg-gray-800 hover:text-white shrink-0"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            
            <div className="flex-1 flex items-center justify-center gap-[2px] h-8 overflow-hidden">
               {/* Minimal waveform viz */}
               {Array.from({ length: 30 }).map((_, i) => (
                 <div 
                    key={i} 
                    className="w-[3px] bg-black/80 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" 
                    style={{ 
                        height: `${Math.max(15, Math.random() * 80)}%`,
                        animationDelay: `${i * 0.05}s`,
                        opacity: isPlaying ? 1 : 0.3
                    }} 
                 />
               ))}
            </div>
            
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />
          </div>
        ) : (
          <div className="h-12 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-300 rounded bg-white">
            No audio generated yet
          </div>
        )}
      </section>

      {/* Mindmap Preview */}
      <section className="min-h-[400px] h-[400px] flex flex-col relative group">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-black">Mindmap Preview</h3>
              {graphEnhanced && mindmapData && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1 font-medium">
                  <Sparkles className="h-3 w-3" />
                  Graph Enhanced
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {mindmapData && <ExpandButton section="mindmap" title="Mindmap" />}
              {mindmapData && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownloadMindmap}
                  className="text-xs h-8 text-black hover:bg-gray-100"
                  title="Download as SVG"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerateMindmap}
                disabled={isGeneratingMindmap}
                className="text-xs h-8 bg-black text-white hover:bg-gray-800 hover:text-white border-none"
              >
                {isGeneratingMindmap ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
              </Button>
            </div>
        </div>
        <div className="flex-1 w-full">
          <MindMap data={mindmapData} /> 
        </div>
      </section>

      {/* Research Summary */}
      <section className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-black">Research Summary</h3>
          <div className="flex gap-1">
            {summary && <ExpandButton section="summary" title="Research Summary" />}
            {summary && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadSummary}
                className="text-xs h-8 text-black hover:bg-gray-100"
                title="Download as Markdown"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateSummary}
              disabled={isGeneratingSummary}
              className="text-xs h-8 bg-black text-white hover:bg-gray-800 hover:text-white border-none"
            >
              {isGeneratingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
            </Button>
          </div>
        </div>
        <FormattedSummary text={summary || ""} />
      </section>

      {/* Slides Generation */}
      <section className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Presentation Slides</h3>
          <div className="flex gap-1">
            {slides.length > 0 && <ExpandButton section="slides" title="Presentation Slides" />}
            {slides.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadSlides}
                className="text-xs h-8 text-black hover:bg-gray-100"
                title="Download as Markdown"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateSlides}
              disabled={isGeneratingSlides}
              className="text-xs h-8 bg-black text-white hover:bg-gray-800 hover:text-white border-none"
            >
              {isGeneratingSlides ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
            </Button>
          </div>
        </div>
        
        {slides.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
                {slides.map((slide, i) => (
                    <div key={i} className="aspect-video bg-white rounded border border-gray-200 p-2 overflow-hidden hover:scale-105 transition-transform cursor-pointer shadow-sm">
                        <h4 className="text-[10px] font-bold text-black truncate">{slide.title}</h4>
                        <ul className="mt-1 space-y-0.5">
                            {slide.bullets.slice(0,3).map((b: string, j: number) => (
                                <li key={j} className="text-[8px] text-gray-600 truncate">• {b}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        ) : (
            <div className="h-24 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-300 rounded bg-white">
                No slides generated
            </div>
        )}
      </section>

      {/* Concept Visualizer */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 relative">
        <div className="absolute top-4 right-4 z-10">
          <ExpandButton section="visualizer" title="Concept Visualizer" />
        </div>
        <VisualizerSection sources={sources} />
      </section>

      {/* Video Studio */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 relative">
        <div className="absolute top-4 right-4 z-10">
          <ExpandButton section="video" title="Video Studio" />
        </div>
        <VideoStudio sources={sources} />
      </section>

      {/* Knowledge Graph - only shown when in a notebook context */}
      {notebookId && (
        <section className="bg-gray-50 rounded-xl border border-gray-200 relative">
          <div className="absolute top-4 right-4 z-10">
            <ExpandButton section="graph" title="Knowledge Graph" />
          </div>
          <KnowledgeGraphPanel notebookId={notebookId} />
        </section>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={expandedSection !== null} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {expandedSection === "audio" && "Audio Overview"}
              {expandedSection === "mindmap" && "Mindmap Preview"}
              {expandedSection === "summary" && "Research Summary"}
              {expandedSection === "slides" && "Presentation Slides"}
              {expandedSection === "visualizer" && "Concept Visualizer"}
              {expandedSection === "video" && "Video Studio"}
              {expandedSection === "graph" && "Knowledge Graph"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 pt-2">
            {/* Audio Overview - Expanded */}
            {expandedSection === "audio" && audioUrl && (
              <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-full p-4 pr-8 shadow-sm w-full max-w-2xl">
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-black text-white hover:bg-gray-800 hover:text-white shrink-0"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                  </Button>
                  <div className="flex-1 flex items-center justify-center gap-1 h-16 overflow-hidden">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-black/80 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"
                        style={{
                          height: `${Math.max(15, Math.random() * 80)}%`,
                          animationDelay: `${i * 0.05}s`,
                          opacity: isPlaying ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Mindmap - Expanded */}
            {expandedSection === "mindmap" && (
              <div className="h-[calc(95vh-100px)] w-full">
                <MindMap data={mindmapData} />
              </div>
            )}

            {/* Research Summary - Expanded */}
            {expandedSection === "summary" && (
              <div className="max-w-4xl mx-auto">
                <FormattedSummary text={summary || ""} />
              </div>
            )}

            {/* Slides - Expanded */}
            {expandedSection === "slides" && (
              <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    className="aspect-video bg-white rounded-lg border border-gray-200 p-4 overflow-hidden shadow-sm"
                  >
                    <h4 className="text-sm font-bold text-black truncate mb-2">{slide.title}</h4>
                    <ul className="space-y-1">
                      {slide.bullets.map((b: string, j: number) => (
                        <li key={j} className="text-xs text-gray-600 truncate">
                          • {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Concept Visualizer - Expanded */}
            {expandedSection === "visualizer" && (
              <div className="h-[calc(95vh-100px)]">
                <VisualizerSection sources={sources} expanded />
              </div>
            )}

            {/* Video Studio - Expanded */}
            {expandedSection === "video" && (
              <div className="h-[calc(95vh-100px)]">
                <VideoStudio sources={sources} expanded />
              </div>
            )}

            {/* Knowledge Graph - Expanded */}
            {expandedSection === "graph" && notebookId && (
              <div className="h-[calc(95vh-100px)]">
                <KnowledgeGraphPanel notebookId={notebookId} expanded />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
