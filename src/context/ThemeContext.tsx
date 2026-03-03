import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings, saveSettings } from '../db'
import type { AppSettings } from '../types'

interface ThemeContextValue {
  theme: 'dark' | 'light' | 'woodland' | 'axe'
  accentColor: string
  toggleTheme: () => void
  setAccentColor: (color: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    accentColor: '#0080FF',
  })

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      applyTheme(s)
    })
  }, [])

  function applyTheme(s: AppSettings) {
    document.documentElement.setAttribute('data-theme', s.theme)
    
    let activeAccent = s.accentColor
    if (s.theme === 'woodland') activeAccent = '#56a882' // pine green

    document.documentElement.style.setProperty('--accent', activeAccent)
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(activeAccent))
  }

  function toggleTheme() {
    let nextTheme: AppSettings['theme'] = 'dark'
    if (settings.theme === 'dark') nextTheme = 'light'
    if (settings.theme === 'light') nextTheme = 'woodland'
    if (settings.theme === 'woodland') nextTheme = 'axe'
    if (settings.theme === 'axe') nextTheme = 'dark'

    const next: AppSettings = {
      ...settings,
      theme: nextTheme,
    }
    setSettings(next)
    applyTheme(next)
    saveSettings(next)
  }

  function setAccentColor(color: string) {
    const next: AppSettings = { ...settings, accentColor: color }
    setSettings(next)
    applyTheme(next)
    saveSettings(next)
  }

  return (
    <ThemeContext.Provider value={{ theme: settings.theme, accentColor: settings.accentColor, toggleTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
