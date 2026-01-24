'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Target, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { TransferSummary, TransferMetrics } from '@/lib/analytics/types'
import { formatPercentage } from '@/hooks/useLearningAnalytics'

interface TransferSuccessProps {
  data: TransferSummary
  showDetails?: boolean
}

export function TransferSuccess({ data, showDetails = true }: TransferSuccessProps) {
  const {
    averageTransferRatio,
    skillsWithGoodTransfer,
    skillsWithPoorTransfer,
    overallPracticeAccuracy,
    overallTransferAccuracy,
    skills,
  } = data

  const transferLevel = averageTransferRatio >= 0.9 ? 'excellent' :
    averageTransferRatio >= 0.7 ? 'good' :
    averageTransferRatio >= 0.5 ? 'moderate' : 'developing'

  const levelColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    developing: 'bg-orange-100 text-orange-800',
  }

  const levelDescriptions = {
    excellent: 'Strong ability to apply knowledge to new situations',
    good: 'Good transfer to novel problems',
    moderate: 'Some difficulty with unfamiliar contexts',
    developing: 'Focus on understanding underlying principles',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Transfer Success
            </CardTitle>
            <CardDescription>
              Applying knowledge to novel situations
            </CardDescription>
          </div>
          <Badge className={levelColors[transferLevel]}>
            {transferLevel.charAt(0).toUpperCase() + transferLevel.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Transfer ratio gauge */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Transfer Ratio</span>
            <span className="text-sm font-medium">
              {formatPercentage(averageTransferRatio)}
            </span>
          </div>
          <Progress value={Math.min(100, averageTransferRatio * 100)} className="h-3" />
          <p className="text-xs text-gray-500 mt-2">{levelDescriptions[transferLevel]}</p>
        </div>

        {/* Practice vs Transfer comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Target className="h-5 w-5 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(overallPracticeAccuracy)}
            </div>
            <div className="text-sm text-gray-500">Practice Accuracy</div>
            <div className="text-xs text-gray-400">Familiar problems</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Sparkles className="h-5 w-5 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(overallTransferAccuracy)}
            </div>
            <div className="text-sm text-gray-500">Transfer Accuracy</div>
            <div className="text-xs text-gray-400">Novel problems</div>
          </div>
        </div>

        {/* Good/Poor transfer summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">{skillsWithGoodTransfer.length}</div>
              <div className="text-xs text-green-600">Good transfer</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <div className="font-medium text-orange-800">{skillsWithPoorTransfer.length}</div>
              <div className="text-xs text-orange-600">Need deeper understanding</div>
            </div>
          </div>
        </div>

        {/* Skills breakdown */}
        {showDetails && skills.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Skill Transfer Breakdown</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {skills
                .filter(s => s.novelProblemCount > 0)
                .sort((a, b) => b.transferRatio - a.transferRatio)
                .slice(0, 8)
                .map((skill) => (
                  <TransferSkillRow key={skill.skillId} skill={skill} />
                ))}
            </div>
          </div>
        )}

        {skills.filter(s => s.novelProblemCount > 0).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transfer data available yet</p>
            <p className="text-sm">Practice varied problem types to measure transfer</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TransferSkillRow({ skill }: { skill: TransferMetrics }) {
  const transferQuality = skill.transferRatio >= 0.8 ? 'good' :
    skill.transferRatio >= 0.5 ? 'moderate' : 'poor'

  const qualityColors = {
    good: 'text-green-600',
    moderate: 'text-yellow-600',
    poor: 'text-red-600',
  }

  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{skill.skillName}</div>
        <div className="text-xs text-gray-500">
          {skill.novelProblemCount} novel problems attempted
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-gray-500">Practice</div>
          <div className="text-sm font-medium">{formatPercentage(skill.practiceAccuracy)}</div>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Transfer</div>
          <div className={`text-sm font-medium ${qualityColors[transferQuality]}`}>
            {formatPercentage(skill.transferAccuracy)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransferSuccess
