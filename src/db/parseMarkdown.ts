import type { LoggedExercise, ExerciseSet } from '../types'

interface ParsedLog {
  date: string | null         // YYYY-MM-DD extracted from header, null if unparseable
  workoutName: string
  startTime: string | null    // HH:MM, null if not present
  durationMinutes: number | null
  exercises: LoggedExercise[]
}

// "1h 25m" | "45m" | "2h" → minutes, anything else → null
export function parseDuration(s: string): number | null {
  const t = s.trim()
  if (!t || t === '-') return null
  const m = t.match(/^(?:(\d+)h\s*)?(\d+)m$|^(\d+)h$/)
  if (!m) return null
  const h = parseInt(m[1] ?? m[3] ?? '0')
  const mins = parseInt(m[2] ?? '0')
  const total = h * 60 + mins
  return total > 0 ? total : null
}

// minutes → "1h 25m" | "45m" | "2h"; undefined or >480 → "-"
export function formatDurationMins(mins: number | undefined): string {
  if (mins == null || mins > 480) return '-'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function parseSet(line: string, isDoubleComponent: boolean, isBodyweight: boolean): ExerciseSet | null {
  // Strip "- Set N: " prefix
  const body = line.replace(/^-\s*Set\s*\d+:\s*/i, '').trim()
  if (!body) return null

  if (isDoubleComponent) {
    // "L 12kg x 12 | R 12kg x 12" or "R 12kg x 12 | L 12kg x 12" — order doesn't matter
    const m = body.match(/([LR])\s*([\d.]+)kg\s*x\s*(\d+)\s*\|\s*([LR])\s*([\d.]+)kg\s*x\s*(\d+)/i)
    if (m) {
      const [, s1, w1, r1, , w2, r2] = m
      const isLeftFirst = s1.toUpperCase() === 'L'
      const leftWeight  = isLeftFirst ? parseFloat(w1) : parseFloat(w2)
      const leftReps    = isLeftFirst ? parseInt(r1)   : parseInt(r2)
      const rightWeight = isLeftFirst ? parseFloat(w2) : parseFloat(w1)
      const rightReps   = isLeftFirst ? parseInt(r2)   : parseInt(r1)
      return { reps: Math.max(leftReps, rightReps), leftWeight, leftReps, rightWeight, rightReps }
    }
    // Fallback: no weight — "L x 12 | R x 12" or "R x 12 | L x 12"
    const m2 = body.match(/([LR])\s*x\s*(\d+)\s*\|\s*([LR])\s*x\s*(\d+)/i)
    if (m2) {
      const [, s1, r1, , r2] = m2
      const isLeftFirst = s1.toUpperCase() === 'L'
      const leftReps  = isLeftFirst ? parseInt(r1) : parseInt(r2)
      const rightReps = isLeftFirst ? parseInt(r2) : parseInt(r1)
      return { reps: Math.max(leftReps, rightReps), leftReps, rightReps }
    }
  }

  if (isBodyweight) {
    // "BW x 10 (+5kg)" or "BW x 10"
    const m = body.match(/BW\s*x\s*(\d+)(?:\s*\(\+?([\d.]+)kg\))?/i)
    if (m) return { reps: parseInt(m[1]), weight: m[2] ? parseFloat(m[2]) : undefined }
  }

  // Standard: "80kg x 10" or "80 x 10"
  const m = body.match(/([\d.]+)kg?\s*x\s*(\d+)/i)
  if (m) return { reps: parseInt(m[2]), weight: parseFloat(m[1]), weightUnit: 'kg' }

  // Bare reps: "x 10"
  const m2 = body.match(/x\s*(\d+)/i)
  if (m2) return { reps: parseInt(m2[1]) }

  return null
}

export function parseMarkdownLog(md: string): ParsedLog {
  const lines = md.split('\n')
  let date: string | null = null
  let workoutName = ''
  let startTime: string | null = null
  let durationMinutes: number | null = null
  const exercises: LoggedExercise[] = []
  let currentEx: LoggedExercise | null = null
  let isDoubleComponent = false
  let isBodyweight = false

  for (const raw of lines) {
    const line = raw.trim()

    if (line.startsWith('# ')) {
      // "# 2026-03-02 - Monday - Push Day · 09:30 · 1h 25m"
      // Split on ' · ' first to separate metadata
      const [mainPart, ...metaParts] = line.slice(2).split(' · ')
      const parts = mainPart.split(' - ')
      const rawDate = parts[0]?.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) date = rawDate
      workoutName = parts.slice(2).join(' - ').trim() || parts[parts.length - 1]?.trim() || 'Workout'
      if (metaParts[0] && /^\d{1,2}:\d{2}$/.test(metaParts[0].trim())) {
        startTime = metaParts[0].trim()
      }
      if (metaParts[1]) {
        durationMinutes = parseDuration(metaParts[1])
      }
      continue
    }

    if (line.startsWith('## ')) {
      if (currentEx) exercises.push(currentEx)
      const raw = line.slice(3).trim()
      isDoubleComponent = /\([LR]\/[LR]\)/i.test(raw)
      isBodyweight = false // can't reliably detect from name alone
      const exerciseName = raw.replace(/\s*\((?:R\/L|L\/R|Timed)(?:,\s*(?:R\/L|L\/R|Timed))*\)\s*$/i, '').trim()
      currentEx = { exerciseId: '', exerciseName, sets: [] }
      continue
    }

    if (line.startsWith('- Set ') && currentEx) {
      // Detect bodyweight from content
      if (/BW\s*x/i.test(line)) isBodyweight = true
      const set = parseSet(line, isDoubleComponent, isBodyweight)
      if (set) currentEx.sets.push(set)
    }
  }

  if (currentEx) exercises.push(currentEx)

  return {
    date, workoutName, startTime, durationMinutes,
    exercises: exercises.filter((e) => e.exerciseName.toLowerCase() !== 'exercise'),
  }
}
