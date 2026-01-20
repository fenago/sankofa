'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PracticeQuestion, PracticeFeedback } from '@/hooks/usePractice'
import { getQuestionTypeLabel, getDifficultyLabel, getScaffoldLevelDescription } from '@/hooks/usePractice'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'
import { FreeResponseQuestion } from './FreeResponseQuestion'
import { TrueFalseQuestion } from './TrueFalseQuestion'
import { FillBlankQuestion } from './FillBlankQuestion'
import { ScaffoldedHints } from './ScaffoldedHints'
import { ConfidenceRating } from './ConfidenceRating'
import { FeedbackPanel } from './FeedbackPanel'
import { WorkedExample } from './WorkedExample'
import { BookOpen, Clock, Layers } from 'lucide-react'

interface QuestionCardProps {
  question: PracticeQuestion
  questionNumber: number
  totalQuestions: number
  scaffoldLevel: 1 | 2 | 3 | 4
  onSubmit: (answer: string, responseTimeMs: number, confidence?: number) => Promise<void>
  onHintRequest: () => string | null
  availableHints: number
  feedback: PracticeFeedback | null
  workedExample?: string
  isSubmitting: boolean
  showConfidence?: boolean
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  scaffoldLevel,
  onSubmit,
  onHintRequest,
  availableHints,
  feedback,
  workedExample,
  isSubmitting,
  showConfidence = true,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState('')
  const [confidence, setConfidence] = useState<number | undefined>(undefined)
  const [startTime] = useState(Date.now())
  const [hintsRevealed, setHintsRevealed] = useState<string[]>([])
  const [showWorkedExample, setShowWorkedExample] = useState(false)

  const hasAnswered = feedback !== null
  const scaffoldInfo = getScaffoldLevelDescription(scaffoldLevel)
  const difficultyInfo = getDifficultyLabel(question.difficulty)

  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || isSubmitting) return
    const responseTimeMs = Date.now() - startTime
    await onSubmit(answer, responseTimeMs, confidence)
  }, [answer, confidence, startTime, onSubmit, isSubmitting])

  const handleHintRequest = useCallback(() => {
    const hint = onHintRequest()
    if (hint) {
      setHintsRevealed((prev) => [...prev, hint])
    }
  }, [onHintRequest])

  // Render the appropriate question type component
  const renderQuestionContent = () => {
    const commonProps = {
      value: answer,
      onChange: setAnswer,
      disabled: hasAnswered || isSubmitting,
    }

    switch (question.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            {...commonProps}
            options={question.options || []}
            correctAnswer={hasAnswered ? question.correctAnswer : undefined}
          />
        )
      case 'true_false':
        return (
          <TrueFalseQuestion
            {...commonProps}
            correctAnswer={hasAnswered ? question.correctAnswer : undefined}
          />
        )
      case 'fill_blank':
        return (
          <FillBlankQuestion
            {...commonProps}
            questionText={question.question}
          />
        )
      case 'free_response':
      default:
        return <FreeResponseQuestion {...commonProps} />
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Question {questionNumber} of {totalQuestions}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getQuestionTypeLabel(question.type)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={difficultyInfo.color}>{difficultyInfo.label}</span>
            <span className="text-muted-foreground">|</span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {scaffoldInfo.label}
            </span>
          </div>
        </div>

        <CardTitle className="text-lg leading-relaxed">
          {question.type === 'fill_blank' ? (
            <span className="sr-only">{question.question}</span>
          ) : (
            question.question
          )}
        </CardTitle>

        {question.partialSolution && scaffoldLevel === 2 && !hasAnswered && (
          <CardDescription className="mt-3 p-3 bg-muted/50 rounded-md border-l-4 border-blue-500">
            <span className="font-medium text-blue-700">Partial Solution:</span>
            <p className="mt-1 whitespace-pre-wrap">{question.partialSolution}</p>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Worked Example (Scaffold Level 1) */}
        {question.workedExample && scaffoldLevel === 1 && !hasAnswered && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWorkedExample(!showWorkedExample)}
              className="text-blue-600 hover:text-blue-700"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {showWorkedExample ? 'Hide' : 'Show'} Worked Example
            </Button>
            {showWorkedExample && (
              <WorkedExample content={question.workedExample} />
            )}
          </div>
        )}

        {/* Pre-answer confidence rating */}
        {showConfidence && !hasAnswered && answer.trim() && (
          <ConfidenceRating
            value={confidence}
            onChange={setConfidence}
            disabled={hasAnswered || isSubmitting}
          />
        )}

        {/* Question content */}
        <div className="space-y-4">{renderQuestionContent()}</div>

        {/* Hints section (if not answered and hints available) */}
        {!hasAnswered && scaffoldLevel >= 3 && (
          <ScaffoldedHints
            hints={hintsRevealed}
            availableCount={availableHints}
            onRequestHint={handleHintRequest}
            disabled={isSubmitting}
          />
        )}

        {/* Submit button */}
        {!hasAnswered && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Checking...
                </span>
              ) : (
                'Submit Answer'
              )}
            </Button>
          </div>
        )}

        {/* Feedback panel */}
        {hasAnswered && feedback && (
          <FeedbackPanel
            feedback={feedback}
            correctAnswer={question.correctAnswer}
            explanation={question.explanation}
          />
        )}

        {/* Post-answer worked example */}
        {hasAnswered && workedExample && feedback?.type !== 'correct' && (
          <WorkedExample content={workedExample} />
        )}
      </CardContent>
    </Card>
  )
}
