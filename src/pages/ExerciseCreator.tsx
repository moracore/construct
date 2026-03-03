import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { saveExercise } from '../db'
import { type MuscleGroup, type Exercise } from '../types'
import MuscleGroupSelector from '../components/MuscleGroupSelector'

function generateId() {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
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

export default function ExerciseCreator() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: string })?.returnTo ?? '/library'

  const [name, setName] = useState('')
  const [isBodyweight, setIsBodyweight] = useState(false)
  const [isDoubleComponent, setIsDoubleComponent] = useState(false)
  const [primaryMuscleGroups, setPrimary] = useState<MuscleGroup[]>([])
  const [secondaryMuscleGroups, setSecondary] = useState<MuscleGroup[]>([])
  const [restSeconds, setRestSeconds] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Exercise name is required'); return }
    if (primaryMuscleGroups.length === 0) { setError('Select at least one primary muscle group'); return }

    setSaving(true)
    const exercise: Exercise = {
      id: generateId(),
      name: name.trim(),
      isBodyweight,
      isDoubleComponent,
      primaryMuscleGroups,
      secondaryMuscleGroups,
      defaultRestTimerSeconds: restSeconds ? parseInt(restSeconds) : undefined,
      createdAt: Date.now(),
    }
    await saveExercise(exercise)
    navigate(returnTo, { state: { newExerciseId: exercise.id } })
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(returnTo)}>
          <BackIcon />
        </button>
        <h1>New Exercise</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          <CheckIcon /> Save
        </button>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 14, padding: '10px 14px', background: 'rgba(255,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,68,68,0.3)' }}>
            {error}
          </div>
        )}

        <div className="card">
          <div className="form-group">
            <label>Exercise Name</label>
            <input
              type="text"
              placeholder="e.g. Bench Press"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              autoFocus
            />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="section-title">Type</p>

          <label className="toggle">
            <input
              type="checkbox"
              checked={isBodyweight}
              onChange={(e) => setIsBodyweight(e.target.checked)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span style={{ fontSize: 15 }}>Bodyweight exercise</span>
          </label>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>
            Weight field will be hidden during logging
          </p>

          <div className="divider" />

          <label className="toggle">
            <input
              type="checkbox"
              checked={isDoubleComponent}
              onChange={(e) => setIsDoubleComponent(e.target.checked)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span style={{ fontSize: 15 }}>Left / Right tracking</span>
          </label>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>
            Log each side separately — e.g. dumbbell curls, lateral raises
          </p>
        </div>

        <div className="card">
          <MuscleGroupSelector
            label="Primary Muscles"
            selected={primaryMuscleGroups}
            onChange={setPrimary}
          />
        </div>

        <div className="card">
          <MuscleGroupSelector
            label="Secondary Muscles"
            selected={secondaryMuscleGroups}
            onChange={setSecondary}
          />
        </div>

        <div className="card">
          <div className="form-group">
            <label>Default Rest Timer (seconds)</label>
            <input
              type="number"
              placeholder="e.g. 90 (leave blank for global default)"
              value={restSeconds}
              onChange={(e) => setRestSeconds(e.target.value)}
              min={0}
              max={600}
            />
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Exercise'}
        </button>
      </div>
    </div>
  )
}
