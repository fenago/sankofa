'use client'

import { useState, use, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Target, BookOpen, RotateCcw, Zap, Clock, Trophy, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNotebook } from '@/hooks/useNotebooks'
import { useToast } from '@/hooks/use-toast'
import { usePractice, getScaffoldLevelDescription, getQuestionTypeLabel } from '@/hooks/usePractice'
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { InterventionHandler } from '@/components/InterventionHandler'
import {
  QuestionCard,
  MultipleChoiceQuestion,
  FreeResponseQuestion,
  TrueFalseQuestion,
  FillBlankQuestion,
  ScaffoldedHints,
  ConfidenceRating,
  FeedbackPanel,
  WorkedExample,
  SessionSummary,
} from '@/components/practice'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-config'

interface PracticePageProps {
  params: Promise<{ id: string }>
}

type PracticeMode = 'zpd' | 'review' | 'skill' | 'adaptive'

interface ZPDSkill {
  id: string
  name: string
  bloomLevel: number
  difficulty: number
  reason: string
}

interface DueSkill {
  skillId: string
  skillName: string
  nextReviewAt: string
  overdueBy?: number
}

export default function PracticePage({ params }: PracticePageProps) {
  const { id: notebookId } = use(params)
  const { notebook, loading: notebookLoading, error: notebookError } = useNotebook(notebookId)
  const { toast } = useToast()

  // Practice configuration
  const [mode, setMode] = useState<PracticeMode>('zpd')
  const [selectedSkillId, setSelectedSkillId] = useState<string | undefined>()
  const [sessionStarted, setSessionStarted] = useState(false)

  // Timer for response time tracking
  const questionStartTime = useRef<number>(Date.now())
  const [userAnswer, setUserAnswer] = useState('')
  const [confidence, setConfidence] = useState<number | undefined>()
  const [revealedHints, setRevealedHints] = useState<string[]>([])

  // Fetch available skills for selection
  const { data: zpdData } = useSWR<{ available: boolean; zpdSkills: ZPDSkill[] }>(
    notebookId ? `/api/notebooks/${notebookId}/learner?action=zpd` : null,
    fetcher
  )
  const { data: dueData } = useSWR<{ available: boolean; dueSkills: DueSkill[] }>(
    notebookId ? `/api/notebooks/${notebookId}/learner?action=due` : null,
    fetcher
  )

  // Adaptive learning for interventions
  const {
    interventions,
    dismissIntervention,
  } = useAdaptiveLearning(notebookId)

  // Practice session
  const practice = usePractice(notebookId, {
    mode: sessionStarted ? mode : 'zpd', // Only fetch when session started
    skillId: selectedSkillId,
    count: mode === 'adaptive' ? 10 : 5,
  })

  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    scaffoldLevel,
    skillInfo,
    answered,
    correct,
    totalHintsUsed,
    currentHintsUsed,
    availableHints,
    accuracy,
    progress,
    lastFeedback,
    isLoading,
    isSubmitting,
    sessionEnded,
    hasQuestions,
    isLastQuestion,
    error,
    message,
    submitAnswer,
    requestHint,
    nextQuestion,
    skipQuestion,
    endSession,
    resetSession,
  } = practice

  // Reset answer state when question changes
  useEffect(() => {
    setUserAnswer('')
    setConfidence(undefined)
    setRevealedHints([])
    questionStartTime.current = Date.now()
  }, [currentIndex, currentQuestion?.id])

  // Handle answer submission
  const handleSubmitAnswer = useCallback(async () => {
    if (!userAnswer.trim() || isSubmitting) return

    const responseTimeMs = Date.now() - questionStartTime.current
    const result = await submitAnswer(userAnswer, responseTimeMs, confidence)

    if (result) {
      // Show toast for feedback
      if (result.isCorrect) {
        toast({
          title: result.feedback.emoji ? `${result.feedback.emoji} Correct!` : 'Correct!',
          description: result.feedback.message,
        })
      }
    }
  }, [userAnswer, confidence, isSubmitting, submitAnswer, toast])

  // Handle hint request
  const handleRequestHint = useCallback(() => {
    const hint = requestHint()
    if (hint) {
      setRevealedHints((prev) => [...prev, hint])
    }
  }, [requestHint])

  // Start session
  const handleStartSession = useCallback(() => {
    if (mode === 'skill' && !selectedSkillId) {
      toast({
        title: 'Select a skill',
        description: 'Please select a skill to practice',
        variant: 'destructive',
      })
      return
    }
    setSessionStarted(true)
  }, [mode, selectedSkillId, toast])

  // Reset and go back to mode selection
  const handleBackToSelection = useCallback(() => {
    resetSession()
    setSessionStarted(false)
    setSelectedSkillId(undefined)
  }, [resetSession])

  // Scaffold level info
  const scaffoldInfo = getScaffoldLevelDescription(scaffoldLevel as 1 | 2 | 3 | 4)

  // Loading state
  if (notebookLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (notebookError || !notebook) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notebook not found</h2>
        <p className="text-gray-500 mb-4">The notebook you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
        <Button asChild>
          <Link href="/notebooks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notebooks
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <SessionProvider notebookId={notebookId} autoStart={sessionStarted}>
      <InterventionHandler
        interventions={interventions}
        onDismiss={dismissIntervention}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/notebooks/${notebookId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex-1">
                <h1 className="font-semibold">Practice</h1>
                <p className="text-xs text-muted-foreground">{notebook.name}</p>
              </div>
              {sessionStarted && hasQuestions && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-green-500" />
                    <span>{correct}/{answered}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">
                      Q{currentIndex + 1}/{totalQuestions}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Progress bar */}
            {sessionStarted && hasQuestions && !sessionEnded && (
              <Progress value={progress} className="h-1 mt-2" />
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Mode Selection (before session starts) */}
          {!sessionStarted && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Choose Practice Mode
                  </CardTitle>
                  <CardDescription>
                    Select how you want to practice. Each mode adapts to your current skill level.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mode Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ModeCard
                      mode="zpd"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<Target className="h-5 w-5" />}
                      title="Zone of Proximal Development"
                      description="Practice skills you're ready to learn next"
                      badge={zpdData?.zpdSkills?.length ? `${zpdData.zpdSkills.length} available` : undefined}
                      recommended
                    />
                    <ModeCard
                      mode="review"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<Clock className="h-5 w-5" />}
                      title="Spaced Review"
                      description="Review skills due for reinforcement"
                      badge={dueData?.dueSkills?.length ? `${dueData.dueSkills.length} due` : undefined}
                    />
                    <ModeCard
                      mode="skill"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<BookOpen className="h-5 w-5" />}
                      title="Specific Skill"
                      description="Focus on a particular skill"
                    />
                    <ModeCard
                      mode="adaptive"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<Zap className="h-5 w-5" />}
                      title="Adaptive Session"
                      description="AI-optimized question selection"
                    />
                  </div>

                  {/* Skill Selector (for skill mode) */}
                  {mode === 'skill' && (
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-2 block">Select a Skill</label>
                      <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a skill to practice" />
                        </SelectTrigger>
                        <SelectContent>
                          {zpdData?.zpdSkills?.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Start Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleStartSession}
                      className="w-full"
                      size="lg"
                      disabled={mode === 'skill' && !selectedSkillId}
                    >
                      Start Practice Session
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <Trophy className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                      <p className="text-2xl font-bold">{zpdData?.zpdSkills?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Skills Ready to Learn</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{dueData?.dueSkills?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Skills Due for Review</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Session Loading */}
          {sessionStarted && isLoading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading questions...</p>
            </div>
          )}

          {/* No Questions Available */}
          {sessionStarted && !isLoading && !hasQuestions && !sessionEnded && (
            <Card className="text-center py-12">
              <CardContent>
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Questions Available</h3>
                <p className="text-muted-foreground mb-4">
                  {message || 'There are no practice questions available for this selection.'}
                </p>
                <Button variant="outline" onClick={handleBackToSelection}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Try Different Mode
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Active Practice Session */}
          {sessionStarted && !isLoading && hasQuestions && !sessionEnded && currentQuestion && (
            <div className="space-y-4">
              {/* Skill & Scaffold Info */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {skillInfo && (
                  <Badge variant="outline">{skillInfo.name}</Badge>
                )}
                <Badge variant="secondary" className="flex items-center gap-1">
                  {scaffoldInfo.icon} {scaffoldInfo.label}
                </Badge>
                <Badge variant="outline">
                  {getQuestionTypeLabel(currentQuestion.type)}
                </Badge>
              </div>

              {/* Worked Example (scaffold level 1) */}
              {scaffoldLevel === 1 && currentQuestion.workedExample && !lastFeedback && (
                <WorkedExample content={currentQuestion.workedExample} />
              )}

              {/* Main Question Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Question {currentIndex + 1} of {totalQuestions}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Text */}
                  <p className="text-lg">{currentQuestion.question}</p>

                  {/* Partial Solution (scaffold level 2) */}
                  {scaffoldLevel === 2 && currentQuestion.partialSolution && !lastFeedback && (
                    <div className="p-3 bg-muted rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm font-medium text-blue-700 mb-1">Hint: Partial Solution</p>
                      <p className="text-sm">{currentQuestion.partialSolution}</p>
                    </div>
                  )}

                  {/* Question Type Specific Input */}
                  {!lastFeedback && (
                    <>
                      {currentQuestion.type === 'multiple_choice' && (
                        <MultipleChoiceQuestion
                          options={currentQuestion.options || []}
                          value={userAnswer}
                          onChange={setUserAnswer}
                          disabled={isSubmitting}
                        />
                      )}
                      {currentQuestion.type === 'true_false' && (
                        <TrueFalseQuestion
                          value={userAnswer}
                          onChange={setUserAnswer}
                          disabled={isSubmitting}
                        />
                      )}
                      {currentQuestion.type === 'free_response' && (
                        <FreeResponseQuestion
                          value={userAnswer}
                          onChange={setUserAnswer}
                          disabled={isSubmitting}
                          placeholder="Type your answer here..."
                        />
                      )}
                      {currentQuestion.type === 'fill_blank' && (
                        <FillBlankQuestion
                          questionText={currentQuestion.question}
                          value={userAnswer}
                          onChange={setUserAnswer}
                          disabled={isSubmitting}
                        />
                      )}

                      {/* Hints (scaffold level 3+) */}
                      {scaffoldLevel >= 3 && (currentQuestion.hints?.length || 0) > 0 && (
                        <ScaffoldedHints
                          hints={revealedHints}
                          availableCount={availableHints}
                          onRequestHint={handleRequestHint}
                        />
                      )}

                      {/* Confidence Rating (scaffold level 4) */}
                      {scaffoldLevel >= 3 && (
                        <ConfidenceRating
                          value={confidence}
                          onChange={setConfidence}
                          disabled={isSubmitting}
                        />
                      )}

                      {/* Submit/Skip Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={!userAnswer.trim() || isSubmitting}
                          className="flex-1"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            'Submit Answer'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={skipQuestion}
                          disabled={isSubmitting || isLastQuestion}
                        >
                          Skip
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Feedback Panel (after answer) */}
                  {lastFeedback && (
                    <div className="space-y-4">
                      <FeedbackPanel
                        feedback={lastFeedback.feedback}
                        correctAnswer={lastFeedback.correctAnswer}
                        explanation={lastFeedback.explanation}
                      />

                      {/* Show worked example if recommended */}
                      {lastFeedback.feedback.showWorkedExample && lastFeedback.workedExample && (
                        <WorkedExample content={lastFeedback.workedExample} />
                      )}

                      {/* Next/End Buttons */}
                      <div className="flex gap-3">
                        {!isLastQuestion ? (
                          <Button onClick={nextQuestion} className="flex-1">
                            Next Question
                          </Button>
                        ) : (
                          <Button onClick={endSession} className="flex-1">
                            Finish Session
                          </Button>
                        )}
                        <Button variant="outline" onClick={endSession}>
                          End Early
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Session Summary */}
          {sessionEnded && (
            <div className="space-y-4">
              <SessionSummary
                answered={answered}
                correct={correct}
                totalHintsUsed={totalHintsUsed}
                skillName={skillInfo?.name}
                masteryChange={
                  lastFeedback?.updatedState
                    ? {
                        before: (skillInfo?.pMastery || 0),
                        after: lastFeedback.updatedState.pMastery,
                      }
                    : undefined
                }
                onContinue={() => {
                  resetSession()
                  setSessionStarted(true)
                }}
                onRestart={() => {
                  resetSession()
                  setSessionStarted(true)
                }}
                onExit={handleBackToSelection}
              />
            </div>
          )}
        </div>
      </div>
    </SessionProvider>
  )
}

// Mode Selection Card Component
function ModeCard({
  mode,
  currentMode,
  onSelect,
  icon,
  title,
  description,
  badge,
  recommended,
}: {
  mode: PracticeMode
  currentMode: PracticeMode
  onSelect: (mode: PracticeMode) => void
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  recommended?: boolean
}) {
  const isSelected = mode === currentMode

  return (
    <button
      onClick={() => onSelect(mode)}
      className={cn(
        'relative p-4 rounded-lg border-2 text-left transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-muted hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {recommended && (
        <Badge className="absolute -top-2 -right-2 text-xs" variant="default">
          Recommended
        </Badge>
      )}
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {badge && (
            <Badge variant="secondary" className="mt-2 text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
