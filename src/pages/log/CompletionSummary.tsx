import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveWorkout, type SessionExercise, type SessionSet } from '../../context/ActiveWorkoutContext'
import { getAllDayLogs, saveDayLog } from '../../db'
import type { DayLog, LoggedExercise, ExerciseSet } from '../../types'

function generateId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function calcVolume(sets: SessionSet[], isBodyweight: boolean, isDoubleComponent: boolean): number {
  let v = 0
  for (const s of sets) {
    if (isDoubleComponent) {
      v += ((s.leftWeight ?? 0) * (s.leftReps ?? s.reps)) + ((s.rightWeight ?? 0) * (s.rightReps ?? s.reps))
    } else if (!isBodyweight) {
      v += (s.weight ?? 0) * s.reps
    }
  }
  return v
}

function sessionSetToExSet(s: SessionSet): ExerciseSet {
  return {
    reps: s.reps,
    weight: s.weight,
    weightUnit: 'kg',
    leftWeight: s.leftWeight,
    rightWeight: s.rightWeight,
    leftReps: s.leftReps,
    rightReps: s.rightReps,
  }
}

function sessionToMarkdown(session: { workoutName: string; exercises: SessionExercise[] }, date: string): string {
  const d = new Date(date + 'T00:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let md = `# ${date} - ${days[d.getDay()]} - ${session.workoutName}\n`
  for (const ex of session.exercises) {
    if (ex.sets.length === 0) continue
    const suffix = ex.isDoubleComponent ? ' (L/R)' : ''
    md += `\n## ${ex.exerciseName}${suffix}\n`
    ex.sets.forEach((s, i) => {
      let line = ''
      if (ex.isDoubleComponent) {
        const lw = s.leftWeight != null ? `${s.leftWeight}kg` : ''
        const rw = s.rightWeight != null ? `${s.rightWeight}kg` : ''
        line = `L ${lw} x ${s.leftReps ?? s.reps} | R ${rw} x ${s.rightReps ?? s.reps}`
      } else if (ex.isBodyweight) {
        line = `BW x ${s.reps}${s.weight ? ` (+${s.weight}kg)` : ''}`
      } else {
        line = `${s.weight ?? '—'}kg x ${s.reps}`
      }
      md += `- Set ${i + 1}: ${line}\n`
    })
  }
  return md
}

interface PR {
  exerciseName: string
  type: string
  value: string
}

function detectPRs(exercises: SessionExercise[], allLogs: DayLog[]): PR[] {
  const prs: PR[] = []
  for (const ex of exercises) {
    if (ex.sets.length === 0) continue
    const pastSets: SessionSet[] = []
    for (const log of allLogs) {
      const match = log.exercises.find((e) => e.exerciseId === ex.exerciseId)
      if (!match) continue
      for (const s of match.sets) {
        pastSets.push({
          reps: s.reps,
          weight: s.weight,
          leftWeight: s.leftWeight,
          rightWeight: s.rightWeight,
          leftReps: s.leftReps,
          rightReps: s.rightReps,
          loggedAt: 0,
        })
      }
    }
    if (pastSets.length === 0) continue // first time doing this exercise

    if (ex.isDoubleComponent) {
      const pastMax = Math.max(...pastSets.map((s) => Math.max(s.leftWeight ?? 0, s.rightWeight ?? 0)))
      const curMax = Math.max(...ex.sets.map((s) => Math.max(s.leftWeight ?? 0, s.rightWeight ?? 0)))
      if (curMax > pastMax) prs.push({ exerciseName: ex.exerciseName, type: 'Max weight', value: `${curMax}kg` })
    } else if (!ex.isBodyweight) {
      const pastMax = Math.max(...pastSets.map((s) => s.weight ?? 0))
      const curMax = Math.max(...ex.sets.map((s) => s.weight ?? 0))
      if (curMax > pastMax) prs.push({ exerciseName: ex.exerciseName, type: 'Max weight', value: `${curMax}kg` })

      // Estimated 1RM = weight × (1 + reps/30)
      const e1rm = (w: number, r: number) => w * (1 + r / 30)
      const pastBest = Math.max(...pastSets.map((s) => s.weight ? e1rm(s.weight, s.reps) : 0))
      const curBest = Math.max(...ex.sets.map((s) => s.weight ? e1rm(s.weight, s.reps) : 0))
      if (curBest > pastBest && curBest > 0) prs.push({ exerciseName: ex.exerciseName, type: 'Est. 1RM', value: `${Math.round(curBest)}kg` })
    } else {
      const pastMax = Math.max(...pastSets.map((s) => s.reps))
      const curMax = Math.max(...ex.sets.map((s) => s.reps))
      if (curMax > pastMax) prs.push({ exerciseName: ex.exerciseName, type: 'Max reps', value: `${curMax}` })
    }
  }
  return prs
}

export default function CompletionSummary() {
  const navigate = useNavigate()
  const { session, clearSession } = useActiveWorkout()
  const [prs, setPRs] = useState<PR[]>([])
  const [saving, setSaving] = useState(false)
  const [markdown, setMarkdown] = useState('')

  useEffect(() => {
    if (!session) { navigate('/log', { replace: true }); return }
    const date = todayISO()
    const md = sessionToMarkdown(session, date)
    setMarkdown(md)
    getAllDayLogs().then((logs) => setPRs(detectPRs(session.exercises, logs)))
  }, [session, navigate])

  if (!session) return null

  const duration = Date.now() - session.startedAt
  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + calcVolume(ex.sets, ex.isBodyweight, ex.isDoubleComponent), 0
  )
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0)

  async function handleSave() {
    if (!session) return
    setSaving(true)
    const date = todayISO()
    const loggedExercises: LoggedExercise[] = session.exercises
      .filter((ex) => ex.sets.length > 0)
      .map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets.map(sessionSetToExSet),
      }))
    const dayLog: DayLog = {
      id: generateId(),
      date,
      workoutName: session.workoutName,
      exercises: loggedExercises,
      markdown,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveDayLog(dayLog)
    clearSession()
    navigate('/', { replace: true })
  }

  function handleDiscard() {
    if (!confirm('Discard this workout? Nothing will be saved.')) return
    clearSession()
    navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Workout Complete</h1>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Duration', value: formatDuration(duration) },
            { label: 'Sets', value: totalSets.toString() },
            { label: 'Volume', value: totalVolume > 0 ? `${Math.round(totalVolume)}kg` : '—' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* PRs */}
        {prs.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="section-title" style={{ color: '#FFCC00' }}>🏆 Personal Records</p>
            {prs.map((pr, i) => (
              <div key={i} className="row-between">
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{pr.exerciseName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pr.type}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#FFCC00', fontSize: 15 }}>{pr.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Exercises summary */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="section-title">Summary</p>
          {session.exercises.filter((e) => e.sets.length > 0).map((ex) => (
            <div key={ex.exerciseId} className="row-between">
              <span style={{ fontSize: 14, fontWeight: 500 }}>{ex.exerciseName}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        {/* Markdown preview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="section-title">Log Preview</p>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={Math.min(20, markdown.split('\n').length + 2)}
            style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, resize: 'vertical', background: 'var(--bg-tertiary)' }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>You can edit before saving</p>
        </div>

        <button className="btn btn-primary btn-lg btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Finish'}
        </button>
        <button className="btn btn-ghost btn-full" onClick={handleDiscard} style={{ color: 'var(--danger)' }}>
          Discard Workout
        </button>
      </div>
    </div>
  )
}
