'use client'

import { cn } from '@/lib/utils'

interface SkillMasteryGaugeProps {
  pMastery: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showThreshold?: boolean
  threshold?: number
  className?: string
}

export function SkillMasteryGauge({
  pMastery,
  size = 'md',
  showLabel = true,
  showThreshold = true,
  threshold = 0.8,
  className,
}: SkillMasteryGaugeProps) {
  const percentage = Math.round(pMastery * 100)
  const isMastered = pMastery >= threshold

  // Size configurations
  const sizeConfig = {
    sm: { outer: 80, stroke: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
    md: { outer: 120, stroke: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
    lg: { outer: 160, stroke: 10, fontSize: 'text-3xl', labelSize: 'text-base' },
  }

  const config = sizeConfig[size]
  const radius = (config.outer - config.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pMastery * circumference)

  // Color based on mastery level
  const getColor = () => {
    if (isMastered) return 'stroke-green-500'
    if (pMastery >= 0.6) return 'stroke-yellow-500'
    if (pMastery >= 0.3) return 'stroke-orange-500'
    return 'stroke-red-500'
  }

  const getBackgroundColor = () => {
    if (isMastered) return 'stroke-green-100'
    if (pMastery >= 0.6) return 'stroke-yellow-100'
    if (pMastery >= 0.3) return 'stroke-orange-100'
    return 'stroke-red-100'
  }

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg
        width={config.outer}
        height={config.outer}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          className={getBackgroundColor()}
        />

        {/* Threshold marker */}
        {showThreshold && (
          <circle
            cx={config.outer / 2}
            cy={config.outer / 2}
            r={radius}
            fill="none"
            strokeWidth={1}
            strokeDasharray={`${threshold * circumference} ${circumference}`}
            className="stroke-gray-400"
            strokeLinecap="round"
          />
        )}

        {/* Progress circle */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(getColor(), 'transition-all duration-500 ease-out')}
          strokeLinecap="round"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', config.fontSize)}>
          {percentage}%
        </span>
        {showLabel && (
          <span className={cn('text-muted-foreground', config.labelSize)}>
            {isMastered ? 'Mastered' : 'Mastery'}
          </span>
        )}
      </div>

      {/* Mastered badge */}
      {isMastered && (
        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
          <svg
            className={cn(
              size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
