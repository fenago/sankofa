'use client'

import { useState, useRef, useEffect } from 'react'
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
} from 'lucide-react'
import { ThinkingPrompt } from './ThinkingPrompt'
import { DiscoveryMoment } from './DiscoveryMoment'
import type { DialogueState, SocraticExchange, QuestionType } from '@/lib/tutoring/socratic-tutor'

interface SocraticTutorProps {
  dialogueState: DialogueState
  onRespond: (response: string) => Promise<void>
  onEndDialogue: () => void
  isLoading?: boolean
}

export function SocraticTutor({
  dialogueState,
  onRespond,
  onEndDialogue,
  isLoading = false,
}: SocraticTutorProps) {
  const [input, setInput] = useState('')
  const [showDiscovery, setShowDiscovery] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [dialogueState.exchanges])

  // Show discovery animation when discovery made
  useEffect(() => {
    if (dialogueState.discoveryMade && !showDiscovery) {
      setShowDiscovery(true)
    }
  }, [dialogueState.discoveryMade, showDiscovery])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return
    const response = input.trim()
    setInput('')
    await onRespond(response)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const lastExchange = dialogueState.exchanges[dialogueState.exchanges.length - 1]
  const awaitingResponse = lastExchange && !lastExchange.studentResponse

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
                <CardTitle className="text-base">Socratic Tutor</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {dialogueState.skillName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dialogueState.currentUnderstanding}
              </Badge>
              {dialogueState.discoveryMade && (
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
              {dialogueState.exchanges.length === 0 && (
                <TutorMessage>
                  <p>
                    Hi! I'm here to help you understand <strong>{dialogueState.targetConcept}</strong>.
                    I won't just give you the answer - instead, I'll ask questions that help you
                    discover the insight yourself.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ready to start? Let's explore your thinking together.
                  </p>
                </TutorMessage>
              )}

              {/* Exchanges */}
              {dialogueState.exchanges.map((exchange, index) => (
                <ExchangeView key={exchange.id} exchange={exchange} index={index} />
              ))}

              {/* Current question prompt */}
              {awaitingResponse && !isLoading && (
                <ThinkingPrompt
                  questionType={lastExchange.questionType}
                  question={lastExchange.tutorQuestion}
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
              disabled={isLoading}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEndDialogue}
                title="End dialogue"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Discovery celebration overlay */}
      {showDiscovery && (
        <DiscoveryMoment
          description={dialogueState.discoveryDescription}
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

function ExchangeView({ exchange, index }: { exchange: SocraticExchange; index: number }) {
  const questionTypeLabels: Record<QuestionType, string> = {
    clarifying: 'Understanding your thinking',
    probing: 'Exploring deeper',
    scaffolding: 'Building understanding',
    challenging: 'Testing your reasoning',
    reflection: 'Reflecting on learning',
    metacognitive: 'Thinking about thinking',
  }

  return (
    <div className="space-y-3">
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
      {exchange.studentResponse && (
        <StudentMessage>{exchange.studentResponse}</StudentMessage>
      )}
    </div>
  )
}

export default SocraticTutor
