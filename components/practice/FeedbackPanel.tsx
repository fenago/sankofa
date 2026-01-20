'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react'
import type { PracticeFeedback } from '@/hooks/usePractice'

interface FeedbackPanelProps {
  feedback: PracticeFeedback
  correctAnswer: string
  explanation: string
}

export function FeedbackPanel({
  feedback,
  correctAnswer,
  explanation,
}: FeedbackPanelProps) {
  const isCorrect = feedback.type === 'correct' || feedback.type === 'celebratory'
  const isPartial = feedback.type === 'partial'

  const getIcon = () => {
    if (feedback.type === 'celebratory') {
      return <Sparkles className="h-6 w-6 text-yellow-500" />
    }
    if (isCorrect) {
      return <CheckCircle2 className="h-6 w-6 text-green-500" />
    }
    if (isPartial) {
      return <AlertCircle className="h-6 w-6 text-amber-500" />
    }
    return <XCircle className="h-6 w-6 text-red-500" />
  }

  const getBackgroundColor = () => {
    if (feedback.type === 'celebratory') {
      return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
    }
    if (isCorrect) {
      return 'bg-green-50 border-green-200'
    }
    if (isPartial) {
      return 'bg-amber-50 border-amber-200'
    }
    return 'bg-red-50 border-red-200'
  }

  return (
    <Card className={cn('transition-all', getBackgroundColor())}>
      <CardContent className="pt-4 space-y-3">
        {/* Header with emoji and main message */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {feedback.emoji && (
                <span className="text-xl" role="img">
                  {feedback.emoji}
                </span>
              )}
              <p className="font-medium">{feedback.message}</p>
            </div>

            {/* Encouragement */}
            {feedback.encouragement && (
              <p className="text-sm text-muted-foreground mt-1">
                {feedback.encouragement}
              </p>
            )}
          </div>
        </div>

        {/* Correct answer (if wrong) */}
        {!isCorrect && (
          <div className="pl-9">
            <p className="text-sm">
              <span className="font-medium">Correct answer: </span>
              <span className="text-green-700">{correctAnswer}</span>
            </p>
          </div>
        )}

        {/* Explanation */}
        <div className="pl-9 pt-2 border-t">
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>

        {/* Next steps */}
        {feedback.nextSteps && (
          <div className="pl-9 pt-2">
            <p className="text-sm text-blue-700 font-medium">
              {feedback.nextSteps}
            </p>
          </div>
        )}

        {/* Motivational message */}
        {feedback.motivationalMessage && (
          <div className="pl-9 pt-2 text-sm italic text-muted-foreground">
            {feedback.motivationalMessage}
          </div>
        )}

        {/* Hint feedback */}
        {feedback.hintFeedback && (
          <div className="pl-9 pt-2 text-xs text-muted-foreground">
            {feedback.hintFeedback}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
