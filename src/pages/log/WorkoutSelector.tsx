import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAllWorkouts, getQuickLogsByDate, saveQuickLog } from '../../db'
import { useActiveWorkout } from '../../context/ActiveWorkoutContext'
import type { Workout, Exercise, ExerciseSet, QuickExerciseLog } from '../../types'
import ExercisePicker from '../../components/ExercisePicker'

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ResumeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

interface PendingSet {
  weight: string
  reps: string
  leftReps: string
  rightReps: string
}

function emptyPending(): PendingSet {
  return { weight: '', reps: '', leftReps: '', rightReps: '' }
}

function prefillFromLastQuick(last: ExerciseSet, ex: Exercise): PendingSet {
  if (ex.isDoubleComponent) {
    return {
      weight: last.weight?.toString() ?? last.leftWeight?.toString() ?? '',
      reps: '',
      leftReps: last.leftReps?.toString() ?? last.reps.toString(),
      rightReps: last.rightReps?.toString() ?? last.reps.toString(),
    }
  }
  return {
    weight: last.weight?.toString() ?? '',
    reps: last.reps.toString(),
    leftReps: '', rightReps: '',
  }
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function WorkoutSelector() {
  const navigate = useNavigate()
  const { session, startSession, clearSession } = useActiveWorkout()
  const [workouts, setWorkouts] = useState<Workout[]>([])

  // Single exercise state
  const [showPicker, setShowPicker] = useState(false)
  const [quickExercise, setQuickExercise] = useState<Exercise | null>(null)
  const [quickSets, setQuickSets] = useState<ExerciseSet[]>([])
  const [pending, setPending] = useState<PendingSet>(emptyPending())
  const [todayQuickCount, setTodayQuickCount] = useState(0)
  const [quickSaving, setQuickSaving] = useState(false)

  useEffect(() => {
    getAllWorkouts().then((all) => {
      all.sort((a, b) => a.name.localeCompare(b.name))
      setWorkouts(all)
    })
    getQuickLogsByDate(todayISO()).then((logs) => setTodayQuickCount(logs.length))
  }, [])

  function selectWorkout(workout: Workout) {
    startSession({ workoutId: workout.id, workoutName: workout.name, color: workout.color })
    navigate('/log/active')
  }

  function startCustom() {
    startSession({ workoutName: 'Custom Workout', color: 'var(--accent)' })
    navigate('/log/active')
  }

  function handleQuickExerciseSelect(ex: Exercise) {
    setQuickExercise(ex)
    setQuickSets([])
    setPending(emptyPending())
  }

  function addQuickSet() {
    if (!quickExercise) return
    let set: ExerciseSet
    if (quickExercise.isDoubleComponent) {
      const lr = parseInt(pending.leftReps) || 0
      const rr = parseInt(pending.rightReps) || 0
      if (!lr && !rr) return
      const w = pending.weight ? parseFloat(pending.weight) : undefined
      set = { reps: Math.max(lr, rr), weight: w, leftWeight: w, rightWeight: w, leftReps: lr || undefined, rightReps: rr || undefined }
    } else {
      const reps = parseInt(pending.reps) || 0
      if (!reps) return
      set = { reps, weight: pending.weight ? parseFloat(pending.weight) : undefined }
    }
    const newSets = [...quickSets, set]
    setQuickSets(newSets)
    setPending(prefillFromLastQuick(set, quickExercise))
  }

  async function saveQuickExercise() {
    if (!quickExercise || quickSets.length === 0) return
    setQuickSaving(true)
    const log: QuickExerciseLog = {
      id: genId('ql'),
      date: todayISO(),
      exerciseId: quickExercise.id,
      exerciseName: quickExercise.name,
      primaryMuscleGroups: quickExercise.primaryMuscleGroups,
      secondaryMuscleGroups: quickExercise.secondaryMuscleGroups,
      isBodyweight: quickExercise.isBodyweight,
      bodyweightType: quickExercise.bodyweightType,
      isDoubleComponent: quickExercise.isDoubleComponent,
      isTimed: quickExercise.isTimed,
      sets: quickSets,
      createdAt: Date.now(),
    }
    await saveQuickLog(log)
    setTodayQuickCount((c) => c + 1)
    setQuickExercise(null)
    setQuickSets([])
    setQuickSaving(false)
  }

  const elapsed = session
    ? Math.floor((Date.now() - session.startedAt) / 60000)
    : 0

  return (
    <div className="page">
      <div className="page-header">
        <h1>Start Workout</h1>
        <Link to="/workouts/new" className="btn btn-primary btn-sm" style={{ gap: 4 }}>
          <PlusIcon /> New preset
        </Link>
      </div>

      <div className="page-content">
        {/* Resume banner */}
        {session && (
          <div style={{ background: 'rgba(var(--accent-rgb), 0.12)', border: '1px solid rgba(var(--accent-rgb), 0.35)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{session.workoutName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                In progress · {elapsed}m ago · {session.exercises.reduce((n, e) => n + e.sets.length, 0)} sets logged
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={() => navigate('/log/active')}>
              <ResumeIcon /> Resume
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => { if (confirm('Discard current session?')) clearSession() }}>
              Discard
            </button>
          </div>
        )}

        {workouts.length > 0 && <p className="section-title">Your Workouts</p>}

        <div className="workout-grid">
          {workouts.map((wo) => {
            const setCount = wo.exerciseIds.length
            return (
              <button
                key={wo.id}
                className="workout-tile"
                onClick={() => selectWorkout(wo)}
                style={{ '--tile-color': wo.color } as React.CSSProperties}
              >
                <div className="workout-tile-bar" />
                <div className="workout-tile-content">
                  <div className="workout-tile-name">{wo.name}</div>
                  <div className="workout-tile-meta">
                    {wo.category && <span>{wo.category}</span>}
                    <span>{setCount} exercise{setCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Custom block */}
          <button className="workout-tile workout-tile-custom" onClick={startCustom}>
            <div className="workout-tile-content">
              <div className="workout-tile-name">Custom</div>
              <div className="workout-tile-meta">Pick any exercises</div>
            </div>
          </button>

          {/* New preset block */}
          <Link to="/workouts/new" className="workout-tile workout-tile-new">
            <PlusIcon />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>New preset</span>
          </Link>
        </div>

        {/* Single Exercise */}
        {todayQuickCount < 3 && !quickExercise && (
          <>
            <p className="section-title">Quick Log</p>
            <button
              className="workout-tile"
              onClick={() => setShowPicker(true)}
              style={{
                '--tile-color': 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border)',
                opacity: 0.8,
              } as React.CSSProperties}
            >
              <div className="workout-tile-content">
                <div className="workout-tile-name" style={{ color: 'var(--text-secondary)' }}>Single Exercise</div>
                <div className="workout-tile-meta">Log a quick exercise without a full workout</div>
              </div>
            </button>
          </>
        )}

        {/* Inline set logger for quick exercise */}
        {quickExercise && (() => {
          const ex = quickExercise
          const bwLabel = ex.bodyweightType === 'assisted' ? 'BW-' : 'BW'

          const inp = (placeholder: string, field: keyof PendingSet, width: number) => (
            <input
              type="number"
              inputMode="decimal"
              placeholder={placeholder}
              value={pending[field]}
              onChange={(e) => setPending((p) => ({ ...p, [field]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addQuickSet()}
              style={{ width, textAlign: 'center', padding: '7px 4px', fontSize: 15, flexShrink: 0 }}
            />
          )

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

          function formatSet(s: ExerciseSet, i: number) {
            if (ex.isDoubleComponent) {
              const w = s.weight != null ? `${s.weight}kg × ` : ''
              return `Set ${i + 1}: ${w}R${s.rightReps ?? 0} | L${s.leftReps ?? 0}`
            }
            return `Set ${i + 1}: ${s.weight ? `${s.weight}kg × ` : ''}${s.reps} reps`
          }

          return (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {[
                      ex.primaryMuscleGroups.join(', '),
                      ex.isBodyweight && 'Bodyweight',
                      ex.isDoubleComponent && 'L/R',
                      ex.isTimed && 'Timed',
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => { setQuickExercise(null); setQuickSets([]) }}
                >
                  Cancel
                </button>
              </div>

              {/* Logged sets */}
              {quickSets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {quickSets.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      {formatSet(s, i)}
                    </div>
                  ))}
                </div>
              )}

              {/* Input row — matches ActiveWorkout SetInput format */}
              <div className="set-input-row">
                <span className="set-number">Set {quickSets.length + 1}</span>

                {ex.isDoubleComponent ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    {renderWeightCell(60)}
                    <span style={{ width: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>×</span>
                    <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>R</span>
                    {inp('reps', 'rightReps', 44)}
                    <span style={{ width: 12, textAlign: 'center', fontSize: 12, color: 'var(--border)', flexShrink: 0 }}>|</span>
                    <span style={{ width: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>L</span>
                    {inp('reps', 'leftReps', 44)}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    {renderWeightCell(72)}
                    <span style={{ width: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>×</span>
                    {inp('reps', 'reps', 52)}
                  </div>
                )}

                <button className="btn btn-primary btn-icon btn-sm" onClick={addQuickSet} title="Log set">
                  <CheckIcon />
                </button>
              </div>

              {/* Save */}
              {quickSets.length > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={saveQuickExercise}
                  disabled={quickSaving}
                  style={{ gap: 6 }}
                >
                  <CheckIcon /> Save ({quickSets.length} set{quickSets.length !== 1 ? 's' : ''})
                </button>
              )}
            </div>
          )
        })()}

        {todayQuickCount > 0 && !quickExercise && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
            {todayQuickCount}/3 single exercises logged today
          </div>
        )}

        <ExercisePicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleQuickExerciseSelect}
          alreadyAddedIds={[]}
        />

        {workouts.length === 0 && !quickExercise && (
          <div className="empty-state" style={{ paddingTop: 24 }}>
            <p style={{ marginBottom: 16, color: 'var(--text-muted)' }}>
              Create workout presets for quick access, or start a custom session now.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
