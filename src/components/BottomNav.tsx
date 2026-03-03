import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useActiveWorkout } from '../context/ActiveWorkoutContext'

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const PlusCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)

const DumbbellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
    <path d="M6 2v20M18 2v20" />
    <path d="M3 7.5h3M3 16.5h3M18 7.5h3M18 16.5h3" />
  </svg>
)

const LibraryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useActiveWorkout()

  const isWorkoutActive = location.pathname.startsWith('/log')

  // Truncate workout name for the nav label
  const workoutLabel = session
    ? (session.workoutName.length > 12 ? session.workoutName.slice(0, 11) + '…' : session.workoutName)
    : 'Start Workout'

  function handleWorkoutPress() {
    if (session) navigate('/log/active')
    else navigate('/log')
  }

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <HomeIcon />
        Home
      </NavLink>

      <button
        className={`nav-item${isWorkoutActive ? ' active' : ''}`}
        onClick={handleWorkoutPress}
        style={{
          background: 'none',
          border: 'none',
          color: session ? '#44BB66' : isWorkoutActive ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        {session ? <DumbbellIcon /> : <PlusCircleIcon />}
        {workoutLabel}
      </button>

      <NavLink to="/library" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <LibraryIcon />
        Library
      </NavLink>
    </nav>
  )
}
