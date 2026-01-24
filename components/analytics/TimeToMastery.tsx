'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap, TrendingUp, Award } from 'lucide-react'
import type { TimeToMasterySummary, TimeToMasteryMetrics } from '@/lib/analytics/types'
import { formatDuration } from '@/hooks/useLearningAnalytics'

interface TimeToMasteryProps {
  data: TimeToMasterySummary
  showDetails?: boolean
}

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

export function TimeToMastery({ data, showDetails = true }: TimeToMasteryProps) {
  const {
    averageTimeToMastery,
    medianTimeToMastery,
    fastestSkill,
    slowestSkill,
    byBloomLevel,
    skills,
  } = data

  const masteredCount = skills.filter(s => s.masteredAt !== null).length
  const totalCount = skills.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time to Mastery
            </CardTitle>
            <CardDescription>
              How efficiently you're learning skills
            </CardDescription>
          </div>
          <Badge variant="outline">
            {masteredCount}/{totalCount} mastered
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(averageTimeToMastery)}
            </div>
            <div className="text-sm text-gray-500">Average Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(medianTimeToMastery)}
            </div>
            <div className="text-sm text-gray-500">Median Time</div>
          </div>
        </div>

        {/* Fastest/Slowest */}
        {(fastestSkill || slowestSkill) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {fastestSkill && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Fastest</span>
                </div>
                <div className="text-sm font-medium truncate">{fastestSkill.skillName}</div>
                <div className="text-xs text-green-600">
                  {fastestSkill.attemptCount} attempts, {Math.round(fastestSkill.efficiency * 100)}% efficiency
                </div>
              </div>
            )}
            {slowestSkill && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">Most Effort</span>
                </div>
                <div className="text-sm font-medium truncate">{slowestSkill.skillName}</div>
                <div className="text-xs text-orange-600">
                  {slowestSkill.attemptCount} attempts
                </div>
              </div>
            )}
          </div>
        )}

        {/* By Bloom Level */}
        {Object.keys(byBloomLevel).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">By Cognitive Level</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(byBloomLevel).map(([level, avgTime]) => (
                <div key={level} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-sm font-medium">{formatDuration(avgTime)}</div>
                  <div className="text-xs text-gray-500">{BLOOM_LABELS[parseInt(level)]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills in progress */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Skills in Progress</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {skills
                .filter(s => s.masteredAt === null && s.attemptCount > 0)
                .slice(0, 5)
                .map((skill) => (
                  <SkillProgressRow key={skill.skillId} skill={skill} />
                ))}
              {skills.filter(s => s.masteredAt === null && s.attemptCount > 0).length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  All attempted skills have been mastered!
                </div>
              )}
            </div>
          </div>
        )}

        {skills.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No mastery data available yet</p>
            <p className="text-sm">Start practicing to track your progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SkillProgressRow({ skill }: { skill: TimeToMasteryMetrics }) {
  const efficiencyLabel = skill.efficiency >= 1 ? 'On track' :
    skill.efficiency >= 0.7 ? 'Slight delay' : 'Needs focus'
  const efficiencyColor = skill.efficiency >= 1 ? 'text-green-600' :
    skill.efficiency >= 0.7 ? 'text-yellow-600' : 'text-orange-600'

  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{skill.skillName}</div>
        <div className="text-xs text-gray-500">
          {skill.attemptCount} attempts · {formatDuration(skill.totalPracticeTime)} practiced
        </div>
      </div>
      <div className={`text-xs font-medium ${efficiencyColor}`}>
        {efficiencyLabel}
      </div>
    </div>
  )
}

export default TimeToMastery
