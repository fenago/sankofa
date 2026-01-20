'use client'

import { useState } from 'react'
import { useProfileDashboard } from '@/hooks/useInverseProfile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Target,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
  Zap,
  BookOpen,
  BarChart3,
} from 'lucide-react'
import type { ProfileInsight } from '@/lib/profile/inverse-profile-engine'

interface InverseProfileDashboardProps {
  notebookId: string
  compact?: boolean
}

export function InverseProfileDashboard({ notebookId, compact = false }: InverseProfileDashboardProps) {
  const {
    hasProfile,
    profile,
    knowledgeState,
    cognitiveIndicators,
    metacognitiveIndicators,
    motivationalIndicators,
    behavioralPatterns,
    confidenceScores,
    dataQuality,
    warnings,
    needsUpdate,
    interactionsSinceUpdate,
    insights,
    loading,
    error,
    computeProfile,
  } = useProfileDashboard(notebookId)

  const [isComputing, setIsComputing] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const handleComputeProfile = async (force: boolean = false) => {
    setIsComputing(true)
    try {
      await computeProfile(force)
    } finally {
      setIsComputing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading profile...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Error loading profile: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learner Profile
          </CardTitle>
          <CardDescription>
            Analyze your learning patterns and get personalized insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No profile computed yet. Start practicing to generate your learner profile.
            </p>
            <Button
              onClick={() => handleComputeProfile(true)}
              disabled={isComputing}
            >
              {isComputing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Computing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return <CompactProfileView profile={profile} insights={insights} />
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Learner Profile
              </CardTitle>
              <CardDescription>
                Based on {profile?.interactions_analyzed ?? 0} interactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DataQualityBadge quality={dataQuality} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleComputeProfile(true)}
                disabled={isComputing}
              >
                {isComputing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>
          {needsUpdate && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{interactionsSinceUpdate} new interactions since last update</span>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <InsightsSection insights={insights} />
      )}

      {/* Dimension Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Knowledge State */}
        <DimensionCard
          title="Knowledge State"
          icon={<BookOpen className="h-5 w-5" />}
          confidence={confidenceScores?.knowledge}
          expanded={expandedSection === 'knowledge'}
          onToggle={() => setExpandedSection(expandedSection === 'knowledge' ? null : 'knowledge')}
        >
          {knowledgeState && (
            <div className="space-y-3">
              <MasteryBar value={knowledgeState.averageMastery} label="Average Mastery" />
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-700">{knowledgeState.skillsMastered}</div>
                  <div className="text-green-600 text-xs">Mastered</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-700">{knowledgeState.skillsInProgress}</div>
                  <div className="text-blue-600 text-xs">In Progress</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="font-semibold text-gray-700">{knowledgeState.skillsNotStarted}</div>
                  <div className="text-gray-600 text-xs">Not Started</div>
                </div>
              </div>
              {knowledgeState.knowledgeGaps.length > 0 && (
                <div className="text-sm">
                  <span className="text-amber-600 font-medium">
                    {knowledgeState.knowledgeGaps.length} knowledge gap(s) detected
                  </span>
                </div>
              )}
              {knowledgeState.misconceptions.length > 0 && (
                <div className="text-sm">
                  <span className="text-red-600 font-medium">
                    {knowledgeState.misconceptions.length} potential misconception(s)
                  </span>
                </div>
              )}
            </div>
          )}
        </DimensionCard>

        {/* Cognitive Indicators */}
        <DimensionCard
          title="Cognitive Profile"
          icon={<Brain className="h-5 w-5" />}
          confidence={confidenceScores?.cognitive}
          expanded={expandedSection === 'cognitive'}
          onToggle={() => setExpandedSection(expandedSection === 'cognitive' ? null : 'cognitive')}
        >
          {cognitiveIndicators && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expertise Level</span>
                <ExpertiseBadge level={cognitiveIndicators.expertiseLevel} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Working Memory</span>
                <IndicatorBadge value={cognitiveIndicators.workingMemoryIndicator} />
              </div>
              {cognitiveIndicators.averageResponseTimeMs && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                  <span className="text-sm font-medium">
                    {(cognitiveIndicators.averageResponseTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
              {cognitiveIndicators.optimalComplexityLevel !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Optimal Difficulty</span>
                  <span className="text-sm font-medium">
                    {(cognitiveIndicators.optimalComplexityLevel * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </DimensionCard>

        {/* Metacognitive Indicators */}
        <DimensionCard
          title="Self-Awareness"
          icon={<Lightbulb className="h-5 w-5" />}
          confidence={confidenceScores?.metacognitive}
          expanded={expandedSection === 'metacognitive'}
          onToggle={() => setExpandedSection(expandedSection === 'metacognitive' ? null : 'metacognitive')}
        >
          {metacognitiveIndicators && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Help-Seeking</span>
                <HelpSeekingBadge pattern={metacognitiveIndicators.helpSeekingPattern} />
              </div>
              {metacognitiveIndicators.calibrationAccuracy !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Calibration Accuracy</span>
                    <span className="text-sm font-medium">
                      {(metacognitiveIndicators.calibrationAccuracy * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${Math.max(0, metacognitiveIndicators.calibrationAccuracy * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {metacognitiveIndicators.overconfidenceRate !== null && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Overconfidence: </span>
                  <span className={metacognitiveIndicators.overconfidenceRate > 0.3 ? 'text-amber-600' : ''}>
                    {(metacognitiveIndicators.overconfidenceRate * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </DimensionCard>

        {/* Motivational Indicators */}
        <DimensionCard
          title="Motivation & Engagement"
          icon={<Target className="h-5 w-5" />}
          confidence={confidenceScores?.motivational}
          expanded={expandedSection === 'motivational'}
          onToggle={() => setExpandedSection(expandedSection === 'motivational' ? null : 'motivational')}
        >
          {motivationalIndicators && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Goal Orientation</span>
                <GoalOrientationBadge orientation={motivationalIndicators.goalOrientation} />
              </div>
              {motivationalIndicators.persistenceScore !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Persistence</span>
                    <span className="text-sm font-medium">
                      {(motivationalIndicators.persistenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${motivationalIndicators.persistenceScore * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {motivationalIndicators.sessionFrequency !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sessions/Week</span>
                  <span className="text-sm font-medium">
                    {motivationalIndicators.sessionFrequency.toFixed(1)}
                  </span>
                </div>
              )}
              {motivationalIndicators.averageSessionDuration !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Session</span>
                  <span className="text-sm font-medium">
                    {motivationalIndicators.averageSessionDuration.toFixed(0)} min
                  </span>
                </div>
              )}
            </div>
          )}
        </DimensionCard>

        {/* Behavioral Patterns */}
        <DimensionCard
          title="Learning Patterns"
          icon={<BarChart3 className="h-5 w-5" />}
          confidence={confidenceScores?.behavioral}
          expanded={expandedSection === 'behavioral'}
          onToggle={() => setExpandedSection(expandedSection === 'behavioral' ? null : 'behavioral')}
        >
          {behavioralPatterns && (
            <div className="space-y-3">
              {behavioralPatterns.preferredTimeOfDay && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preferred Time</span>
                  <span className="text-sm font-medium capitalize">
                    {behavioralPatterns.preferredTimeOfDay}
                  </span>
                </div>
              )}
              {behavioralPatterns.mostActiveDay !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Most Active Day</span>
                  <span className="text-sm font-medium">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][behavioralPatterns.mostActiveDay]}
                  </span>
                </div>
              )}
              {behavioralPatterns.hintUsageRate !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hint Usage</span>
                  <span className="text-sm font-medium">
                    {(behavioralPatterns.hintUsageRate * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {behavioralPatterns.learningVelocity !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Learning Velocity</span>
                  <span className="text-sm font-medium">
                    {behavioralPatterns.learningVelocity.toFixed(1)} skills/week
                  </span>
                </div>
              )}
            </div>
          )}
        </DimensionCard>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              {warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Compact view for embedding in other pages
function CompactProfileView({
  profile,
  insights,
}: {
  profile: InverseProfileDashboardProps extends { profile: infer P } ? P : any
  insights: ProfileInsight[]
}) {
  if (!profile) return null

  const ks = profile.knowledge_state
  const ci = profile.cognitive_indicators

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Your Profile</span>
          </div>
          <DataQualityBadge quality={profile.data_quality} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Mastery</div>
            <div className="font-medium">{(ks?.averageMastery * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Expertise</div>
            <div className="font-medium capitalize">{ci?.expertiseLevel}</div>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">Top Insight</div>
            <InsightCard insight={insights[0]} compact />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Insights section
function InsightsSection({ insights }: { insights: ProfileInsight[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayInsights = showAll ? insights : insights.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Personalized Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayInsights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
        {insights.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {insights.length - 3} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Individual insight card
function InsightCard({ insight, compact = false }: { insight: ProfileInsight; compact?: boolean }) {
  const icons = {
    strength: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    improvement: <TrendingUp className="h-4 w-4 text-amber-500" />,
    recommendation: <Lightbulb className="h-4 w-4 text-blue-500" />,
  }

  const bgColors = {
    strength: 'bg-green-50',
    improvement: 'bg-amber-50',
    recommendation: 'bg-blue-50',
  }

  if (compact) {
    return (
      <div className="flex items-start gap-2">
        {icons[insight.category]}
        <div>
          <div className="text-sm font-medium">{insight.title}</div>
          <div className="text-xs text-muted-foreground">{insight.description}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-3 rounded-lg ${bgColors[insight.category]}`}>
      <div className="flex items-start gap-2">
        {icons[insight.category]}
        <div>
          <div className="text-sm font-medium">{insight.title}</div>
          <div className="text-sm text-muted-foreground">{insight.description}</div>
        </div>
      </div>
    </div>
  )
}

// Dimension card component
function DimensionCard({
  title,
  icon,
  confidence,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  confidence?: number
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {confidence !== undefined && (
              <ConfidenceBadge value={confidence} />
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="border-t pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// Badge components
function DataQualityBadge({ quality }: { quality: string | null }) {
  if (!quality) return null

  const styles = {
    insufficient: 'bg-red-100 text-red-700',
    limited: 'bg-amber-100 text-amber-700',
    adequate: 'bg-blue-100 text-blue-700',
    good: 'bg-green-100 text-green-700',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[quality as keyof typeof styles]}`}>
      {quality}
    </span>
  )
}

function ConfidenceBadge({ value }: { value: number }) {
  const percentage = Math.round(value * 100)
  const color = percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-gray-500'

  return (
    <span className={`text-xs ${color}`}>
      {percentage}% conf
    </span>
  )
}

function ExpertiseBadge({ level }: { level: string }) {
  const styles = {
    novice: 'bg-gray-100 text-gray-700',
    beginner: 'bg-blue-100 text-blue-700',
    intermediate: 'bg-purple-100 text-purple-700',
    advanced: 'bg-amber-100 text-amber-700',
    expert: 'bg-green-100 text-green-700',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[level as keyof typeof styles] || styles.novice}`}>
      {level}
    </span>
  )
}

function IndicatorBadge({ value }: { value: string }) {
  const styles = {
    low: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-green-100 text-green-700',
    unknown: 'bg-gray-100 text-gray-500',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[value as keyof typeof styles] || styles.unknown}`}>
      {value}
    </span>
  )
}

function HelpSeekingBadge({ pattern }: { pattern: string }) {
  const styles = {
    avoidant: 'bg-amber-100 text-amber-700',
    appropriate: 'bg-green-100 text-green-700',
    excessive: 'bg-blue-100 text-blue-700',
    unknown: 'bg-gray-100 text-gray-500',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[pattern as keyof typeof styles] || styles.unknown}`}>
      {pattern}
    </span>
  )
}

function GoalOrientationBadge({ orientation }: { orientation: string }) {
  const styles = {
    mastery: 'bg-green-100 text-green-700',
    performance: 'bg-blue-100 text-blue-700',
    avoidance: 'bg-amber-100 text-amber-700',
    unknown: 'bg-gray-100 text-gray-500',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[orientation as keyof typeof styles] || styles.unknown}`}>
      {orientation}
    </span>
  )
}

function MasteryBar({ value, label }: { value: number; label: string }) {
  const percentage = Math.round(value * 100)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
