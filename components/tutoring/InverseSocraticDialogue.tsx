'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Send,
  GraduationCap,
  User,
  BookOpen,
  Brain,
  Target,
  Trophy,
  AlertCircle,
  Lightbulb,
  X,
} from 'lucide-react'
import { useInverseSocratic, type InverseSocraticSummary } from '@/hooks/useInverseSocratic'
import type { LearnerPersona } from '@/lib/socratic'
import { cn } from '@/lib/utils'

interface InverseSocraticDialogueProps {
  notebookId: string
  skillId: string
  skillName: string
  targetConcept: string
  onComplete?: (summary: InverseSocraticSummary) => void
  onExit?: () => void
}

const PERSONA_OPTIONS: { value: LearnerPersona; label: string; description: string }[] = [
  {
    value: 'curious_beginner',
    label: 'Curious Beginner',
    description: 'Knows nothing, asks basic questions',
  },
  {
    value: 'engaged_student',
    label: 'Engaged Student',
    description: 'Some knowledge, asks follow-ups',
  },
  {
    value: 'skeptical_learner',
    label: 'Skeptical Learner',
    description: 'Questions everything, asks "why?"',
  },
  {
    value: 'confused_novice',
    label: 'Confused Novice',
    description: 'Struggles to understand, needs patience',
  },
  {
    value: 'eager_peer',
    label: 'Eager Peer',
    description: 'Collaborative, builds on ideas',
  },
]

export function InverseSocraticDialogue({
  notebookId,
  skillId,
  skillName,
  targetConcept,
  onComplete,
  onExit,
}: InverseSocraticDialogueProps) {
  const [selectedPersona, setSelectedPersona] = useState<LearnerPersona>('curious_beginner')
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isLoading,
    isStarted,
    isComplete,
    error,
    summary,
    currentUnderstanding,
    teachingMetrics,
    exchangeCount,
    maxExchanges,
    startDialogue,
    sendMessage,
    endDialogue,
    reset,
  } = useInverseSocratic({
    notebookId,
    skillId,
    skillName,
    targetConcept,
    learnerPersona: selectedPersona,
    maxExchanges: 8,
    onComplete,
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input after AI response
  useEffect(() => {
    if (!isLoading && isStarted && !isComplete && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading, isStarted, isComplete])

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue.trim())
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Pre-start: Persona selection
  if (!isStarted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-green-600" />
                Teach to Learn Mode
              </CardTitle>
              <CardDescription className="mt-1">
                Teach an AI learner about &ldquo;{skillName}&rdquo; to deepen your understanding
              </CardDescription>
            </div>
            {onExit && (
              <Button variant="ghost" size="icon" onClick={onExit}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Research backing */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Why teaching helps you learn</p>
                <p className="text-green-700 mt-1">
                  Research shows that teaching others increases retention by 50%+ (Bargh & Schul, 1980).
                  When you explain concepts, you organize your knowledge, identify gaps, and build stronger memories.
                </p>
              </div>
            </div>
          </div>

          {/* Persona selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Choose your learner type</label>
            <Select value={selectedPersona} onValueChange={(v) => setSelectedPersona(v as LearnerPersona)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a learner persona" />
              </SelectTrigger>
              <SelectContent>
                {PERSONA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Different learner types will ask different kinds of questions, challenging you in different ways.
            </p>
          </div>

          {/* What to expect */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">What to expect</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-500">1.</span>
                The AI learner will ask you to explain &ldquo;{skillName}&rdquo;
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">2.</span>
                Teach them as if they know nothing about the topic
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">3.</span>
                They&apos;ll ask questions, express confusion, and want examples
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">4.</span>
                Your teaching will be analyzed to reveal your understanding
              </li>
            </ul>
          </div>

          <Button onClick={startDialogue} className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <GraduationCap className="h-4 w-4 mr-2" />
                Start Teaching
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Complete: Show summary
  if (isComplete && summary) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Teaching Session Complete
          </CardTitle>
          <CardDescription>
            Here&apos;s how your teaching went
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall score */}
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <div className="text-4xl font-bold text-green-600">
              {Math.round(summary.overallTeachingScore * 100)}%
            </div>
            <p className="text-sm text-green-700 mt-1">Overall Teaching Score</p>
          </div>

          {/* Learner feedback */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-blue-800">Your learner says:</p>
                <p className="text-blue-700 mt-1">&ldquo;{summary.learnerFeedback}&rdquo;</p>
              </div>
            </div>
          </div>

          {/* Learner understanding */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Learner&apos;s Understanding</span>
              <span className="text-muted-foreground">{Math.round(summary.learnerUnderstanding * 100)}%</span>
            </div>
            <Progress value={summary.learnerUnderstanding * 100} className="h-2" />
          </div>

          {/* Psychometric highlights */}
          <div className="space-y-3">
            <h4 className="font-medium">Your Teaching Analysis</h4>
            <div className="grid grid-cols-2 gap-3">
              {summary.psychometricHighlights.map((highlight, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{highlight.category}</span>
                    <Badge variant={highlight.score > 0.7 ? 'default' : highlight.score > 0.4 ? 'secondary' : 'outline'}>
                      {Math.round(highlight.score * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{highlight.interpretation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and improvements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-700">Strengths</h4>
              <p className="text-sm text-muted-foreground">{summary.strengthSummary}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-700">Areas to Develop</h4>
              <p className="text-sm text-muted-foreground">{summary.improvementSummary}</p>
            </div>
          </div>

          {/* Research connection */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <Brain className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <p className="text-purple-700">{summary.researchConnection}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" className="flex-1">
              Teach Again
            </Button>
            {onExit && (
              <Button onClick={onExit} className="flex-1">
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Active dialogue
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-green-600" />
              Teaching: {skillName}
            </CardTitle>
            <CardDescription className="text-xs">
              {PERSONA_OPTIONS.find(p => p.value === selectedPersona)?.label} learner
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              Exchange {exchangeCount}/{maxExchanges}
            </div>
            <Button variant="ghost" size="sm" onClick={endDialogue}>
              End Session
            </Button>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Learner Understanding</span>
              <span>{Math.round(currentUnderstanding * 100)}%</span>
            </div>
            <Progress value={currentUnderstanding * 100} className="h-1.5" />
          </div>
          {teachingMetrics && (
            <div className="text-xs text-right">
              <div className="text-muted-foreground">Teaching Quality</div>
              <div className="font-medium">
                {Math.round(teachingMetrics.overallExplanationQuality * 100)}%
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages */}
        <ScrollArea className="h-[400px] px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-green-100 text-green-700'
                )}>
                  {message.role === 'user' ? (
                    <BookOpen className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'user' && message.psychometrics && (
                    <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                      <div className="flex gap-2 flex-wrap">
                        {message.psychometrics.usesExamples && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            Uses examples
                          </Badge>
                        )}
                        {message.psychometrics.usesAnalogies && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            Uses analogies
                          </Badge>
                        )}
                        {message.psychometrics.checksForUnderstanding && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            Checks understanding
                          </Badge>
                        )}
                        {message.psychometrics.surfaceVsDeep === 'deep' && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            Deep explanation
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 text-green-700 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Explain the concept to your learner..."
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Use examples, analogies, and check if your learner understands
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default InverseSocraticDialogue
