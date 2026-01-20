'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, AlertTriangle } from 'lucide-react'

interface AssessmentTimerProps {
  timeRemaining: number | null
  formattedTime: string | null
  onTimeUp?: () => void
  className?: string
}

export function AssessmentTimer({
  timeRemaining,
  formattedTime,
  onTimeUp,
  className,
}: AssessmentTimerProps) {
  const [isWarning, setIsWarning] = useState(false)
  const [isCritical, setIsCritical] = useState(false)

  useEffect(() => {
    if (timeRemaining === null) return

    // Warning at 5 minutes
    setIsWarning(timeRemaining <= 5 * 60 * 1000 && timeRemaining > 60 * 1000)
    // Critical at 1 minute
    setIsCritical(timeRemaining <= 60 * 1000)

    if (timeRemaining <= 0 && onTimeUp) {
      onTimeUp()
    }
  }, [timeRemaining, onTimeUp])

  if (timeRemaining === null || formattedTime === null) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-medium transition-colors',
        isCritical && 'bg-red-100 text-red-800 animate-pulse',
        isWarning && !isCritical && 'bg-amber-100 text-amber-800',
        !isWarning && !isCritical && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span>{formattedTime}</span>
      {isCritical && <span className="text-xs ml-1">remaining!</span>}
    </div>
  )
}
