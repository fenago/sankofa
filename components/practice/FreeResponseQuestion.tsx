'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface FreeResponseQuestionProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export function FreeResponseQuestion({
  value,
  onChange,
  disabled = false,
  placeholder = 'Type your answer here...',
  maxLength = 1000,
}: FreeResponseQuestionProps) {
  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.9

  return (
    <div className="space-y-2">
      <Label htmlFor="answer" className="sr-only">
        Your Answer
      </Label>
      <Textarea
        id="answer"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[120px] resize-y"
        aria-describedby="char-count"
      />
      <div
        id="char-count"
        className={`text-xs text-right ${
          isNearLimit ? 'text-amber-600' : 'text-muted-foreground'
        }`}
      >
        {charCount}/{maxLength} characters
      </div>
    </div>
  )
}
