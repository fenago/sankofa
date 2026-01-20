'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  X,
  PlayCircle,
  BookOpen,
  Target,
  ChevronRight,
  Lock,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { SkillNodeData } from './SkillNode'

interface SkillSidebarProps {
  skill: SkillNodeData | null
  notebookId: string
  onClose: () => void
  onStartPractice?: (skillId: string) => void
  className?: string
}

export function SkillSidebar({
  skill,
  notebookId,
  onClose,
  onStartPractice,
  className,
}: SkillSidebarProps) {
  if (!skill) return null

  const masteryPercent = Math.round(skill.pMastery * 100)

  const getStatusInfo = () => {
    if (skill.isMastered) {
      return {
        label: 'Mastered',
        color: 'text-green-600 bg-green-100',
        icon: <CheckCircle2 className="h-4 w-4" />,
      }
    }
    if (skill.isInProgress) {
      return {
        label: 'In Progress',
        color: 'text-yellow-600 bg-yellow-100',
        icon: <PlayCircle className="h-4 w-4" />,
      }
    }
    if (skill.isReady) {
      return {
        label: 'Ready to Learn',
        color: 'text-blue-600 bg-blue-100',
        icon: <Target className="h-4 w-4" />,
      }
    }
    return {
      label: 'Locked',
      color: 'text-gray-600 bg-gray-100',
      icon: <Lock className="h-4 w-4" />,
    }
  }

  const status = getStatusInfo()

  const getBloomLabel = (level: number) => {
    const labels = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    return labels[level] || 'Unknown'
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 3) return { label: 'Beginner', color: 'bg-green-100 text-green-700' }
    if (difficulty <= 5) return { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' }
    if (difficulty <= 7) return { label: 'Advanced', color: 'bg-orange-100 text-orange-700' }
    return { label: 'Expert', color: 'bg-red-100 text-red-700' }
  }

  const difficultyInfo = getDifficultyLabel(skill.difficulty)

  return (
    <div
      className={cn(
        'w-80 bg-white border-l flex flex-col h-full overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-lg leading-tight truncate">
            {skill.name}
          </h3>
          <Badge className={cn('mt-2', status.color)}>
            {status.icon}
            <span className="ml-1">{status.label}</span>
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Mastery Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mastery</span>
            <span className="font-medium">{masteryPercent}%</span>
          </div>
          <Progress
            value={masteryPercent}
            className={cn(
              'h-2',
              skill.isMastered
                ? '[&>div]:bg-green-500'
                : skill.isInProgress
                  ? '[&>div]:bg-yellow-500'
                  : '[&>div]:bg-gray-300'
            )}
          />
          <p className="text-xs text-muted-foreground">
            {skill.isMastered
              ? 'Great work! This skill is mastered.'
              : skill.isInProgress
                ? `${100 - masteryPercent}% more to master`
                : skill.isReady
                  ? 'Prerequisites met - ready to start'
                  : 'Complete prerequisites to unlock'}
          </p>
        </div>

        <Separator />

        {/* Skill Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Skill Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Bloom Level</span>
              <Badge variant="outline" className="w-full justify-center">
                {getBloomLabel(skill.bloomLevel)}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Difficulty</span>
              <Badge className={cn('w-full justify-center', difficultyInfo.color)}>
                {difficultyInfo.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Scaffold Level</span>
              <Badge variant="outline" className="w-full justify-center">
                Level {skill.scaffoldLevel}/4
              </Badge>
            </div>
            {skill.questionCount !== undefined && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">Questions</span>
                <Badge variant="outline" className="w-full justify-center">
                  {skill.questionCount} available
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Scaffold Level Description */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Support Level</h4>
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            {skill.scaffoldLevel === 1 && (
              <p>
                <strong>Full Support:</strong> Worked examples, guided practice, and detailed
                hints available.
              </p>
            )}
            {skill.scaffoldLevel === 2 && (
              <p>
                <strong>Partial Support:</strong> Some hints available, practice with feedback.
              </p>
            )}
            {skill.scaffoldLevel === 3 && (
              <p>
                <strong>Minimal Support:</strong> Independent practice with limited hints.
              </p>
            )}
            {skill.scaffoldLevel === 4 && (
              <p>
                <strong>No Support:</strong> Assessment-ready, practice without hints.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        {(skill.isReady || skill.isInProgress || skill.isMastered) ? (
          <>
            <Button
              className="w-full"
              onClick={() => onStartPractice?.(skill.skillId)}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {skill.isMastered ? 'Review Skill' : 'Practice Now'}
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/notebooks/${notebookId}/skills/${skill.skillId}`}>
                <BookOpen className="h-4 w-4 mr-2" />
                View Details
                <ArrowUpRight className="h-3 w-3 ml-auto" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-2">
            <Lock className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Complete prerequisite skills to unlock practice
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
