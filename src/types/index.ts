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
  'Obliques',
  'Glutes',
  'Quads',
  'Hamstrings',
  'Calves',
  'Hip Flexors',
  'Adductors',
  'Lower Back',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export interface Exercise {
  id: string
  name: string
  isBodyweight: boolean
  isDoubleComponent: boolean // L/R tracking
  isTimed?: boolean
  timedTargetSeconds?: number
  bodyweightMultiplier?: number // fraction of user bodyweight that counts as load (e.g. 0.75)
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
  // For timed exercises (seconds)
  duration?: number
  leftDuration?: number
  rightDuration?: number
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

export type HomePanelWidget =
  | 'muscle-mvps'
  | 'week-volume'
  | 'week-volume-pct'
  | 'suggested-targets'
  | 'weekly-frequency'
  | 'rest-day-counter'
  | 'current-streak'
  | 'last-session'
  | 'top-exercises'
  | 'muscle-volume-breakdown'
  | 'volume-trend'

/** Home screen layout mode */
export type HomeLayout = 'body-full' | 'body-only' | 'calendar-only'

export const DEFAULT_HOME_SLOTS: [HomePanelWidget, HomePanelWidget, HomePanelWidget] = [
  'muscle-mvps',
  'week-volume',
  'suggested-targets',
]

export interface AppSettings {
  theme: 'dark' | 'light' | 'woodland' | 'axe'
  accentColor: string // hex
  defaultRestSeconds?: number
  userBodyweight?: number    // kg, used for bodyweight exercise volume calculation
  showGhostMuscles?: boolean // pulse untrained muscles in complement hue (default true)
  homeLayout?: HomeLayout    // home screen layout mode (default 'body-full')
  homePanelSlots?: [HomePanelWidget, HomePanelWidget, HomePanelWidget]
  ignoredMuscles?: MuscleGroup[] // excluded from ghost view and suggested targets
}