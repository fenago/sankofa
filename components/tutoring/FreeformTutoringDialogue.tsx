'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  Send,
  MessageCircle,
  User,
  Bot,
  Brain,
  Trophy,
  AlertCircle,
  Lightbulb,
  X,
  Sparkles,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { useFreeformTutor } from '@/hooks/useFreeformTutor'
import type { LearnerProfile, FreeformDialogueSummary } from '@/lib/socratic'
import { cn } from '@/lib/utils'

interface FreeformTutoringDialogueProps {
  notebookId: string
  skillId: string
  skillName: string
  skillDescription?: string
  targetConcepts?: string[]
  initialProfile?: Partial<LearnerProfile>
  onComplete?: (summary: FreeformDialogueSummary) => void
  onExit?: () => void
}

export function FreeformTutoringDialogue({
  notebookId,
  skillId,
  skillName,
  skillDescription,
  targetConcepts = [],
  initialProfile,
  onComplete,
  onExit,
}: FreeformTutoringDialogueProps) {
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
    conversationMetrics,
    exchangeCount,
    maxExchanges,
    topicsCovered,
    insightsGained,
    startDialogue,
    sendMessage,
    endDialogue,
    reset,
  } = useFreeformTutor({
    notebookId,
    skillId,
    skillName,
    skillDescription,
    targetConcepts,
    maxExchanges: 15,
    initialProfile,
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

  // Get curiosity trend icon
  const getCuriosityTrendIcon = () => {
    if (!conversationMetrics) return null
    switch (conversationMetrics.curiosityTrend) {
      case 'increasing':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'decreasing':
        return <TrendingDown className="h-3 w-3 text-amber-500" />
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />
    }
  }

  // Pre-start: Introduction
  if (!isStarted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Ask Questions Mode
              </CardTitle>
              <CardDescription className="mt-1">
                Explore &ldquo;{skillName}&rdquo; by asking whatever&apos;s on your mind
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
          {/* Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">How this works</p>
                <p className="text-blue-700 mt-1">
                  This is your space to ask questions and explore. You lead the conversation
                  by asking whatever you&apos;re curious about. The AI adapts its responses
                  to your learning style and helps deepen your understanding through
                  strategic questions.
                </p>
              </div>
            </div>
          </div>

          {/* What you can do */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">What you can do</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                Ask any question about &ldquo;{skillName}&rdquo;
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                Request examples, analogies, or simpler explanations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                Challenge ideas or ask &ldquo;what if&rdquo; questions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                Explore connections to other topics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                Express confusion - it&apos;s part of learning!
              </li>
            </ul>
          </div>

          {/* What gets tracked */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Brain className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-purple-800">Learning insights</p>
                <p className="text-purple-700 mt-1">
                  Your questions and responses reveal how you learn. We&apos;ll track your
                  curiosity patterns, understanding progress, and help identify areas
                  where you might want to dig deeper.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={startDialogue} className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Asking Questions
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
            Session Complete
          </CardTitle>
          <CardDescription>
            Here&apos;s what we learned about your learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metrics overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(summary.metrics.engagementScore * 100)}%
              </div>
              <p className="text-xs text-blue-700 mt-1">Engagement</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(summary.metrics.understandingScore * 100)}%
              </div>
              <p className="text-xs text-green-700 mt-1">Understanding</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(summary.metrics.questionQualityScore * 100)}%
              </div>
              <p className="text-xs text-purple-700 mt-1">Question Depth</p>
            </div>
          </div>

          {/* Curiosity trend */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Curiosity trend:</span>
            <div className="flex items-center gap-1">
              {summary.metrics.curiosityTrend === 'increasing' && (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Growing</span>
                </>
              )}
              {summary.metrics.curiosityTrend === 'decreasing' && (
                <>
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Waning</span>
                </>
              )}
              {summary.metrics.curiosityTrend === 'stable' && (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Steady</span>
                </>
              )}
            </div>
          </div>

          {/* Highlights */}
          {summary.highlights.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Highlights</p>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    {summary.highlights.map((highlight, i) => (
                      <li key={i}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Insights gained */}
          {summary.insightsGained.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Your &ldquo;Aha&rdquo; Moments
              </h4>
              <div className="flex flex-wrap gap-2">
                {summary.insightsGained.slice(0, 5).map((insight, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {insight.length > 40 ? insight.slice(0, 40) + '...' : insight}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Topics covered */}
          {summary.topicsCovered.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Topics Explored</h4>
              <div className="flex flex-wrap gap-2">
                {summary.topicsCovered.map((topic, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {summary.suggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Suggestions for Next Time</p>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    {summary.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Session stats */}
          <div className="text-center text-sm text-muted-foreground">
            {summary.totalExchanges} exchanges | {summary.questionsAsked.length} questions asked
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" className="flex-1">
              Start New Session
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
              <MessageCircle className="h-4 w-4 text-blue-600" />
              Exploring: {skillName}
            </CardTitle>
            <CardDescription className="text-xs">
              Ask anything you&apos;re curious about
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              {exchangeCount}/{maxExchanges}
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
              <span>Session Progress</span>
              <span>{Math.round((exchangeCount / maxExchanges) * 100)}%</span>
            </div>
            <Progress value={(exchangeCount / maxExchanges) * 100} className="h-1.5" />
          </div>
          {conversationMetrics && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Curiosity</span>
                {getCuriosityTrendIcon()}
              </div>
              {insightsGained.length > 0 && (
                <div className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 text-amber-500" />
                  <span className="font-medium">{insightsGained.length}</span>
                </div>
              )}
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
                    : 'bg-blue-100 text-blue-700'
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* User message analysis badges */}
                  {message.role === 'user' && message.psychometrics && (
                    <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                      <div className="flex gap-2 flex-wrap">
                        {message.psychometrics.questionDepth === 'deep' && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            Deep question
                          </Badge>
                        )}
                        {message.psychometrics.insightMoments.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            <Lightbulb className="h-2.5 w-2.5 mr-1" />
                            Insight!
                          </Badge>
                        )}
                        {message.psychometrics.selfAwarenessShown && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            Self-aware
                          </Badge>
                        )}
                        {message.psychometrics.curiosityLevel > 0.7 && (
                          <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20">
                            High curiosity
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strategic element indicator */}
                  {message.role === 'assistant' && message.strategicElement && (
                    <div className="mt-2 pt-2 border-t">
                      <Badge variant="outline" className="text-[10px]">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        {message.strategicElement.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 shrink-0">
                  <Bot className="h-4 w-4" />
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
              placeholder="Ask a question or share your thoughts..."
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
            {topicsCovered.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {topicsCovered.length} topic{topicsCovered.length !== 1 ? 's' : ''} explored
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FreeformTutoringDialogue
