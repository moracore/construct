import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import RestTimer from './components/RestTimer'
import WelcomeScreen from './components/WelcomeScreen'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Library from './pages/Library'
import Logs from './pages/Logs'
import LogViewer from './pages/LogViewer'
import Settings from './pages/Settings'
import ExerciseCreator from './pages/ExerciseCreator'
import WorkoutCreator from './pages/WorkoutCreator'
import WorkoutSelector from './pages/log/WorkoutSelector'
import ActiveWorkout from './pages/log/ActiveWorkout'
import CompletionSummary from './pages/log/CompletionSummary'
import TimedSetPage from './pages/log/TimedSetPage'
import { useActiveWorkout } from './context/ActiveWorkoutContext'
import { getSettings } from './db'

// Log entry point: redirect to active session if one exists
function LogEntry() {
  const { session } = useActiveWorkout()
  if (session) return <Navigate to="/log/active" replace />
  return <WorkoutSelector />
}

export default function App() {
  // Start as true (assume complete) to avoid flashing the welcome screen on every load
  const [onboarded, setOnboarded] = useState(true)

  useEffect(() => {
    getSettings().then((s) => {
      if (!s.onboardingComplete) setOnboarded(false)
    })
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/log" element={<LogEntry />} />
        <Route path="/log/active" element={<ActiveWorkout />} />
        <Route path="/log/timed-set" element={<TimedSetPage />} />
        <Route path="/log/complete" element={<CompletionSummary />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/logs/:id" element={<LogViewer />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/exercises/new" element={<ExerciseCreator />} />
        <Route path="/workouts/new" element={<WorkoutCreator />} />
        <Route path="/exercises/:id" element={<ExerciseCreator />} />
        <Route path="/workouts/:id" element={<WorkoutCreator />} />
      </Routes>
      <RestTimer />
      <BottomNav />
      {!onboarded && <WelcomeScreen onComplete={() => setOnboarded(true)} />}
    </>
  )
}
