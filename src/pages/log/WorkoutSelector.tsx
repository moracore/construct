import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAllWorkouts } from '../../db'
import { useActiveWorkout } from '../../context/ActiveWorkoutContext'
import type { Workout } from '../../types'

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

export default function WorkoutSelector() {
  const navigate = useNavigate()
  const { session, startSession, clearSession } = useActiveWorkout()
  const [workouts, setWorkouts] = useState<Workout[]>([])

  useEffect(() => {
    getAllWorkouts().then((all) => {
      all.sort((a, b) => a.name.localeCompare(b.name))
      setWorkouts(all)
    })
  }, [])

  function selectWorkout(workout: Workout) {
    startSession({ workoutId: workout.id, workoutName: workout.name, color: workout.color })
    navigate('/log/active')
  }

  function startCustom() {
    startSession({ workoutName: 'Custom Workout', color: 'var(--accent)' })
    navigate('/log/active')
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

        {workouts.length === 0 && (
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
