'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Lightbulb,
  Send,
  Clock,
  Brain,
  Sparkles,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react'
import type {
  ExplorationProblem,
  ExplorationSession,
  ExplorationAttempt,
} from '@/lib/practice/productive-failure'

interface ExploreFirstModeProps {
  problem: ExplorationProblem
  session: ExplorationSession
  onSubmitAttempt: (content: string) => Promise<void>
  onRequestHint: () => void
  onEndExploration: () => void
  scaffoldingMessage?: string
  scaffoldingLevel: 0 | 1 | 2 | 3
  isSubmitting?: boolean
}

export function ExploreFirstMode({
  problem,
  session,
  onSubmitAttempt,
  onRequestHint,
  onEndExploration,
  scaffoldingMessage,
  scaffoldingLevel,
  isSubmitting = false,
}: ExploreFirstModeProps) {
  const [attemptContent, setAttemptContent] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - session.startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [session.startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = useCallback(async () => {
    if (!attemptContent.trim()) return
    await onSubmitAttempt(attemptContent)
    setAttemptContent('')
  }, [attemptContent, onSubmitAttempt])

  const attemptsRemaining = problem.maxAttempts - session.attempts.length
  const progressPercent = (session.attempts.length / problem.maxAttempts) * 100

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Explore First</h2>
            <p className="text-sm text-muted-foreground">
              Try to solve this before learning the formal method
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(elapsedTime)}
          </Badge>
          <Badge variant="secondary">
            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Exploration progress</span>
          <span>{session.attempts.length} / {problem.maxAttempts} attempts</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Problem Card */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            Challenge: {problem.skillName}
          </CardTitle>
          {problem.context && (
            <CardDescription className="text-purple-700">
              {problem.context}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">{problem.problem}</p>
          </div>
        </CardContent>
      </Card>

      {/* Scaffolding Message */}
      {scaffoldingMessage && scaffoldingLevel > 0 && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          scaffoldingLevel === 1 ? 'bg-blue-50 border border-blue-200' :
          scaffoldingLevel === 2 ? 'bg-yellow-50 border border-yellow-200' :
          'bg-orange-50 border border-orange-200'
        }`}>
          {scaffoldingLevel === 3 ? (
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          ) : (
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              scaffoldingLevel === 1 ? 'text-blue-800' :
              scaffoldingLevel === 2 ? 'text-yellow-800' :
              'text-orange-800'
            }`}>
              {scaffoldingMessage}
            </p>
          </div>
        </div>
      )}

      {/* Previous Attempts */}
      {session.attempts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Your Exploration So Far
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {session.attempts.map((attempt, index) => (
              <AttemptPreview key={attempt.id} attempt={attempt} index={index} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Attempt Input */}
      {attemptsRemaining > 0 && !session.readyForConsolidation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Attempt #{session.attempts.length + 1}
            </CardTitle>
            <CardDescription>
              Try to solve the problem. There's no "wrong" answer in exploration!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Explain your approach and reasoning..."
              value={attemptContent}
              onChange={(e) => setAttemptContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRequestHint}
              disabled={scaffoldingLevel >= 2}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Need a hint?
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!attemptContent.trim() || isSubmitting}
            >
              {isSubmitting ? (
                'Analyzing...'
              ) : (
                <>
                  Submit Attempt
                  <Send className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Ready for Consolidation */}
      {session.readyForConsolidation && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 bg-green-100 rounded-full">
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-green-800">
                  Great exploration!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  You've built valuable mental scaffolding. Now let's see how the pieces connect.
                </p>
              </div>
              <Button onClick={onEndExploration} className="bg-green-600 hover:bg-green-700">
                See the Solution
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productive Struggle Indicator */}
      {session.attempts.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Productive Struggle Score</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={session.productiveStruggleScore * 100} className="w-24 h-2" />
            <span className="text-sm text-muted-foreground">
              {(session.productiveStruggleScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function AttemptPreview({ attempt, index }: { attempt: ExplorationAttempt; index: number }) {
  const categoryColors: Record<string, string> = {
    correct: 'bg-green-100 text-green-700',
    partial_correct: 'bg-blue-100 text-blue-700',
    creative_wrong: 'bg-purple-100 text-purple-700',
    common_misconception: 'bg-yellow-100 text-yellow-700',
    off_track: 'bg-gray-100 text-gray-700',
    incomplete: 'bg-gray-100 text-gray-700',
  }

  const categoryLabels: Record<string, string> = {
    correct: 'Got it!',
    partial_correct: 'Getting close',
    creative_wrong: 'Creative approach',
    common_misconception: 'Common thinking',
    off_track: 'Different direction',
    incomplete: 'Starting point',
  }

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Attempt {index + 1}</span>
        <Badge className={categoryColors[attempt.category]}>
          {categoryLabels[attempt.category]}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {attempt.content}
      </p>
      {attempt.partialUnderstanding.length > 0 && (
        <p className="text-xs text-green-600">
          Good thinking: {attempt.partialUnderstanding[0]}
        </p>
      )}
    </div>
  )
}

export default ExploreFirstMode
