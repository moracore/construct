import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { getAllExercises, saveWorkout } from '../db'
import { type Exercise, type Workout } from '../types'

function generateId() {
  return `wo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const PRESET_COLORS = [
  '#0080FF', '#FF4444', '#FF8800', '#FFCC00',
  '#44BB66', '#00BBCC', '#AA44FF', '#FF44AA',
  '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4',
]

interface LocationState {
  newExerciseId?: string
}

export default function WorkoutCreator() {
  const navigate = useNavigate()
  const location = useLocation()

  const [name, setName] = useState('')
  const [color, setColor] = useState('#0080FF')
  const [category, setCategory] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadExercises = useCallback(async () => {
    const all = await getAllExercises()
    all.sort((a, b) => a.name.localeCompare(b.name))
    setExercises(all)
  }, [])

  useEffect(() => {
    loadExercises()
  }, [loadExercises])

  // Auto-select newly created exercise when returning from ExerciseCreator
  useEffect(() => {
    const state = location.state as LocationState | null
    if (state?.newExerciseId) {
      setSelectedIds((prev) =>
        prev.includes(state.newExerciseId!) ? prev : [...prev, state.newExerciseId!]
      )
      // Clear state so re-render doesn't re-add
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  function toggleExercise(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!name.trim()) { setError('Workout name is required'); return }
    if (selectedIds.length === 0) { setError('Add at least one exercise'); return }
    setSaving(true)
    const workout: Workout = {
      id: generateId(),
      name: name.trim(),
      exerciseIds: selectedIds,
      color,
      category,
      createdAt: Date.now(),
    }
    await saveWorkout(workout)
    navigate('/library')
  }

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/library')}>
          <BackIcon />
        </button>
        <h1>New Workout</h1>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          <CheckIcon /> Save
        </button>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 14, padding: '10px 14px', background: 'rgba(255,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {/* Name + Category */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Workout Name</label>
            <input
              type="text"
              placeholder="e.g. Push Day"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Category <span style={{ textTransform: 'none', fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Push, Pull, Legs, Upper…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        {/* Color picker */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="section-title">Calendar Color</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'border-color 150ms ease',
                  outline: 'none',
                  boxShadow: color === c ? '0 0 0 2px var(--bg-secondary)' : 'none',
                }}
              />
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', padding: 2, cursor: 'pointer', background: 'none' }}
              />
              Custom
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{color} — preview</span>
          </div>
        </div>

        {/* Exercise selector */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row-between">
            <p className="section-title">
              Exercises{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </p>
            <Link
              to="/exercises/new"
              state={{ returnTo: '/workouts/new' }}
              className="btn btn-ghost btn-sm"
              style={{ gap: 4, padding: '4px 8px' }}
            >
              <PlusIcon /> New
            </Link>
          </div>

          {exercises.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ marginBottom: 8 }}>No exercises yet</p>
              <Link
                to="/exercises/new"
                state={{ returnTo: '/workouts/new' }}
                className="btn btn-primary btn-sm"
              >
                <PlusIcon /> Create First Exercise
              </Link>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  placeholder="Search exercises…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 38 }}
                />
              </div>

              {selectedIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedIds.map((id) => {
                    const ex = exercises.find((e) => e.id === id)
                    if (!ex) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        className="chip selected"
                        onClick={() => toggleExercise(id)}
                        style={{ fontSize: 12 }}
                      >
                        {ex.name} ×
                      </button>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
                    No exercises match "{search}"
                  </p>
                ) : (
                  filtered.map((ex) => {
                    const sel = selectedIds.includes(ex.id)
                    return (
                      <div
                        key={ex.id}
                        className={`exercise-item${sel ? ' selected' : ''}`}
                        onClick={() => toggleExercise(ex.id)}
                      >
                        <div className="exercise-item-info">
                          <div className="exercise-item-name">{ex.name}</div>
                          <div className="exercise-item-meta">
                            {[
                              ex.primaryMuscleGroups.join(', '),
                              ex.isBodyweight && 'Bodyweight',
                              ex.isDoubleComponent && 'L/R',
                            ].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <div className="exercise-check">
                          {sel && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        <button className="btn btn-primary btn-lg btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}
