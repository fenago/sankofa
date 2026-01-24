'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CheckCircle2,
  Circle,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Brain,
} from 'lucide-react'
import type { ExplorationAttempt, AttemptCategory } from '@/lib/practice/productive-failure'

interface AttemptTimelineProps {
  attempts: ExplorationAttempt[]
  maxAttempts: number
  currentAttempt?: number
  compact?: boolean
}

const categoryConfig: Record<
  AttemptCategory,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  correct: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 border-green-300',
    label: 'Correct',
  },
  partial_correct: {
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 border-blue-300',
    label: 'Getting Close',
  },
  creative_wrong: {
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 border-purple-300',
    label: 'Creative',
  },
  common_misconception: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 border-yellow-300',
    label: 'Common Thinking',
  },
  off_track: {
    icon: <Circle className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 border-gray-300',
    label: 'Exploring',
  },
  incomplete: {
    icon: <Circle className="h-4 w-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 border-gray-200',
    label: 'Started',
  },
}

export function AttemptTimeline({
  attempts,
  maxAttempts,
  currentAttempt,
  compact = false,
}: AttemptTimelineProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: maxAttempts }).map((_, i) => {
          const attempt = attempts[i]
          const isCurrent = i === currentAttempt
          const config = attempt ? categoryConfig[attempt.category] : null

          return (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      attempt
                        ? config?.bgColor
                        : isCurrent
                        ? 'border-primary bg-primary/10'
                        : 'border-muted bg-muted/50'
                    }`}
                  >
                    {attempt ? (
                      <span className={config?.color}>{config?.icon}</span>
                    ) : isCurrent ? (
                      <span className="text-xs font-medium text-primary">{i + 1}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{i + 1}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {attempt ? (
                    <div className="space-y-1">
                      <p className="font-medium">Attempt {i + 1}: {config?.label}</p>
                      {attempt.partialUnderstanding.length > 0 && (
                        <p className="text-xs text-green-600">
                          Good: {attempt.partialUnderstanding[0]}
                        </p>
                      )}
                    </div>
                  ) : isCurrent ? (
                    <p>Current attempt</p>
                  ) : (
                    <p>Attempt {i + 1} (not started)</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600" />
          Exploration Journey
        </h3>
        <Badge variant="outline">
          {attempts.length} / {maxAttempts} attempts
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted" />

        {/* Attempts */}
        <div className="space-y-4">
          {Array.from({ length: maxAttempts }).map((_, i) => {
            const attempt = attempts[i]
            const isCurrent = i === currentAttempt
            const config = attempt ? categoryConfig[attempt.category] : null

            return (
              <div key={i} className="relative flex items-start gap-4 pl-2">
                {/* Node */}
                <div
                  className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    attempt
                      ? config?.bgColor
                      : isCurrent
                      ? 'border-primary bg-primary/10 animate-pulse'
                      : 'border-muted bg-background'
                  }`}
                >
                  {attempt && (
                    <span className={`${config?.color} scale-75`}>{config?.icon}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 -mt-0.5">
                  {attempt ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Attempt {i + 1}</span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${config?.color}`}
                        >
                          {config?.label}
                        </Badge>
                        {attempt.creativityScore > 0.7 && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Creative
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {attempt.content}
                      </p>
                      {attempt.partialUnderstanding.length > 0 && (
                        <p className="text-xs text-green-600">
                          On track: {attempt.partialUnderstanding[0]}
                        </p>
                      )}
                      {attempt.misconceptions.length > 0 && (
                        <p className="text-xs text-amber-600">
                          To explore: {attempt.misconceptions[0]}
                        </p>
                      )}
                      {/* Creativity meter */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Creativity:</span>
                        <Progress
                          value={attempt.creativityScore * 100}
                          className="w-16 h-1.5"
                        />
                      </div>
                    </div>
                  ) : isCurrent ? (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-primary">
                        Current Attempt
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Working on it...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">
                        Attempt {i + 1}
                      </span>
                      <p className="text-xs text-muted-foreground/70">
                        Available for exploration
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary stats */}
      {attempts.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total exploration time</span>
            <span className="font-medium">
              {formatDuration(attempts.reduce((sum, a) => sum + a.durationMs, 0))}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average creativity</span>
            <span className="font-medium">
              {(
                (attempts.reduce((sum, a) => sum + a.creativityScore, 0) / attempts.length) *
                100
              ).toFixed(0)}
              %
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Insights surfaced</span>
            <span className="font-medium">
              {attempts.filter(a => a.partialUnderstanding.length > 0).length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default AttemptTimeline
