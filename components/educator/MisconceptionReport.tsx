'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Users, BookOpen, Lightbulb, Target } from 'lucide-react'
import { formatPercentage } from '@/hooks/useLearningAnalytics'

interface Misconception {
  id: string
  skillId: string
  skillName: string
  misconception: string
  frequency: number // 0-1, percentage of students affected
  studentCount: number
  correctUnderstanding?: string
  suggestedIntervention?: string
  relatedMisconceptions?: string[]
}

interface MisconceptionReportProps {
  misconceptions: Misconception[]
  totalStudents: number
  showInterventions?: boolean
}

export function MisconceptionReport({
  misconceptions,
  totalStudents,
  showInterventions = true
}: MisconceptionReportProps) {
  const sortedMisconceptions = [...misconceptions].sort((a, b) => b.frequency - a.frequency)

  const getSeverity = (frequency: number) => {
    if (frequency >= 0.5) return 'widespread'
    if (frequency >= 0.25) return 'common'
    if (frequency >= 0.1) return 'moderate'
    return 'isolated'
  }

  const severityColors = {
    widespread: 'bg-red-100 text-red-800 border-red-200',
    common: 'bg-orange-100 text-orange-800 border-orange-200',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    isolated: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const severityDescriptions = {
    widespread: 'Affects majority of class - consider whole-class reteaching',
    common: 'Significant portion affected - address proactively',
    moderate: 'Some students affected - target in small groups',
    isolated: 'Few students affected - individual support recommended',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Misconception Report
            </CardTitle>
            <CardDescription>
              Common misunderstandings detected across the class
            </CardDescription>
          </div>
          <Badge variant="outline">
            {misconceptions.length} detected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {misconceptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No common misconceptions detected</p>
            <p className="text-sm">Continue monitoring as students progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {sortedMisconceptions.filter(m => m.frequency >= 0.5).length}
                </div>
                <div className="text-xs text-gray-500">Widespread</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {sortedMisconceptions.filter(m => m.frequency >= 0.25 && m.frequency < 0.5).length}
                </div>
                <div className="text-xs text-gray-500">Common</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {sortedMisconceptions.filter(m => m.frequency < 0.25).length}
                </div>
                <div className="text-xs text-gray-500">Isolated</div>
              </div>
            </div>

            {/* Misconception list */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {sortedMisconceptions.slice(0, 8).map((misconception) => {
                const severity = getSeverity(misconception.frequency)

                return (
                  <div
                    key={misconception.id}
                    className={`p-4 rounded-lg border ${severityColors[severity]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {misconception.skillName}
                          </Badge>
                          <Badge className={severityColors[severity]}>
                            {severity}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{misconception.misconception}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {misconception.studentCount} students ({formatPercentage(misconception.frequency)})
                        </span>
                      </div>
                      <Progress
                        value={misconception.frequency * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2 text-sm">
                      {misconception.correctUnderstanding && (
                        <div className="flex items-start gap-2 p-2 bg-green-50/50 rounded">
                          <Target className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-medium text-green-700">Correct Understanding:</div>
                            <div className="text-green-800">{misconception.correctUnderstanding}</div>
                          </div>
                        </div>
                      )}

                      {showInterventions && misconception.suggestedIntervention && (
                        <div className="flex items-start gap-2 p-2 bg-blue-50/50 rounded">
                          <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-medium text-blue-700">Suggested Intervention:</div>
                            <div className="text-blue-800">{misconception.suggestedIntervention}</div>
                          </div>
                        </div>
                      )}

                      {misconception.relatedMisconceptions && misconception.relatedMisconceptions.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Related: {misconception.relatedMisconceptions.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {misconceptions.length > 8 && (
              <div className="text-center text-sm text-gray-500 pt-2">
                +{misconceptions.length - 8} more misconceptions
              </div>
            )}

            {/* Interpretation guide */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Severity Guide</h4>
              <div className="space-y-1 text-xs">
                {Object.entries(severityDescriptions).map(([key, desc]) => (
                  <div key={key} className="flex items-start gap-2">
                    <Badge className={`${severityColors[key as keyof typeof severityColors]} text-xs`}>
                      {key}
                    </Badge>
                    <span className="text-gray-600">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MisconceptionReport
