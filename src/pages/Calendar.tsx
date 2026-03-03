import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs, getAllWorkouts } from '../db'
import { buildMonthGrid, WEEKDAY_LABELS, monthName, todayISO } from '../utils/calendar'
import type { DayLog, Workout } from '../types'

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default function Calendar() {
  const navigate = useNavigate()
  const today = todayISO()
  const now = new Date()

  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [logMap, setLogMap] = useState<Record<string, DayLog>>({})
  const [colorMap, setColorMap] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([getAllDayLogs(), getAllWorkouts()]).then(([logs, workouts]) => {
      const lm: Record<string, DayLog> = {}
      logs.forEach((l) => { lm[l.date] = l })
      setLogMap(lm)

      const wm: Record<string, string> = {}
      workouts.forEach((w: Workout) => { wm[w.name] = w.color })
      setColorMap(wm)
    })
  }, [])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const weeks = buildMonthGrid(viewYear, viewMonth)
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft /></button>
        <h1 style={{ textAlign: 'center', flex: 1, fontSize: 18 }}>
          {monthName(viewMonth)} {viewYear}
        </h1>
        <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight /></button>
      </div>

      <div style={{ padding: '12px 16px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {/* Weekday headers */}
        <div className="full-cal-grid" style={{ marginBottom: 4 }}>
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="full-cal-grid" style={{ marginBottom: 6 }}>
            {week.map((cell, di) => {
              const log = logMap[cell.date]
              const color = log ? (colorMap[log.workoutName] ?? 'var(--accent)') : null
              const isToday = cell.date === today

              return (
                <div
                  key={di}
                  onClick={() => cell.isCurrentMonth && log && navigate(`/logs/${log.id}`)}
                  style={{
                    background: isToday ? 'rgba(var(--accent-rgb), 0.12)' : color ? 'var(--bg-secondary)' : 'transparent',
                    border: isToday ? '2px solid var(--accent)' : '1px solid ' + (color ? 'var(--border-subtle)' : 'transparent'),
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 4px 10px',
                    cursor: (cell.isCurrentMonth && log) ? 'pointer' : 'default',
                    opacity: cell.isCurrentMonth ? 1 : 0.3,
                    transition: 'all var(--transition)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    minHeight: 64,
                  }}
                >
                  <span style={{
                    fontSize: 14,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                  }}>
                    {cell.day || ''}
                  </span>
                  {color && (
                    <>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        padding: '0 2px',
                      }}>
                        {log?.workoutName}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        {Object.keys(colorMap).length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(colorMap).map(([name, color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {name}
              </div>
            ))}
          </div>
        )}

        {!isCurrentMonth && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 16, width: '100%' }}
            onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }}
          >
            Back to today
          </button>
        )}
      </div>
    </div>
  )
}
