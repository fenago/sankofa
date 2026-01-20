'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScaffoldedHintsProps {
  hints: string[]
  availableCount: number
  onRequestHint: () => void
  disabled?: boolean
}

export function ScaffoldedHints({
  hints,
  availableCount,
  onRequestHint,
  disabled = false,
}: ScaffoldedHintsProps) {
  const totalHints = hints.length + availableCount
  const hasMoreHints = availableCount > 0

  // Progressive hint styling (more obvious as you use more hints)
  const getHintStyle = (index: number): string => {
    if (index === 0) return 'border-l-2 border-blue-300 bg-blue-50/50'
    if (index === 1) return 'border-l-3 border-blue-400 bg-blue-50/70'
    return 'border-l-4 border-blue-500 bg-blue-50'
  }

  const getHintLabel = (index: number): string => {
    if (index === 0) return 'Hint'
    if (index === 1) return 'More Help'
    return 'Strong Hint'
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span>
            {hints.length} of {totalHints} hints used
          </span>
        </div>

        {hasMoreHints && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestHint}
            disabled={disabled}
            className="gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            Get Hint ({availableCount} left)
          </Button>
        )}
      </div>

      {/* Revealed hints */}
      {hints.length > 0 && (
        <div className="space-y-2">
          {hints.map((hint, index) => (
            <Card
              key={index}
              className={cn('transition-all', getHintStyle(index))}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {index < hints.length - 1 ? (
                      <ChevronDown className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-blue-600 mb-1">
                      {getHintLabel(index)}
                    </div>
                    <p className="text-sm">{hint}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Encouragement message when no hints used yet */}
      {hints.length === 0 && hasMoreHints && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Stuck? Hints are here to help you learn, not just give answers.
        </p>
      )}
    </div>
  )
}
