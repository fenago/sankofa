'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Users, TrendingDown, Lightbulb } from 'lucide-react'
import { formatPercentage } from '@/hooks/useLearningAnalytics'

interface StrugglingSkill {
  skillId: string
  skillName: string
  averageMastery: number
  attemptCount: number
  studentCount: number
  commonErrors: string[]
}

interface StruggleSpotsProps {
  skills: StrugglingSkill[]
  totalStudents: number
  showRecommendations?: boolean
}

export function StruggleSpots({
  skills,
  totalStudents,
  showRecommendations = true
}: StruggleSpotsProps) {
  const sortedSkills = [...skills].sort((a, b) => a.averageMastery - b.averageMastery)

  const getSeverity = (mastery: number) => {
    if (mastery < 0.3) return 'critical'
    if (mastery < 0.5) return 'high'
    if (mastery < 0.7) return 'medium'
    return 'low'
  }

  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const getRecommendation = (skill: StrugglingSkill) => {
    const severity = getSeverity(skill.averageMastery)
    if (severity === 'critical') {
      return 'Consider re-teaching with different approach or additional scaffolding'
    }
    if (severity === 'high') {
      return 'Schedule small group intervention or provide additional practice'
    }
    if (severity === 'medium') {
      return 'Offer optional review sessions or peer tutoring'
    }
    return 'Monitor progress and provide enrichment opportunities'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Struggle Spots
            </CardTitle>
            <CardDescription>
              Skills where students need additional support
            </CardDescription>
          </div>
          <Badge variant="outline">
            {skills.length} skills
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No major struggle spots identified</p>
            <p className="text-sm">Students are progressing well across all skills</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSkills.slice(0, 5).map((skill) => {
              const severity = getSeverity(skill.averageMastery)
              const affectedPercent = (skill.studentCount / totalStudents) * 100

              return (
                <div
                  key={skill.skillId}
                  className={`p-4 rounded-lg border ${severityColors[severity]}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{skill.skillName}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm opacity-75">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {skill.studentCount} students ({affectedPercent.toFixed(0)}%)
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {skill.attemptCount} attempts
                        </span>
                      </div>
                    </div>
                    <Badge className={severityColors[severity]}>
                      {severity}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Class Mastery</span>
                      <span>{formatPercentage(skill.averageMastery)}</span>
                    </div>
                    <Progress
                      value={skill.averageMastery * 100}
                      className="h-2"
                    />
                  </div>

                  {skill.commonErrors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <div className="text-xs font-medium mb-1">Common Errors:</div>
                      <ul className="text-xs space-y-1">
                        {skill.commonErrors.slice(0, 2).map((error, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="opacity-50">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {showRecommendations && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{getRecommendation(skill)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {skills.length > 5 && (
              <div className="text-center text-sm text-gray-500 pt-2">
                +{skills.length - 5} more struggle spots
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StruggleSpots
