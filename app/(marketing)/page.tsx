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
  Zap,
  Clock,
  Shield,
  GitBranch,
  Compass,
  AlertTriangle,
  Baby,
  School,
  UserCheck,
  Upload,
  Database,
  Route,
  MessageSquare,
  BarChart3,
  ArrowDown,
  Play,
  CircleDot,
  Workflow
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Particles } from '@/components/ui/particles-background'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Particles Background */}
      <Particles
        className="fixed inset-0 z-0"
        quantity={100}
        size={3}
        colors={["#9333ea", "#3b82f6", "#7c3aed", "#6366f1"]}
        staticity={50}
        ease={80}
      />
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
              <Link href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</Link>
              <Link href="#matrix" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">The Matrix</Link>
              <Link href="#fink" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Fink's Framework</Link>
              <Link href="#readiness" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">When Ready</Link>
              <Link href="#whitepapers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Whitepapers</Link>
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

      {/* Hero Section - Skill-Content Separation */}
      <section className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-purple-100 text-purple-700 hover:bg-purple-100">
              <Sparkles className="h-3 w-3 mr-1" />
              Beyond NotebookLM: Education Reimagined
            </Badge>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                Separate What You Learn
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                From How You Demonstrate It
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              We often conflate <span className="font-semibold text-purple-700">content</span> (domain knowledge) with
              <span className="font-semibold text-blue-700"> skills</span> (cognitive processes). LearnGraph separates them—creating
              a powerful matrix that transforms how we teach, learn, and <em>learn how to learn</em>.
            </p>

            {/* The Matrix Visual */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto border border-purple-100">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-white rounded-xl shadow-sm border-l-4 border-purple-500">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-purple-900">Content Dimension</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    <strong>What</strong> you learn—domain knowledge, facts, concepts, principles
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-sm border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Skill Dimension</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    <strong>How</strong> you demonstrate learning—cognitive processes, thinking patterns
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/80 rounded-lg text-center">
                <span className="text-sm text-gray-700">
                  Together, they create <strong className="text-purple-700">Significant Learning</strong>—where you don't just know more,
                  you <em>become</em> a better learner.
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6">
                <Link href="/signup">
                  Start Learning How to Learn
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link href="#fink">
                  <Layers className="mr-2 h-5 w-5" />
                  Explore Fink's Framework
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
                <span>Fink's Significant Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Developmentally Appropriate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Skill-Content Matrix Section */}
      <section id="matrix" className="relative z-10 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">The Core Innovation</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Skill-Content Separation Principle
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Traditional education conflates <em>what</em> students learn with <em>how</em> they show they've learned it.
              This conflation creates blind spots that limit both teaching and learning.
            </p>
          </div>

          {/* Matrix Visualization */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
                <h3 className="text-lg font-semibold text-center">The Learning Matrix</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="p-3 text-left bg-gray-50"></th>
                        <th className="p-3 text-center bg-purple-50 text-purple-700">Remember</th>
                        <th className="p-3 text-center bg-purple-50 text-purple-700">Understand</th>
                        <th className="p-3 text-center bg-purple-50 text-purple-700">Apply</th>
                        <th className="p-3 text-center bg-purple-50 text-purple-700">Analyze</th>
                        <th className="p-3 text-center bg-purple-50 text-purple-700">Evaluate</th>
                        <th className="p-3 text-center bg-purple-50 text-purple-700">Create</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { content: 'Photosynthesis', levels: ['Define', 'Explain', 'Calculate', 'Compare', 'Critique', 'Design'] },
                        { content: 'World War II', levels: ['List', 'Summarize', 'Demonstrate', 'Examine', 'Judge', 'Construct'] },
                        { content: 'Python Loops', levels: ['Recall', 'Describe', 'Implement', 'Debug', 'Optimize', 'Architect'] },
                      ].map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-3 font-medium bg-blue-50 text-blue-700">{row.content}</td>
                          {row.levels.map((level, j) => (
                            <td key={j} className="p-3 text-center text-gray-600 text-xs">{level}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Content (rows) = Domain Knowledge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span className="text-gray-600">Skills (columns) = Cognitive Processes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold mb-2">The Problem</h3>
                <p className="text-sm text-gray-600">
                  A student who can "explain photosynthesis" (Understand) might not be able to "design an experiment" (Create).
                  Traditional assessments miss this gap.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">The Solution</h3>
                <p className="text-sm text-gray-600">
                  LearnGraph extracts <em>both</em> dimensions from your content, mapping exactly which skills
                  apply to which knowledge—and tracking mastery of each cell.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Compass className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">The Outcome</h3>
                <p className="text-sm text-gray-600">
                  Precise diagnosis, targeted instruction, and most importantly: students who learn
                  <em>how to learn</em>—not just what to know.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works - Two-Sided Architecture */}
      <section id="how-it-works" className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700">Simple Yet Powerful</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works: Two Sides, One Goal
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Like NotebookLM, you start by uploading your content. Unlike NotebookLM, we extract
              <em> educational structure</em>—then use it to <em>scaffold real learning</em>.
            </p>
          </div>

          {/* Illustrated Infographic */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 border shadow-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-purple-500 w-24"></div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border">
                  <Workflow className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-gray-700">The LearnGraph Pipeline</span>
                </div>
                <div className="h-px bg-gradient-to-r from-blue-500 via-blue-300 to-transparent w-24"></div>
              </div>

              {/* Two Columns */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Content Side */}
                <div className="relative">
                  <div className="absolute -top-2 -left-2 w-20 h-20 bg-purple-200/50 rounded-full blur-xl"></div>
                  <div className="relative bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-purple-100">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-purple-900">Content Side</h3>
                        <p className="text-sm text-purple-600">For Educators & Content Creators</p>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      {[
                        { icon: FileText, label: 'Load Documents', desc: 'PDFs, slides, videos, websites—any learning material', color: 'purple' },
                        { icon: Database, label: 'Vectorize Content', desc: 'RAG-ready embeddings as factual guardrails', color: 'purple' },
                        { icon: Target, label: 'Align to Standards', desc: 'Map to learning objectives, competencies, or standards', color: 'purple' },
                        { icon: Network, label: 'Extract Skills', desc: 'AI identifies skills with prerequisite relationships', color: 'purple' },
                        { icon: Layers, label: 'Tag with Metadata', desc: 'Bloom, Fink, IRT, cognitive load—29 frameworks', color: 'purple' },
                        { icon: Route, label: 'Generate Curriculum', desc: 'Auto-create lesson plans, assessments, learning paths', color: 'purple' },
                      ].map((step, i) => (
                        <div key={i} className="relative">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                                <step.icon className="h-5 w-5 text-purple-600" />
                              </div>
                              {i < 5 && (
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-purple-300 to-purple-100"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-500">0{i + 1}</span>
                                <span className="font-semibold text-gray-900 text-sm">{step.label}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Output */}
                    <div className="mt-6 pt-4 border-t border-purple-100">
                      <div className="flex items-center gap-2 text-sm text-purple-700 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Output: Structured Knowledge Graph
                      </div>
                    </div>
                  </div>
                </div>

                {/* Learning Side */}
                <div className="relative">
                  <div className="absolute -top-2 -right-2 w-20 h-20 bg-blue-200/50 rounded-full blur-xl"></div>
                  <div className="relative bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-100">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-blue-900">Learning Side</h3>
                        <p className="text-sm text-blue-600">For Learners & Tutoring</p>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      {[
                        { icon: Target, label: 'Goal-Oriented Notebook', desc: 'Every session tied to specific learning objectives', color: 'blue' },
                        { icon: Network, label: 'Graph RAG', desc: 'Answers grounded in skill relationships, not just text', color: 'blue' },
                        { icon: Users, label: 'Inverse Profiling', desc: 'Real-time learner model across all Fink dimensions', color: 'blue' },
                        { icon: BarChart3, label: 'Progress Tracking', desc: 'BKT mastery, SM-2 review, ZPD positioning', color: 'blue' },
                        { icon: Zap, label: 'Adaptive Scaffolding', desc: 'Hints before answers, fading as competence grows', color: 'blue' },
                        { icon: MessageSquare, label: 'Socratic Tutoring', desc: 'Real-time response analysis, freeform conversation', color: 'blue' },
                      ].map((step, i) => (
                        <div key={i} className="relative">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                <step.icon className="h-5 w-5 text-blue-600" />
                              </div>
                              {i < 5 && (
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-blue-300 to-blue-100"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-500">0{i + 1}</span>
                                <span className="font-semibold text-gray-900 text-sm">{step.label}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Output */}
                    <div className="mt-6 pt-4 border-t border-blue-100">
                      <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Output: Learner Who Learns How to Learn
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Connection */}
              <div className="flex items-center justify-center mt-8">
                <div className="flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white shadow-lg">
                  <CircleDot className="h-5 w-5" />
                  <span className="font-semibold">One goal: Build capability, not dependency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2 text-purple-900">Guardrailed by Your Content</h3>
                <p className="text-sm text-gray-600">
                  Vector embeddings ensure AI responses stay grounded in your source material—no hallucinations,
                  no off-topic drift.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2 text-blue-900">Learns About the Learner</h3>
                <p className="text-sm text-gray-600">
                  Every interaction updates the inverse profile—mastery estimates, cognitive load, metacognitive
                  calibration, and Fink dimension progress.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-2 text-emerald-900">Scaffolds to Independence</h3>
                <p className="text-sm text-gray-600">
                  As mastery grows, support fades. The goal: make the learner <em>more capable</em> of learning
                  without AI, not dependent on it.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Fink's Taxonomy Section - PRIMARY EMPHASIS */}
      <section id="fink" className="relative z-10 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">The Heart of LearnGraph</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fink's Taxonomy of Significant Learning
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              While Bloom measures <em>cognitive complexity</em>, Fink measures <em>learning significance</em>.
              His six dimensions aren't hierarchical—they're <strong>synergistic</strong>.
              The most powerful? <span className="text-purple-700 font-semibold">Learning How to Learn</span>.
            </p>
          </div>

          {/* Fink's 6 Dimensions - Detailed */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                name: 'Foundational Knowledge',
                question: 'What should they understand and remember?',
                desc: 'The information, ideas, and perspectives that form the knowledge base. This is where Bloom lives—but it\'s just the beginning.',
                icon: BookOpen,
                color: 'amber',
                importance: 'Foundation',
              },
              {
                name: 'Application',
                question: 'What should they be able to do?',
                desc: 'Skills (critical thinking, practical skills, creativity) that let learners engage with the world. Knowing vs. Doing.',
                icon: Zap,
                color: 'orange',
                importance: 'Action',
              },
              {
                name: 'Integration',
                question: 'What connections should they make?',
                desc: 'Connecting ideas, subjects, and realms of life. This is your knowledge graph—seeing how everything relates.',
                icon: Network,
                color: 'blue',
                importance: 'Connection',
              },
              {
                name: 'Human Dimension',
                question: 'What should they learn about themselves?',
                desc: 'Understanding oneself and others. The inverse profile—metacognitive self-awareness of strengths, struggles, and growth.',
                icon: Users,
                color: 'green',
                importance: 'Self-Knowledge',
              },
              {
                name: 'Caring',
                question: 'What new feelings, interests, values?',
                desc: 'Developing new interests, feelings, and values. This is where motivation lives—persistence and productive struggle.',
                icon: Lightbulb,
                color: 'pink',
                importance: 'Motivation',
              },
              {
                name: 'Learning How to Learn',
                question: 'How can they become self-directed?',
                desc: 'The meta-skill that enables everything else. Inquiry, self-direction, and the ability to keep learning long after the course ends.',
                icon: Brain,
                color: 'purple',
                importance: 'META-SKILL',
                highlight: true,
              },
            ].map((dim) => {
              const colorStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
                orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
                green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
                pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
              }
              const style = colorStyles[dim.color]

              return (
                <Card
                  key={dim.name}
                  className={`${dim.highlight ? 'ring-2 ring-purple-500 shadow-lg' : ''} ${style.border} ${style.bg}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 ${style.badge} rounded-xl flex items-center justify-center`}>
                        <dim.icon className={`h-5 w-5 ${style.text}`} />
                      </div>
                      <Badge className={`${style.badge} text-xs`}>
                        {dim.importance}
                      </Badge>
                    </div>
                    <h3 className={`font-semibold mb-1 ${style.text}`}>{dim.name}</h3>
                    <p className="text-xs text-gray-500 italic mb-2">"{dim.question}"</p>
                    <p className="text-sm text-gray-600">{dim.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Learning How to Learn Callout */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white overflow-hidden">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <Brain className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Why "Learning How to Learn" Changes Everything</h3>
                    <p className="text-purple-100 mb-4">
                      Most education focuses on <em>what</em> to learn. Fink's sixth dimension—<strong>Learning How to Learn</strong>—is
                      the meta-skill that determines whether students become lifelong learners or knowledge consumers.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white/10 rounded-lg p-3">
                        <strong className="block text-white">Self-Directed Inquiry</strong>
                        <span className="text-purple-200">Knowing what questions to ask</span>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <strong className="block text-white">Metacognitive Awareness</strong>
                        <span className="text-purple-200">Understanding how you learn best</span>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <strong className="block text-white">Adaptive Strategy</strong>
                        <span className="text-purple-200">Adjusting approach when stuck</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bloom + Fink Combined Section */}
      <section className="relative z-10 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">The Complete Picture</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bloom Measures Depth. Fink Measures Significance.
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Bloom's Taxonomy (revised 2001) tells us the <em>cognitive complexity</em> of what learners can do.
              Fink tells us <em>how that learning matters</em>. Together, they create truly transformative education.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Bloom Card - Secondary */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Bloom's Taxonomy</CardTitle>
                    <CardDescription className="text-blue-100">Cognitive Complexity (Hierarchical)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Anderson & Krathwohl (2001) • The skill dimension of our matrix
                </p>
                <div className="space-y-1 text-sm">
                  {[
                    { level: 'Create', desc: 'Produce new work' },
                    { level: 'Evaluate', desc: 'Make judgments' },
                    { level: 'Analyze', desc: 'Draw connections' },
                    { level: 'Apply', desc: 'Use in new situations' },
                    { level: 'Understand', desc: 'Explain ideas' },
                    { level: 'Remember', desc: 'Recall facts' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded text-xs flex items-center justify-center font-bold">
                        {6 - i}
                      </span>
                      <span className="font-medium text-blue-900">{item.level}</span>
                      <span className="text-gray-500 text-xs">— {item.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fink Card - Primary */}
            <Card className="overflow-hidden ring-2 ring-purple-300">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Fink's Significant Learning</CardTitle>
                    <CardDescription className="text-purple-100">Learning Impact (Synergistic)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  L. Dee Fink (2003) • Why learning matters to the whole person
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { name: 'Foundation', icon: '📚' },
                    { name: 'Application', icon: '⚡' },
                    { name: 'Integration', icon: '🔗' },
                    { name: 'Human', icon: '👤' },
                    { name: 'Caring', icon: '💡' },
                    { name: 'Learning²', icon: '🧠', highlight: true },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className={`p-2 rounded flex items-center gap-2 ${item.highlight ? 'bg-purple-100 ring-1 ring-purple-300' : 'bg-purple-50'}`}
                    >
                      <span>{item.icon}</span>
                      <span className={`${item.highlight ? 'font-semibold text-purple-700' : 'text-purple-900'}`}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700">
                    <strong>Key insight:</strong> Fink's dimensions aren't hierarchical—they're interconnected.
                    Progress in one enhances all others.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* When Students Are Ready Section */}
      <section id="readiness" className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-100 text-amber-700">Developmental Readiness</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              When Students Are Ready
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A chainsaw is a powerful tool. But you wouldn't hand one to a second grader.
              AI-powered learning requires the same developmental consideration.
            </p>
          </div>

          {/* Scaffold vs Substitute Framework */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <CardTitle className="text-white text-center">The Scaffold or Substitute Principle</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Scaffolding</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Temporary, adaptive support that builds internal capacity. The goal: make the technology
                      <em> progressively less necessary</em>.
                    </p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• Hints before answers</li>
                      <li>• Guides thinking, doesn't replace it</li>
                      <li>• Fades as competence grows</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h4 className="font-semibold text-red-800">Substitution</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Permanent dependency where technology assumes cognitive responsibility,
                      <em> diminishing intrinsic skills</em>.
                    </p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• AI writes the essay</li>
                      <li>• Replaces thinking entirely</li>
                      <li>• Creates "cognitive debt"</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Developmental Stages */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* For Teachers */}
            <Card className="overflow-hidden border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">For Educators</CardTitle>
                    <CardDescription className="text-green-100">Pre-K through College Professors</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  LearnGraph helps educators at <em>every level</em> create materials aligned with learning objectives:
                </p>
                <div className="space-y-3">
                  {[
                    { stage: 'Early Childhood', desc: 'Foundational skill mapping, prerequisite visualization' },
                    { stage: 'Elementary', desc: 'Scaffolding progressions, misconception detection' },
                    { stage: 'Secondary', desc: 'Bloom-aligned assessments, differentiation' },
                    { stage: 'Higher Ed', desc: 'Threshold concepts, Fink\'s significant learning design' },
                  ].map((item) => (
                    <div key={item.stage} className="flex items-start gap-3 p-2 bg-green-50 rounded-lg">
                      <School className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-sm text-green-800">{item.stage}</span>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* For Students - Developmental Readiness */}
            <Card className="overflow-hidden border-2 border-amber-200">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">For Learners</CardTitle>
                    <CardDescription className="text-amber-100">Developmental Readiness Matters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  The full power of self-directed AI learning requires cognitive readiness:
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Baby className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-sm text-amber-800">Before Formal Operations (~12)</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      AI as supervised scaffold only. Focus on building foundational cognitive skills without dependency.
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm text-green-800">Adolescence to Adulthood</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Gradual release of responsibility. AI literacy + strategic collaboration → independent metacognition.
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Compass className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm text-purple-800">Postformal Thinking (Adult)</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Full Fink integration. AI amplifies expertise without creating dependency. "Learning How to Learn" fully activated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Principle */}
          <div className="max-w-3xl mx-auto mt-12">
            <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 text-center">
              <p className="text-lg text-gray-700">
                <strong className="text-purple-700">The principle:</strong> AI should develop capabilities, not replace them.
                Every AI interaction should leave the learner <em>more capable</em> of operating without AI—not more dependent on it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Research Foundation Section */}
      <section id="research" className="relative z-10 py-20 bg-gray-50">
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
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Fink's Significant Learning</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Item Response Theory 3PL</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Threshold Concepts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Cognitive Load Theory</li>
                  <li className="text-xs text-gray-400 pt-1">+ 4 more frameworks</li>
                </ul>
              </CardContent>
            </Card>

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
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Learning How to Learn</li>
                  <li className="text-xs text-gray-400 pt-1">+ 7 more frameworks</li>
                </ul>
              </CardContent>
            </Card>

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
                  <li className="flex items-center gap-2"><Clock className="h-3 w-3 text-amber-500" /> Developmental Readiness</li>
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
      <section className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-700">For the Classroom</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI Tools Built for Education
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Not generic chat. Purpose-built tools that understand Fink's dimensions,
              learning progressions, and developmental appropriateness.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
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
                    { name: 'Lesson Planner', desc: 'Fink-aligned objectives' },
                    { name: 'Assessment Creator', desc: 'Skill-content matrix' },
                    { name: 'Misconception Addresser', desc: 'Proactive error prevention' },
                    { name: 'Differentiation Engine', desc: 'Scaffolding by readiness' },
                    { name: 'Curriculum Mapper', desc: 'Integration visualization' },
                    { name: 'Progress Dashboard', desc: 'All 6 Fink dimensions' },
                  ].map((tool) => (
                    <div key={tool.name} className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-sm text-green-900">{tool.name}</div>
                      <div className="text-xs text-green-700">{tool.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                    { name: 'Metacognition Coach', desc: 'Learning How to Learn' },
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
      <section id="whitepapers" className="relative z-10 py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">Deep Dive</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Research Whitepapers
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Comprehensive documentation of Fink's Significant Learning integration,
              the skill-content separation principle, and developmental considerations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: 'Bloom + Fink Combined Framework',
                description: 'How we layer Fink\'s holistic dimensions over Bloom\'s cognitive hierarchy to create the skill-content matrix that enables Learning How to Learn.',
                slug: 'bloom-fink-combined-framework',
                icon: Layers,
                pages: '~25 pages',
                readTime: '20 min',
                color: 'purple',
                isNew: true,
              },
              {
                title: 'Inverse Profiling Whitepaper',
                description: 'Real-time learner modeling across all six Fink dimensions, including metacognitive calibration and self-directed learning indicators.',
                slug: 'inverse-profiling-whitepaper',
                icon: Brain,
                pages: '~50 pages',
                readTime: '45 min',
                color: 'blue',
              },
              {
                title: 'Educational Research Foundations',
                description: 'Evidence review for all 29 frameworks with effect sizes, limitations, and developmental considerations.',
                slug: 'educational-research-foundations',
                icon: BookOpen,
                pages: '~100 pages',
                readTime: '90 min',
                color: 'green',
              },
              {
                title: 'Competitive Positioning',
                description: 'How LearnGraph differs from Khan Academy, ALEKS, and generic AI—and why Fink\'s framework is the differentiator.',
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
      <section className="relative z-10 py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Teach Learning How to Learn?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join educators who are using Fink's Significant Learning framework to create
            students who don't just know more—they become better learners.
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
      <footer className="relative z-10 py-12 bg-gray-900 text-gray-400">
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
                AI-powered significant learning built on Fink's framework and 29 educational psychology principles.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/notebooks" className="hover:text-white transition-colors">Notebooks</Link></li>
                <li><Link href="#matrix" className="hover:text-white transition-colors">The Matrix</Link></li>
                <li><Link href="#fink" className="hover:text-white transition-colors">Fink's Framework</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/research/docs/bloom-fink-combined-framework" className="hover:text-white transition-colors">Bloom + Fink Framework</Link></li>
                <li><Link href="/research/docs/inverse-profiling-whitepaper" className="hover:text-white transition-colors">Inverse Profiling</Link></li>
                <li><Link href="/research" className="hover:text-white transition-colors">All Research</Link></li>
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
            <p>&copy; 2025 LearnGraph. Teaching students to learn how to learn.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
