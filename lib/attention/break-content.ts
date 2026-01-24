/**
 * Break Content Generator
 * Provides guided activities for microbreaks
 */

import type { BreakType } from './microbreak-scheduler'

export interface BreathingExercise {
  id: string
  name: string
  description: string
  pattern: BreathingPattern
  durationMs: number
  cycles: number
}

export interface BreathingPattern {
  inhaleMs: number
  holdAfterInhaleMs: number
  exhaleMs: number
  holdAfterExhaleMs: number
}

export interface MovementExercise {
  id: string
  name: string
  description: string
  instructions: string[]
  durationMs: number
  muscleGroups: string[]
  seatedFriendly: boolean
}

export interface MindfulnessExercise {
  id: string
  name: string
  description: string
  prompts: string[]
  durationMs: number
  focusType: 'awareness' | 'gratitude' | 'body_scan' | 'visualization'
}

export interface GazeShiftExercise {
  id: string
  name: string
  description: string
  instructions: string[]
  durationMs: number
}

export type BreakContent =
  | { type: 'breathing'; exercise: BreathingExercise }
  | { type: 'movement'; exercise: MovementExercise }
  | { type: 'mindfulness'; exercise: MindfulnessExercise }
  | { type: 'gaze_shift'; exercise: GazeShiftExercise }

// ============ Breathing Exercises ============

export const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    description: 'A calming technique used by Navy SEALs',
    pattern: {
      inhaleMs: 4000,
      holdAfterInhaleMs: 4000,
      exhaleMs: 4000,
      holdAfterExhaleMs: 4000,
    },
    durationMs: 64000,  // 4 cycles
    cycles: 4,
  },
  {
    id: '4-7-8-breathing',
    name: '4-7-8 Relaxing Breath',
    description: 'Dr. Andrew Weil\'s relaxation technique',
    pattern: {
      inhaleMs: 4000,
      holdAfterInhaleMs: 7000,
      exhaleMs: 8000,
      holdAfterExhaleMs: 0,
    },
    durationMs: 76000,  // 4 cycles
    cycles: 4,
  },
  {
    id: 'energizing-breath',
    name: 'Energizing Breath',
    description: 'Quick breaths to boost alertness',
    pattern: {
      inhaleMs: 2000,
      holdAfterInhaleMs: 1000,
      exhaleMs: 2000,
      holdAfterExhaleMs: 0,
    },
    durationMs: 50000,  // 10 cycles
    cycles: 10,
  },
  {
    id: 'calm-breath',
    name: 'Calming Breath',
    description: 'Extended exhale for relaxation',
    pattern: {
      inhaleMs: 3000,
      holdAfterInhaleMs: 0,
      exhaleMs: 6000,
      holdAfterExhaleMs: 0,
    },
    durationMs: 72000,  // 8 cycles
    cycles: 8,
  },
]

// ============ Movement Exercises ============

export const MOVEMENT_EXERCISES: MovementExercise[] = [
  {
    id: 'neck-rolls',
    name: 'Gentle Neck Rolls',
    description: 'Release tension in neck and shoulders',
    instructions: [
      'Drop your chin to your chest',
      'Slowly roll your head to the right',
      'Continue rolling to look up',
      'Roll to the left and back down',
      'Repeat in the opposite direction',
    ],
    durationMs: 60000,
    muscleGroups: ['neck', 'upper back'],
    seatedFriendly: true,
  },
  {
    id: 'shoulder-shrugs',
    name: 'Shoulder Shrugs',
    description: 'Release shoulder tension',
    instructions: [
      'Raise both shoulders toward your ears',
      'Hold for 3 seconds',
      'Release and let them drop',
      'Repeat 5 times',
      'Roll shoulders forward, then backward',
    ],
    durationMs: 45000,
    muscleGroups: ['shoulders', 'upper back'],
    seatedFriendly: true,
  },
  {
    id: 'wrist-stretches',
    name: 'Wrist and Hand Stretches',
    description: 'Relief for typing fatigue',
    instructions: [
      'Extend your right arm, palm up',
      'Use left hand to gently pull fingers down',
      'Hold for 10 seconds',
      'Switch to palm down, pull fingers up',
      'Repeat with left arm',
    ],
    durationMs: 60000,
    muscleGroups: ['wrists', 'forearms', 'hands'],
    seatedFriendly: true,
  },
  {
    id: 'standing-stretch',
    name: 'Standing Stretch',
    description: 'Full body stretch',
    instructions: [
      'Stand up from your chair',
      'Reach both arms overhead',
      'Interlace fingers and stretch upward',
      'Lean gently to each side',
      'Shake out your arms and legs',
    ],
    durationMs: 75000,
    muscleGroups: ['full body'],
    seatedFriendly: false,
  },
  {
    id: 'desk-twist',
    name: 'Seated Spinal Twist',
    description: 'Gentle back rotation',
    instructions: [
      'Sit up straight in your chair',
      'Place right hand on left knee',
      'Twist gently to the left',
      'Hold for 15 seconds',
      'Repeat on the other side',
    ],
    durationMs: 60000,
    muscleGroups: ['spine', 'core'],
    seatedFriendly: true,
  },
]

// ============ Mindfulness Exercises ============

export const MINDFULNESS_EXERCISES: MindfulnessExercise[] = [
  {
    id: 'breath-awareness',
    name: 'Breath Awareness',
    description: 'Simply notice your breathing',
    prompts: [
      'Close your eyes or soften your gaze',
      'Notice the natural rhythm of your breath',
      'Feel the air entering through your nose',
      'Notice your chest and belly rising',
      'There\'s nothing to change, just observe',
      'When your mind wanders, gently return to the breath',
    ],
    durationMs: 60000,
    focusType: 'awareness',
  },
  {
    id: 'gratitude-moment',
    name: 'Gratitude Moment',
    description: 'Quick appreciation practice',
    prompts: [
      'Take a deep breath',
      'Think of one thing you\'re grateful for right now',
      'It can be something small, like this moment of rest',
      'Feel the appreciation in your body',
      'Let a small smile form',
      'Carry this feeling back to your work',
    ],
    durationMs: 45000,
    focusType: 'gratitude',
  },
  {
    id: 'body-scan-mini',
    name: 'Quick Body Scan',
    description: 'Notice sensations in your body',
    prompts: [
      'Notice your feet on the floor',
      'Feel where your body meets the chair',
      'Notice any tension in your shoulders',
      'Relax your jaw and face muscles',
      'Soften your eyes',
      'Take one deep breath',
    ],
    durationMs: 60000,
    focusType: 'body_scan',
  },
  {
    id: 'mental-reset',
    name: 'Mental Reset',
    description: 'Clear your mind briefly',
    prompts: [
      'Imagine your thoughts as clouds',
      'Watch them drift across your mind\'s sky',
      'You don\'t need to hold onto any thought',
      'Let each one pass naturally',
      'Notice the clear sky behind the clouds',
      'Return with a fresh perspective',
    ],
    durationMs: 75000,
    focusType: 'visualization',
  },
]

// ============ Gaze Shift Exercises ============

export const GAZE_SHIFT_EXERCISES: GazeShiftExercise[] = [
  {
    id: '20-20-20',
    name: '20-20-20 Rule',
    description: 'Look at something 20 feet away for 20 seconds',
    instructions: [
      'Look away from your screen',
      'Find something about 20 feet (6 meters) away',
      'Focus on it for 20 seconds',
      'Let your eye muscles relax',
      'Blink naturally several times',
    ],
    durationMs: 30000,
  },
  {
    id: 'window-gaze',
    name: 'Window Gazing',
    description: 'Look out a window if available',
    instructions: [
      'Look toward a window',
      'Focus on the farthest point you can see',
      'Let your eyes naturally adjust',
      'Notice colors, movement, or clouds',
      'Take three slow breaths',
    ],
    durationMs: 45000,
  },
  {
    id: 'eye-circles',
    name: 'Eye Circles',
    description: 'Gentle eye movement exercise',
    instructions: [
      'Look up without moving your head',
      'Slowly circle your eyes clockwise',
      'Complete 3 circles',
      'Reverse direction for 3 more circles',
      'Close your eyes and rest for a moment',
    ],
    durationMs: 45000,
  },
  {
    id: 'palming',
    name: 'Eye Palming',
    description: 'Rest your eyes in darkness',
    instructions: [
      'Rub your palms together to warm them',
      'Cup your palms over your closed eyes',
      'Don\'t press on your eyeballs',
      'Enjoy the darkness for 30 seconds',
      'Slowly remove hands and open eyes',
    ],
    durationMs: 60000,
  },
]

// ============ Content Selection ============

/**
 * Get a random exercise of the specified type
 */
export function getRandomExercise(type: BreakType, seatedOnly: boolean = false): BreakContent {
  switch (type) {
    case 'breathing': {
      const exercises = BREATHING_EXERCISES
      const exercise = exercises[Math.floor(Math.random() * exercises.length)]
      return { type: 'breathing', exercise }
    }
    case 'movement': {
      let exercises = MOVEMENT_EXERCISES
      if (seatedOnly) {
        exercises = exercises.filter(e => e.seatedFriendly)
      }
      const exercise = exercises[Math.floor(Math.random() * exercises.length)]
      return { type: 'movement', exercise }
    }
    case 'mindfulness': {
      const exercises = MINDFULNESS_EXERCISES
      const exercise = exercises[Math.floor(Math.random() * exercises.length)]
      return { type: 'mindfulness', exercise }
    }
    case 'gaze_shift': {
      const exercises = GAZE_SHIFT_EXERCISES
      const exercise = exercises[Math.floor(Math.random() * exercises.length)]
      return { type: 'gaze_shift', exercise }
    }
  }
}

/**
 * Get a specific exercise by ID
 */
export function getExerciseById(id: string): BreakContent | null {
  // Check breathing
  const breathing = BREATHING_EXERCISES.find(e => e.id === id)
  if (breathing) return { type: 'breathing', exercise: breathing }

  // Check movement
  const movement = MOVEMENT_EXERCISES.find(e => e.id === id)
  if (movement) return { type: 'movement', exercise: movement }

  // Check mindfulness
  const mindfulness = MINDFULNESS_EXERCISES.find(e => e.id === id)
  if (mindfulness) return { type: 'mindfulness', exercise: mindfulness }

  // Check gaze shift
  const gaze = GAZE_SHIFT_EXERCISES.find(e => e.id === id)
  if (gaze) return { type: 'gaze_shift', exercise: gaze }

  return null
}

/**
 * Get quick break content (shorter duration)
 */
export function getQuickBreak(type: BreakType): BreakContent {
  switch (type) {
    case 'breathing':
      return { type: 'breathing', exercise: BREATHING_EXERCISES[2] }  // Energizing breath
    case 'movement':
      return { type: 'movement', exercise: MOVEMENT_EXERCISES[1] }    // Shoulder shrugs
    case 'mindfulness':
      return { type: 'mindfulness', exercise: MINDFULNESS_EXERCISES[1] }  // Gratitude moment
    case 'gaze_shift':
      return { type: 'gaze_shift', exercise: GAZE_SHIFT_EXERCISES[0] }    // 20-20-20
  }
}

/**
 * Get break type display name
 */
export function getBreakTypeName(type: BreakType): string {
  const names: Record<BreakType, string> = {
    breathing: 'Breathing Exercise',
    movement: 'Movement Break',
    mindfulness: 'Mindfulness Moment',
    gaze_shift: 'Eye Rest',
  }
  return names[type]
}

/**
 * Get break type icon name (for lucide-react)
 */
export function getBreakTypeIcon(type: BreakType): string {
  const icons: Record<BreakType, string> = {
    breathing: 'Wind',
    movement: 'Activity',
    mindfulness: 'Brain',
    gaze_shift: 'Eye',
  }
  return icons[type]
}
