'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns'

interface NextReviewProps {
  nextReviewAt?: string | Date | null
  lastReviewAt?: string | Date | null
  reviewCount?: number
  easinessFactor?: number
  className?: string
}

export function NextReview({
  nextReviewAt,
  lastReviewAt,
  reviewCount = 0,
  easinessFactor = 2.5,
  className,
}: NextReviewProps) {
  const reviewDate = nextReviewAt ? new Date(nextReviewAt) : null
  const lastDate = lastReviewAt ? new Date(lastReviewAt) : null

  const status = useMemo(() => {
    if (!reviewDate) {
      return {
        label: 'Not Scheduled',
        color: 'bg-gray-100 text-gray-700',
        icon: Calendar,
        description: 'Complete a practice session to schedule a review',
        urgency: 'none' as const,
      }
    }

    if (isPast(reviewDate)) {
      const overdueBy = formatDistanceToNow(reviewDate, { addSuffix: false })
      return {
        label: 'Overdue',
        color: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        description: `Review was due ${overdueBy} ago`,
        urgency: 'high' as const,
      }
    }

    if (isToday(reviewDate)) {
      return {
        label: 'Due Today',
        color: 'bg-amber-100 text-amber-700',
        icon: Clock,
        description: 'Review is scheduled for today',
        urgency: 'medium' as const,
      }
    }

    if (isTomorrow(reviewDate)) {
      return {
        label: 'Due Tomorrow',
        color: 'bg-yellow-100 text-yellow-700',
        icon: Calendar,
        description: 'Review is scheduled for tomorrow',
        urgency: 'low' as const,
      }
    }

    const timeUntil = formatDistanceToNow(reviewDate, { addSuffix: true })
    return {
      label: `Due ${timeUntil}`,
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
      description: `Next review on ${format(reviewDate, 'MMM d, yyyy')}`,
      urgency: 'none' as const,
    }
  }, [reviewDate])

  const StatusIcon = status.icon

  // Calculate SM-2 quality indicator
  const qualityLabel = useMemo(() => {
    if (easinessFactor >= 2.5) return { label: 'Easy', color: 'text-green-600' }
    if (easinessFactor >= 2.0) return { label: 'Moderate', color: 'text-yellow-600' }
    if (easinessFactor >= 1.5) return { label: 'Challenging', color: 'text-orange-600' }
    return { label: 'Difficult', color: 'text-red-600' }
  }, [easinessFactor])

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Status Banner */}
      <div className={cn('px-4 py-2 flex items-center justify-between', status.color)}>
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          <span className="font-medium text-sm">{status.label}</span>
        </div>
        {status.urgency === 'high' && (
          <Badge variant="destructive" className="text-xs">
            Action Required
          </Badge>
        )}
      </div>

      <CardContent className="pt-4 space-y-3">
        <p className="text-sm text-muted-foreground">{status.description}</p>

        {/* Review Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{reviewCount}</div>
            <div className="text-[10px] text-muted-foreground">Total Reviews</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className={cn('text-lg font-bold', qualityLabel.color)}>
              {qualityLabel.label}
            </div>
            <div className="text-[10px] text-muted-foreground">Retention</div>
          </div>
        </div>

        {/* Last Review */}
        {lastDate && (
          <p className="text-xs text-muted-foreground">
            Last reviewed {formatDistanceToNow(lastDate, { addSuffix: true })}
          </p>
        )}

        {/* SM-2 Info */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          <p>
            Spaced repetition interval based on your performance history.
            {easinessFactor < 2.0 && ' Consider more focused practice.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
