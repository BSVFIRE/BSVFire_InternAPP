import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Kunder } from './pages/Kunder'
import { Anlegg } from './pages/Anlegg'
import { Kontaktpersoner } from './pages/Kontaktpersoner'
import { Ordre } from './pages/Ordre'
import { Oppgaver } from './pages/Oppgaver'
import { Rapporter } from './pages/Rapporter'
import { Teknisk } from './pages/Teknisk'
import { Dokumentasjon } from './pages/Dokumentasjon'
import { OfflineIndicator } from './components/OfflineIndicator'

// Placeholder pages

function Prosjekter() {
  return <div className="text-white"><h1 className="text-2xl font-bold">Prosjekter</h1><p className="text-gray-400 mt-2">Under utvikling...</p></div>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const initialize = useAuthStore((state) => state.initialize)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/kunder" element={<Kunder />} />
                  <Route path="/anlegg" element={<Anlegg />} />
                  <Route path="/kontaktpersoner" element={<Kontaktpersoner />} />
                  <Route path="/ordre" element={<Ordre />} />
                  <Route path="/oppgaver" element={<Oppgaver />} />
                  <Route path="/prosjekter" element={<Prosjekter />} />
                  <Route path="/rapporter" element={<Rapporter />} />
                  <Route path="/teknisk" element={<Teknisk />} />
                  <Route path="/dokumentasjon" element={<Dokumentasjon />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <OfflineIndicator />
    </BrowserRouter>
  )
}

export default App
