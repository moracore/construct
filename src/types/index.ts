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
  bodyweightType?: 'standard' | 'assisted' | 'weighted'
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
  startTime?: string        // HH:MM local time
  durationMinutes?: number  // undefined = unknown; >480 treated as invalid
  createdAt: number
  updatedAt: number
}

export type HomePanelWidget =
  | 'week-volume'
  | 'week-volume-pct'
  | 'suggested-target'
  | 'weekly-frequency'
  | 'rest-day-counter'
  | 'current-streak'
  | 'top-exercise'
  | 'top-avg-weight'
  | 'volume-trend'

/** Home screen layout mode */
export type HomeLayout = 'body-full' | 'body-only' | 'calendar-only'

export const DEFAULT_HOME_SLOTS: [HomePanelWidget, HomePanelWidget, HomePanelWidget] = [
  'suggested-target',
  'week-volume',
  'current-streak',
]

export const VALID_PANEL_WIDGETS = new Set<string>([
  'week-volume', 'week-volume-pct', 'suggested-target', 'weekly-frequency',
  'rest-day-counter', 'current-streak', 'top-exercise', 'top-avg-weight', 'volume-trend',
])

export interface QuickExerciseLog {
  id: string
  date: string // YYYY-MM-DD
  exerciseId: string
  exerciseName: string
  primaryMuscleGroups: MuscleGroup[]
  secondaryMuscleGroups: MuscleGroup[]
  isBodyweight: boolean
  bodyweightType?: 'standard' | 'assisted' | 'weighted'
  isDoubleComponent: boolean
  isTimed?: boolean
  sets: ExerciseSet[]
  createdAt: number
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'woodland' | 'axe'
  accentColor: string // hex
  defaultRestSeconds?: number
  userBodyweight?: number    // kg, used for bodyweight exercise volume calculation
  showGhostMuscles?: boolean // pulse untrained muscles in complement hue (default true)
  homeLayout?: HomeLayout    // home screen layout mode (default 'body-full')
  homePanelSlots?: [HomePanelWidget, HomePanelWidget, HomePanelWidget]
  ignoredMuscles?: MuscleGroup[] // excluded from ghost view and suggested targets
  presetMode?: 'simple' | 'extensive' | 'custom'
  onboardingComplete?: boolean
  quickExercisesCountForStreak?: boolean
  aiOpenRouterKey?: string
  aiGeminiKey?: string
  sigmoidCenter?: number  // day at which body-image decay = 50% (2–7, default 4)
}