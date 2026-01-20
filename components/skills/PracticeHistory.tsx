'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'

interface PracticeAttempt {
  date: string
  isCorrect: boolean
  responseTimeMs?: number
  hintsUsed?: number
}

interface PracticeHistoryProps {
  attempts: PracticeAttempt[]
  className?: string
}

export function PracticeHistory({ attempts, className }: PracticeHistoryProps) {
  // Calculate stats
  const stats = useMemo(() => {
    if (attempts.length === 0) {
      return {
        total: 0,
        correct: 0,
        accuracy: 0,
        trend: 'neutral' as const,
        recentAccuracy: 0,
        averageResponseTime: 0,
        streak: 0,
      }
    }

    const correct = attempts.filter((a) => a.isCorrect).length
    const accuracy = (correct / attempts.length) * 100

    // Calculate recent accuracy (last 5 attempts)
    const recentAttempts = attempts.slice(-5)
    const recentCorrect = recentAttempts.filter((a) => a.isCorrect).length
    const recentAccuracy = (recentCorrect / recentAttempts.length) * 100

    // Calculate trend
    let trend: 'up' | 'down' | 'neutral' = 'neutral'
    if (attempts.length >= 5) {
      const olderAttempts = attempts.slice(-10, -5)
      if (olderAttempts.length >= 3) {
        const olderAccuracy =
          (olderAttempts.filter((a) => a.isCorrect).length / olderAttempts.length) * 100
        if (recentAccuracy > olderAccuracy + 10) trend = 'up'
        else if (recentAccuracy < olderAccuracy - 10) trend = 'down'
      }
    }

    // Calculate average response time
    const timesWithData = attempts.filter((a) => a.responseTimeMs)
    const averageResponseTime =
      timesWithData.length > 0
        ? timesWithData.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) /
          timesWithData.length
        : 0

    // Calculate current streak
    let streak = 0
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].isCorrect) streak++
      else break
    }

    return {
      total: attempts.length,
      correct,
      accuracy,
      trend,
      recentAccuracy,
      averageResponseTime,
      streak,
    }
  }, [attempts])

  // Group attempts by date for the chart
  const chartData = useMemo(() => {
    const byDate = new Map<string, { correct: number; total: number }>()

    attempts.forEach((attempt) => {
      const date = attempt.date.split('T')[0]
      const existing = byDate.get(date) || { correct: 0, total: 0 }
      existing.total++
      if (attempt.isCorrect) existing.correct++
      byDate.set(date, existing)
    })

    return Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        accuracy: (data.correct / data.total) * 100,
        attempts: data.total,
      }))
      .slice(-14) // Last 14 days
  }, [attempts])

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus

  if (attempts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No practice history yet</p>
          <p className="text-xs mt-1">Start practicing to see your progress</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Practice History
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-normal',
              stats.trend === 'up' && 'text-green-600',
              stats.trend === 'down' && 'text-red-600',
              stats.trend === 'neutral' && 'text-gray-500'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {stats.trend === 'up' ? 'Improving' : stats.trend === 'down' ? 'Needs work' : 'Stable'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Attempts</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{Math.round(stats.accuracy)}%</div>
            <div className="text-[10px] text-muted-foreground">Accuracy</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{stats.streak}</div>
            <div className="text-[10px] text-muted-foreground">Streak</div>
          </div>
        </div>

        {/* Mini Bar Chart */}
        {chartData.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Daily Accuracy (last 14 days)</p>
            <div className="flex items-end gap-0.5 h-16">
              {chartData.map((day, i) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-0.5"
                >
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      day.accuracy >= 80
                        ? 'bg-green-500'
                        : day.accuracy >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                    style={{ height: `${Math.max(4, day.accuracy * 0.6)}px` }}
                    title={`${day.date}: ${Math.round(day.accuracy)}% (${day.attempts} attempts)`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Attempts */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Recent Attempts</p>
          <div className="flex gap-1 flex-wrap">
            {attempts.slice(-20).map((attempt, i) => (
              <div
                key={i}
                className={cn(
                  'w-4 h-4 rounded-sm',
                  attempt.isCorrect ? 'bg-green-500' : 'bg-red-500'
                )}
                title={`${attempt.date}: ${attempt.isCorrect ? 'Correct' : 'Incorrect'}`}
              />
            ))}
          </div>
        </div>

        {/* Average Response Time */}
        {stats.averageResponseTime > 0 && (
          <p className="text-xs text-muted-foreground">
            Avg. response time: {(stats.averageResponseTime / 1000).toFixed(1)}s
          </p>
        )}
      </CardContent>
    </Card>
  )
}
