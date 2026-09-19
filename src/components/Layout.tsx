import { useState, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
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
  CalendarCheck,
  TrendingUp,
  QrCode,
  CalendarDays,
  ChevronDown,
  UserCircle
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

interface NavItem { name: string; href: string; icon: LucideIcon; modulKey: string; alwaysShow?: boolean }
interface NavGruppe { id: string; tittel: string | null; items: NavItem[]; adminGruppe?: boolean }

// Menyen er delt i grupper. Gruppen du står i er alltid åpen; ellers huskes åpen/lukket per gruppe.
const NAV_GRUPPER: NavGruppe[] = [
  { id: 'topp', tittel: null, items: [
    { name: 'Dashboard', href: '/', icon: Home, modulKey: 'dashboard', alwaysShow: true },
    { name: 'Kalender', href: '/kalender', icon: CalendarDays, modulKey: 'kalender', alwaysShow: true },
  ] },
  { id: 'kunder', tittel: 'Kunder & anlegg', items: [
    { name: 'Kunder', href: '/kunder', icon: Users, modulKey: 'kunder' },
    { name: 'Anlegg', href: '/anlegg', icon: Building2, modulKey: 'anlegg' },
    { name: 'Kontaktpersoner', href: '/kontaktpersoner', icon: Users, modulKey: 'kontaktpersoner' },
    { name: 'Kontrollplan', href: '/kontrollplan', icon: Calendar, modulKey: 'kontrollplan' },
  ] },
  { id: 'arbeid', tittel: 'Arbeid', items: [
    { name: 'Ordre', href: '/ordre', icon: ClipboardList, modulKey: 'ordre_oppgaver' },
    { name: 'Oppgaver', href: '/oppgaver', icon: CheckSquare, modulKey: 'ordre_oppgaver' },
    { name: 'Meldinger', href: '/meldinger', icon: Inbox, modulKey: 'meldinger' },
    { name: 'Prosjekter', href: '/prosjekter', icon: FolderKanban, modulKey: 'prosjekter' },
    { name: 'Møter', href: '/moter', icon: Calendar, modulKey: 'ordre_oppgaver' },
  ] },
  { id: 'rapporter', tittel: 'Rapporter & kvalitet', items: [
    { name: 'Rapporter', href: '/rapporter', icon: FileText, modulKey: 'rapporter' },
    { name: 'Teknisk', href: '/teknisk', icon: Settings, modulKey: 'teknisk' },
    { name: 'KS/HMS', href: '/ks-hms', icon: ShieldCheck, modulKey: 'ks_hms' },
    { name: 'Dokumentasjon', href: '/dokumentasjon', icon: BookOpen, modulKey: 'dokumentasjon', alwaysShow: true },
  ] },
  { id: 'admin', tittel: 'Administrator', adminGruppe: true, items: [
    { name: 'Modul Oversikt', href: '/admin/modul-oversikt', icon: Shield, modulKey: 'admin_modul_tilgang' },
    { name: 'Salg', href: '/admin/salg', icon: TrendingUp, modulKey: 'admin_salg' },
    { name: 'Årsavslutning', href: '/admin/aarsavslutning', icon: CalendarCheck, modulKey: 'admin_aarsavslutning' },
    { name: 'Prisadministrasjon', href: '/admin/prisadministrasjon', icon: DollarSign, modulKey: 'admin_prisadministrasjon' },
    { name: 'PowerOffice', href: '/admin/poweroffice', icon: Building, modulKey: 'admin_poweroffice' },
    { name: 'Dropbox Mapper', href: '/admin/dropbox-folders', icon: Cloud, modulKey: 'admin_dropbox' },
    { name: 'QR-koder', href: '/admin/qr-koder', icon: QrCode, modulKey: 'admin_qr_koder' },
    { name: 'System Logger', href: '/admin/logger', icon: Bug, modulKey: 'admin_logger' },
    { name: 'AI Embeddings', href: '/admin/ai-embeddings', icon: Sparkles, modulKey: 'admin_ai_embeddings' },
    { name: 'AI Kunnskapsbase', href: '/admin/ai-knowledge', icon: BookOpen, modulKey: 'admin_ai_knowledge' },
  ] },
]

const LUKKET_KEY = 'nav_lukkede_grupper'
function lesLukkede(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LUKKET_KEY) ?? '["admin"]')) } catch { return new Set(['admin']) }
}

// BSV company_id - kun dette firmaet skal se admin-tjenestene
// TODO: Aktiver når company_id er implementert i databasen
// const BSV_COMPANY_ID = 'dd400027-8d88-4108-ae87-a1cf2de10dc3'

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { user, signOut } = useAuthStore()
  const [showOfflineInfo, setShowOfflineInfo] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Modul-tilgang og admin-status (is_admin() i databasen, basert på ansatte.rolle)
  const { harTilgang, isSuperAdmin } = useModulTilgang()
  const [lukkede, setLukkede] = useState<Set<string>>(lesLukkede)

  function toggleGruppe(id: string) {
    setLukkede(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id)
      try { localStorage.setItem(LUKKET_KEY, JSON.stringify(Array.from(n))) } catch { /* ignorer */ }
      return n
    })
  }

  // Synlige grupper: filtrer elementer på modultilgang; admin-gruppen kun for admin / de med minst én admin-modul
  const grupper = NAV_GRUPPER.map(g => ({
    ...g,
    items: g.items.filter(i => i.alwaysShow || harTilgang(i.modulKey, 'se') || (g.adminGruppe && isSuperAdmin)),
  })).filter(g => g.items.length > 0)
  const erAktiv = (href: string) => href === '/' ? location.pathname === '/' || location.pathname === '/dashboard' : location.pathname === href || location.pathname.startsWith(href + '/')

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
          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            {grupper.map(g => {
              const inneholderAktiv = g.items.some(i => erAktiv(i.href))
              const apen = !g.tittel || inneholderAktiv || !lukkede.has(g.id)
              return (
                <div key={g.id} className="mb-1">
                  {g.tittel && (
                    <button
                      type="button"
                      onClick={() => toggleGruppe(g.id)}
                      aria-expanded={apen}
                      className={`w-full flex items-center justify-between px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider ${g.adminGruppe ? 'text-red-500/80' : 'text-gray-400 dark:text-gray-500'} hover:text-gray-700 dark:hover:text-gray-300`}
                    >
                      <span className="flex items-center gap-1.5">{g.adminGruppe && <Shield className="w-3 h-3" />}{g.tittel}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${apen ? '' : '-rotate-90'}`} />
                    </button>
                  )}
                  {apen && (
                    <div className="space-y-0.5">
                      {g.items.map(item => {
                        const aktiv = erAktiv(item.href)
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[38px] ${
                              aktiv
                                ? (g.adminGruppe ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-primary text-white shadow-sm shadow-primary/20')
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-100'
                            }`}
                          >
                            <item.icon className="w-[18px] h-[18px]" />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
                  <Link to="/admin/bedrift" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-200 truncate hover:text-primary" title="Min profil">
                    {user?.email?.split('@')[0]}<UserCircle className="w-3.5 h-3.5 text-gray-400" />
                  </Link>
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
