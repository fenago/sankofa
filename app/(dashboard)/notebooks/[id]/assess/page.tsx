'use client'

import { useState, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ClipboardList, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotebook } from '@/hooks/useNotebooks'
import { useToast } from '@/hooks/use-toast'
import {
  useAssessments,
  useAssessment,
  getAssessmentTypeLabel,
  getAssessmentStatusLabel,
  AssessmentType,
} from '@/hooks/useAssessment'
import {
  AssessmentLobby,
  AssessmentSession,
  AssessmentResults,
} from '@/components/assessment'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-config'
import { formatDistanceToNow } from 'date-fns'

interface AssessPageProps {
  params: Promise<{ id: string }>
}

export default function AssessPage({ params }: AssessPageProps) {
  const { id: notebookId } = use(params)
  const router = useRouter()
  const { notebook, loading: notebookLoading, error: notebookError } = useNotebook(notebookId)
  const { toast } = useToast()

  // Assessment list
  const {
    assessments,
    stats,
    isLoading: listLoading,
    createAssessment,
    refetch: refetchList,
  } = useAssessments(notebookId)

  // Active assessment state
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Active assessment details
  const activeAssessment = useAssessment(notebookId, activeAssessmentId)

  // Fetch skill count for assessment creation
  const { data: zpdData } = useSWR<{ available: boolean; zpdSkills: any[] }>(
    notebookId ? `/api/notebooks/${notebookId}/learner?action=zpd` : null,
    fetcher
  )
  const availableSkillCount = zpdData?.zpdSkills?.length || 0

  // Handle creating a new assessment
  const handleCreateAssessment = useCallback(
    async (config: {
      type: AssessmentType
      title?: string
      questionCount: number
      timeLimit?: number
    }) => {
      setIsCreating(true)
      try {
        const assessmentId = await createAssessment(config)
        if (assessmentId) {
          setActiveAssessmentId(assessmentId)
          toast({
            title: 'Assessment Created',
            description: 'Click Start to begin your assessment',
          })
        } else {
          throw new Error('Failed to create assessment')
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to create assessment. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsCreating(false)
      }
    },
    [createAssessment, toast]
  )

  // Handle starting assessment
  const handleStartAssessment = useCallback(async () => {
    const success = await activeAssessment.startAssessment()
    if (success) {
      toast({
        title: 'Assessment Started',
        description: activeAssessment.hasTimeLimit
          ? `You have ${activeAssessment.formattedTimeRemaining} to complete`
          : 'Take your time and answer all questions',
      })
    }
  }, [activeAssessment, toast])

  // Handle submitting assessment
  const handleSubmitAssessment = useCallback(async () => {
    const results = await activeAssessment.submitAssessment()
    if (results) {
      toast({
        title: 'Assessment Submitted',
        description: `You scored ${results.percentage}%`,
      })
    }
  }, [activeAssessment, toast])

  // Handle abandoning assessment
  const handleAbandonAssessment = useCallback(async () => {
    const success = await activeAssessment.abandonAssessment()
    if (success) {
      setActiveAssessmentId(null)
      refetchList()
      toast({
        title: 'Assessment Abandoned',
        description: 'You can start a new assessment anytime',
      })
    }
  }, [activeAssessment, refetchList, toast])

  // Reset to lobby
  const handleBackToLobby = useCallback(() => {
    setActiveAssessmentId(null)
    refetchList()
  }, [refetchList])

  // Continue existing assessment
  const handleContinueAssessment = useCallback((id: string) => {
    setActiveAssessmentId(id)
  }, [])

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
        <p className="text-gray-500 mb-4">The notebook you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/notebooks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notebooks
          </Link>
        </Button>
      </div>
    )
  }

  // Active assessment in progress
  if (activeAssessmentId && activeAssessment.assessment) {
    // Pending - show start screen
    if (activeAssessment.assessment.status === 'pending') {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBackToLobby}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="font-semibold">{activeAssessment.assessment.title}</h1>
                  <p className="text-xs text-muted-foreground">{notebook.name}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 py-8">
            <Card>
              <CardHeader className="text-center">
                <div className="text-4xl mb-4">
                  <ClipboardList className="h-12 w-12 mx-auto text-primary" />
                </div>
                <CardTitle>Ready to Begin?</CardTitle>
                <CardDescription>
                  {activeAssessment.questions.length} questions
                  {activeAssessment.hasTimeLimit && ` • ${activeAssessment.formattedTimeRemaining} time limit`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• No hints will be available during the assessment</p>
                  <p>• You can navigate between questions freely</p>
                  <p>• Your progress is saved automatically</p>
                  {activeAssessment.hasTimeLimit && (
                    <p className="font-medium text-orange-600">
                      • Assessment will auto-submit when time expires
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleBackToLobby}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartAssessment} className="min-w-[150px]">
                    Start Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    // In progress - show session
    if (activeAssessment.assessment.status === 'in_progress') {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="font-semibold">{activeAssessment.assessment.title}</h1>
                  <p className="text-xs text-muted-foreground">{notebook.name}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-4 py-6">
            <AssessmentSession
              questions={activeAssessment.questions}
              currentIndex={activeAssessment.currentIndex}
              currentQuestion={activeAssessment.currentQuestion}
              answers={activeAssessment.answers}
              timeRemaining={activeAssessment.timeRemaining}
              formattedTimeRemaining={activeAssessment.formattedTimeRemaining}
              progress={activeAssessment.progress}
              isComplete={activeAssessment.isComplete}
              isSubmitting={activeAssessment.isSubmitting}
              onSetAnswer={activeAssessment.setAnswer}
              onNavigateTo={activeAssessment.navigateTo}
              onNext={activeAssessment.nextQuestion}
              onPrev={activeAssessment.prevQuestion}
              onSaveProgress={activeAssessment.saveProgress}
              onSubmit={handleSubmitAssessment}
              onAbandon={handleAbandonAssessment}
            />
          </div>
        </div>
      )
    }

    // Completed - show results
    if (activeAssessment.assessment.status === 'completed' && activeAssessment.results) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBackToLobby}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="font-semibold">{activeAssessment.assessment.title} Results</h1>
                  <p className="text-xs text-muted-foreground">{notebook.name}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 py-8">
            <AssessmentResults
              assessment={activeAssessment.assessment}
              questions={activeAssessment.questions}
              results={activeAssessment.results}
              onExit={handleBackToLobby}
              onRetry={() => {
                handleBackToLobby()
                // Could trigger new assessment creation here
              }}
            />
          </div>
        </div>
      )
    }
  }

  // Main lobby view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/notebooks/${notebookId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold">Assessments</h1>
              <p className="text-xs text-muted-foreground">{notebook.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New Assessment</TabsTrigger>
            <TabsTrigger value="history">
              History
              {stats.total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.total}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* New Assessment Tab */}
          <TabsContent value="new" className="mt-6">
            <AssessmentLobby
              onStart={handleCreateAssessment}
              isCreating={isCreating}
              availableSkillCount={availableSkillCount}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {listLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assessments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No assessments yet</p>
                  <p className="text-sm">Create your first assessment to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{stats.completed}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{Math.round(stats.averageScore * 100)}%</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{stats.inProgress}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Assessment List */}
                <div className="space-y-2">
                  {assessments.map((assessment) => {
                    const typeInfo = getAssessmentTypeLabel(assessment.type)
                    const statusInfo = getAssessmentStatusLabel(assessment.status)

                    return (
                      <Card
                        key={assessment.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleContinueAssessment(assessment.id)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{assessment.title}</h4>
                                <Badge variant="outline" className={typeInfo.color}>
                                  {typeInfo.label}
                                </Badge>
                                <Badge variant="secondary" className={statusInfo.color}>
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {assessment.question_count} questions •
                                {assessment.completed_at
                                  ? ` Completed ${formatDistanceToNow(new Date(assessment.completed_at), { addSuffix: true })}`
                                  : ` Created ${formatDistanceToNow(new Date(assessment.created_at), { addSuffix: true })}`}
                              </p>
                            </div>
                            {assessment.score !== null && assessment.max_score && (
                              <div className="text-right">
                                <div className="text-2xl font-bold">
                                  {Math.round((assessment.score / assessment.max_score) * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assessment.score}/{assessment.max_score}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
