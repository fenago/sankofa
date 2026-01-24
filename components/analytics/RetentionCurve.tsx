'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { RetentionSummary, RetentionMetrics } from '@/lib/analytics/types'
import { formatPercentage } from '@/hooks/useLearningAnalytics'

interface RetentionCurveProps {
  data: RetentionSummary
  showDetails?: boolean
}

export function RetentionCurve({ data, showDetails = true }: RetentionCurveProps) {
  const {
    averageRetention,
    skillsNeedingReview,
    wellRetainedSkills,
    forgettingCurveData,
  } = data

  const retentionLevel = averageRetention >= 0.9 ? 'excellent' :
    averageRetention >= 0.7 ? 'good' :
    averageRetention >= 0.5 ? 'moderate' : 'needs_attention'

  const retentionColors = {
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
              <Brain className="h-5 w-5" />
              Knowledge Retention
            </CardTitle>
            <CardDescription>
              How well you're maintaining learned skills
            </CardDescription>
          </div>
          <Badge className={retentionColors[retentionLevel]}>
            {formatPercentage(averageRetention)} retained
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main retention gauge */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Overall Retention</span>
            <span className="text-sm font-medium">{formatPercentage(averageRetention)}</span>
          </div>
          <Progress value={averageRetention * 100} className="h-3" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">{wellRetainedSkills.length}</div>
              <div className="text-xs text-green-600">Well retained</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <div className="font-medium text-orange-800">{skillsNeedingReview.length}</div>
              <div className="text-xs text-orange-600">Need review</div>
            </div>
          </div>
        </div>

        {/* Forgetting curve visualization */}
        {forgettingCurveData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Retention Over Time</h4>
            <div className="h-24 flex items-end gap-1">
              {forgettingCurveData.slice(0, 12).map((point, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-200 hover:bg-blue-300 transition-colors rounded-t"
                  style={{ height: `${point.averageRetention * 100}%` }}
                  title={`Day ${point.daysAgo}: ${formatPercentage(point.averageRetention)}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Recent</span>
              <span>Older →</span>
            </div>
          </div>
        )}

        {/* Skills needing review */}
        {showDetails && skillsNeedingReview.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Skills Needing Review
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {skillsNeedingReview.slice(0, 5).map((skill) => (
                <RetentionSkillRow key={skill.skillId} skill={skill} />
              ))}
              {skillsNeedingReview.length > 5 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  +{skillsNeedingReview.length - 5} more skills need review
                </div>
              )}
            </div>
          </div>
        )}

        {skillsNeedingReview.length === 0 && wellRetainedSkills.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No retention data available yet</p>
            <p className="text-sm">Practice and review skills to track retention</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RetentionSkillRow({ skill }: { skill: RetentionMetrics }) {
  const riskLevel = skill.retentionRate < 0.6 ? 'high' :
    skill.retentionRate < 0.8 ? 'medium' : 'low'

  const riskColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-orange-600 bg-orange-50',
    low: 'text-yellow-600 bg-yellow-50',
  }

  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{skill.skillName}</div>
        <div className="text-xs text-gray-500">
          {skill.daysSinceLastPractice} days since practice
          {skill.reviewsMissed > 0 && ` · ${skill.reviewsMissed} missed reviews`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={skill.retentionRate * 100} className="w-16 h-2" />
        <span className="text-xs font-medium w-10 text-right">
          {formatPercentage(skill.retentionRate)}
        </span>
      </div>
    </div>
  )
}

export default RetentionCurve
