'use client'

import { cn } from '@/lib/utils'
import { Check, Circle, HelpCircle } from 'lucide-react'

interface QuestionNavigatorProps {
  totalQuestions: number
  currentIndex: number
  answeredQuestions: Set<string>
  questionIds: string[]
  onNavigate: (index: number) => void
  className?: string
}

export function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answeredQuestions,
  questionIds,
  onNavigate,
  className,
}: QuestionNavigatorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Questions</span>
        <span className="font-medium">
          {answeredQuestions.size}/{totalQuestions} answered
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const questionId = questionIds[i]
          const isAnswered = questionId ? answeredQuestions.has(questionId) : false
          const isCurrent = i === currentIndex

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center font-medium text-sm transition-all',
                isCurrent && 'ring-2 ring-primary ring-offset-2',
                isAnswered
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {isAnswered ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{i + 1}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-100" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-muted" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded ring-2 ring-primary" />
          <span>Current</span>
        </div>
      </div>
    </div>
  )
}
