import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { getSettings, saveSettings, getAllDayLogs, saveDayLog } from '../db'
import { parseMarkdownLog } from '../db/parseMarkdown'
import type { DayLog } from '../types'

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
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then((s) => {
      if (s.defaultRestSeconds) setRestSeconds(s.defaultRestSeconds)
    })
  }, [])

  async function handleRestChange(val: number) {
    setRestSeconds(val)
    const s = await getSettings()
    await saveSettings({ ...s, defaultRestSeconds: val })
  }

  async function handleExport() {
    const logs = await getAllDayLogs()
    logs.sort((a, b) => a.date.localeCompare(b.date))
    const content = logs.map((l) => l.markdown).join('\n\n---\n\n')
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `construct-logs-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('Importing…')
    const text = await file.text()
    const chunks = text.split(/\n---\n/).map((c) => c.trim()).filter(Boolean)
    let count = 0
    for (const chunk of chunks) {
      const dateMatch = chunk.match(/^#\s+(\d{4}-\d{2}-\d{2})/)
      if (!dateMatch) continue
      const date = dateMatch[1]
      const parsed = parseMarkdownLog(chunk)
      const log: DayLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date,
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
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setImportStatus(null), 4000)
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

        {/* Data */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-title">Data</p>

          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Export Logs</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Download all logs as markdown</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              Export
            </button>
          </div>

          <div className="row-between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Import Logs</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {importStatus ?? 'Import from a Construct markdown export'}
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
