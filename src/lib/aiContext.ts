import { getAllExercises, getAllWorkouts, getAllDayLogs, getAllQuickLogs } from '../db'
import type { MuscleGroup } from '../types'
import type { WorkoutSuggestionInput, ExerciseOrderInput } from './ai'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
}

export interface SessionContext {
  /** Exercise IDs from the workout preset — forms the primary suggestion pool */
  workoutPoolIds?: string[]
  /** Exercise names already present in the session — AI must not re-suggest these */
  alreadyInSessionNames?: string[]
}

export async function buildWorkoutSuggestionInput(sessionCtx?: SessionContext): Promise<WorkoutSuggestionInput> {
  const today = todayISO()
  const cutoffMs = Date.now() - 28 * 86_400_000

  const [allExercises, allWorkouts, allDayLogs, allQuickLogs] = await Promise.all([
    getAllExercises(),
    getAllWorkouts(),
    getAllDayLogs(),
    getAllQuickLogs(),
  ])

  const exById = new Map(allExercises.map((e) => [e.id, e]))

  // Compact exercise library
  const exercises = allExercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    primaryMuscles: ex.primaryMuscleGroups,
    secondaryMuscles: ex.secondaryMuscleGroups,
  }))

  // Workout presets with exercise names (not IDs)
  const workouts = allWorkouts.map((wo) => ({
    name: wo.name,
    exercises: wo.exerciseIds.map((id) => exById.get(id)?.name ?? '').filter(Boolean),
  }))

  // Recent day logs — compact (date, workout name, exercise names)
  const recentLogs: WorkoutSuggestionInput['recentLogs'] = allDayLogs
    .filter((l) => new Date(l.date).getTime() >= cutoffMs)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map((l) => ({
      date: l.date,
      workoutName: l.workoutName,
      exercises: l.exercises.map((e) => e.exerciseName),
    }))

  // Merge quick logs into recent logs by date
  for (const ql of allQuickLogs.filter((l) => new Date(l.date).getTime() >= cutoffMs)) {
    const existing = recentLogs.find((l) => l.date === ql.date)
    if (existing) {
      if (!existing.exercises.includes(ql.exerciseName)) existing.exercises.push(ql.exerciseName)
    } else {
      recentLogs.push({ date: ql.date, workoutName: 'Quick Log', exercises: [ql.exerciseName] })
    }
  }

  // Days since last trained per muscle group
  const lastDate: Partial<Record<MuscleGroup, string>> = {}

  const bump = (muscles: MuscleGroup[], date: string) => {
    for (const m of muscles) {
      if (!lastDate[m] || date > lastDate[m]!) lastDate[m] = date
    }
  }

  for (const log of allDayLogs) {
    for (const le of log.exercises) {
      const ex = exById.get(le.exerciseId)
      if (ex) bump([...ex.primaryMuscleGroups, ...ex.secondaryMuscleGroups], log.date)
    }
  }

  for (const ql of allQuickLogs) {
    bump([...ql.primaryMuscleGroups, ...ql.secondaryMuscleGroups], ql.date)
  }

  const daysSinceLastTrainedPerMuscle: Record<string, number> = {}
  for (const [muscle, date] of Object.entries(lastDate) as [MuscleGroup, string][]) {
    daysSinceLastTrainedPerMuscle[muscle] = daysBetween(date, today)
  }

  const wildcardMuscles = Object.entries(daysSinceLastTrainedPerMuscle)
    .filter(([, d]) => d > 14)
    .map(([m]) => m)

  // Resolve workout pool IDs → names
  const workoutPoolNames = sessionCtx?.workoutPoolIds
    ?.map((id) => exById.get(id)?.name ?? '')
    .filter(Boolean)

  return {
    today,
    dayOfWeek: DAY_NAMES[new Date().getDay()],
    exercises,
    workouts,
    recentLogs,
    daysSinceLastTrainedPerMuscle,
    wildcardMuscles,
    workoutPoolNames,
    alreadyInSessionNames: sessionCtx?.alreadyInSessionNames,
  }
}

export async function buildExerciseOrderInput(exerciseIds: string[]): Promise<ExerciseOrderInput[]> {
  const allExercises = await getAllExercises()
  const exById = new Map(allExercises.map((e) => [e.id, e]))

  const result: ExerciseOrderInput[] = []
  for (const id of exerciseIds) {
    const ex = exById.get(id)
    if (!ex) continue
    const totalMuscles = ex.primaryMuscleGroups.length + ex.secondaryMuscleGroups.length
    const isCompound = totalMuscles >= 3 || ex.secondaryMuscleGroups.length >= 2
    result.push({
      id: ex.id,
      name: ex.name,
      primaryMuscles: [...ex.primaryMuscleGroups],
      secondaryMuscles: [...ex.secondaryMuscleGroups],
      isCompound,
    })
  }
  return result
}
