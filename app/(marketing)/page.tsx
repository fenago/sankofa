'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  GraduationCap,
  Layers,
  Lightbulb,
  Network,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  FileText,
  Play,
  Zap,
  BarChart3,
  Clock,
  Shield,
  Eye,
  MessageCircle,
  GitBranch
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Network className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                LearnGraph
              </span>
              <Badge variant="outline" className="ml-2 text-xs">Beta</Badge>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
              <Link href="#research" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Research</Link>
              <Link href="#whitepapers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Whitepapers</Link>
              <Link href="/research" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Documentation</Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-purple-100 text-purple-700 hover:bg-purple-100">
              <Sparkles className="h-3 w-3 mr-1" />
              NotebookLM meets Educational Psychology
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                Transform Content Into
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Mastery Paths
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              The first AI-powered learning platform that combines knowledge graphs with
              <span className="font-semibold text-gray-900"> 29 research-backed educational psychology frameworks</span>—including
              Bloom's Taxonomy, Zone of Proximal Development, and Bayesian Knowledge Tracing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6">
                <Link href="/signup">
                  Start Building Learning Paths
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link href="#whitepapers">
                  <FileText className="mr-2 h-5 w-5" />
                  Read the Research
                </Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>29 Ed Psych Frameworks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Peer-Reviewed Research</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Privacy-First Design</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              NotebookLM is Amazing. But It's Not Built for <span className="text-purple-600">Educators</span>.
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Google's NotebookLM transforms how we interact with content. But it treats all learning the same—
              missing the pedagogical structure that makes education effective.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* NotebookLM Column */}
            <Card className="border-2 border-gray-200">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Generic AI Notebooks</CardTitle>
                    <CardDescription>Great for research, not for teaching</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {[
                    'Summarizes content without structure',
                    'No prerequisite mapping',
                    'No mastery tracking',
                    'No Zone of Proximal Development',
                    'Same content for every learner',
                    'No scaffolding progression',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* LearnGraph Column */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
              <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100 border-b border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Network className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">LearnGraph</CardTitle>
                    <CardDescription>Built on educational psychology</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {[
                    { text: 'Extracts skills with Bloom\'s cognitive levels', icon: GraduationCap },
                    { text: 'Maps prerequisites automatically', icon: GitBranch },
                    { text: 'Tracks mastery with Bayesian Knowledge Tracing', icon: Target },
                    { text: 'Identifies Zone of Proximal Development', icon: TrendingUp },
                    { text: 'Personalizes based on learner profile', icon: Users },
                    { text: 'Adapts scaffolding (L1→L4) dynamically', icon: Layers },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-3 w-3 text-purple-600" />
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bloom + Fink Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">Our Innovation</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Bloom + Fink Framework
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We don't just track <em>what</em> learners know. We understand <em>how</em> they learn,
              <em>why</em> it matters to them, and <em>who</em> they're becoming.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Bloom's Taxonomy */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Bloom's Taxonomy</CardTitle>
                    <CardDescription className="text-blue-100">Hierarchical Cognitive Complexity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Anderson & Krathwohl (2001) • Universal standard for cognitive objectives
                </p>
                <div className="space-y-2">
                  {[
                    { level: 6, name: 'Create', desc: 'Produce new or original work', color: 'bg-purple-500' },
                    { level: 5, name: 'Evaluate', desc: 'Justify decisions, make judgments', color: 'bg-indigo-500' },
                    { level: 4, name: 'Analyze', desc: 'Draw connections, identify patterns', color: 'bg-blue-500' },
                    { level: 3, name: 'Apply', desc: 'Use knowledge in new situations', color: 'bg-cyan-500' },
                    { level: 2, name: 'Understand', desc: 'Explain ideas or concepts', color: 'bg-teal-500' },
                    { level: 1, name: 'Remember', desc: 'Recall facts and basic concepts', color: 'bg-green-500' },
                  ].map((item) => (
                    <div key={item.level} className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${item.color} rounded flex items-center justify-center text-white text-sm font-bold`}>
                        {item.level}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>What it measures:</strong> Cognitive complexity of mental operations on content
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Fink's Taxonomy */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Fink's Significant Learning</CardTitle>
                    <CardDescription className="text-purple-100">Holistic Learning Dimensions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  L. Dee Fink (2003) • Non-hierarchical, synergistic dimensions
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Foundational Knowledge', desc: 'Information & ideas', icon: BookOpen, color: 'bg-amber-100 text-amber-700' },
                    { name: 'Application', desc: 'Skills & thinking', icon: Zap, color: 'bg-orange-100 text-orange-700' },
                    { name: 'Integration', desc: 'Connecting ideas', icon: Network, color: 'bg-blue-100 text-blue-700' },
                    { name: 'Human Dimension', desc: 'Self & others', icon: Users, color: 'bg-green-100 text-green-700' },
                    { name: 'Caring', desc: 'Values & interests', icon: Lightbulb, color: 'bg-pink-100 text-pink-700' },
                    { name: 'Learning to Learn', desc: 'Meta-skills', icon: Brain, color: 'bg-purple-100 text-purple-700' },
                  ].map((item) => (
                    <div key={item.name} className={`p-3 rounded-lg ${item.color}`}>
                      <item.icon className="h-4 w-4 mb-1" />
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs opacity-80">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700">
                    <strong>What it measures:</strong> How learning impacts the whole person—not just their knowledge
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Framework Callout */}
          <div className="mt-12 p-8 bg-gradient-to-r from-purple-50 via-white to-blue-50 rounded-2xl border border-purple-100">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Why Combine Both?</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Bloom tells us <strong>what</strong> learners can do. Fink tells us <strong>why it matters</strong>.
                Together, they create learning objectives that transform learners, not just inform them.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-sm max-w-3xl mx-auto">
              <div className="text-sm font-medium text-gray-500 mb-3">Example: Rich Learning Objective</div>
              <div className="p-4 bg-gray-50 rounded-lg mb-4 font-mono text-sm">
                "Analyze why your neural network architecture failed and redesign it based on your analysis"
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-blue-50 rounded"><strong>Bloom:</strong> Analyze + Create (L4+L6)</div>
                <div className="p-2 bg-amber-50 rounded"><strong>Foundational:</strong> NN concepts</div>
                <div className="p-2 bg-orange-50 rounded"><strong>Application:</strong> Debugging skills</div>
                <div className="p-2 bg-blue-50 rounded"><strong>Integration:</strong> Theory ↔ Practice</div>
                <div className="p-2 bg-green-50 rounded"><strong>Human:</strong> Self-awareness of gaps</div>
                <div className="p-2 bg-purple-50 rounded"><strong>Learning²:</strong> Debugging as learning</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Foundation Section */}
      <section id="research" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">Research Foundation</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built on 29 Educational Psychology Frameworks
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Not another AI gimmick. Every feature is grounded in peer-reviewed research
              spanning 50+ years of cognitive science and educational psychology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Content Analysis */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Content Analysis</CardTitle>
                <CardDescription>9 Frameworks for extracting educationally-grounded knowledge</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Bloom's Taxonomy (2001)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Item Response Theory 3PL</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Threshold Concepts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Cognitive Load Theory</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Prerequisite Mapping</li>
                  <li className="text-xs text-gray-400 pt-1">+ 4 more frameworks</li>
                </ul>
              </CardContent>
            </Card>

            {/* Learner Profiling */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Inverse Profiling</CardTitle>
                <CardDescription>12 Frameworks for real-time learner adaptation</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Bayesian Knowledge Tracing</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Zone of Proximal Development</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> SM-2 Spaced Repetition</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Metacognitive Calibration</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Goal Orientation Detection</li>
                  <li className="text-xs text-gray-400 pt-1">+ 7 more frameworks</li>
                </ul>
              </CardContent>
            </Card>

            {/* Modern Research */}
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-amber-600" />
                </div>
                <CardTitle className="text-lg">Modern Research (2020-2025)</CardTitle>
                <CardDescription>8 Cutting-edge frameworks under evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Clock className="h-3 w-3 text-amber-500" /> Desirable Difficulties (Bjork)</li>
                  <li className="flex items-center gap-2"><Clock className="h-3 w-3 text-amber-500" /> Productive Failure (Kapur)</li>
                  <li className="flex items-center gap-2"><Clock className="h-3 w-3 text-amber-500" /> AI Socratic Tutoring (Nature 2025)</li>
                  <li className="flex items-center gap-2"><Clock className="h-3 w-3 text-amber-500" /> Attention Contagion</li>
                  <li className="flex items-center gap-2"><Clock className="h-3 w-3 text-amber-500" /> Embodied Cognition</li>
                  <li className="text-xs text-gray-400 pt-1">+ 3 more frameworks</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/research">
                Explore All 29 Frameworks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features for Teachers & Students */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-700">For the Classroom</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI Tools Built for Education
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Not generic chat. Purpose-built tools that understand educational objectives,
              learning progressions, and pedagogical best practices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* For Teachers */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">For Teachers</CardTitle>
                    <CardDescription className="text-green-100">6 AI-powered instructional tools</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Lesson Planner', desc: 'Bloom-aligned objectives' },
                    { name: 'Assessment Creator', desc: 'IRT-calibrated questions' },
                    { name: 'Misconception Addresser', desc: 'Proactive error prevention' },
                    { name: 'Differentiation Engine', desc: 'Scaffolding by readiness' },
                    { name: 'Curriculum Mapper', desc: 'Prerequisite visualization' },
                    { name: 'Progress Dashboard', desc: 'Class-wide ZPD view' },
                  ].map((tool) => (
                    <div key={tool.name} className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-sm text-green-900">{tool.name}</div>
                      <div className="text-xs text-green-700">{tool.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* For Students */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">For Students</CardTitle>
                    <CardDescription className="text-blue-100">5 AI-powered study tools</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Study Guide Generator', desc: 'Personalized to gaps' },
                    { name: 'Practice Questions', desc: 'Adaptive difficulty' },
                    { name: 'Concept Explainer', desc: 'Multi-level explanations' },
                    { name: 'Prerequisite Checker', desc: 'Readiness assessment' },
                    { name: 'Spaced Repetition', desc: 'SM-2 powered review' },
                  ].map((tool) => (
                    <div key={tool.name} className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-sm text-blue-900">{tool.name}</div>
                      <div className="text-xs text-blue-700">{tool.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Whitepapers Section */}
      <section id="whitepapers" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">Deep Dive</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Research Whitepapers
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Comprehensive documentation of our educational psychology foundations,
              technical architecture, and competitive positioning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: 'Bloom + Fink Combined Framework',
                description: 'How we layer Fink\'s holistic dimensions over Bloom\'s cognitive hierarchy to create multi-dimensional learning objectives that transform learners.',
                slug: 'bloom-fink-combined-framework',
                icon: Layers,
                pages: '~25 pages',
                readTime: '20 min',
                color: 'purple',
                isNew: true,
              },
              {
                title: 'Inverse Profiling Whitepaper',
                description: 'Technical documentation of our real-time learner modeling system including BKT, ZPD detection, scaffolding adaptation, and metacognitive calibration.',
                slug: 'inverse-profiling-whitepaper',
                icon: Brain,
                pages: '~50 pages',
                readTime: '45 min',
                color: 'blue',
              },
              {
                title: 'Educational Research Foundations',
                description: 'Detailed evidence review for all 29 frameworks with effect sizes, limitations, controversies, and implementation considerations.',
                slug: 'educational-research-foundations',
                icon: BookOpen,
                pages: '~100 pages',
                readTime: '90 min',
                color: 'green',
              },
              {
                title: 'Competitive Positioning',
                description: 'Market analysis comparing LearnGraph to Khan Academy, ALEKS, generic AI tools, and LMS platforms. Our unique value proposition.',
                slug: 'competitive-positioning',
                icon: TrendingUp,
                pages: '~30 pages',
                readTime: '25 min',
                color: 'orange',
              },
            ].map((paper) => {
              const colorStyles = {
                purple: { gradient: 'from-purple-500 to-purple-700', bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:border-purple-300' },
                blue: { gradient: 'from-blue-500 to-blue-700', bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:border-blue-300' },
                green: { gradient: 'from-green-500 to-green-700', bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:border-green-300' },
                orange: { gradient: 'from-orange-500 to-orange-700', bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:border-orange-300' },
              }[paper.color]!

              return (
                <Link key={paper.title} href={`/research/docs/${paper.slug}`}>
                  <Card className={`group h-full hover:shadow-lg transition-all duration-300 cursor-pointer ${colorStyles.hover} overflow-hidden`}>
                    <div className={`h-2 bg-gradient-to-r ${colorStyles.gradient}`} />
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 ${colorStyles.bg} rounded-xl shrink-0 group-hover:scale-110 transition-transform`}>
                          <paper.icon className={`h-6 w-6 ${colorStyles.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                              {paper.title}
                            </h3>
                            {paper.isNew && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{paper.description}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <Badge variant="outline" className="text-xs font-medium">{paper.pages}</Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {paper.readTime}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-purple-600 ml-auto">
                              Read Paper
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform How Your Students Learn?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join educators who are using research-backed AI to create personalized mastery paths
            for every student.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-6">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white/10">
              <Link href="/research">
                View Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Network className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">LearnGraph</span>
              </div>
              <p className="text-sm">
                AI-powered learning paths built on 29 educational psychology frameworks.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/notebooks" className="hover:text-white transition-colors">Notebooks</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/research" className="hover:text-white transition-colors">Research</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/research/docs/bloom-fink-combined-framework" className="hover:text-white transition-colors">Bloom + Fink Framework</Link></li>
                <li><Link href="/research/docs/inverse-profiling-whitepaper" className="hover:text-white transition-colors">Inverse Profiling</Link></li>
                <li><Link href="/research/docs/educational-research-foundations" className="hover:text-white transition-colors">Research Foundations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
            <p>&copy; 2025 LearnGraph. Built with ❤️ for educators.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
