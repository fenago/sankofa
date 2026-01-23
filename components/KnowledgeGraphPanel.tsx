"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Loader2, Network, AlertCircle, RefreshCw, Sparkles, Users, BookOpen, Trash2, Database, CheckCircle2, FileText, Brain, GitBranch } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGraph } from "@/hooks/useGraph";
import { mutate } from "swr";
import { notebookKeys } from "@/hooks/useNotebooks";

interface Skill {
  id: string;
  name: string;
  description?: string;
  bloomLevel?: number;
  secondaryBloomLevels?: number[];
  difficulty?: number;
  estimatedMinutes?: number;
  keywords?: string[];
  isThresholdConcept?: boolean;
  // IRT 3PL parameters
  irtDifficulty?: number;
  irtDiscrimination?: number;
  irtGuessing?: number;
  // Threshold properties
  thresholdProperties?: {
    unlocksDomains?: string[];
    troublesomeAspects?: string[];
  };
  // Cognitive load
  cognitiveLoadEstimate?: 'low' | 'medium' | 'high';
  elementInteractivity?: 'low' | 'medium' | 'high';
  chunksRequired?: number;
  // Mastery
  masteryThreshold?: number;
  assessmentTypes?: string[];
  suggestedAssessments?: string;
  // Spaced repetition
  reviewIntervals?: number[];
  // Scaffolding
  scaffoldingLevels?: string;
  // Domain
  domain?: string;
  subdomain?: string;
  // Misconceptions & transfer
  commonMisconceptions?: string[];
  transferDomains?: string[];
}

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface Prerequisite {
  fromSkillId: string;
  toSkillId: string;
  strength?: string;
}

interface KnowledgeGraphPanelProps {
  notebookId: string;
  expanded?: boolean;
}

// Colors for Bloom levels
const bloomColors = [
  "#f3f4f6", // 1 - Remember (gray-100)
  "#dbeafe", // 2 - Understand (blue-100)
  "#dcfce7", // 3 - Apply (green-100)
  "#fef9c3", // 4 - Analyze (yellow-100)
  "#ffedd5", // 5 - Evaluate (orange-100)
  "#f3e8ff", // 6 - Create (purple-100)
];

// Entity type colors
const entityTypeColors: Record<string, string> = {
  concept: "bg-blue-100 text-blue-800",
  person: "bg-green-100 text-green-800",
  event: "bg-yellow-100 text-yellow-800",
  place: "bg-purple-100 text-purple-800",
  term: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
};

// Define nodeTypes and edgeTypes outside component to prevent React Flow warning
const nodeTypes = {};
const edgeTypes = {};

export function KnowledgeGraphPanel({ notebookId, expanded }: KnowledgeGraphPanelProps) {
  // Use SWR for cached graph data
  const { skills, entities, prerequisites, loading, error: graphError, refetch } = useGraph(notebookId);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"graph" | "skills" | "entities" | "metadata">("graph");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extraction progress state
  const [extractionStartTime, setExtractionStartTime] = useState<number | null>(null);
  const [extractionStep, setExtractionStep] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const extractionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Extraction steps for progress display
  const extractionSteps = [
    { label: "Preparing sources", icon: FileText },
    { label: "Analyzing content", icon: Brain },
    { label: "Extracting skills", icon: BookOpen },
    { label: "Building relationships", icon: GitBranch },
    { label: "Finalizing graph", icon: Network },
  ];

  // Update elapsed time during extraction
  useEffect(() => {
    if (isExtracting && extractionStartTime) {
      extractionTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - extractionStartTime) / 1000);
        setElapsedTime(elapsed);

        // Progress through steps based on time
        if (elapsed < 5) setExtractionStep(0);
        else if (elapsed < 15) setExtractionStep(1);
        else if (elapsed < 40) setExtractionStep(2);
        else if (elapsed < 60) setExtractionStep(3);
        else setExtractionStep(4);
      }, 1000);

      return () => {
        if (extractionTimerRef.current) {
          clearInterval(extractionTimerRef.current);
        }
      };
    }
  }, [isExtracting, extractionStartTime]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get help text based on elapsed time
  const getExtractionHelpText = () => {
    if (elapsedTime > 120) return "Large documents can take 2-4 minutes. Almost there...";
    if (elapsedTime > 60) return "Building comprehensive knowledge graph...";
    if (elapsedTime > 30) return "Analyzing relationships between concepts...";
    return "Extracting skills and concepts from your sources...";
  };

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Combine errors
  const error = extractionError || graphError;

  const triggerExtraction = useCallback(async () => {
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionStartTime(Date.now());
    setExtractionStep(0);
    setElapsedTime(0);

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rebuild: true }),
      });

      // Handle timeout - extraction may still complete server-side
      if (res.status === 502 || res.status === 504) {
        console.log("[Graph] Request timed out, but extraction may still complete");
        // Poll for results after a delay
        setTimeout(() => {
          mutate(notebookKeys.graph(notebookId));
          mutate(notebookKeys.learningPath(notebookId));
        }, 5000);
        return; // Don't show error, extraction is likely still running
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Extraction failed");
      }

      // Revalidate graph data and learning path
      mutate(notebookKeys.graph(notebookId));
      mutate(notebookKeys.learningPath(notebookId));
    } catch (err) {
      // Network errors might mean timeout - check after delay
      console.log("[Graph] Request failed, checking if extraction completed:", err);
      setTimeout(() => {
        mutate(notebookKeys.graph(notebookId));
        mutate(notebookKeys.learningPath(notebookId));
      }, 5000);
    } finally {
      setIsExtracting(false);
      setExtractionStartTime(null);
      if (extractionTimerRef.current) {
        clearInterval(extractionTimerRef.current);
      }
    }
  }, [notebookId]);

  const deleteGraph = useCallback(async () => {
    setIsDeleting(true);
    setExtractionError(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/graph`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Delete failed");
      }

      // Revalidate graph data and learning path
      mutate(notebookKeys.graph(notebookId));
      mutate(notebookKeys.learningPath(notebookId));
      setShowDeleteConfirm(false);
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Failed to delete graph");
    } finally {
      setIsDeleting(false);
    }
  }, [notebookId]);

  // Build graphData object for compatibility - memoize to prevent infinite loops
  const graphData = useMemo(() => ({
    available: true,
    skills: skills as Skill[],
    entities: entities as Entity[],
    prerequisites: prerequisites.map(p => ({
      fromSkillId: p.source,
      toSkillId: p.target,
      strength: p.type,
    })) as Prerequisite[],
  }), [skills, entities, prerequisites]);

  // Track previous data to prevent unnecessary updates
  const prevDataKeyRef = useRef<string>("");

  // Convert graph data to React Flow nodes/edges
  useEffect(() => {
    // Create a stable key from the data to detect actual changes
    const dataKey = JSON.stringify({
      skillIds: graphData.skills.map(s => s.id),
      prereqKeys: graphData.prerequisites.map(p => `${p.fromSkillId}-${p.toSkillId}`),
    });

    // Skip if data hasn't actually changed
    if (dataKey === prevDataKeyRef.current) {
      return;
    }
    prevDataKeyRef.current = dataKey;

    if (graphData.skills.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Create nodes from skills
    const skillNodes: Node[] = graphData.skills.map((skill, index) => {
      // Arrange in a grid layout
      const cols = 3;
      const row = Math.floor(index / cols);
      const col = index % cols;
      const bgColor = skill.bloomLevel ? bloomColors[skill.bloomLevel - 1] : "#f9fafb";

      // Ensure unique ID - fallback to index if skill.id is missing
      const nodeId = skill.id || `skill-${index}`;
      const nodeName = skill.name || `Skill ${index + 1}`;

      return {
        id: nodeId,
        type: "default",
        position: { x: col * 280 + 50, y: row * 120 + 50 },
        data: { label: nodeName },
        style: {
          background: bgColor,
          border: skill.isThresholdConcept ? "2px solid #a855f7" : "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: 500,
          maxWidth: "180px",
        },
      };
    });

    // Create edges from prerequisites
    const prereqEdges: Edge[] = graphData.prerequisites.map((prereq, index) => ({
      id: `edge-${index}`,
      source: prereq.fromSkillId,
      target: prereq.toSkillId,
      type: "smoothstep",
      animated: prereq.strength === "required",
      style: {
        stroke: prereq.strength === "required" ? "#ef4444" : prereq.strength === "recommended" ? "#f59e0b" : "#9ca3af",
        strokeWidth: prereq.strength === "required" ? 2 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: prereq.strength === "required" ? "#ef4444" : prereq.strength === "recommended" ? "#f59e0b" : "#9ca3af",
      },
      label: prereq.strength,
      labelStyle: { fontSize: 10, fill: "#666" },
    }));

    setNodes(skillNodes);
    setEdges(prereqEdges);
  }, [graphData, setNodes, setEdges]);

  const skillCount = skills.length;
  const entityCount = entities.length;

  if (loading && skillCount === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${expanded ? "h-full flex flex-col" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black flex items-center gap-2">
          <Network className="h-5 w-5" />
          Knowledge Graph
          {(skillCount > 0 || entityCount > 0) && (
            <span className="text-xs font-normal text-gray-500">
              ({skillCount} skills, {entityCount} entities)
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={loading}
            className="text-xs h-8"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {skillCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete Knowledge Graph"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={triggerExtraction}
            disabled={isExtracting}
            className="text-xs h-8 bg-black text-white hover:bg-gray-800 hover:text-white border-none"
          >
            {isExtracting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            {skillCount === 0 ? "Extract" : "Re-extract"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {skillCount === 0 && entityCount === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-gray-500 bg-white rounded border border-dashed border-gray-300">
          <Network className="h-10 w-10 mb-3 text-gray-300" />
          <p className="text-sm font-medium">No knowledge graph data yet</p>
          <p className="text-xs text-gray-400 mt-1">Click &quot;Extract&quot; to analyze your sources</p>
        </div>
      ) : (
        <div className={expanded ? "flex-1 flex flex-col" : ""}>
          {/* Tab buttons */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "graph"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Network className="h-3 w-3" />
              Graph View
            </button>
            <button
              onClick={() => setActiveTab("skills")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "skills"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="h-3 w-3" />
              Skills ({skillCount})
            </button>
            <button
              onClick={() => setActiveTab("entities")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "entities"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="h-3 w-3" />
              Entities ({entityCount})
            </button>
            <button
              onClick={() => setActiveTab("metadata")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "metadata"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Database className="h-3 w-3" />
              Meta Data
            </button>
          </div>

          {/* Graph View */}
          {activeTab === "graph" && (
            <div className={expanded ? "flex-1 flex flex-col" : ""}>
              <div className={`bg-gray-50 rounded-lg border border-gray-200 overflow-hidden ${expanded ? "flex-1" : "h-[350px]"}`}>
                {nodes.length > 0 ? (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.3}
                    maxZoom={1.5}
                  >
                    <Background color="#e5e7eb" gap={20} />
                    <Controls className="bg-white" />
                  </ReactFlow>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No skill relationships to display
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-red-500"></span> Required
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500"></span> Recommended
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-gray-400"></span> Helpful
                </span>
              </div>
            </div>
          )}

          {/* Skills List */}
          {activeTab === "skills" && (
            <div className={`overflow-y-auto space-y-2 ${expanded ? "flex-1" : "max-h-[380px]"}`}>
              {graphData?.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{skill.name}</h4>
                      {skill.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{skill.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {skill.bloomLevel && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded">
                          L{skill.bloomLevel}
                        </span>
                      )}
                      {skill.isThresholdConcept && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-800 rounded">
                          Threshold
                        </span>
                      )}
                    </div>
                  </div>
                  {skill.keywords && skill.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {skill.keywords.slice(0, 5).map((kw, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Entities List */}
          {activeTab === "entities" && (
            <div className={`overflow-y-auto space-y-2 ${expanded ? "flex-1" : "max-h-[380px]"}`}>
              {graphData?.entities.map((entity) => (
                <div
                  key={entity.id}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded shrink-0 ${entityTypeColors[entity.type] || entityTypeColors.other}`}>
                      {entity.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900">{entity.name}</h4>
                      {entity.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entity.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meta Data View */}
          {activeTab === "metadata" && (
            <div className={`overflow-y-auto space-y-4 ${expanded ? "flex-1" : "max-h-[380px]"}`}>
              {graphData?.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-4 bg-white rounded-lg border border-gray-200"
                >
                  <h4 className="font-semibold text-sm text-gray-900 mb-3 pb-2 border-b">{skill.name}</h4>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {/* Bloom's Taxonomy */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Bloom&apos;s Taxonomy</h5>
                      <div className="text-gray-600">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">
                          L{skill.bloomLevel || "?"}
                        </span>
                        {skill.secondaryBloomLevels && skill.secondaryBloomLevels.length > 0 && (
                          <span className="text-gray-400">
                            + {skill.secondaryBloomLevels.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Difficulty & Time */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Difficulty & Time</h5>
                      <div className="text-gray-600">
                        <span>Difficulty: {skill.difficulty || "?"}/10</span>
                        <span className="mx-2">•</span>
                        <span>{skill.estimatedMinutes || "?"} min</span>
                      </div>
                    </div>

                    {/* IRT Parameters */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">IRT 3PL Parameters</h5>
                      <div className="text-gray-600 space-y-0.5">
                        <div>b (difficulty): {skill.irtDifficulty?.toFixed(2) || "N/A"}</div>
                        <div>a (discrimination): {skill.irtDiscrimination?.toFixed(2) || "N/A"}</div>
                        <div>c (guessing): {skill.irtGuessing?.toFixed(2) || "N/A"}</div>
                      </div>
                    </div>

                    {/* Cognitive Load */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Cognitive Load</h5>
                      <div className="text-gray-600 space-y-0.5">
                        <div>Load: <span className={`px-1.5 py-0.5 rounded ${
                          skill.cognitiveLoadEstimate === 'low' ? 'bg-green-100 text-green-700' :
                          skill.cognitiveLoadEstimate === 'high' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{skill.cognitiveLoadEstimate || "medium"}</span></div>
                        <div>Chunks: {skill.chunksRequired || "?"}</div>
                        <div>Interactivity: {skill.elementInteractivity || "medium"}</div>
                      </div>
                    </div>

                    {/* Mastery */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Mastery Learning</h5>
                      <div className="text-gray-600 space-y-0.5">
                        <div>Threshold: {((skill.masteryThreshold || 0.8) * 100).toFixed(0)}%</div>
                        {skill.assessmentTypes && skill.assessmentTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {skill.assessmentTypes.map((t, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Spaced Repetition */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Review Intervals</h5>
                      <div className="text-gray-600">
                        {skill.reviewIntervals && skill.reviewIntervals.length > 0 ? (
                          <span>{skill.reviewIntervals.join(", ")} days</span>
                        ) : (
                          <span>1, 3, 7, 14, 30, 60 days</span>
                        )}
                      </div>
                    </div>

                    {/* Domain */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Domain</h5>
                      <div className="text-gray-600">
                        {skill.domain || "Not specified"}
                        {skill.subdomain && <span className="text-gray-400"> / {skill.subdomain}</span>}
                      </div>
                    </div>

                    {/* Threshold Concept */}
                    {skill.isThresholdConcept && (
                      <div className="space-y-1">
                        <h5 className="font-medium text-gray-700">Threshold Concept</h5>
                        <div className="text-gray-600">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">Yes</span>
                          {skill.thresholdProperties?.unlocksDomains && skill.thresholdProperties.unlocksDomains.length > 0 && (
                            <div className="mt-1 text-[10px]">
                              Unlocks: {skill.thresholdProperties.unlocksDomains.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scaffolding Levels */}
                  {skill.scaffoldingLevels && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="font-medium text-gray-700 text-xs mb-2">Scaffolding Levels</h5>
                      <div className="text-xs text-gray-600 space-y-1">
                        {(() => {
                          try {
                            const levels = typeof skill.scaffoldingLevels === 'string'
                              ? JSON.parse(skill.scaffoldingLevels)
                              : skill.scaffoldingLevels;
                            return (
                              <>
                                {levels.level1 && <div><span className="font-medium">L1:</span> {levels.level1}</div>}
                                {levels.level2 && <div><span className="font-medium">L2:</span> {levels.level2}</div>}
                                {levels.level3 && <div><span className="font-medium">L3:</span> {levels.level3}</div>}
                                {levels.level4 && <div><span className="font-medium">L4:</span> {levels.level4}</div>}
                              </>
                            );
                          } catch {
                            return <div className="text-gray-400">Unable to parse scaffolding data</div>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Common Misconceptions */}
                  {skill.commonMisconceptions && skill.commonMisconceptions.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="font-medium text-gray-700 text-xs mb-2">Common Misconceptions</h5>
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        {skill.commonMisconceptions.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Transfer Domains */}
                  {skill.transferDomains && skill.transferDomains.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="font-medium text-gray-700 text-xs mb-2">Transfer Domains</h5>
                      <div className="flex flex-wrap gap-1">
                        {skill.transferDomains.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extraction Progress Dialog */}
      <Dialog open={isExtracting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Extracting Knowledge Graph
            </DialogTitle>
            <DialogDescription>
              Analyzing your sources and building a comprehensive learning graph
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Elapsed time */}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-gray-900">
                {formatElapsedTime(elapsedTime)}
              </div>
              <p className="text-sm text-gray-500 mt-1">{getExtractionHelpText()}</p>
            </div>

            {/* Progress bar */}
            <Progress value={(extractionStep + 1) / extractionSteps.length * 100} className="h-2" />

            {/* Steps */}
            <div className="space-y-3">
              {extractionSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isComplete = index < extractionStep;
                const isCurrent = index === extractionStep;
                const isPending = index > extractionStep;

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isCurrent ? "bg-purple-50 border border-purple-200" :
                      isComplete ? "bg-green-50" : "bg-gray-50"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isComplete ? "bg-green-500 text-white" :
                      isCurrent ? "bg-purple-500 text-white" :
                      "bg-gray-200 text-gray-400"
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      isComplete ? "text-green-700" :
                      isCurrent ? "text-purple-700" :
                      "text-gray-400"
                    }`}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-purple-500 animate-pulse">
                        In progress...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tip */}
            <div className="text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
              💡 Extraction uses AI to identify skills, concepts, and their relationships
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Graph</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the entire knowledge graph for this notebook?
              This will remove all {skillCount} skills and {entityCount} entities.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteGraph}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
