import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTheme } from '../context/ThemeContext'
import type { DayLog, Exercise } from '../types'

function epley(weight: number, reps: number) {
  return weight * (1 + reps / 30)
}

interface PR {
  exerciseName: string
  maxWeight: number | null
  best1RM: number | null
  maxReps: number
  isBodyweight: boolean
  sessions: number
  lastDate: string
}

interface ChartPoint { label: string; value: number }
interface WeekBar { week: string; sets: number }

interface Props {
  logs: DayLog[]
  exercises: Exercise[]
}

export default function Progress({ logs, exercises }: Props) {
  const { accentColor } = useTheme()
  const [selectedName, setSelectedName] = useState('')

  // Build PR map
  const prMap = new Map<string, PR>()
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date))

  sortedLogs.forEach((log) => {
    log.exercises.forEach((ex) => {
      const exDef = exercises.find((e) => e.id === ex.exerciseId || e.name === ex.exerciseName)
      const isBodyweight = exDef?.isBodyweight ?? false

      if (!prMap.has(ex.exerciseName)) {
        prMap.set(ex.exerciseName, {
          exerciseName: ex.exerciseName,
          maxWeight: null, best1RM: null, maxReps: 0,
          isBodyweight, sessions: 0, lastDate: log.date,
        })
      }
      const pr = prMap.get(ex.exerciseName)!
      pr.sessions++
      pr.lastDate = log.date

      ex.sets.forEach((set) => {
        if (set.reps > pr.maxReps) pr.maxReps = set.reps
        if ((set.leftReps ?? 0) > pr.maxReps) pr.maxReps = set.leftReps!
        if ((set.rightReps ?? 0) > pr.maxReps) pr.maxReps = set.rightReps!

        const ws = [set.weight, set.leftWeight, set.rightWeight].filter((w): w is number => w != null)
        ws.forEach((w) => {
          if (w > (pr.maxWeight ?? 0)) pr.maxWeight = w
          const e = epley(w, set.reps)
          if (e > (pr.best1RM ?? 0)) pr.best1RM = e
        })
      })
    })
  })

  const prs = Array.from(prMap.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate))
  const selectedPR = prMap.get(selectedName)

  // Trend chart data for selected exercise
  const chartData: ChartPoint[] = []
  if (selectedName && selectedPR) {
    sortedLogs.forEach((log) => {
      const ex = log.exercises.find((e) => e.exerciseName === selectedName)
      if (!ex) return
      let best = 0
      ex.sets.forEach((set) => {
        if (selectedPR.isBodyweight) {
          if (set.reps > best) best = set.reps
        } else {
          const ws = [set.weight, set.leftWeight, set.rightWeight].filter((w): w is number => w != null)
          ws.forEach((w) => { const e = epley(w, set.reps); if (e > best) best = e })
        }
      })
      if (best > 0) {
        const d = new Date(log.date + 'T00:00:00')
        chartData.push({ label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: parseFloat(best.toFixed(1)) })
      }
    })
  }

  // Weekly volume (last 12 weeks)
  const weekBars: WeekBar[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(now)
    const dayOfWeek = (weekStart.getDay() + 6) % 7 // distance to Monday
    weekStart.setDate(weekStart.getDate() - dayOfWeek - w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const startISO = weekStart.toISOString().slice(0, 10)
    const endISO = weekEnd.toISOString().slice(0, 10)
    const sets = logs
      .filter((l) => l.date >= startISO && l.date < endISO)
      .reduce((n, l) => n + l.exercises.reduce((m, e) => m + e.sets.length, 0), 0)
    weekBars.push({ week: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), sets })
  }

  const ttStyle = {
    contentStyle: { background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 13 },
    labelStyle: { color: '#888', marginBottom: 2 },
    itemStyle: { color: accentColor },
    cursor: { stroke: 'rgba(255,255,255,0.08)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Weekly volume */}
      <div>
        <p className="section-title" style={{ marginBottom: 10 }}>Weekly Volume</p>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '14px 4px 8px', border: '1px solid var(--border-subtle)' }}>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekBars} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip {...ttStyle} formatter={(v: any) => [`${v ?? 0} sets`, '']} />              <Bar dataKey="sets" fill={accentColor} radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exercise trend */}
      <div>
        <p className="section-title" style={{ marginBottom: 10 }}>Exercise Trend</p>
        <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
          <option value="">Select an exercise…</option>
          {prs.map((pr) => <option key={pr.exerciseName} value={pr.exerciseName}>{pr.exerciseName}</option>)}
        </select>

        {selectedName && chartData.length >= 2 && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '14px 4px 8px', border: '1px solid var(--border-subtle)', marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#888', paddingLeft: 16, marginBottom: 6 }}>
              {selectedPR?.isBodyweight ? 'Max Reps' : 'Est. 1RM (kg)'}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip {...ttStyle} formatter={(v: any) => [`${v ?? 0}${selectedPR?.isBodyweight ? ' reps' : 'kg'}`, '']} />                  <Line type="monotone" dataKey="value" stroke={accentColor} strokeWidth={2.5} dot={{ fill: accentColor, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {selectedName && chartData.length < 2 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: 12 }}>
            {chartData.length === 0 ? 'No data for this exercise yet.' : 'Need at least 2 sessions to show a trend.'}
          </p>
        )}
      </div>

      {/* Personal Records */}
      <div>
        <p className="section-title" style={{ marginBottom: 10 }}>Personal Records</p>
        {prs.length === 0 ? (
          <div className="empty-state">
            <h3>No data yet</h3>
            <p>Log some workouts to see your records here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prs.map((pr) => (
              <button
                key={pr.exerciseName}
                onClick={() => setSelectedName(pr.exerciseName === selectedName ? '' : pr.exerciseName)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: selectedName === pr.exerciseName ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: selectedName === pr.exerciseName ? '1px solid rgba(var(--accent-rgb), 0.3)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 150ms ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pr.exerciseName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {pr.sessions} session{pr.sessions !== 1 ? 's' : ''} · last {new Date(pr.lastDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {pr.isBodyweight ? (
                    <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{pr.maxReps} reps</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{pr.maxWeight}kg</div>
                      {pr.best1RM && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>~{Math.round(pr.best1RM)}kg 1RM</div>}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
