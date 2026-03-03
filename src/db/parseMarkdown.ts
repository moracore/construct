import type { LoggedExercise, ExerciseSet } from '../types'

interface ParsedLog {
  workoutName: string
  exercises: LoggedExercise[]
}

function parseSet(line: string, isDoubleComponent: boolean, isBodyweight: boolean): ExerciseSet | null {
  // Strip "- Set N: " prefix
  const body = line.replace(/^-\s*Set\s*\d+:\s*/i, '').trim()
  if (!body) return null

  if (isDoubleComponent) {
    // "L 12kg x 12 | R 12kg x 12"
    const m = body.match(/L\s*([\d.]+)kg\s*x\s*(\d+)\s*\|\s*R\s*([\d.]+)kg\s*x\s*(\d+)/i)
    if (m) {
      return {
        reps: Math.max(parseInt(m[2]), parseInt(m[4])),
        leftWeight: parseFloat(m[1]),
        leftReps: parseInt(m[2]),
        rightWeight: parseFloat(m[3]),
        rightReps: parseInt(m[4]),
      }
    }
    // Fallback: "L x 12 | R x 12" (no weight)
    const m2 = body.match(/L\s*x\s*(\d+)\s*\|\s*R\s*x\s*(\d+)/i)
    if (m2) return { reps: Math.max(parseInt(m2[1]), parseInt(m2[2])), leftReps: parseInt(m2[1]), rightReps: parseInt(m2[2]) }
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
  let workoutName = ''
  const exercises: LoggedExercise[] = []
  let currentEx: LoggedExercise | null = null
  let isDoubleComponent = false
  let isBodyweight = false

  for (const raw of lines) {
    const line = raw.trim()

    if (line.startsWith('# ')) {
      // "# 2026-03-02 - Monday - Push Day"
      const parts = line.slice(2).split(' - ')
      workoutName = parts.slice(2).join(' - ').trim() || parts[parts.length - 1]?.trim() || 'Workout'
      continue
    }

    if (line.startsWith('## ')) {
      if (currentEx) exercises.push(currentEx)
      const raw = line.slice(3).trim()
      isDoubleComponent = /\(L\/R\)/i.test(raw)
      isBodyweight = false // can't reliably detect from name alone
      const exerciseName = raw.replace(/\s*\(L\/R\)/i, '').trim()
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

  return { workoutName, exercises }
}
