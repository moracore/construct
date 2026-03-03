import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAllExercises, getAllWorkouts, getAllDayLogs, deleteExercise, deleteWorkout, saveDayLog } from '../db'
import { parseMarkdownLog } from '../db/parseMarkdown'
import Progress from './Progress'
import type { Exercise, Workout, DayLog } from '../types'

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

type Tab = 'workouts' | 'exercises' | 'logs' | 'progress'

const FULL_DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function generateLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function buildHeader(date: string, workoutName: string) {
  const d = new Date(date + 'T00:00:00')
  return `# ${date} - ${FULL_DAY_NAMES[d.getDay()]} - ${workoutName}`
}

// ── New Log Sheet ────────────────────────────────────────────────────────────
interface NewLogSheetProps {
  workouts: Workout[]
  onClose: () => void
  onSaved: (log: DayLog) => void
}

function NewLogSheet({ workouts, onClose, onSaved }: NewLogSheetProps) {
  const [date, setDate] = useState(todayISO())
  const [workoutName, setWorkoutName] = useState(workouts[0]?.name ?? '')
  const [customName, setCustomName] = useState('')
  const [body, setBody] = useState('## Exercise\n- Set 1: ')
  const [saving, setSaving] = useState(false)

  const resolvedName = workoutName === '__custom__' ? customName : workoutName
  const header = buildHeader(date, resolvedName || 'Workout')
  const fullMarkdown = `${header}\n\n${body}`

  async function handleSave() {
    if (!resolvedName.trim()) return
    setSaving(true)
    const parsed = parseMarkdownLog(fullMarkdown)
    const log: DayLog = {
      id: generateLogId(),
      date,
      workoutName: resolvedName.trim(),
      exercises: parsed.exercises,
      markdown: fullMarkdown,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveDayLog(log)
    onSaved(log)
    onClose()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={onClose} />
      <div className="exercise-picker-sheet" style={{ maxHeight: '90vh' }}>
        <div className="exercise-picker-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 14px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add Log</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Date */}
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Workout name */}
          <div className="form-group">
            <label>Workout</label>
            <select value={workoutName} onChange={(e) => setWorkoutName(e.target.value)}>
              {workouts.map((w) => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
            {workoutName === '__custom__' && (
              <input
                type="text"
                placeholder="Workout name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
                style={{ marginTop: 8 }}
              />
            )}
          </div>

          {/* Generated header preview */}
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent)' }}>
            {header}
          </div>

          {/* Editable body */}
          <div className="form-group">
            <label>Log Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 1.7, resize: 'vertical' }}
              autoFocus={workouts.length === 0}
            />
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleSave}
            disabled={saving || !resolvedName.trim()}
          >
            {saving ? 'Saving…' : 'Save Log'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function Library() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('workouts')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [logs, setLogs] = useState<DayLog[]>([])
  const [search, setSearch] = useState('')
  const [showNewLog, setShowNewLog] = useState(false)

  const load = useCallback(async () => {
    const [exs, wos, ls] = await Promise.all([getAllExercises(), getAllWorkouts(), getAllDayLogs()])
    exs.sort((a, b) => a.name.localeCompare(b.name))
    wos.sort((a, b) => a.name.localeCompare(b.name))
    ls.sort((a, b) => b.date.localeCompare(a.date))
    setExercises(exs)
    setWorkouts(wos)
    setLogs(ls)
  }, [])

  useEffect(() => { load() }, [load, location.key])

  async function handleDeleteExercise(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await deleteExercise(id)
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleDeleteWorkout(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await deleteWorkout(id)
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
  }

  function TabBar() {
    const tabs: { id: Tab; label: string; count: number }[] = [
      { id: 'workouts', label: 'Workouts', count: workouts.length },
      { id: 'exercises', label: 'Exercises', count: exercises.length },
      { id: 'logs', label: 'Logs', count: logs.length },
      { id: 'progress', label: 'Progress', count: 0 },
    ]
    return (
      <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 3, gap: 3 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className="btn"
            onClick={() => { setTab(t.id); setSearch('') }}
            style={{
              flex: 1,
              background: tab === t.id ? 'var(--bg-secondary)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
              padding: '7px 4px',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              transition: 'all 150ms ease',
            }}
          >
            {t.label}
            {t.count > 0 && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>({t.count})</span>}
          </button>
        ))}
      </div>
    )
  }

  const filteredEx = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.primaryMuscleGroups.some((m) => m.toLowerCase().includes(search.toLowerCase()))
  )
  const filteredWo = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.category.toLowerCase().includes(search.toLowerCase())
  )
  const filteredLogs = logs.filter((l) =>
    l.workoutName.toLowerCase().includes(search.toLowerCase()) ||
    l.date.includes(search)
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1>Library</h1>
        {tab === 'exercises' && (
          <Link to="/exercises/new" className="btn btn-primary btn-sm" style={{ gap: 4 }}>
            <PlusIcon /> Exercise
          </Link>
        )}
        {tab === 'workouts' && (
          <Link to="/workouts/new" className="btn btn-primary btn-sm" style={{ gap: 4 }}>
            <PlusIcon /> Workout
          </Link>
        )}
        {tab === 'logs' && (
          <button className="btn btn-primary btn-sm" style={{ gap: 4 }} onClick={() => setShowNewLog(true)}>
            <PlusIcon /> Add Log
          </button>
        )}
        {tab === 'progress' && <div />}
      </div>

      {showNewLog && (
        <NewLogSheet
          workouts={workouts}
          onClose={() => setShowNewLog(false)}
          onSaved={(log) => setLogs((prev) => [log, ...prev])}
        />
      )}

      <div className="page-content">
        <TabBar />

        {tab !== 'progress' && (
          <input
            type="search"
            placeholder={tab === 'exercises' ? 'Search by name or muscle…' : tab === 'workouts' ? 'Search by name or category…' : 'Search logs…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        {/* ── Workouts tab ── */}
        {tab === 'workouts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredWo.length === 0 ? (
              <div className="empty-state">
                {workouts.length === 0 ? (
                  <>
                    <h3>No workouts yet</h3>
                    <p style={{ marginBottom: 16 }}>Create workout presets for quick access</p>
                    <Link to="/workouts/new" className="btn btn-primary"><PlusIcon /> Create Workout</Link>
                  </>
                ) : <h3>No results for "{search}"</h3>}
              </div>
            ) : filteredWo.map((wo) => (
              <div key={wo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 4, height: 44, borderRadius: 2, background: wo.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{wo.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {[wo.category, `${wo.exerciseIds.length} exercise${wo.exerciseIds.length !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteWorkout(wo.id, wo.name)} style={{ color: 'var(--text-muted)' }}>
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Exercises tab ── */}
        {tab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredEx.length === 0 ? (
              <div className="empty-state">
                {exercises.length === 0 ? (
                  <>
                    <h3>No exercises yet</h3>
                    <p style={{ marginBottom: 16 }}>Build your exercise library</p>
                    <Link to="/exercises/new" className="btn btn-primary"><PlusIcon /> Create Exercise</Link>
                  </>
                ) : <h3>No results for "{search}"</h3>}
              </div>
            ) : filteredEx.map((ex) => (
              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {ex.name}
                    {ex.isBodyweight && <span className="badge badge-accent" style={{ fontSize: 10 }}>BW</span>}
                    {ex.isDoubleComponent && <span className="badge" style={{ fontSize: 10, background: 'rgba(170,68,255,0.15)', color: '#AA44FF' }}>L/R</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {ex.primaryMuscleGroups.join(', ')}
                    {ex.secondaryMuscleGroups.length > 0 && <span style={{ opacity: 0.7 }}> · {ex.secondaryMuscleGroups.join(', ')}</span>}
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteExercise(ex.id, ex.name)} style={{ color: 'var(--text-muted)' }}>
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Raw Logs tab ── */}
        {tab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredLogs.length === 0 ? (
              <div className="empty-state">
                {logs.length === 0 ? (
                  <><h3>No logs yet</h3><p>Complete a workout to see entries here</p></>
                ) : <h3>No results for "{search}"</h3>}
              </div>
            ) : filteredLogs.map((log) => {
              const d = new Date(log.date + 'T00:00:00')
              const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
              const dayName = DAY_NAMES[d.getDay()]
              const sets = log.exercises.reduce((n, e) => n + e.sets.length, 0)
              const firstEx = log.markdown.split('\n').find((l) => l.startsWith('## '))?.slice(3) ?? ''
              return (
                <div
                  key={log.id}
                  onClick={() => navigate(`/logs/${log.id}`)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{log.workoutName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{dayName} · {dateLabel}</div>
                      {firstEx && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {firstEx}{log.exercises.length > 1 ? ` +${log.exercises.length - 1} more` : ''}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>{sets} sets</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* ── Progress tab ── */}
        {tab === 'progress' && <Progress logs={logs} exercises={exercises} />}
      </div>
    </div>
  )
}
