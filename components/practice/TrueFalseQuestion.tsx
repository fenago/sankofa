'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Check, X } from 'lucide-react'

interface TrueFalseQuestionProps {
  value: string
  onChange: (value: string) => void
  correctAnswer?: string
  disabled?: boolean
}

export function TrueFalseQuestion({
  value,
  onChange,
  correctAnswer,
  disabled = false,
}: TrueFalseQuestionProps) {
  const hasAnswered = correctAnswer !== undefined
  const normalizedCorrect = correctAnswer?.toLowerCase() === 'true'

  const isTrue = value.toLowerCase() === 'true'
  const isFalse = value.toLowerCase() === 'false'

  const trueIsCorrect = hasAnswered && normalizedCorrect === true
  const falseIsCorrect = hasAnswered && normalizedCorrect === false

  const trueIsWrong = hasAnswered && isTrue && normalizedCorrect === false
  const falseIsWrong = hasAnswered && isFalse && normalizedCorrect === true

  return (
    <div className="flex gap-4 justify-center py-4">
      <Button
        type="button"
        size="lg"
        variant={isTrue && !hasAnswered ? 'default' : 'outline'}
        onClick={() => onChange('true')}
        disabled={disabled}
        className={cn(
          'min-w-[140px] h-16 text-lg font-medium transition-all',
          trueIsCorrect && 'border-green-500 bg-green-100 text-green-700 hover:bg-green-100',
          trueIsWrong && 'border-red-500 bg-red-100 text-red-700 hover:bg-red-100'
        )}
      >
        <Check className="h-5 w-5 mr-2" />
        True
        {trueIsCorrect && <CheckCircle2 className="h-5 w-5 ml-2 text-green-600" />}
        {trueIsWrong && <XCircle className="h-5 w-5 ml-2 text-red-600" />}
      </Button>

      <Button
        type="button"
        size="lg"
        variant={isFalse && !hasAnswered ? 'default' : 'outline'}
        onClick={() => onChange('false')}
        disabled={disabled}
        className={cn(
          'min-w-[140px] h-16 text-lg font-medium transition-all',
          falseIsCorrect && 'border-green-500 bg-green-100 text-green-700 hover:bg-green-100',
          falseIsWrong && 'border-red-500 bg-red-100 text-red-700 hover:bg-red-100'
        )}
      >
        <X className="h-5 w-5 mr-2" />
        False
        {falseIsCorrect && <CheckCircle2 className="h-5 w-5 ml-2 text-green-600" />}
        {falseIsWrong && <XCircle className="h-5 w-5 ml-2 text-red-600" />}
      </Button>
    </div>
  )
}
