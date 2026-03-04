import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ActiveWorkoutProvider } from './context/ActiveWorkoutContext'
import { RestTimerProvider } from './context/RestTimerContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <ActiveWorkoutProvider>
          <RestTimerProvider>
            <App />
          </RestTimerProvider>
        </ActiveWorkoutProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)