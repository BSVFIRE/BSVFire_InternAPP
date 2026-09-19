import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setupErrorTracking } from './lib/errorTracking'
import { useScrollToInput } from './hooks/useKeyboardHeight'
import { OfflineIndicator } from './components/OfflineIndicator'
import { AIAssistant } from './components/AIAssistant'
import { Toaster } from 'sonner'

// Eager-loaded (trengs med en gang)
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { DropboxCallback } from './pages/DropboxCallback'
import { ResetPassword } from './pages/ResetPassword'
import { MsCallback } from './pages/MsCallback'

// Lazy-loaded sider (lastes når de trengs)
const Kunder = lazy(() => import('./pages/kunder/KundeListe'))
const KundeDetaljer = lazy(() => import('./pages/kunder/KundeDetaljer'))
const KundeRediger = lazy(() => import('./pages/kunder/KundeRediger'))
const Anlegg = lazy(() => import('./pages/anlegg/AnleggListe'))
const AnleggDetaljer = lazy(() => import('./pages/anlegg/AnleggDetaljer'))
const AnleggRediger = lazy(() => import('./pages/anlegg/AnleggRediger'))
const KobleQrKode = lazy(() => import('./pages/anlegg/KobleQrKode'))
const AdminQrKoder = lazy(() => import('./pages/AdminQrKoder').then(m => ({ default: m.AdminQrKoder })))
const Kontaktpersoner = lazy(() => import('./pages/Kontaktpersoner').then(m => ({ default: m.Kontaktpersoner })))
const EksternKontaktpersoner = lazy(() => import('./pages/EksternKontaktpersoner').then(m => ({ default: m.EksternKontaktpersoner })))
const Ordre = lazy(() => import('./pages/Ordre').then(m => ({ default: m.Ordre })))
const Oppgaver = lazy(() => import('./pages/Oppgaver').then(m => ({ default: m.Oppgaver })))
const Rapporter = lazy(() => import('./pages/Rapporter').then(m => ({ default: m.Rapporter })))
const RapportOversikt = lazy(() => import('./pages/RapportOversikt').then(m => ({ default: m.RapportOversikt })))
const SendRapporter = lazy(() => import('./pages/SendRapporter').then(m => ({ default: m.SendRapporter })))
const Teknisk = lazy(() => import('./pages/Teknisk').then(m => ({ default: m.Teknisk })))
const Dokumentasjon = lazy(() => import('./pages/Dokumentasjon').then(m => ({ default: m.Dokumentasjon })))
const LastOpp = lazy(() => import('./pages/LastOpp').then(m => ({ default: m.LastOpp })))
const Nedlastinger = lazy(() => import('./pages/Nedlastinger').then(m => ({ default: m.Nedlastinger })))
const AdminLogger = lazy(() => import('./pages/AdminLogger').then(m => ({ default: m.AdminLogger })))
const Priser = lazy(() => import('./pages/Priser').then(m => ({ default: m.Priser })))
const TilbudServiceavtale = lazy(() => import('./pages/TilbudServiceavtale').then(m => ({ default: m.TilbudServiceavtale })))
const TilbudAlarmoverforing = lazy(() => import('./pages/TilbudAlarmoverforing').then(m => ({ default: m.TilbudAlarmoverforing })))
const PrisAdministrasjon = lazy(() => import('./pages/PrisAdministrasjon').then(m => ({ default: m.PrisAdministrasjon })))
const AdminAIEmbeddings = lazy(() => import('./pages/AdminAIEmbeddings').then(m => ({ default: m.AdminAIEmbeddings })))
const AdminAIKnowledge = lazy(() => import('./pages/AdminAIKnowledge').then(m => ({ default: m.AdminAIKnowledge })))
const Moter = lazy(() => import('./pages/Moter').then(m => ({ default: m.Moter })))
const Kontrollplan = lazy(() => import('./pages/Kontrollplan').then(m => ({ default: m.Kontrollplan })))
const Meldinger = lazy(() => import('./pages/Meldinger').then(m => ({ default: m.Meldinger })))
const PowerOfficeTest = lazy(() => import('./pages/PowerOfficeTest'))
const AdminDropboxFolders = lazy(() => import('./pages/AdminDropboxFolders').then(m => ({ default: m.AdminDropboxFolders })))
const AdminAarsavslutning = lazy(() => import('./pages/AdminAarsavslutning').then(m => ({ default: m.AdminAarsavslutning })))
const AdminModulOversikt = lazy(() => import('./pages/AdminModulOversikt').then(m => ({ default: m.AdminModulOversikt })))
const AdminSalg = lazy(() => import('./pages/AdminSalg').then(m => ({ default: m.AdminSalg })))
const ProffSok = lazy(() => import('./pages/ProffSok').then(m => ({ default: m.ProffSok })))
const KsHmsDashboard = lazy(() => import('./pages/KsHmsDashboard').then(m => ({ default: m.KsHmsDashboard })))
const KsHmsRisikovurderinger = lazy(() => import('./pages/KsHmsRisikovurderinger').then(m => ({ default: m.KsHmsRisikovurderinger })))
const KsHmsHendelser = lazy(() => import('./pages/KsHmsHendelser').then(m => ({ default: m.KsHmsHendelser })))
const KsHmsAvvik = lazy(() => import('./pages/KsHmsAvvik').then(m => ({ default: m.KsHmsAvvik })))
const KsHmsOpplaering = lazy(() => import('./pages/KsHmsOpplaering').then(m => ({ default: m.KsHmsOpplaering })))
const KsHmsTiltak = lazy(() => import('./pages/KsHmsTiltak').then(m => ({ default: m.KsHmsTiltak })))
const Prosjekter = lazy(() => import('./pages/Prosjekter'))
const Brukerprofil = lazy(() => import('./pages/Brukerprofil').then(m => ({ default: m.Brukerprofil })))

// Loading spinner for lazy-loaded sider
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
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
  
  // Aktiver keyboard-håndtering for mobil
  useScrollToInput()

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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dropbox-callback" element={<DropboxCallback />} />
          <Route path="/ms-callback.html" element={<MsCallback />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/kunder" element={<Kunder />} />
                      <Route path="/kunder/:id" element={<KundeDetaljer />} />
                      <Route path="/kunder/:id/rediger" element={<KundeRediger />} />
                      <Route path="/anlegg" element={<Anlegg />} />
                      <Route path="/anlegg/:id" element={<AnleggDetaljer />} />
                      <Route path="/anlegg/:id/rediger" element={<AnleggRediger />} />
                      <Route path="/qr/:kode" element={<KobleQrKode />} />
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
                      <Route path="/tilbud-alarmoverforing" element={<TilbudAlarmoverforing />} />
                      <Route path="/admin/prisadministrasjon" element={<PrisAdministrasjon />} />
                      <Route path="/admin/poweroffice" element={<PowerOfficeTest />} />
                      <Route path="/admin/logger" element={<AdminLogger />} />
                      <Route path="/admin/ai-embeddings" element={<AdminAIEmbeddings />} />
                      <Route path="/admin/ai-knowledge" element={<AdminAIKnowledge />} />
                      <Route path="/admin/dropbox-folders" element={<AdminDropboxFolders />} />
                      <Route path="/admin/aarsavslutning" element={<AdminAarsavslutning />} />
                      <Route path="/admin/modul-oversikt" element={<AdminModulOversikt />} />
                      <Route path="/admin/salg" element={<AdminSalg />} />
                      <Route path="/admin/qr-koder" element={<AdminQrKoder />} />
                      <Route path="/admin/proff" element={<ProffSok />} />
                      <Route path="/admin/bedrift" element={<Brukerprofil />} />
                      <Route path="/poweroffice-test" element={<PowerOfficeTest />} />
                      <Route path="/ks-hms" element={<KsHmsDashboard />} />
                      <Route path="/ks-hms/risikovurderinger" element={<KsHmsRisikovurderinger />} />
                      <Route path="/ks-hms/hendelser" element={<KsHmsHendelser />} />
                      <Route path="/ks-hms/avvik" element={<KsHmsAvvik />} />
                      <Route path="/ks-hms/opplaering" element={<KsHmsOpplaering />} />
                      <Route path="/ks-hms/tiltak" element={<KsHmsTiltak />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <OfflineIndicator />
        <AIAssistant />
        <Toaster
          theme={theme}
          position="top-right"
          richColors
          closeButton
          toastOptions={{ classNames: { toast: 'font-sans' } }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
