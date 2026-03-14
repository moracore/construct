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
  instanceId: string   // unique per card — same exercise can appear multiple times
  exerciseId: string
  exerciseName: string
  isBodyweight: boolean
  bodyweightType?: 'standard' | 'assisted' | 'weighted'
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
  addExercise: (ex: Omit<SessionExercise, 'sets' | 'instanceId'>) => void
  removeExercise: (instanceId: string) => void
  logSet: (instanceId: string, set: SessionSet) => void
  removeLastSet: (instanceId: string) => void
  clearSession: () => void
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null)

const STORAGE_KEY = 'gymapp_active_session'

function genId() {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

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

  const addExercise = useCallback((ex: Omit<SessionExercise, 'sets' | 'instanceId'>) => {
    setSession((prev) => {
      if (!prev) return prev
      return { ...prev, exercises: [...prev.exercises, { ...ex, instanceId: genId(), sets: [] }] }
    })
  }, [])

  const removeExercise = useCallback((instanceId: string) => {
    setSession((prev) => {
      if (!prev) return prev
      return { ...prev, exercises: prev.exercises.filter((e) => e.instanceId !== instanceId) }
    })
  }, [])

  const logSet = useCallback((instanceId: string, set: SessionSet) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.instanceId === instanceId ? { ...e, sets: [...e.sets, set] } : e
        ),
      }
    })
  }, [])

  const removeLastSet = useCallback((instanceId: string) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.instanceId === instanceId ? { ...e, sets: e.sets.slice(0, -1) } : e
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
