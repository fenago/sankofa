'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Position,
  Handle,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'

interface SkillNodeData {
  id: string
  name: string
  pMastery: number
  isCurrent?: boolean
  isPrerequisite?: boolean
  [key: string]: unknown
}

interface PrerequisiteTreeProps {
  currentSkill: SkillNodeData
  prerequisites: SkillNodeData[]
  dependents?: SkillNodeData[]
  onSkillClick?: (skillId: string) => void
  className?: string
}

interface SkillNodeProps {
  data: SkillNodeData
}

// Custom node component
function SkillNode({ data }: SkillNodeProps) {
  const { name, pMastery, isCurrent, isPrerequisite } = data

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return 'bg-green-100 border-green-500 text-green-800'
    if (mastery >= 0.5) return 'bg-yellow-100 border-yellow-500 text-yellow-800'
    if (mastery > 0) return 'bg-orange-100 border-orange-500 text-orange-800'
    return 'bg-gray-100 border-gray-300 text-gray-600'
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2"
      />
      <div
        className={cn(
          'px-3 py-2 rounded-lg border-2 min-w-[100px] max-w-[150px] text-center shadow-sm transition-all',
          getMasteryColor(pMastery),
          isCurrent && 'ring-2 ring-primary ring-offset-2',
          !isCurrent && 'hover:shadow-md cursor-pointer'
        )}
      >
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-[10px] mt-0.5 opacity-75">
          {Math.round(pMastery * 100)}% mastery
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2"
      />
    </>
  )
}

const nodeTypes = {
  skill: SkillNode,
}

export function PrerequisiteTree({
  currentSkill,
  prerequisites,
  dependents = [],
  onSkillClick,
  className,
}: PrerequisiteTreeProps) {
  // Build nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodes: Node<SkillNodeData>[] = []
    const edges: Edge[] = []

    // Calculate positions
    const currentX = 200
    const currentY = prerequisites.length > 0 ? 150 : 50
    const prereqSpacing = 120
    const prereqStartX = currentX - ((prerequisites.length - 1) * prereqSpacing) / 2
    const depStartX = currentX - ((dependents.length - 1) * prereqSpacing) / 2

    // Add current skill node
    nodes.push({
      id: currentSkill.id,
      type: 'skill',
      position: { x: currentX, y: currentY },
      data: { ...currentSkill, isCurrent: true },
    })

    // Add prerequisite nodes
    prerequisites.forEach((prereq, index) => {
      nodes.push({
        id: prereq.id,
        type: 'skill',
        position: { x: prereqStartX + index * prereqSpacing, y: 20 },
        data: { ...prereq, isPrerequisite: true },
      })

      edges.push({
        id: `${prereq.id}-${currentSkill.id}`,
        source: prereq.id,
        target: currentSkill.id,
        animated: prereq.pMastery < 0.8,
        style: {
          stroke: prereq.pMastery >= 0.8 ? '#22c55e' : '#94a3b8',
          strokeWidth: 2,
        },
      })
    })

    // Add dependent nodes
    dependents.forEach((dep, index) => {
      nodes.push({
        id: dep.id,
        type: 'skill',
        position: { x: depStartX + index * prereqSpacing, y: currentY + 100 },
        data: dep,
      })

      edges.push({
        id: `${currentSkill.id}-${dep.id}`,
        source: currentSkill.id,
        target: dep.id,
        style: {
          stroke: '#94a3b8',
          strokeWidth: 2,
        },
      })
    })

    return { nodes, edges }
  }, [currentSkill, prerequisites, dependents])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== currentSkill.id && onSkillClick) {
        onSkillClick(node.id)
      }
    },
    [currentSkill.id, onSkillClick]
  )

  if (prerequisites.length === 0 && dependents.length === 0) {
    return (
      <div className={cn('h-40 flex items-center justify-center text-muted-foreground', className)}>
        <p className="text-sm">No prerequisite relationships found</p>
      </div>
    )
  }

  return (
    <div className={cn('h-64 w-full rounded-lg border bg-white', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag={false}
        preventScrolling={false}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background color="#f1f5f9" gap={16} />
      </ReactFlow>
    </div>
  )
}
