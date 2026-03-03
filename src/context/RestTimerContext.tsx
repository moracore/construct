import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'

interface RestTimerContextValue {
  active: boolean
  remaining: number
  total: number
  exerciseName: string
  start: (duration: number, exerciseName: string) => void
  dismiss: () => void
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null)

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [exerciseName, setExerciseName] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActive(false)
    setRemaining(0)
  }, [])

  const start = useCallback((duration: number, name: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setExerciseName(name)
    setTotal(duration)
    setRemaining(duration)
    setActive(true)
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const dismiss = useCallback(() => stop(), [stop])

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <RestTimerContext.Provider value={{ active, remaining, total, exerciseName, start, dismiss }}>
      {children}
    </RestTimerContext.Provider>
  )
}

export function useRestTimer() {
  const ctx = useContext(RestTimerContext)
  if (!ctx) throw new Error('useRestTimer must be used within RestTimerProvider')
  return ctx
}
