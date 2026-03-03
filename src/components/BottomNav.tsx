import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useActiveWorkout } from '../context/ActiveWorkoutContext'

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4"/>
    <path d="M16 2v4"/>
    <rect width="18" height="18" x="3" y="4" rx="2"/>
    <path d="M3 10h18"/>
    <path d="m9 16 2 2 4-4"/>
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
    <path d="M12 11.4V9.1"/>
    <path d="m12 17 6.59-6.59"/>
    <path d="m15.05 5.7-.218-.691a3 3 0 0 0-5.663 0L4.418 19.695A1 1 0 0 0 5.37 21h13.253a1 1 0 0 0 .951-1.31L18.45 16.2"/>
    <circle cx="20" cy="9" r="2"/>
  </svg>
)

const LibraryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 6 4 14"/>
    <path d="M12 6v14"/>
    <path d="M8 8v12"/>
    <path d="M4 4v16"/>
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