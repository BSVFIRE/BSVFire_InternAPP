import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Users, 
  Building2, 
  ClipboardList, 
  CheckSquare, 
  FileText, 
  FolderKanban,
  Calendar,
  Moon,
  Sun,
  LogOut,
  BookOpen,
  Settings,
  Shield,
  ShieldCheck,
  Bug,
  Info,
  DollarSign,
  Sparkles,
  Menu,
  X,
  Building,
  Inbox,
  Cloud,
  CalendarCheck
} from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { useModulTilgang } from '@/hooks/useModulTilgang'
import { OfflineInfoDialog } from './OfflineInfoDialog'
import { supabase } from '@/lib/supabase'
import { checkDropboxStatus } from '@/services/dropboxServiceV2'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Kunder', href: '/kunder', icon: Users },
  { name: 'Anlegg', href: '/anlegg', icon: Building2 },
  { name: 'Kontrollplan', href: '/kontrollplan', icon: Calendar },
  { name: 'Kontaktpersoner', href: '/kontaktpersoner', icon: Users },
  { name: 'Ordre', href: '/ordre', icon: ClipboardList },
  { name: 'Oppgaver', href: '/oppgaver', icon: CheckSquare },
  { name: 'Meldinger', href: '/meldinger', icon: Inbox },
  { name: 'Prosjekter', href: '/prosjekter', icon: FolderKanban },
  { name: 'Møter', href: '/moter', icon: Calendar },
  { name: 'KS/HMS', href: '/ks-hms', icon: ShieldCheck },
  { name: 'Rapporter', href: '/rapporter', icon: FileText },
  { name: 'Teknisk', href: '/teknisk', icon: Settings },
  { name: 'Dokumentasjon', href: '/dokumentasjon', icon: BookOpen },
]

const adminNavigation = [
  { name: 'Modul Oversikt', href: '/admin/modul-oversikt', icon: Shield, modulKey: 'admin_modul_tilgang' },
  { name: 'Årsavslutning', href: '/admin/aarsavslutning', icon: CalendarCheck, modulKey: 'admin_aarsavslutning' },
  { name: 'Prisadministrasjon', href: '/admin/prisadministrasjon', icon: DollarSign, modulKey: 'admin_prisadministrasjon' },
  { name: 'PowerOffice', href: '/admin/poweroffice', icon: Building, modulKey: 'admin_poweroffice' },
  { name: 'Dropbox Mapper', href: '/admin/dropbox-folders', icon: Cloud, modulKey: 'admin_dropbox' },
  { name: 'System Logger', href: '/admin/logger', icon: Bug, modulKey: 'admin_logger' },
  { name: 'AI Embeddings', href: '/admin/ai-embeddings', icon: Sparkles, modulKey: 'admin_ai_embeddings' },
  { name: 'AI Kunnskapsbase', href: '/admin/ai-knowledge', icon: BookOpen, modulKey: 'admin_ai_knowledge' },
]

// Super admin users (har alltid full tilgang)
const SUPER_ADMIN_EMAILS = ['erik.skille@bsvfire.no']

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { user, signOut } = useAuthStore()
  const [showOfflineInfo, setShowOfflineInfo] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [ulestemeldinger, setUlestemeldinger] = useState(0)
  const [aktiveOrdre, setAktiveOrdre] = useState(0)
  const [aktiveOppgaver, setAktiveOppgaver] = useState(0)
  const [dropboxConnected, setDropboxConnected] = useState<boolean | null>(null)
  
  // Bruk modul-tilgang hook
  const { harTilgang, harAdminTilgang } = useModulTilgang()
  
  // Sjekk om bruker har tilgang til admin-seksjonen
  const isSuperAdminUser = user?.email && SUPER_ADMIN_EMAILS.includes(user.email)
  const showAdminSection = isSuperAdminUser || harAdminTilgang()

  // Sjekk Dropbox-status
  useEffect(() => {
    checkDropboxStatus()
      .then(status => setDropboxConnected(status.connected))
      .catch(() => setDropboxConnected(false))
  }, [])

  // Hent antall uleste meldinger
  useEffect(() => {
    async function loadUlestemeldinger() {
      if (!user?.email) return
      
      try {
        // Finn ansatt basert på email
        const { data: ansatt } = await supabase
          .from('ansatte')
          .select('id')
          .eq('epost', user.email)
          .single()
        
        if (ansatt) {
          // Hent antall uleste meldinger
          const { count, error } = await supabase
            .from('intern_kommentar')
            .select('*', { count: 'exact', head: true })
            .eq('mottaker_id', ansatt.id)
            .eq('lest', false)
          
          if (error) {
            // Hvis kolonner ikke finnes ennå, ignorer feilen
            if (error.code === '42703') {
              console.log('Meldingssystem-kolonner finnes ikke ennå. Kjør database-migrasjon.')
              return
            }
            throw error
          }
          
          setUlestemeldinger(count || 0)
        }
      } catch (error) {
        console.error('Feil ved henting av uleste meldinger:', error)
      }
    }

    loadUlestemeldinger()
    
    // Oppdater hver 30. sekund
    const interval = setInterval(loadUlestemeldinger, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Hent antall usette ordre og oppgaver for brukeren
  useEffect(() => {
    async function loadUsetteElementer() {
      if (!user?.email) return
      
      try {
        // Finn ansatt basert på email
        const { data: ansatt } = await supabase
          .from('ansatte')
          .select('id')
          .eq('epost', user.email)
          .single()
        
        if (ansatt) {
          // Hent antall usette ordre (ikke sett av tekniker, og ikke fullført/fakturert)
          const { count: ordreCount, error: ordreError } = await supabase
            .from('ordre')
            .select('*', { count: 'exact', head: true })
            .eq('tekniker_id', ansatt.id)
            .eq('sett_av_tekniker', false)
            .not('status', 'in', '("Fullført","Fakturert")')
          
          // Hvis kolonnen ikke finnes ennå, fall tilbake til status-basert telling
          if (ordreError?.code === '42703') {
            const { count } = await supabase
              .from('ordre')
              .select('*', { count: 'exact', head: true })
              .eq('tekniker_id', ansatt.id)
              .in('status', ['Ventende', 'Pågående'])
            setAktiveOrdre(count || 0)
          } else {
            setAktiveOrdre(ordreCount || 0)
          }

          // Hent antall usette oppgaver (ikke sett av tekniker, og ikke fullført)
          const { count: oppgaveCount, error: oppgaveError } = await supabase
            .from('oppgaver')
            .select('*', { count: 'exact', head: true })
            .eq('tekniker_id', ansatt.id)
            .eq('sett_av_tekniker', false)
            .neq('status', 'Fullført')
          
          // Hvis kolonnen ikke finnes ennå, fall tilbake til status-basert telling
          if (oppgaveError?.code === '42703') {
            const { count } = await supabase
              .from('oppgaver')
              .select('*', { count: 'exact', head: true })
              .eq('tekniker_id', ansatt.id)
              .in('status', ['Ikke påbegynt', 'Pågående'])
            setAktiveOppgaver(count || 0)
          } else {
            setAktiveOppgaver(oppgaveCount || 0)
          }
        }
      } catch (error) {
        console.error('Feil ved henting av usette elementer:', error)
      }
    }

    loadUsetteElementer()
    
    // Oppdater hver 30. sekund
    const interval = setInterval(loadUsetteElementer, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-3 bg-white dark:bg-dark-50 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white dark:bg-dark-50 border-r border-gray-200 dark:border-gray-800 z-40
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">BSV Fire</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Intern App</p>
            </div>
            {/* Dropbox status indicator */}
            <div 
              className="relative group"
              title={dropboxConnected === null ? 'Sjekker Dropbox...' : dropboxConnected ? 'Dropbox tilkoblet' : 'Dropbox ikke tilkoblet'}
            >
              <Cloud className={`w-5 h-5 ${
                dropboxConnected === null 
                  ? 'text-gray-400 animate-pulse' 
                  : dropboxConnected 
                    ? 'text-green-500' 
                    : 'text-red-500'
              }`} />
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                dropboxConnected === null 
                  ? 'bg-gray-400' 
                  : dropboxConnected 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
              }`} />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const showMeldingBadge = item.href === '/meldinger' && ulestemeldinger > 0
              const showOrdreBadge = item.href === '/ordre' && aktiveOrdre > 0
              const showOppgaveBadge = item.href === '/oppgaver' && aktiveOppgaver > 0
              const badgeCount = item.href === '/meldinger' ? ulestemeldinger 
                : item.href === '/ordre' ? aktiveOrdre 
                : item.href === '/oppgaver' ? aktiveOppgaver : 0
              const showBadge = showMeldingBadge || showOrdreBadge || showOppgaveBadge
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all relative min-h-[44px]
                    ${isActive 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-100'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                  {showBadge && (
                    <span className={`ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-xs font-bold rounded-full ${
                      showMeldingBadge ? 'bg-red-500' : 'bg-primary'
                    }`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}

            {/* Admin Section - Kun synlig for brukere med admin-tilgang */}
            {showAdminSection && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    Administrator
                  </div>
                </div>
                {adminNavigation
                  .filter(item => isSuperAdminUser || harTilgang(item.modulKey, 'se'))
                  .map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px]
                          ${isActive 
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10'
                          }
                        `}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    )
                  })}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                    {user?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowOfflineInfo(true)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Offline-modus info"
                >
                  <Info className="w-4 h-4" />
                </button>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
                  title="Logg ut"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4" />
                  Lys modus
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  Mørk modus
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Offline Info Dialog */}
      <OfflineInfoDialog 
        isOpen={showOfflineInfo} 
        onClose={() => setShowOfflineInfo(false)} 
      />
    </div>
  )
}
