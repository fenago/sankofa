'use client'

import { useMemo } from 'react'
import type { BreathingExercise as BreathingExerciseType } from '@/lib/attention/break-content'

interface BreathingExerciseProps {
  exercise: BreathingExerciseType
  elapsedMs: number
  isPaused: boolean
}

type BreathPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out'

export function BreathingExercise({
  exercise,
  elapsedMs,
  isPaused,
}: BreathingExerciseProps) {
  const { pattern } = exercise

  // Calculate cycle duration
  const cycleDuration = pattern.inhaleMs + pattern.holdAfterInhaleMs +
    pattern.exhaleMs + pattern.holdAfterExhaleMs

  // Calculate current phase and progress
  const { phase, phaseProgress, cycleNumber } = useMemo(() => {
    const cycleProgress = elapsedMs % cycleDuration
    const cycleNum = Math.floor(elapsedMs / cycleDuration) + 1

    let currentPhase: BreathPhase
    let progress: number

    if (cycleProgress < pattern.inhaleMs) {
      currentPhase = 'inhale'
      progress = cycleProgress / pattern.inhaleMs
    } else if (cycleProgress < pattern.inhaleMs + pattern.holdAfterInhaleMs) {
      currentPhase = 'hold_in'
      progress = (cycleProgress - pattern.inhaleMs) / pattern.holdAfterInhaleMs
    } else if (cycleProgress < pattern.inhaleMs + pattern.holdAfterInhaleMs + pattern.exhaleMs) {
      currentPhase = 'exhale'
      progress = (cycleProgress - pattern.inhaleMs - pattern.holdAfterInhaleMs) / pattern.exhaleMs
    } else {
      currentPhase = 'hold_out'
      progress = (cycleProgress - pattern.inhaleMs - pattern.holdAfterInhaleMs - pattern.exhaleMs) / pattern.holdAfterExhaleMs
    }

    return { phase: currentPhase, phaseProgress: progress, cycleNumber: cycleNum }
  }, [elapsedMs, cycleDuration, pattern])

  // Calculate circle size based on phase
  const circleScale = useMemo(() => {
    switch (phase) {
      case 'inhale':
        return 0.6 + (phaseProgress * 0.4)  // 60% to 100%
      case 'hold_in':
        return 1.0  // 100%
      case 'exhale':
        return 1.0 - (phaseProgress * 0.4)  // 100% to 60%
      case 'hold_out':
        return 0.6  // 60%
    }
  }, [phase, phaseProgress])

  const phaseText = {
    inhale: 'Breathe In',
    hold_in: 'Hold',
    exhale: 'Breathe Out',
    hold_out: 'Hold',
  }

  const phaseColors = {
    inhale: 'from-blue-400 to-blue-600',
    hold_in: 'from-purple-400 to-purple-600',
    exhale: 'from-green-400 to-green-600',
    hold_out: 'from-indigo-400 to-indigo-600',
  }

  return (
    <div className="flex flex-col items-center py-4">
      {/* Breathing circle */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        {/* Outer glow */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${phaseColors[phase]} opacity-20 blur-xl transition-transform duration-300`}
          style={{ transform: `scale(${circleScale * 1.2})` }}
        />

        {/* Main circle */}
        <div
          className={`absolute rounded-full bg-gradient-to-br ${phaseColors[phase]} transition-all duration-300 ease-out`}
          style={{
            width: `${circleScale * 160}px`,
            height: `${circleScale * 160}px`,
          }}
        />

        {/* Inner content */}
        <div className="relative z-10 text-center">
          <div className="text-white/90 text-lg font-medium">
            {phaseText[phase]}
          </div>
          {pattern.holdAfterInhaleMs > 0 || pattern.holdAfterExhaleMs > 0 ? (
            <div className="text-white/60 text-sm">
              {phase === 'inhale' && `${Math.ceil(pattern.inhaleMs / 1000 - (phaseProgress * pattern.inhaleMs / 1000))}`}
              {phase === 'hold_in' && `${Math.ceil(pattern.holdAfterInhaleMs / 1000 - (phaseProgress * pattern.holdAfterInhaleMs / 1000))}`}
              {phase === 'exhale' && `${Math.ceil(pattern.exhaleMs / 1000 - (phaseProgress * pattern.exhaleMs / 1000))}`}
              {phase === 'hold_out' && `${Math.ceil(pattern.holdAfterExhaleMs / 1000 - (phaseProgress * pattern.holdAfterExhaleMs / 1000))}`}
            </div>
          ) : null}
        </div>
      </div>

      {/* Cycle indicator */}
      <div className="flex items-center gap-2 text-white/50">
        <span>Cycle</span>
        <div className="flex gap-1">
          {Array.from({ length: exercise.cycles }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < cycleNumber ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Pattern info */}
      <div className="mt-4 text-center">
        <p className="text-white/70 text-sm">
          {exercise.name}
        </p>
        <p className="text-white/50 text-xs mt-1">
          {pattern.inhaleMs / 1000}s in
          {pattern.holdAfterInhaleMs > 0 && ` - ${pattern.holdAfterInhaleMs / 1000}s hold`}
          {` - ${pattern.exhaleMs / 1000}s out`}
          {pattern.holdAfterExhaleMs > 0 && ` - ${pattern.holdAfterExhaleMs / 1000}s hold`}
        </p>
      </div>
    </div>
  )
}

export default BreathingExercise
