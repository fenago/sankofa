'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bell,
  AlertTriangle,
  Clock,
  TrendingDown,
  UserX,
  BookX,
  Target,
  CheckCircle,
  ChevronRight
} from 'lucide-react'

interface Intervention {
  id: string
  type: 'at_risk' | 'disengaged' | 'struggling' | 'plateau' | 'missing_prerequisites'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  studentId: string
  studentName: string
  skillId?: string
  skillName?: string
  reason: string
  recommendation: string
  metrics: {
    label: string
    value: string
  }[]
  createdAt: Date
  acknowledged?: boolean
}

interface InterventionAlertsProps {
  interventions: Intervention[]
  onAcknowledge?: (id: string) => void
  onViewStudent?: (studentId: string) => void
  showAcknowledged?: boolean
}

export function InterventionAlerts({
  interventions,
  onAcknowledge,
  onViewStudent,
  showAcknowledged = false
}: InterventionAlertsProps) {
  const filteredInterventions = showAcknowledged
    ? interventions
    : interventions.filter(i => !i.acknowledged)

  const sortedInterventions = [...filteredInterventions].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const getTypeIcon = (type: Intervention['type']) => {
    switch (type) {
      case 'at_risk':
        return <AlertTriangle className="h-5 w-5" />
      case 'disengaged':
        return <UserX className="h-5 w-5" />
      case 'struggling':
        return <BookX className="h-5 w-5" />
      case 'plateau':
        return <TrendingDown className="h-5 w-5" />
      case 'missing_prerequisites':
        return <Target className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: Intervention['type']) => {
    switch (type) {
      case 'at_risk': return 'At Risk'
      case 'disengaged': return 'Disengaged'
      case 'struggling': return 'Struggling'
      case 'plateau': return 'Learning Plateau'
      case 'missing_prerequisites': return 'Missing Prerequisites'
      default: return 'Alert'
    }
  }

  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300',
  }

  const priorityBadgeColors = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60))
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  const urgentCount = sortedInterventions.filter(i => i.priority === 'urgent').length
  const highCount = sortedInterventions.filter(i => i.priority === 'high').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Intervention Alerts
            </CardTitle>
            <CardDescription>
              Students requiring immediate attention
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {urgentCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {urgentCount} urgent
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-500 text-white">
                {highCount} high
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedInterventions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No active intervention alerts</p>
            <p className="text-sm">All students are progressing well</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedInterventions.map((intervention) => (
              <div
                key={intervention.id}
                className={`p-4 rounded-lg border ${priorityColors[intervention.priority]} ${
                  intervention.acknowledged ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${priorityColors[intervention.priority]}`}>
                    {getTypeIcon(intervention.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{intervention.studentName}</span>
                      <Badge className={priorityBadgeColors[intervention.priority]}>
                        {intervention.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(intervention.type)}
                      </Badge>
                    </div>

                    {intervention.skillName && (
                      <div className="text-xs text-gray-600 mb-1">
                        Skill: {intervention.skillName}
                      </div>
                    )}

                    <p className="text-sm mb-2">{intervention.reason}</p>

                    {/* Metrics */}
                    <div className="flex gap-4 mb-2">
                      {intervention.metrics.map((metric, i) => (
                        <div key={i} className="text-xs">
                          <span className="text-gray-500">{metric.label}: </span>
                          <span className="font-medium">{metric.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Recommendation */}
                    <div className="p-2 bg-white/50 rounded text-xs">
                      <span className="font-medium">Recommended: </span>
                      {intervention.recommendation}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(intervention.createdAt)}
                      </div>
                      <div className="flex gap-2">
                        {onAcknowledge && !intervention.acknowledged && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAcknowledge(intervention.id)}
                            className="text-xs h-7"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {onViewStudent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewStudent(intervention.studentId)}
                            className="text-xs h-7"
                          >
                            View Student
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Priority guide */}
        {sortedInterventions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Priority Guide</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Urgent: Immediate action</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>High: Within 24h</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Medium: This week</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Low: Monitor</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default InterventionAlerts
