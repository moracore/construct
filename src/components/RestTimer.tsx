import { useRestTimer } from '../context/RestTimerContext'

export default function RestTimer() {
  const { active, remaining, total, exerciseName, dismiss } = useRestTimer()

  if (!active) return null

  const progress = total > 0 ? remaining / total : 0
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`

  const circumference = 2 * Math.PI * 20 // r=20
  const dash = circumference * progress

  return (
    <div className="rest-timer-bar">
      <div className="rest-timer-inner">
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
            style={{ transition: 'stroke-dasharray 1s linear' }}
          />
          <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)">
            {timeStr}
          </text>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Rest timer</div>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exerciseName}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={dismiss}>
          Skip
        </button>
      </div>
    </div>
  )
}
