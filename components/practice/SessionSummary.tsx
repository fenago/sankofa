'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Target,
  Clock,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionSummaryProps {
  answered: number
  correct: number
  totalHintsUsed: number
  skillName?: string
  masteryChange?: {
    before: number
    after: number
  }
  onContinue?: () => void
  onRestart?: () => void
  onExit?: () => void
}

export function SessionSummary({
  answered,
  correct,
  totalHintsUsed,
  skillName,
  masteryChange,
  onContinue,
  onRestart,
  onExit,
}: SessionSummaryProps) {
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0

  const getPerformanceMessage = (): { message: string; emoji: string } => {
    if (accuracy >= 90) {
      return { message: 'Outstanding! You really know this material!', emoji: '🏆' }
    }
    if (accuracy >= 70) {
      return { message: 'Great job! You\'re making solid progress.', emoji: '🌟' }
    }
    if (accuracy >= 50) {
      return { message: 'Good effort! Keep practicing to strengthen your understanding.', emoji: '💪' }
    }
    return { message: 'This topic needs more practice. Don\'t give up!', emoji: '📚' }
  }

  const performance = getPerformanceMessage()
  const masteryDelta = masteryChange
    ? Math.round((masteryChange.after - masteryChange.before) * 100)
    : 0

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="text-5xl mb-3" role="img" aria-label="Performance">
          {performance.emoji}
        </div>
        <CardTitle className="text-2xl">Session Complete!</CardTitle>
        <CardDescription className="text-base">
          {performance.message}
        </CardDescription>
        {skillName && (
          <p className="text-sm text-muted-foreground mt-2">
            Skill practiced: <span className="font-medium">{skillName}</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Target className="h-5 w-5 text-blue-500" />}
            label="Accuracy"
            value={`${accuracy}%`}
            subtext={`${correct}/${answered} correct`}
          />
          <StatCard
            icon={<Trophy className="h-5 w-5 text-amber-500" />}
            label="Score"
            value={correct.toString()}
            subtext="questions correct"
          />
          <StatCard
            icon={<Lightbulb className="h-5 w-5 text-purple-500" />}
            label="Hints Used"
            value={totalHintsUsed.toString()}
            subtext={totalHintsUsed === 0 ? 'nice work!' : 'hints requested'}
          />
        </div>

        {/* Accuracy Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Accuracy</span>
            <span className="font-medium">{accuracy}%</span>
          </div>
          <Progress
            value={accuracy}
            className={cn(
              'h-3',
              accuracy >= 70 ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'
            )}
          />
        </div>

        {/* Mastery Change */}
        {masteryChange && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mastery Progress</span>
              <div className="flex items-center gap-1">
                {masteryDelta > 0 ? (
                  <ChevronUp className="h-4 w-4 text-green-500" />
                ) : masteryDelta < 0 ? (
                  <ChevronDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span
                  className={cn(
                    'text-sm font-medium',
                    masteryDelta > 0 && 'text-green-600',
                    masteryDelta < 0 && 'text-red-600'
                  )}
                >
                  {masteryDelta > 0 ? '+' : ''}{masteryDelta}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress
                  value={masteryChange.after * 100}
                  className="h-2"
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round(masteryChange.after * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {masteryChange.after >= 0.8
                ? 'You\'ve achieved mastery!'
                : `${Math.round((0.8 - masteryChange.after) * 100)}% more to mastery`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onContinue && (
            <Button onClick={onContinue} className="flex-1">
              Continue Learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {onRestart && (
            <Button variant="outline" onClick={onRestart} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Practice Again
            </Button>
          )}
          {onExit && (
            <Button variant="ghost" onClick={onExit}>
              Exit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  )
}
