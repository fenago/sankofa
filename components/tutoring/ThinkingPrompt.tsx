'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  Search,
  Building,
  Swords,
  Lightbulb,
  Brain,
} from 'lucide-react'
import type { QuestionType } from '@/lib/tutoring/socratic-tutor'

interface ThinkingPromptProps {
  questionType: QuestionType
  question: string
  hint?: string
}

const questionTypeConfig: Record<
  QuestionType,
  {
    icon: React.ReactNode
    label: string
    color: string
    bgColor: string
    description: string
  }
> = {
  clarifying: {
    icon: <HelpCircle className="h-4 w-4" />,
    label: 'Clarifying',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Help me understand your thinking',
  },
  probing: {
    icon: <Search className="h-4 w-4" />,
    label: 'Probing',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    description: "Let's dig deeper into your reasoning",
  },
  scaffolding: {
    icon: <Building className="h-4 w-4" />,
    label: 'Scaffolding',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Building toward understanding step by step',
  },
  challenging: {
    icon: <Swords className="h-4 w-4" />,
    label: 'Challenging',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    description: "Let's test and strengthen your thinking",
  },
  reflection: {
    icon: <Lightbulb className="h-4 w-4" />,
    label: 'Reflection',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    description: "What have you discovered?",
  },
  metacognitive: {
    icon: <Brain className="h-4 w-4" />,
    label: 'Metacognitive',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50 border-pink-200',
    description: 'Think about your thinking process',
  },
}

export function ThinkingPrompt({
  questionType,
  question,
  hint,
}: ThinkingPromptProps) {
  const config = questionTypeConfig[questionType]

  return (
    <Card className={`border ${config.bgColor}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <span className={config.color}>{config.icon}</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${config.color}`}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {config.description}
              </span>
            </div>
            <p className={`font-medium ${config.color}`}>{question}</p>
            {hint && (
              <p className="text-sm text-muted-foreground italic">
                Hint: {hint}
              </p>
            )}
          </div>
        </div>

        {/* Thinking encouragement */}
        <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <Brain className="h-3 w-3" />
          <span>Take your time to think through this. There's no wrong answer - your reasoning matters.</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ThinkingPrompt
