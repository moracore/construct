import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllDayLogs, getAllWorkouts, getAllQuickLogs, getSettings } from '../db'
import { WEEKDAY_LABELS, monthName } from '../utils/calendar'
import type { DayLog, HomePanelWidget, HomeLayout, MuscleGroup } from '../types'
import { DEFAULT_HOME_SLOTS, VALID_PANEL_WIDGETS } from '../types'
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
  'week-volume':     { label: 'Week Volume',    icon: <ActivityIcon /> },
  'week-volume-pct': { label: 'Week Volume',    icon: <ActivityIcon /> },
  'suggested-target':{ label: 'Target',         icon: <TargetIcon /> },
  'weekly-frequency':{ label: 'Frequency',      icon: <ClockIcon /> },
  'rest-day-counter':{ label: 'Rest Days',      icon: <ClockIcon /> },
  'current-streak':  { label: 'Streak',         icon: <FlameIcon /> },
  'top-exercise':    { label: 'Top Exercise',   icon: <TrophyIcon /> },
  'top-avg-weight':  { label: 'Heaviest Lift',  icon: <BarChartIcon /> },
  'volume-trend':    { label: '8-Week Trend',   icon: <ActivityIcon /> },
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
  loaded: boolean
  ignoredMuscles: MuscleGroup[]
}

function WidgetBody({ widget, data, loaded, ignoredMuscles }: WidgetBodyProps) {
  if (!loaded) return <span className="metric-large-value">—</span>

  switch (widget) {
    case 'week-volume':
      return data.weekVolume > 0
        ? <div className="metric-large-value">{Math.round(data.weekVolume).toLocaleString()}<span className="metric-large-unit">kg</span></div>
        : <span className="metric-large-value">—</span>

    case 'week-volume-pct':
      return data.weekVolume > 0
        ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div className="metric-large-value">
              {Math.round(data.weekVolume).toLocaleString()}
              <span className="metric-large-unit">kg</span>
            </div>
            <div className={`metric-card-delta ${data.weekVolumeDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
              {data.weekVolumeDelta >= 0 ? '+' : ''}{data.weekVolumeDelta.toFixed(0)}%
            </div>
          </div>
        )
        : <span className="metric-large-value">—</span>

    case 'suggested-target': {
      const target = data.suggestedTargets.find(mg => !ignoredMuscles.includes(mg))
      return target
        ? <span className="metric-pill pill-target" style={{ fontSize: 13, padding: '4px 10px' }}>{target}</span>
        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All muscles trained</span>
    }

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

    case 'top-exercise': {
      const top = data.topExercises[0]
      if (!top) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No sessions this week</span>
      return (
        <div className="widget-top-ex">
          <div className="widget-top-ex-row">
            <span className="widget-top-ex-name">{top.name}</span>
            <span className="widget-top-ex-vol">{Math.round(top.volume).toLocaleString()}<span style={{ fontSize: 9, marginLeft: 2, color: 'var(--text-muted)' }}>kg</span></span>
          </div>
        </div>
      )
    }

    case 'top-avg-weight': {
      const ex = data.topAvgWeightExercise
      if (!ex) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No sessions this week</span>
      return (
        <div className="widget-top-ex">
          <div className="widget-top-ex-row">
            <span className="widget-top-ex-name">{ex.name}</span>
            <span className="widget-top-ex-vol">{ex.volume}<span style={{ fontSize: 9, marginLeft: 2, color: 'var(--text-muted)' }}>kg avg</span></span>
          </div>
        </div>
      )
    }

    case 'volume-trend':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <Sparkline values={data.volumeTrend} />
          <span className="widget-stat-sub">
            this week: {Math.round(data.volumeTrend[7] ?? 0).toLocaleString()}kg
          </span>
        </div>
      )

    default:
      return null
  }
}

// ── Widget card slot ──────────────────────────────────────────────────────────

function WidgetSlot({ widget, data, loaded, ignoredMuscles }: {
  widget: HomePanelWidget
  data: FatigueResult
  loaded: boolean
  ignoredMuscles: MuscleGroup[]
}) {
  const { label, icon } = WIDGET_META[widget]
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-card-title">{label}</span>
        <div className="metric-card-icon">{icon}</div>
      </div>
      <div className="metric-card-body">
        <WidgetBody widget={widget} data={data} loaded={loaded} ignoredMuscles={ignoredMuscles} />
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
  const [quickCountMap, setQuickCountMap] = useState<Record<string, number>>({})

  const fatigue = useMuscleFatigue()
  const loaded  = fatigue.opacities !== null

  const [showGhost,      setShowGhost]      = useState(true)
  const [homeLayout,     setHomeLayout]     = useState<HomeLayout>('body-full')
  const [panelSlots,     setPanelSlots]     = useState<[HomePanelWidget, HomePanelWidget, HomePanelWidget]>(DEFAULT_HOME_SLOTS)
  const [ignoredMuscles, setIgnoredMuscles] = useState<MuscleGroup[]>([])
  const [bodyScale,      setBodyScale]      = useState(1)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)

  function getPinchDist(e: React.TouchEvent) {
    const dx = e.touches[1].clientX - e.touches[0].clientX
    const dy = e.touches[1].clientY - e.touches[0].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function onPinchStart(e: React.TouchEvent) {
    if (e.touches.length === 2)
      pinchRef.current = { startDist: getPinchDist(e), startScale: bodyScale }
  }

  function onPinchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      const ratio = getPinchDist(e) / pinchRef.current.startDist
      setBodyScale(Math.min(1, Math.max(0.5, pinchRef.current.startScale * ratio)))
    }
  }

  function onPinchEnd() { pinchRef.current = null }

  function onBodyWheel(e: React.WheelEvent) {
    setBodyScale(prev => Math.min(1, Math.max(0.5, prev - e.deltaY * 0.0008)))
  }

  useEffect(() => {
    getSettings().then((s) => {
      setShowGhost(s.showGhostMuscles !== false)
      const raw = s.homeLayout ?? (s as any).homePanel
      const layout: HomeLayout =
        raw === 'body-full' || raw === 'body-only' || raw === 'calendar-only' ? raw : 'body-full'
      setHomeLayout(layout)
      const rawSlots = s.homePanelSlots ?? DEFAULT_HOME_SLOTS
      setPanelSlots(rawSlots.map(w => VALID_PANEL_WIDGETS.has(w) ? w : DEFAULT_HOME_SLOTS[0]) as [HomePanelWidget, HomePanelWidget, HomePanelWidget])
      setIgnoredMuscles(s.ignoredMuscles ?? [])
    })
  }, [])

  useEffect(() => {
    Promise.all([getAllDayLogs(), getAllWorkouts(), getAllQuickLogs()]).then(([logs, workouts, quickLogs]) => {
      const lm: Record<string, DayLog> = {}
      logs.forEach((l) => { lm[l.date] = l })
      setLogMap(lm)

      const wm: Record<string, string> = {}
      workouts.forEach((w) => { wm[w.name] = w.color })
      setColorMap(wm)

      const qm: Record<string, number> = {}
      quickLogs.forEach((q) => { qm[q.date] = (qm[q.date] ?? 0) + 1 })
      setQuickCountMap(qm)
    })
  }, [])

  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [])

  const weeks = buildWeekRows(26, 12)
  const currentWeekIdx = 26

  const showCalendar = homeLayout !== 'body-only'
  const showBottom   = homeLayout !== 'calendar-only'
  const slotCount    = homeLayout === 'body-full' ? 3 : 0

  // Header block — always visible so settings are always reachable
  const header = (
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
  )

  return (
    <div className="home-wrap">

      {/* ── Top section: calendar (hidden in body-only, but header always shown) */}
      {showCalendar
        ? (
          <div
            className="home-top"
            style={
            homeLayout === 'calendar-only' ? { height: 'calc(100dvh - var(--nav-height))' }
            : homeLayout === 'body-full'   ? { height: 'calc(100dvh * 6 / 9)' }
            : undefined
          }
          >
            {header}

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

                    const dotCount = Math.min(quickCountMap[cell.date] ?? 0, 3)

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
                          <span>{label}</span>
                          {dotCount > 0 && (
                            <div className="home-day-dots">
                              {Array.from({ length: dotCount }, (_, i) => (
                                <div key={i} className="home-day-dot" />
                              ))}
                            </div>
                          )}
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
        : (
          /* Body-only: header + pinch-scalable body */
          <>
            {header}
            <div
              style={{ flex: 1, minHeight: 0, paddingBottom: 'var(--nav-height)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              onTouchStart={onPinchStart}
              onTouchMove={onPinchMove}
              onTouchEnd={onPinchEnd}
              onTouchCancel={onPinchEnd}
              onWheel={onBodyWheel}
            >
              <div style={{ width: '65vw', maxWidth: '100%', aspectRatio: '86 / 145', transform: `scale(${bodyScale})`, transformOrigin: 'center center', flexShrink: 0 }}>
                <BodyProjection muscleOpacity={fatigue.opacities} showGhost={showGhost} ignoredMuscles={ignoredMuscles} />
              </div>
            </div>
          </>
        )
      }

      {/* ── Bottom section: widgets + body projection ──────────────── */}
      {showBottom && homeLayout !== 'body-only' && (
        <div
          className="home-bottom"
          style={homeLayout === 'body-full' ? { height: 'calc(100dvh * 3 / 9)' } : undefined}
        >
          {slotCount > 0 && (
            <div className="home-metrics">
              {panelSlots.map((widget, idx) => (
                <WidgetSlot
                  key={idx}
                  widget={widget}
                  data={fatigue}
                  loaded={loaded}
                  ignoredMuscles={ignoredMuscles}
                />
              ))}
            </div>
          )}
          <div className="home-body">
            <BodyProjection muscleOpacity={fatigue.opacities} showGhost={showGhost} ignoredMuscles={ignoredMuscles} />
          </div>
        </div>
      )}

    </div>
  )
}
