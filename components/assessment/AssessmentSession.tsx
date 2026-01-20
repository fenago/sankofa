'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Send, Save, X } from 'lucide-react'
import { AssessmentTimer } from './AssessmentTimer'
import { QuestionNavigator } from './QuestionNavigator'
import {
  MultipleChoiceQuestion,
  FreeResponseQuestion,
  TrueFalseQuestion,
  FillBlankQuestion,
} from '@/components/practice'
import { cn } from '@/lib/utils'
import type { AssessmentQuestion } from '@/hooks/useAssessment'

interface AssessmentSessionProps {
  questions: AssessmentQuestion[]
  currentIndex: number
  currentQuestion: AssessmentQuestion | null
  answers: Record<string, string>
  timeRemaining: number | null
  formattedTimeRemaining: string | null
  progress: number
  isComplete: boolean
  isSubmitting: boolean
  onSetAnswer: (questionId: string, answer: string) => void
  onNavigateTo: (index: number) => void
  onNext: () => void
  onPrev: () => void
  onSaveProgress: () => void
  onSubmit: () => void
  onAbandon: () => void
}

export function AssessmentSession({
  questions,
  currentIndex,
  currentQuestion,
  answers,
  timeRemaining,
  formattedTimeRemaining,
  progress,
  isComplete,
  isSubmitting,
  onSetAnswer,
  onNavigateTo,
  onNext,
  onPrev,
  onSaveProgress,
  onSubmit,
  onAbandon,
}: AssessmentSessionProps) {
  const answeredQuestions = new Set(Object.keys(answers))
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : ''

  const handleAnswerChange = (value: string) => {
    if (currentQuestion) {
      onSetAnswer(currentQuestion.id, value)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Timer and Progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <Progress value={progress} className="w-32 h-2" />
        </div>
        <div className="flex items-center gap-3">
          {timeRemaining !== null && (
            <AssessmentTimer
              timeRemaining={timeRemaining}
              formattedTime={formattedTimeRemaining}
            />
          )}
          <Button variant="outline" size="sm" onClick={onSaveProgress}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Question Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question {currentIndex + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion && (
                <>
                  {/* Question Text */}
                  <p className="text-lg">{currentQuestion.question}</p>

                  {/* Answer Input */}
                  <div className="py-4">
                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                      <MultipleChoiceQuestion
                        options={currentQuestion.options}
                        value={currentAnswer}
                        onChange={handleAnswerChange}
                      />
                    )}
                    {currentQuestion.type === 'true_false' && (
                      <TrueFalseQuestion
                        value={currentAnswer}
                        onChange={handleAnswerChange}
                      />
                    )}
                    {currentQuestion.type === 'free_response' && (
                      <FreeResponseQuestion
                        value={currentAnswer}
                        onChange={handleAnswerChange}
                        placeholder="Type your answer here..."
                      />
                    )}
                    {currentQuestion.type === 'fill_blank' && (
                      <FillBlankQuestion
                        questionText={currentQuestion.question}
                        value={currentAnswer}
                        onChange={handleAnswerChange}
                      />
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={onPrev}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {currentIndex < questions.length - 1 ? (
                        <Button onClick={onNext}>
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          onClick={onSubmit}
                          disabled={!isComplete || isSubmitting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit Assessment
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Question Navigator Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <QuestionNavigator
                totalQuestions={questions.length}
                currentIndex={currentIndex}
                answeredQuestions={answeredQuestions}
                questionIds={questions.map((q) => q.id)}
                onNavigate={onNavigateTo}
              />
            </CardContent>
          </Card>

          {/* Submit/Abandon Card */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Button
                onClick={onSubmit}
                disabled={!isComplete || isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {isComplete ? 'Submit Assessment' : `${answeredQuestions.size}/${questions.length} Answered`}
              </Button>
              <Button
                variant="ghost"
                onClick={onAbandon}
                className="w-full text-muted-foreground hover:text-red-600"
              >
                <X className="h-4 w-4 mr-2" />
                Abandon Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
