'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  MarkerType,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { SkillNode, type SkillNodeData } from './SkillNode'
import { PathControls, type LayoutType, type FilterType } from './PathControls'
import { SkillSidebar } from './SkillSidebar'

// Define nodeTypes outside component to prevent React Flow warning
const nodeTypes: NodeTypes = {
  skillNode: SkillNode,
}

interface PathSkill {
  skillId: string
  name: string
  pMastery: number
  scaffoldLevel: number
  bloomLevel: number
  difficulty: number
  prerequisites: string[]
  questionCount?: number
}

interface PathVisualizationProps {
  notebookId: string
  skills: PathSkill[]
  masteryThreshold?: number
  onStartPractice?: (skillId: string) => void
  className?: string
}

// Layout calculation using dagre
function getLayoutedElements(
  nodes: Node<SkillNodeData>[],
  edges: Edge[],
  layout: LayoutType
): { nodes: Node<SkillNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 160
  const nodeHeight = 80

  // Configure graph direction based on layout
  if (layout === 'tree') {
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })
  } else if (layout === 'radial') {
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 60 })
  } else {
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 30 })
  }

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Calculate skill states
function calculateSkillStates(
  skills: PathSkill[],
  masteryThreshold: number
): Map<string, { isReady: boolean; isMastered: boolean; isInProgress: boolean }> {
  const states = new Map<string, { isReady: boolean; isMastered: boolean; isInProgress: boolean }>()
  const masteredSkills = new Set<string>()

  // First pass: identify mastered skills
  skills.forEach((skill) => {
    if (skill.pMastery >= masteryThreshold) {
      masteredSkills.add(skill.skillId)
    }
  })

  // Second pass: calculate states
  skills.forEach((skill) => {
    const isMastered = skill.pMastery >= masteryThreshold
    const prerequisitesMet =
      skill.prerequisites.length === 0 ||
      skill.prerequisites.every((prereq) => masteredSkills.has(prereq))
    const isInProgress = !isMastered && skill.pMastery > 0 && prerequisitesMet
    const isReady = !isMastered && !isInProgress && prerequisitesMet

    states.set(skill.skillId, { isReady, isMastered, isInProgress })
  })

  return states
}

export function PathVisualization({
  notebookId,
  skills,
  masteryThreshold = 0.8,
  onStartPractice,
  className,
}: PathVisualizationProps) {
  const [layout, setLayout] = useState<LayoutType>('dagre')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<SkillNodeData | null>(null)

  // Calculate skill states
  const skillStates = useMemo(
    () => calculateSkillStates(skills, masteryThreshold),
    [skills, masteryThreshold]
  )

  // Calculate stats
  const stats = useMemo(() => {
    let mastered = 0,
      inProgress = 0,
      ready = 0,
      locked = 0
    skillStates.forEach((state) => {
      if (state.isMastered) mastered++
      else if (state.isInProgress) inProgress++
      else if (state.isReady) ready++
      else locked++
    })
    return { total: skills.length, mastered, inProgress, ready, locked }
  }, [skillStates, skills.length])

  // Filter skills
  const filteredSkillIds = useMemo(() => {
    const ids = new Set<string>()
    skills.forEach((skill) => {
      const state = skillStates.get(skill.skillId)
      if (!state) return
      if (filter === 'all') {
        ids.add(skill.skillId)
      } else if (filter === 'mastered' && state.isMastered) {
        ids.add(skill.skillId)
      } else if (filter === 'in_progress' && state.isInProgress) {
        ids.add(skill.skillId)
      } else if (filter === 'ready' && state.isReady) {
        ids.add(skill.skillId)
      } else if (filter === 'locked' && !state.isMastered && !state.isInProgress && !state.isReady) {
        ids.add(skill.skillId)
      }
    })
    return ids
  }, [skills, skillStates, filter])

  // Build initial nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node<SkillNodeData>[] = skills
      .filter((skill) => filteredSkillIds.has(skill.skillId))
      .map((skill) => {
        const state = skillStates.get(skill.skillId)!
        return {
          id: skill.skillId,
          type: 'skillNode',
          position: { x: 0, y: 0 },
          data: {
            skillId: skill.skillId,
            name: skill.name,
            pMastery: skill.pMastery,
            scaffoldLevel: skill.scaffoldLevel,
            bloomLevel: skill.bloomLevel,
            difficulty: skill.difficulty,
            questionCount: skill.questionCount,
            isReady: state.isReady,
            isMastered: state.isMastered,
            isInProgress: state.isInProgress,
          },
        }
      })

    const edges: Edge[] = []
    skills.forEach((skill) => {
      if (!filteredSkillIds.has(skill.skillId)) return
      skill.prerequisites.forEach((prereqId) => {
        if (filteredSkillIds.has(prereqId)) {
          const sourceState = skillStates.get(prereqId)
          edges.push({
            id: `${prereqId}-${skill.skillId}`,
            source: prereqId,
            target: skill.skillId,
            type: 'smoothstep',
            animated: sourceState?.isMastered,
            style: {
              stroke: sourceState?.isMastered ? '#22c55e' : '#d1d5db',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: sourceState?.isMastered ? '#22c55e' : '#d1d5db',
            },
          })
        }
      })
    })

    // Apply layout
    return getLayoutedElements(nodes, edges, layout)
  }, [skills, skillStates, filteredSkillIds, layout])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes/edges when data changes
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      layout
    )
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [initialNodes, initialEdges, layout, setNodes, setEdges])

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<SkillNodeData>) => {
      setSelectedSkill(node.data)
    },
    []
  )

  return (
    <div className={className}>
      <div className="h-full flex">
        {/* Main graph area */}
        <div className="flex-1 relative">
          {/* Controls overlay */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <PathControls
              layout={layout}
              onLayoutChange={setLayout}
              filter={filter}
              onFilterChange={setFilter}
              showLabels={showLabels}
              onShowLabelsChange={setShowLabels}
              onZoomIn={() => {}}
              onZoomOut={() => {}}
              onFitView={() => {}}
              stats={stats}
            />
          </div>

          {/* React Flow */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls position="bottom-left" />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as SkillNodeData
                if (data.isMastered) return '#22c55e'
                if (data.isInProgress) return '#eab308'
                if (data.isReady) return '#3b82f6'
                return '#9ca3af'
              }}
              position="bottom-right"
              pannable
              zoomable
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  No skills match the current filter
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try changing the filter to see more skills
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {selectedSkill && (
          <SkillSidebar
            skill={selectedSkill}
            notebookId={notebookId}
            onClose={() => setSelectedSkill(null)}
            onStartPractice={onStartPractice}
          />
        )}
      </div>
    </div>
  )
}
