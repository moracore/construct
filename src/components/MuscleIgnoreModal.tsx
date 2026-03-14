import type { MuscleGroup } from '../types'
import { MUSCLE_GROUPS } from '../types'

interface Props {
  ignored: MuscleGroup[]
  onClose: () => void
  onChange: (next: MuscleGroup[]) => void
}

export default function MuscleIgnoreModal({ ignored, onClose, onChange }: Props) {
  function toggle(mg: MuscleGroup) {
    const next = ignored.includes(mg)
      ? ignored.filter((m) => m !== mg)
      : [...ignored, mg]
    onChange(next)
  }

  return (
    <div className="muscle-modal-backdrop" onClick={onClose}>
      <div className="muscle-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="muscle-modal-handle" />

        <div className="muscle-modal-header">
          <span className="muscle-modal-title">Ignored Muscles</span>
          <button className="muscle-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="muscle-modal-sub">Crossed-out muscles won't pulse in ghost view or appear in suggested targets.</p>

        <div className="muscle-chip-grid">
          {MUSCLE_GROUPS.map((mg) => {
            const isIgnored = ignored.includes(mg)
            return (
              <button
                key={mg}
                className={`muscle-chip${isIgnored ? ' muscle-chip-ignored' : ''}`}
                onClick={() => toggle(mg)}
              >
                {isIgnored && (
                  <svg className="muscle-chip-x" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                <span>{mg}</span>
              </button>
            )
          })}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
