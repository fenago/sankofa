'use client'

import { useMemo } from 'react'
import type { MovementExercise } from '@/lib/attention/break-content'

interface MicroMovementProps {
  exercise: MovementExercise
  elapsedMs: number
}

export function MicroMovement({ exercise, elapsedMs }: MicroMovementProps) {
  // Calculate current instruction based on elapsed time
  const { currentIndex, progress } = useMemo(() => {
    const stepDuration = exercise.durationMs / exercise.instructions.length
    const index = Math.min(
      Math.floor(elapsedMs / stepDuration),
      exercise.instructions.length - 1
    )
    const stepProgress = (elapsedMs % stepDuration) / stepDuration

    return { currentIndex: index, progress: stepProgress }
  }, [elapsedMs, exercise])

  return (
    <div className="py-4">
      {/* Exercise icon */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">
          {exercise.seatedFriendly ? '🪑' : '🧍'}
        </div>
        <p className="text-white/50 text-sm">
          {exercise.seatedFriendly ? 'Seated exercise' : 'Standing exercise'}
        </p>
      </div>

      {/* Current instruction */}
      <div className="bg-white/5 rounded-xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium">{currentIndex + 1}</span>
          </div>
          <div className="flex-1">
            <p className="text-xl text-white font-light leading-relaxed">
              {exercise.instructions[currentIndex]}
            </p>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/50 transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 mb-4">
        {exercise.instructions.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i === currentIndex
                ? 'bg-white scale-110'
                : i < currentIndex
                ? 'bg-white/70'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Upcoming instructions preview */}
      {currentIndex < exercise.instructions.length - 1 && (
        <div className="text-center">
          <p className="text-white/40 text-sm">
            Next: {exercise.instructions[currentIndex + 1]}
          </p>
        </div>
      )}

      {/* Muscle groups */}
      <div className="mt-6 flex justify-center gap-2 flex-wrap">
        {exercise.muscleGroups.map((group, i) => (
          <span
            key={i}
            className="px-2 py-1 bg-white/10 rounded text-xs text-white/60"
          >
            {group}
          </span>
        ))}
      </div>
    </div>
  )
}

export default MicroMovement
