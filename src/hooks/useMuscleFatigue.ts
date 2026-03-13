import { useState, useEffect } from 'react'
import { getAllDayLogs, getAllExercises, getSettings } from '../db'
import { MUSCLE_GROUPS, type MuscleGroup } from '../types'
import type { Exercise, ExerciseSet } from '../types'

const TARGET_14D_VOLUME = 8000

export interface FatigueResult {
  opacities:        Partial<Record<MuscleGroup, number>> | null
  muscleMVPs:       MuscleGroup[]   // above their 4-week average this week
  suggestedTargets: MuscleGroup[]   // lowest decayed volume (most neglected)
  weekVolume:       number          // raw total volume last 7 days
  weekVolumeDelta:  number          // % change vs previous 7 days
}

const DEFAULT_RESULT: FatigueResult = {
  opacities: null,
  muscleMVPs: [],
  suggestedTargets: [],
  weekVolume: 0,
  weekVolumeDelta: 0,
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Stage 5: per-set volume with timed & bodyweight interception ──────────────
function setVolume(set: ExerciseSet, ex: Exercise, userBodyweight?: number): number {
  if (ex.isTimed) {
    const dur = set.duration ?? set.leftDuration ?? set.rightDuration ?? 0
    const reps = Math.floor(dur / 3)
    const weight = ex.isBodyweight
      ? (userBodyweight ?? 100) * (ex.bodyweightMultiplier ?? 1.0)
      : (set.weight ?? 0)
    return weight * reps
  }
  if (ex.isDoubleComponent) {
    if (ex.isBodyweight) {
      const w = (userBodyweight ?? 100) * (ex.bodyweightMultiplier ?? 1.0)
      return w * ((set.leftReps ?? 0) + (set.rightReps ?? 0))
    }
    return (set.leftWeight ?? 0) * (set.leftReps ?? 0)
         + (set.rightWeight ?? 0) * (set.rightReps ?? 0)
  }
  if (ex.isBodyweight) {
    return (userBodyweight ?? 100) * (ex.bodyweightMultiplier ?? 1.0) * (set.reps ?? 0)
  }
  return (set.weight ?? 0) * (set.reps ?? 0)
}

type LogMap = Record<string, { exercises: { exerciseId: string; sets: ExerciseSet[] }[] }>

// ── Raw per-muscle volume (no decay) for a day range ─────────────────────────
function computeMusclePeriod(
  logMap: LogMap,
  exerciseMap: Map<string, Exercise>,
  daysStart: number,
  daysEnd: number,
  userBodyweight?: number,
): Partial<Record<MuscleGroup, number>> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const accum: Partial<Record<MuscleGroup, number>> = {}
  for (let d = daysStart; d < daysEnd; d++) {
    const t = new Date(today)
    t.setDate(today.getDate() - d)
    const log = logMap[toISO(t)]
    if (!log) continue
    for (const logged of log.exercises) {
      const ex = exerciseMap.get(logged.exerciseId)
      if (!ex) continue
      let rawVol = 0
      for (const set of logged.sets) rawVol += setVolume(set, ex, userBodyweight)
      for (const mg of ex.primaryMuscleGroups)   accum[mg] = (accum[mg] ?? 0) + rawVol
      for (const mg of ex.secondaryMuscleGroups) accum[mg] = (accum[mg] ?? 0) + rawVol * 0.25
    }
  }
  return accum
}

// ── Raw total volume (scalar) for a day range ─────────────────────────────────
function computeRawTotal(
  logMap: LogMap,
  exerciseMap: Map<string, Exercise>,
  daysStart: number,
  daysEnd: number,
  userBodyweight?: number,
): number {
  return Object.values(computeMusclePeriod(logMap, exerciseMap, daysStart, daysEnd, userBodyweight))
    .reduce((s, v) => s + v, 0)
}

// ── Decayed effective volume for the current 14-day window ───────────────────
function computeWindow(
  logMap: LogMap,
  exerciseMap: Map<string, Exercise>,
  userBodyweight?: number,
): Partial<Record<MuscleGroup, number>> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const accum: Partial<Record<MuscleGroup, number>> = {}
  for (let d = 0; d < 14; d++) {
    const t = new Date(today)
    t.setDate(today.getDate() - d)
    const log = logMap[toISO(t)]
    if (!log) continue
    const decay = (14 - d) / 14
    for (const logged of log.exercises) {
      const ex = exerciseMap.get(logged.exerciseId)
      if (!ex) continue
      let rawVol = 0
      for (const set of logged.sets) rawVol += setVolume(set, ex, userBodyweight)
      for (const mg of ex.primaryMuscleGroups)   accum[mg] = (accum[mg] ?? 0) + rawVol * decay
      for (const mg of ex.secondaryMuscleGroups) accum[mg] = (accum[mg] ?? 0) + rawVol * 0.25 * decay
    }
  }
  return accum
}

// ─────────────────────────────────────────────────────────────────────────────

export function useMuscleFatigue(): FatigueResult {
  const [result, setResult] = useState<FatigueResult>(DEFAULT_RESULT)

  useEffect(() => {
    async function compute() {
      const [logs, exercises, settings] = await Promise.all([
        getAllDayLogs(), getAllExercises(), getSettings(),
      ])

      const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
      const logMap: LogMap = {}
      logs.forEach((l) => { logMap[l.date] = l })

      const ubw = settings.userBodyweight

      // Opacities — decayed 14-day window
      const currentRaw = computeWindow(logMap, exerciseMap, ubw)
      const opacities: Partial<Record<MuscleGroup, number>> = {}
      for (const [mg, vol] of Object.entries(currentRaw) as [MuscleGroup, number][]) {
        opacities[mg] = Math.min(1, vol / TARGET_14D_VOLUME)
      }

      // Muscle MVPs — muscles whose volume THIS week exceeds their 4-week weekly average
      const thisWeek   = computeMusclePeriod(logMap, exerciseMap, 0, 7, ubw)
      const fourWeeks  = computeMusclePeriod(logMap, exerciseMap, 0, 28, ubw)
      const muscleMVPs = MUSCLE_GROUPS.filter((mg) => {
        const tw  = thisWeek[mg]  ?? 0
        const avg = (fourWeeks[mg] ?? 0) / 4
        return tw > 0 && tw > avg
      })

      // Suggested targets — bottom decayed volume (most neglected)
      const suggestedTargets = [...MUSCLE_GROUPS]
        .sort((a, b) => (currentRaw[a] ?? 0) - (currentRaw[b] ?? 0))

      // Week volume + delta
      const weekVolume      = computeRawTotal(logMap, exerciseMap, 0, 7, ubw)
      const prevWeekVolume  = computeRawTotal(logMap, exerciseMap, 7, 14, ubw)
      const weekVolumeDelta = prevWeekVolume === 0
        ? (weekVolume > 0 ? 100 : 0)
        : ((weekVolume - prevWeekVolume) / prevWeekVolume) * 100

      setResult({ opacities, muscleMVPs, suggestedTargets, weekVolume, weekVolumeDelta })
    }

    compute()
  }, [])

  return result
}
