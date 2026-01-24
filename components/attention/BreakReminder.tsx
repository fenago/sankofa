'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Clock, Wind, Activity, Brain, Eye } from 'lucide-react'
import type { BreakType } from '@/lib/attention/microbreak-scheduler'
import { getBreakTypeName } from '@/lib/attention/break-content'

interface BreakReminderProps {
  urgency: 'suggested' | 'recommended' | 'strongly_recommended'
  suggestedBreakType: BreakType
  reason?: string
  onAccept: () => void
  onDismiss: () => void
  onSnooze: (minutes: number) => void
}

export function BreakReminder({
  urgency,
  suggestedBreakType,
  reason,
  onAccept,
  onDismiss,
  onSnooze,
}: BreakReminderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPulse, setShowPulse] = useState(urgency === 'strongly_recommended')

  // Pulse effect for strong recommendations
  useEffect(() => {
    if (urgency !== 'strongly_recommended') return

    const interval = setInterval(() => {
      setShowPulse(p => !p)
    }, 2000)

    return () => clearInterval(interval)
  }, [urgency])

  const getIcon = () => {
    switch (suggestedBreakType) {
      case 'breathing': return <Wind className="h-5 w-5" />
      case 'movement': return <Activity className="h-5 w-5" />
      case 'mindfulness': return <Brain className="h-5 w-5" />
      case 'gaze_shift': return <Eye className="h-5 w-5" />
    }
  }

  const urgencyStyles = {
    suggested: 'bg-blue-50 border-blue-200 text-blue-800',
    recommended: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    strongly_recommended: 'bg-orange-50 border-orange-200 text-orange-800',
  }

  const urgencyLabel = {
    suggested: 'Break Suggested',
    recommended: 'Break Recommended',
    strongly_recommended: 'Break Needed',
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-auto'
      }`}
    >
      <div
        className={`rounded-xl border shadow-lg overflow-hidden ${urgencyStyles[urgency]} ${
          showPulse ? 'ring-2 ring-orange-300 ring-opacity-50' : ''
        }`}
      >
        {/* Collapsed view */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 p-3 w-full hover:bg-white/30 transition-colors"
          >
            <div className="p-2 bg-white/50 rounded-full">
              {getIcon()}
            </div>
            <div className="text-left">
              <div className="font-medium text-sm">{urgencyLabel[urgency]}</div>
              <div className="text-xs opacity-75">Click to see options</div>
            </div>
          </button>
        )}

        {/* Expanded view */}
        {isExpanded && (
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/50 rounded-full">
                  {getIcon()}
                </div>
                <div>
                  <div className="font-semibold">{urgencyLabel[urgency]}</div>
                  <div className="text-sm opacity-75">
                    {getBreakTypeName(suggestedBreakType)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-1"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {reason && (
              <p className="text-sm opacity-75 mb-4">
                {reason}
              </p>
            )}

            <div className="space-y-2">
              <Button
                onClick={onAccept}
                className="w-full bg-white hover:bg-white/80 text-current"
              >
                Take a Break
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSnooze(5)}
                  className="flex-1 text-xs hover:bg-white/30"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  5 min
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSnooze(10)}
                  className="flex-1 text-xs hover:bg-white/30"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  10 min
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="flex-1 text-xs hover:bg-white/30"
                >
                  Not now
                </Button>
              </div>
            </div>

            {/* Benefits hint */}
            <p className="text-xs opacity-60 mt-3 text-center">
              Research shows brief breaks improve focus by up to 76%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BreakReminder
