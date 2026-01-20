'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, HandHelping, Lightbulb, Rocket, ChevronRight } from 'lucide-react'

interface ScaffoldLevelProps {
  level: 1 | 2 | 3 | 4
  showProgress?: boolean
  className?: string
}

const SCAFFOLD_LEVELS = [
  {
    level: 1 as const,
    label: 'Full Support',
    icon: GraduationCap,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    activeColor: 'bg-blue-500 text-white',
    description: 'Complete worked examples provided before practice',
    features: ['Step-by-step solutions shown', 'Immediate guidance available', 'Multiple examples per concept'],
  },
  {
    level: 2 as const,
    label: 'Guided Practice',
    icon: HandHelping,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    activeColor: 'bg-purple-500 text-white',
    description: 'Partial solutions to complete with assistance',
    features: ['Partial solutions provided', 'Key steps highlighted', 'Scaffolded prompts'],
  },
  {
    level: 3 as const,
    label: 'Hints Available',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    activeColor: 'bg-amber-500 text-white',
    description: 'Work independently with hints on request',
    features: ['Progressive hint system', 'Self-directed learning', 'Optional support'],
  },
  {
    level: 4 as const,
    label: 'Independent',
    icon: Rocket,
    color: 'bg-green-100 text-green-800 border-green-200',
    activeColor: 'bg-green-500 text-white',
    description: 'Minimal scaffolding for demonstrated mastery',
    features: ['Full autonomy', 'Confidence building', 'Mastery validation'],
  },
]

export function ScaffoldLevel({ level, showProgress = true, className }: ScaffoldLevelProps) {
  const currentLevel = SCAFFOLD_LEVELS.find((l) => l.level === level)!
  const Icon = currentLevel.icon

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Scaffold Level
          <Badge variant="outline" className={currentLevel.color}>
            Level {level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Level Display */}
        <div className={cn('p-4 rounded-lg border-2', currentLevel.color)}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', currentLevel.activeColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">{currentLevel.label}</h4>
              <p className="text-xs opacity-80">{currentLevel.description}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {currentLevel.features.map((feature, i) => (
              <li key={i} className="text-xs flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Progress Indicator */}
        {showProgress && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Progression Path</p>
            <div className="flex items-center gap-1">
              {SCAFFOLD_LEVELS.map((l, i) => {
                const LevelIcon = l.icon
                const isActive = l.level === level
                const isPast = l.level < level

                return (
                  <div key={l.level} className="flex items-center">
                    <div
                      className={cn(
                        'p-1.5 rounded-full transition-all',
                        isActive && l.activeColor,
                        isPast && 'bg-green-500 text-white',
                        !isActive && !isPast && 'bg-gray-100 text-gray-400'
                      )}
                      title={l.label}
                    >
                      <LevelIcon className="h-4 w-4" />
                    </div>
                    {i < SCAFFOLD_LEVELS.length - 1 && (
                      <div
                        className={cn(
                          'w-4 h-0.5 mx-0.5',
                          isPast ? 'bg-green-500' : 'bg-gray-200'
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {level < 4
                ? `Continue practicing to progress to ${SCAFFOLD_LEVELS[level].label}`
                : 'You\'ve reached the highest scaffold level!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
