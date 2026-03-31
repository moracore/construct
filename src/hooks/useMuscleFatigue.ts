import { useState, useEffect } from 'react'
import { getAllDayLogs, getAllExercises, getSettings, getAllQuickLogs } from '../db'
import { MUSCLE_GROUPS, type MuscleGroup } from '../types'
import type { Exercise, ExerciseSet, QuickExerciseLog } from '../types'

const WEEKLY_AVG_WEEKS = 8

// ── Exported sub-types ────────────────────────────────────────────────────────

export interface LastSessionInfo {
  date: string
  workoutName: string
  exerciseCount: number
  totalVolume: number
}

export interface TopExerciseEntry {
  name: string
  volume: number
}

export interface MuscleVolumeEntry {
  muscle: MuscleGroup
  fraction: number // 0–1, relative to the highest-volume muscle in the window
}

export interface FatigueResult {
  opacities:             Partial<Record<MuscleGroup, number>> | null
  muscleMVPs:            MuscleGroup[]
  suggestedTargets:      MuscleGroup[]
  weekVolume:            number
  weekVolumeDelta:       number
  weeklyFrequency:       number          // avg sessions/week over last 3 weeks
  restDays:              number          // calendar days since last session
  currentStreak:         number          // consecutive Mon–Sun weeks with ≥1 session
  lastSession:           LastSessionInfo | null
  topExercises:          TopExerciseEntry[]  // top 3 by volume this week
  topAvgWeightExercise:  TopExerciseEntry | null // highest avg weight/set this week (non-BW)
  muscleVolumeBreakdown: MuscleVolumeEntry[] // top 4, decayed 14-day window
  volumeTrend:           number[]        // 8 weekly totals, index 0 = 7 weeks ago, index 7 = current week
}

const DEFAULT_RESULT: FatigueResult = {
  opacities:             null,
  muscleMVPs:            [],
  suggestedTargets:      [],
  weekVolume:            0,
  weekVolumeDelta:       0,
  weeklyFrequency:       0,
  restDays:              0,
  currentStreak:         0,
  lastSession:           null,
  topExercises:          [],
  topAvgWeightExercise:  null,
  muscleVolumeBreakdown: [],
  volumeTrend:           [],
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function subtractDays(from: Date, days: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return d
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Days between two YYYY-MM-DD strings (a − b). Uses noon to avoid DST issues.
function dateDiffDays(a: string, b: string): number {
  const ta = new Date(a + 'T12:00:00').getTime()
  const tb = new Date(b + 'T12:00:00').getTime()
  return Math.round((ta - tb) / 86400000)
}

// Consecutive Mon–Sun weeks (going backwards) with ≥1 session.
// The current (possibly incomplete) week is forgiven if empty.
function computeStreak(logDates: Set<string>, today: Date): number {
  const monday = getMondayOf(today)
  let streak = 0
  for (let w = 0; w < 52; w++) {
    const weekMon = subtractDays(monday, w * 7)
    const weekSun = subtractDays(monday, w * 7 - 6) // same week, 6 days later
    const monISO  = toISO(weekMon)
    const sunISO  = toISO(weekSun)
    const hasSession = [...logDates].some(d => d >= monISO && d <= sunISO)
    if (hasSession) {
      streak++
    } else if (w === 0) {
      continue // forgive current empty week
    } else {
      break
    }
  }
  return streak
}

// ── Volume helpers ─────────────────────────────────────────────────────────────

// Resolve effective bodyweight load per rep for a bodyweight exercise
function resolveBodyweightLoad(ex: Exercise, set: ExerciseSet, userBodyweight?: number): number {
  const bw = userBodyweight ?? 100
  if (ex.bodyweightType === 'assisted') return bw * (1 / 3)
  if (ex.bodyweightType === 'weighted') return bw * (2 / 3) + (set.weight ?? 0)
  // standard, undefined, or legacy fallback: 2/3 of bodyweight
  return bw * (2 / 3)
}

// Stage 5: per-set volume with timed & bodyweight interception
function setVolume(set: ExerciseSet, ex: Exercise, userBodyweight?: number): number {
  if (ex.isTimed) {
    let dur: number
    if (ex.isDoubleComponent) {
      const hasPerSide = set.leftDuration != null || set.rightDuration != null
      dur = hasPerSide
        ? (set.leftDuration ?? 0) + (set.rightDuration ?? 0)
        : (set.duration ?? 0)
    } else {
      dur = set.duration ?? 0
    }
    const reps = Math.floor(dur / 3)
    const weight = ex.isBodyweight
      ? resolveBodyweightLoad(ex, set, userBodyweight)
      : (set.weight ?? 0)
    return weight * reps
  }
  if (ex.isDoubleComponent) {
    if (ex.isBodyweight) {
      const w = resolveBodyweightLoad(ex, set, userBodyweight)
      return w * ((set.leftReps ?? 0) + (set.rightReps ?? 0))
    }
    // Per-side weights if logged individually; fall back to the shared weight
    const lw = set.leftWeight ?? set.weight ?? 0
    const rw = set.rightWeight ?? set.weight ?? 0
    return lw * (set.leftReps ?? 0) + rw * (set.rightReps ?? 0)
  }
  if (ex.isBodyweight) {
    return resolveBodyweightLoad(ex, set, userBodyweight) * (set.reps ?? 0)
  }
  return (set.weight ?? 0) * (set.reps ?? 0)
}

type LogMap = Record<string, { exercises: { exerciseId: string; sets: ExerciseSet[] }[] }>
type QuickLogMap = Record<string, QuickExerciseLog[]>

// Compute volume for a single quick log entry using its embedded exercise data
function quickLogVolume(ql: QuickExerciseLog, userBodyweight?: number): number {
  const fakeEx: Exercise = {
    id: ql.exerciseId,
    name: ql.exerciseName,
    isBodyweight: ql.isBodyweight,
    bodyweightType: ql.bodyweightType,
    isDoubleComponent: ql.isDoubleComponent,
    isTimed: ql.isTimed,
    primaryMuscleGroups: ql.primaryMuscleGroups,
    secondaryMuscleGroups: ql.secondaryMuscleGroups,
    createdAt: 0,
  }
  let vol = 0
  for (const set of ql.sets) vol += setVolume(set, fakeEx, userBodyweight)
  return vol
}

function addQuickVolumeForDay(
  accum: Partial<Record<MuscleGroup, number>>,
  quickLogs: QuickExerciseLog[],
  multiplier: number,
  userBodyweight?: number,
) {
  for (const ql of quickLogs) {
    const vol = quickLogVolume(ql, userBodyweight)
    for (const mg of ql.primaryMuscleGroups)   accum[mg] = (accum[mg] ?? 0) + vol * multiplier
    for (const mg of ql.secondaryMuscleGroups) accum[mg] = (accum[mg] ?? 0) + vol * 0.25 * multiplier
  }
}

// Raw per-muscle volume (no decay) for a day range
function computeMusclePeriod(
  logMap: LogMap,
  exerciseMap: Map<string, Exercise>,
  daysStart: number,
  daysEnd: number,
  userBodyweight?: number,
  quickLogMap?: QuickLogMap,
): Partial<Record<MuscleGroup, number>> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const accum: Partial<Record<MuscleGroup, number>> = {}
  for (let d = daysStart; d < daysEnd; d++) {
    const t = subtractDays(today, d)
    const dateKey = toISO(t)
    const log = logMap[dateKey]
    if (log) {
      for (const logged of log.exercises) {
        const ex = exerciseMap.get(logged.exerciseId)
        if (!ex) continue
        let rawVol = 0
        for (const set of logged.sets) rawVol += setVolume(set, ex, userBodyweight)
        for (const mg of ex.primaryMuscleGroups)   accum[mg] = (accum[mg] ?? 0) + rawVol
        for (const mg of ex.secondaryMuscleGroups) accum[mg] = (accum[mg] ?? 0) + rawVol * 0.25
      }
    }
    if (quickLogMap?.[dateKey]) {
      addQuickVolumeForDay(accum, quickLogMap[dateKey], 1, userBodyweight)
    }
  }
  return accum
}

// Raw total volume (scalar) for a day range
function computeRawTotal(
  logMap: LogMap,
  exerciseMap: Map<string, Exercise>,
  daysStart: number,
  daysEnd: number,
  userBodyweight?: number,
  quickLogMap?: QuickLogMap,
): number {
  return Object.values(computeMusclePeriod(logMap, exerciseMap, daysStart, daysEnd, userBodyweight, quickLogMap))
    .reduce((s, v) => s + v, 0)
}

// Decayed effective volume — sigmoid curve centred at `center` days ago
// Window spans center*2+1 days; value at center = 50%, at center*2 ≈ 0
function computeWindow(
  logMap: LogMap,
  exerciseMap: Map<string, Exercise>,
  userBodyweight?: number,
  quickLogMap?: QuickLogMap,
  center = 4,
): Partial<Record<MuscleGroup, number>> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const accum: Partial<Record<MuscleGroup, number>> = {}
  for (let d = 0; d < center * 2 + 1; d++) {
    const t = subtractDays(today, d)
    const dateKey = toISO(t)
    const decay = 1 / (1 + Math.exp(d - center))
    const log = logMap[dateKey]
    if (log) {
      for (const logged of log.exercises) {
        const ex = exerciseMap.get(logged.exerciseId)
        if (!ex) continue
        let rawVol = 0
        for (const set of logged.sets) rawVol += setVolume(set, ex, userBodyweight)
        for (const mg of ex.primaryMuscleGroups)   accum[mg] = (accum[mg] ?? 0) + rawVol * decay
        for (const mg of ex.secondaryMuscleGroups) accum[mg] = (accum[mg] ?? 0) + rawVol * 0.25 * decay
      }
    }
    if (quickLogMap?.[dateKey]) {
      addQuickVolumeForDay(accum, quickLogMap[dateKey], decay, userBodyweight)
    }
  }
  return accum
}

// ─────────────────────────────────────────────────────────────────────────────

export function useMuscleFatigue(): FatigueResult {
  const [result, setResult] = useState<FatigueResult>(DEFAULT_RESULT)

  useEffect(() => {
    async function compute() {
      const [logs, exercises, settings, quickLogs] = await Promise.all([
        getAllDayLogs(), getAllExercises(), getSettings(), getAllQuickLogs(),
      ])

      const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
      const logMap: LogMap = {}
      logs.forEach((l) => { logMap[l.date] = l })

      const qlMap: QuickLogMap = {}
      quickLogs.forEach((q) => {
        if (!qlMap[q.date]) qlMap[q.date] = []
        qlMap[q.date].push(q)
      })

      const ubw = settings.userBodyweight
      const quickCountsForStreak = settings.quickExercisesCountForStreak === true

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = toISO(today)

      // ── Opacities — sigmoid-decayed window vs per-muscle weekly average ──
      const sigmoidCenter = settings.sigmoidCenter ?? 4
      const currentRaw = computeWindow(logMap, exerciseMap, ubw, qlMap, sigmoidCenter)
      const historicalVol = computeMusclePeriod(logMap, exerciseMap, 0, WEEKLY_AVG_WEEKS * 7, ubw, qlMap)
      const opacities: Partial<Record<MuscleGroup, number>> = {}
      for (const [mg, vol] of Object.entries(currentRaw) as [MuscleGroup, number][]) {
        const weeklyAvg = ((historicalVol[mg] ?? 0) / WEEKLY_AVG_WEEKS) || 0
        const ratio = weeklyAvg > 0 ? vol / weeklyAvg : (vol > 0 ? 1 : 0)
        opacities[mg] = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0
      }

      // ── Muscle MVPs — above their 4-week average this week ────────────────
      const thisWeek  = computeMusclePeriod(logMap, exerciseMap, 0, 7, ubw, qlMap)
      const fourWeeks = computeMusclePeriod(logMap, exerciseMap, 0, 28, ubw, qlMap)
      const muscleMVPs = MUSCLE_GROUPS.filter((mg) => {
        const tw  = thisWeek[mg]  ?? 0
        const avg = (fourWeeks[mg] ?? 0) / 4
        return tw > 0 && tw > avg
      })

      // ── Suggested targets — bottom decayed volume ─────────────────────────
      const suggestedTargets = [...MUSCLE_GROUPS]
        .sort((a, b) => (currentRaw[a] ?? 0) - (currentRaw[b] ?? 0))

      // ── Week volume + delta ───────────────────────────────────────────────
      const weekVolume      = computeRawTotal(logMap, exerciseMap, 0, 7, ubw, qlMap)
      const prevWeekVolume  = computeRawTotal(logMap, exerciseMap, 7, 14, ubw, qlMap)
      const weekVolumeDelta = prevWeekVolume === 0
        ? (weekVolume > 0 ? 100 : 0)
        : ((weekVolume - prevWeekVolume) / prevWeekVolume) * 100

      // ── Weekly frequency — avg sessions/week, last 3 weeks ───────────────
      const cutoff21ISO = toISO(subtractDays(today, 21))
      const weeklyFrequency = logs.filter(l => l.date >= cutoff21ISO).length / 3

      // ── Rest days — calendar days since last session ──────────────────────
      const lastLogDate = logs.reduce<string | null>(
        (best, l) => (!best || l.date > best ? l.date : best), null
      )
      const restDays = lastLogDate ? Math.max(0, dateDiffDays(todayISO, lastLogDate)) : 0

      // ── Current streak — consecutive Mon–Sun weeks with ≥1 session ────────
      const logDateSet = new Set(logs.map(l => l.date))
      if (quickCountsForStreak) {
        quickLogs.forEach(q => logDateSet.add(q.date))
      }
      const currentStreak = computeStreak(logDateSet, today)

      // ── Last session ─────────────────────────────────────────────────────
      let lastSession: LastSessionInfo | null = null
      if (lastLogDate) {
        const lastLog = logs.find(l => l.date === lastLogDate)
        if (lastLog) {
          let totalVolume = 0
          for (const logged of lastLog.exercises) {
            const ex = exerciseMap.get(logged.exerciseId)
            if (!ex) continue
            for (const set of logged.sets) totalVolume += setVolume(set, ex, ubw)
          }
          lastSession = {
            date:           lastLog.date,
            workoutName:    lastLog.workoutName,
            exerciseCount:  lastLog.exercises.length,
            totalVolume:    Math.round(totalVolume),
          }
        }
      }

      // ── Top exercises this week ───────────────────────────────────────────
      const exerciseVolMap = new Map<string, { name: string; volume: number }>()
      for (let d = 0; d < 7; d++) {
        const log = logMap[toISO(subtractDays(today, d))]
        if (!log) continue
        for (const logged of log.exercises) {
          const ex = exerciseMap.get(logged.exerciseId)
          if (!ex) continue
          let vol = 0
          for (const set of logged.sets) vol += setVolume(set, ex, ubw)
          const entry = exerciseVolMap.get(logged.exerciseId) ?? { name: ex.name, volume: 0 }
          entry.volume += vol
          exerciseVolMap.set(logged.exerciseId, entry)
        }
      }
      const topExercises: TopExerciseEntry[] = [...exerciseVolMap.values()]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 3)

      // ── Top avg-weight exercise this week (non-bodyweight only) ───────────
      const avgWeightMap = new Map<string, { name: string; totalWeight: number; sets: number }>()
      for (let d = 0; d < 7; d++) {
        const log = logMap[toISO(subtractDays(today, d))]
        if (!log) continue
        for (const logged of log.exercises) {
          const ex = exerciseMap.get(logged.exerciseId)
          if (!ex || ex.isBodyweight) continue
          for (const set of logged.sets) {
            const w = set.weight ?? set.leftWeight ?? set.rightWeight
            if (w == null) continue
            const entry = avgWeightMap.get(logged.exerciseId) ?? { name: ex.name, totalWeight: 0, sets: 0 }
            entry.totalWeight += w
            entry.sets++
            avgWeightMap.set(logged.exerciseId, entry)
          }
        }
      }
      const topAvgWeightExercise: TopExerciseEntry | null = avgWeightMap.size > 0
        ? [...avgWeightMap.values()]
            .map(e => ({ name: e.name, volume: Math.round(e.totalWeight / e.sets) }))
            .sort((a, b) => b.volume - a.volume)[0]
        : null

      // ── Muscle volume breakdown (decayed 14-day, top 4) ───────────────────
      const muscleEntries = (Object.entries(currentRaw) as [MuscleGroup, number][])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
      const maxMuscleVol = muscleEntries[0]?.[1] ?? 1
      const muscleVolumeBreakdown: MuscleVolumeEntry[] = muscleEntries.map(([muscle, vol]) => ({
        muscle,
        fraction: vol / maxMuscleVol,
      }))

      // ── Volume trend — 8 weekly totals, index 0 = 7 weeks ago ────────────
      const volumeTrend = Array.from({ length: 8 }, (_, i) => {
        const weeksAgo = 7 - i // i=0 → 7weeksAgo, i=7 → current week
        return computeRawTotal(logMap, exerciseMap, weeksAgo * 7, (weeksAgo + 1) * 7, ubw, qlMap)
      })

      setResult({
        opacities, muscleMVPs, suggestedTargets, weekVolume, weekVolumeDelta,
        weeklyFrequency, restDays, currentStreak, lastSession, topExercises,
        topAvgWeightExercise, muscleVolumeBreakdown, volumeTrend,
      })
    }

    compute()
  }, [])

  return result
}
