'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Brain,
  Target,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Users,
  BarChart3,
} from 'lucide-react'
import { RecommendationCard } from './RecommendationCard'
import type { SkillRecommendation, ProfileSummary } from '@/hooks/useAdaptiveLearning'

interface AdaptiveLearningProps {
  notebookId: string
  recommendations: SkillRecommendation[]
  profileSummary: ProfileSummary | null
  totalZPDSkills: number
  masteredCount: number
  hasProfile: boolean
  loading: boolean
  error: string | null
  onRefresh: () => void
  onSelectSkill?: (skillId: string) => void
}

export function AdaptiveLearningSection({
  notebookId,
  recommendations,
  profileSummary,
  totalZPDSkills,
  masteredCount,
  hasProfile,
  loading,
  error,
  onRefresh,
  onSelectSkill,
}: AdaptiveLearningProps) {
  const [showAll, setShowAll] = useState(false)

  // Get expertise level badge color
  const getExpertiseColor = (level: string) => {
    const colors: Record<string, string> = {
      novice: 'bg-slate-100 text-slate-700',
      beginner: 'bg-blue-100 text-blue-700',
      intermediate: 'bg-green-100 text-green-700',
      advanced: 'bg-purple-100 text-purple-700',
      expert: 'bg-amber-100 text-amber-700',
    }
    return colors[level] ?? 'bg-gray-100 text-gray-700'
  }

  // Get goal orientation icon
  const getGoalIcon = (orientation: string) => {
    switch (orientation) {
      case 'mastery':
        return <TrendingUp className="h-3 w-3" />
      case 'performance':
        return <Target className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
    }
  }

  const displayedRecommendations = showAll
    ? recommendations
    : recommendations.slice(0, 3)

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">For You</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Personalized skill recommendations based on your learning profile
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Profile summary badges */}
        {profileSummary && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getExpertiseColor(profileSummary.expertiseLevel)}`}
              >
                <Brain className="h-3 w-3" />
                {profileSummary.expertiseLevel.charAt(0).toUpperCase() +
                  profileSummary.expertiseLevel.slice(1)}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {getGoalIcon(profileSummary.goalOrientation)}
                {profileSummary.goalOrientation.charAt(0).toUpperCase() +
                  profileSummary.goalOrientation.slice(1)}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <Lightbulb className="h-3 w-3" />
                {masteredCount} mastered
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Target className="h-3 w-3" />
                {totalZPDSkills} ready
              </span>
            </div>

            {/* View Full Profile link */}
            <Link
              href={`/notebooks/${notebookId}/profile`}
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 hover:underline"
            >
              <BarChart3 className="h-3 w-3" />
              View Full Profile
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Loading state */}
        {loading && recommendations.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span className="ml-2 text-muted-foreground">
              Finding your next skills...
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* No profile state */}
        {!loading && !error && !hasProfile && (
          <div className="text-center py-6">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No learner profile yet
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Complete some practice exercises to generate personalized recommendations
            </p>
            <Link
              href={`/notebooks/${notebookId}/profile`}
              className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:underline"
            >
              <BarChart3 className="h-3 w-3" />
              View Full Profile
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* No recommendations state */}
        {!loading && !error && hasProfile && recommendations.length === 0 && (
          <div className="text-center py-6">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No skill recommendations available
            </p>
            <p className="text-xs text-muted-foreground">
              Add more content or wait for your knowledge graph to update
            </p>
          </div>
        )}

        {/* Recommendations list */}
        {!loading && recommendations.length > 0 && (
          <div className="space-y-3">
            {displayedRecommendations.map((rec, idx) => (
              <RecommendationCard
                key={rec.skillId}
                recommendation={rec}
                rank={idx + 1}
                onSelect={onSelectSkill}
              />
            ))}

            {recommendations.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
              >
                {showAll ? (
                  <>Show less</>
                ) : (
                  <>
                    Show {recommendations.length - 3} more
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
