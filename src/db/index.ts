import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Exercise, Workout, DayLog, AppSettings } from '../types'

interface GymDB extends DBSchema {
  exercises: {
    key: string
    value: Exercise
    indexes: { 'by-name': string }
  }
  workouts: {
    key: string
    value: Workout
    indexes: { 'by-name': string }
  }
  daylogs: {
    key: string
    value: DayLog
    indexes: { 'by-date': string }
  }
  settings: {
    key: string
    value: AppSettings & { id: string }
  }
}

const DB_NAME = 'gymapp'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<GymDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<GymDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const exerciseStore = db.createObjectStore('exercises', { keyPath: 'id' })
        exerciseStore.createIndex('by-name', 'name')

        const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' })
        workoutStore.createIndex('by-name', 'name')

        const logStore = db.createObjectStore('daylogs', { keyPath: 'id' })
        logStore.createIndex('by-date', 'date')

        db.createObjectStore('settings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// Exercises
export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDB()
  return db.getAll('exercises')
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const db = await getDB()
  return db.get('exercises', id)
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  const db = await getDB()
  await db.put('exercises', exercise)
}

export async function deleteExercise(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('exercises', id)
}

// Workouts
export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDB()
  return db.getAll('workouts')
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  const db = await getDB()
  return db.get('workouts', id)
}

export async function saveWorkout(workout: Workout): Promise<void> {
  const db = await getDB()
  await db.put('workouts', workout)
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('workouts', id)
}

// DayLogs
export async function getAllDayLogs(): Promise<DayLog[]> {
  const db = await getDB()
  return db.getAll('daylogs')
}

export async function getDayLog(id: string): Promise<DayLog | undefined> {
  const db = await getDB()
  return db.get('daylogs', id)
}

export async function getDayLogByDate(date: string): Promise<DayLog | undefined> {
  const db = await getDB()
  const all = await db.getAllFromIndex('daylogs', 'by-date', date)
  return all[0]
}

export async function saveDayLog(log: DayLog): Promise<void> {
  const db = await getDB()
  await db.put('daylogs', log)
}

export async function deleteDayLog(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('daylogs', id)
}

// Backfill leftWeight/rightWeight from weight for old L/R sets that were logged before the fix
export async function migrateDoubleComponentWeights(): Promise<number> {
  const db = await getDB()
  const logs = await db.getAll('daylogs')
  let count = 0
  for (const log of logs) {
    let modified = false
    for (const ex of log.exercises) {
      for (const set of ex.sets) {
        if (
          (set.leftReps != null || set.rightReps != null) &&
          set.weight != null &&
          set.leftWeight == null &&
          set.rightWeight == null
        ) {
          set.leftWeight = set.weight
          set.rightWeight = set.weight
          modified = true
          count++
        }
      }
    }
    if (modified) await db.put('daylogs', log)
  }
  return count
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const stored = await db.get('settings', 'app')
  return stored ?? { theme: 'dark', accentColor: '#0080FF', homeLayout: 'body-full' }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { id: 'app', ...settings })
}
