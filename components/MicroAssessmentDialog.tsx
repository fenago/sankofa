'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckCircle2, Brain, Lightbulb, AlertCircle } from 'lucide-react'
import type { MicroAssessmentQuestion, MicroAssessmentResult } from '@/lib/adaptive/micro-assessment-service'

interface MicroAssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentTypeName: string
  assessmentTypeDescription: string
  questions: MicroAssessmentQuestion[]
  onComplete: (results: MicroAssessmentResult[]) => void
  onSkip?: () => void
}

export function MicroAssessmentDialog({
  open,
  onOpenChange,
  assessmentTypeName,
  assessmentTypeDescription,
  questions,
  onComplete,
  onSkip,
}: MicroAssessmentDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Map<string, { value: string | number; startTime: number }>>(new Map())
  const [isComplete, setIsComplete] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleResponse = useCallback((questionId: string, value: string | number) => {
    const existing = responses.get(questionId)
    setResponses(prev => {
      const newMap = new Map(prev)
      newMap.set(questionId, {
        value,
        startTime: existing?.startTime || Date.now(),
      })
      return newMap
    })
  }, [responses])

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // Complete the assessment
      const results: MicroAssessmentResult[] = questions.map(q => {
        const response = responses.get(q.id)
        return {
          questionId: q.id,
          type: q.type,
          response: response?.value ?? '',
          responseTimeMs: response?.startTime ? Date.now() - response.startTime : 0,
          timestamp: new Date().toISOString(),
          frameworkTarget: q.frameworkTarget,
          skillId: q.skillId,
        }
      })
      setIsComplete(true)
      onComplete(results)
    }
  }, [currentQuestionIndex, questions, responses, onComplete])

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip()
    }
    onOpenChange(false)
  }, [onSkip, onOpenChange])

  const currentResponse = currentQuestion ? responses.get(currentQuestion.id) : null
  const hasResponse = currentResponse && currentResponse.value !== '' && currentResponse.value !== undefined

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setCurrentQuestionIndex(0)
      setResponses(new Map())
      setIsComplete(false)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  if (!currentQuestion && !isComplete) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <DialogTitle>{assessmentTypeName}</DialogTitle>
          </div>
          <DialogDescription>{assessmentTypeDescription}</DialogDescription>
        </DialogHeader>

        {isComplete ? (
          <div className="flex flex-col items-center py-6 gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-muted-foreground">
              Thanks for your responses! This helps us personalize your learning experience.
            </p>
            <Button onClick={() => handleOpenChange(false)}>Continue Learning</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="space-y-4 py-4">
              <p className="font-medium">{currentQuestion.question}</p>

              {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
                <RadioGroup
                  value={currentResponse?.value as string || ''}
                  onValueChange={(value) => handleResponse(currentQuestion.id, value)}
                >
                  {currentQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.questionType === 'scale' && (
                <div className="space-y-4">
                  <Slider
                    min={currentQuestion.scaleMin || 1}
                    max={currentQuestion.scaleMax || 5}
                    step={1}
                    value={[currentResponse?.value as number || (currentQuestion.scaleMin || 1)]}
                    onValueChange={([value]) => handleResponse(currentQuestion.id, value)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{currentQuestion.scaleLabels?.min || 'Low'}</span>
                    <span className="font-medium text-foreground">
                      {currentResponse?.value || '-'}
                    </span>
                    <span>{currentQuestion.scaleLabels?.max || 'High'}</span>
                  </div>
                </div>
              )}

              {currentQuestion.questionType === 'yes_no' && (
                <RadioGroup
                  value={currentResponse?.value as string || ''}
                  onValueChange={(value) => handleResponse(currentQuestion.id, value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes" />
                    <Label htmlFor="yes" className="cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" />
                    <Label htmlFor="no" className="cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              )}

              {currentQuestion.questionType === 'open_ended' && (
                <Textarea
                  placeholder="Type your response..."
                  value={currentResponse?.value as string || ''}
                  onChange={(e) => handleResponse(currentQuestion.id, e.target.value)}
                  rows={3}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button onClick={handleNext} disabled={!hasResponse}>
                {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Complete'}
              </Button>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Your responses help us adapt the difficulty and content to your learning style.</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
