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
  const notifRef = useRef<Notification | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (notifRef.current) {
      notifRef.current.close()
      notifRef.current = null
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

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        
        if (next <= 0) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setActive(false)
          
          if (navigator.vibrate) {
            navigator.vibrate(200)
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            notifRef.current = new Notification(`Rest Timer Complete - ${name}`, {
              tag: 'rest-timer',
            })
          }
          
          return 0
        }

        // Update the running notification in place
        if ('Notification' in window && Notification.permission === 'granted') {
          const m = Math.floor(next / 60)
          const s = next % 60
          const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`

          notifRef.current = new Notification('Resting', {
            body: `${timeStr} remaining for ${name}`,
            tag: 'rest-timer', // tag ensures it overwrites the old one
            silent: true       // prevents buzzing on every tick
          })
        }

        return next
      })
    }, 1000)
  }, [])

  const dismiss = useCallback(() => stop(), [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (notifRef.current) notifRef.current.close()
    }
  }, [])

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