import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { TimedSetPageState } from './TimedSetPage'
import { useActiveWorkout, type SessionExercise, type SessionSet } from '../../context/ActiveWorkoutContext'
import { useRestTimer } from '../../context/RestTimerContext'
import { getSettings, getWorkout } from '../../db'
import ExercisePicker from '../../components/ExercisePicker'
import type { Exercise } from '../../types'

// ── Icons ──────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const UndoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
)

// ── Elapsed timer ───────────────────────────────────────────────────────────
function useElapsed(startedAt: number) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ── Duration formatter ───────────────────────────────────────────────────────
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

// ── Set input row ───────────────────────────────────────────────────────────
interface PendingSet {
  weight: string
  reps: string
  leftWeight: string
  leftReps: string
  rightWeight: string
  rightReps: string
}

function emptyPending(): PendingSet {
  return { weight: '', reps: '', leftWeight: '', leftReps: '', rightWeight: '', rightReps: '' }
}

function prefillFromLast(last: SessionSet, ex: SessionExercise): PendingSet {
  if (ex.isDoubleComponent) {
    return {
      weight: last.weight?.toString() ?? last.leftWeight?.toString() ?? '', 
      reps: '',
      leftWeight: '',
      leftReps: last.leftReps?.toString() ?? last.reps.toString(),
      rightWeight: '',
      rightReps: last.rightReps?.toString() ?? last.reps.toString(),
    }
  }
  return {
    weight: last.weight?.toString() ?? '',
    reps: last.reps.toString(),
    leftWeight: '', leftReps: '', rightWeight: '', rightReps: '',
  }
}

interface SetInputProps {
  ex: SessionExercise
  setNumber: number
  onLog: (set: SessionSet) => void
  onCancel: () => void
  initialValues: PendingSet
}

function SetInput({ ex, setNumber, onLog, onCancel, initialValues }: SetInputProps) {
  const [v, setV] = useState<PendingSet>(initialValues)

  function handleLog() {
    if (ex.isDoubleComponent) {
      const lr = parseInt(v.leftReps) || 0
      const rr = parseInt(v.rightReps) || 0
      if (!lr && !rr) return
      onLog({
        reps: Math.max(lr, rr),
        weight: v.weight ? parseFloat(v.weight) : undefined,
        leftReps: lr || undefined,
        rightReps: rr || undefined,
        loggedAt: Date.now(),
      })
    } else {
      const reps = parseInt(v.reps) || 0
      if (!reps) return
      onLog({
        reps,
        weight: v.weight ? parseFloat(v.weight) : undefined,
        loggedAt: Date.now(),
      })
    }
  }

  const inp = (placeholder: string, field: keyof PendingSet, width: number) => (
    <input
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={v[field]}
      onChange={(e) => setV((p) => ({ ...p, [field]: e.target.value }))}
      onKeyDown={(e) => e.key === 'Enter' && handleLog()}
      style={{ width, textAlign: 'center', padding: '7px 4px', fontSize: 15, flexShrink: 0 }}
    />
  )

  const bwLabel = ex.bodyweightType === 'assisted' ? 'BW-' : 'BW'

  function renderWeightCell(width: number) {
    if (!ex.isBodyweight) return inp('kg', 'weight', width)
    if (ex.bodyweightType === 'weighted') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {inp('+kg', 'weight', width)}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>extra</span>
        </div>
      )
    }
    return <span style={{ width, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{bwLabel}</span>
  }

  return (
    <div className="set-input-row">
      <span className="set-number">Set {setNumber}</span>

      {ex.isDoubleComponent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {renderWeightCell(60)}
          <span style={{ width: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>×</span>
          <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>L</span>
          {inp('reps', 'leftReps', 44)}
          <span style={{ width: 12, textAlign: 'center', fontSize: 12, color: 'var(--border)', flexShrink: 0 }}>|</span>
          <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>R</span>
          {inp('reps', 'rightReps', 44)}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {renderWeightCell(72)}
          <span style={{ width: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>×</span>
          {inp('reps', 'reps', 52)}
        </div>
      )}

      <button className="btn btn-primary btn-icon btn-sm" onClick={handleLog} title="Log set">
        <CheckIcon />
      </button>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel} title="Cancel" style={{ color: 'var(--text-muted)' }}>
        ×
      </button>
    </div>
  )
}

// ── Set display row ─────────────────────────────────────────────────────────
function SetRow({ set, number, isDoubleComponent, isBodyweight, bodyweightType, isTimed }: { set: SessionSet; number: number; isDoubleComponent: boolean; isBodyweight: boolean; bodyweightType?: 'standard' | 'assisted' | 'weighted'; isTimed?: boolean }) {
  const cell = (content: string | number, width: number, muted = false) => (
    <span style={{ width, textAlign: 'center', fontSize: 14, color: muted ? 'var(--text-muted)' : 'var(--text-secondary)', flexShrink: 0 }}>
      {content}
    </span>
  )

  function bwWeightLabel(w: number | undefined): string {
    if (!isBodyweight) return `${w ?? '—'}kg`
    if (bodyweightType === 'assisted') return 'BW-'
    if (bodyweightType === 'weighted') return w ? `BW+${w}kg` : 'BW'
    return 'BW'
  }

  const w = set.weight ?? set.leftWeight

  if (isTimed) {
    return (
      <div className="set-logged-row">
        <span className="set-number">Set {number}</span>
        {isDoubleComponent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {cell(bwWeightLabel(w), 60)}
            {cell('·', 16, true)}
            <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>L</span>
            {cell(formatDuration(set.leftDuration ?? 0), 54)}
            <span style={{ width: 12, textAlign: 'center', fontSize: 12, color: 'var(--border)', flexShrink: 0 }}>|</span>
            <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>R</span>
            {cell(formatDuration(set.rightDuration ?? 0), 54)}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {cell(bwWeightLabel(set.weight), 72)}
            {cell('·', 20, true)}
            {cell(formatDuration(set.duration ?? 0), 72)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="set-logged-row">
      <span className="set-number">Set {number}</span>
      {isDoubleComponent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {cell(bwWeightLabel(w), 60)}
          {cell('×', 16, true)}
          <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>L</span>
          {cell(set.leftReps ?? set.reps, 44)}
          <span style={{ width: 12, textAlign: 'center', fontSize: 12, color: 'var(--border)', flexShrink: 0 }}>|</span>
          <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>R</span>
          {cell(set.rightReps ?? set.reps, 44)}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {cell(bwWeightLabel(set.weight), 72)}
          {cell('×', 20, true)}
          {cell(set.reps, 52)}
        </div>
      )}
    </div>
  )
}

// ── Exercise card ───────────────────────────────────────────────────────────
interface CardProps {
  ex: SessionExercise
  onRemoveExercise: () => void
  onLogSet: (set: SessionSet) => void
  onRemoveLastSet: () => void
  onStartTimer: (duration: number) => void
  onOpenTimedSet: () => void
  defaultRest: number
}

function ExerciseCard({ ex, onRemoveExercise, onLogSet, onRemoveLastSet, onStartTimer, onOpenTimedSet, defaultRest }: CardProps) {
  const [showInput, setShowInput] = useState(false)
  const [initialValues, setInitialValues] = useState<PendingSet>(emptyPending())

  function handleAddSet() {
    if (ex.isTimed) {
      onOpenTimedSet()
      return
    }
    const last = ex.sets[ex.sets.length - 1]
    setInitialValues(last ? prefillFromLast(last, ex) : emptyPending())
    setShowInput(true)
  }

  function handleLog(set: SessionSet) {
    onLogSet(set)
    setShowInput(false)
    const duration = ex.defaultRestSeconds ?? defaultRest
    onStartTimer(duration)
  }

  function bwTypeLabel(): string {
    if (!ex.isBodyweight) return 'Weighted'
    if (ex.bodyweightType === 'assisted') return 'BW Assisted'
    if (ex.bodyweightType === 'weighted') return 'BW + Weight'
    return 'Bodyweight'
  }

  const typeLabel = [
    ex.isTimed ? 'Timed' : bwTypeLabel(),
    ex.isDoubleComponent ? 'L/R' : null,
    ex.defaultRestSeconds ? `${ex.defaultRestSeconds}s rest` : '90s rest',
  ].filter(Boolean).join(' · ')

  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {ex.exerciseName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {typeLabel}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemoveExercise} style={{ color: 'var(--text-muted)' }}>
          <TrashIcon />
        </button>
      </div>

      {ex.sets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0' }}>
          {ex.sets.map((s, i) => (
            <SetRow
              key={i}
              set={s}
              number={i + 1}
              isDoubleComponent={ex.isDoubleComponent}
              isBodyweight={ex.isBodyweight}
              bodyweightType={ex.bodyweightType}
              isTimed={ex.isTimed}
            />
          ))}
        </div>
      )}

      {showInput && (
        <SetInput
          ex={ex}
          setNumber={ex.sets.length + 1}
          onLog={handleLog}
          onCancel={() => setShowInput(false)}
          initialValues={initialValues}
        />
      )}

      <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
        {!showInput && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, gap: 6 }} onClick={handleAddSet}>
            <PlusIcon /> {ex.isTimed ? 'Start' : 'Set'}
          </button>
        )}
        {ex.sets.length > 0 && !showInput && (
          <button className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--text-muted)' }} onClick={onRemoveLastSet}>
            <UndoIcon /> Undo
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ActiveWorkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, addExercise, removeExercise, logSet, removeLastSet } = useActiveWorkout()
  const { start: startTimer } = useRestTimer()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [defaultRest, setDefaultRest] = useState(90)
  const [workoutExerciseIds, setWorkoutExerciseIds] = useState<string[]>([])
  const contentRef = useRef<HTMLDivElement>(null)
  const processedLocationKey = useRef<string | null>(null)

  useEffect(() => {
    getSettings().then((s) => { if (s.defaultRestSeconds) setDefaultRest(s.defaultRestSeconds) })
  }, [])

  useEffect(() => {
    if (session?.workoutId) {
      getWorkout(session.workoutId).then((wo) => {
        if (wo) setWorkoutExerciseIds(wo.exerciseIds)
      })
    }
  }, [session?.workoutId])

  // If we arrive here from ExerciseCreator with a new exercise, auto-add it
  useEffect(() => {
    const state = location.state as { newExercise?: Exercise } | null
    if (state?.newExercise && session) {
      const ex = state.newExercise
      addExercise({
        exerciseId: ex.id,
        exerciseName: ex.name,
        isBodyweight: ex.isBodyweight,
        bodyweightType: ex.bodyweightType,
        isDoubleComponent: ex.isDoubleComponent,
        isTimed: ex.isTimed,
        timedTargetSeconds: ex.timedTargetSeconds,
        defaultRestSeconds: ex.defaultRestTimerSeconds,
      })
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, session, addExercise, navigate])

  // Handle return from TimedSetPage — guard with location.key so StrictMode double-invoke doesn't log twice
  useEffect(() => {
    const state = location.state as { timedSet?: { instanceId: string; set: SessionSet } } | null
    if (state?.timedSet && processedLocationKey.current !== location.key) {
      processedLocationKey.current = location.key
      logSet(state.timedSet.instanceId, state.timedSet.set)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.key, location.pathname, logSet, navigate])

  // Redirect if no session
  useEffect(() => {
    if (!session) navigate('/log', { replace: true })
  }, [session, navigate])

  const elapsed = useElapsed(session?.startedAt ?? Date.now())

  if (!session) return null

  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0)

  function handleSelectExercise(ex: Exercise) {
    addExercise({
      exerciseId: ex.id,
      exerciseName: ex.name,
      isBodyweight: ex.isBodyweight,
      bodyweightType: ex.bodyweightType,
      isDoubleComponent: ex.isDoubleComponent,
      isTimed: ex.isTimed,
      timedTargetSeconds: ex.timedTargetSeconds,
      defaultRestSeconds: ex.defaultRestTimerSeconds,
    })
    // Scroll to bottom after adding
    setTimeout(() => {
      contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  function handleFinish() {
    if (totalSets === 0) {
      if (!confirm('No sets logged yet. Finish anyway?')) return
    }
    navigate('/log/complete')
  }

  return (
    <>
      <div className="page" ref={contentRef}>
        <div className="page-header" style={{ background: 'var(--bg-primary)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{session.workoutName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{elapsed} · {totalSets} sets</div>
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleFinish}
          >
            Finish
          </button>
        </div>

        <div className="page-content">
          {session.exercises.length === 0 ? (
            <div className="empty-state" style={{ minHeight: '40vh', justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3>No exercises yet</h3>
              <p style={{ marginBottom: 20 }}>Tap the button below to add your first exercise</p>
              <button className="btn btn-secondary" style={{ gap: 8 }} onClick={() => setPickerOpen(true)}>
                <PlusIcon /> Add Exercise
              </button>
            </div>
          ) : (
            <>
              {session.exercises.map((ex) => (
                <ExerciseCard
                  key={ex.instanceId}
                  ex={ex}
                  onRemoveExercise={() => removeExercise(ex.instanceId)}
                  onLogSet={(set) => logSet(ex.instanceId, set)}
                  onRemoveLastSet={() => removeLastSet(ex.instanceId)}
                  onStartTimer={(dur) => startTimer(dur, ex.exerciseName)}
                  onOpenTimedSet={() => {
                    const lastSet = ex.sets[ex.sets.length - 1]
                    const timedState: TimedSetPageState = {
                      instanceId: ex.instanceId,
                      exerciseName: ex.exerciseName,
                      isBodyweight: ex.isBodyweight,
                      isDoubleComponent: ex.isDoubleComponent,
                      setNumber: ex.sets.length + 1,
                      prefillWeight: lastSet?.weight,
                    }
                    navigate('/log/timed-set', { state: timedState })
                  }}
                  defaultRest={defaultRest}
                />
              ))}
              <button
                onClick={() => setPickerOpen(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <PlusIcon /> Add Exercise
              </button>
            </>
          )}
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectExercise}
        presetExerciseIds={workoutExerciseIds}
        alreadyAddedIds={session.exercises.map((e) => e.exerciseId)}
      />
    </>
  )
}