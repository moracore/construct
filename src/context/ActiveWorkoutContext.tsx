import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface SessionSet {
  weight?: number
  reps: number
  leftWeight?: number
  rightWeight?: number
  leftReps?: number
  rightReps?: number
  duration?: number
  leftDuration?: number
  rightDuration?: number
  loggedAt: number
}

export interface SessionExercise {
  exerciseId: string
  exerciseName: string
  isBodyweight: boolean
  isDoubleComponent: boolean
  isTimed?: boolean
  timedTargetSeconds?: number
  defaultRestSeconds?: number
  sets: SessionSet[]
}

export interface ActiveSession {
  workoutId?: string
  workoutName: string
  color: string
  startedAt: number
  exercises: SessionExercise[]
}

interface ActiveWorkoutContextValue {
  session: ActiveSession | null
  startSession: (s: Omit<ActiveSession, 'exercises' | 'startedAt'>) => void
  addExercise: (ex: Omit<SessionExercise, 'sets'>) => void
  removeExercise: (exerciseId: string) => void
  logSet: (exerciseId: string, set: SessionSet) => void
  removeLastSet: (exerciseId: string) => void
  clearSession: () => void
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null)

const STORAGE_KEY = 'gymapp_active_session'

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  const startSession = useCallback((s: Omit<ActiveSession, 'exercises' | 'startedAt'>) => {
    setSession({ ...s, exercises: [], startedAt: Date.now() })
  }, [])

  const addExercise = useCallback((ex: Omit<SessionExercise, 'sets'>) => {
    setSession((prev) => {
      if (!prev) return prev
      // Prevent duplicates
      if (prev.exercises.some((e) => e.exerciseId === ex.exerciseId)) return prev
      return { ...prev, exercises: [...prev.exercises, { ...ex, sets: [] }] }
    })
  }, [])

  const removeExercise = useCallback((exerciseId: string) => {
    setSession((prev) => {
      if (!prev) return prev
      return { ...prev, exercises: prev.exercises.filter((e) => e.exerciseId !== exerciseId) }
    })
  }, [])

  const logSet = useCallback((exerciseId: string, set: SessionSet) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.exerciseId === exerciseId ? { ...e, sets: [...e.sets, set] } : e
        ),
      }
    })
  }, [])

  const removeLastSet = useCallback((exerciseId: string) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.exerciseId === exerciseId ? { ...e, sets: e.sets.slice(0, -1) } : e
        ),
      }
    })
  }, [])

  const clearSession = useCallback(() => setSession(null), [])

  return (
    <ActiveWorkoutContext.Provider value={{ session, startSession, addExercise, removeExercise, logSet, removeLastSet, clearSession }}>
      {children}
    </ActiveWorkoutContext.Provider>
  )
}

export function useActiveWorkout() {
  const ctx = useContext(ActiveWorkoutContext)
  if (!ctx) throw new Error('useActiveWorkout must be used within ActiveWorkoutProvider')
  return ctx
}
