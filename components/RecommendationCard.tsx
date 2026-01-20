'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Target,
  Clock,
  Lightbulb,
  ChevronRight,
  HelpCircle,
  Zap,
  BookOpen,
  Star,
} from 'lucide-react'
import type { SkillRecommendation, RecommendationReason } from '@/hooks/useAdaptiveLearning'
import { getBloomLabel, getScaffoldDescription } from '@/hooks/useAdaptiveLearning'

interface RecommendationCardProps {
  recommendation: SkillRecommendation
  rank?: number
  onSelect?: (skillId: string) => void
  compact?: boolean
}

export function RecommendationCard({
  recommendation,
  rank,
  onSelect,
  compact = false,
}: RecommendationCardProps) {
  const { skill, score, reasons, adjustments, whyExplanation } = recommendation
  const [isWhyOpen, setIsWhyOpen] = useState(false)

  // Determine card accent based on score
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'border-l-green-500'
    if (score >= 0.6) return 'border-l-amber-500'
    return 'border-l-blue-500'
  }

  // Difficulty badge color
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 0.35) return 'bg-green-100 text-green-700'
    if (difficulty < 0.65) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 0.35) return 'Easy'
    if (difficulty < 0.65) return 'Medium'
    return 'Hard'
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border border-l-4 ${getScoreColor(score)} bg-white hover:bg-gray-50 cursor-pointer transition-colors`}
        onClick={() => onSelect?.(skill.id)}
      >
        {rank && (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-medium flex items-center justify-center">
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{skill.name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>{getBloomLabel(skill.bloomLevel)}</span>
            {skill.estimatedMinutes && (
              <>
                <span>·</span>
                <span>{skill.estimatedMinutes}m</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    )
  }

  return (
    <Card className={`border-l-4 ${getScoreColor(score)} overflow-hidden`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {rank && (
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-medium flex items-center justify-center">
                  {rank}
                </span>
              )}
              <h4 className="font-medium text-sm">{skill.name}</h4>
              {skill.isThresholdConcept && (
                <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {skill.description}
            </p>
          </div>

          {/* Why? popover */}
          <Popover open={isWhyOpen} onOpenChange={setIsWhyOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <HelpCircle className="h-4 w-4 mr-1" />
                Why?
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-sm mb-1">Why This Skill?</h5>
                  <p className="text-xs text-muted-foreground">{whyExplanation}</p>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-1">Reasons</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {reason.description}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-1">Personalization</h5>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Scaffold: {getScaffoldDescription(adjustments.scaffoldLevel)}</p>
                    <p>Cognitive Load: {adjustments.cognitiveLoadLimit}</p>
                    {adjustments.difficultyAdjustment !== 0 && (
                      <p>
                        Difficulty:{' '}
                        {adjustments.difficultyAdjustment > 0 ? 'Increased' : 'Decreased'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
            <BookOpen className="h-3 w-3" />
            {getBloomLabel(skill.bloomLevel)}
          </span>

          {skill.difficulty !== undefined && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getDifficultyColor(skill.difficulty)}`}
            >
              <Target className="h-3 w-3" />
              {getDifficultyLabel(skill.difficulty)}
            </span>
          )}

          {skill.estimatedMinutes && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
              <Clock className="h-3 w-3" />
              {skill.estimatedMinutes}m
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
            <Zap className="h-3 w-3" />
            Level {adjustments.scaffoldLevel}
          </span>
        </div>

        {/* Match score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                style={{ width: `${score * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(score * 100)}% match
            </span>
          </div>

          {onSelect && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => onSelect(skill.id)}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
