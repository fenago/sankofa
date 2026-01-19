'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, BookOpen, Brain, Target, AlertTriangle, Lightbulb, RefreshCw, Clock, Layers, GitBranch, Route, GraduationCap, ClipboardCheck, Footprints, XCircle, Globe, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface PageProps {
  params: Promise<{ id: string }>
}

interface Skill {
  id: string
  name: string
  description?: string
  bloomLevel: number
  bloomVerb?: string
  estimatedMinutes?: number
  isThresholdConcept?: boolean
  thresholdProperties?: string[]
  cognitiveLoadEstimate?: string
  elementInteractivity?: string
  chunksRequired?: number
  irt?: {
    difficulty: number
    discrimination: number
    guessing: number
  }
  commonMisconceptions?: string[]
  assessmentTypes?: string[]
  scaffoldingLevels?: string[]
  transferDomains?: string[]
}

interface BloomStage {
  bloomLevel: number
  bloomLabel: string
  skills: Skill[]
  totalMinutes: number
  thresholdCount: number
}

interface CurriculumOverview {
  stages: BloomStage[]
  totalSkills: number
  totalMinutes: number
  totalThresholdConcepts: number
}

const bloomLevelColors: Record<number, string> = {
  1: 'bg-red-100 text-red-800 border-red-200',
  2: 'bg-orange-100 text-orange-800 border-orange-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  4: 'bg-green-100 text-green-800 border-green-200',
  5: 'bg-blue-100 text-blue-800 border-blue-200',
  6: 'bg-purple-100 text-purple-800 border-purple-200',
}

const bloomVerbs: Record<number, { verbs: string; assessments: string }> = {
  1: { verbs: 'Define, list, recall, identify', assessments: 'Multiple choice, fill-in-blank, matching' },
  2: { verbs: 'Explain, summarize, classify, compare', assessments: 'Short answer, explain in own words' },
  3: { verbs: 'Execute, implement, solve, demonstrate', assessments: 'Problem solving, case studies' },
  4: { verbs: 'Differentiate, organize, attribute, compare', assessments: 'Compare/contrast, categorization' },
  5: { verbs: 'Critique, justify, assess, argue', assessments: 'Critique, defend a position' },
  6: { verbs: 'Design, construct, develop, formulate', assessments: 'Design projects, original solutions' },
}

const cognitiveLoadColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

// Collapsible Feature Section Component
function FeatureSection({
  icon: Icon,
  number,
  title,
  subtitle,
  theory,
  researcher,
  children,
  defaultOpen = false
}: {
  icon: React.ElementType
  number: number
  title: string
  subtitle: string
  theory: string
  researcher: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <Icon className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-blue-600 text-sm font-normal">#{number}</span>
                {title}
              </CardTitle>
              <CardDescription className="mt-1">{subtitle}</CardDescription>
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <span className="font-medium text-amber-900">{theory}</span>
                <span className="text-amber-700"> — {researcher}</span>
              </div>
            </div>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </CardHeader>
      {isOpen && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

export default function CurriculumPage({ params }: PageProps) {
  const { id: notebookId } = use(params)
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [overview, setOverview] = useState<CurriculumOverview | null>(null)
  const [entryPoints, setEntryPoints] = useState<Skill[]>([])
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState(true)

  const fetchCurriculum = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/graph/learning-path?action=overview`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch curriculum')
      }

      setAvailable(data.available !== false)
      setOverview(data.overview || null)
      setEntryPoints(data.entryPoints || [])

      if (data.message && (!data.overview || data.overview.totalSkills === 0)) {
        setError(data.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }

  const extractGraph = async () => {
    setExtracting(true)
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebuild: true }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract graph')
      }

      toast({
        title: 'Knowledge graph extracted',
        description: `Found ${data.skills} skills, ${data.entities} entities, ${data.prerequisites} prerequisites`,
      })

      await fetchCurriculum()
    } catch (e) {
      toast({
        title: 'Extraction failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setExtracting(false)
    }
  }

  useEffect(() => {
    fetchCurriculum()
  }, [notebookId])

  const allSkills = overview?.stages?.flatMap(s => s.skills) || []
  const thresholdConcepts = allSkills.filter(s => s.isThresholdConcept)
  const highLoadSkills = allSkills.filter(s => s.cognitiveLoadEstimate === 'high')
  const skillsWithMisconceptions = allSkills.filter(s => s.commonMisconceptions && s.commonMisconceptions.length > 0)
  const skillsWithIRT = allSkills.filter(s => s.irt)
  const skillsWithTransfer = allSkills.filter(s => s.transferDomains && s.transferDomains.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/notebooks/${notebookId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Content-Only Features</h1>
                <p className="text-sm text-gray-500">10 features powered by educational psychology research</p>
              </div>
            </div>
            <Button
              onClick={extractGraph}
              disabled={extracting}
              variant="outline"
              className="gap-2"
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {extracting ? 'Extracting...' : 'Re-extract Graph'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !available ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Knowledge Graph Not Available</h2>
            <p className="text-gray-500 mb-4">Neo4J connection required for these features.</p>
          </div>
        ) : error && (!overview || overview.totalSkills === 0) ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Skills Extracted Yet</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={extractGraph} disabled={extracting} className="gap-2">
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Extract Knowledge Graph
            </Button>
          </div>
        ) : overview ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Layers className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{overview.totalSkills}</div>
                  <div className="text-xs text-gray-500">Total Skills</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Lightbulb className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{overview.totalThresholdConcepts}</div>
                  <div className="text-xs text-gray-500">Threshold Concepts</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Brain className="h-6 w-6 text-red-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{highLoadSkills.length}</div>
                  <div className="text-xs text-gray-500">High Cognitive Load</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Clock className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{Math.round(overview.totalMinutes / 60)}h</div>
                  <div className="text-xs text-gray-500">Est. Learning Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Target className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{entryPoints.length}</div>
                  <div className="text-xs text-gray-500">Entry Points</div>
                </CardContent>
              </Card>
            </div>

            {/* Feature 1: Curriculum Overview */}
            <FeatureSection
              icon={GraduationCap}
              number={1}
              title="Curriculum Overview"
              subtitle="Organizes all extracted skills by Bloom's Taxonomy levels with time estimates"
              theory="Bloom's Revised Taxonomy"
              researcher="Anderson & Krathwohl (2001)"
              defaultOpen={true}
            >
              <div className="space-y-4">
                {/* Bloom's Taxonomy Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border">Level</th>
                        <th className="px-3 py-2 text-left border">Cognitive Process</th>
                        <th className="px-3 py-2 text-left border">Example Verbs</th>
                        <th className="px-3 py-2 text-left border">Your Skills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.stages.map(stage => (
                        <tr key={stage.bloomLevel}>
                          <td className="px-3 py-2 border">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${bloomLevelColors[stage.bloomLevel]}`}>
                              {stage.bloomLevel}. {stage.bloomLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 border text-gray-600">{bloomVerbs[stage.bloomLevel]?.verbs}</td>
                          <td className="px-3 py-2 border text-gray-600">{bloomVerbs[stage.bloomLevel]?.assessments}</td>
                          <td className="px-3 py-2 border font-medium">{stage.skills.length} skills ({stage.totalMinutes}min)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actual Skills */}
                <div className="space-y-4">
                  {overview.stages.filter(s => s.skills.length > 0).map(stage => (
                    <div key={stage.bloomLevel}>
                      <h4 className={`px-3 py-1 rounded-t text-sm font-medium ${bloomLevelColors[stage.bloomLevel]}`}>
                        Level {stage.bloomLevel}: {stage.bloomLabel} ({stage.skills.length})
                      </h4>
                      <div className="grid gap-2 p-3 bg-gray-50 rounded-b border border-t-0">
                        {stage.skills.map(skill => (
                          <div key={skill.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <span className="font-medium text-sm">{skill.name}</span>
                              {skill.description && <p className="text-xs text-gray-500">{skill.description}</p>}
                            </div>
                            <span className="text-xs text-gray-400">{skill.estimatedMinutes || 30}min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FeatureSection>

            {/* Feature 2: Prerequisite Visualization */}
            <FeatureSection
              icon={GitBranch}
              number={2}
              title="Prerequisite Visualization"
              subtitle="Displays skill dependencies with relationship strengths (required, recommended, helpful)"
              theory="Learning Hierarchies"
              researcher="Gagné (1985)"
            >
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border">Relationship</th>
                        <th className="px-3 py-2 text-left border">Meaning</th>
                        <th className="px-3 py-2 text-left border">Implication</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-3 py-2 border font-medium text-red-700">Required</td><td className="px-3 py-2 border">Must master before proceeding</td><td className="px-3 py-2 border">Gate progression on this skill</td></tr>
                      <tr><td className="px-3 py-2 border font-medium text-yellow-700">Recommended</td><td className="px-3 py-2 border">Significantly helps learning</td><td className="px-3 py-2 border">Review before teaching/learning</td></tr>
                      <tr><td className="px-3 py-2 border font-medium text-green-700">Helpful</td><td className="px-3 py-2 border">Provides useful context</td><td className="px-3 py-2 border">Mention as connection</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <strong>Pro Tip:</strong> Studies show 50%+ of learning failures trace back to missing prerequisites.
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Entry points (skills with no prerequisites): <strong>{entryPoints.length}</strong></p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entryPoints.slice(0, 10).map(ep => (
                      <span key={ep.id} className="px-2 py-1 bg-white border rounded text-xs">{ep.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FeatureSection>

            {/* Feature 3: Learning Path Generation */}
            <FeatureSection
              icon={Route}
              number={3}
              title="Learning Path Generation"
              subtitle="Creates optimal sequence from any starting point to any goal skill using topological sorting"
              theory="Instructional Sequencing"
              researcher="Reigeluth (1999)"
            >
              <div className="p-3 bg-gray-50 rounded text-sm">
                <p className="mb-2">Proper sequencing (simple→complex, concrete→abstract, prerequisite→dependent) reduces extraneous cognitive load.</p>
                <code className="block p-2 bg-gray-800 text-green-400 rounded text-xs">
                  GET /api/notebooks/{notebookId}/graph/learning-path?action=path&goal=skillId
                </code>
              </div>
            </FeatureSection>

            {/* Feature 4: Threshold Concepts */}
            <FeatureSection
              icon={Lightbulb}
              number={4}
              title="Threshold Concept Identification"
              subtitle="Highlights transformative concepts that fundamentally change learner understanding"
              theory="Threshold Concepts Framework"
              researcher="Meyer & Land (2003)"
            >
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border">Property</th>
                        <th className="px-3 py-2 text-left border">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-3 py-2 border font-medium">Transformative</td><td className="px-3 py-2 border">Changes how learners see the subject</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">Irreversible</td><td className="px-3 py-2 border">Once understood, hard to unlearn</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">Integrative</td><td className="px-3 py-2 border">Connects previously separate ideas</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">Troublesome</td><td className="px-3 py-2 border">Often counterintuitive or difficult</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">Bounded</td><td className="px-3 py-2 border">Defines the discipline's borders</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong className="text-yellow-800">Your Threshold Concepts ({thresholdConcepts.length}):</strong>
                  {thresholdConcepts.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {thresholdConcepts.map(tc => (
                        <div key={tc.id} className="p-2 bg-white border border-yellow-200 rounded">
                          <span className="font-medium">{tc.name}</span>
                          <span className="text-xs text-gray-500 ml-2">(requires 90% mastery vs 80%)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-700 mt-1">No threshold concepts identified in current extraction.</p>
                  )}
                </div>
              </div>
            </FeatureSection>

            {/* Feature 5: Cognitive Load */}
            <FeatureSection
              icon={Brain}
              number={5}
              title="Cognitive Load Estimation"
              subtitle="Identifies high-load skills that may overwhelm working memory"
              theory="Cognitive Load Theory"
              researcher="Sweller (1988)"
            >
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border">Property</th>
                        <th className="px-3 py-2 text-left border">What It Measures</th>
                        <th className="px-3 py-2 text-left border">Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-3 py-2 border font-medium">cognitiveLoadEstimate</td><td className="px-3 py-2 border">Overall cognitive demand</td><td className="px-3 py-2 border">low, medium, high</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">elementInteractivity</td><td className="px-3 py-2 border">Simultaneous element processing</td><td className="px-3 py-2 border">low, medium, high</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">chunksRequired</td><td className="px-3 py-2 border">Working memory slots needed</td><td className="px-3 py-2 border">2-7 (Miller's Law)</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {['low', 'medium', 'high'].map(level => {
                    const count = allSkills.filter(s => s.cognitiveLoadEstimate === level).length
                    return (
                      <div key={level} className={`p-3 rounded border ${cognitiveLoadColors[level] || 'bg-gray-100'}`}>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-xs capitalize">{level} Load Skills</div>
                      </div>
                    )
                  })}
                </div>
                {highLoadSkills.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <strong className="text-red-800">High Load Skills (need extra scaffolding):</strong>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {highLoadSkills.map(s => (
                        <span key={s.id} className="px-2 py-1 bg-white border border-red-200 rounded text-xs">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FeatureSection>

            {/* Feature 6: Assessment Suggestions */}
            <FeatureSection
              icon={ClipboardCheck}
              number={6}
              title="Assessment Suggestions"
              subtitle="Provides Bloom-aligned assessment ideas and question types for each skill"
              theory="Constructive Alignment"
              researcher="Biggs (1996)"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border">Bloom Level</th>
                      <th className="px-3 py-2 text-left border">Appropriate Assessment Types</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-3 py-2 border"><span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">Remember</span></td><td className="px-3 py-2 border">Multiple choice, fill-in-blank, matching</td></tr>
                    <tr><td className="px-3 py-2 border"><span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">Understand</span></td><td className="px-3 py-2 border">Short answer, explain in own words</td></tr>
                    <tr><td className="px-3 py-2 border"><span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Apply</span></td><td className="px-3 py-2 border">Problem solving, case studies</td></tr>
                    <tr><td className="px-3 py-2 border"><span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Analyze</span></td><td className="px-3 py-2 border">Compare/contrast, categorization</td></tr>
                    <tr><td className="px-3 py-2 border"><span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Evaluate</span></td><td className="px-3 py-2 border">Critique, defend a position</td></tr>
                    <tr><td className="px-3 py-2 border"><span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">Create</span></td><td className="px-3 py-2 border">Design projects, original solutions</td></tr>
                  </tbody>
                </table>
              </div>
            </FeatureSection>

            {/* Feature 7: Scaffolding Guidance */}
            <FeatureSection
              icon={Footprints}
              number={7}
              title="Scaffolding Guidance"
              subtitle="Provides 4-level support descriptions from full worked examples to independent practice"
              theory="Zone of Proximal Development / Scaffolding"
              researcher="Vygotsky; Wood, Bruner & Ross (1976)"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border">Level</th>
                      <th className="px-3 py-2 text-left border">Support Type</th>
                      <th className="px-3 py-2 text-left border">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-3 py-2 border font-medium">1</td><td className="px-3 py-2 border">Full worked examples</td><td className="px-3 py-2 border">Complete solution demonstrated step-by-step</td></tr>
                    <tr><td className="px-3 py-2 border font-medium">2</td><td className="px-3 py-2 border">Partial solutions</td><td className="px-3 py-2 border">Worked example with blanks to fill</td></tr>
                    <tr><td className="px-3 py-2 border font-medium">3</td><td className="px-3 py-2 border">Hints on request</td><td className="px-3 py-2 border">Student attempts first, help available</td></tr>
                    <tr><td className="px-3 py-2 border font-medium">4</td><td className="px-3 py-2 border">Independent practice</td><td className="px-3 py-2 border">Student works without assistance</td></tr>
                  </tbody>
                </table>
              </div>
            </FeatureSection>

            {/* Feature 8: Common Misconceptions */}
            <FeatureSection
              icon={XCircle}
              number={8}
              title="Common Misconceptions"
              subtitle="Lists known misconceptions students typically have about each skill"
              theory="Conceptual Change Theory"
              researcher="Posner et al. (1982)"
            >
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                  <strong>Key Insight:</strong> Simply teaching correct information doesn't eliminate misconceptions; they must be directly confronted through refutation texts and explicit correction.
                </div>
                <div>
                  <strong>Skills with identified misconceptions ({skillsWithMisconceptions.length}):</strong>
                  {skillsWithMisconceptions.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {skillsWithMisconceptions.map(s => (
                        <div key={s.id} className="p-2 bg-gray-50 border rounded">
                          <span className="font-medium">{s.name}</span>
                          <ul className="mt-1 ml-4 text-sm text-orange-700 list-disc">
                            {s.commonMisconceptions?.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No misconceptions identified in current extraction.</p>
                  )}
                </div>
              </div>
            </FeatureSection>

            {/* Feature 9: Transfer Domains */}
            <FeatureSection
              icon={Globe}
              number={9}
              title="Transfer Domains"
              subtitle="Shows where each skill applies in other contexts and disciplines"
              theory="Transfer of Learning"
              researcher="Perkins & Salomon (1988)"
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Students often fail to apply knowledge outside the original context unless explicitly taught to do so.</p>
                {skillsWithTransfer.length > 0 ? (
                  <div className="space-y-2">
                    {skillsWithTransfer.map(s => (
                      <div key={s.id} className="p-2 bg-gray-50 border rounded">
                        <span className="font-medium">{s.name}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.transferDomains?.map((d, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{d}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No transfer domains identified in current extraction.</p>
                )}
              </div>
            </FeatureSection>

            {/* Feature 10: IRT Difficulty */}
            <FeatureSection
              icon={BarChart3}
              number={10}
              title="IRT-Based Difficulty Calibration"
              subtitle="Psychometrically calibrated difficulty parameters for adaptive question selection"
              theory="Item Response Theory (3PL Model)"
              researcher="Lord (1980)"
            >
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border">Parameter</th>
                        <th className="px-3 py-2 text-left border">Symbol</th>
                        <th className="px-3 py-2 text-left border">Range</th>
                        <th className="px-3 py-2 text-left border">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-3 py-2 border font-medium">Difficulty</td><td className="px-3 py-2 border">b</td><td className="px-3 py-2 border">-3 to +3</td><td className="px-3 py-2 border">How hard (0 = average ability)</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">Discrimination</td><td className="px-3 py-2 border">a</td><td className="px-3 py-2 border">0.5 to 2.5</td><td className="px-3 py-2 border">How well it separates ability levels</td></tr>
                      <tr><td className="px-3 py-2 border font-medium">Guessing</td><td className="px-3 py-2 border">c</td><td className="px-3 py-2 border">0 to 0.5</td><td className="px-3 py-2 border">Probability of correct guess</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-gray-800 text-green-400 rounded font-mono text-xs">
                  P(correct) = c + (1-c) / (1 + e^(-a(θ-b)))
                </div>
                {skillsWithIRT.length > 0 ? (
                  <div className="space-y-2">
                    {skillsWithIRT.slice(0, 5).map(s => (
                      <div key={s.id} className="p-2 bg-gray-50 border rounded flex items-center justify-between">
                        <span className="font-medium text-sm">{s.name}</span>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-blue-100 rounded">b={s.irt?.difficulty.toFixed(2)}</span>
                          <span className="px-2 py-0.5 bg-green-100 rounded">a={s.irt?.discrimination.toFixed(2)}</span>
                          <span className="px-2 py-0.5 bg-purple-100 rounded">c={s.irt?.guessing.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No IRT parameters in current extraction.</p>
                )}
              </div>
            </FeatureSection>
          </div>
        ) : null}

        {/* Navigation */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/for-teachers`}>For Teachers →</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/for-students`}>For Students →</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
