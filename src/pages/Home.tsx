import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs, getAllWorkouts } from '../db'
import { WEEKDAY_LABELS, monthName } from '../utils/calendar'
import type { DayLog } from '../types'

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

// ── Calendar helpers ──────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

interface WeekRow {
  monday: Date
  days: { date: string; dayNum: number; monthNum: number; isFuture: boolean; isToday: boolean }[]
  monthLabel: string | null
}

function buildWeekRows(weeksBack: number, weeksForward: number): WeekRow[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = toISO(today)
  const monday = getMondayOf(today)

  const rows: WeekRow[] = []
  let prevMonth = -1

  for (let w = -weeksBack; w <= weeksForward; w++) {
    const weekStart = addDays(monday, w * 7)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return {
        date: toISO(d),
        dayNum: d.getDate(),
        monthNum: d.getMonth(),
        isFuture: d > today,
        isToday: toISO(d) === todayISO,
      }
    })

    const thisMonth = weekStart.getMonth()
    const monthLabel = thisMonth !== prevMonth ? monthName(thisMonth) : null
    prevMonth = thisMonth

    rows.push({ monday: weekStart, days, monthLabel })
  }

  return rows
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const currentWeekRef = useRef<HTMLDivElement>(null)

  const [logMap, setLogMap] = useState<Record<string, DayLog>>({})
  const [colorMap, setColorMap] = useState<Record<string, string>>({})
  const [consistency, setConsistency] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([getAllDayLogs(), getAllWorkouts()]).then(([logs, workouts]) => {
      const lm: Record<string, DayLog> = {}
      logs.forEach((l) => { lm[l.date] = l })
      setLogMap(lm)

      const wm: Record<string, string> = {}
      workouts.forEach((w) => { wm[w.name] = w.color })
      setColorMap(wm)

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 21)
      const cutoffStr = toISO(cutoff)
      const recent = logs.filter((l) => l.date >= cutoffStr)
      setConsistency(recent.length / 3)
    })
  }, [])

  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [])

  const weeks = buildWeekRows(26, 12)
  const currentWeekIdx = 26

  return (
    <div className="home-wrap">
      {/* Header */}
      <div className="home-header">
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Construct</div>
          {consistency !== null && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {consistency.toFixed(1)}× / week · last 3 weeks
            </div>
          )}
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => navigate('/settings')}
          style={{ color: 'var(--text-muted)' }}
        >
          <SettingsIcon />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="home-weekdays">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="home-weekday-label">{d}</div>
        ))}
      </div>

      {/* Scrollable calendar */}
      <div className="home-cal-scroll">
        {weeks.map((week, wi) => {
          const isCurrentWeek = wi === currentWeekIdx
          const allFuture = week.days.every((d) => d.isFuture)

          return (
            <div key={toISO(week.monday)} ref={isCurrentWeek ? currentWeekRef : undefined}>
              <div className="home-week-row" style={{ opacity: allFuture ? 0.25 : 1 }}>
                {week.days.map((cell) => {
                  const log = logMap[cell.date]
                  const color = log ? (colorMap[log.workoutName] ?? 'var(--accent)') : null
                  const dimFuture = cell.isFuture && !allFuture

                  // First 4 days of January → show year digits (2,0,2,6)
                  const isYearDigit = cell.monthNum === 0 && cell.dayNum >= 1 && cell.dayNum <= 4
                  const yearDigit = isYearDigit ? cell.date.slice(0, 4)[cell.dayNum - 1] : null

                  // Other month-starts → show initial letter
                  const isNonJanStart = cell.dayNum === 1 && cell.monthNum !== 0

                  let cls = 'home-day-sq'
                  if (isYearDigit) cls += ' hd-year'
                  if (color) cls += ' hd-logged'
                  if (cell.isToday) cls += ' hd-today'
                  if (isNonJanStart && !color) cls += ' hd-month-start'

                  const label = isYearDigit
                    ? yearDigit
                    : isNonJanStart
                    ? monthName(cell.monthNum).charAt(0)
                    : cell.dayNum

                  return (
                    <div
                      key={cell.date}
                      className="home-day-cell"
                      onClick={() => log && navigate(`/logs/${log.id}`)}
                      style={{ cursor: log ? 'pointer' : 'default', opacity: dimFuture ? 0.32 : 1 }}
                    >
                      <div
                        className={cls}
                        style={color ? { '--day-color': color } as React.CSSProperties : undefined}
                      >
                        {label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
