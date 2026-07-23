import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { ENABLE_VINTED } from './config/features'
import MapPage from './pages/Map'
import TrackerPage from './pages/Tracker'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            {ENABLE_VINTED ? (
              <>
                <Route path="/" element={<TrackerPage />} />
                <Route path="/map" element={<MapPage />} />
              </>
            ) : (
              <>
                <Route path="/" element={<MapPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
