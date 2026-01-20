'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  ClipboardList,
  Clock,
  BookOpen,
  Target,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssessmentType } from '@/hooks/useAssessment'
import { getAssessmentTypeLabel } from '@/hooks/useAssessment'

interface AssessmentLobbyProps {
  onStart: (config: {
    type: AssessmentType
    title?: string
    questionCount: number
    timeLimit?: number
  }) => Promise<void>
  isCreating: boolean
  availableSkillCount?: number
}

export function AssessmentLobby({
  onStart,
  isCreating,
  availableSkillCount = 0,
}: AssessmentLobbyProps) {
  const [type, setType] = useState<AssessmentType>('formative')
  const [questionCount, setQuestionCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [useTimeLimit, setUseTimeLimit] = useState(false)

  const typeInfo = getAssessmentTypeLabel(type)

  const handleStart = async () => {
    await onStart({
      type,
      questionCount,
      timeLimit: useTimeLimit && timeLimit ? timeLimit * 60 * 1000 : undefined,
    })
  }

  return (
    <div className="space-y-6">
      {/* Assessment Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Assessment
          </CardTitle>
          <CardDescription>
            Choose the type of assessment and configure your settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-3">
            <Label>Assessment Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['diagnostic', 'formative', 'summative'] as AssessmentType[]).map((t) => {
                const info = getAssessmentTypeLabel(t)
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      type === t
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {t === 'diagnostic' && <Target className="h-4 w-4" />}
                      {t === 'formative' && <BookOpen className="h-4 w-4" />}
                      {t === 'summative' && <CheckCircle className="h-4 w-4" />}
                      <span className="font-medium text-sm">{info.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Number of Questions</Label>
              <span className="text-sm font-medium">{questionCount}</span>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={([value]) => setQuestionCount(value)}
              min={5}
              max={30}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {availableSkillCount > 0
                ? `Questions will cover ${Math.min(questionCount, availableSkillCount)} skills`
                : 'Questions will be generated from available skills'}
            </p>
          </div>

          {/* Time Limit */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="useTimeLimit"
                checked={useTimeLimit}
                onChange={(e) => setUseTimeLimit(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="useTimeLimit" className="cursor-pointer">
                Set time limit
              </Label>
            </div>
            {useTimeLimit && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={timeLimit || ''}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || null)}
                  placeholder="Minutes"
                  min={5}
                  max={120}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Assessment Guidelines:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>No hints or scaffolding will be provided during the assessment</li>
                <li>You can navigate between questions freely</li>
                <li>Your progress is saved automatically</li>
                {useTimeLimit && timeLimit && (
                  <li>
                    The assessment will auto-submit when time expires ({timeLimit} minutes)
                  </li>
                )}
                <li>Results will show your performance by skill area</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="flex justify-end gap-3">
        <Button
          size="lg"
          onClick={handleStart}
          disabled={isCreating || availableSkillCount === 0}
          className="min-w-[200px]"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Assessment...
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 mr-2" />
              Start {typeInfo.label} Assessment
            </>
          )}
        </Button>
      </div>

      {availableSkillCount === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No skills available. Add sources and generate a knowledge graph first.
        </p>
      )}
    </div>
  )
}
