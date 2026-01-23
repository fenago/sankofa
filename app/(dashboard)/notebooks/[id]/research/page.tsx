'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Brain, FlaskConical, Lightbulb, Target, Clock, Users, BarChart3, GitBranch, CheckCircle2, AlertTriangle, ExternalLink, FileText, GraduationCap, Layers, Shield, TrendingUp, Zap, Eye, Hand, MessageCircle, Coffee, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: Promise<{ id: string }>
}

// Framework categories
const contentAnalysisFrameworks = [
  {
    name: "Bloom's Taxonomy (Revised 2001)",
    researcher: "Anderson & Krathwohl",
    icon: GraduationCap,
    description: "6 cognitive levels: Remember, Understand, Apply, Analyze, Evaluate, Create",
    application: "Every skill is classified by cognitive complexity level",
    status: "implemented" as const,
  },
  {
    name: "Item Response Theory (3PL)",
    researcher: "Lord (1980)",
    icon: BarChart3,
    description: "Psychometric parameters: difficulty (b), discrimination (a), guessing (c)",
    application: "Predicts learner success probability at any ability level",
    status: "implemented" as const,
  },
  {
    name: "Threshold Concepts",
    researcher: "Meyer & Land (2003)",
    icon: Lightbulb,
    description: "Transformative, irreversible concepts that unlock entire domains",
    application: "Identifies gateway knowledge worth extra investment",
    status: "implemented" as const,
  },
  {
    name: "Cognitive Load Theory",
    researcher: "Sweller (1988)",
    icon: Brain,
    description: "Working memory limits, element interactivity, chunking",
    application: "Prevents overload; optimizes learning sequence",
    status: "implemented" as const,
  },
  {
    name: "Instructional Scaffolding",
    researcher: "Vygotsky, Wood, Bruner, Ross (1976)",
    icon: Layers,
    description: "4 support levels from full worked examples to independent practice",
    application: "Systematic independence building with appropriate support",
    status: "implemented" as const,
  },
  {
    name: "Mastery Learning",
    researcher: "Bloom (1968)",
    icon: CheckCircle2,
    description: "80% for standard skills, 90% for threshold concepts",
    application: "Clear, research-based definition of 'learned'",
    status: "implemented" as const,
  },
  {
    name: "Misconception Detection",
    researcher: "Cognitive Science",
    icon: AlertTriangle,
    description: "Common errors and troublesome aspects per skill",
    application: "Proactive error prevention and targeted remediation",
    status: "implemented" as const,
  },
  {
    name: "Spaced Repetition Intervals",
    researcher: "Wozniak (1987), Ebbinghaus (1885)",
    icon: Clock,
    description: "Default intervals: 1, 3, 7, 14, 30, 60 days",
    application: "Optimizes long-term retention; prevents knowledge decay",
    status: "implemented" as const,
  },
  {
    name: "Prerequisite Relationship Mapping",
    researcher: "Learning Progression Research",
    icon: GitBranch,
    description: "Required/recommended/helpful strength relationships",
    application: "Ensures proper learning sequence; prevents frustration",
    status: "implemented" as const,
  },
]

const inverseProfilingFrameworks = [
  {
    name: "Bayesian Knowledge Tracing (BKT)",
    researcher: "Corbett & Anderson (1995)",
    icon: Target,
    description: "P(Mastery) 0-1 with 4 parameters: pL0, pT, pS, pG",
    application: "Real probabilistic mastery, not just % correct",
    status: "implemented" as const,
  },
  {
    name: "Zone of Proximal Development (ZPD)",
    researcher: "Vygotsky (1978)",
    icon: TrendingUp,
    description: "Readiness score from prerequisite mastery",
    application: "Always working in productive struggle zone",
    status: "implemented" as const,
  },
  {
    name: "SM-2 Spaced Repetition",
    researcher: "Wozniak (1987)",
    icon: Clock,
    description: "Personal ease factor and intervals based on response quality",
    application: "Personalized retention optimization",
    status: "implemented" as const,
  },
  {
    name: "Dynamic Scaffold Adaptation",
    researcher: "Scaffolding Fading Research",
    icon: Layers,
    description: "Auto-adjusts support level (L1-L4) based on P(Mastery)",
    application: "Right amount of help at all times",
    status: "implemented" as const,
  },
  {
    name: "Metacognitive Calibration",
    researcher: "Zimmerman (2002)",
    icon: Eye,
    description: "Confidence predictions vs actual performance",
    application: "Reveals overconfidence and underconfidence",
    status: "implemented" as const,
  },
  {
    name: "Help-Seeking Pattern Analysis",
    researcher: "Self-Regulated Learning Research",
    icon: Users,
    description: "Avoidant (<10%), appropriate (20-40%), excessive (>50%)",
    application: "Identifies unhealthy learning patterns",
    status: "implemented" as const,
  },
  {
    name: "Goal Orientation Detection",
    researcher: "Dweck (2006), Nicholls (1984)",
    icon: Target,
    description: "Mastery vs performance vs avoidance orientation",
    application: "Adapts messaging and encouragement style",
    status: "implemented" as const,
  },
  {
    name: "Working Memory Estimation",
    researcher: "Cognitive Load Theory, Miller's Law",
    icon: Brain,
    description: "Inferred from response times and error patterns",
    application: "Adapts content complexity to individual limits",
    status: "implemented" as const,
  },
  {
    name: "Persistence & Engagement Tracking",
    researcher: "Engagement Research",
    icon: Zap,
    description: "Consecutive failures, session duration, skill avoidance",
    application: "Early detection of frustration before dropout",
    status: "implemented" as const,
  },
  {
    name: "Error Pattern Analysis",
    researcher: "Diagnostic Assessment Research",
    icon: AlertTriangle,
    description: "Error types matched against known misconceptions",
    application: "Distinguishes systematic errors from random mistakes",
    status: "implemented" as const,
  },
  {
    name: "Confidence-Performance Gap",
    researcher: "Overconfidence Effect Literature",
    icon: Shield,
    description: "Flags gaps > 40% between confidence and performance",
    application: "Immediate detection of dangerous miscalibration",
    status: "implemented" as const,
  },
  {
    name: "Learning Velocity Analysis",
    researcher: "Learning Analytics Research",
    icon: TrendingUp,
    description: "Rate of mastery acquisition across skills and time",
    application: "Predicts time-to-mastery; identifies acceleration needs",
    status: "implemented" as const,
  },
]

const modernTBDFrameworks = [
  {
    name: "Desirable Difficulties",
    researcher: "Bjork & Bjork (2011-2024)",
    icon: FlaskConical,
    description: "Interleaving, spacing, retrieval practice, variation",
    application: "Learning conditions that enhance long-term retention",
    evidence: "d=0.5-0.8 effect sizes",
    status: "tbd" as const,
  },
  {
    name: "Productive Failure",
    researcher: "Kapur (2008-2024)",
    icon: Lightbulb,
    description: "Struggle before instruction activates prior knowledge",
    application: "'Explore First' mode with minimal initial guidance",
    evidence: "d=0.68 meta-analytic effect",
    status: "tbd" as const,
  },
  {
    name: "Self-Determination Theory",
    researcher: "Ryan & Deci (2020 update)",
    icon: Users,
    description: "Autonomy, Competence, Relatedness for motivation",
    application: "Enhanced learner choice; peer learning features",
    evidence: "d=0.49-0.61 across all three needs",
    status: "tbd" as const,
  },
  {
    name: "Embodied Cognition",
    researcher: "Goldin-Meadow (2019-2024)",
    icon: Hand,
    description: "Gesture-based learning enhances cognitive processing",
    application: "Interactive gestures for mobile; drawing tools",
    evidence: "d=0.32-0.55 for gesture-enhanced instruction",
    status: "tbd" as const,
  },
  {
    name: "AI Socratic Tutoring",
    researcher: "Ma et al. (Nature 2025)",
    icon: MessageCircle,
    description: "LLM questioning outperforms answer-giving by 2x",
    application: "Structured Socratic dialogue patterns",
    evidence: "Nature Human Behaviour 2025",
    status: "tbd" as const,
  },
  {
    name: "Attention Contagion",
    researcher: "Stojic et al. (2024)",
    icon: Eye,
    description: "Focus and distraction spread between learners",
    application: "Group study recommendations; attention monitoring",
    evidence: "15-25% performance impact",
    status: "tbd" as const,
  },
  {
    name: "Microbreaks for Attention",
    researcher: "2024-2025 Studies",
    icon: Coffee,
    description: "60-90 second breaks every 10-15 minutes",
    application: "Built-in session breaks; attention prompts",
    evidence: "76% better post-test performance",
    status: "tbd" as const,
  },
  {
    name: "Handwriting vs. Typing",
    researcher: "van der Meer (2024-2025)",
    icon: PenTool,
    description: "Handwriting activates deeper memory encoding",
    application: "Handwriting input option; sketching tools",
    evidence: "25-40% better recall; EEG theta evidence",
    status: "tbd" as const,
  },
]

const whitepapers = [
  {
    title: "Inverse Profiling Whitepaper",
    description: "Comprehensive technical documentation of the Inverse Profiling system including BKT, ZPD, scaffolding, and real-time adaptation",
    path: "/docs/LearnGraph_Inverse_Profiling_Whitepaper.md",
    icon: Brain,
    pages: "~50 pages",
  },
  {
    title: "Competitive Positioning",
    description: "Market analysis, competitive landscape, unique value propositions, and go-to-market strategy",
    path: "/docs/LearnGraph_Competitive_Positioning.md",
    icon: TrendingUp,
    pages: "~30 pages",
  },
  {
    title: "Educational Research Foundations",
    description: "Detailed research foundations with evidence levels, controversies, limitations, and measurable outcomes",
    path: "/docs/LearnGraph_Educational_Research_Foundations.md",
    icon: BookOpen,
    pages: "~100 pages",
  },
  {
    title: "Theory Overview",
    description: "Quick reference guide to all 29 educational psychology frameworks (21 implemented + 8 TBD)",
    path: "/research/learngraph_theory.md",
    icon: FileText,
    pages: "~15 pages",
  },
]

function FrameworkCard({ framework }: { framework: typeof contentAnalysisFrameworks[0] | typeof modernTBDFrameworks[0] }) {
  const Icon = framework.icon
  const isTBD = framework.status === 'tbd'
  const evidence = 'evidence' in framework ? framework.evidence : null

  return (
    <Card className={`h-full ${isTBD ? 'border-amber-200 bg-amber-50/30' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isTBD ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <Icon className={`h-4 w-4 ${isTBD ? 'text-amber-700' : 'text-blue-700'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{framework.name}</CardTitle>
              {isTBD && <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">TBD</Badge>}
            </div>
            <CardDescription className="text-xs mt-0.5">{framework.researcher}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 mb-2">{framework.description}</p>
        <p className="text-xs text-gray-500"><span className="font-medium">Application:</span> {framework.application}</p>
        {evidence && (
          <p className="text-xs text-amber-700 mt-1"><span className="font-medium">Evidence:</span> {evidence}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResearchPage({ params }: PageProps) {
  const { id: notebookId } = use(params)

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
                <h1 className="text-xl font-bold">Educational Psychology Research</h1>
                <p className="text-sm text-gray-500">29 frameworks: 21 implemented + 8 under consideration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-blue-600">21</div>
              <div className="text-sm text-gray-500">Implemented</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-amber-600">8</div>
              <div className="text-sm text-gray-500">Under Evaluation</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-green-600">29</div>
              <div className="text-sm text-gray-500">Total Frameworks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-purple-600">4</div>
              <div className="text-sm text-gray-500">Whitepapers</div>
            </CardContent>
          </Card>
        </div>

        {/* Whitepapers Section */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Research Documentation
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {whitepapers.map((paper) => {
              const Icon = paper.icon
              return (
                <Card key={paper.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                        <Icon className="h-5 w-5 text-purple-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{paper.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{paper.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{paper.pages}</Badge>
                          <span className="text-xs text-gray-400">{paper.path}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Content Analysis Frameworks */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Content Analysis Frameworks
            <Badge className="ml-2">9 Implemented</Badge>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Applied during source processing to build an educationally-grounded knowledge graph</p>
          <div className="grid md:grid-cols-3 gap-4">
            {contentAnalysisFrameworks.map((framework) => (
              <FrameworkCard key={framework.name} framework={framework} />
            ))}
          </div>
        </section>

        {/* Inverse Profiling Frameworks */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Inverse Profiling Frameworks
            <Badge className="ml-2">12 Implemented</Badge>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Applied during learning to analyze behavior and personalize the experience in real-time</p>
          <div className="grid md:grid-cols-3 gap-4">
            {inverseProfilingFrameworks.map((framework) => (
              <FrameworkCard key={framework.name} framework={framework} />
            ))}
          </div>
        </section>

        {/* Modern TBD Frameworks */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            Modern Frameworks Under Consideration
            <Badge variant="outline" className="ml-2 text-amber-700 border-amber-300">8 TBD</Badge>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Cutting-edge research from 2020-2025 being evaluated for future integration</p>
          <div className="grid md:grid-cols-2 gap-4">
            {modernTBDFrameworks.map((framework) => (
              <FrameworkCard key={framework.name} framework={framework} />
            ))}
          </div>
        </section>

        {/* References */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-gray-600" />
            Key References
          </h2>
          <Card>
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Implemented Frameworks</h4>
                  <ul className="space-y-1">
                    <li>Anderson & Krathwohl (2001) - Bloom's Taxonomy</li>
                    <li>Corbett & Anderson (1995) - BKT</li>
                    <li>Lord (1980) - Item Response Theory</li>
                    <li>Meyer & Land (2003) - Threshold Concepts</li>
                    <li>Sweller (1988) - Cognitive Load Theory</li>
                    <li>Vygotsky (1978) - ZPD</li>
                    <li>Wozniak (1987) - SM-2 Algorithm</li>
                    <li>Zimmerman (2002) - Self-Regulated Learning</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Modern Research (2020-2025)</h4>
                  <ul className="space-y-1">
                    <li>Bjork & Bjork (2024) - Desirable Difficulties</li>
                    <li>Kapur (2024) - Productive Failure</li>
                    <li>Ryan & Deci (2020) - SDT Update</li>
                    <li>Ma et al. (2025) - AI Tutoring (Nature)</li>
                    <li>van der Meer (2024) - Handwriting Research</li>
                    <li>Goldin-Meadow (2024) - Embodied Cognition</li>
                    <li>Stojic et al. (2024) - Attention Contagion</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Navigation */}
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/curriculum`}>
              View Curriculum Features
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/profile`}>
              View Learner Profile
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
