'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageCircle,
  Send,
  Brain,
  Sparkles,
  User,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  Coffee,
  ArrowLeftRight,
  X,
} from 'lucide-react'
import { ThinkingPrompt } from './ThinkingPrompt'
import { DiscoveryMoment } from './DiscoveryMoment'
import { DialogueSummary } from './DialogueSummary'
import { useSocraticDialogue, type DialogueSummary as DialogueSummaryType } from '@/hooks/useSocraticDialogue'
import type { QuestionType } from '@/lib/tutoring/socratic-tutor'
import type { SocraticIntervention } from '@/lib/socratic/adaptive-generator'

interface SocraticDialogueContainerProps {
  notebookId: string
  skillId: string
  skillName: string
  targetConcept: string
  misconceptions: string[]
  onComplete?: (summary: DialogueSummaryType) => void
  onExit?: () => void
}

interface Exchange {
  id: string
  questionType: QuestionType
  tutorQuestion: string
  learnerResponse?: string
  ledToDiscovery?: boolean
}

export function SocraticDialogueContainer({
  notebookId,
  skillId,
  skillName,
  targetConcept,
  misconceptions,
  onComplete,
  onExit,
}: SocraticDialogueContainerProps) {
  const [input, setInput] = useState('')
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [discoveryDescription, setDiscoveryDescription] = useState<string | null>(null)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [intervention, setIntervention] = useState<SocraticIntervention | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    isActive,
    isLoading,
    currentQuestion,
    questionType,
    error,
    startDialogue,
    sendResponse,
    endDialogue,
    resetDialogue,
    discoveryMade,
    exchangeCount,
    summary,
    lastExtraction,
  } = useSocraticDialogue({
    notebookId,
    onDiscovery: (desc) => {
      setDiscoveryDescription(desc)
      setShowDiscovery(true)
    },
    onInterventionNeeded: (i) => {
      if (i.type !== 'none') {
        setIntervention(i)
      }
    },
    onDialogueComplete: (sum) => {
      onComplete?.(sum)
    },
  })

  // Start dialogue on mount
  useEffect(() => {
    startDialogue(skillId, skillName, targetConcept, misconceptions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track exchanges
  useEffect(() => {
    if (currentQuestion && questionType) {
      // Add new tutor question
      const existingExchange = exchanges.find(
        (e) => e.tutorQuestion === currentQuestion && !e.learnerResponse
      )
      if (!existingExchange) {
        setExchanges((prev) => [
          ...prev,
          {
            id: `exchange-${Date.now()}`,
            questionType,
            tutorQuestion: currentQuestion,
          },
        ])
      }
    }
  }, [currentQuestion, questionType, exchanges])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [exchanges, isLoading])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const response = input.trim()
    setInput('')

    // Update the last exchange with the response
    setExchanges((prev) => {
      const updated = [...prev]
      const lastIdx = updated.length - 1
      if (lastIdx >= 0 && !updated[lastIdx].learnerResponse) {
        updated[lastIdx] = {
          ...updated[lastIdx],
          learnerResponse: response,
        }
      }
      return updated
    })

    await sendResponse(response)
    inputRef.current?.focus()
  }, [input, isLoading, sendResponse])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleEndDialogue = useCallback(async () => {
    await endDialogue()
  }, [endDialogue])

  const handleInterventionAction = useCallback((action: string) => {
    if (action === 'take_break' || action === 'continue_anyway') {
      setIntervention(null)
    } else if (action === 'switch_topic') {
      setIntervention(null)
      onExit?.()
    }
  }, [onExit])

  const awaitingResponse = currentQuestion && !isLoading

  // Show summary if dialogue is complete
  if (summary) {
    return (
      <DialogueSummary
        summary={summary}
        onContinue={() => {
          resetDialogue()
          onExit?.()
        }}
        onPracticeMore={() => {
          resetDialogue()
          startDialogue(skillId, skillName, targetConcept, misconceptions)
        }}
        onExit={onExit}
      />
    )
  }

  const questionTypeLabels: Record<QuestionType, string> = {
    clarifying: 'Understanding your thinking',
    probing: 'Exploring deeper',
    scaffolding: 'Building understanding',
    challenging: 'Testing your reasoning',
    reflection: 'Reflecting on learning',
    metacognitive: 'Thinking about thinking',
  }

  return (
    <>
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Socratic Dialogue</CardTitle>
                <p className="text-sm text-muted-foreground">{skillName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {exchangeCount} exchanges
              </Badge>
              {discoveryMade && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Discovery!
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            <div className="space-y-4">
              {/* Initial greeting */}
              {exchanges.length === 0 && !isLoading && (
                <TutorMessage>
                  <p>
                    Hi! I'm here to help you understand <strong>{targetConcept}</strong>.
                    I won't just give you the answer - instead, I'll ask questions that help you
                    discover the insight yourself.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ready to start? Let's explore your thinking together.
                  </p>
                </TutorMessage>
              )}

              {/* Exchanges */}
              {exchanges.map((exchange, index) => (
                <div key={exchange.id} className="space-y-3">
                  {/* Tutor question */}
                  <TutorMessage>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {questionTypeLabels[exchange.questionType]}
                      </Badge>
                      {exchange.ledToDiscovery && (
                        <Badge className="text-xs bg-amber-100 text-amber-700">
                          <Lightbulb className="h-3 w-3 mr-1" />
                          Led to insight
                        </Badge>
                      )}
                    </div>
                    <p>{exchange.tutorQuestion}</p>
                  </TutorMessage>

                  {/* Student response */}
                  {exchange.learnerResponse && (
                    <StudentMessage>{exchange.learnerResponse}</StudentMessage>
                  )}
                </div>
              ))}

              {/* Current question prompt */}
              {awaitingResponse && questionType && (
                <ThinkingPrompt
                  questionType={questionType}
                  question={currentQuestion || ''}
                />
              )}

              {/* Loading indicator */}
              {isLoading && (
                <TutorMessage>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </TutorMessage>
              )}

              {/* Error display */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Intervention Alert */}
              {intervention && intervention.type !== 'none' && (
                <InterventionAlert
                  intervention={intervention}
                  onAction={handleInterventionAction}
                />
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t p-4">
          <div className="flex gap-2 w-full">
            <Textarea
              ref={inputRef}
              placeholder="Share your thinking..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none flex-1"
              disabled={isLoading || !isActive}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading || !isActive}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEndDialogue}
                title="End dialogue"
                disabled={isLoading}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Discovery celebration overlay */}
      {showDiscovery && discoveryDescription && (
        <DiscoveryMoment
          description={discoveryDescription}
          onComplete={() => setShowDiscovery(false)}
        />
      )}
    </>
  )
}

function TutorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-purple-100 text-purple-600">
          <Brain className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-muted rounded-lg p-3 prose prose-sm max-w-none">
        {children}
      </div>
    </div>
  )
}

function StudentMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 flex-row-reverse">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-primary/10 rounded-lg p-3 text-sm">
        {children}
      </div>
    </div>
  )
}

function InterventionAlert({
  intervention,
  onAction,
}: {
  intervention: SocraticIntervention
  onAction: (action: string) => void
}) {
  const icons: Record<string, React.ReactNode> = {
    take_break: <Coffee className="h-4 w-4" />,
    simplify: <Brain className="h-4 w-4" />,
    encourage: <Sparkles className="h-4 w-4" />,
    celebrate: <Sparkles className="h-4 w-4" />,
    switch_topic: <ArrowLeftRight className="h-4 w-4" />,
  }

  const colors: Record<string, string> = {
    take_break: 'border-yellow-200 bg-yellow-50',
    simplify: 'border-blue-200 bg-blue-50',
    encourage: 'border-green-200 bg-green-50',
    celebrate: 'border-purple-200 bg-purple-50',
    switch_topic: 'border-orange-200 bg-orange-50',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[intervention.type] || 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {icons[intervention.type] || <AlertTriangle className="h-4 w-4" />}
          <div>
            <p className="font-medium text-sm">
              {intervention.message || 'Intervention needed'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onAction('continue_anyway')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {intervention.type === 'take_break' && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => onAction('take_break')}>
            Take a Break
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('continue_anyway')}>
            Continue Anyway
          </Button>
        </div>
      )}
      {intervention.type === 'switch_topic' && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => onAction('switch_topic')}>
            Switch Topic
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('continue_anyway')}>
            Keep Going
          </Button>
        </div>
      )}
    </div>
  )
}

export default SocraticDialogueContainer
