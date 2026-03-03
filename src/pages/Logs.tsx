import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs } from '../db'
import type { DayLog } from '../types'

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

export default function Logs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<DayLog[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAllDayLogs().then((all) => {
      all.sort((a, b) => b.date.localeCompare(a.date))
      setLogs(all)
    })
  }, [])

  const filtered = logs.filter((l) =>
    l.workoutName.toLowerCase().includes(search.toLowerCase()) ||
    l.date.includes(search)
  )

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
            {logs.length === 0 ? (
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
            {filtered.map((log) => {
              const { friendly, dayName } = formatDate(log.date)
              const setCount = log.exercises.reduce((n, e) => n + e.sets.length, 0)
              const exCount = log.exercises.filter((e) => e.sets.length > 0).length
              // First line of markdown after the title as preview
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
            })}
          </div>
        )}
      </div>
    </div>
  )
}
