import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDayLog, saveDayLog, deleteDayLog, getAllExercises } from '../db'
import { parseMarkdownLog, formatDurationMins } from '../db/parseMarkdown'
import type { DayLog } from '../types'

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function LogViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [log, setLog] = useState<DayLog | null>(null)
  const [markdown, setMarkdown] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getDayLog(id).then((l) => {
      if (!l) { setNotFound(true); return }
      setLog(l)
      setMarkdown(l.markdown)
    })
  }, [id])

  async function handleSave() {
    if (!log) return
    setSaving(true)
    const [parsed, allExercises] = await Promise.all([
      Promise.resolve(parseMarkdownLog(markdown)),
      getAllExercises(),
    ])
    const libraryNameToId = new Map(allExercises.map((e) => [e.name.toLowerCase(), e.id]))
    const updated: DayLog = {
      ...log,
      markdown,
      date: parsed.date || log.date,
      workoutName: parsed.workoutName || log.workoutName,
      startTime: parsed.startTime ?? undefined,
      durationMinutes: parsed.durationMinutes ?? undefined,
      exercises: parsed.exercises.map((e) => ({
        ...e,
        exerciseId:
          log.exercises.find((le) => le.exerciseName === e.exerciseName)?.exerciseId ||
          libraryNameToId.get(e.exerciseName.toLowerCase()) ||
          '',
      })),
      updatedAt: Date.now(),
    }
    await saveDayLog(updated)
    setLog(updated)
    setDirty(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!log) return
    if (!confirm(`Delete this log entry? This cannot be undone.`)) return
    await deleteDayLog(log.id)
    navigate('/logs')
  }

  if (notFound) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/logs')}><BackIcon /></button>
          <h1>Log</h1>
        </div>
        <div className="empty-state"><h3>Log not found</h3></div>
      </div>
    )
  }

  if (!log) return null

  const d = new Date(log.date + 'T00:00:00')
  const dayName = DAY_NAMES[d.getDay()]
  const dateLabel = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/logs')}><BackIcon /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{log.workoutName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {dayName} · {dateLabel} · {log.startTime || '-'} · {formatDurationMins(log.durationMinutes)}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
          <TrashIcon />
        </button>
      </div>

      <div className="page-content">
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Exercises', value: log.exercises.filter((e) => e.sets.length > 0).length },
            { label: 'Sets', value: log.exercises.reduce((n, e) => n + e.sets.length, 0) },
          ].map((s) => (
            <div key={s.label} className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Editable markdown */}
        <div className="card" style={{ gap: 10, display: 'flex', flexDirection: 'column' }}>
          <div className="row-between">
            <p className="section-title">Markdown Log</p>
            {dirty && (
              <span style={{ fontSize: 12, color: 'var(--warning)' }}>Unsaved changes</span>
            )}
          </div>
          <textarea
            value={markdown}
            onChange={(e) => { setMarkdown(e.target.value); setDirty(true) }}
            rows={Math.max(10, markdown.split('\n').length + 2)}
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.7,
              resize: 'vertical',
              background: 'var(--bg-tertiary)',
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Edit freely — saving re-parses the structured data
          </p>
        </div>

        {dirty && (
          <button className="btn btn-primary btn-lg btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  )
}
