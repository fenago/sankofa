'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, BookOpen, Brain, Target, AlertTriangle, Lightbulb, RefreshCw, Clock, Layers, GitBranch, Route, GraduationCap, ClipboardCheck, Footprints, XCircle, Globe, BarChart3, ChevronDown, ChevronUp, X, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArtifactGenerator } from '@/components/artifacts/ArtifactGenerator'

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

// Clickable Stat Card Component
function StatCard({
  icon: Icon,
  value,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
      onClick={onClick}
    >
      <CardContent className="pt-4 text-center">
        <Icon className={`h-6 w-6 ${color} mx-auto mb-1 group-hover:scale-110 transition-transform`} />
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to explore →</div>
      </CardContent>
    </Card>
  )
}

// Stat Detail Modal Component
function StatDetailModal({
  type,
  onClose,
  allSkills,
  thresholdConcepts,
  highLoadSkills,
  entryPoints,
  overview,
}: {
  type: 'skills' | 'threshold' | 'cognitive' | 'time' | 'entry'
  onClose: () => void
  allSkills: Skill[]
  thresholdConcepts: Skill[]
  highLoadSkills: Skill[]
  entryPoints: Skill[]
  overview: CurriculumOverview
}) {
  const config = {
    skills: {
      title: 'Total Skills',
      icon: Layers,
      iconColor: 'text-blue-500',
      bgColor: 'from-blue-600 to-blue-700',
      explanation: 'Skills are the discrete learning objectives extracted from your content. Each skill represents a specific competency that learners should be able to demonstrate after instruction.',
      importance: 'Knowing the total skill count helps you: (1) Estimate course duration, (2) Plan assessment scope, (3) Identify coverage gaps, (4) Balance curriculum breadth vs depth.',
      items: allSkills,
      renderItem: (skill: Skill) => (
        <div key={skill.id} className="p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{skill.name}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${bloomLevelColors[skill.bloomLevel]}`}>
              Level {skill.bloomLevel}
            </span>
          </div>
          {skill.description && <p className="text-xs text-gray-500 mt-1">{skill.description}</p>}
          <div className="flex gap-2 mt-2 text-xs text-gray-400">
            <span>{skill.estimatedMinutes || 30} min</span>
            {skill.cognitiveLoadEstimate && <span>• {skill.cognitiveLoadEstimate} load</span>}
          </div>
        </div>
      ),
    },
    threshold: {
      title: 'Threshold Concepts',
      icon: Lightbulb,
      iconColor: 'text-yellow-500',
      bgColor: 'from-yellow-500 to-amber-600',
      explanation: 'Threshold concepts are transformative ideas that fundamentally change how learners understand a subject. Once grasped, they open up previously inaccessible ways of thinking. They are characterized by being: Transformative (changes worldview), Irreversible (hard to unlearn), Integrative (connects ideas), Troublesome (often counterintuitive), and Bounded (defines discipline limits).',
      importance: 'Threshold concepts are critical because: (1) They require 90% mastery vs 80% for regular skills, (2) Students often get "stuck" at these points, (3) They unlock understanding of subsequent material, (4) Extra instructional time and support should be allocated here.',
      items: thresholdConcepts,
      renderItem: (skill: Skill) => (
        <div key={skill.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-sm">{skill.name}</span>
          </div>
          {skill.thresholdProperties && skill.thresholdProperties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {skill.thresholdProperties.map((prop, i) => (
                <span key={i} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">{prop}</span>
              ))}
            </div>
          )}
          {skill.description && <p className="text-xs text-gray-600 mt-2">{skill.description}</p>}
        </div>
      ),
    },
    cognitive: {
      title: 'High Cognitive Load Skills',
      icon: Brain,
      iconColor: 'text-red-500',
      bgColor: 'from-red-500 to-rose-600',
      explanation: 'Cognitive Load Theory (Sweller, 1988) states that working memory has limited capacity. High cognitive load skills require processing many elements simultaneously, which can overwhelm learners if not properly scaffolded.',
      importance: 'High cognitive load skills need special attention: (1) Break into smaller sub-skills, (2) Provide worked examples first, (3) Use diagrams to reduce verbal processing, (4) Allow more practice time, (5) Reduce extraneous information during instruction.',
      items: highLoadSkills,
      renderItem: (skill: Skill) => (
        <div key={skill.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{skill.name}</span>
            <div className="flex gap-1">
              {skill.elementInteractivity && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">{skill.elementInteractivity} interactivity</span>
              )}
              {skill.chunksRequired && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">{skill.chunksRequired} chunks</span>
              )}
            </div>
          </div>
          {skill.description && <p className="text-xs text-gray-600 mt-2">{skill.description}</p>}
        </div>
      ),
    },
    time: {
      title: 'Estimated Learning Time',
      icon: Clock,
      iconColor: 'text-green-500',
      bgColor: 'from-green-500 to-emerald-600',
      explanation: 'Learning time estimates are calculated based on skill complexity, Bloom\'s taxonomy level, and cognitive load. Higher-level skills (Analyze, Evaluate, Create) typically require more time than lower-level skills (Remember, Understand).',
      importance: 'Accurate time estimates help you: (1) Plan realistic course schedules, (2) Set learner expectations, (3) Identify time-intensive sections, (4) Balance workload across modules, (5) Justify curriculum decisions to stakeholders.',
      items: overview.stages,
      renderItem: (stage: BloomStage) => (
        <div key={stage.bloomLevel} className="p-3 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-xs font-medium ${bloomLevelColors[stage.bloomLevel]}`}>
              Level {stage.bloomLevel}: {stage.bloomLabel}
            </span>
            <span className="font-bold text-green-700">{stage.totalMinutes} min</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{stage.skills.length} skills</span>
            <span>~{Math.round(stage.totalMinutes / Math.max(stage.skills.length, 1))} min/skill avg</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${Math.min((stage.totalMinutes / overview.totalMinutes) * 100, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    entry: {
      title: 'Entry Points',
      icon: Target,
      iconColor: 'text-purple-500',
      bgColor: 'from-purple-500 to-violet-600',
      explanation: 'Entry points are skills with no prerequisites—where learners can begin studying. They represent the foundational concepts that don\'t depend on prior domain knowledge (within this content).',
      importance: 'Entry points are valuable for: (1) Onboarding new learners, (2) Diagnostic assessments (test these first), (3) Identifying starting points for different learner levels, (4) Creating multiple learning paths, (5) Ensuring content accessibility.',
      items: entryPoints,
      renderItem: (skill: Skill) => (
        <div key={skill.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-sm">{skill.name}</span>
          </div>
          <div className="flex gap-2 mt-2 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded ${bloomLevelColors[skill.bloomLevel]}`}>
              Level {skill.bloomLevel}
            </span>
            <span>{skill.estimatedMinutes || 30} min</span>
          </div>
          {skill.description && <p className="text-xs text-gray-600 mt-2">{skill.description}</p>}
        </div>
      ),
    },
  }

  const currentConfig = config[type]
  const IconComponent = currentConfig.icon

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentConfig.bgColor} px-6 py-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{currentConfig.title}</h3>
                <p className="text-white/80 text-sm">{currentConfig.items.length} items</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Explanation */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              What is this?
            </h4>
            <p className="text-sm text-blue-800">{currentConfig.explanation}</p>
          </div>

          {/* Why it matters */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Why does this matter?
            </h4>
            <p className="text-sm text-amber-800">{currentConfig.importance}</p>
          </div>

          {/* Items list */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">
              {type === 'time' ? 'Time by Bloom\'s Level' : `All ${currentConfig.title}`} ({currentConfig.items.length})
            </h4>
            {currentConfig.items.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                {currentConfig.items.map((item) => currentConfig.renderItem(item as any))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <IconComponent className={`h-12 w-12 mx-auto mb-2 opacity-30 ${currentConfig.iconColor}`} />
                <p>No items found in this category.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [expandedStat, setExpandedStat] = useState<'skills' | 'threshold' | 'cognitive' | 'time' | 'entry' | null>(null)

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

      // Set first skill as selected for artifact generation
      if (data.overview?.stages) {
        const allSkills = data.overview.stages.flatMap((s: BloomStage) => s.skills)
        if (allSkills.length > 0 && !selectedSkill) {
          setSelectedSkill(allSkills[0])
        }
      }

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
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild className="gap-2">
                <Link href={`/notebooks/${notebookId}/library`}>
                  <Library className="h-4 w-4" />
                  Artifact Library
                </Link>
              </Button>
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
            {/* Summary Stats - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard
                icon={Layers}
                value={overview.totalSkills}
                label="Total Skills"
                color="text-blue-500"
                onClick={() => setExpandedStat('skills')}
              />
              <StatCard
                icon={Lightbulb}
                value={overview.totalThresholdConcepts}
                label="Threshold Concepts"
                color="text-yellow-500"
                onClick={() => setExpandedStat('threshold')}
              />
              <StatCard
                icon={Brain}
                value={highLoadSkills.length}
                label="High Cognitive Load"
                color="text-red-500"
                onClick={() => setExpandedStat('cognitive')}
              />
              <StatCard
                icon={Clock}
                value={`${Math.round(overview.totalMinutes / 60)}h`}
                label="Est. Learning Time"
                color="text-green-500"
                onClick={() => setExpandedStat('time')}
              />
              <StatCard
                icon={Target}
                value={entryPoints.length}
                label="Entry Points"
                color="text-purple-500"
                onClick={() => setExpandedStat('entry')}
              />
            </div>

            {/* Stat Detail Modal */}
            {expandedStat && overview && (
              <StatDetailModal
                type={expandedStat}
                onClose={() => setExpandedStat(null)}
                allSkills={allSkills}
                thresholdConcepts={thresholdConcepts}
                highLoadSkills={highLoadSkills}
                entryPoints={entryPoints}
                overview={overview}
              />
            )}

            {/* Skill Selector for Visual Artifacts */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-medium text-purple-900">Generate Visual Artifacts</h3>
                    <p className="text-sm text-purple-700">Select a skill to create illustrated educational materials</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-64 flex items-center justify-between px-4 py-2 bg-white border border-purple-300 rounded-lg shadow-sm hover:border-purple-500 transition-colors"
                    >
                      <div className="text-left truncate">
                        <div className="font-medium text-sm">{selectedSkill?.name || 'Select a skill'}</div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute z-50 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {allSkills.map((skill) => (
                          <button
                            key={skill.id}
                            onClick={() => {
                              setSelectedSkill(skill)
                              setDropdownOpen(false)
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 text-sm ${
                              selectedSkill?.id === skill.id ? 'bg-purple-50' : ''
                            }`}
                          >
                            <div className="font-medium truncate">{skill.name}</div>
                            <div className="text-xs text-gray-500">
                              Level {skill.bloomLevel} • {skill.cognitiveLoadEstimate || 'Medium'} Load
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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

                {/* Visual Artifacts */}
                <ArtifactGenerator
                  notebookId={notebookId}
                  skill={selectedSkill}
                  toolId="curriculum-overview"
                  audience="curriculum"
                />
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

                {/* Visual Artifacts */}
                <ArtifactGenerator
                  notebookId={notebookId}
                  skill={selectedSkill}
                  toolId="threshold-concepts"
                  audience="curriculum"
                />
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

                {/* Visual Artifacts */}
                <ArtifactGenerator
                  notebookId={notebookId}
                  skill={selectedSkill}
                  toolId="cognitive-load"
                  audience="curriculum"
                />
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

              {/* Visual Artifacts */}
              <ArtifactGenerator
                notebookId={notebookId}
                skill={selectedSkill}
                toolId="assessment-suggestions"
                audience="curriculum"
              />
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
