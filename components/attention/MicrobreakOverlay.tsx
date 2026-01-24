'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { X, Play, Pause, SkipForward } from 'lucide-react'
import type { BreakType } from '@/lib/attention/microbreak-scheduler'
import type { BreakContent } from '@/lib/attention/break-content'
import { getRandomExercise, getBreakTypeName } from '@/lib/attention/break-content'
import { BreathingExercise } from './BreathingExercise'
import { MicroMovement } from './MicroMovement'

interface MicrobreakOverlayProps {
  breakType: BreakType
  durationMs?: number
  onComplete: () => void
  onSkip: () => void
  seatedOnly?: boolean
}

export function MicrobreakOverlay({
  breakType,
  durationMs,
  onComplete,
  onSkip,
  seatedOnly = false,
}: MicrobreakOverlayProps) {
  const [content, setContent] = useState<BreakContent | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'exercise' | 'complete'>('intro')

  // Get exercise content
  useEffect(() => {
    const exercise = getRandomExercise(breakType, seatedOnly)
    setContent(exercise)
  }, [breakType, seatedOnly])

  // Timer
  useEffect(() => {
    if (phase !== 'exercise' || isPaused || !content) return

    const exerciseDuration = durationMs || content.exercise.durationMs
    const interval = setInterval(() => {
      setElapsedMs(prev => {
        const next = prev + 100
        if (next >= exerciseDuration) {
          setPhase('complete')
          return exerciseDuration
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [phase, isPaused, content, durationMs])

  // Auto-complete after showing complete screen
  useEffect(() => {
    if (phase !== 'complete') return

    const timer = setTimeout(() => {
      onComplete()
    }, 3000)

    return () => clearTimeout(timer)
  }, [phase, onComplete])

  const startExercise = useCallback(() => {
    setPhase('exercise')
    setElapsedMs(0)
  }, [])

  if (!content) return null

  const totalDuration = durationMs || content.exercise.durationMs
  const progress = (elapsedMs / totalDuration) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {getBreakTypeName(breakType)}
            </h2>
            <p className="text-white/70 text-sm">
              {content.exercise.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkip}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="bg-white/10 rounded-2xl p-6 backdrop-blur">
          {phase === 'intro' && (
            <IntroScreen
              content={content}
              onStart={startExercise}
              onSkip={onSkip}
            />
          )}

          {phase === 'exercise' && (
            <ExerciseScreen
              content={content}
              elapsedMs={elapsedMs}
              totalDuration={totalDuration}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
              onSkip={() => setPhase('complete')}
            />
          )}

          {phase === 'complete' && (
            <CompleteScreen onContinue={onComplete} />
          )}
        </div>

        {/* Progress bar (during exercise) */}
        {phase === 'exercise' && (
          <div className="mt-4">
            <Progress value={progress} className="h-2 bg-white/20" />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>{Math.floor(elapsedMs / 1000)}s</span>
              <span>{Math.floor(totalDuration / 1000)}s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function IntroScreen({
  content,
  onStart,
  onSkip,
}: {
  content: BreakContent
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <div className="text-center py-6">
      <div className="text-6xl mb-4">
        {content.type === 'breathing' && '🌬️'}
        {content.type === 'movement' && '🏃'}
        {content.type === 'mindfulness' && '🧘'}
        {content.type === 'gaze_shift' && '👁️'}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {content.exercise.name}
      </h3>
      <p className="text-white/70 mb-6">
        {content.exercise.description}
      </p>
      <p className="text-white/50 text-sm mb-6">
        Duration: ~{Math.round(content.exercise.durationMs / 1000)} seconds
      </p>
      <div className="flex gap-3 justify-center">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Skip Break
        </Button>
        <Button
          onClick={onStart}
          className="bg-white text-black hover:bg-white/90"
        >
          <Play className="h-4 w-4 mr-2" />
          Begin
        </Button>
      </div>
    </div>
  )
}

function ExerciseScreen({
  content,
  elapsedMs,
  totalDuration,
  isPaused,
  onTogglePause,
  onSkip,
}: {
  content: BreakContent
  elapsedMs: number
  totalDuration: number
  isPaused: boolean
  onTogglePause: () => void
  onSkip: () => void
}) {
  return (
    <div className="py-4">
      {content.type === 'breathing' && (
        <BreathingExercise
          exercise={content.exercise}
          elapsedMs={elapsedMs}
          isPaused={isPaused}
        />
      )}

      {content.type === 'movement' && (
        <MicroMovement
          exercise={content.exercise}
          elapsedMs={elapsedMs}
        />
      )}

      {content.type === 'mindfulness' && (
        <MindfulnessDisplay
          exercise={content.exercise}
          elapsedMs={elapsedMs}
        />
      )}

      {content.type === 'gaze_shift' && (
        <GazeShiftDisplay
          exercise={content.exercise}
          elapsedMs={elapsedMs}
        />
      )}

      {/* Controls */}
      <div className="flex justify-center gap-3 mt-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePause}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Finish Early
        </Button>
      </div>
    </div>
  )
}

function MindfulnessDisplay({
  exercise,
  elapsedMs,
}: {
  exercise: { prompts: string[]; durationMs: number }
  elapsedMs: number
}) {
  const promptDuration = exercise.durationMs / exercise.prompts.length
  const currentIndex = Math.min(
    Math.floor(elapsedMs / promptDuration),
    exercise.prompts.length - 1
  )

  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-6">🧘</div>
      <p className="text-xl text-white font-light leading-relaxed">
        {exercise.prompts[currentIndex]}
      </p>
    </div>
  )
}

function GazeShiftDisplay({
  exercise,
  elapsedMs,
}: {
  exercise: { instructions: string[]; durationMs: number }
  elapsedMs: number
}) {
  const stepDuration = exercise.durationMs / exercise.instructions.length
  const currentIndex = Math.min(
    Math.floor(elapsedMs / stepDuration),
    exercise.instructions.length - 1
  )

  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-6">👁️</div>
      <p className="text-xl text-white font-light leading-relaxed mb-4">
        {exercise.instructions[currentIndex]}
      </p>
      <div className="flex justify-center gap-1">
        {exercise.instructions.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function CompleteScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-4">✨</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Great job!
      </h3>
      <p className="text-white/70 mb-6">
        You're ready to continue with refreshed focus.
      </p>
      <Button
        onClick={onContinue}
        className="bg-white text-black hover:bg-white/90"
      >
        Continue Learning
      </Button>
    </div>
  )
}

export default MicrobreakOverlay
