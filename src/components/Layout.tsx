import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Users, 
  Building2, 
  ClipboardList, 
  CheckSquare, 
  FileText, 
  FolderKanban,
  Moon,
  Sun,
  LogOut,
  BookOpen,
  Settings
} from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'

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
  { name: 'Rapporter', href: '/rapporter', icon: FileText },
  { name: 'Teknisk', href: '/teknisk', icon: Settings },
  { name: 'Dokumentasjon', href: '/dokumentasjon', icon: BookOpen },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { user, signOut } = useAuthStore()

  return (
    <div className="min-h-screen bg-dark">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-dark-50 border-r border-gray-800">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BSV Fire</h1>
              <p className="text-xs text-gray-400">Intern App</p>
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
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-100'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {user?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-100 rounded-lg transition-colors"
                title="Logg ut"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-100 rounded-lg transition-colors"
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
      <main className="pl-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
