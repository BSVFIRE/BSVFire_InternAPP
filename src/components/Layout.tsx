import { useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Users, 
  UserPlus,
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
  CalendarCheck,
  TrendingUp
} from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { useModulTilgang } from '@/hooks/useModulTilgang'
import { OfflineInfoDialog } from './OfflineInfoDialog'
import { WhatsNewDialog } from './WhatsNewDialog'
import { UpdateChecker } from './UpdateChecker'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, modulKey: 'dashboard', alwaysShow: true },
  { name: 'Kunder', href: '/kunder', icon: Users, modulKey: 'kunder' },
  { name: 'Anlegg', href: '/anlegg', icon: Building2, modulKey: 'anlegg' },
  { name: 'Kontrollplan', href: '/kontrollplan', icon: Calendar, modulKey: 'kontrollplan' },
  { name: 'Kontaktpersoner', href: '/kontaktpersoner', icon: Users, modulKey: 'kontaktpersoner' },
  { name: 'Ordre', href: '/ordre', icon: ClipboardList, modulKey: 'ordre_oppgaver' },
  { name: 'Oppgaver', href: '/oppgaver', icon: CheckSquare, modulKey: 'ordre_oppgaver' },
  { name: 'Meldinger', href: '/meldinger', icon: Inbox, modulKey: 'meldinger' },
  { name: 'Prosjekter', href: '/prosjekter', icon: FolderKanban, modulKey: 'prosjekter' },
  { name: 'Møter', href: '/moter', icon: Calendar, modulKey: 'ordre_oppgaver' },
  { name: 'KS/HMS', href: '/ks-hms', icon: ShieldCheck, modulKey: 'ks_hms' },
  { name: 'Rapporter', href: '/rapporter', icon: FileText, modulKey: 'rapporter' },
  { name: 'Teknisk', href: '/teknisk', icon: Settings, modulKey: 'teknisk' },
  { name: 'Dokumentasjon', href: '/dokumentasjon', icon: BookOpen, modulKey: 'dokumentasjon', alwaysShow: true },
  { name: 'Brukere', href: '/admin/bedrift', icon: UserPlus, modulKey: 'admin_brukere', adminOnly: true },
]

const adminNavigation = [
  { name: 'Modul Oversikt', href: '/admin/modul-oversikt', icon: Shield, modulKey: 'admin_modul_tilgang' },
  { name: 'Salg', href: '/admin/salg', icon: TrendingUp, modulKey: 'admin_salg' },
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

// BSV company_id - kun dette firmaet skal se admin-tjenestene
// TODO: Aktiver når company_id er implementert i databasen
// const BSV_COMPANY_ID = 'dd400027-8d88-4108-ae87-a1cf2de10dc3'

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { user, signOut } = useAuthStore()
  const [showOfflineInfo, setShowOfflineInfo] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isBsvAdmin, setIsBsvAdmin] = useState(false)
  
  // Deaktiverte tellere (brukes i UI men hentes ikke fra DB ennå)
  const ulestemeldinger = 0
  const aktiveOrdre = 0
  const aktiveOppgaver = 0
  
  // Bruk modul-tilgang hook
  const { harTilgang } = useModulTilgang()
  
  // Sjekk om bruker er BSV admin
  // TODO: Aktiver company_id sjekk når kolonnen er opprettet i databasen
  useEffect(() => {
    async function checkBsvAdmin() {
      if (!user?.email) {
        setIsBsvAdmin(false)
        return
      }
      
      try {
        // Midlertidig: Sjekk kun rolle, ikke company_id (kolonnen eksisterer ikke ennå)
        const { data, error } = await supabase
          .from('ansatte')
          .select('rolle')
          .eq('epost', user.email.toLowerCase())
          .single()
        
        if (error) {
          // Ignorer feil stille - bruker er kanskje ikke i ansatte-tabellen
          setIsBsvAdmin(false)
          return
        }
        
        // Midlertidig: Alle admins får BSV admin tilgang inntil company_id er implementert
        const isAdmin = data?.rolle === 'admin' || data?.rolle === 'administrator'
        setIsBsvAdmin(isAdmin)
      } catch (err) {
        console.error('[Layout] Exception ved BSV admin sjekk:', err)
        setIsBsvAdmin(false)
      }
    }
    checkBsvAdmin()
  }, [user])
  
  // Sjekk om bruker har tilgang til admin-seksjonen
  const isSuperAdminUser = user?.email && SUPER_ADMIN_EMAILS.includes(user.email)
  const showAdminSection = isSuperAdminUser || isBsvAdmin

  // Meldingssystem deaktivert midlertidig - tabeller mangler
  // useEffect(() => {
  //   async function loadUlestemeldinger() {
  //     if (!user?.email) return
  //     try {
  //       const { data: ansatt } = await supabase
  //         .from('ansatte')
  //         .select('id')
  //         .eq('epost', user.email)
  //         .single()
  //       if (ansatt) {
  //         const { count, error } = await supabase
  //           .from('intern_kommentar')
  //           .select('*', { count: 'exact', head: true })
  //           .eq('mottaker_id', ansatt.id)
  //           .eq('lest', false)
  //         if (error) {
  //           if (error.code === '42703') return
  //           throw error
  //         }
  //         setUlestemeldinger(count || 0)
  //       }
  //     } catch (error) {
  //       console.error('Feil ved henting av uleste meldinger:', error)
  //     }
  //   }
  //   loadUlestemeldinger()
  //   const interval = setInterval(loadUlestemeldinger, 30000)
  //   return () => clearInterval(interval)
  // }, [user])

  // Ordre/oppgaver-telling deaktivert midlertidig - tabeller mangler
  // useEffect(() => {
  //   async function loadUsetteElementer() {
  //     // ... deaktivert
  //   }
  //   loadUsetteElementer()
  //   const interval = setInterval(loadUsetteElementer, 30000)
  //   return () => clearInterval(interval)
  // }, [user])

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
            <div className="w-10 h-10 bg-[#3d4f5f] rounded-xl flex items-center justify-center">
              {/* FireCtrl F-logo */}
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12C8 10 10 8 12 8H28V14H14V18H24V24H14V32H8V12Z" fill="white"/>
                <path d="M12 8C10 8 8 10 8 12L12 8Z" fill="white"/>
                <path d="M28 8L20 16H28V8Z" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                <span className="font-light">FIRE</span><span className="font-bold">CTRL</span>
              </h1>
              <p className="text-xs text-emerald-500 font-medium tracking-wider">BRANNVERNPLATTFORMEN</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation
              .filter(item => {
                // Alltid vis hvis alwaysShow
                if (item.alwaysShow) return true
                // Skjul adminOnly-elementer hvis bruker ikke har admin-tilgang
                if ((item as any).adminOnly && !showAdminSection) return false
                // Vis hvis bruker har tilgang til modulen
                return harTilgang(item.modulKey, 'se')
              })
              .map((item) => {
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

            {/* Admin Section - Kun synlig for BSV admins og super admins */}
            {showAdminSection && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    Administrator
                  </div>
                </div>
                {adminNavigation.map((item) => {
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

      {/* What's New Dialog - vises automatisk ved ny versjon */}
      <WhatsNewDialog />

      {/* Update Checker - viser melding når ny versjon er tilgjengelig */}
      <UpdateChecker />
    </div>
  )
}
