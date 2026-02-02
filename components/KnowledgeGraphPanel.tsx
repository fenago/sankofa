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
import { Loader2, Network, AlertCircle, RefreshCw, Sparkles, Users, BookOpen, Trash2, Database, CheckCircle2, FileText, Brain, GitBranch, Layers } from "lucide-react";
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
import { useSources } from "@/hooks/useSources";
import { mutate } from "swr";
import { notebookKeys } from "@/hooks/useNotebooks";

// Polling interval for extraction job status (ms)
const POLL_INTERVAL = 3000;

// Fink dimension labels with practical guidance
const FINK_LABELS: Record<string, {
  name: string;
  color: string;
  description: string;
  question: string;
  activities: string[];
}> = {
  foundational_knowledge: {
    name: 'Foundational',
    color: 'bg-blue-100 text-blue-700',
    description: 'The facts, concepts, and principles you need to understand',
    question: 'What are the key ideas I need to remember and understand?',
    activities: ['Create a summary in your own words', 'Make flashcards for key terms', 'Draw a concept map']
  },
  application: {
    name: 'Application',
    color: 'bg-green-100 text-green-700',
    description: 'Using knowledge to solve real problems and complete tasks',
    question: 'How can I use this to solve problems or create something?',
    activities: ['Work through practice problems', 'Build a project using these concepts', 'Apply to a real situation in your life']
  },
  integration: {
    name: 'Integration',
    color: 'bg-purple-100 text-purple-700',
    description: 'Connecting ideas across topics, disciplines, and experiences',
    question: 'How does this connect to other things I know?',
    activities: ['Find connections to other subjects', 'Compare with your prior knowledge', 'Identify patterns across topics']
  },
  human_dimension: {
    name: 'Human',
    color: 'bg-pink-100 text-pink-700',
    description: 'Learning about yourself and how to interact with others',
    question: 'What does this teach me about myself or others?',
    activities: ['Reflect on personal relevance', 'Discuss with peers', 'Consider different perspectives']
  },
  caring: {
    name: 'Caring',
    color: 'bg-red-100 text-red-700',
    description: 'Developing new interests, feelings, and values',
    question: 'Why does this matter? What do I care about now?',
    activities: ['Explore why this topic matters', 'Find aspects that excite you', 'Consider ethical implications']
  },
  learning_how_to_learn: {
    name: 'Meta-Learning',
    color: 'bg-amber-100 text-amber-700',
    description: 'Becoming a better, more self-directed learner',
    question: 'How can I learn this better and apply these strategies elsewhere?',
    activities: ['Identify what study methods work', 'Set learning goals', 'Reflect on your learning process']
  },
};

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
  // Fink's Taxonomy
  finkDimensions?: string[];
  finkPrimaryDimension?: string;
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

// Extraction granularity options
type ExtractionGranularity = 'compact' | 'standard' | 'detailed';

const GRANULARITY_OPTIONS: { value: ExtractionGranularity; label: string; description: string; range: string }[] = [
  { value: 'compact', label: 'Compact', description: 'High-level skills only', range: '5-10 skills' },
  { value: 'standard', label: 'Standard', description: 'Balanced coverage', range: '15-25 skills' },
  { value: 'detailed', label: 'Detailed', description: 'Fine-grained hierarchy', range: '30-50 skills' },
];

// Colors for Bloom levels with labels
const bloomLevels = [
  { level: 1, name: 'Remember', color: "#f3f4f6", border: "#d1d5db" },
  { level: 2, name: 'Understand', color: "#dbeafe", border: "#93c5fd" },
  { level: 3, name: 'Apply', color: "#dcfce7", border: "#86efac" },
  { level: 4, name: 'Analyze', color: "#fef9c3", border: "#fde047" },
  { level: 5, name: 'Evaluate', color: "#ffedd5", border: "#fdba74" },
  { level: 6, name: 'Create', color: "#f3e8ff", border: "#d8b4fe" },
];

// Keep array for backwards compat
const bloomColors = bloomLevels.map(b => b.color);

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

// Fink dimension keys for positioning in hexagon
const FINK_KEYS = ['foundational_knowledge', 'application', 'integration', 'human_dimension', 'caring', 'learning_how_to_learn'] as const;

// Fink Taxonomy sub-component with Connections visualization
function FinkTaxonomyView({ graphData, expanded }: { graphData: { skills: Skill[] }; expanded?: boolean }) {
  const [finkView, setFinkView] = useState<'dimensions' | 'connections'>('connections');
  const [selectedConnection, setSelectedConnection] = useState<{ from: string; to: string } | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  // Calculate connections between dimensions
  const connections = useMemo(() => {
    const conn: Record<string, { count: number; skills: Skill[] }> = {};

    graphData.skills.forEach(skill => {
      if (skill.finkDimensions && skill.finkDimensions.length > 1) {
        // This skill spans multiple dimensions - create connections
        const dims = skill.finkDimensions;
        for (let i = 0; i < dims.length; i++) {
          for (let j = i + 1; j < dims.length; j++) {
            const key = [dims[i], dims[j]].sort().join('--');
            if (!conn[key]) {
              conn[key] = { count: 0, skills: [] };
            }
            conn[key].count++;
            conn[key].skills.push(skill);
          }
        }
      }
    });

    return conn;
  }, [graphData.skills]);

  // Get position for each dimension in hexagon layout
  const getHexPosition = (index: number, radius: number, centerX: number, centerY: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180); // Start from top, go clockwise
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const totalFinkSkills = graphData.skills.filter(
    s => s.finkDimensions && s.finkDimensions.length > 0
  ).length;

  const multiDimSkills = graphData.skills.filter(
    s => s.finkDimensions && s.finkDimensions.length > 1
  ).length;

  if (totalFinkSkills === 0 && graphData.skills.length > 0) {
    return (
      <div className={`overflow-y-auto ${expanded ? "flex-1" : "max-h-[380px]"}`}>
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700">
            <span className="font-medium">No Fink data found.</span> Re-extract the knowledge graph to generate Fink&apos;s Taxonomy dimensions.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${expanded ? "flex-1" : "max-h-[380px]"}`}>
      <div className="p-3 bg-white rounded-lg border border-gray-200">
        {/* Header with view toggle */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm text-gray-900">Fink&apos;s Taxonomy</h4>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setFinkView('connections')}
              className={`px-2 py-1 text-[10px] font-medium rounded ${
                finkView === 'connections' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Connections
            </button>
            <button
              onClick={() => setFinkView('dimensions')}
              className={`px-2 py-1 text-[10px] font-medium rounded ${
                finkView === 'dimensions' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              By Dimension
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-3 text-[10px] text-gray-500">
          <span>{totalFinkSkills} skills with Fink data</span>
          <span>•</span>
          <span>{multiDimSkills} span multiple dimensions</span>
        </div>

        {/* Connections View - Hexagonal Web */}
        {finkView === 'connections' && (
          <div className="space-y-3">
            {/* SVG Hexagon Visualization */}
            <div className="relative bg-gray-50 rounded-lg p-2" style={{ height: expanded ? 350 : 220 }}>
              <svg width="100%" height="100%" viewBox="0 0 300 260" className="mx-auto">
                {/* Connection lines */}
                {Object.entries(connections).map(([key, data]) => {
                  const [from, to] = key.split('--');
                  const fromIndex = FINK_KEYS.indexOf(from as typeof FINK_KEYS[number]);
                  const toIndex = FINK_KEYS.indexOf(to as typeof FINK_KEYS[number]);
                  if (fromIndex === -1 || toIndex === -1) return null;

                  const fromPos = getHexPosition(fromIndex, 90, 150, 130);
                  const toPos = getHexPosition(toIndex, 90, 150, 130);
                  const isSelected = selectedConnection?.from === from && selectedConnection?.to === to;
                  const strokeWidth = Math.min(1 + data.count * 0.8, 6);

                  return (
                    <line
                      key={key}
                      x1={fromPos.x}
                      y1={fromPos.y}
                      x2={toPos.x}
                      y2={toPos.y}
                      stroke={isSelected ? '#7c3aed' : '#d1d5db'}
                      strokeWidth={strokeWidth}
                      className="cursor-pointer transition-all hover:stroke-purple-400"
                      onClick={() => {
                        setSelectedConnection(isSelected ? null : { from, to });
                        setSelectedDimension(null);
                      }}
                    />
                  );
                })}

                {/* Dimension nodes */}
                {FINK_KEYS.map((dimKey, index) => {
                  const pos = getHexPosition(index, 90, 150, 130);
                  const dimInfo = FINK_LABELS[dimKey];
                  const skillCount = graphData.skills.filter(
                    s => s.finkDimensions?.includes(dimKey)
                  ).length;
                  const isSelected = selectedDimension === dimKey;

                  // Extract background color from class
                  const bgColorMatch = dimInfo.color.match(/bg-(\w+)-100/);
                  const fillColor = bgColorMatch ? {
                    'blue': '#dbeafe',
                    'green': '#dcfce7',
                    'purple': '#f3e8ff',
                    'pink': '#fce7f3',
                    'red': '#fee2e2',
                    'amber': '#fef3c7',
                  }[bgColorMatch[1]] || '#f3f4f6' : '#f3f4f6';

                  const textColorMatch = dimInfo.color.match(/text-(\w+)-700/);
                  const textColor = textColorMatch ? {
                    'blue': '#1d4ed8',
                    'green': '#15803d',
                    'purple': '#7c3aed',
                    'pink': '#be185d',
                    'red': '#b91c1c',
                    'amber': '#b45309',
                  }[textColorMatch[1]] || '#374151' : '#374151';

                  return (
                    <g
                      key={dimKey}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedDimension(isSelected ? null : dimKey);
                        setSelectedConnection(null);
                      }}
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={28}
                        fill={fillColor}
                        stroke={isSelected ? '#000' : textColor}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-all hover:opacity-80"
                      />
                      <text
                        x={pos.x}
                        y={pos.y - 5}
                        textAnchor="middle"
                        className="text-[9px] font-medium pointer-events-none"
                        fill={textColor}
                      >
                        {dimInfo.name}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 8}
                        textAnchor="middle"
                        className="text-[8px] pointer-events-none"
                        fill="#6b7280"
                      >
                        {skillCount} skills
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected dimension details */}
            {selectedDimension && (() => {
              const dimInfo = FINK_LABELS[selectedDimension];
              const dimSkills = graphData.skills.filter(s => s.finkDimensions?.includes(selectedDimension));
              return (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${dimInfo?.color}`}>
                      {dimInfo?.name}
                    </span>
                    <button
                      onClick={() => setSelectedDimension(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Key Question */}
                  <div className="p-2 bg-white rounded border-l-4 border-blue-400">
                    <div className="text-[10px] font-medium text-blue-600 mb-0.5">Ask Yourself:</div>
                    <div className="text-xs text-gray-800 italic">&ldquo;{dimInfo?.question}&rdquo;</div>
                  </div>

                  {/* What this means for your content */}
                  <div>
                    <div className="text-[10px] font-medium text-gray-600 mb-1.5">
                      From your content ({dimSkills.length} skills):
                    </div>
                    <div className="space-y-2 max-h-28 overflow-y-auto">
                      {dimSkills.slice(0, 5).map(skill => (
                        <div key={skill.id} className="p-2 bg-white rounded border border-gray-100">
                          <div className="text-xs font-medium text-gray-900">{skill.name}</div>
                          {skill.description && (
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{skill.description}</div>
                          )}
                        </div>
                      ))}
                      {dimSkills.length > 5 && (
                        <div className="text-[10px] text-gray-400 text-center">+{dimSkills.length - 5} more</div>
                      )}
                    </div>
                  </div>

                  {/* Suggested Activities */}
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <div className="text-[10px] font-medium text-green-700 mb-1">Try These Activities:</div>
                    <ul className="text-[10px] text-green-800 space-y-0.5">
                      {dimInfo?.activities.map((activity, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-green-500">•</span>
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}

            {/* Selected connection details */}
            {selectedConnection && connections[`${[selectedConnection.from, selectedConnection.to].sort().join('--')}`] && (() => {
              const connKey = `${[selectedConnection.from, selectedConnection.to].sort().join('--')}`;
              const connData = connections[connKey];
              const fromInfo = FINK_LABELS[selectedConnection.from];
              const toInfo = FINK_LABELS[selectedConnection.to];
              return (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${fromInfo?.color}`}>
                        {fromInfo?.name}
                      </span>
                      <span className="text-purple-400">↔</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${toInfo?.color}`}>
                        {toInfo?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedConnection(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Why this connection matters */}
                  <div className="p-2 bg-white rounded border-l-4 border-purple-400">
                    <div className="text-[10px] font-medium text-purple-600 mb-0.5">Why this matters:</div>
                    <div className="text-[10px] text-gray-700">
                      These {connData.count} skills connect <strong>{fromInfo?.name}</strong> ({fromInfo?.description?.toLowerCase()})
                      with <strong>{toInfo?.name}</strong> ({toInfo?.description?.toLowerCase()}).
                    </div>
                  </div>

                  {/* Skills that bridge */}
                  <div>
                    <div className="text-[10px] font-medium text-gray-600 mb-1.5">
                      Skills that bridge both dimensions:
                    </div>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {connData.skills.slice(0, 4).map(skill => (
                        <div key={skill.id} className="p-2 bg-white rounded border border-purple-100">
                          <div className="text-xs font-medium text-gray-900">{skill.name}</div>
                          {skill.description && (
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{skill.description}</div>
                          )}
                        </div>
                      ))}
                      {connData.skills.length > 4 && (
                        <div className="text-[10px] text-gray-400 text-center">+{connData.skills.length - 4} more</div>
                      )}
                    </div>
                  </div>

                  {/* Practical suggestion */}
                  <div className="p-2 bg-purple-100 rounded text-[10px] text-purple-800">
                    <strong>Try:</strong> Take one skill above and ask yourself both &ldquo;{fromInfo?.question?.split('?')[0]}?&rdquo;
                    AND &ldquo;{toInfo?.question?.split('?')[0]}?&rdquo;
                  </div>
                </div>
              );
            })()}

            {/* Hint when nothing selected */}
            {!selectedConnection && !selectedDimension && (
              <div className="text-[10px] text-gray-500 text-center">
                Click a dimension circle or connection line to explore
              </div>
            )}
          </div>
        )}

        {/* Dimensions View - Grid of cards */}
        {finkView === 'dimensions' && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FINK_LABELS).map(([dimKey, dimInfo]) => {
              const skillsWithDim = graphData.skills.filter(
                s => s.finkDimensions?.includes(dimKey) || s.finkPrimaryDimension === dimKey
              );

              return (
                <div
                  key={dimKey}
                  className={`p-2 rounded-lg border ${dimInfo.color.replace('text-', 'border-').replace('-700', '-200')} ${dimInfo.color.split(' ')[0]}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-xs ${dimInfo.color.split(' ')[1]}`}>
                      {dimInfo.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {skillsWithDim.length} skills
                    </span>
                  </div>
                  {/* Key question for this dimension */}
                  <div className="text-[9px] text-gray-500 italic mb-1.5 line-clamp-1" title={dimInfo.question}>
                    &ldquo;{dimInfo.question}&rdquo;
                  </div>
                  {skillsWithDim.length > 0 ? (
                    <div className="space-y-1 max-h-16 overflow-y-auto">
                      {skillsWithDim.slice(0, 2).map(skill => (
                        <div
                          key={skill.id}
                          className="text-[10px] text-gray-600 truncate"
                          title={skill.name}
                        >
                          {skill.finkPrimaryDimension === dimKey && '★ '}
                          {skill.name}
                        </div>
                      ))}
                      {skillsWithDim.length > 2 && (
                        <div className="text-[10px] text-gray-400">
                          +{skillsWithDim.length - 2} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic">No skills</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function KnowledgeGraphPanel({ notebookId, expanded }: KnowledgeGraphPanelProps) {
  // Use SWR for cached graph data
  const { skills, entities, prerequisites, loading, error: graphError, refetch } = useGraph(notebookId);

  // Get sources for extraction
  const { sources } = useSources(notebookId);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"graph" | "skills" | "entities" | "fink" | "metadata">("graph");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGranularityDialog, setShowGranularityDialog] = useState(false);
  const [selectedGranularity, setSelectedGranularity] = useState<ExtractionGranularity>('standard');

  // Extraction progress state
  const [extractionStartTime, setExtractionStartTime] = useState<number | null>(null);
  const [extractionStep, setExtractionStep] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const extractionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track extraction jobs for polling
  const [activeJobs, setActiveJobs] = useState<Map<string, string>>(new Map()); // sourceId -> jobId
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check extraction job status for a source
  const checkJobStatus = useCallback(async (sourceId: string): Promise<{ done: boolean; skillCount: number }> => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/sources/${sourceId}/graph`);
      if (!res.ok) return { done: false, skillCount: 0 };
      const data = await res.json();
      // Job is done when not extracting and either has skills or job completed
      const isDone = !data.extracting && (data.skillCount > 0 || data.lastJob?.status === 'completed' || data.lastJob?.status === 'failed');
      return { done: isDone, skillCount: data.skillCount || 0 };
    } catch {
      return { done: false, skillCount: 0 };
    }
  }, [notebookId]);

  // Poll for extraction completion
  useEffect(() => {
    if (activeJobs.size === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    console.log(`[KnowledgeGraph] Polling ${activeJobs.size} active extraction jobs`);

    pollIntervalRef.current = setInterval(async () => {
      const newActiveJobs = new Map(activeJobs);
      let completedCount = 0;

      for (const [sourceId] of activeJobs) {
        const { done, skillCount } = await checkJobStatus(sourceId);
        if (done) {
          console.log(`[KnowledgeGraph] Source ${sourceId} extraction complete (${skillCount} skills)`);
          newActiveJobs.delete(sourceId);
          completedCount++;
        }
      }

      if (completedCount > 0) {
        setActiveJobs(newActiveJobs);

        // Refresh graph data when jobs complete
        mutate(notebookKeys.graph(notebookId));
        mutate(notebookKeys.learningPath(notebookId));

        // If all jobs done, stop extraction
        if (newActiveJobs.size === 0) {
          console.log('[KnowledgeGraph] All extraction jobs complete');
          setIsExtracting(false);
          setExtractionStartTime(null);
          if (extractionTimerRef.current) {
            clearInterval(extractionTimerRef.current);
          }
        }
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeJobs, checkJobStatus, notebookId]);

  const triggerExtraction = useCallback(async (granularity: ExtractionGranularity = 'standard') => {
    setShowGranularityDialog(false);
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionStartTime(Date.now());
    setExtractionStep(0);
    setElapsedTime(0);

    // Get sources that are ready for extraction
    const readySources = sources.filter(s => s.status === 'success');

    if (readySources.length === 0) {
      setExtractionError('No sources ready for extraction. Add sources first.');
      setIsExtracting(false);
      return;
    }

    console.log(`[KnowledgeGraph] Starting extraction for ${readySources.length} sources`);

    const newActiveJobs = new Map<string, string>();

    // Create extraction job for each source using the job-based API
    for (const source of readySources) {
      try {
        console.log(`[KnowledgeGraph] Creating extraction job for source ${source.id}`);
        const res = await fetch(`/api/notebooks/${notebookId}/sources/${source.id}/graph`, {
          method: "POST",
        });

        if (res.ok || res.status === 202) {
          const data = await res.json();
          if (data.jobId) {
            newActiveJobs.set(source.id, data.jobId);
            console.log(`[KnowledgeGraph] Job ${data.jobId} started for source ${source.id}`);
          }
        } else {
          console.warn(`[KnowledgeGraph] Failed to create job for source ${source.id}`);
        }
      } catch (err) {
        console.error(`[KnowledgeGraph] Error creating job for source ${source.id}:`, err);
      }
    }

    if (newActiveJobs.size === 0) {
      setExtractionError('Failed to start extraction jobs');
      setIsExtracting(false);
      setExtractionStartTime(null);
      return;
    }

    // Start polling by setting active jobs
    setActiveJobs(newActiveJobs);
    console.log(`[KnowledgeGraph] ${newActiveJobs.size} extraction jobs started, polling for completion`);
  }, [notebookId, sources]);

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
            onClick={() => setShowGranularityDialog(true)}
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
              onClick={() => setActiveTab("fink")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "fink"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Layers className="h-3 w-3" />
              Fink
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
              {/* Comprehensive Legend */}
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>

                {/* Bloom's Taxonomy - Node Colors */}
                <div className="mb-3">
                  <div className="text-[10px] text-gray-500 mb-1.5 font-medium">Node Color = Bloom&apos;s Taxonomy Level</div>
                  <div className="flex flex-wrap gap-1.5">
                    {bloomLevels.map((bloom) => (
                      <div key={bloom.level} className="flex items-center gap-1">
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: bloom.color, borderColor: bloom.border }}
                        />
                        <span className="text-[10px] text-gray-600">{bloom.level}. {bloom.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edge Types */}
                <div>
                  <div className="text-[10px] text-gray-500 mb-1.5 font-medium">Edge Type = Prerequisite Strength</div>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-red-500"></span>
                      <span className="text-[10px] text-gray-600">Required</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-amber-500"></span>
                      <span className="text-[10px] text-gray-600">Recommended</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-gray-400"></span>
                      <span className="text-[10px] text-gray-600">Helpful</span>
                    </span>
                  </div>
                </div>
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
                    <div className="flex gap-1 ml-2 flex-wrap justify-end">
                      {skill.bloomLevel && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-medium rounded border"
                          style={{
                            backgroundColor: bloomLevels[skill.bloomLevel - 1]?.color,
                            borderColor: bloomLevels[skill.bloomLevel - 1]?.border,
                          }}
                        >
                          {bloomLevels[skill.bloomLevel - 1]?.name || `L${skill.bloomLevel}`}
                        </span>
                      )}
                      {skill.isThresholdConcept && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-800 rounded border border-purple-300">
                          Threshold
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fink's Taxonomy Dimensions */}
                  {skill.finkDimensions && skill.finkDimensions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] text-gray-400 mr-1">Fink:</span>
                      {skill.finkDimensions.map((dim, i) => {
                        const finkInfo = FINK_LABELS[dim];
                        return (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 text-[10px] rounded ${finkInfo?.color || 'bg-gray-100 text-gray-600'}`}
                          >
                            {finkInfo?.name || dim}
                          </span>
                        );
                      })}
                    </div>
                  )}

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

          {/* Fink's Taxonomy View */}
          {activeTab === "fink" && (
            <FinkTaxonomyView graphData={graphData} expanded={expanded} />
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
                        {skill.bloomLevel && (
                          <span
                            className="inline-block px-2 py-0.5 rounded border mr-1"
                            style={{
                              backgroundColor: bloomLevels[skill.bloomLevel - 1]?.color,
                              borderColor: bloomLevels[skill.bloomLevel - 1]?.border,
                            }}
                          >
                            {skill.bloomLevel}. {bloomLevels[skill.bloomLevel - 1]?.name || "?"}
                          </span>
                        )}
                        {skill.secondaryBloomLevels && skill.secondaryBloomLevels.length > 0 && (
                          <span className="text-gray-400">
                            + {skill.secondaryBloomLevels.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fink's Taxonomy */}
                    <div className="space-y-1">
                      <h5 className="font-medium text-gray-700">Fink&apos;s Taxonomy</h5>
                      <div className="text-gray-600">
                        {skill.finkDimensions && skill.finkDimensions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {skill.finkDimensions.map((dim, i) => {
                              const finkInfo = FINK_LABELS[dim];
                              const isPrimary = skill.finkPrimaryDimension === dim;
                              return (
                                <span
                                  key={i}
                                  className={`px-1.5 py-0.5 text-[10px] rounded ${finkInfo?.color || 'bg-gray-100 text-gray-600'} ${isPrimary ? 'ring-1 ring-offset-1 ring-gray-400' : ''}`}
                                  title={isPrimary ? 'Primary dimension' : ''}
                                >
                                  {finkInfo?.name || dim}
                                  {isPrimary && ' ★'}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
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

      {/* Granularity Selection Dialog */}
      <Dialog open={showGranularityDialog} onOpenChange={setShowGranularityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Extraction Settings
            </DialogTitle>
            <DialogDescription>
              Choose how detailed you want the skill extraction to be
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {GRANULARITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedGranularity(option.value)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedGranularity === option.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{option.label}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {option.range}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGranularityDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => triggerExtraction(selectedGranularity)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Extract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
