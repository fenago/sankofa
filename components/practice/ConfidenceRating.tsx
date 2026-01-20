'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ConfidenceRatingProps {
  value?: number
  onChange: (value: number) => void
  disabled?: boolean
}

const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Guessing', emoji: '🎲', color: 'border-red-300 hover:bg-red-50' },
  { value: 2, label: 'Uncertain', emoji: '🤔', color: 'border-orange-300 hover:bg-orange-50' },
  { value: 3, label: 'Somewhat', emoji: '😐', color: 'border-yellow-300 hover:bg-yellow-50' },
  { value: 4, label: 'Confident', emoji: '😊', color: 'border-green-300 hover:bg-green-50' },
  { value: 5, label: 'Very Sure', emoji: '💪', color: 'border-emerald-300 hover:bg-emerald-50' },
]

export function ConfidenceRating({
  value,
  onChange,
  disabled = false,
}: ConfidenceRatingProps) {
  return (
    <div className="space-y-2 py-3 px-4 bg-muted/30 rounded-lg border border-dashed">
      <Label className="text-sm font-medium text-muted-foreground">
        How confident are you in your answer?
      </Label>
      <div className="flex flex-wrap gap-2 justify-center">
        {CONFIDENCE_LEVELS.map((level) => (
          <Button
            key={level.value}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(level.value)}
            className={cn(
              'flex-col h-auto py-2 px-3 min-w-[80px] transition-all',
              level.color,
              value === level.value && 'ring-2 ring-primary bg-primary/5'
            )}
          >
            <span className="text-lg" role="img" aria-label={level.label}>
              {level.emoji}
            </span>
            <span className="text-xs mt-1">{level.label}</span>
          </Button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-center text-muted-foreground mt-1">
          {value <= 2
            ? "That's okay - giving it a try is what matters!"
            : value >= 4
            ? "Great! Let's see how you did."
            : 'Good reflection. Submit when ready!'}
        </p>
      )}
    </div>
  )
}
