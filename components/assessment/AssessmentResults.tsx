'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssessmentResults as AssessmentResultsType, Assessment, AssessmentQuestion } from '@/hooks/useAssessment'

interface AssessmentResultsProps {
  assessment: Assessment
  questions: AssessmentQuestion[]
  results: AssessmentResultsType
  onReview?: () => void
  onRetry?: () => void
  onExit?: () => void
}

export function AssessmentResults({
  assessment,
  questions,
  results,
  onReview,
  onRetry,
  onExit,
}: AssessmentResultsProps) {
  const percentage = results.percentage
  const passed = percentage >= 70

  // Get performance message
  const getPerformanceMessage = () => {
    if (percentage >= 90) return { message: 'Excellent work!', emoji: '🏆', color: 'text-green-600' }
    if (percentage >= 80) return { message: 'Great job!', emoji: '🌟', color: 'text-green-600' }
    if (percentage >= 70) return { message: 'Good effort!', emoji: '👍', color: 'text-yellow-600' }
    if (percentage >= 50) return { message: 'Keep practicing!', emoji: '💪', color: 'text-orange-600' }
    return { message: 'More study needed', emoji: '📚', color: 'text-red-600' }
  }

  const performance = getPerformanceMessage()

  // Sort skills by performance
  const skillResultsArray = Object.entries(results.skillResults)
    .map(([skillId, data]) => ({
      skillId,
      ...data,
      percentage: Math.round((data.correct / data.total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)

  const strongSkills = skillResultsArray.filter((s) => s.percentage >= 70)
  const weakSkills = skillResultsArray.filter((s) => s.percentage < 70)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Main Score Card */}
      <Card className="text-center">
        <CardHeader className="pb-2">
          <div className="text-6xl mb-4">{performance.emoji}</div>
          <CardTitle className="text-2xl">{assessment.title} Complete!</CardTitle>
          <CardDescription className={cn('text-lg', performance.color)}>
            {performance.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={cn('text-5xl font-bold', passed ? 'text-green-600' : 'text-orange-600')}>
                {percentage}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
            </div>
            <div className="h-16 w-px bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold">
                {results.score}/{results.maxScore}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Correct Answers</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 max-w-md mx-auto">
            <Progress
              value={percentage}
              className={cn('h-4', percentage >= 70 ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-500')}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium">Passing: 70%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Pass/Fail Badge */}
          <Badge
            variant={passed ? 'default' : 'secondary'}
            className={cn('text-sm px-4 py-1', passed && 'bg-green-600')}
          >
            {passed ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Passed
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Needs Improvement
              </>
            )}
          </Badge>
        </CardContent>
      </Card>

      {/* Skill Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card className={strongSkills.length > 0 ? 'border-green-200 bg-green-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <TrendingUp className="h-4 w-4" />
              Strengths ({strongSkills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strongSkills.length > 0 ? (
              <ul className="space-y-2">
                {strongSkills.slice(0, 5).map((skill) => (
                  <li key={skill.skillId} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{skill.skillId}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {skill.correct}/{skill.total}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Keep practicing to build strengths
              </p>
            )}
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card className={weakSkills.length > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
              <TrendingDown className="h-4 w-4" />
              Areas to Improve ({weakSkills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakSkills.length > 0 ? (
              <ul className="space-y-2">
                {weakSkills.slice(0, 5).map((skill) => (
                  <li key={skill.skillId} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{skill.skillId}</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {skill.correct}/{skill.total}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Great job - no weak areas!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {weakSkills.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Recommended Next Steps</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Focus your practice on the areas marked for improvement.
                  Use the practice mode to strengthen these skills before retaking the assessment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onReview && (
          <Button variant="outline" onClick={onReview}>
            <BookOpen className="h-4 w-4 mr-2" />
            Review Answers
          </Button>
        )}
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Take Again
          </Button>
        )}
        {onExit && (
          <Button onClick={onExit}>
            Continue Learning
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
