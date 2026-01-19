'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, HelpCircle, MessageSquare, AlertTriangle, GitBranch, Loader2, ChevronDown, Sparkles, X, Copy, Check, Download, Printer, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown, { Components } from 'react-markdown'
import { ArtifactGenerator } from '@/components/artifacts/ArtifactGenerator'

// Custom markdown components for better formatting
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-purple-200">
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
        <div className="mt-8 mb-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg">
          <h2 className="text-lg font-bold text-purple-800 flex items-center gap-2">
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
      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
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
      <span className="text-purple-500 mt-1.5">•</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 bg-yellow-100 px-1 rounded">
      {children}
    </strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 p-4 bg-gray-50 border-l-4 border-purple-400 rounded-r-lg italic text-gray-700">
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
      <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-sm font-mono">
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
    description: 'Creates structured study notes for each skill with key concepts, examples, and practice questions.',
    icon: BookOpen,
    howStudentsUseIt: [
      'Get organized notes for any topic',
      'Identify what you actually need to know',
      'Prepare for exams efficiently',
      'Review material systematically',
    ],
    theories: [
      { finding: 'Organized information is easier to remember', help: 'Notes are chunked and structured', researcher: 'Sweller (CLT)' },
      { finding: 'You need to know prerequisites first', help: 'Prerequisites listed before main content', researcher: 'Gagné' },
      { finding: 'Misconceptions block learning', help: 'Common mistakes explicitly addressed', researcher: 'Posner' },
      { finding: 'Practice questions improve retention', help: 'Practice questions included', researcher: 'Roediger' },
    ],
    generated: [
      'Key concepts and definitions',
      '"Before you start" prerequisite review',
      'Examples showing the concept in action',
      'Practice questions to test yourself',
      '"Watch out for" common mistakes section',
    ],
    proTip: "Don't just read the study guide—test yourself with the practice questions. Research shows testing yourself is far more effective than re-reading.",
    prompt: (skill: Skill) => `Create a STUDENT STUDY GUIDE for: "${skill.name}"

This skill is at Bloom's Level ${skill.bloomLevel}.
${skill.description ? `Description: ${skill.description}` : ''}
${skill.cognitiveLoadEstimate ? `Cognitive Load: ${skill.cognitiveLoadEstimate}` : ''}
${skill.commonMisconceptions?.length ? `Watch out for these misconceptions: ${skill.commonMisconceptions.join(', ')}` : ''}

Create a study guide in a friendly, student-facing tone that includes:

## What You'll Learn
- Clear learning goals in student-friendly language

## Before You Start (Prerequisites)
- What you should already know
- Quick review questions to check readiness

## Key Concepts
- Main ideas explained simply
- Important terms and definitions
- Visual/diagram suggestions

## Examples
- Clear examples that illustrate the concept
- Step-by-step walkthrough
- Non-examples (what this is NOT)

## Practice Questions
- 5 questions from easy to challenging
- Include answers at the end
- Explain why each answer is correct

## Common Mistakes to Avoid
- Things students often get wrong
- How to recognize if you're making the mistake
- How to fix it

## Quick Review Checklist
- □ Can I explain this in my own words?
- □ Can I give my own example?
- □ Can I answer the practice questions without looking?

Make it encouraging and clear!`,
  },
  {
    id: 'practice-questions',
    title: 'Practice Question Generator',
    description: 'Creates practice questions at the right difficulty level for self-testing.',
    icon: HelpCircle,
    howStudentsUseIt: [
      'Test yourself before you feel "ready" (this is when learning happens!)',
      'Get questions at your level',
      'Build up to harder questions gradually',
      'Identify what you still don\'t understand',
    ],
    theories: [
      { finding: 'Testing beats re-reading by 50%+', help: 'Forces retrieval, not recognition', researcher: 'Roediger & Karpicke' },
      { finding: 'Difficulty should match ability', help: 'Questions calibrated to your level', researcher: 'Lord (IRT)' },
      { finding: 'Wrong answers reveal gaps', help: 'Feedback shows what to review', researcher: 'Formative Assessment' },
      { finding: 'Spaced practice beats cramming', help: 'Practice over multiple sessions', researcher: 'Ebbinghaus' },
    ],
    generated: [
      'Questions ranging from basic recall to complex application',
      'Difficulty that matches your current level',
      'Wrong answer choices based on real misconceptions (not random)',
      'Explanations for correct answers',
      'Hints when you\'re stuck',
    ],
    difficultyLevels: [
      { level: 'Easy (b < -1)', tests: 'Basic recall and understanding', example: '"What is the definition of...?"' },
      { level: 'Medium (b ≈ 0)', tests: 'Application and analysis', example: '"Given this situation, what would happen if...?"' },
      { level: 'Hard (b > 1)', tests: 'Evaluation and creation', example: '"Compare these approaches and justify which is better"' },
    ],
    proTip: "If you're getting everything right easily, the questions are too easy. You learn most when you're getting ~70% correct—that's productive struggle.",
    prompt: (skill: Skill) => `Create PRACTICE QUESTIONS for a student learning: "${skill.name}"

Skill Level: Bloom's Level ${skill.bloomLevel}
${skill.irt ? `Target Difficulty: ${skill.irt.difficulty.toFixed(1)} on -3 to +3 scale` : 'Target Difficulty: Medium'}
${skill.commonMisconceptions?.length ? `Common student mistakes to test for: ${skill.commonMisconceptions.join(', ')}` : ''}

Create a set of 10 practice questions that build from easy to hard:

## Warm-Up Questions (Easy - just checking basics)
1-3. Basic recall and simple understanding questions

## Practice Questions (Medium - applying what you know)
4-6. Application questions that require using the concept

## Challenge Questions (Hard - really testing mastery)
7-8. Analysis and evaluation questions
9-10. Create/synthesize questions

For EACH question provide:
- The question
- Multiple choice options (for most questions) with ONE correct answer
- Make wrong answers based on real misconceptions, not random
- After all questions, provide an ANSWER KEY with:
  - The correct answer
  - Brief explanation of WHY it's correct
  - If applicable, why the common wrong answers are wrong
  - A hint for students who got it wrong

## Scoring Guide
- 9-10 correct: You've mastered this!
- 7-8 correct: Good understanding, review weak areas
- 5-6 correct: Needs more practice, focus on fundamentals
- Below 5: Review the basics before continuing

Keep the tone encouraging—mistakes are how we learn!`,
  },
  {
    id: 'concept-explainer',
    title: 'Concept Explainer',
    description: 'Explains any concept at different levels—from "explain like I\'m 5" to expert detail.',
    icon: MessageSquare,
    howStudentsUseIt: [
      'Get a simpler explanation when the textbook doesn\'t make sense',
      'See real-world examples and analogies',
      'Go deeper once you understand the basics',
      'Connect new concepts to things you already know',
    ],
    theories: [
      { finding: 'Multiple representations help', help: 'Analogies, examples, different angles', researcher: 'Paivio (Dual Coding)' },
      { finding: 'New knowledge builds on old', help: 'Connects to prerequisites you know', researcher: 'Piaget (Schema)' },
      { finding: 'Concrete before abstract', help: 'Simple explanation uses concrete examples', researcher: 'Bruner' },
      { finding: 'Context helps transfer', help: 'Shows where concept applies in real world', researcher: 'Perkins & Salomon' },
    ],
    generated: [
      'Simple explanation: Everyday analogies, no jargon',
      'Standard explanation: Full technical explanation',
      'Advanced explanation: Nuances, edge cases, deeper implications',
      'Real-world examples: Where this applies outside the classroom',
      'Connections: How this relates to what you already know',
    ],
    explanationLevels: [
      { level: 'Simple', bestFor: 'First introduction, confusion', approach: '"Think of it like a recipe..."' },
      { level: 'Standard', bestFor: 'Main learning', approach: 'Textbook-style with examples' },
      { level: 'Advanced', bestFor: 'Going deeper, exam prep', approach: 'Technical precision, exceptions' },
    ],
    proTip: "Start simple even if you think you understand. Experts can explain things simply—if you can't, you might not really understand it.",
    prompt: (skill: Skill) => `Explain "${skill.name}" to a student at THREE different levels.

${skill.description ? `Context: ${skill.description}` : ''}
Bloom's Level: ${skill.bloomLevel}

## 🟢 SIMPLE EXPLANATION (Explain Like I'm 10)
- Use everyday words, no jargon
- Use a relatable analogy (something from daily life)
- 2-3 sentences max
- "Think of it like..."

## 🟡 STANDARD EXPLANATION (Regular Textbook Level)
- Proper terminology, but explained
- Include a clear example
- How it connects to what they might already know
- 1-2 paragraphs

## 🔴 ADVANCED EXPLANATION (Going Deep)
- Technical details and nuances
- Edge cases and exceptions
- Why this matters / implications
- Connections to related advanced topics
- 2-3 paragraphs

## 💡 REAL-WORLD EXAMPLES
Where does this show up in real life?
- Example 1: [Context and how it applies]
- Example 2: [Different context]
- Example 3: [Another domain]

## 🔗 BUILDING BLOCKS
**Before this, you should know:** [Prerequisites]
**After this, you can learn:** [What this enables]

## 🎯 THE ONE SENTENCE VERSION
If you had to explain this to a friend in one sentence, say: "..."

Keep it friendly and encouraging!`,
  },
  {
    id: 'misconception-addresser',
    title: 'Misconception Addresser',
    description: 'Shows you common mistakes students make and helps you avoid them.',
    icon: AlertTriangle,
    howStudentsUseIt: [
      'Find out if you have a wrong understanding',
      'Avoid mistakes before they become habits',
      'Understand why the wrong answer seems right',
      'Correct misunderstandings you didn\'t know you had',
    ],
    theories: [
      { finding: 'Misconceptions persist unless confronted', help: 'Directly states and corrects wrong ideas', researcher: 'Posner' },
      { finding: 'You can "know" right and wrong simultaneously', help: 'Makes the conflict explicit', researcher: 'Dual Process Theory' },
      { finding: 'Wrong ideas often seem logical', help: 'Explains why the mistake makes sense', researcher: 'Intuitive Theories' },
      { finding: 'Self-testing reveals hidden gaps', help: 'Provides self-check questions', researcher: 'Metacognition' },
    ],
    generated: [
      'The misconception stated clearly ("Many students think...")',
      'Why it seems reasonable ("This makes sense because...")',
      'Why it\'s wrong ("However, this fails because...")',
      'The correct understanding ("Instead, what\'s actually true is...")',
      'Self-check questions ("You understand this correctly if...")',
    ],
    insight: 'Research shows you can get an A on a test while still holding misconceptions. The wrong ideas don\'t go away just because you learned correct information—they have to be directly confronted.',
    proTip: 'Read through misconceptions BEFORE studying a topic. This primes your brain to notice when you\'re falling into a common trap.',
    prompt: (skill: Skill) => `Help a student avoid common misconceptions about: "${skill.name}"

${skill.commonMisconceptions?.length ? `Known misconceptions students have: ${skill.commonMisconceptions.join(', ')}` : 'Identify the most common misconceptions about this topic.'}

For each misconception, use this format:

---

## ❌ MISCONCEPTION #1: "[State what students wrongly believe]"

### Why This Seems Right
- This makes sense because...
- Your brain thinks this because...
- It's a reasonable guess if you...

### Why It's Actually Wrong
- The problem is...
- Here's a counterexample that breaks it...
- If this were true, then [absurd consequence]...

### ✅ The Correct Understanding
- What's actually true is...
- A better way to think about it is...

### 🔍 Self-Check: Do YOU Have This Misconception?
Ask yourself: [question]
- If you answered [X], you might have this misconception
- If you answered [Y], you've got it right!

---

Repeat for at least 3 major misconceptions.

## 🛡️ How to Protect Yourself
- Red flags that you might be falling into these traps
- Questions to ask yourself when studying this topic
- Mental "tests" to verify your understanding

Keep the tone supportive—everyone has misconceptions, and recognizing them is the first step to fixing them!`,
  },
  {
    id: 'prerequisite-checker',
    title: 'Prerequisite Checker',
    description: 'Tells you exactly what you need to know before learning something new, and tests whether you know it.',
    icon: GitBranch,
    howStudentsUseIt: [
      'Find out if you\'re ready to learn a new topic',
      'Identify gaps you didn\'t know you had',
      'Get recommendations for what to review',
      'Stop wasting time on content you\'re not prepared for',
    ],
    theories: [
      { finding: '50%+ of failures are prerequisite gaps', help: 'Identifies exactly what\'s missing', researcher: 'Gagné' },
      { finding: 'You can\'t skip foundation', help: 'Lists required vs. recommended prerequisites', researcher: 'Bloom (Mastery)' },
      { finding: 'Gaps increase cognitive load', help: 'Prevents overload by ensuring readiness', researcher: 'Sweller (CLT)' },
      { finding: 'Diagnostic testing improves outcomes', help: 'Quick tests reveal specific gaps', researcher: 'Formative Assessment' },
    ],
    generated: [
      'List of prerequisites (required vs. helpful)',
      'Quick diagnostic questions for each',
      'Clear verdict: "Ready" or "Review these first"',
      'Links to review material for gaps',
      'Time estimate to fill gaps',
    ],
    prerequisiteTypes: [
      { type: 'Required', meaning: 'You MUST know this', action: 'Stop and review if missing' },
      { type: 'Recommended', meaning: 'Helps a lot', action: 'Quick review if rusty' },
      { type: 'Helpful', meaning: 'Nice context', action: 'Optional—proceed anyway' },
    ],
    proTip: "If you're struggling with new material, the problem is often 2-3 topics back, not the current topic. Go back further than you think.",
    prompt: (skill: Skill) => `Help a student check if they're ready to learn: "${skill.name}"

${skill.description ? `This skill: ${skill.description}` : ''}
Bloom's Level: ${skill.bloomLevel}

Create a prerequisite checker that includes:

## 🔴 MUST-KNOW PREREQUISITES (Required)
These you NEED before starting. Without them, you'll struggle.

For each:
- **[Prerequisite Name]**
  - What it is (1 sentence)
  - Why you need it for this topic
  - Quick test question
  - If you got it wrong: Review this by...

## 🟡 SHOULD-KNOW PREREQUISITES (Recommended)
These help a lot but aren't absolute blockers.

For each:
- **[Prerequisite Name]**
  - Quick review point
  - Test question

## 🟢 NICE-TO-KNOW BACKGROUND (Helpful)
Extra context that enriches understanding.

- [Topic] - brief mention

---

## ✅ READINESS QUIZ (5 Questions)
Answer these to see if you're ready:

1. [Question about required prerequisite 1]
2. [Question about required prerequisite 2]
3. [Question about recommended prerequisite]
4. [Question about another prerequisite]
5. [Question that combines prerequisites]

## 📊 SCORING YOUR READINESS

**5/5 Correct:** You're ready! Jump in.

**3-4/5 Correct:** Almost ready. Quickly review:
- [Specific topics to brush up]

**0-2/5 Correct:** Not quite ready. Before learning ${skill.name}, study:
- [Topic 1] - [estimated time to review]
- [Topic 2] - [estimated time to review]

## 📝 ANSWER KEY
[Answers with brief explanations]

Keep it encouraging—identifying gaps is smart, not a failure!`,
  },
]

const learningScienceTips = [
  {
    title: 'The Testing Effect',
    what: 'Testing yourself improves memory more than re-reading.',
    apply: 'Use practice questions early and often, even before you feel ready.',
  },
  {
    title: 'Spaced Practice',
    what: 'Spreading study over time beats cramming.',
    apply: 'Study a little each day rather than all at once before an exam.',
  },
  {
    title: 'Desirable Difficulty',
    what: 'Harder (but achievable) practice leads to better learning.',
    apply: 'If practice feels too easy, increase the difficulty. Struggling is good.',
  },
  {
    title: 'Retrieval Practice',
    what: 'Pulling information from memory strengthens it.',
    apply: "Close your notes and try to recall. Don't just recognize—retrieve.",
  },
  {
    title: 'Elaboration',
    what: 'Explaining why and how improves understanding.',
    apply: 'Ask yourself "why does this work?" and "how does this connect?"',
  },
]

export default function ForStudentsPage({ params }: PageProps) {
  const { id: notebookId } = use(params)
  const { toast } = useToast()

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<{ toolId: string; content: string } | null>(null)
  const [copied, setCopied] = useState(false)

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
        description: 'Your study material is ready',
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
                <h1 className="text-xl font-bold">AI Study Tools</h1>
                <p className="text-sm text-gray-500">Study smarter with tools grounded in learning science</p>
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

      {/* Content */}
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
            <div className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>These tools use AI to generate personalized study materials.</strong> They're designed based on decades of cognitive psychology research on how people actually learn.
              </p>
            </div>

            {/* Skill Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What do you want to study?
              </label>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full md:w-96 flex items-center justify-between px-4 py-3 bg-white border rounded-lg shadow-sm hover:border-purple-500 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-medium">{selectedSkill?.name || 'Select a topic'}</div>
                    {selectedSkill && (
                      <div className="text-xs text-gray-500">
                        ~{selectedSkill.estimatedMinutes || 30} min to learn • {selectedSkill.cognitiveLoadEstimate || 'Medium'} difficulty
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
                          selectedSkill?.id === skill.id ? 'bg-purple-50' : ''
                        }`}
                      >
                        <div className="font-medium">{skill.name}</div>
                        <div className="text-xs text-gray-500">
                          ~{skill.estimatedMinutes || 30}min • {skill.cognitiveLoadEstimate || 'Medium'} difficulty
                          {skill.isThresholdConcept && ' • Key Concept'}
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
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <tool.icon className="h-5 w-5 text-purple-700" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{tool.title}</CardTitle>
                        <CardDescription className="mt-1">{tool.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => selectedSkill && generateContent(tool.id, tool.prompt(selectedSkill))}
                        disabled={!selectedSkill || generating === tool.id}
                        className="gap-2 shrink-0 bg-purple-600 hover:bg-purple-700"
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
                      {/* How To Use It */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          How To Use It
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {tool.howStudentsUseIt.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* The Science Behind It */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                          The Science Behind It
                        </div>
                        <div className="space-y-2">
                          {tool.theories.map((t, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-medium text-amber-900">{t.finding}</span>
                              <span className="text-amber-700"> → {t.help}</span>
                              <span className="text-amber-600 block text-[10px]">({t.researcher})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* What You Get */}
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

                    {/* Extra Info Boxes */}
                    {(tool.difficultyLevels || tool.explanationLevels || tool.prerequisiteTypes || tool.insight || tool.proTip) && (
                      <div className="flex flex-wrap gap-4 pt-2 border-t">
                        {/* Difficulty Levels */}
                        {tool.difficultyLevels && (
                          <div className="p-3 bg-gray-100 rounded-lg flex-1 min-w-[200px]">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Difficulty Levels</div>
                            <div className="space-y-2">
                              {tool.difficultyLevels.map((level, i) => (
                                <div key={i} className="text-xs">
                                  <span className="px-2 py-0.5 bg-white rounded font-medium text-gray-700">{level.level}</span>
                                  <span className="text-gray-600 ml-2">{level.tests}</span>
                                  <span className="text-gray-500 block mt-0.5 ml-14 italic">{level.example}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Explanation Levels */}
                        {tool.explanationLevels && (
                          <div className="p-3 bg-gray-100 rounded-lg flex-1 min-w-[200px]">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Explanation Levels</div>
                            <div className="space-y-2">
                              {tool.explanationLevels.map((level, i) => (
                                <div key={i} className="text-xs">
                                  <span className="px-2 py-0.5 bg-white rounded font-medium text-gray-700">{level.level}</span>
                                  <span className="text-gray-600 ml-2">Best for: {level.bestFor}</span>
                                  <span className="text-gray-500 block mt-0.5 ml-14 italic">{level.approach}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prerequisite Types */}
                        {tool.prerequisiteTypes && (
                          <div className="p-3 bg-gray-100 rounded-lg flex-1 min-w-[200px]">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Prerequisite Types</div>
                            <div className="space-y-2">
                              {tool.prerequisiteTypes.map((type, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <span className="px-2 py-0.5 bg-white rounded font-medium text-gray-700 shrink-0">{type.type}</span>
                                  <span className="text-gray-600">{type.meaning} — {type.action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Insight */}
                        {tool.insight && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex-1 min-w-[200px]">
                            <div className="text-xs font-semibold text-orange-800 mb-1">Key Insight</div>
                            <p className="text-xs text-orange-700">{tool.insight}</p>
                          </div>
                        )}

                        {/* Pro Tip */}
                        {tool.proTip && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex-1 min-w-[200px]">
                            <div className="flex items-center gap-1 text-xs font-semibold text-blue-800 mb-1">
                              <Sparkles className="h-3 w-3" />
                              Pro Tip
                            </div>
                            <p className="text-xs text-blue-700">{tool.proTip}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual Artifacts */}
                    <ArtifactGenerator
                      notebookId={notebookId}
                      skill={selectedSkill}
                      toolId={tool.id}
                      audience="student"
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
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 text-white">
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
                          <p className="text-purple-100 text-sm">{selectedSkill?.name}</p>
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

        {/* Learning Science Tips */}
        <div className="mt-12">
          <h2 className="text-lg font-bold mb-4">Learning Science Tips</h2>
          <p className="text-sm text-gray-600 mb-4">
            These tools are built on research. Here are the key findings you should know:
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {learningScienceTips.map((tip) => (
              <Card key={tip.title} className="p-4">
                <div className="font-medium text-gray-900 mb-1">{tip.title}</div>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">What it is:</span> {tip.what}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">How to apply:</span> {tip.apply}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/for-teachers`}>← For Teachers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/notebooks/${notebookId}/curriculum`}>Content Features</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
