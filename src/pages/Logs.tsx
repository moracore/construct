import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs, getAllQuickLogs, deleteQuickLog } from '../db'
import type { DayLog, QuickExerciseLog } from '../types'

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDate(dateStr: string): { friendly: string; dayName: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)

  const isoToday = today.toISOString().slice(0, 10)
  const isoYesterday = yesterday.toISOString().slice(0, 10)

  let friendly = dateStr
  if (dateStr === isoToday) friendly = 'Today'
  else if (dateStr === isoYesterday) friendly = 'Yesterday'
  else {
    friendly = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
  }

  return { friendly, dayName: DAY_NAMES[d.getDay()] }
}

type LogEntry =
  | { type: 'workout'; data: DayLog }
  | { type: 'quick'; data: QuickExerciseLog }

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

export default function Logs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<DayLog[]>([])
  const [quickLogs, setQuickLogs] = useState<QuickExerciseLog[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([getAllDayLogs(), getAllQuickLogs()]).then(([all, quick]) => {
      all.sort((a, b) => b.date.localeCompare(a.date))
      quick.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      setLogs(all)
      setQuickLogs(quick)
    })
  }, [])

  async function handleDeleteQuick(id: string) {
    if (!confirm('Delete this single exercise log?')) return
    await deleteQuickLog(id)
    setQuickLogs((prev) => prev.filter((q) => q.id !== id))
  }

  // Merge both into a single sorted list
  const entries: LogEntry[] = [
    ...logs.map((l) => ({ type: 'workout' as const, data: l })),
    ...quickLogs.map((q) => ({ type: 'quick' as const, data: q })),
  ].sort((a, b) => {
    const da = a.data.date
    const db = b.data.date
    if (da !== db) return db.localeCompare(da)
    return b.data.createdAt - a.data.createdAt
  })

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    if (e.type === 'workout') {
      return e.data.workoutName.toLowerCase().includes(q) || e.data.date.includes(q)
    }
    return e.data.exerciseName.toLowerCase().includes(q) || e.data.date.includes(q) || 'single exercise'.includes(q)
  })

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/')}>
          <BackIcon />
        </button>
        <h1>Logs</h1>
      </div>

      <div className="page-content">
        <input
          type="search"
          placeholder="Search by workout name or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div className="empty-state">
            {entries.length === 0 ? (
              <>
                <h3>No logs yet</h3>
                <p>Complete a workout to see it here</p>
              </>
            ) : (
              <h3>No results for "{search}"</h3>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((entry) => {
              if (entry.type === 'workout') {
                const log = entry.data
                const { friendly, dayName } = formatDate(log.date)
                const setCount = log.exercises.reduce((n, e) => n + e.sets.length, 0)
                const exCount = log.exercises.filter((e) => e.sets.length > 0).length
                const preview = log.markdown.split('\n').find((l) => l.startsWith('## '))?.slice(3) ?? ''

                return (
                  <div
                    key={log.id}
                    onClick={() => navigate(`/logs/${log.id}`)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all var(--transition)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{log.workoutName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                          {friendly} · {dayName}
                        </div>
                        {preview && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview}{exCount > 1 ? ` +${exCount - 1} more` : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{setCount} sets</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{exCount} exercises</div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Quick exercise log
              const ql = entry.data
              const { friendly, dayName } = formatDate(ql.date)
              const setsSummary = ql.sets.map((s, i) => {
                if (ql.isDoubleComponent) {
                  const w = s.weight != null ? `${s.weight}kg × ` : ''
                  return `S${i + 1}: ${w}R${s.rightReps ?? 0}|L${s.leftReps ?? 0}`
                }
                return `S${i + 1}: ${s.weight ? `${s.weight}kg × ` : ''}${s.reps}`
              }).join(', ')

              return (
                <div
                  key={ql.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px 16px',
                    transition: 'all var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{ql.exerciseName}</div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 4 }}>Single</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        {friendly} · {dayName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {setsSummary}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {ql.sets.length} set{ql.sets.length !== 1 ? 's' : ''}
                      </div>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDeleteQuick(ql.id)}
                        style={{ color: 'var(--danger)' }}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
