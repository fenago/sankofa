'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, TrendingUp, Target, Clock } from 'lucide-react'
import type { CohortAnalytics } from '@/lib/analytics/types'
import { formatPercentage } from '@/hooks/useLearningAnalytics'

interface ClassProgressProps {
  data: CohortAnalytics
  showDetails?: boolean
}

export function ClassProgress({ data, showDetails = true }: ClassProgressProps) {
  const {
    studentCount,
    averageMastery,
    masteryDistribution,
    commonStruggleSpots,
    commonMisconceptions,
    studentsNeedingHelp,
  } = data

  // Calculate derived metrics from available data
  const highMasteryPercent = studentCount > 0 ? masteryDistribution.high / studentCount : 0

  const masteryLevel = averageMastery >= 0.8 ? 'excellent' :
    averageMastery >= 0.6 ? 'good' :
    averageMastery >= 0.4 ? 'moderate' : 'needs_attention'

  const masteryColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    needs_attention: 'bg-red-100 text-red-800',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Class Progress
            </CardTitle>
            <CardDescription>
              Overall class performance metrics
            </CardDescription>
          </div>
          <Badge className={masteryColors[masteryLevel]}>
            {formatPercentage(averageMastery)} mastery
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Student count */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{studentCount}</div>
              <div className="text-sm text-gray-500">Total Students</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-green-600">
              {formatPercentage(highMasteryPercent)}
            </div>
            <div className="text-sm text-gray-500">High Mastery</div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <MetricCard
            icon={<Target className="h-5 w-5 text-purple-500" />}
            label="Average Mastery"
            value={formatPercentage(averageMastery)}
            sublabel="Across all skills"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            label="Need Help"
            value={`${studentsNeedingHelp.length}`}
            sublabel="Students struggling"
          />
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Average Mastery</span>
            <span className="text-sm font-medium">{formatPercentage(averageMastery)}</span>
          </div>
          <Progress value={averageMastery * 100} className="h-3" />
        </div>

        {/* Mastery distribution */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Mastery Distribution</span>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold text-green-700">{masteryDistribution.high}</span>
              <span className="text-gray-500 ml-1">High</span>
            </div>
            <div>
              <span className="font-semibold text-yellow-700">{masteryDistribution.medium}</span>
              <span className="text-gray-500 ml-1">Medium</span>
            </div>
            <div>
              <span className="font-semibold text-red-700">{masteryDistribution.low}</span>
              <span className="text-gray-500 ml-1">Low</span>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-semibold">{studentsNeedingHelp.length}</div>
                <div className="text-xs text-gray-500">Need Help</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-semibold">{commonStruggleSpots.length}</div>
                <div className="text-xs text-gray-500">Struggle Spots</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-semibold">{commonMisconceptions.length}</div>
                <div className="text-xs text-gray-500">Misconceptions</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sublabel
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  )
}

export default ClassProgress
