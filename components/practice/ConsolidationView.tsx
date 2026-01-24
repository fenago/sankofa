'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Brain,
  Sparkles,
  Link2,
  BookOpen,
  RotateCw,
} from 'lucide-react'
import type { ConsolidationData, WorkedSolution } from '@/lib/practice/productive-failure'

interface ConsolidationViewProps {
  data: ConsolidationData
  onPracticeMore: () => void
  onNextSkill: () => void
}

export function ConsolidationView({
  data,
  onPracticeMore,
  onNextSkill,
}: ConsolidationViewProps) {
  const [activeTab, setActiveTab] = useState('insight')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full">
          <Lightbulb className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold">The Key Insight</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {data.keyInsight}
        </p>
      </div>

      {/* Conceptual Gain Badge */}
      <div className="flex justify-center">
        <Badge className="text-sm py-1.5 px-4 bg-green-100 text-green-700 hover:bg-green-100">
          <Brain className="h-4 w-4 mr-2" />
          Conceptual Gain: {(data.conceptualGain * 100).toFixed(0)}%
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insight">Key Insight</TabsTrigger>
          <TabsTrigger value="exploration">Your Exploration</TabsTrigger>
          <TabsTrigger value="solution">Full Solution</TabsTrigger>
        </TabsList>

        {/* Key Insight Tab */}
        <TabsContent value="insight" className="space-y-4">
          {/* Why It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Why This Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.whyItWorks.map((principle, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Connections to Exploration */}
          {data.connectionToExploration.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-purple-600" />
                  Connecting to Your Thinking
                </CardTitle>
                <CardDescription>
                  Your exploration wasn't wasted - here's how it connects to the solution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.connectionToExploration.map((connection, i) => (
                    <li key={i} className="flex items-start gap-3 text-purple-700">
                      <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{connection}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Your Exploration Tab */}
        <TabsContent value="exploration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                What You Tried
              </CardTitle>
              <CardDescription>
                Every attempt built understanding, even when it didn't reach the answer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {data.whatYouTried.map((attempt, i) => (
                  <AccordionItem key={i} value={`attempt-${i}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          Attempt {attempt.attemptNumber}
                        </span>
                        {attempt.ledToInsight && (
                          <Badge variant="secondary" className="text-xs">
                            Led to insight
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm italic">"{attempt.approach}"</p>
                      </div>

                      {attempt.whatWasRight.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-2">
                            What was on track:
                          </p>
                          <ul className="space-y-1">
                            {attempt.whatWasRight.map((item, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {attempt.whatWasMissing.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-amber-700 mb-2">
                            The missing piece:
                          </p>
                          <ul className="space-y-1">
                            {attempt.whatWasMissing.map((item, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-amber-600">
                                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Solution Tab */}
        <TabsContent value="solution" className="space-y-4">
          <WorkedSolutionView solution={data.correctApproach} />
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-4 justify-center pt-4">
        <Button variant="outline" onClick={onPracticeMore}>
          <RotateCw className="h-4 w-4 mr-2" />
          Practice This Skill
        </Button>
        <Button onClick={onNextSkill}>
          Continue Learning
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

function WorkedSolutionView({ solution }: { solution: WorkedSolution }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Step-by-Step Solution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Steps */}
        <div className="space-y-4">
          {solution.steps.map((step, i) => (
            <div key={i} className="relative pl-8">
              {/* Step number */}
              <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">{step.stepNumber}</span>
              </div>
              {/* Connector line */}
              {i < solution.steps.length - 1 && (
                <div className="absolute left-3 top-6 w-px h-full bg-blue-200" />
              )}
              {/* Step content */}
              <div className="space-y-2 pb-4">
                <p className="font-medium">{step.description}</p>
                <p className="text-sm text-muted-foreground">{step.reasoning}</p>
                {step.commonMistakeHere && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                    <span className="font-medium text-amber-700">Common mistake: </span>
                    <span className="text-amber-600">{step.commonMistakeHere}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Final Answer */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-800 mb-2">Final Answer</p>
          <p className="text-green-700">{solution.finalAnswer}</p>
        </div>

        {/* Key Principles */}
        <div>
          <p className="font-medium mb-3">Key Principles</p>
          <div className="flex flex-wrap gap-2">
            {solution.keyPrinciples.map((principle, i) => (
              <Badge key={i} variant="secondary">
                {principle}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConsolidationView
