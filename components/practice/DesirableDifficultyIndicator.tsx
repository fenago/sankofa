'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Brain, Shuffle, Timer, RefreshCw, Palette, ChevronDown } from 'lucide-react'

type DifficultyType = 'interleaving' | 'spacing' | 'retrieval' | 'variation'

interface ActiveDifficulty {
  type: DifficultyType
  label: string
  description: string
  strength: number // 0-1
  icon: React.ReactNode
}

interface DesirableDifficultyIndicatorProps {
  activeDifficulties: DifficultyType[]
  interleavingStrength?: number
  spacingStrength?: number
  retrievalStrength?: number
  variationStrength?: number
  compact?: boolean
}

const DIFFICULTY_INFO: Record<DifficultyType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  interleaving: {
    label: 'Interleaving',
    description: 'Mixing different skills to strengthen discrimination',
    icon: <Shuffle className="h-3.5 w-3.5" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  spacing: {
    label: 'Spacing',
    description: 'Distributed practice with optimal review intervals',
    icon: <Timer className="h-3.5 w-3.5" />,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  retrieval: {
    label: 'Retrieval',
    description: 'Active recall instead of passive review',
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  variation: {
    label: 'Variation',
    description: 'Different contexts and formats for deeper learning',
    icon: <Palette className="h-3.5 w-3.5" />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
}

export function DesirableDifficultyIndicator({
  activeDifficulties,
  interleavingStrength = 0,
  spacingStrength = 0,
  retrievalStrength = 0,
  variationStrength = 0,
  compact = false,
}: DesirableDifficultyIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (activeDifficulties.length === 0) {
    return null
  }

  const strengthMap: Record<DifficultyType, number> = {
    interleaving: interleavingStrength,
    spacing: spacingStrength,
    retrieval: retrievalStrength,
    variation: variationStrength,
  }

  const difficulties: ActiveDifficulty[] = activeDifficulties.map(type => ({
    type,
    ...DIFFICULTY_INFO[type],
    strength: strengthMap[type],
  }))

  const averageStrength = difficulties.reduce((sum, d) => sum + d.strength, 0) / difficulties.length

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs font-normal"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-700">{activeDifficulties.length} active</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <DifficultyDetails difficulties={difficulties} averageStrength={averageStrength} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">
          <div className="p-1.5 bg-amber-200 rounded-full">
            <Sparkles className="h-4 w-4 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-amber-800">
                Desirable Difficulties Active
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {difficulties.map(d => (
                <Badge
                  key={d.type}
                  variant="outline"
                  className={`text-xs py-0 ${DIFFICULTY_INFO[d.type].color}`}
                >
                  {d.icon}
                  <span className="ml-1">{d.label}</span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <DifficultyDetails difficulties={difficulties} averageStrength={averageStrength} />
      </PopoverContent>
    </Popover>
  )
}

function DifficultyDetails({
  difficulties,
  averageStrength,
}: {
  difficulties: ActiveDifficulty[]
  averageStrength: number
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Brain className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">Desirable Difficulties</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Learning techniques that feel harder but improve long-term retention
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {difficulties.map(d => (
          <div key={d.type} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${DIFFICULTY_INFO[d.type].color}`}>
                  {d.icon}
                </div>
                <span className="text-sm font-medium">{d.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {(d.strength * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={d.strength * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{d.description}</p>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Difficulty Strength</span>
          <Badge variant="secondary">{(averageStrength * 100).toFixed(0)}%</Badge>
        </div>
        <Progress value={averageStrength * 100} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          Higher difficulty = slower initial learning but better long-term retention.
          Optimal range is 40-70%.
        </p>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
        <strong>Research basis:</strong> Bjork & Bjork (2011), Roediger & Karpicke (2006)
      </div>
    </div>
  )
}

export default DesirableDifficultyIndicator
