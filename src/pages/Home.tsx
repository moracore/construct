import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs, getAllWorkouts, getSettings } from '../db'
import { WEEKDAY_LABELS, monthName } from '../utils/calendar'
import type { DayLog, HomePanelWidget } from '../types'
import { DEFAULT_HOME_SLOTS } from '../types'
import BodyProjection from '../components/BodyProjection'
import { useMuscleFatigue, type FatigueResult } from '../hooks/useMuscleFatigue'

// ── Icons ─────────────────────────────────────────────────────────────────────

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const TrophyIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
const ActivityIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
const TargetIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
const FlameIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
const ClockIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const BarChartIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>

// ── Widget metadata ───────────────────────────────────────────────────────────

const WIDGET_META: Record<HomePanelWidget, { label: string; icon: React.ReactNode }> = {
  'muscle-mvps':             { label: 'Muscle MVPs',    icon: <TrophyIcon /> },
  'week-volume':             { label: 'Week Volume',     icon: <ActivityIcon /> },
  'suggested-targets':       { label: 'Targets',         icon: <TargetIcon /> },
  'weekly-frequency':        { label: 'Frequency',       icon: <ClockIcon /> },
  'rest-day-counter':        { label: 'Rest Days',       icon: <ClockIcon /> },
  'current-streak':          { label: 'Streak',          icon: <FlameIcon /> },
  'last-session':            { label: 'Last Session',    icon: <ClockIcon /> },
  'top-exercises':           { label: 'This Week',       icon: <BarChartIcon /> },
  'muscle-volume-breakdown': { label: 'Volume Split',    icon: <BarChartIcon /> },
  'volume-trend':            { label: '8-Week Trend',    icon: <ActivityIcon /> },
}

// ── Helper: relative date ─────────────────────────────────────────────────────

function relDate(dateISO: string): string {
  const diff = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(dateISO + 'T12:00:00').getTime()) / 86400000
  )
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff}d ago`
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  const hasData = values.some(v => v > 0)
  if (!hasData) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No data yet</span>
  const max  = Math.max(...values, 1)
  const W    = 110
  const H    = 26
  const pad  = 3
  const pts  = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - (v / max) * (H - pad * 2)
    return [x, y] as [number, number]
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  const lastPt = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="var(--accent)" />
    </svg>
  )
}

// ── Widget body ───────────────────────────────────────────────────────────────

interface WidgetBodyProps {
  widget: HomePanelWidget
  data: FatigueResult
  showVolumePercent: boolean
  loaded: boolean
}

function WidgetBody({ widget, data, showVolumePercent, loaded }: WidgetBodyProps) {
  if (!loaded) return <span className="metric-large-value">—</span>

  switch (widget) {
    case 'muscle-mvps':
      return data.muscleMVPs.length > 0
        ? <div className="metric-pill-list">{data.muscleMVPs.map(mg => <span key={mg} className="metric-pill pill-mvp">{mg}</span>)}</div>
        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None this week</span>

    case 'week-volume':
      return data.weekVolume > 0
        ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div className="metric-large-value">
              {Math.round(data.weekVolume).toLocaleString()}
              <span className="metric-large-unit">kg</span>
            </div>
            {showVolumePercent && (
              <div className={`metric-card-delta ${data.weekVolumeDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                {data.weekVolumeDelta >= 0 ? '+' : ''}{data.weekVolumeDelta.toFixed(0)}%
              </div>
            )}
          </div>
        )
        : <span className="metric-large-value">—</span>

    case 'suggested-targets':
      return (
        <div className="metric-pill-list">
          {data.suggestedTargets.slice(0, 6).map(mg => <span key={mg} className="metric-pill pill-target">{mg}</span>)}
        </div>
      )

    case 'weekly-frequency':
      return (
        <div className="widget-stat">
          <div className="metric-large-value">
            {data.weeklyFrequency.toFixed(1)}<span className="metric-large-unit">× / wk</span>
          </div>
          <span className="widget-stat-sub">avg · last 3 weeks</span>
        </div>
      )

    case 'rest-day-counter':
      return (
        <div className="widget-stat">
          {data.restDays === 0
            ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Trained today</span>
            : <div className="metric-large-value">{data.restDays}<span className="metric-large-unit">days</span></div>
          }
          {data.lastSession && data.restDays > 0 && (
            <span className="widget-stat-sub">last: {relDate(data.lastSession.date)}</span>
          )}
        </div>
      )

    case 'current-streak':
      return (
        <div className="widget-stat">
          <div className="metric-large-value">
            {data.currentStreak}<span className="metric-large-unit">wks</span>
          </div>
          <span className="widget-stat-sub">
            {data.currentStreak === 0 ? 'no streak yet' : 'consecutive'}
          </span>
        </div>
      )

    case 'last-session':
      if (!data.lastSession) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No sessions yet</span>
      return (
        <div className="widget-last-session">
          <span className="widget-ls-name">{data.lastSession.workoutName || 'Session'}</span>
          <span className="widget-ls-meta">
            {relDate(data.lastSession.date)} · {data.lastSession.exerciseCount} exercises
          </span>
          <span className="widget-ls-vol">
            {data.lastSession.totalVolume.toLocaleString()}<span style={{ fontSize: 9, marginLeft: 2, color: 'var(--text-muted)' }}>kg</span>
          </span>
        </div>
      )

    case 'top-exercises':
      if (!data.topExercises.length) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No sessions this week</span>
      return (
        <div className="widget-top-ex">
          {data.topExercises.map(ex => (
            <div key={ex.name} className="widget-top-ex-row">
              <span className="widget-top-ex-name">{ex.name}</span>
              <span className="widget-top-ex-vol">{Math.round(ex.volume).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )

    case 'muscle-volume-breakdown':
      if (!data.muscleVolumeBreakdown.length) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No volume data</span>
      return (
        <div className="widget-muscle-bars">
          {data.muscleVolumeBreakdown.map(({ muscle, fraction }) => (
            <div key={muscle} className="widget-muscle-bar-row">
              <span className="widget-muscle-bar-label">{muscle.split(' ')[0]}</span>
              <div className="widget-muscle-bar-track">
                <div className="widget-muscle-bar-fill" style={{ width: `${Math.round(fraction * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )

    case 'volume-trend':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <Sparkline values={data.volumeTrend} />
          <span className="widget-stat-sub">
            this week: {Math.round(data.volumeTrend[7] ?? 0).toLocaleString()}kg
          </span>
        </div>
      )
  }
}

// ── Widget card slot ──────────────────────────────────────────────────────────

function WidgetSlot({ widget, data, showVolumePercent, loaded }: {
  widget: HomePanelWidget
  data: FatigueResult
  showVolumePercent: boolean
  loaded: boolean
}) {
  const { label, icon } = WIDGET_META[widget]
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-card-title">{label}</span>
        <div className="metric-card-icon">{icon}</div>
      </div>
      <div className="metric-card-body">
        <WidgetBody widget={widget} data={data} showVolumePercent={showVolumePercent} loaded={loaded} />
      </div>
    </div>
  )
}

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

  const [logMap, setLogMap]   = useState<Record<string, DayLog>>({})
  const [colorMap, setColorMap] = useState<Record<string, string>>({})

  const fatigue = useMuscleFatigue()
  const loaded  = fatigue.opacities !== null

  const [showGhost,         setShowGhost]         = useState(true)
  const [showVolumePercent, setShowVolumePercent] = useState(true)
  const [homePanel,         setHomePanel]         = useState<'widgets' | 'calendar-only'>('widgets')
  const [panelSlots,        setPanelSlots]        = useState<[HomePanelWidget, HomePanelWidget, HomePanelWidget]>(DEFAULT_HOME_SLOTS)

  useEffect(() => {
    getSettings().then((s) => {
      setShowGhost(s.showGhostMuscles !== false)
      setShowVolumePercent(s.showVolumePercent !== false)
      setHomePanel(s.homePanel ?? 'widgets')
      setPanelSlots(s.homePanelSlots ?? DEFAULT_HOME_SLOTS)
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
    })
  }, [])

  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [])

  const weeks = buildWeekRows(26, 12)
  const currentWeekIdx = 26
  const calendarOnly = homePanel === 'calendar-only'

  return (
    <div className="home-wrap">

      {/* ── Top section: calendar ───────────────────────────────────── */}
      <div className="home-top" style={calendarOnly ? { height: 'calc(100dvh - var(--nav-height))' } : undefined}>
        {/* Header */}
        <div className="home-header">
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Construct</div>
            {loaded && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {fatigue.weeklyFrequency.toFixed(1)}× / week · last 3 weeks
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

                    const isYearDigit = cell.monthNum === 0 && cell.dayNum >= 1 && cell.dayNum <= 4
                    const yearDigit = isYearDigit ? cell.date.slice(0, 4)[cell.dayNum - 1] : null
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

      {/* ── Bottom section: widgets + body projection ──────────────── */}
      {!calendarOnly && (
        <div className="home-bottom">
          <div className="home-metrics">
            {panelSlots.map((widget, idx) => (
              <WidgetSlot
                key={idx}
                widget={widget}
                data={fatigue}
                showVolumePercent={showVolumePercent}
                loaded={loaded}
              />
            ))}
          </div>
          <div className="home-body">
            <BodyProjection muscleOpacity={fatigue.opacities} showGhost={showGhost} />
          </div>
        </div>
      )}

    </div>
  )
}
