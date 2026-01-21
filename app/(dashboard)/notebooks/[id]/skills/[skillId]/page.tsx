'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, BookOpen, Target, Sparkles, AlertTriangle, Play, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotebook } from '@/hooks/useNotebooks'
import { useSkillPractice } from '@/hooks/usePractice'
import { useSkillDetails } from '@/hooks/useSkillDetails'
import {
  SkillMasteryGauge,
  PrerequisiteTree,
  PracticeHistory,
  ScaffoldLevel,
  NextReview,
} from '@/components/skills'
import { WorkedExample } from '@/components/practice'

interface SkillDetailPageProps {
  params: Promise<{ id: string; skillId: string }>
}

const BLOOM_LEVELS = [
  { level: 1, name: 'Remember', color: 'bg-red-100 text-red-800' },
  { level: 2, name: 'Understand', color: 'bg-orange-100 text-orange-800' },
  { level: 3, name: 'Apply', color: 'bg-yellow-100 text-yellow-800' },
  { level: 4, name: 'Analyze', color: 'bg-green-100 text-green-800' },
  { level: 5, name: 'Evaluate', color: 'bg-blue-100 text-blue-800' },
  { level: 6, name: 'Create', color: 'bg-purple-100 text-purple-800' },
]

export default function SkillDetailPage({ params }: SkillDetailPageProps) {
  const { id: notebookId, skillId } = use(params)
  const { notebook, loading: notebookLoading, error: notebookError } = useNotebook(notebookId)

  // Fetch skill details with learner state using the combined hook
  const {
    skill,
    learnerState,
    prerequisites,
    dependents,
    available,
    isLoading: skillLoading,
  } = useSkillDetails(notebookId, skillId)

  // Quick practice hook
  const quickPractice = useSkillPractice(notebookId, skillId)

  const isLoading = notebookLoading || skillLoading

  // Transform prerequisites and dependents to the format expected by PrerequisiteTree
  const prereqsForTree = prerequisites.map(p => ({
    id: p.skill.id,
    name: p.skill.name,
    pMastery: p.learnerState?.pMastery ?? 0,
  }))

  const dependentsForTree = dependents.map(d => ({
    id: d.skill.id,
    name: d.skill.name,
    pMastery: d.learnerState?.pMastery ?? 0,
  }))

  // Get Bloom level info
  const bloomInfo = skill ? BLOOM_LEVELS.find((b) => b.level === skill.bloomLevel) : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

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

  if (!skill) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Skill not found</h2>
        <p className="text-gray-500 mb-4">This skill could not be found in the knowledge graph.</p>
        <Button asChild>
          <Link href={`/notebooks/${notebookId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notebook
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/notebooks/${notebookId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">{skill.name}</h1>
                {skill.isThresholdConcept && (
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Threshold Concept
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {bloomInfo && (
                  <Badge variant="secondary" className={bloomInfo.color}>
                    {bloomInfo.name}
                  </Badge>
                )}
                <Badge variant="outline">
                  Difficulty: {Math.round((skill.difficulty || 0.5) * 100)}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href={`/notebooks/${notebookId}/practice?mode=skill&skillId=${skillId}`}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Practice
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="mastery">Mastery</TabsTrigger>
                <TabsTrigger value="practice">Practice</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {skill.description || 'No description available for this skill.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Prerequisite Tree */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Prerequisites & Dependencies</CardTitle>
                    <CardDescription>
                      Skills that lead to and build upon this skill
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PrerequisiteTree
                      currentSkill={{
                        id: skill.id,
                        name: skill.name,
                        pMastery: learnerState?.pMastery || 0,
                        isCurrent: true,
                      }}
                      prerequisites={prereqsForTree}
                      dependents={dependentsForTree}
                      onSkillClick={(id) => {
                        window.location.href = `/notebooks/${notebookId}/skills/${id}`
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Misconceptions */}
                {skill.commonMisconceptions && skill.commonMisconceptions.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Common Misconceptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {skill.commonMisconceptions.map((m, i) => (
                          <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {m}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Scaffolding Levels */}
                {skill.scaffoldingLevels && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Learning Support by Level</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(skill.scaffoldingLevels).map(([level, note]) => (
                        <div key={level} className="flex gap-3">
                          <Badge variant="outline" className="shrink-0">
                            {level.replace('level', 'Level ')}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{note as string}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Mastery Tab */}
              <TabsContent value="mastery" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mastery Stats */}
                  <Card className="text-center py-6">
                    <CardContent>
                      <SkillMasteryGauge
                        pMastery={learnerState?.pMastery || 0}
                        size="lg"
                        showThreshold
                        className="mx-auto"
                      />
                      <p className="text-sm text-muted-foreground mt-4">
                        {learnerState?.masteryStatus === 'mastered'
                          ? 'You have mastered this skill!'
                          : learnerState?.masteryStatus === 'learning'
                          ? 'Keep practicing to reach mastery'
                          : 'Start practicing to build mastery'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Scaffold Level */}
                  <ScaffoldLevel level={learnerState?.currentScaffoldLevel || 2} />
                </div>

                {/* Practice History */}
                {/* Note: Practice history would come from interactions data - currently showing summary stats */}
                <PracticeHistory attempts={[]} />

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{learnerState?.totalAttempts || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Attempts</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">
                        {learnerState?.totalAttempts
                          ? Math.round((learnerState.correctAttempts / learnerState.totalAttempts) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {learnerState?.consecutiveSuccesses || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Current Streak</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Practice Tab */}
              <TabsContent value="practice" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Quick Practice
                    </CardTitle>
                    <CardDescription>
                      Answer 3 questions to reinforce your understanding
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {quickPractice.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : quickPractice.hasQuestions ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {quickPractice.totalQuestions} questions available for quick practice
                        </p>
                        <Button asChild className="w-full">
                          <Link href={`/notebooks/${notebookId}/practice?mode=skill&skillId=${skillId}`}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Quick Practice
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No practice questions available yet
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Worked Example */}
                {quickPractice.currentQuestion?.workedExample && (
                  <WorkedExample content={quickPractice.currentQuestion.workedExample} />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Next Review */}
            <NextReview
              nextReviewAt={learnerState?.spacedRepetition?.nextReviewAt
                ? new Date(learnerState.spacedRepetition.nextReviewAt)
                : null}
              reviewCount={learnerState?.spacedRepetition?.repetitions || 0}
              easinessFactor={learnerState?.spacedRepetition?.easeFactor || 2.5}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/notebooks/${notebookId}/practice?mode=skill&skillId=${skillId}`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Full Practice Session
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/notebooks/${notebookId}/practice?mode=review`}>
                    <Clock className="h-4 w-4 mr-2" />
                    Spaced Review
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/notebooks/${notebookId}/path`}>
                    <Target className="h-4 w-4 mr-2" />
                    View Learning Path
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Related Skills */}
            {(prereqsForTree.length > 0 || dependentsForTree.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Related Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prereqsForTree.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Prerequisites</p>
                      <div className="space-y-1">
                        {prereqsForTree.slice(0, 3).map((prereq) => (
                          <Link
                            key={prereq.id}
                            href={`/notebooks/${notebookId}/skills/${prereq.id}`}
                            className="block text-sm text-primary hover:underline truncate"
                          >
                            {prereq.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {dependentsForTree.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Leads To</p>
                      <div className="space-y-1">
                        {dependentsForTree.slice(0, 3).map((dep) => (
                          <Link
                            key={dep.id}
                            href={`/notebooks/${notebookId}/skills/${dep.id}`}
                            className="block text-sm text-primary hover:underline truncate"
                          >
                            {dep.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
