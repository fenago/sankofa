'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Brain,
  Lightbulb,
  Target,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'

export type PromptType =
  | 'confidence_check'
  | 'reflection'
  | 'prediction'
  | 'strategy_selection'
  | 'error_analysis'

interface MetacognitivePrompt {
  type: PromptType
  title: string
  message: string
  options?: { label: string; value: string }[]
  requiresText?: boolean
  textPlaceholder?: string
}

interface MetacognitivePromptDialogProps {
  prompt: MetacognitivePrompt | null
  open: boolean
  onClose: () => void
  onSubmit: (response: MetacognitiveResponse) => void
}

export interface MetacognitiveResponse {
  promptType: PromptType
  selectedOption?: string
  textResponse?: string
  timestamp: string
}

// Pre-built prompts for common scenarios
export const METACOGNITIVE_PROMPTS: Record<string, MetacognitivePrompt> = {
  pre_attempt_confidence: {
    type: 'confidence_check',
    title: 'How confident are you?',
    message: 'Before you start, how confident are you that you can solve this problem?',
    options: [
      { label: 'Very confident', value: 'very_confident' },
      { label: 'Somewhat confident', value: 'somewhat_confident' },
      { label: 'Not very confident', value: 'not_confident' },
      { label: 'Not sure', value: 'unsure' },
    ],
  },
  post_attempt_reflection: {
    type: 'reflection',
    title: 'Reflect on your attempt',
    message: 'How did that go? What did you learn?',
    requiresText: true,
    textPlaceholder: 'What worked well? What was challenging?',
  },
  prediction: {
    type: 'prediction',
    title: 'Make a prediction',
    message: 'Before seeing the answer, what do you think the result will be?',
    requiresText: true,
    textPlaceholder: 'I predict that...',
  },
  strategy_selection: {
    type: 'strategy_selection',
    title: 'Choose your approach',
    message: 'How are you planning to tackle this problem?',
    options: [
      { label: 'Work through step by step', value: 'step_by_step' },
      { label: 'Look for patterns', value: 'pattern_finding' },
      { label: 'Try examples first', value: 'examples_first' },
      { label: 'Start with what I know', value: 'prior_knowledge' },
    ],
  },
  error_analysis: {
    type: 'error_analysis',
    title: 'Analyze your mistake',
    message: "That wasn't quite right. What do you think went wrong?",
    options: [
      { label: 'Careless mistake', value: 'careless' },
      { label: "Didn't understand the concept", value: 'conceptual' },
      { label: 'Forgot a step', value: 'procedural' },
      { label: 'Misread the problem', value: 'misread' },
    ],
    requiresText: true,
    textPlaceholder: 'What would you do differently next time?',
  },
}

export function MetacognitivePromptDialog({
  prompt,
  open,
  onClose,
  onSubmit,
}: MetacognitivePromptDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [textResponse, setTextResponse] = useState('')

  // Get icon for prompt type
  const getPromptIcon = (type: PromptType) => {
    switch (type) {
      case 'confidence_check':
        return <Target className="h-5 w-5 text-amber-500" />
      case 'reflection':
        return <Brain className="h-5 w-5 text-purple-500" />
      case 'prediction':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />
      case 'strategy_selection':
        return <HelpCircle className="h-5 w-5 text-blue-500" />
      case 'error_analysis':
        return <CheckCircle2 className="h-5 w-5 text-red-500" />
      default:
        return <Brain className="h-5 w-5" />
    }
  }

  const handleSubmit = () => {
    if (!prompt) return

    const response: MetacognitiveResponse = {
      promptType: prompt.type,
      selectedOption: selectedOption ?? undefined,
      textResponse: textResponse || undefined,
      timestamp: new Date().toISOString(),
    }

    onSubmit(response)
    setSelectedOption(null)
    setTextResponse('')
    onClose()
  }

  const handleSkip = () => {
    setSelectedOption(null)
    setTextResponse('')
    onClose()
  }

  const isValid = () => {
    if (!prompt) return false
    if (prompt.options && !selectedOption) return false
    if (prompt.requiresText && !prompt.options && !textResponse.trim()) return false
    return true
  }

  if (!prompt) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPromptIcon(prompt.type)}
            <span>{prompt.title}</span>
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {prompt.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Options */}
          {prompt.options && (
            <div className="grid grid-cols-2 gap-2">
              {prompt.options.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedOption === option.value ? 'default' : 'outline'}
                  className={`h-auto py-3 px-4 justify-start ${
                    selectedOption === option.value
                      ? 'bg-primary text-primary-foreground'
                      : ''
                  }`}
                  onClick={() => setSelectedOption(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}

          {/* Text input */}
          {prompt.requiresText && (
            <Textarea
              placeholder={prompt.textPlaceholder}
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              className="min-h-[100px]"
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid()}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quick confidence check inline component (for use without dialog)
 */
export function QuickConfidenceCheck({
  onSelect,
}: {
  onSelect: (confidence: 'high' | 'medium' | 'low') => void
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
      <span className="text-sm text-amber-700">How confident?</span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-green-100"
          onClick={() => onSelect('high')}
        >
          <ThumbsUp className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-amber-100"
          onClick={() => onSelect('medium')}
        >
          <HelpCircle className="h-4 w-4 text-amber-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-red-100"
          onClick={() => onSelect('low')}
        >
          <ThumbsDown className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  )
}
