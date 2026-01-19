'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, HelpCircle, FileText, MessageSquare, AlertTriangle, GitBranch, Loader2, ChevronDown, ChevronRight, Sparkles, X, Copy, Check, Download, Printer, Info, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown, { Components } from 'react-markdown'
import { ArtifactGenerator } from '@/components/artifacts/ArtifactGenerator'

// Custom markdown components for better formatting
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-green-200">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const text = String(children)
    // Check for emoji indicators for different section types
    if (text.includes('🟢') || text.toLowerCase().includes('simple')) {
      return (
        <div className="mt-8 mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    if (text.includes('🟡') || text.toLowerCase().includes('standard')) {
      return (
        <div className="mt-8 mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    if (text.includes('🔴') || text.toLowerCase().includes('advanced')) {
      return (
        <div className="mt-8 mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    if (text.includes('💡') || text.includes('example') || text.includes('Example')) {
      return (
        <div className="mt-8 mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    if (text.includes('❌') || text.toLowerCase().includes('misconception')) {
      return (
        <div className="mt-8 mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    if (text.includes('✅') || text.toLowerCase().includes('correct')) {
      return (
        <div className="mt-6 mb-4 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    if (text.includes('🎯') || text.includes('📊') || text.includes('📝')) {
      return (
        <div className="mt-8 mb-4 p-4 bg-teal-50 border-l-4 border-teal-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    // Numbers (like "1.", "2.") for lesson plan sections
    if (/^\d+\./.test(text)) {
      return (
        <div className="mt-8 mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
            {children}
          </h2>
        </div>
      )
    }
    return (
      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">
        {children}
      </h2>
    )
  },
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3 flex items-center gap-2">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 mb-4 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2 mb-4 ml-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-gray-700 flex items-start gap-2">
      <span className="text-green-500 mt-1.5">•</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 bg-green-100 px-1 rounded">
      {children}
    </strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 p-4 bg-gray-50 border-l-4 border-green-400 rounded-r-lg italic text-gray-700">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  },
  hr: () => (
    <hr className="my-8 border-t-2 border-dashed border-gray-200" />
  ),
}

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
  cognitiveLoadEstimate?: string
  commonMisconceptions?: string[]
  irt?: {
    difficulty: number
    discrimination: number
    guessing: number
  }
}

const toolTypes = [
  {
    id: 'study-guide',
    title: 'Study Guide Generator',
    description: 'Generates comprehensive study guides that show teachers exactly what students need to know for each skill.',
    icon: BookOpen,
    howTeachersUseIt: [
      'See the complete scope of each skill',
      'Identify key concepts to emphasize',
      'Create handouts for students',
      'Develop review materials',
    ],
    theories: [
      { theory: "Bloom's Taxonomy", application: 'Content organized by cognitive level', researcher: 'Anderson & Krathwohl (2001)' },
      { theory: 'Prerequisite Learning', application: 'Required background knowledge listed', researcher: 'Gagné (1985)' },
      { theory: 'Cognitive Load Theory', application: 'Information chunked appropriately', researcher: 'Sweller (1988)' },
    ],
    generated: [
      'Key concepts and definitions',
      'Prerequisite review section',
      'Examples and non-examples',
      'Practice questions aligned to Bloom level',
      'Common misconceptions to avoid',
    ],
    prompt: (skill: Skill) => `Generate a comprehensive STUDY GUIDE for teachers about: "${skill.name}"

This skill is at Bloom's Level ${skill.bloomLevel} (${skill.bloomVerb || 'N/A'}).
${skill.description ? `Description: ${skill.description}` : ''}
${skill.cognitiveLoadEstimate ? `Cognitive Load: ${skill.cognitiveLoadEstimate}` : ''}
${skill.commonMisconceptions?.length ? `Known Misconceptions: ${skill.commonMisconceptions.join(', ')}` : ''}

Create a study guide that includes:
1. **Learning Objectives** - What students should be able to do after mastering this
2. **Key Concepts** - The essential ideas and definitions
3. **Prerequisites Review** - What students need to know before learning this
4. **Examples and Non-Examples** - Clear illustrations of the concept
5. **Practice Questions** - 3-5 questions aligned to Bloom Level ${skill.bloomLevel}
6. **Common Misconceptions** - Pitfalls to address proactively
7. **Assessment Criteria** - How to evaluate student understanding

Format with clear headings and bullet points for easy classroom use.`,
  },
  {
    id: 'practice-questions',
    title: 'Practice Question Generator',
    description: 'Creates assessment questions at specific Bloom levels with psychometrically calibrated difficulty.',
    icon: HelpCircle,
    howTeachersUseIt: [
      'Generate quizzes and tests',
      'Create differentiated assessments',
      'Build question banks',
      'Develop formative assessments',
    ],
    theories: [
      { theory: "Bloom's Taxonomy", application: 'Questions target specific cognitive levels', researcher: 'Anderson & Krathwohl (2001)' },
      { theory: 'Item Response Theory', application: 'Difficulty calibrated using IRT 3PL model', researcher: 'Lord (1980)' },
      { theory: 'Testing Effect', application: 'Retrieval practice improves retention', researcher: 'Roediger & Karpicke (2006)' },
    ],
    generated: [
      'Questions at each Bloom level (Remember → Create)',
      'Difficulty targeting using IRT parameters',
      'Distractors based on common misconceptions',
      'Answer keys with explanations',
    ],
    extra: {
      title: 'IRT 3PL Model',
      items: [
        { label: 'b (difficulty)', desc: '-3 to +3 scale' },
        { label: 'a (discrimination)', desc: 'How well it separates ability levels' },
        { label: 'c (guessing)', desc: 'Accounts for random correct answers' },
      ],
    },
    prompt: (skill: Skill) => `Generate PRACTICE QUESTIONS for: "${skill.name}"

This skill is at Bloom's Level ${skill.bloomLevel}.
${skill.irt ? `IRT Parameters: Difficulty=${skill.irt.difficulty.toFixed(2)}, Discrimination=${skill.irt.discrimination.toFixed(2)}` : ''}
${skill.commonMisconceptions?.length ? `Common Misconceptions to target: ${skill.commonMisconceptions.join(', ')}` : ''}

Create a set of practice questions that includes:

1. **Remember Level (2 questions)** - Recall facts and basic concepts
2. **Understand Level (2 questions)** - Explain ideas, summarize
3. **Apply Level (2 questions)** - Use in new situations
4. **Analyze Level (2 questions)** - Draw connections, compare
5. **Evaluate Level (1 question)** - Justify decisions, critique
6. **Create Level (1 question)** - Produce original work

For each question provide:
- The question text
- Question type (multiple choice, short answer, essay)
- The correct answer or rubric
- Brief explanation of why this tests the skill
- Distractors (for MC) based on common misconceptions

Target difficulty: ${skill.irt ? skill.irt.difficulty.toFixed(1) : 'medium'} on -3 to +3 scale.`,
  },
  {
    id: 'lesson-plan',
    title: 'Lesson Plan Generator',
    description: 'Creates complete lesson plans with learning objectives, activities, assessments, and timing based on cognitive load.',
    icon: FileText,
    howTeachersUseIt: [
      'Plan daily lessons',
      'Ensure curriculum alignment',
      'Estimate instructional time',
      'Design appropriate activities',
    ],
    theories: [
      { theory: 'Backward Design', application: 'Start with objectives, then design activities', researcher: 'Wiggins & McTighe (2005)' },
      { theory: 'Cognitive Load Theory', application: 'Pacing based on cognitive demand', researcher: 'Sweller (1988)' },
      { theory: 'Scaffolding', application: 'Gradual release of responsibility built in', researcher: 'Vygotsky, Bruner (1976)' },
    ],
    generated: [
      'Learning objectives (SWBAT statements)',
      'Prerequisite review/activation',
      'Direct instruction outline',
      'Guided & independent practice',
      'Formative assessment/exit ticket',
      'Differentiation suggestions',
    ],
    extra: {
      title: 'Time Estimation by Cognitive Load',
      items: [
        { label: 'Low load', desc: 'Standard time, no adjustment' },
        { label: 'Medium load', desc: '+25% time, additional practice' },
        { label: 'High load', desc: '+50% time, worked examples, chunking' },
      ],
    },
    prompt: (skill: Skill) => `Generate a complete LESSON PLAN for teaching: "${skill.name}"

Skill Details:
- Bloom's Level: ${skill.bloomLevel} (${skill.bloomVerb || 'N/A'})
- Estimated Time: ${skill.estimatedMinutes || 30} minutes
- Cognitive Load: ${skill.cognitiveLoadEstimate || 'medium'}
${skill.isThresholdConcept ? '- This is a THRESHOLD CONCEPT requiring extra attention' : ''}
${skill.description ? `- Description: ${skill.description}` : ''}

Create a lesson plan with:

1. **Learning Objectives (SWBAT)**
   - Clear, measurable objectives using Bloom verbs

2. **Materials Needed**
   - Resources, handouts, technology

3. **Prerequisite Activation (5-10 min)**
   - Review prior knowledge
   - Connection to previous learning

4. **Direct Instruction (10-15 min)**
   - Key concepts introduction
   - Worked examples
   - Think-alouds

5. **Guided Practice (10-15 min)**
   - Scaffolded activities
   - Teacher monitoring points
   - Common error checkpoints

6. **Independent Practice (10-15 min)**
   - Student work tasks
   - Differentiation options (struggling/advanced)

7. **Formative Assessment/Exit Ticket (5 min)**
   - Quick check for understanding
   - 2-3 questions

8. **Differentiation Notes**
   - Supports for struggling learners
   - Extensions for advanced learners

Adjust timing based on cognitive load (${skill.cognitiveLoadEstimate || 'medium'}).`,
  },
  {
    id: 'concept-explainer',
    title: 'Concept Explainer',
    description: 'Generates explanations at different cognitive levels for differentiated instruction.',
    icon: MessageSquare,
    howTeachersUseIt: [
      'Prepare multiple explanations for diverse learners',
      'Create tiered materials',
      'Support struggling students with simpler explanations',
      'Challenge advanced students with deeper content',
    ],
    theories: [
      { theory: 'Differentiated Instruction', application: 'Multiple access points to same content', researcher: 'Tomlinson (2001)' },
      { theory: 'Spiral Curriculum', application: 'Same concept at increasing sophistication', researcher: 'Bruner (1960)' },
      { theory: 'Zone of Proximal Development', application: 'Match explanation to learner readiness', researcher: 'Vygotsky (1978)' },
    ],
    generated: [
      'Simple explanation (concrete, analogies)',
      'Standard explanation (grade-appropriate)',
      'Advanced explanation (technical depth)',
      'Real-world analogies from transfer domains',
    ],
    extra: {
      title: 'Explanation Levels',
      items: [
        { label: 'Simple', desc: 'Introduction, struggling learners' },
        { label: 'Standard', desc: 'Core instruction' },
        { label: 'Advanced', desc: 'Enrichment, advanced learners' },
      ],
    },
    prompt: (skill: Skill) => `Generate DIFFERENTIATED EXPLANATIONS of: "${skill.name}"

${skill.description ? `Context: ${skill.description}` : ''}
Bloom's Level: ${skill.bloomLevel}

Provide THREE levels of explanation for the same concept:

## 1. SIMPLE EXPLANATION (for struggling learners or introduction)
- Use concrete, everyday language
- Include a relatable analogy
- Keep it to 2-3 sentences
- Add a simple visual/diagram suggestion

## 2. STANDARD EXPLANATION (for typical instruction)
- Grade-appropriate vocabulary
- Include examples and non-examples
- Connect to prerequisites
- 1-2 paragraphs

## 3. ADVANCED EXPLANATION (for enrichment)
- Technical/academic language
- Deeper theoretical connections
- Edge cases and nuances
- Connections to advanced topics
- 2-3 paragraphs

## ANALOGIES FOR TRANSFER
- Provide 3 analogies from different domains that illustrate this concept
- Explain how each analogy maps to the concept

## PREREQUISITE CONNECTIONS
- List concepts students must understand first
- Show how this builds on prior knowledge`,
  },
  {
    id: 'misconception-addresser',
    title: 'Misconception Addresser',
    description: 'Generates instructional content that directly confronts and corrects common misconceptions.',
    icon: AlertTriangle,
    howTeachersUseIt: [
      'Proactively address misconceptions before they form',
      'Create targeted interventions',
      'Develop "myth vs. fact" materials',
      'Design diagnostic assessments',
    ],
    theories: [
      { theory: 'Conceptual Change Theory', application: 'Misconceptions must be directly confronted', researcher: 'Posner et al. (1982)' },
      { theory: 'Refutation Text Research', application: 'Explicit correction more effective than ignoring', researcher: 'Tippett (2010)' },
      { theory: 'Cognitive Conflict', application: 'Create disequilibrium to motivate change', researcher: 'Piaget (1977)' },
    ],
    generated: [
      'The misconception stated clearly',
      'Why students might believe it',
      'Evidence/reasoning why it\'s incorrect',
      'The correct understanding',
      'Self-check questions',
    ],
    insight: "Simply teaching correct information doesn't eliminate misconceptions. Students can hold correct and incorrect beliefs simultaneously. Direct confrontation is required.",
    prompt: (skill: Skill) => `Generate a MISCONCEPTION GUIDE for: "${skill.name}"

${skill.commonMisconceptions?.length ? `Known misconceptions: ${skill.commonMisconceptions.join(', ')}` : 'Identify likely misconceptions for this topic.'}

For EACH misconception, provide:

## Misconception 1: [State the misconception]

### Why Students Believe This
- Explain the intuitive appeal
- Prior experiences that lead to this belief
- How it might seem to make sense

### Why It's Incorrect
- Clear evidence/reasoning
- Counterexamples
- Logical analysis

### The Correct Understanding
- Accurate conception stated clearly
- Why it's true

### Instructional Strategies
- How to surface this misconception
- Activities that create cognitive conflict
- Ways to reinforce correct understanding

### Diagnostic Questions
- 2-3 questions that reveal if a student holds this misconception
- Include answer analysis

---

Repeat for at least 3 major misconceptions.

## Prevention Strategies
- Proactive teaching approaches
- Things to say/not say
- Activities that prevent misconception formation`,
  },
  {
    id: 'prerequisite-checker',
    title: 'Prerequisite Checker',
    description: 'Identifies what students need to know before learning a skill and generates diagnostic assessments.',
    icon: GitBranch,
    howTeachersUseIt: [
      'Diagnose gaps before teaching new content',
      'Create pre-assessments',
      'Design remediation materials',
      'Identify at-risk students',
    ],
    theories: [
      { theory: 'Prerequisite Knowledge', application: 'Learning hierarchies define dependencies', researcher: 'Gagné (1985)' },
      { theory: 'Mastery Learning', application: 'Ensure foundation before advancing', researcher: 'Bloom (1968)' },
      { theory: 'Cognitive Load Theory', application: 'Missing prerequisites increase extraneous load', researcher: 'Sweller (1988)' },
    ],
    generated: [
      'List of required prerequisites',
      'Diagnostic questions for each',
      'Quick scoring guide',
      'Remediation recommendations',
      '"Ready to learn" checklist',
    ],
    extra: {
      title: 'Prerequisite Types',
      items: [
        { label: 'Required', desc: 'Must know — stop and remediate' },
        { label: 'Recommended', desc: 'Helps significantly — brief review' },
        { label: 'Helpful', desc: 'Provides context — optional mention' },
      ],
    },
    insight: 'Studies show 50%+ of learning failures trace to missing prerequisites, not inability to learn new content.',
    prompt: (skill: Skill) => `Generate a PREREQUISITE DIAGNOSTIC for: "${skill.name}"

${skill.description ? `Context: ${skill.description}` : ''}
Bloom's Level: ${skill.bloomLevel}

Create a diagnostic tool to assess readiness:

## Required Prerequisites (Must-Know)
For each prerequisite:
- Name and brief description
- Why it's essential for this skill
- 2 diagnostic questions
- Remediation suggestion if not mastered

## Recommended Prerequisites (Should-Know)
- Concepts that significantly help
- Quick review points
- 1 diagnostic question each

## Helpful Background (Nice-to-Know)
- Contextual knowledge that enriches understanding
- Brief mention points

## Ready-to-Learn Checklist
A simple yes/no checklist teachers can use:
□ Can student do X?
□ Does student understand Y?
□ Has student practiced Z?

## Diagnostic Assessment (5-10 questions)
Create a quick pre-assessment that:
- Tests each required prerequisite
- Takes 5-10 minutes
- Provides scoring guide
- Indicates "ready" vs "needs review" vs "significant gaps"

## Remediation Pathways
- Quick review activities for minor gaps
- Focused reteaching for significant gaps
- Resources for each prerequisite`,
  },
]

export default function ForTeachersPage({ params }: PageProps) {
  const { id: notebookId } = use(params)
  const { toast } = useToast()

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<{ toolId: string; content: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDifferences, setShowDifferences] = useState(false)

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/graph/learning-path?action=overview`)
        const data = await res.json()

        if (data.overview?.stages) {
          // Flatten all skills from all Bloom levels
          const allSkills: Skill[] = data.overview.stages.flatMap((stage: { skills: Skill[] }) => stage.skills)
          setSkills(allSkills)
          if (allSkills.length > 0) {
            setSelectedSkill(allSkills[0])
          }
        }
      } catch {
        toast({
          title: 'Failed to load skills',
          description: 'Could not fetch skills from knowledge graph',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSkills()
  }, [notebookId, toast])

  const generateContent = async (toolId: string, prompt: string) => {
    setGenerating(toolId)
    setGeneratedContent(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          notebookId,
          useRag: true,
        }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          content += decoder.decode(value, { stream: true })
          setGeneratedContent({ toolId, content })
        }
      }

      toast({
        title: 'Content generated',
        description: 'Your teaching material is ready',
      })
    } catch {
      toast({
        title: 'Generation failed',
        description: 'Could not generate content. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(null)
    }
  }

  const copyToClipboard = async () => {
    if (generatedContent?.content) {
      await navigator.clipboard.writeText(generatedContent.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/notebooks/${notebookId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">AI Teaching Tools</h1>
                <p className="text-sm text-gray-500">Generate research-backed teaching materials</p>
              </div>
            </div>
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/notebooks/${notebookId}/library`}>
                <Library className="h-4 w-4" />
                Artifact Library
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Skills Found</h2>
            <p className="text-gray-500 mb-4">Extract a knowledge graph first to use these tools.</p>
            <Button asChild>
              <Link href={`/notebooks/${notebookId}/curriculum`}>Go to Curriculum</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Info: Difference between Teacher and Student Tools */}
            <div className="mb-6">
              <button
                onClick={() => setShowDifferences(!showDifferences)}
                className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 hover:underline transition-colors"
              >
                {showDifferences ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Info className="h-4 w-4" />
                How are these different from the Student Tools?
              </button>

              {showDifferences && (
                <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <h4 className="font-semibold text-green-900 mb-3">Teacher Tools vs. Student Tools</h4>

                  <div className="space-y-3 text-green-800">
                    <div>
                      <span className="font-medium">Different Audience & Purpose:</span>
                      <p className="text-green-700 mt-0.5">Student tools help learners study independently. Teacher tools generate classroom-ready instructional materials.</p>
                    </div>

                    <div>
                      <span className="font-medium">Different Output Focus:</span>
                      <ul className="mt-1 ml-4 list-disc text-green-700 space-y-0.5">
                        <li><strong>Study Guides:</strong> Students get "what to learn" — Teachers get "what to teach" with assessment criteria</li>
                        <li><strong>Practice Questions:</strong> Students get self-tests with hints — Teachers get assessments with rubrics & distractors</li>
                        <li><strong>Concept Explainer:</strong> Students get simple→advanced — Teachers get differentiated materials for diverse learners</li>
                        <li><strong>Misconceptions:</strong> Students get self-checks — Teachers get instructional strategies to surface & correct</li>
                        <li><strong>Prerequisites:</strong> Students get "Am I ready?" — Teachers get diagnostic assessments & remediation paths</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-medium">Exclusive to Teachers:</span>
                      <p className="text-green-700 mt-0.5">
                        <strong>Lesson Plan Generator</strong> — Creates complete lesson plans with SWBAT objectives, timed activities, differentiation notes, and exit tickets.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-green-200">
                    <Link
                      href={`/notebooks/${notebookId}/for-students`}
                      className="text-green-700 hover:text-green-900 underline text-xs"
                    >
                      View Student Tools →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Skill Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a skill to generate materials for:
              </label>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full md:w-96 flex items-center justify-between px-4 py-3 bg-white border rounded-lg shadow-sm hover:border-green-500 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-medium">{selectedSkill?.name || 'Select a skill'}</div>
                    {selectedSkill && (
                      <div className="text-xs text-gray-500">
                        Bloom Level {selectedSkill.bloomLevel} • {selectedSkill.cognitiveLoadEstimate || 'Medium'} Load
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full md:w-96 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
                    {skills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => {
                          setSelectedSkill(skill)
                          setDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedSkill?.id === skill.id ? 'bg-green-50' : ''
                        }`}
                      >
                        <div className="font-medium">{skill.name}</div>
                        <div className="text-xs text-gray-500">
                          Level {skill.bloomLevel} • {skill.estimatedMinutes || 30}min • {skill.cognitiveLoadEstimate || 'Medium'} Load
                          {skill.isThresholdConcept && ' • Threshold Concept'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tool Cards */}
            <div className="grid gap-6">
              {toolTypes.map((tool) => (
                <Card key={tool.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <tool.icon className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{tool.title}</CardTitle>
                        <CardDescription className="mt-1">{tool.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => selectedSkill && generateContent(tool.id, tool.prompt(selectedSkill))}
                        disabled={!selectedSkill || generating === tool.id}
                        className="gap-2 shrink-0"
                      >
                        {generating === tool.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Generate
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* How Teachers Use It */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          How Teachers Use It
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {tool.howTeachersUseIt.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Educational Psychology */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                          Educational Psychology
                        </div>
                        <div className="space-y-2">
                          {tool.theories.map((t, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-medium text-amber-900">{t.theory}</span>
                              <span className="text-amber-700"> — {t.application}</span>
                              <span className="text-amber-600 block text-[10px]">({t.researcher})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* What's Generated */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          What You Get
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {tool.generated.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Extra Info & Insight */}
                    {(tool.extra || tool.insight) && (
                      <div className="flex flex-wrap gap-4 pt-2 border-t">
                        {tool.extra && (
                          <div className="p-3 bg-gray-100 rounded-lg flex-1 min-w-[200px]">
                            <div className="text-xs font-semibold text-gray-700 mb-2">{tool.extra.title}</div>
                            <div className="space-y-1">
                              {tool.extra.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="px-2 py-0.5 bg-white rounded font-medium text-gray-700">{item.label}</span>
                                  <span className="text-gray-600">{item.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {tool.insight && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex-1 min-w-[200px]">
                            <div className="text-xs font-semibold text-blue-800 mb-1">Pro Tip</div>
                            <p className="text-xs text-blue-700">{tool.insight}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual Artifacts */}
                    <ArtifactGenerator
                      notebookId={notebookId}
                      skill={selectedSkill}
                      toolId={tool.id}
                      audience="teacher"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Generated Content Modal */}
            {generatedContent && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const tool = toolTypes.find(t => t.id === generatedContent.toolId)
                          const Icon = tool?.icon || BookOpen
                          return (
                            <div className="p-2 bg-white/20 rounded-lg">
                              <Icon className="h-5 w-5" />
                            </div>
                          )
                        })()}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {toolTypes.find(t => t.id === generatedContent.toolId)?.title}
                          </h3>
                          <p className="text-green-100 text-sm">{selectedSkill?.name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setGeneratedContent(null)}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b">
                    <div className="text-sm text-gray-500">
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <span>Generated content ready</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([generatedContent.content], { type: 'text/markdown' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${selectedSkill?.name || 'content'}-${generatedContent.toolId}.md`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="gap-2"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-auto">
                    <div className="p-8 max-w-3xl mx-auto">
                      <article className="max-w-none">
                        <ReactMarkdown components={markdownComponents}>{generatedContent.content}</ReactMarkdown>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/curriculum`}>← Curriculum</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/for-students`}>For Students →</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
