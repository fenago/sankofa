'use client'

import { use, useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Brain,
  Clock,
  Sparkles,
  BarChart3,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { LearningGainChart } from '@/components/analytics/LearningGainChart'
import { TimeToMastery } from '@/components/analytics/TimeToMastery'
import { RetentionCurve } from '@/components/analytics/RetentionCurve'
import { TransferSuccess } from '@/components/analytics/TransferSuccess'
import {
  useAnalyticsDashboard,
  useLearningGains,
  useRetentionMetrics,
  useTimeToMastery,
  useTransferSuccess
} from '@/hooks/useLearningAnalytics'

type Period = 'week' | 'month' | 'all'

export default function AnalyticsPage() {
  const params = useParams()
  const notebookId = params.id as string
  const [period, setPeriod] = useState<Period>('month')
  const [activeTab, setActiveTab] = useState('overview')

  const dashboard = useAnalyticsDashboard(notebookId, period)
  const { gains: learningGains, isLoading: gainsLoading } = useLearningGains(notebookId, period)
  const { retention, isLoading: retentionLoading } = useRetentionMetrics(notebookId)
  const { timeToMastery, isLoading: masteryLoading } = useTimeToMastery(notebookId)
  const { transfer, isLoading: transferLoading } = useTransferSuccess(notebookId)

  const dashboardLoading = dashboard.isLoading
  const refreshDashboard = dashboard.refetch

  const isLoading = dashboardLoading || gainsLoading || retentionLoading || masteryLoading || transferLoading

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Learning Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Track your learning progress and identify areas for improvement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'all'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="capitalize"
              >
                {p === 'all' ? 'All Time' : `Last ${p}`}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshDashboard()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {dashboard.available && dashboard.learningGains && dashboard.retention && dashboard.timeToMastery && dashboard.transfer && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <QuickStat
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            label="Learning Gain"
            value={`${(dashboard.learningGains.averageNormalizedGain * 100).toFixed(0)}%`}
            sublabel="Normalized gain"
          />
          <QuickStat
            icon={<Brain className="h-5 w-5 text-purple-500" />}
            label="Retention"
            value={`${(dashboard.retention.averageRetention * 100).toFixed(0)}%`}
            sublabel="Knowledge retained"
          />
          <QuickStat
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            label="Mastered Skills"
            value={`${dashboard.timeToMastery.skills.filter(s => s.masteredAt).length}`}
            sublabel={`of ${dashboard.timeToMastery.skills.length} total`}
          />
          <QuickStat
            icon={<Sparkles className="h-5 w-5 text-orange-500" />}
            label="Transfer Ratio"
            value={`${(dashboard.transfer.averageTransferRatio * 100).toFixed(0)}%`}
            sublabel="Novel problem success"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="gains" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Learning Gains
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="mastery" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time to Mastery
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Transfer
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {dashboard.available && dashboard.learningGains && dashboard.retention && dashboard.timeToMastery && dashboard.transfer ? (
            <div className="grid md:grid-cols-2 gap-6">
              <LearningGainChart data={dashboard.learningGains} showDetails={false} />
              <RetentionCurve data={dashboard.retention} showDetails={false} />
              <TimeToMastery data={dashboard.timeToMastery} showDetails={false} />
              <TransferSuccess data={dashboard.transfer} showDetails={false} />
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No analytics data available yet. Start practicing to see your progress!" />
          )}
        </TabsContent>

        {/* Learning Gains Tab */}
        <TabsContent value="gains">
          {learningGains ? (
            <div className="space-y-6">
              <LearningGainChart data={learningGains} showDetails={true} />
              <GainsInterpretation averageGain={learningGains.averageNormalizedGain} />
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No learning gain data available. Complete pre and post assessments to measure learning gains." />
          )}
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention">
          {retention ? (
            <div className="space-y-6">
              <RetentionCurve data={retention} showDetails={true} />
              <RetentionInterpretation averageRetention={retention.averageRetention} needingReview={retention.skillsNeedingReview.length} />
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No retention data available. Practice over multiple days to track retention." />
          )}
        </TabsContent>

        {/* Time to Mastery Tab */}
        <TabsContent value="mastery">
          {timeToMastery ? (
            <div className="space-y-6">
              <TimeToMastery data={timeToMastery} showDetails={true} />
              <MasteryInterpretation
                averageTime={timeToMastery.averageTimeToMastery}
                totalSkills={timeToMastery.skills.length}
                masteredCount={timeToMastery.skills.filter(s => s.masteredAt).length}
              />
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No mastery data available. Practice skills to track your progress to mastery." />
          )}
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer">
          {transfer ? (
            <div className="space-y-6">
              <TransferSuccess data={transfer} showDetails={true} />
              <TransferInterpretation
                transferRatio={transfer.averageTransferRatio}
                goodTransferCount={transfer.skillsWithGoodTransfer.length}
                poorTransferCount={transfer.skillsWithPoorTransfer.length}
              />
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No transfer data available. Try novel problem types to measure knowledge transfer." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function QuickStat({ icon, label, value, sublabel }: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div className="p-4 bg-white border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center max-w-md">
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  )
}

function GainsInterpretation({ averageGain }: { averageGain: number }) {
  const level = averageGain >= 0.7 ? 'high' : averageGain >= 0.3 ? 'medium' : 'low'
  const interpretations = {
    high: {
      label: 'High Gain',
      description: 'Excellent progress! Your normalized gain of 70%+ indicates highly effective learning. This level is typically seen in interactive, inquiry-based learning environments.',
      tip: 'Continue with your current study approach. Consider helping peers who are struggling.',
    },
    medium: {
      label: 'Medium Gain',
      description: 'Good progress. A normalized gain between 30-70% indicates solid learning. There is room for improvement through more active engagement.',
      tip: 'Try more practice problems and seek out challenging material to push your understanding.',
    },
    low: {
      label: 'Low Gain',
      description: 'Below 30% normalized gain suggests passive learning. This is common with lecture-only instruction.',
      tip: 'Focus on active recall, practice problems, and teaching concepts to others to improve retention.',
    },
  }

  const info = interpretations[level]

  return (
    <div className={`p-4 rounded-lg ${level === 'high' ? 'bg-green-50' : level === 'medium' ? 'bg-yellow-50' : 'bg-orange-50'}`}>
      <h3 className="font-medium mb-2 flex items-center gap-2">
        <Badge className={level === 'high' ? 'bg-green-100 text-green-800' : level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}>
          {info.label}
        </Badge>
        What does this mean?
      </h3>
      <p className="text-sm text-gray-700 mb-2">{info.description}</p>
      <p className="text-sm"><strong>Tip:</strong> {info.tip}</p>
    </div>
  )
}

function RetentionInterpretation({ averageRetention, needingReview }: { averageRetention: number; needingReview: number }) {
  return (
    <div className="p-4 rounded-lg bg-purple-50">
      <h3 className="font-medium mb-2">Understanding Your Retention</h3>
      <p className="text-sm text-gray-700 mb-2">
        Based on Ebbinghaus's forgetting curve, we estimate you retain about {(averageRetention * 100).toFixed(0)}% of what you've learned.
        {needingReview > 0 && ` You have ${needingReview} skills that would benefit from review.`}
      </p>
      <p className="text-sm">
        <strong>Tip:</strong> Regular spaced review can dramatically improve long-term retention. Even 5 minutes of review at optimal intervals is more effective than longer cramming sessions.
      </p>
    </div>
  )
}

function MasteryInterpretation({ averageTime, totalSkills, masteredCount }: { averageTime: number; totalSkills: number; masteredCount: number }) {
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="p-4 rounded-lg bg-blue-50">
      <h3 className="font-medium mb-2">Your Mastery Journey</h3>
      <p className="text-sm text-gray-700 mb-2">
        You've mastered {masteredCount} of {totalSkills} skills, with an average time to mastery of {formatTime(averageTime)} per skill.
        This reflects your learning efficiency and the complexity of the material.
      </p>
      <p className="text-sm">
        <strong>Tip:</strong> Skills at higher Bloom levels naturally take longer to master. Focus on understanding fundamentals before tackling advanced applications.
      </p>
    </div>
  )
}

function TransferInterpretation({ transferRatio, goodTransferCount, poorTransferCount }: { transferRatio: number; goodTransferCount: number; poorTransferCount: number }) {
  return (
    <div className="p-4 rounded-lg bg-orange-50">
      <h3 className="font-medium mb-2">Knowledge Transfer Analysis</h3>
      <p className="text-sm text-gray-700 mb-2">
        Transfer ratio measures how well you apply learned skills to new, unfamiliar problems.
        Your ratio of {(transferRatio * 100).toFixed(0)}% shows {transferRatio >= 0.8 ? 'excellent' : transferRatio >= 0.6 ? 'good' : 'developing'} transfer ability.
        {goodTransferCount > 0 && ` You have ${goodTransferCount} skills with strong transfer.`}
        {poorTransferCount > 0 && ` ${poorTransferCount} skills may benefit from deeper conceptual understanding.`}
      </p>
      <p className="text-sm">
        <strong>Tip:</strong> To improve transfer, focus on understanding why solutions work, not just how. Practice with varied problem types and contexts.
      </p>
    </div>
  )
}
