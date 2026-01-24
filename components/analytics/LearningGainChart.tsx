'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react'
import type { OverallLearningGain, LearningGain } from '@/lib/analytics/types'
import { formatPercentage, interpretGain } from '@/hooks/useLearningAnalytics'

interface LearningGainChartProps {
  data: OverallLearningGain
  showDetails?: boolean
}

export function LearningGainChart({ data, showDetails = true }: LearningGainChartProps) {
  const { averageNormalizedGain, averageAbsoluteGain, highGainSkills, lowGainSkills, gains } = data

  const interpretation = interpretGain(averageNormalizedGain)

  // Sort gains for display
  const sortedGains = useMemo(() => {
    return [...gains].sort((a, b) => b.normalizedGain - a.normalizedGain)
  }, [gains])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Learning Gains
            </CardTitle>
            <CardDescription>
              How much you've improved (normalized gain)
            </CardDescription>
          </div>
          <Badge className={interpretation.color}>
            {interpretation.label} Gain
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">
              {formatPercentage(averageNormalizedGain)}
            </div>
            <div className="text-sm text-gray-500">Normalized Gain</div>
            <div className="text-xs text-gray-400 mt-1">
              (post - pre) / (1 - pre)
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">
              +{formatPercentage(averageAbsoluteGain)}
            </div>
            <div className="text-sm text-gray-500">Absolute Gain</div>
            <div className="text-xs text-gray-400 mt-1">
              post - pre
            </div>
          </div>
        </div>

        {/* High/Low gain summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Award className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">{highGainSkills.length}</div>
              <div className="text-xs text-green-600">High gain skills</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            <div>
              <div className="font-medium text-orange-800">{lowGainSkills.length}</div>
              <div className="text-xs text-orange-600">Low gain skills</div>
            </div>
          </div>
        </div>

        {/* Skill breakdown */}
        {showDetails && sortedGains.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Skill Breakdown</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedGains.map((gain) => (
                <SkillGainRow key={gain.skillId} gain={gain} />
              ))}
            </div>
          </div>
        )}

        {gains.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Minus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No learning gain data available yet</p>
            <p className="text-sm">Complete practice sessions to see your progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SkillGainRow({ gain }: { gain: LearningGain }) {
  const interpretation = interpretGain(gain.normalizedGain)
  const progressValue = Math.max(0, Math.min(100, gain.normalizedGain * 100))

  return (
    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{gain.skillName}</div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progressValue} className="h-2 flex-1" />
          <span className="text-xs text-gray-500 w-12 text-right">
            {formatPercentage(gain.normalizedGain)}
          </span>
        </div>
      </div>
      <GainTrendIcon gain={gain.normalizedGain} />
    </div>
  )
}

function GainTrendIcon({ gain }: { gain: number }) {
  if (gain >= 0.3) {
    return <TrendingUp className="h-4 w-4 text-green-500" />
  }
  if (gain >= 0) {
    return <Minus className="h-4 w-4 text-gray-400" />
  }
  return <TrendingDown className="h-4 w-4 text-red-500" />
}

export default LearningGainChart
