'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  MessageSquare,
  Sparkles,
  Target,
  Brain,
  Clock,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import type { DialogueSummary as DialogueSummaryType } from '@/hooks/useSocraticDialogue'

interface DialogueSummaryProps {
  summary: DialogueSummaryType
  masteryAdjustment?: number
  onContinue?: () => void
  onPracticeMore?: () => void
  onExit?: () => void
}

export function DialogueSummary({
  summary,
  masteryAdjustment,
  onContinue,
  onPracticeMore,
  onExit,
}: DialogueSummaryProps) {
  const understandingLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    none: { label: 'Not Yet', color: 'text-gray-500', icon: <AlertTriangle className="h-4 w-4" /> },
    surface: { label: 'Surface', color: 'text-yellow-600', icon: <Brain className="h-4 w-4" /> },
    partial: { label: 'Partial', color: 'text-blue-600', icon: <Brain className="h-4 w-4" /> },
    deep: { label: 'Deep', color: 'text-green-600', icon: <CheckCircle2 className="h-4 w-4" /> },
    transfer: { label: 'Transfer', color: 'text-purple-600', icon: <Sparkles className="h-4 w-4" /> },
  }

  const engagementColors: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  }

  const confidenceColors: Record<string, string> = {
    confident: 'bg-blue-100 text-blue-700',
    uncertain: 'bg-yellow-100 text-yellow-700',
    balanced: 'bg-green-100 text-green-700',
  }

  const understandingInfo = understandingLabels[summary.finalUnderstanding] || understandingLabels.none

  // Calculate mastery change display
  const masteryChangeText = masteryAdjustment
    ? masteryAdjustment > 0
      ? `+${(masteryAdjustment * 100).toFixed(0)}%`
      : `${(masteryAdjustment * 100).toFixed(0)}%`
    : null

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Dialogue Complete</CardTitle>
              <CardDescription>Here's how you did</CardDescription>
            </div>
          </div>
          {summary.discoveryMade && (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              <Sparkles className="h-3 w-3 mr-1" />
              Discovery Made!
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
            label="Exchanges"
            value={summary.totalExchanges.toString()}
          />
          <MetricCard
            icon={<Clock className="h-4 w-4 text-gray-500" />}
            label="Duration"
            value={summary.duration}
          />
          <MetricCard
            icon={<Target className="h-4 w-4 text-green-500" />}
            label="Effectiveness"
            value={`${summary.effectivenessScore}%`}
          />
          <MetricCard
            icon={understandingInfo.icon}
            label="Understanding"
            value={understandingInfo.label}
            valueColor={understandingInfo.color}
          />
        </div>

        {/* Effectiveness Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Dialogue Effectiveness</span>
            <span className="text-muted-foreground">{summary.effectivenessScore}%</span>
          </div>
          <Progress value={summary.effectivenessScore} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {summary.effectivenessScore >= 70
              ? 'Excellent dialogue! Great self-discovery.'
              : summary.effectivenessScore >= 50
                ? 'Good progress made in understanding.'
                : 'Keep practicing - understanding takes time.'}
          </p>
        </div>

        {/* Session Indicators */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={engagementColors[summary.avgEngagement]}>
            {summary.avgEngagement.charAt(0).toUpperCase() + summary.avgEngagement.slice(1)} Engagement
          </Badge>
          <Badge variant="outline" className={confidenceColors[summary.avgConfidence]}>
            {summary.avgConfidence.charAt(0).toUpperCase() + summary.avgConfidence.slice(1)} Confidence
          </Badge>
          {masteryChangeText && (
            <Badge
              variant="outline"
              className={
                (masteryAdjustment || 0) > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Mastery {masteryChangeText}
            </Badge>
          )}
        </div>

        {/* Key Insights */}
        {summary.keyInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Key Insights
            </h4>
            <ul className="space-y-1">
              {summary.keyInsights.map((insight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Misconceptions Identified */}
        {summary.misconceptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Areas to Review
            </h4>
            <ul className="space-y-1">
              {summary.misconceptions.map((misconception, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500 flex-shrink-0">•</span>
                  <span>{misconception}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Research Note */}
        <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
          <strong>Research insight:</strong> Socratic dialogue promotes deeper understanding through
          self-discovery. Explaining your reasoning helps consolidate learning (Chi et al., 2001).
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
        {onContinue && (
          <Button onClick={onContinue} className="flex-1">
            Continue Learning
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
        {onPracticeMore && (
          <Button onClick={onPracticeMore} variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Practice More
          </Button>
        )}
        {onExit && (
          <Button onClick={onExit} variant="ghost">
            Exit
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function MetricCard({
  icon,
  label,
  value,
  valueColor = 'text-foreground',
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default DialogueSummary
