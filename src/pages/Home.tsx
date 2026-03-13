import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs, getAllWorkouts, getSettings } from '../db'
import { WEEKDAY_LABELS, monthName } from '../utils/calendar'
import type { DayLog } from '../types'
import BodyProjection from '../components/BodyProjection'
import { useMuscleFatigue } from '../hooks/useMuscleFatigue'

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const TrophyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
)

const ActivityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

const TargetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
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
  const [weeklyFreq, setWeeklyFreq] = useState<number | null>(null)

  const { opacities: muscleOpacity, muscleMVPs, suggestedTargets, weekVolume, weekVolumeDelta } = useMuscleFatigue()
  const loaded = muscleOpacity !== null
  const [showGhost, setShowGhost] = useState(true)
  const [showVolumePercent, setShowVolumePercent] = useState(true)

  useEffect(() => {
    getSettings().then((s) => {
      setShowGhost(s.showGhostMuscles !== false)
      setShowVolumePercent(s.showVolumePercent !== false)
    })
  }, [])

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
      setWeeklyFreq(recent.length / 3)
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

      {/* ── Top 60vh: calendar ─────────────────────────────────────────── */}
      <div className="home-top">
        {/* Header */}
        <div className="home-header">
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Construct</div>
            {weeklyFreq !== null && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {weeklyFreq.toFixed(1)}× / week · last 3 weeks
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

      {/* ── Bottom 40vh: metrics + body projection ────────────────────── */}
      <div className="home-bottom">
        {/* Column 1: metrics stack */}
        <div className="home-metrics">
          {/* MVPs */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-title">Muscle MVPs</span>
              <div className="metric-card-icon"><TrophyIcon /></div>
            </div>
            <div className="metric-card-body">
              {loaded ? (
                muscleMVPs.length > 0 ? (
                  <div className="metric-pill-list">
                    {muscleMVPs.map((mg) => (
                      <span key={mg} className="metric-pill pill-mvp">{mg}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None this week</span>
                )
              ) : <span className="metric-large-value">—</span>}
            </div>
          </div>

          {/* Volume */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-title">Week Volume</span>
              <div className="metric-card-icon"><ActivityIcon /></div>
            </div>
            <div className="metric-card-body">
              {loaded && weekVolume > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div className="metric-large-value">
                    {Math.round(weekVolume).toLocaleString()}
                    <span className="metric-large-unit">kg</span>
                  </div>
                  {showVolumePercent && (
                    <div className={`metric-card-delta ${weekVolumeDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                      {weekVolumeDelta >= 0 ? '+' : ''}{weekVolumeDelta.toFixed(0)}%
                    </div>
                  )}
                </div>
              ) : <span className="metric-large-value">—</span>}
            </div>
          </div>

          {/* Targets */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-title">Suggested Targets</span>
              <div className="metric-card-icon"><TargetIcon /></div>
            </div>
            <div className="metric-card-body">
              {loaded ? (
                <div className="metric-pill-list">
                  {suggestedTargets.map((mg) => (
                    <span key={mg} className="metric-pill pill-target">{mg}</span>
                  ))}
                </div>
              ) : <span className="metric-large-value">—</span>}
            </div>
          </div>
        </div>

        {/* Column 2: rotating 2D body projection */}
        <div className="home-body">
          <BodyProjection muscleOpacity={muscleOpacity} showGhost={showGhost} />
        </div>
      </div>

    </div>
  )
}
