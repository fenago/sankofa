'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useContentFrameworks } from '@/hooks/useContentFrameworks'
import { useFrameworkDashboard } from '@/hooks/useFrameworkDashboard'
import type { FrameworkStatus, StatusLevel } from '@/lib/profile/framework-interpreter'
import { BLOOM_LABELS, FINK_LABELS } from '@/lib/types/graph'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Brain,
  BookOpen,
  Layers,
  Target,
  BarChart3,
  Users,
  Lightbulb,
  Zap,
  Clock,
  GraduationCap,
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

// Quick stat card component
function QuickStat({ icon, label, value, sublabel }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Distribution bar component
function DistributionBar({ label, count, total, color = 'bg-primary' }: {
  label: string
  count: number
  total: number
  color?: string
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{count} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Framework card for progress tab
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
                <CardTitle className="text-base">{framework.shortName}</CardTitle>
                <CardDescription className="text-xs">
                  {framework.researcher} ({framework.year})
                </CardDescription>
              </div>
            </div>
            <Badge className={`${statusColors[framework.status]} border text-xs`}>
              {framework.statusLabel}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
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

          {/* Expand/collapse trigger */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" /> Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" /> Show Details
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Expanded details */}
          <CollapsibleContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{framework.interpretation}</p>

            <div className="flex items-start gap-2 p-2 bg-white/60 rounded-md">
              <TrendingUp className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-xs">{framework.recommendation}</p>
            </div>

            {/* Metrics */}
            {framework.metrics.length > 0 && (
              <div className="grid gap-1">
                {framework.metrics.slice(0, 4).map((metric) => (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between p-1.5 bg-white/80 rounded text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      {metric.isGood !== undefined && (
                        metric.isGood ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                        )
                      )}
                      <span>{metric.label}</span>
                    </div>
                    <span className="font-mono">{metric.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Data: {framework.dataQuality} ({framework.dataPoints}/{framework.minDataPoints}+)
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}

export default function FrameworksPage() {
  const params = useParams()
  const router = useRouter()
  const notebookId = params.id as string
  const [activeTab, setActiveTab] = useState('content')

  const { stats, hasContent, isLoading: contentLoading, error: contentError, mutate: mutateContent } = useContentFrameworks(notebookId)
  const { dashboard, isLoading: progressLoading, error: progressError, mutate: mutateProgress } = useFrameworkDashboard(notebookId)

  const isLoading = contentLoading || progressLoading
  const error = contentError || progressError

  const handleRefresh = () => {
    mutateContent()
    mutateProgress()
  }

  // Group frameworks by category
  const groupedFrameworks = dashboard?.frameworks ? {
    knowledge: dashboard.frameworks.filter(f => ['bkt', 'irt', 'sm2'].includes(f.id)),
    curriculum: dashboard.frameworks.filter(f => ['bloom', 'fink', 'zpd', 'threshold'].includes(f.id)),
    learner: dashboard.frameworks.filter(f => ['cognitive_load', 'metacognitive', 'goal_orientation'].includes(f.id)),
    analytics: dashboard.frameworks.filter(f => ['error_patterns', 'learning_velocity', 'scaffold'].includes(f.id)),
  } : null

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/notebooks/${notebookId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Frameworks Overview</h1>
            <p className="text-muted-foreground text-sm">
              Educational psychology metadata and learning progress
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error.message}</span>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && !stats && !dashboard && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Tabs */}
      {!isLoading || stats || dashboard ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Content Analysis
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Learning Progress
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              All Frameworks
            </TabsTrigger>
          </TabsList>

          {/* Content Analysis Tab */}
          <TabsContent value="content" className="space-y-6 mt-6">
            {!hasContent ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No content extracted yet.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add sources and build the knowledge graph to see framework metadata.
                  </p>
                </CardContent>
              </Card>
            ) : stats && (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickStat
                    icon={<Target className="h-5 w-5" />}
                    label="Total Skills"
                    value={stats.totalSkills}
                  />
                  <QuickStat
                    icon={<Zap className="h-5 w-5" />}
                    label="Threshold Concepts"
                    value={`${stats.threshold.count}`}
                    sublabel={`${stats.threshold.percentage}% of skills`}
                  />
                  <QuickStat
                    icon={<BarChart3 className="h-5 w-5" />}
                    label="Avg IRT Difficulty"
                    value={stats.irt.avgDifficulty.toFixed(2)}
                    sublabel={stats.irt.avgDifficulty < -0.5 ? 'Easier' : stats.irt.avgDifficulty > 0.5 ? 'Harder' : 'Balanced'}
                  />
                  <QuickStat
                    icon={<Brain className="h-5 w-5" />}
                    label="Avg Chunks Required"
                    value={stats.cognitiveLoad.avgChunksRequired.toFixed(1)}
                    sublabel="working memory slots"
                  />
                </div>

                {/* Bloom's Taxonomy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">🔺</span>
                      Bloom&apos;s Taxonomy
                    </CardTitle>
                    <CardDescription>
                      Hierarchical Cognitive Levels (Anderson & Krathwohl 2001)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <DistributionBar
                        key={level}
                        label={`L${level} ${BLOOM_LABELS[level as 1|2|3|4|5|6]}`}
                        count={stats.bloom.distribution[level] || 0}
                        total={stats.totalSkills}
                        color={level <= 2 ? 'bg-blue-400' : level <= 4 ? 'bg-violet-500' : 'bg-purple-600'}
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* Fink's Taxonomy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">🌐</span>
                      Fink&apos;s Taxonomy
                      <Badge variant="secondary" className="text-xs">NEW</Badge>
                    </CardTitle>
                    <CardDescription>
                      Holistic Learning Dimensions (L. Dee Fink 2003) - Skills can belong to multiple dimensions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(FINK_LABELS).map(([dim, label]) => (
                      <DistributionBar
                        key={dim}
                        label={label}
                        count={stats.fink.distribution[dim] || 0}
                        total={stats.totalSkills}
                        color="bg-emerald-500"
                      />
                    ))}
                    {stats.fink.skillsWithMultipleDimensions > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {stats.fink.skillsWithMultipleDimensions} skills span multiple dimensions
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* IRT Parameters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">📊</span>
                      Item Response Theory (IRT)
                    </CardTitle>
                    <CardDescription>
                      3PL Model Parameters (Lord 1980)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Difficulty Distribution</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-700">{stats.irt.difficultyDistribution.easy}</p>
                          <p className="text-xs text-green-600">Easy (-3 to -1)</p>
                        </div>
                        <div className="text-center p-3 bg-amber-50 rounded-lg">
                          <p className="text-2xl font-bold text-amber-700">{stats.irt.difficultyDistribution.medium}</p>
                          <p className="text-xs text-amber-600">Medium (-1 to 1)</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-700">{stats.irt.difficultyDistribution.hard}</p>
                          <p className="text-xs text-red-600">Hard (1 to 3)</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Avg Discrimination</p>
                        <p className="font-medium">{stats.irt.avgDiscrimination.toFixed(2)} {stats.irt.avgDiscrimination >= 1 ? '(Good)' : '(Low)'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Guessing Prob</p>
                        <p className="font-medium">{stats.irt.avgGuessing.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Skills with IRT</p>
                        <p className="font-medium">{stats.irt.skillsWithIRT} / {stats.totalSkills}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cognitive Load */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">🧠</span>
                      Cognitive Load Theory
                    </CardTitle>
                    <CardDescription>
                      Mental Capacity Management (Sweller 1988)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Load Distribution</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-700">{stats.cognitiveLoad.distribution.low}</p>
                          <p className="text-xs text-green-600">Low Load</p>
                        </div>
                        <div className="text-center p-3 bg-amber-50 rounded-lg">
                          <p className="text-2xl font-bold text-amber-700">{stats.cognitiveLoad.distribution.medium}</p>
                          <p className="text-xs text-amber-600">Medium Load</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-700">{stats.cognitiveLoad.distribution.high}</p>
                          <p className="text-xs text-red-600">High Load</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Element Interactivity</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Low</p>
                          <p className="font-medium">{stats.cognitiveLoad.elementInteractivity.low} skills</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Medium</p>
                          <p className="font-medium">{stats.cognitiveLoad.elementInteractivity.medium} skills</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">High</p>
                          <p className="font-medium">{stats.cognitiveLoad.elementInteractivity.high} skills</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Threshold Concepts & Scaffolding */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-xl">🔑</span>
                        Threshold Concepts
                      </CardTitle>
                      <CardDescription>
                        Transformative Knowledge (Meyer & Land 2003)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Identified</span>
                        <span className="font-medium">{stats.threshold.count} of {stats.totalSkills} ({stats.threshold.percentage}%)</span>
                      </div>
                      {stats.threshold.domainsUnlocked.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Domains Unlocked:</p>
                          <div className="flex flex-wrap gap-1">
                            {stats.threshold.domainsUnlocked.slice(0, 5).map((domain, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{domain}</Badge>
                            ))}
                            {stats.threshold.domainsUnlocked.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{stats.threshold.domainsUnlocked.length - 5} more</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Troublesome aspects flagged</span>
                        <span>{stats.threshold.troublesomeAspects}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-xl">🏗️</span>
                        Scaffolding & Assessment
                      </CardTitle>
                      <CardDescription>
                        Instructional Design Metadata
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Skills with scaffolding</span>
                        <span className="font-medium">{stats.scaffolding.skillsWithScaffolding} ({stats.scaffolding.percentage}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Misconceptions catalogued</span>
                        <span className="font-medium">{stats.assessment.totalMisconceptions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Suggested assessments</span>
                        <span className="font-medium">
                          {stats.assessment.suggestedAssessments.formative + stats.assessment.suggestedAssessments.summative + stats.assessment.suggestedAssessments.other}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Transfer domains mapped</span>
                        <span className="font-medium">{stats.assessment.transferDomains}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Learning Progress Tab */}
          <TabsContent value="progress" className="space-y-6 mt-6">
            {!dashboard ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No learning progress tracked yet.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start practicing to see your progress across all frameworks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overall Readiness */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="relative h-24 w-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${dashboard.overallReadiness * 2.51} 251`}
                            className="text-primary"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold">{dashboard.overallReadiness}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">Overall Learning Readiness</h3>
                        <p className="text-muted-foreground">{dashboard.overallMessage}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights & Actions */}
                {(dashboard.topInsights.length > 0 || dashboard.priorityActions.length > 0) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {dashboard.topInsights.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Key Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {dashboard.topInsights.map((insight, i) => (
                              <li key={i} className="text-sm">{insight}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    {dashboard.priorityActions.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Priority Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {dashboard.priorityActions.map((action, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Framework Groups */}
                {groupedFrameworks && (
                  <>
                    {/* Core Knowledge Tracking */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Core Knowledge Tracking
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">How well do you know it?</span>
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {groupedFrameworks.knowledge.map(f => (
                          <FrameworkCard key={f.id} framework={f} />
                        ))}
                      </div>
                    </div>

                    {/* Curriculum & Structure */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Curriculum & Structure
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">How is learning organized?</span>
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {groupedFrameworks.curriculum.map(f => (
                          <FrameworkCard key={f.id} framework={f} />
                        ))}
                      </div>
                    </div>

                    {/* Learner Characteristics */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Learner Characteristics
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">How do you learn?</span>
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {groupedFrameworks.learner.map(f => (
                          <FrameworkCard key={f.id} framework={f} />
                        ))}
                      </div>
                    </div>

                    {/* Learning Analytics */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Learning Analytics
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">What do the patterns show?</span>
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {groupedFrameworks.analytics.map(f => (
                          <FrameworkCard key={f.id} framework={f} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* All Frameworks Tab */}
          <TabsContent value="all" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Educational Psychology Frameworks</CardTitle>
                <CardDescription>
                  Complete reference of frameworks used for content analysis and learning tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Framework</th>
                        <th className="text-left py-3 px-2">Researcher</th>
                        <th className="text-center py-3 px-2">Content</th>
                        <th className="text-center py-3 px-2">Progress</th>
                        <th className="text-center py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Bloom's */}
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span>🔺</span>
                            <span className="font-medium">Bloom&apos;s Taxonomy</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">Anderson & Krathwohl (2001)</td>
                        <td className="py-3 px-2 text-center">
                          {stats ? `${stats.totalSkills} skills` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dashboard?.frameworks.find(f => f.id === 'bloom')?.score ?? '-'}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dashboard?.frameworks.find(f => f.id === 'bloom') && (
                            <Badge className={`${statusColors[dashboard.frameworks.find(f => f.id === 'bloom')!.status]} border text-xs`}>
                              {dashboard.frameworks.find(f => f.id === 'bloom')!.statusLabel}
                            </Badge>
                          )}
                        </td>
                      </tr>
                      {/* Fink's */}
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span>🌐</span>
                            <span className="font-medium">Fink&apos;s Taxonomy</span>
                            <Badge variant="secondary" className="text-xs">NEW</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">L. Dee Fink (2003)</td>
                        <td className="py-3 px-2 text-center">
                          {stats ? `${Object.values(stats.fink.distribution).reduce((a, b) => a + b, 0)} tags` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dashboard?.frameworks.find(f => f.id === 'fink')?.score ?? '-'}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dashboard?.frameworks.find(f => f.id === 'fink') && (
                            <Badge className={`${statusColors[dashboard.frameworks.find(f => f.id === 'fink')!.status]} border text-xs`}>
                              {dashboard.frameworks.find(f => f.id === 'fink')!.statusLabel}
                            </Badge>
                          )}
                        </td>
                      </tr>
                      {/* IRT */}
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span>📊</span>
                            <span className="font-medium">Item Response Theory</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">Lord (1980)</td>
                        <td className="py-3 px-2 text-center">
                          {stats ? `${stats.irt.skillsWithIRT} params` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dashboard?.frameworks.find(f => f.id === 'irt')?.score ?? '-'}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dashboard?.frameworks.find(f => f.id === 'irt') && (
                            <Badge className={`${statusColors[dashboard.frameworks.find(f => f.id === 'irt')!.status]} border text-xs`}>
                              {dashboard.frameworks.find(f => f.id === 'irt')!.statusLabel}
                            </Badge>
                          )}
                        </td>
                      </tr>
                      {/* Other frameworks from dashboard */}
                      {dashboard?.frameworks.filter(f => !['bloom', 'fink', 'irt'].includes(f.id)).map(f => (
                        <tr key={f.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span>{f.icon}</span>
                              <span className="font-medium">{f.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{f.researcher} ({f.year})</td>
                          <td className="py-3 px-2 text-center text-muted-foreground">-</td>
                          <td className="py-3 px-2 text-center">
                            {f.score !== null ? `${f.score}%` : '-'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge className={`${statusColors[f.status]} border text-xs`}>
                              {f.statusLabel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors.excellent} border text-xs`}>Excellent</Badge>
                    <span className="text-sm text-muted-foreground">Outstanding performance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors.good} border text-xs`}>Good</Badge>
                    <span className="text-sm text-muted-foreground">On track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors.developing} border text-xs`}>Developing</Badge>
                    <span className="text-sm text-muted-foreground">Making progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors.needs_attention} border text-xs`}>Needs Attention</Badge>
                    <span className="text-sm text-muted-foreground">Focus area</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors.insufficient_data} border text-xs`}>Insufficient Data</Badge>
                    <span className="text-sm text-muted-foreground">More practice needed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}
