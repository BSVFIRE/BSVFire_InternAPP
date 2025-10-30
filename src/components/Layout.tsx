import { ReactNode, useState } from 'react'
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
  Bug,
  Info,
  DollarSign,
  Sparkles,
  Menu,
  X,
  Building
} from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { OfflineInfoDialog } from './OfflineInfoDialog'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Hjem', href: '/', icon: Home },
  { name: 'Kunder', href: '/kunder', icon: Users },
  { name: 'Anlegg', href: '/anlegg', icon: Building2 },
  { name: 'Kontaktpersoner', href: '/kontaktpersoner', icon: Users },
  { name: 'Ordre', href: '/ordre', icon: ClipboardList },
  { name: 'Oppgaver', href: '/oppgaver', icon: CheckSquare },
  { name: 'Prosjekter', href: '/prosjekter', icon: FolderKanban },
  { name: 'Møter', href: '/moter', icon: Calendar },
  { name: 'Rapporter', href: '/rapporter', icon: FileText },
  { name: 'Teknisk', href: '/teknisk', icon: Settings },
  { name: 'Dokumentasjon', href: '/dokumentasjon', icon: BookOpen },
]

const adminNavigation = [
  { name: 'Prisadministrasjon', href: '/admin/prisadministrasjon', icon: DollarSign },
  { name: 'PowerOffice', href: '/admin/poweroffice', icon: Building },
  { name: 'System Logger', href: '/admin/logger', icon: Bug },
  { name: 'AI Embeddings', href: '/admin/ai-embeddings', icon: Sparkles },
  { name: 'AI Kunnskapsbase', href: '/admin/ai-knowledge', icon: BookOpen },
]

// Admin users (kun disse ser admin-menyen)
const ADMIN_EMAILS = ['erik.skille@bsvfire.no']

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { user, signOut } = useAuthStore()
  const [showOfflineInfo, setShowOfflineInfo] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Sjekk om bruker er admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)

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
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white dark:bg-dark-50 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">BSV Fire</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Intern App</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-100'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}

            {/* Admin Section - Kun synlig for administratorer */}
            {isAdmin && (
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
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
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
        <div className="p-8">
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
