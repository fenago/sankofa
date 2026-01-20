'use client'

import { Input } from '@/components/ui/input'

interface FillBlankQuestionProps {
  questionText: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function FillBlankQuestion({
  questionText,
  value,
  onChange,
  disabled = false,
}: FillBlankQuestionProps) {
  // Split the question by the blank marker
  const parts = questionText.split('_____')

  // If there's no blank marker, just show an input below
  if (parts.length === 1) {
    return (
      <div className="space-y-4">
        <p className="text-lg leading-relaxed">{questionText}</p>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Your answer..."
          className="max-w-md"
        />
      </div>
    )
  }

  return (
    <div className="text-lg leading-relaxed">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && (
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder="..."
              className="inline-block w-[200px] mx-1 align-baseline"
              aria-label={`Blank ${index + 1}`}
            />
          )}
        </span>
      ))}
    </div>
  )
}
