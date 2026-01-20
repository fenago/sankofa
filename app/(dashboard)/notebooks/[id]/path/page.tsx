'use client'

import { use, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Map as MapIcon, Target, TrendingUp, BookOpen, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNotebook } from '@/hooks/useNotebooks'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-config'
import { PathVisualization } from '@/components/path'
import { ReactFlowProvider } from '@xyflow/react'

interface PathPageProps {
  params: Promise<{ id: string }>
}

interface GraphData {
  skills: Array<{
    skillId: string
    name: string
    pMastery: number
    scaffoldLevel: number
    bloomLevel: number
    difficulty: number
    prerequisites: string[]
    questionCount?: number
  }>
  edges: Array<{
    source: string
    target: string
    type: string
  }>
}

interface LearnerData {
  zpdSkills: Array<{
    skillId: string
    name: string
    pMastery: number
    scaffoldLevel: number
  }>
  masteryStats: {
    total: number
    mastered: number
    inProgress: number
    notStarted: number
  }
}

export default function PathPage({ params }: PathPageProps) {
  const { id: notebookId } = use(params)
  const router = useRouter()
  const { notebook, loading: notebookLoading, error: notebookError } = useNotebook(notebookId)

  // Fetch graph data with skills
  const {
    data: graphData,
    isLoading: graphLoading,
    error: graphError,
    mutate: refetchGraph,
  } = useSWR<GraphData>(
    notebookId ? `/api/notebooks/${notebookId}/graph?include=learnerState` : null,
    fetcher
  )

  // Fetch learner stats
  const {
    data: learnerData,
    isLoading: learnerLoading,
  } = useSWR<LearnerData>(
    notebookId ? `/api/notebooks/${notebookId}/learner?action=zpd` : null,
    fetcher
  )

  // Transform graph data to path format
  const pathSkills = useMemo(() => {
    if (!graphData?.skills) return []

    // Build prerequisite map from edges
    const prereqMap = new Map<string, string[]>()
    graphData.edges?.forEach((edge) => {
      if (edge.type === 'PREREQUISITE_FOR') {
        const prereqs = prereqMap.get(edge.target) || []
        prereqs.push(edge.source)
        prereqMap.set(edge.target, prereqs)
      }
    })

    return graphData.skills.map((skill) => ({
      skillId: skill.skillId,
      name: skill.name,
      pMastery: skill.pMastery || 0,
      scaffoldLevel: skill.scaffoldLevel || 1,
      bloomLevel: skill.bloomLevel || 1,
      difficulty: skill.difficulty || 5,
      prerequisites: prereqMap.get(skill.skillId) || [],
      questionCount: skill.questionCount,
    }))
  }, [graphData])

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!learnerData?.masteryStats) return 0
    const { total, mastered } = learnerData.masteryStats
    return total > 0 ? Math.round((mastered / total) * 100) : 0
  }, [learnerData])

  // Handle starting practice for a skill
  const handleStartPractice = useCallback(
    (skillId: string) => {
      router.push(`/notebooks/${notebookId}/practice?mode=skill&skillId=${skillId}`)
    },
    [notebookId, router]
  )

  // Loading state
  if (notebookLoading || graphLoading) {
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

  // No skills state
  if (pathSkills.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/notebooks/${notebookId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="font-semibold">Learning Path</h1>
                <p className="text-xs text-muted-foreground">{notebook.name}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <MapIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Skills Found</h2>
              <p className="text-muted-foreground mb-4">
                Add sources to your notebook to generate a knowledge graph with skills.
              </p>
              <Button asChild>
                <Link href={`/notebooks/${notebookId}`}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Go to Notebook
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/notebooks/${notebookId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="font-semibold">Learning Path</h1>
                <p className="text-xs text-muted-foreground">{notebook.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetchGraph()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button asChild>
                <Link href={`/notebooks/${notebookId}/practice`}>
                  <Target className="h-4 w-4 mr-2" />
                  Start Practice
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-6">
            {/* Overall Progress */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </div>

            {/* Stats */}
            {learnerData?.masteryStats && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {learnerData.masteryStats.mastered} Mastered
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {learnerData.masteryStats.inProgress} In Progress
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    {learnerData.masteryStats.notStarted} Not Started
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{learnerData.masteryStats.total} Total Skills</Badge>
                </div>
              </div>
            )}

            {/* ZPD Indicator */}
            {learnerData?.zpdSkills && learnerData.zpdSkills.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  {learnerData.zpdSkills.length} skills ready to learn
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <PathVisualization
            notebookId={notebookId}
            skills={pathSkills}
            masteryThreshold={0.8}
            onStartPractice={handleStartPractice}
            className="h-full"
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
