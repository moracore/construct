import { useState } from 'react'
import { getSettings, saveSettings } from '../db'
import { loadPreset, type PresetMode } from '../presets'

interface WelcomeScreenProps {
  onComplete: () => void
}

type Choice = 'simple' | 'extensive' | 'custom'

const OPTIONS: { id: Choice; title: string; description: string }[] = [
  {
    id: 'simple',
    title: 'Simple',
    description: "Clean exercise names (e.g. 'Pulldowns', 'Rows').",
  },
  {
    id: 'extensive',
    title: 'Extensive',
    description: "Detailed descriptions (e.g. 'Pulldowns (Close-grip Cable)', 'Rows (Barbell)').",
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Start with an empty library and build your own exercise list.',
  },
]

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [selected, setSelected] = useState<Choice | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGetStarted() {
    if (!selected) return
    setLoading(true)
    try {
      if (selected === 'simple' || selected === 'extensive') {
        await loadPreset(selected as PresetMode)
      }
      const s = await getSettings()
      await saveSettings({
        ...s,
        presetMode: selected,
        onboardingComplete: true,
      })
      onComplete()
    } catch (err) {
      console.error('Onboarding failed', err)
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            Welcome to Construct
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>
            Your personal gym tracker — built to get out of your way.
          </p>
        </div>

        {/* Choice heading */}
        <div>
          <p className="section-title" style={{ marginBottom: 12 }}>
            Choose your exercise library
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {OPTIONS.map((opt) => {
              const isActive = selected === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition)',
                    width: '100%',
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                  >
                    {opt.title}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {opt.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Get Started button */}
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={handleGetStarted}
          disabled={!selected || loading}
        >
          {loading ? 'Setting up…' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
