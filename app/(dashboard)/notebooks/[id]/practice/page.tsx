'use client'

import { useState, use, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Target, BookOpen, RotateCcw, Zap, Clock, Trophy, HelpCircle, MessageCircle, GraduationCap } from 'lucide-react'
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
  SocraticInfoDialog,
} from '@/components/practice'
import { SocraticDialogueContainer, InverseSocraticDialogue, FreeformTutoringDialogue } from '@/components/tutoring'
import type { DialogueSummary as SocraticSummary } from '@/hooks/useSocraticDialogue'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-config'

interface PracticePageProps {
  params: Promise<{ id: string }>
}

type PracticeMode = 'zpd' | 'review' | 'skill' | 'adaptive' | 'socratic' | 'inverse_socratic' | 'freeform'

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
  const [selectedSkillName, setSelectedSkillName] = useState<string | undefined>()
  const [sessionStarted, setSessionStarted] = useState(false)
  const [socraticComplete, setSocraticComplete] = useState(false)
  const [socraticSummary, setSocraticSummary] = useState<SocraticSummary | null>(null)

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

  // Practice session (not used for dialogue modes)
  const isDialogueMode = mode === 'socratic' || mode === 'inverse_socratic' || mode === 'freeform'
  const practiceMode = isDialogueMode ? 'zpd' : mode
  const practice = usePractice(notebookId, {
    mode: sessionStarted && !isDialogueMode ? practiceMode : 'zpd', // Only fetch when session started (and not dialogue modes)
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
    if ((mode === 'skill' || mode === 'socratic' || mode === 'inverse_socratic' || mode === 'freeform') && !selectedSkillId) {
      toast({
        title: 'Select a skill',
        description: 'Please select a skill to practice',
        variant: 'destructive',
      })
      return
    }
    setSocraticComplete(false)
    setSocraticSummary(null)
    setSessionStarted(true)
  }, [mode, selectedSkillId, toast])

  // Handle Socratic dialogue completion
  const handleSocraticComplete = useCallback((summary: SocraticSummary) => {
    setSocraticSummary(summary)
    setSocraticComplete(true)
  }, [])

  // Reset and go back to mode selection
  const handleBackToSelection = useCallback(() => {
    resetSession()
    setSessionStarted(false)
    setSelectedSkillId(undefined)
    setSelectedSkillName(undefined)
    setSocraticComplete(false)
    setSocraticSummary(null)
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
              {sessionStarted && !isDialogueMode && hasQuestions && (
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
              {sessionStarted && mode === 'socratic' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Socratic Mode
                </Badge>
              )}
              {sessionStarted && mode === 'inverse_socratic' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Teaching Mode
                </Badge>
              )}
              {sessionStarted && mode === 'freeform' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Freeform Tutor
                </Badge>
              )}
            </div>
            {/* Progress bar (non-dialogue modes) */}
            {sessionStarted && !isDialogueMode && hasQuestions && !sessionEnded && (
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
                    <ModeCard
                      mode="socratic"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<MessageCircle className="h-5 w-5" />}
                      title="Socratic Dialogue"
                      description="Conversational learning through guided questioning"
                      badge="New"
                      extra={
                        <SocraticInfoDialog
                          trigger={
                            <span
                              className="text-xs text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              How does this work?
                            </span>
                          }
                        />
                      }
                    />
                    <ModeCard
                      mode="inverse_socratic"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<GraduationCap className="h-5 w-5" />}
                      title="Learning by Teaching"
                      description="Teach an AI student to deepen your understanding"
                      badge="New"
                      extra={
                        <span
                          className="text-xs text-muted-foreground"
                        >
                          50%+ retention boost
                        </span>
                      }
                    />
                    <ModeCard
                      mode="freeform"
                      currentMode={mode}
                      onSelect={setMode}
                      icon={<MessageCircle className="h-5 w-5" />}
                      title="Freeform Tutoring"
                      description="Ask questions and explore topics freely with an adaptive AI tutor"
                      badge="New"
                      extra={
                        <span
                          className="text-xs text-muted-foreground"
                        >
                          User-driven learning
                        </span>
                      }
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

                  {/* Skill Selector (for socratic mode) */}
                  {mode === 'socratic' && (
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-2 block">Select a Skill for Dialogue</label>
                      <Select
                        value={selectedSkillId}
                        onValueChange={(value) => {
                          setSelectedSkillId(value)
                          const skill = zpdData?.zpdSkills?.find(s => s.id === value)
                          setSelectedSkillName(skill?.name)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a skill to explore" />
                        </SelectTrigger>
                        <SelectContent>
                          {zpdData?.zpdSkills?.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        In Socratic mode, you'll engage in a conversation that helps you discover understanding through guided questions.
                      </p>
                    </div>
                  )}

                  {/* Skill Selector (for inverse socratic mode) */}
                  {mode === 'inverse_socratic' && (
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-2 block">Select a Skill to Teach</label>
                      <Select
                        value={selectedSkillId}
                        onValueChange={(value) => {
                          setSelectedSkillId(value)
                          const skill = zpdData?.zpdSkills?.find(s => s.id === value)
                          setSelectedSkillName(skill?.name)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a skill to teach" />
                        </SelectTrigger>
                        <SelectContent>
                          {zpdData?.zpdSkills?.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        In Learning by Teaching mode, you'll explain concepts to an AI learner. Teaching others is one of the most effective ways to solidify your own understanding (the Protégé Effect).
                      </p>
                    </div>
                  )}

                  {/* Skill Selector (for freeform tutoring mode) */}
                  {mode === 'freeform' && (
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-2 block">Select a Skill to Explore</label>
                      <Select
                        value={selectedSkillId}
                        onValueChange={(value) => {
                          setSelectedSkillId(value)
                          const skill = zpdData?.zpdSkills?.find(s => s.id === value)
                          setSelectedSkillName(skill?.name)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a skill to explore" />
                        </SelectTrigger>
                        <SelectContent>
                          {zpdData?.zpdSkills?.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        In Freeform Tutoring mode, you drive the conversation. Ask questions, explore concepts, and get adaptive explanations based on your learning profile.
                      </p>
                    </div>
                  )}

                  {/* Start Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleStartSession}
                      className="w-full"
                      size="lg"
                      disabled={(mode === 'skill' || mode === 'socratic' || mode === 'inverse_socratic' || mode === 'freeform') && !selectedSkillId}
                    >
                      {mode === 'socratic' ? 'Start Socratic Dialogue' :
                       mode === 'inverse_socratic' ? 'Start Teaching Session' :
                       mode === 'freeform' ? 'Start Freeform Tutoring' :
                       'Start Practice Session'}
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

          {/* Session Loading (non-dialogue modes) */}
          {sessionStarted && !isDialogueMode && isLoading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading questions...</p>
            </div>
          )}

          {/* Socratic Dialogue Mode */}
          {sessionStarted && mode === 'socratic' && selectedSkillId && selectedSkillName && (
            <SocraticDialogueContainer
              notebookId={notebookId}
              skillId={selectedSkillId}
              skillName={selectedSkillName}
              targetConcept={selectedSkillName}
              misconceptions={[]}
              onComplete={handleSocraticComplete}
              onExit={handleBackToSelection}
            />
          )}

          {/* Inverse Socratic (Learning by Teaching) Mode */}
          {sessionStarted && mode === 'inverse_socratic' && selectedSkillId && selectedSkillName && (
            <InverseSocraticDialogue
              notebookId={notebookId}
              skillId={selectedSkillId}
              skillName={selectedSkillName}
              targetConcept={selectedSkillName}
              onComplete={(summary) => {
                setSocraticSummary({
                  totalExchanges: summary.totalExchanges,
                  discoveryMade: summary.learnerUnderstanding >= 0.7,
                  finalUnderstanding: summary.learnerUnderstanding >= 0.8 ? 'deep' : summary.learnerUnderstanding >= 0.5 ? 'partial' : 'surface',
                  effectivenessScore: summary.overallTeachingScore * 100,
                  keyInsights: summary.psychometricHighlights.map(p => p.interpretation),
                  misconceptions: [],
                  avgEngagement: summary.overallTeachingScore >= 0.7 ? 'high' : summary.overallTeachingScore >= 0.4 ? 'medium' : 'low',
                  avgConfidence: 'medium',
                  duration: `${summary.totalExchanges} exchanges`,
                })
                setSocraticComplete(true)
              }}
              onExit={handleBackToSelection}
            />
          )}

          {/* Freeform Tutoring Mode */}
          {sessionStarted && mode === 'freeform' && selectedSkillId && selectedSkillName && (
            <FreeformTutoringDialogue
              notebookId={notebookId}
              skillId={selectedSkillId}
              skillName={selectedSkillName}
              onComplete={(summary) => {
                setSocraticSummary({
                  totalExchanges: summary.totalExchanges,
                  discoveryMade: summary.insightsGained.length > 0,
                  finalUnderstanding: summary.metrics.understandingScore >= 0.8 ? 'deep' : summary.metrics.understandingScore >= 0.5 ? 'partial' : 'surface',
                  effectivenessScore: summary.metrics.engagementScore * 100,
                  keyInsights: summary.insightsGained,
                  misconceptions: [],
                  avgEngagement: summary.metrics.engagementScore >= 0.7 ? 'high' : summary.metrics.engagementScore >= 0.4 ? 'medium' : 'low',
                  avgConfidence: 'medium',
                  duration: `${summary.totalExchanges} exchanges`,
                })
                setSocraticComplete(true)
              }}
              onExit={handleBackToSelection}
            />
          )}

          {/* No Questions Available (non-dialogue modes) */}
          {sessionStarted && !isDialogueMode && !isLoading && !hasQuestions && !sessionEnded && (
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

          {/* Active Practice Session (non-dialogue modes) */}
          {sessionStarted && !isDialogueMode && !isLoading && hasQuestions && !sessionEnded && currentQuestion && (
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

          {/* Session Summary (non-dialogue modes) */}
          {sessionEnded && !isDialogueMode && (
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
  extra,
}: {
  mode: PracticeMode
  currentMode: PracticeMode
  onSelect: (mode: PracticeMode) => void
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  recommended?: boolean
  extra?: React.ReactNode
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
          <div className="flex items-center gap-2 mt-2">
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
            {extra}
          </div>
        </div>
      </div>
    </button>
  )
}
