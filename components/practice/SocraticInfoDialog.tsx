'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Info,
  Brain,
  MessageCircle,
  Target,
  Lightbulb,
  TrendingUp,
  BookOpen,
  Sparkles,
  GraduationCap,
} from 'lucide-react'

interface SocraticInfoDialogProps {
  trigger?: React.ReactNode
}

export function SocraticInfoDialog({ trigger }: SocraticInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-600" />
            Understanding Socratic Dialogue Mode
          </DialogTitle>
          <DialogDescription>
            Learn through guided questioning and self-discovery
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* What is it */}
            <Section
              icon={<Brain className="h-5 w-5 text-purple-600" />}
              title="What is Socratic Dialogue?"
            >
              <p className="text-sm text-muted-foreground">
                Instead of answering questions, you engage in a conversation where the AI tutor
                asks <strong>you</strong> questions. Through this dialogue, you discover understanding
                yourself—which research shows leads to deeper, more lasting learning than being told answers.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                The Socratic method, named after the ancient Greek philosopher Socrates, uses strategic
                questioning to help learners examine their beliefs, identify gaps in understanding, and
                construct knowledge through reasoning.
              </p>
            </Section>

            {/* How it helps */}
            <Section
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              title="Why It Works"
            >
              <p className="text-sm text-muted-foreground">
                Groundbreaking research by <strong>Ma et al. (2025, Nature Human Behaviour)</strong> found
                that LLM-based Socratic tutoring produces <strong>2x better learning outcomes</strong> than
                human tutors or AI that just provides answers. Students showed enhanced transfer to novel problems.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This aligns with <strong>Productive Failure</strong> research (Kapur, 2008-2024) showing that
                struggling before receiving help—even failing—prepares your brain to learn more deeply.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                When you explain your thinking aloud, you:
              </p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                <li>Identify gaps you didn't know you had</li>
                <li>Build stronger memory connections</li>
                <li>Develop metacognitive skills (thinking about thinking)</li>
                <li>Transfer knowledge more easily to new situations</li>
              </ul>
            </Section>

            {/* Psychometrics */}
            <Section
              icon={<Target className="h-5 w-5 text-blue-600" />}
              title="What We Measure"
            >
              <p className="text-sm text-muted-foreground mb-3">
                Conversation reveals cognition. How you explain, question, and reason tells us more
                about your understanding than whether you got an answer right or wrong. We analyze:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PsychometricCard
                  title="Understanding Depth"
                  items={['Explanation quality', 'Use of analogies', 'Conceptual connections', 'Abstraction level']}
                  color="purple"
                />
                <PsychometricCard
                  title="Confidence & Calibration"
                  items={['Hedging language ("maybe", "I think")', 'Certainty markers ("definitely")', 'Overconfidence detection', 'Underconfidence patterns']}
                  color="blue"
                />
                <PsychometricCard
                  title="Metacognition"
                  items={['Self-correction frequency', 'Knowledge boundary awareness', 'Reflection attempts', 'Self-monitoring']}
                  color="green"
                />
                <PsychometricCard
                  title="Reasoning Style"
                  items={['Deductive vs inductive', 'Logical chain length', 'Causal reasoning', 'Abstract vs concrete']}
                  color="amber"
                />
                <PsychometricCard
                  title="Engagement"
                  items={['Response thoughtfulness', 'Curiosity signals', 'Persistence after difficulty', 'Interest indicators']}
                  color="pink"
                />
                <PsychometricCard
                  title="Communication"
                  items={['Vocabulary sophistication', 'Topic coherence', 'Responsiveness', 'Elaboration depth']}
                  color="cyan"
                />
              </div>
            </Section>

            {/* Adaptive Features */}
            <Section
              icon={<TrendingUp className="h-5 w-5 text-green-600" />}
              title="How We Adapt to You"
            >
              <p className="text-sm text-muted-foreground mb-3">
                The dialogue adapts in real-time based on your responses:
              </p>
              <div className="space-y-2 text-sm">
                <AdaptationRow
                  condition="If you seem overconfident"
                  response="We ask challenging questions and request verification"
                />
                <AdaptationRow
                  condition="If you seem underconfident"
                  response="We highlight correct reasoning and celebrate insights"
                />
                <AdaptationRow
                  condition="If you're struggling"
                  response="We provide more scaffolding and simpler questions"
                />
                <AdaptationRow
                  condition="If you're succeeding"
                  response="We increase complexity and explore deeper"
                />
                <AdaptationRow
                  condition="If engagement drops"
                  response="We simplify or connect to your interests"
                />
              </div>
            </Section>

            {/* Modern Research (2020-2025) */}
            <Section
              icon={<Sparkles className="h-5 w-5 text-purple-600" />}
              title="Modern Research Foundation (2020-2025)"
            >
              <p className="text-sm text-muted-foreground mb-3">
                Socratic Mode implements cutting-edge educational research:
              </p>
              <div className="space-y-2">
                <ResearchRow
                  theory="AI-Enhanced Socratic Tutoring"
                  researchers="Ma et al. (2025, Nature Human Behaviour)"
                  application="LLM-based questioning produces 2x better outcomes than answer-giving; enhanced transfer to novel problems"
                  highlight
                />
                <ResearchRow
                  theory="Productive Failure"
                  researchers="Kapur (2008-2024)"
                  application="Struggling before receiving help prepares the brain to learn (d=0.68 effect size)"
                  highlight
                />
                <ResearchRow
                  theory="Desirable Difficulties"
                  researchers="Bjork & Bjork (2011-2024)"
                  application="Conditions that slow acquisition but enhance long-term retention and transfer"
                  highlight
                />
                <ResearchRow
                  theory="Self-Determination Theory"
                  researchers="Ryan & Deci (2020 update)"
                  application="Autonomy, competence, and relatedness drive intrinsic motivation"
                  highlight
                />
              </div>
            </Section>

            {/* Classic Research Foundation */}
            <Section
              icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
              title="Classic Research Foundation"
            >
              <p className="text-sm text-muted-foreground mb-3">
                Built on foundational educational psychology:
              </p>
              <div className="space-y-2">
                <ResearchRow
                  theory="Bloom's Taxonomy"
                  researchers="Anderson & Krathwohl (2001)"
                  application="Classifying explanation depth from Remember to Create"
                />
                <ResearchRow
                  theory="Metacognition"
                  researchers="Flavell (1979)"
                  application="Self-monitoring and knowledge of cognition"
                />
                <ResearchRow
                  theory="Epistemic Markers"
                  researchers="Holmes (1984)"
                  application="Analyzing hedging/certainty language"
                />
                <ResearchRow
                  theory="Dunning-Kruger Effect"
                  researchers="Kruger & Dunning (1999)"
                  application="Detecting overconfidence patterns"
                />
                <ResearchRow
                  theory="Self-Explanation Effect"
                  researchers="Chi et al. (2001)"
                  application="Why explaining improves learning"
                />
                <ResearchRow
                  theory="Conceptual Change"
                  researchers="Posner et al. (1982)"
                  application="Identifying and addressing misconceptions"
                />
                <ResearchRow
                  theory="Zone of Proximal Development"
                  researchers="Vygotsky (1978)"
                  application="Adaptive scaffolding based on current level"
                />
                <ResearchRow
                  theory="Achievement Goals"
                  researchers="Dweck (2006)"
                  application="Detecting mastery vs performance orientation"
                />
              </div>
            </Section>

            {/* Tips */}
            <Section
              icon={<Lightbulb className="h-5 w-5 text-amber-500" />}
              title="Tips for Best Results"
            >
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Think aloud</strong> — Share your reasoning process, not just answers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Be honest</strong> — Say when you're unsure; it helps us help you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Ask questions</strong> — Curiosity is encouraged and tracked positively</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Self-correct</strong> — Revising your thinking shows metacognitive skill</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Make connections</strong> — Link new ideas to things you already know</span>
                </li>
              </ul>
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="font-semibold flex items-center gap-2 mb-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function PsychometricCard({
  title,
  items,
  color,
}: {
  title: string
  items: string[]
  color: string
}) {
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-200 bg-purple-50',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    pink: 'border-pink-200 bg-pink-50',
    cyan: 'border-cyan-200 bg-cyan-50',
  }

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color] || 'border-gray-200 bg-gray-50'}`}>
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <ul className="text-xs text-muted-foreground space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  )
}

function AdaptationRow({
  condition,
  response,
}: {
  condition: string
  response: string
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
        {condition}
      </Badge>
      <span className="text-muted-foreground">→ {response}</span>
    </div>
  )
}

function ResearchRow({
  theory,
  researchers,
  application,
  highlight,
}: {
  theory: string
  researchers: string
  application: string
  highlight?: boolean
}) {
  return (
    <div className={`text-sm border-l-2 pl-3 py-1 ${highlight ? 'border-purple-400 bg-purple-50/50 rounded-r' : 'border-indigo-200'}`}>
      <div className="font-medium flex items-center gap-2">
        {theory}
        {highlight && <Badge variant="secondary" className="text-[10px] px-1 py-0">New</Badge>}
      </div>
      <div className="text-xs text-muted-foreground">{researchers}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{application}</div>
    </div>
  )
}

export default SocraticInfoDialog
