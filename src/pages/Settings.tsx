import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { getSettings, saveSettings, getAllDayLogs, saveDayLog, getAllExercises, saveExercise, getAllWorkouts, saveWorkout } from '../db'
import { parseMarkdownLog } from '../db/parseMarkdown'
import type { DayLog, Exercise, Workout, MuscleGroup, HomePanelWidget, HomeLayout } from '../types'
import { DEFAULT_HOME_SLOTS } from '../types'
import MuscleIgnoreModal from '../components/MuscleIgnoreModal'
import { loadPreset } from '../presets'

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const WIDGET_OPTIONS: { id: HomePanelWidget; label: string }[] = [
  { id: 'muscle-mvps',             label: 'Muscle MVPs' },
  { id: 'week-volume',             label: 'Week Volume' },
  { id: 'week-volume-pct',         label: 'Week Volume + % Change' },
  { id: 'suggested-targets',       label: 'Suggested Targets' },
  { id: 'weekly-frequency',        label: 'Weekly Frequency' },
  { id: 'rest-day-counter',        label: 'Rest Days' },
  { id: 'current-streak',          label: 'Streak' },
  { id: 'last-session',            label: 'Last Session' },
  { id: 'top-exercises',           label: 'Top Exercises (this week)' },
  { id: 'muscle-volume-breakdown', label: 'Muscle Volume Breakdown' },
  { id: 'volume-trend',            label: 'Volume Trend (8 weeks)' },
]

const HOME_LAYOUT_CYCLE: HomeLayout[] = ['body-full', 'body-only', 'calendar-only']
const HOME_LAYOUT_LABELS: Record<HomeLayout, string> = {
  'body-full':     'Calendar + Body',
  'body-only':     'Body Only',
  'calendar-only': 'Calendar Only',
}

const ACCENT_PRESETS = [
  { name: 'Coral',         value: '#FF4444' },
  { name: 'Orange',        value: '#FF8800' },
  { name: 'Amber',         value: '#FFCC00' },
  { name: 'Emerald',       value: '#44BB66' },
  { name: 'Teal',          value: '#00BBCC' },
  { name: 'Electric Blue', value: '#0080FF' },
  { name: 'Purple',        value: '#AA44FF' },
  { name: 'Pink',          value: '#FF44AA' },
]

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const v = ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const sliderToS = (v: number) => 50 + v * 0.5
const sliderToL = (v: number) => 50 + v * 0.3
const sToSlider = (s: number) => Math.round(Math.max(0, Math.min(100, (s - 50) * 2)))
const lToSlider = (l: number) => Math.round(Math.max(0, Math.min(100, (l - 50) / 0.3)))

function slidersFromHex(hex: string): [number, number, number] {
  const [h, s, l] = hexToHsl(hex)
  return [h, sToSlider(s), lToSlider(l)]
}

function SliderRow({ label, value, min, max, gradient, onChange }: {
  label: string; value: number; min: number; max: number
  gradient: string; onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <input
        type="range"
        className="hsl-slider"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: gradient }}
      />
    </div>
  )
}

export default function Settings() {
  const { theme, accentColor, toggleTheme, setAccentColor } = useTheme()
  const [restSeconds, setRestSeconds] = useState(90)
  const [bodyweight, setBodyweight] = useState<number>(70)
  const [showGhost, setShowGhost] = useState(true)
  const [homeLayout, setHomeLayout] = useState<HomeLayout>('body-full')
  const [panelSlots, setPanelSlots] = useState<[HomePanelWidget, HomePanelWidget, HomePanelWidget]>(DEFAULT_HOME_SLOTS)
  const [ignoredMuscles, setIgnoredMuscles] = useState<MuscleGroup[]>([])
  const [showMuscleModal, setShowMuscleModal] = useState(false)

  const [hSlider, setHSlider] = useState(() => slidersFromHex(accentColor)[0])
  const [sSlider, setSSlider] = useState(() => slidersFromHex(accentColor)[1])
  const [lSlider, setLSlider] = useState(() => slidersFromHex(accentColor)[2])

  const previewHex = hslToHex(hSlider, sliderToS(sSlider), sliderToL(lSlider))
  const actualS = Math.round(sliderToS(sSlider))
  const actualL = Math.round(sliderToL(lSlider))

  const applySliders = (h: number, sv: number, lv: number) => {
    setHSlider(h); setSSlider(sv); setLSlider(lv)
    setAccentColor(hslToHex(h, sliderToS(sv), sliderToL(lv)))
  }

  const handlePreset = (hex: string) => {
    const [h, sv, lv] = slidersFromHex(hex)
    setHSlider(h); setSSlider(sv); setLSlider(lv)
    setAccentColor(hex)
  }
  const [presetMode, setPresetMode] = useState<'simple' | 'extensive' | 'custom' | undefined>(undefined)
  const [presetStatus, setPresetStatus] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then((s) => {
      if (s.defaultRestSeconds) setRestSeconds(s.defaultRestSeconds)
      if (s.userBodyweight)     setBodyweight(s.userBodyweight)
      setShowGhost(s.showGhostMuscles !== false)
      const raw = s.homeLayout ?? (s as any).homePanel
      const layout: HomeLayout =
        raw === 'body-full' || raw === 'body-only' || raw === 'calendar-only' ? raw : 'body-full'
      setHomeLayout(layout)
      setPanelSlots(s.homePanelSlots ?? DEFAULT_HOME_SLOTS)
      setIgnoredMuscles(s.ignoredMuscles ?? [])
      setPresetMode(s.presetMode)
    })
  }, [])

  async function handleRestChange(val: number) {
    setRestSeconds(val)
    const s = await getSettings()
    await saveSettings({ ...s, defaultRestSeconds: val })
  }

  async function handleBodyweightChange(val: number) {
    setBodyweight(val)
    const s = await getSettings()
    await saveSettings({ ...s, userBodyweight: val })
  }

  async function handleGhostToggle() {
    const next = !showGhost
    setShowGhost(next)
    const s = await getSettings()
    await saveSettings({ ...s, showGhostMuscles: next })
  }

  async function handleIgnoredMusclesChange(next: MuscleGroup[]) {
    setIgnoredMuscles(next)
    const s = await getSettings()
    await saveSettings({ ...s, ignoredMuscles: next })
  }

  async function handleLayoutCycle() {
    const idx = HOME_LAYOUT_CYCLE.indexOf(homeLayout)
    const next = HOME_LAYOUT_CYCLE[(idx + 1) % HOME_LAYOUT_CYCLE.length]
    setHomeLayout(next)
    const s = await getSettings()
    await saveSettings({ ...s, homeLayout: next })
  }

  async function handleSlotChange(slotIdx: 0 | 1 | 2, widget: HomePanelWidget) {
    const next = [...panelSlots] as [HomePanelWidget, HomePanelWidget, HomePanelWidget]
    next[slotIdx] = widget
    setPanelSlots(next)
    const s = await getSettings()
    await saveSettings({ ...s, homePanelSlots: next })
  }


  async function handlePresetSwitch(mode: 'simple' | 'extensive' | 'custom') {
    setPresetMode(mode)
    const s = await getSettings()
    await saveSettings({ ...s, presetMode: mode })
    if (mode === 'custom') {
      setPresetStatus('Switched to Custom — no exercises added or removed.')
    } else {
      setPresetStatus('Loading exercises…')
      try {
        await loadPreset(mode)
        setPresetStatus(`${mode === 'simple' ? 'Simple' : 'Extensive'} exercises added (existing ones kept).`)
      } catch {
        setPresetStatus('Failed to load exercises.')
      }
    }
    setTimeout(() => setPresetStatus(null), 5000)
  }

  async function handleExport() {
    const [logs, exercises, workouts] = await Promise.all([
      getAllDayLogs(), getAllExercises(), getAllWorkouts(),
    ])
    logs.sort((a, b) => a.date.localeCompare(b.date))
    exercises.sort((a, b) => a.name.localeCompare(b.name))
    workouts.sort((a, b) => a.name.localeCompare(b.name))

    const date = new Date().toISOString().slice(0, 10)
    let md = `# Construct Backup — ${date}\n\n`

    // ── Exercises ──────────────────────────────────────────────────────────
    md += `## Exercises\n\n`
    for (const ex of exercises) {
      md += `### ${ex.name}\n`
      md += `- id: ${ex.id}\n`
      md += `- bodyweight: ${ex.isBodyweight}\n`
      md += `- doubleComponent: ${ex.isDoubleComponent}\n`
      if (ex.isTimed) md += `- timed: true\n`
      if (ex.timedTargetSeconds) md += `- timedTarget: ${ex.timedTargetSeconds}\n`
      if (ex.primaryMuscleGroups.length) md += `- primaryMuscles: ${ex.primaryMuscleGroups.join(', ')}\n`
      if (ex.secondaryMuscleGroups.length) md += `- secondaryMuscles: ${ex.secondaryMuscleGroups.join(', ')}\n`
      if (ex.defaultRestTimerSeconds) md += `- restSeconds: ${ex.defaultRestTimerSeconds}\n`
      md += `\n`
    }

    // ── Workouts ───────────────────────────────────────────────────────────
    md += `## Workouts\n\n`
    for (const wo of workouts) {
      md += `### ${wo.name}\n`
      md += `- id: ${wo.id}\n`
      md += `- color: ${wo.color}\n`
      if (wo.category) md += `- category: ${wo.category}\n`
      if (wo.exerciseIds.length) md += `- exercises: ${wo.exerciseIds.join(', ')}\n`
      md += `\n`
    }

    // ── Logs ───────────────────────────────────────────────────────────────
    md += `## Logs\n\n`
    md += logs.map((l) => l.markdown).join('\n\n---\n\n')

    const filename = `construct-backup-${date}.md`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('Importing…')
    const text = await file.text()

    if (text.startsWith('# Construct Backup')) {
      // ── Full backup format ───────────────────────────────────────────────
      const exSection  = text.match(/^## Exercises\n([\s\S]*?)^## Workouts/m)?.[1] ?? ''
      const woSection  = text.match(/^## Workouts\n([\s\S]*?)^## Logs/m)?.[1] ?? ''
      const logSection = text.match(/^## Logs\n([\s\S]*)$/m)?.[1] ?? ''

      let exCount = 0, woCount = 0, logCount = 0

      // Parse exercises
      for (const block of exSection.trim().split(/^### /m).filter(Boolean)) {
        const lines = block.trim().split('\n')
        const name = lines[0].trim()
        const f: Record<string, string> = {}
        lines.slice(1).forEach((l) => { const m = l.match(/^- (\w+): (.+)$/); if (m) f[m[1]] = m[2].trim() })
        const ex: Exercise = {
          id: f.id || genId('ex'),
          name,
          isBodyweight: f.bodyweight === 'true',
          isDoubleComponent: f.doubleComponent === 'true',
          isTimed: f.timed === 'true' || undefined,
          timedTargetSeconds: f.timedTarget ? parseInt(f.timedTarget) : undefined,
          primaryMuscleGroups: (f.primaryMuscles ?? '').split(', ').filter(Boolean) as MuscleGroup[],
          secondaryMuscleGroups: (f.secondaryMuscles ?? '').split(', ').filter(Boolean) as MuscleGroup[],
          defaultRestTimerSeconds: f.restSeconds ? parseInt(f.restSeconds) : undefined,
          createdAt: Date.now(),
        }
        await saveExercise(ex)
        exCount++
      }

      // Parse workouts
      for (const block of woSection.trim().split(/^### /m).filter(Boolean)) {
        const lines = block.trim().split('\n')
        const name = lines[0].trim()
        const f: Record<string, string> = {}
        lines.slice(1).forEach((l) => { const m = l.match(/^- (\w+): (.+)$/); if (m) f[m[1]] = m[2].trim() })
        const wo: Workout = {
          id: f.id || genId('wo'),
          name,
          color: f.color || 'var(--accent)',
          category: f.category || '',
          exerciseIds: (f.exercises ?? '').split(', ').filter(Boolean),
          createdAt: Date.now(),
        }
        await saveWorkout(wo)
        woCount++
      }

      // Parse logs
      for (const chunk of logSection.trim().split(/\n---\n/).map((c) => c.trim()).filter(Boolean)) {
        const dateMatch = chunk.match(/^#\s+(\d{4}-\d{2}-\d{2})/)
        if (!dateMatch) continue
        const parsed = parseMarkdownLog(chunk)
        const log: DayLog = {
          id: genId('log'),
          date: dateMatch[1],
          workoutName: parsed.workoutName,
          exercises: parsed.exercises,
          markdown: chunk,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await saveDayLog(log)
        logCount++
      }

      setImportStatus(`Imported ${exCount} exercises, ${woCount} workouts, ${logCount} logs ✓`)
    } else {
      // ── Legacy log-only format ───────────────────────────────────────────
      let count = 0
      for (const chunk of text.split(/\n---\n/).map((c) => c.trim()).filter(Boolean)) {
        const dateMatch = chunk.match(/^#\s+(\d{4}-\d{2}-\d{2})/)
        if (!dateMatch) continue
        const parsed = parseMarkdownLog(chunk)
        const log: DayLog = {
          id: genId('log'),
          date: dateMatch[1],
          workoutName: parsed.workoutName,
          exercises: parsed.exercises,
          markdown: chunk,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await saveDayLog(log)
        count++
      }
      setImportStatus(`Imported ${count} log${count !== 1 ? 's' : ''} ✓`)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setImportStatus(null), 5000)
  }

  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ''}`.trim() : `${s}s`

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="page-content">
        {/* Appearance */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-title">Appearance</p>
          <div className="row-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(theme === 'dark' || theme === 'woodland') ? <MoonIcon /> : <SunIcon />}
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  {theme === 'dark' && 'Dark Mode'}
                  {theme === 'light' && 'Light Mode'}
                  {theme === 'woodland' && 'Mora Woodland'}
                  {theme === 'axe' && 'Axe Grey'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toggle app theme</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={toggleTheme}>
              Cycle Theme
            </button>
          </div>
        </div>

        {/* Accent color */}
        <div 
          className="card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 14,
            opacity: theme === 'woodland' ? 0.5 : 1,
            pointerEvents: theme === 'woodland' ? 'none' : 'auto'
          }}
        >
          <p className="section-title">
            Accent Color {theme === 'woodland' && <span style={{ textTransform: 'none', fontWeight: 400 }}>(Locked by theme)</span>}
          </p>
          {/* Preset circles + live color */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                title={p.name}
                onClick={() => handlePreset(p.value)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: p.value,
                  border: accentColor.toLowerCase() === p.value.toLowerCase() ? '3px solid var(--text-primary)' : '3px solid transparent',
                  boxShadow: accentColor.toLowerCase() === p.value.toLowerCase() ? '0 0 0 2px var(--bg-secondary)' : 'none',
                  cursor: 'pointer', padding: 0, outline: 'none', transition: 'all 150ms ease',
                }}
              />
            ))}
            <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 2px' }} />
            <div
              title="Current color"
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: previewHex,
                border: '3px solid var(--text-primary)',
                boxShadow: `0 0 0 2px var(--bg-secondary), 0 0 10px ${previewHex}66`,
                transition: 'background 80ms ease',
              }}
            />
          </div>

          {/* HSL Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SliderRow
              label="Hue" value={hSlider} min={0} max={360}
              gradient="linear-gradient(to right, hsl(0,80%,65%), hsl(30,80%,65%), hsl(60,80%,65%), hsl(90,80%,65%), hsl(120,80%,65%), hsl(150,80%,65%), hsl(180,80%,65%), hsl(210,80%,65%), hsl(240,80%,65%), hsl(270,80%,65%), hsl(300,80%,65%), hsl(330,80%,65%), hsl(360,80%,65%))"
              onChange={v => applySliders(v, sSlider, lSlider)}
            />
            <SliderRow
              label="Saturation" value={sSlider} min={0} max={100}
              gradient={`linear-gradient(to right, hsl(${hSlider},50%,${actualL}%), hsl(${hSlider},100%,${actualL}%))`}
              onChange={v => applySliders(hSlider, v, lSlider)}
            />
            <SliderRow
              label="Lightness" value={lSlider} min={0} max={100}
              gradient={`linear-gradient(to right, hsl(${hSlider},${actualS}%,50%), hsl(${hSlider},${actualS}%,80%))`}
              onChange={v => applySliders(hSlider, sSlider, v)}
            />
          </div>
        </div>

        {/* Default rest timer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-title">Workout</p>
          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Bodyweight</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Used for bodyweight exercise volume (kg)</div>
            </div>
            <input
              type="number"
              min={30}
              max={300}
              value={bodyweight}
              onChange={(e) => handleBodyweightChange(Number(e.target.value))}
              style={{ width: 72, textAlign: 'right', padding: '6px 10px', fontSize: 15, fontWeight: 600 }}
            />
          </div>

          <div>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Default Rest Timer</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Used when no per-exercise override is set</div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', minWidth: 44, textAlign: 'right' }}>
                {fmt(restSeconds)}
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={300}
              step={15}
              value={restSeconds}
              onChange={(e) => handleRestChange(Number(e.target.value))}
              style={{ width: '100%', accentColor }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>15s</span><span>5m</span>
            </div>
          </div>
        </div>

        {/* Home Screen */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-title">Home Screen</p>

          {/* Layout cycle */}
          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Layout</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{HOME_LAYOUT_LABELS[homeLayout]}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLayoutCycle}>
              Cycle
            </button>
          </div>

          {/* Panel slots — only shown when layout has stats */}
          {homeLayout === 'body-full' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="divider" />
              <p className="section-title" style={{ marginBottom: 2 }}>Panel Slots</p>
              {([0, 1, 2] as const).map((idx) => (
                <div key={idx} className="row-between">
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Slot {idx + 1}</div>
                  <select
                    value={panelSlots[idx]}
                    onChange={(e) => handleSlotChange(idx, e.target.value as HomePanelWidget)}
                    style={{ width: 'auto', minWidth: 180, padding: '5px 8px', fontSize: 13, fontWeight: 500 }}
                  >
                    {WIDGET_OPTIONS.map(({ id, label }) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="divider" />

          {/* Ghost inactive muscles */}
          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Ghost Inactive Muscles</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pulse muscles not trained in 2+ weeks</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={showGhost} onChange={handleGhostToggle} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
            </label>
          </div>

          {/* Ignored muscles */}
          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Ignored Muscles</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {ignoredMuscles.length === 0
                  ? 'None — all muscles tracked'
                  : `${ignoredMuscles.length} muscle${ignoredMuscles.length !== 1 ? 's' : ''} ignored`}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMuscleModal(true)}>
              Configure
            </button>
          </div>
        </div>

        {showMuscleModal && (
          <MuscleIgnoreModal
            ignored={ignoredMuscles}
            onClose={() => setShowMuscleModal(false)}
            onChange={handleIgnoredMusclesChange}
          />
        )}

        {/* Exercise Library */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-title">Exercise Library</p>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Current: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              {presetMode === 'simple' ? 'Simple' : presetMode === 'extensive' ? 'Extensive' : presetMode === 'custom' ? 'Custom' : 'Not set'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Switching to Simple or Extensive adds exercises without removing existing ones.
          </div>
          {presetStatus && (
            <div style={{ fontSize: 13, color: 'var(--accent)', padding: '6px 0' }}>
              {presetStatus}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['simple', 'extensive', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                className={presetMode === mode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                style={{ flex: 1, textTransform: 'capitalize' }}
                onClick={() => handlePresetSwitch(mode)}
              >
                {mode === 'simple' ? 'Simple' : mode === 'extensive' ? 'Extensive' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-title">Data</p>

          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Export Backup</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Exercises, workouts & logs as one markdown file</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              Export
            </button>
          </div>

          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Import Backup</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {importStatus ?? 'Restore from a Construct backup'}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,text/markdown"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>
          Construct · Workout App
        </div>
      </div>
    </div>
  )
}
