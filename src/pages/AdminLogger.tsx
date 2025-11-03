import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Search, AlertCircle, AlertTriangle, Info, Bug, Filter, Download, Trash2, RefreshCw, TestTube } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface SystemLog {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data: any
  user_id: string | null
  user_email: string | null
  namespace: string | null
  page_url: string | null
  user_agent: string | null
  browser_info: any
  created_at: string
}

type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error'

const levelColors: Record<string, string> = {
  debug: 'bg-gray-900/30 text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  info: 'bg-blue-900/30 text-blue-400 border-blue-800',
  warn: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  error: 'bg-red-900/30 text-red-400 border-red-800',
}

const levelIcons: Record<string, any> = {
  debug: Bug,
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
}

export function AdminLogger() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all')
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null)
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [users, setUsers] = useState<Array<{ email: string; id: string }>>([])

  useEffect(() => {
    loadLogs()
    loadNamespaces()
    loadUsers()
  }, [levelFilter])

  async function loadLogs() {
    try {
      setLoading(true)
      
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)

      // Filter by level
      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Feil ved lasting av logger:', error)
      alert('Kunne ikke laste logger')
    } finally {
      setLoading(false)
    }
  }

  async function loadNamespaces() {
    try {
      const { data } = await supabase
        .from('system_logs')
        .select('namespace')
        .not('namespace', 'is', null)

      if (data) {
        const unique = Array.from(new Set(data.map(d => d.namespace).filter(Boolean)))
        setNamespaces(unique as string[])
      }
    } catch (error) {
      console.error('Feil ved lasting av namespaces:', error)
    }
  }

  async function loadUsers() {
    try {
      const { data } = await supabase
        .from('system_logs')
        .select('user_email, user_id')
        .not('user_email', 'is', null)

      if (data) {
        const uniqueUsers = Array.from(
          new Map(data.map(d => [d.user_email, { email: d.user_email, id: d.user_id }])).values()
        )
        setUsers(uniqueUsers as Array<{ email: string; id: string }>)
      }
    } catch (error) {
      console.error('Feil ved lasting av brukere:', error)
    }
  }

  async function deleteOldLogs() {
    if (!confirm('Er du sikker på at du vil slette gamle logger? Dette kan ikke angres.')) return

    try {
      const { error } = await supabase.rpc('cleanup_old_logs')
      if (error) throw error
      alert('Gamle logger slettet!')
      loadLogs()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette logger')
    }
  }

  function testLogging() {
    logger.error('Test error fra System Logger', { testData: 'Dette er en test' })
    logger.warn('Test warning fra System Logger')
    alert('Test-logger sendt! Oppdater siden om noen sekunder for å se dem.')
  }

  async function exportLogs() {
    try {
      const csv = [
        ['Tidspunkt', 'Nivå', 'Namespace', 'Melding', 'Bruker', 'Side'].join(','),
        ...filteredLogs.map(log => [
          log.timestamp,
          log.level,
          log.namespace || '',
          `"${log.message.replace(/"/g, '""')}"`,
          log.user_email || '',
          log.page_url || ''
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-logs-${new Date().toISOString()}.csv`
      a.click()
    } catch (error) {
      console.error('Feil ved eksport:', error)
      alert('Kunne ikke eksportere logger')
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.namespace?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesNamespace = 
      namespaceFilter === 'all' || log.namespace === namespaceFilter

    const matchesUser = 
      userFilter === 'all' || log.user_email === userFilter

    return matchesSearch && matchesNamespace && matchesUser
  })

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warn').length,
    info: logs.filter(l => l.level === 'info').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Laster logger...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Logger</h1>
          <p className="text-gray-400 dark:text-gray-400">Overvåk feil og hendelser i applikasjonen</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testLogging}
            className="btn-primary flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            Test Logger
          </button>
          <button
            onClick={loadLogs}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
          <button
            onClick={exportLogs}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Eksporter
          </button>
          <button
            onClick={deleteOldLogs}
            className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Rydd opp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Bug className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Totalt logger</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Feil</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.errors}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Advarsler</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.warnings}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Info className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Info</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.info}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk i logger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="md:w-48">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevel)}
              className="input"
            >
              <option value="all">Alle nivåer</option>
              <option value="error">Kun feil</option>
              <option value="warn">Kun advarsler</option>
              <option value="info">Kun info</option>
              <option value="debug">Kun debug</option>
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
              className="input"
            >
              <option value="all">Alle moduler</option>
              {namespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="input"
            >
              <option value="all">Alle brukere</option>
              {users.map(user => (
                <option key={user.id} value={user.email}>{user.email}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Logger
            <span className="ml-2 text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({filteredLogs.length} {filteredLogs.length === 1 ? 'logg' : 'logger'})
            </span>
          </h2>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm || levelFilter !== 'all' || namespaceFilter !== 'all' || userFilter !== 'all'
                ? 'Ingen logger funnet med valgte filtre'
                : 'Ingen logger ennå'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const Icon = levelIcons[log.level]
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${levelColors[log.level]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${levelColors[log.level]} text-xs`}>
                          {log.level.toUpperCase()}
                        </span>
                        {log.namespace && (
                          <span className="badge badge-info text-xs">
                            {log.namespace}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white text-sm mb-1">{log.message}</p>
                      {log.user_email && (
                        <p className="text-xs text-gray-400 dark:text-gray-400">
                          Bruker: {log.user_email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Logg-detaljer</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Nivå</p>
                <span className={`badge ${levelColors[selectedLog.level]}`}>
                  {selectedLog.level.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Tidspunkt</p>
                <p className="text-gray-900 dark:text-white">{formatDate(selectedLog.timestamp)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Melding</p>
                <p className="text-gray-900 dark:text-white">{selectedLog.message}</p>
              </div>

              {selectedLog.namespace && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Modul</p>
                  <p className="text-gray-900 dark:text-white">{selectedLog.namespace}</p>
                </div>
              )}

              {selectedLog.user_email && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Bruker</p>
                  <p className="text-gray-900 dark:text-white">{selectedLog.user_email}</p>
                </div>
              )}

              {selectedLog.page_url && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Side</p>
                  <p className="text-gray-900 dark:text-white text-sm break-all">{selectedLog.page_url}</p>
                </div>
              )}

              {selectedLog.data && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Ekstra data</p>
                  <pre className="bg-dark-200 p-3 rounded text-xs text-gray-500 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.browser_info && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Nettleser-info</p>
                  <pre className="bg-dark-200 p-3 rounded text-xs text-gray-500 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.browser_info, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">User Agent</p>
                  <p className="text-gray-900 dark:text-white text-xs break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
