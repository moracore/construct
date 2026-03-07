import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { SessionSet } from '../../context/ActiveWorkoutContext'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatLabel(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

// ── Stopwatch hook ────────────────────────────────────────────────────────────
type TimerStatus = 'idle' | 'running' | 'stopped'

interface TimerState {
  status: TimerStatus
  elapsed: number
}

function useStopwatch() {
  const [state, setState] = useState<TimerState>({ status: 'idle', elapsed: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)
  const baseRef = useRef(0)

  const start = useCallback(() => {
    startRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: baseRef.current + Math.floor((Date.now() - startRef.current) / 1000) }))
    }, 100)
    setState((prev) => ({ ...prev, status: 'running' }))
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setState((prev) => { baseRef.current = prev.elapsed; return { ...prev, status: 'stopped' } })
  }, [])

  const resume = useCallback(() => {
    startRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: baseRef.current + Math.floor((Date.now() - startRef.current) / 1000) }))
    }, 100)
    setState((prev) => ({ ...prev, status: 'running' }))
  }, [])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return { state, start, stop, resume }
}

// ── Circle timer ──────────────────────────────────────────────────────────────
interface CircleTimerProps {
  timer: TimerState
  label?: string
  targetSeconds?: number
  onTap: () => void
  size?: number
}

function CircleTimer({ timer, label, targetSeconds, onTap, size = 220 }: CircleTimerProps) {
  const r = size * 0.43
  const circ = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2

  const progress = targetSeconds ? Math.min(timer.elapsed / targetSeconds, 1) : 0
  const dashOffset = circ * (1 - progress)
  const overTime = !!targetSeconds && timer.elapsed > targetSeconds
  const tappable = timer.status !== 'stopped'

  const hint =
    timer.status === 'idle' ? 'tap to start' :
    timer.status === 'running' ? 'tap to stop' : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>
          {label}
        </span>
      )}
      <div
        style={{ position: 'relative', width: size, height: size, cursor: tappable ? 'pointer' : 'default', userSelect: 'none' }}
        onClick={tappable ? onTap : undefined}
      >
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
          {targetSeconds ? (
            <circle
              cx={cx} cy={cy} r={r} fill="none"
              stroke={timer.status === 'stopped' ? 'var(--text-muted)' : overTime ? 'var(--danger)' : 'var(--accent)'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }}
            />
          ) : timer.status === 'running' && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeOpacity="0.2" />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{
            fontSize: size > 180 ? 48 : 36,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -2,
            color: timer.status === 'stopped' ? 'var(--text-secondary)' : 'var(--text-primary)',
          }}>
            {formatTime(timer.elapsed)}
          </span>
          {hint && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{hint}</span>}
          {targetSeconds && timer.status !== 'stopped' && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ {formatTime(targetSeconds)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page state passed via navigation ─────────────────────────────────────────
export interface TimedSetPageState {
  exerciseId: string
  exerciseName: string
  isBodyweight: boolean
  isDoubleComponent: boolean
  setNumber: number
  prefillWeight?: number
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TimedSetPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as TimedSetPageState | null

  const [weight, setWeight] = useState(state?.prefillWeight?.toString() ?? '')
  const [targetInput, setTargetInput] = useState('')
  const [targetSeconds, setTargetSeconds] = useState<number | undefined>(undefined)
  const [showConfirm, setShowConfirm] = useState(false)

  const timer = useStopwatch()
  const leftTimer = useStopwatch()
  const rightTimer = useStopwatch()

  useEffect(() => {
    if (!state?.exerciseId) navigate('/log/active', { replace: true })
  }, [state, navigate])

  if (!state?.exerciseId) return null

  const { exerciseId, exerciseName, isBodyweight, isDoubleComponent, setNumber } = state

  const isRunning = isDoubleComponent
    ? leftTimer.state.status === 'running' || rightTimer.state.status === 'running'
    : timer.state.status === 'running'

  // Lock in target when timer starts
  function applyTarget() {
    const t = parseInt(targetInput)
    if (t > 0) setTargetSeconds(t)
  }

  // ── Single ────────────────────────────────────────────────────────────────
  function handleSingleTap() {
    if (timer.state.status === 'idle') {
      applyTarget()
      timer.start()
    } else if (timer.state.status === 'running') {
      timer.stop()
      setShowConfirm(true)
    }
  }

  function handleRecord() {
    const set: SessionSet = {
      reps: 0,
      weight: weight ? parseFloat(weight) : undefined,
      duration: timer.state.elapsed,
      loggedAt: Date.now(),
    }
    navigate('/log/active', { replace: true, state: { timedSet: { exerciseId, set } } })
  }

  function handleResume() {
    setShowConfirm(false)
    timer.resume()
  }

  // ── L/R ───────────────────────────────────────────────────────────────────
  function handleLeftTap() {
    if (leftTimer.state.status === 'idle') { applyTarget(); leftTimer.start() }
    else if (leftTimer.state.status === 'running') leftTimer.stop()
  }

  function handleRightTap() {
    if (rightTimer.state.status === 'idle') { applyTarget(); rightTimer.start() }
    else if (rightTimer.state.status === 'running') rightTimer.stop()
  }

  function handleRecordLR() {
    const set: SessionSet = {
      reps: 0,
      weight: weight ? parseFloat(weight) : undefined,
      leftDuration: leftTimer.state.elapsed,
      rightDuration: rightTimer.state.elapsed,
      loggedAt: Date.now(),
    }
    navigate('/log/active', { replace: true, state: { timedSet: { exerciseId, set } } })
  }

  const lrCanRecord = leftTimer.state.status === 'stopped' || rightTimer.state.status === 'stopped'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>

      {/* Header */}
      <div className="page-header" style={{ background: 'var(--bg-primary)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/log/active', { replace: true })}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{exerciseName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Set {setNumber}</div>
        </div>
      </div>

      {/* Centered body */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '16px 24px',
        paddingBottom: 'calc(var(--nav-height) + 16px)',
        overflowY: 'auto',
      }}>

        {/* Weight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isBodyweight ? (
            <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>Bodyweight</span>
          ) : (
            <>
              <input
                type="number" inputMode="decimal" placeholder="kg"
                value={weight} onChange={(e) => setWeight(e.target.value)}
                style={{ width: 90, textAlign: 'center', padding: '8px 10px', fontSize: 16 }}
              />
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>kg</span>
            </>
          )}
        </div>

        {/* Target time input — shown until any timer starts */}
        {!isRunning && timer.state.status === 'idle' && leftTimer.state.status === 'idle' && rightTimer.state.status === 'idle' && !showConfirm && !lrCanRecord && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" inputMode="numeric" placeholder="Target (s)"
              value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
              style={{ width: 110, textAlign: 'center', padding: '8px 10px', fontSize: 15 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>s goal</span>
          </div>
        )}

        {/* Timer(s) */}
        {isDoubleComponent ? (
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', justifyContent: 'center' }}>
            <CircleTimer timer={leftTimer.state} label="L" targetSeconds={targetSeconds} onTap={handleLeftTap} size={160} />
            <CircleTimer timer={rightTimer.state} label="R" targetSeconds={targetSeconds} onTap={handleRightTap} size={160} />
          </div>
        ) : (
          <CircleTimer timer={timer.state} targetSeconds={targetSeconds} onTap={handleSingleTap} size={240} />
        )}

        {/* Confirmation / record */}
        {isDoubleComponent ? (
          lrCanRecord && (
            <div className="card" style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                L: <strong style={{ color: 'var(--text-primary)' }}>{formatLabel(leftTimer.state.elapsed)}</strong>
                {'  ·  '}
                R: <strong style={{ color: 'var(--text-primary)' }}>{formatLabel(rightTimer.state.elapsed)}</strong>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleRecordLR}>Record Set</button>
            </div>
          )
        ) : (
          showConfirm && (
            <div className="card" style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Record {formatLabel(timer.state.elapsed)}?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={handleResume}>Resume</button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleRecord}>Record</button>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  )
}
