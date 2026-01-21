'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFrameworkDashboard } from '@/hooks/useFrameworkDashboard'
import type { FrameworkStatus, StatusLevel } from '@/lib/profile/framework-interpreter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react'

// Status level badge colors
const statusColors: Record<StatusLevel, string> = {
  excellent: 'bg-green-100 text-green-800 border-green-200',
  good: 'bg-blue-100 text-blue-800 border-blue-200',
  developing: 'bg-amber-100 text-amber-800 border-amber-200',
  needs_attention: 'bg-red-100 text-red-800 border-red-200',
  insufficient_data: 'bg-gray-100 text-gray-600 border-gray-200',
}

const statusBgColors: Record<StatusLevel, string> = {
  excellent: 'bg-green-50 border-green-200',
  good: 'bg-blue-50 border-blue-200',
  developing: 'bg-amber-50 border-amber-200',
  needs_attention: 'bg-red-50 border-red-200',
  insufficient_data: 'bg-gray-50 border-gray-200',
}

const statusProgressColors: Record<StatusLevel, string> = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  developing: 'bg-amber-500',
  needs_attention: 'bg-red-500',
  insufficient_data: 'bg-gray-300',
}

function FrameworkCard({ framework }: { framework: FrameworkStatus }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={`border ${statusBgColors[framework.status]}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{framework.icon}</span>
              <div>
                <CardTitle className="text-lg">{framework.shortName}</CardTitle>
                <CardDescription className="text-xs">
                  {framework.researcher} ({framework.year})
                </CardDescription>
              </div>
            </div>
            <Badge className={`${statusColors[framework.status]} border`}>
              {framework.statusLabel}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Score progress */}
          {framework.score !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className="font-medium">{framework.score}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${statusProgressColors[framework.status]}`}
                  style={{ width: `${framework.score}%` }}
                />
              </div>
            </div>
          )}

          {/* Headline */}
          <p className="font-medium text-sm">{framework.headline}</p>

          {/* Interpretation */}
          <p className="text-sm text-muted-foreground">{framework.interpretation}</p>

          {/* Recommendation */}
          <div className="flex items-start gap-2 p-2 bg-white/60 rounded-md">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm">{framework.recommendation}</p>
          </div>

          {/* Data quality indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Data quality:</span>
            <span className="capitalize">{framework.dataQuality}</span>
            <span>({framework.dataPoints}/{framework.minDataPoints}+ data points)</span>
          </div>

          {/* Expand/collapse trigger */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2">
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" /> Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" /> Show Details
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Expanded details */}
          <CollapsibleContent className="space-y-3">
            {/* Description */}
            <div className="p-3 bg-white/80 rounded-md">
              <h4 className="text-sm font-medium mb-1">About {framework.name}</h4>
              <p className="text-sm text-muted-foreground">{framework.description}</p>
            </div>

            {/* Metrics */}
            {framework.metrics.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Detailed Metrics</h4>
                <div className="grid gap-2">
                  {framework.metrics.map((metric) => (
                    <div
                      key={metric.key}
                      className="flex items-center justify-between p-2 bg-white/80 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {metric.isGood !== undefined && (
                          metric.isGood ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          )
                        )}
                        <div>
                          <span className="font-medium">{metric.label}</span>
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </div>
                      </div>
                      <span className="font-mono">
                        {metric.value ?? 'N/A'}
                        {metric.unit && ` ${metric.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const notebookId = params.id as string

  const { dashboard, hasProfile, lastUpdated, isLoading, error, mutate } = useFrameworkDashboard(notebookId)

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Learning Profile</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Learning Profile</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load profile: {error.message}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Learning Profile</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No profile data available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start learning to build your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Learning Profile</h1>
            <p className="text-sm text-muted-foreground">
              Your progress across 8 educational psychology frameworks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Overall readiness card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-8 border-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold">{dashboard.overallReadiness}</span>
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-full border-8 border-primary"
                style={{
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                  transform: `rotate(${-90 + (dashboard.overallReadiness / 100) * 360}deg)`,
                  transformOrigin: 'center',
                  opacity: 0, // Hidden, using for visual guide
                }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Overall Learning Readiness</h2>
              <p className="text-muted-foreground mb-4">{dashboard.overallMessage}</p>
              <Progress value={dashboard.overallReadiness} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top insights and priority actions */}
      {(dashboard.topInsights.length > 0 || dashboard.priorityActions.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {dashboard.topInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dashboard.topInsights.map((insight, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {dashboard.priorityActions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Priority Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dashboard.priorityActions.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Framework grid */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Framework Breakdown</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Click on any framework card to see detailed metrics and explanations
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {dashboard.frameworks.map((framework) => (
          <FrameworkCard key={framework.id} framework={framework} />
        ))}
      </div>

      {/* Legend */}
      <Card className="mt-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge className={`${statusColors.excellent} border`}>Excellent</Badge>
            <Badge className={`${statusColors.good} border`}>Good</Badge>
            <Badge className={`${statusColors.developing} border`}>Developing</Badge>
            <Badge className={`${statusColors.needs_attention} border`}>Needs Attention</Badge>
            <Badge className={`${statusColors.insufficient_data} border`}>Not Enough Data</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
