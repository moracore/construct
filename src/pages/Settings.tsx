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
  { name: 'Electric Blue', value: '#0080FF' },
  { name: 'Coral', value: '#FF4444' },
  { name: 'Orange', value: '#FF8800' },
  { name: 'Amber', value: '#FFCC00' },
  { name: 'Emerald', value: '#44BB66' },
  { name: 'Teal', value: '#00BBCC' },
  { name: 'Purple', value: '#AA44FF' },
  { name: 'Pink', value: '#FF44AA' },
]

export default function Settings() {
  const { theme, accentColor, toggleTheme, setAccentColor } = useTheme()
  const [restSeconds, setRestSeconds] = useState(90)
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                title={p.name}
                onClick={() => setAccentColor(p.value)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: p.value,
                  border: accentColor === p.value ? '3px solid var(--text-primary)' : '3px solid transparent',
                  boxShadow: accentColor === p.value ? '0 0 0 2px var(--bg-secondary)' : 'none',
                  cursor: 'pointer', padding: 0, outline: 'none', transition: 'all 150ms ease',
                }}
              />
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', padding: 2, cursor: 'pointer', background: 'none' }}
              />
              Custom
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: accentColor }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{accentColor}</span>
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
