import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setupErrorTracking } from './lib/errorTracking'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Kunder } from './pages/Kunder'
import { Anlegg } from './pages/Anlegg'
import { Kontaktpersoner } from './pages/Kontaktpersoner'
import { EksternKontaktpersoner } from './pages/EksternKontaktpersoner'
import { Ordre } from './pages/Ordre'
import { Oppgaver } from './pages/Oppgaver'
import { Rapporter } from './pages/Rapporter'
import { RapportOversikt } from './pages/RapportOversikt'
import { SendRapporter } from './pages/SendRapporter'
import { Teknisk } from './pages/Teknisk'
import { Dokumentasjon } from './pages/Dokumentasjon'
import { LastOpp } from './pages/LastOpp'
import { Nedlastinger } from './pages/Nedlastinger'
import { AdminLogger } from './pages/AdminLogger'
import { Priser } from './pages/Priser'
import { TilbudServiceavtale } from './pages/TilbudServiceavtale'
import { PrisAdministrasjon } from './pages/PrisAdministrasjon'
import { AdminAIEmbeddings } from './pages/AdminAIEmbeddings'
import { AdminAIKnowledge } from './pages/AdminAIKnowledge'
import { Moter } from './pages/Moter'
import { Kontrollplan } from './pages/Kontrollplan'
import { Meldinger } from './pages/Meldinger'
import PowerOfficeTest from './pages/PowerOfficeTest'
import { OfflineIndicator } from './components/OfflineIndicator'
import { AIAssistant } from './components/AIAssistant'

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
    setupErrorTracking()
  }, [initialize])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <ErrorBoundary>
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
                    <Route path="/kontrollplan" element={<Kontrollplan />} />
                    <Route path="/kontaktpersoner" element={<Kontaktpersoner />} />
                    <Route path="/ekstern-kontaktpersoner" element={<EksternKontaktpersoner />} />
                    <Route path="/ordre" element={<Ordre />} />
                    <Route path="/oppgaver" element={<Oppgaver />} />
                    <Route path="/meldinger" element={<Meldinger />} />
                    <Route path="/prosjekter" element={<Prosjekter />} />
                    <Route path="/moter" element={<Moter />} />
                    <Route path="/rapporter" element={<Rapporter />} />
                    <Route path="/rapport-oversikt" element={<RapportOversikt />} />
                    <Route path="/send-rapporter" element={<SendRapporter />} />
                    <Route path="/teknisk" element={<Teknisk />} />
                    <Route path="/dokumentasjon" element={<Dokumentasjon />} />
                    <Route path="/last-opp" element={<LastOpp />} />
                    <Route path="/nedlastinger" element={<Nedlastinger />} />
                    <Route path="/priser" element={<Priser />} />
                    <Route path="/tilbud-serviceavtale" element={<TilbudServiceavtale />} />
                    <Route path="/admin/prisadministrasjon" element={<PrisAdministrasjon />} />
                    <Route path="/admin/poweroffice" element={<PowerOfficeTest />} />
                    <Route path="/admin/logger" element={<AdminLogger />} />
                    <Route path="/admin/ai-embeddings" element={<AdminAIEmbeddings />} />
                    <Route path="/admin/ai-knowledge" element={<AdminAIKnowledge />} />
                    <Route path="/poweroffice-test" element={<PowerOfficeTest />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <OfflineIndicator />
        <AIAssistant />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
