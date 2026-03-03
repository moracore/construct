export const MUSCLE_GROUPS = [
  'Chest',
  'Front Delts',
  'Side Delts',
  'Rear Delts',
  'Triceps',
  'Biceps',
  'Forearms',
  'Lats',
  'Traps',
  'Core',
  'Glutes',
  'Quads',
  'Hamstrings',
  'Calves',
  'Hip Flexors',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export interface Exercise {
  id: string
  name: string
  isBodyweight: boolean
  isDoubleComponent: boolean // L/R tracking
  primaryMuscleGroups: MuscleGroup[]
  secondaryMuscleGroups: MuscleGroup[]
  defaultRestTimerSeconds?: number
  createdAt: number
}

export interface Workout {
  id: string
  name: string
  exerciseIds: string[]
  color: string
  category: string
  createdAt: number
}

export interface ExerciseSet {
  reps: number
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  // For double component (L/R)
  leftWeight?: number
  rightWeight?: number
  leftReps?: number
  rightReps?: number
  rpe?: number
  notes?: string
}

export interface LoggedExercise {
  exerciseId: string
  exerciseName: string
  sets: ExerciseSet[]
}

export interface DayLog {
  id: string
  date: string // YYYY-MM-DD
  workoutName: string
  exercises: LoggedExercise[]
  markdown: string
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  theme: 'dark' | 'light'
  accentColor: string // hex
  defaultRestSeconds?: number
}
