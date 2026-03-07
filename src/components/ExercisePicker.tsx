import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllExercises } from '../db'
import type { Exercise } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  presetExerciseIds?: string[]
  alreadyAddedIds: string[]
}

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export default function ExercisePicker({ open, onClose, onSelect, presetExerciseIds = [], alreadyAddedIds }: Props) {
  const [all, setAll] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (open) {
      getAllExercises().then((exs) => {
        exs.sort((a, b) => a.name.localeCompare(b.name))
        setAll(exs)
        setSearch('')
        setShowAll(false)
      })
    }
  }, [open])

  if (!open) return null

  const hasPreset = presetExerciseIds.length > 0
  const query = search.toLowerCase()
  const filtered = all.filter((e) =>
    e.name.toLowerCase().includes(query) ||
    e.primaryMuscleGroups.some((m) => m.toLowerCase().includes(query))
  )

  const preset = filtered.filter((e) => presetExerciseIds.includes(e.id))
  const others = filtered.filter((e) => !presetExerciseIds.includes(e.id))

  // When preset exists and not browsing all and not searching: show only preset
  const visiblePreset = preset
  const visibleOthers = (!hasPreset || showAll || query) ? others : []

  function handleSelect(ex: Exercise) {
    onSelect(ex)
    onClose()
  }

  function ExRow({ ex }: { ex: Exercise }) {
    const count = alreadyAddedIds.filter((id) => id === ex.id).length
    return (
      <div
        className="exercise-item"
        onClick={() => handleSelect(ex)}
        style={{ cursor: 'pointer' }}
      >
        <div className="exercise-item-info">
          <div className="exercise-item-name">{ex.name}</div>
          <div className="exercise-item-meta">
            {[
              ex.primaryMuscleGroups.join(', '),
              ex.isBodyweight && 'Bodyweight',
              ex.isDoubleComponent && 'L/R',
              ex.isTimed && 'Timed',
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {count > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>×{count}</span>
          )}
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(var(--accent-rgb),0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <PlusIcon />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="exercise-picker-sheet">
        <div className="exercise-picker-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add Exercise</h2>
          <Link
            to="/exercises/new"
            state={{ returnTo: '/log/active' }}
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ gap: 4 }}
          >
            <PlusIcon /> New
          </Link>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <input
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {all.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ marginBottom: 12 }}>No exercises in library yet</p>
              <Link to="/exercises/new" state={{ returnTo: '/log/active' }} className="btn btn-primary btn-sm" onClick={onClose}>
                <PlusIcon /> Create Exercise
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              No matches for "{search}"
            </p>
          ) : (
            <>
              {hasPreset && !query && (
                <p className="section-title" style={{ padding: '4px 0' }}>This Workout</p>
              )}
              {visiblePreset.map((ex) => <ExRow key={ex.id} ex={ex} />)}

              {/* Browse all toggle */}
              {hasPreset && !query && !showAll && others.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, color: 'var(--text-muted)', alignSelf: 'center' }}
                  onClick={() => setShowAll(true)}
                >
                  Browse all exercises ({others.length} more)
                </button>
              )}

              {visibleOthers.length > 0 && (
                <>
                  {hasPreset && <p className="section-title" style={{ padding: '8px 0 4px' }}>All Exercises</p>}
                  {visibleOthers.map((ex) => <ExRow key={ex.id} ex={ex} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
