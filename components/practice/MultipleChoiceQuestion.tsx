'use client'

import { cn } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle } from 'lucide-react'

interface MultipleChoiceQuestionProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  correctAnswer?: string
  disabled?: boolean
}

export function MultipleChoiceQuestion({
  options,
  value,
  onChange,
  correctAnswer,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  const hasAnswered = correctAnswer !== undefined

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="space-y-3"
    >
      {options.map((option, index) => {
        const letter = String.fromCharCode(65 + index) // A, B, C, D
        const isSelected = value === option
        const isCorrect = hasAnswered && option === correctAnswer
        const isWrong = hasAnswered && isSelected && option !== correctAnswer

        return (
          <div
            key={index}
            className={cn(
              'flex items-center space-x-3 rounded-lg border p-4 transition-all',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50',
              isSelected && !hasAnswered && 'border-primary bg-primary/5',
              isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/20',
              isWrong && 'border-red-500 bg-red-50 dark:bg-red-950/20'
            )}
          >
            <RadioGroupItem
              value={option}
              id={`option-${index}`}
              className={cn(
                isCorrect && 'border-green-500 text-green-500',
                isWrong && 'border-red-500 text-red-500'
              )}
            />
            <Label
              htmlFor={`option-${index}`}
              className={cn(
                'flex-1 cursor-pointer font-normal',
                disabled && 'cursor-not-allowed'
              )}
            >
              <span className="font-medium mr-2">{letter}.</span>
              {option}
            </Label>
            {isCorrect && (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            )}
            {isWrong && (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
          </div>
        )
      })}
    </RadioGroup>
  )
}
