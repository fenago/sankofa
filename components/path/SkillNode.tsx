'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Lock, CheckCircle2, PlayCircle, Circle } from 'lucide-react'

export interface SkillNodeData {
  skillId: string
  name: string
  pMastery: number
  scaffoldLevel: number
  isReady: boolean
  isMastered: boolean
  isInProgress: boolean
  bloomLevel: number
  difficulty: number
  questionCount?: number
  [key: string]: unknown
}

interface SkillNodeProps {
  data: SkillNodeData
  selected?: boolean
}

function SkillNodeComponent({ data, selected }: SkillNodeProps) {
  const { name, pMastery, isReady, isMastered, isInProgress } = data

  // Determine node state and styling
  const getNodeStyle = () => {
    if (isMastered) {
      return {
        bg: 'bg-green-100 border-green-500',
        text: 'text-green-800',
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        label: 'Mastered',
      }
    }
    if (isInProgress) {
      return {
        bg: 'bg-yellow-100 border-yellow-500',
        text: 'text-yellow-800',
        icon: <PlayCircle className="h-4 w-4 text-yellow-600" />,
        label: 'In Progress',
      }
    }
    if (isReady) {
      return {
        bg: 'bg-blue-50 border-blue-400 border-dashed',
        text: 'text-blue-800',
        icon: <Circle className="h-4 w-4 text-blue-500" />,
        label: 'Ready',
      }
    }
    return {
      bg: 'bg-gray-100 border-gray-300',
      text: 'text-gray-500',
      icon: <Lock className="h-3 w-3 text-gray-400" />,
      label: 'Locked',
    }
  }

  const style = getNodeStyle()
  const masteryPercent = Math.round(pMastery * 100)

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 min-w-[140px] max-w-[180px] transition-all cursor-pointer',
        style.bg,
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2"
      />

      {/* Node content */}
      <div className="space-y-2">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              'text-sm font-medium leading-tight line-clamp-2',
              style.text
            )}
          >
            {name}
          </h4>
          {style.icon}
        </div>

        {/* Mastery bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isMastered
                  ? 'bg-green-500'
                  : isInProgress
                    ? 'bg-yellow-500'
                    : isReady
                      ? 'bg-blue-400'
                      : 'bg-gray-300'
              )}
              style={{ width: `${masteryPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={cn('opacity-75', style.text)}>{style.label}</span>
            <span className={cn('font-medium', style.text)}>
              {masteryPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2"
      />
    </div>
  )
}

export const SkillNode = memo(SkillNodeComponent)
