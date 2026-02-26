import { useState } from 'react'
import { Sparkles, Play, CheckCircle, XCircle, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LogEntry {
  type: 'info' | 'success' | 'error'
  message: string
  timestamp: Date
}

export function AdminAIEmbeddings() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<{
    totalCustomers: number
    existingCustomers: number
    newCustomers: number
    totalAnlegg: number
    existingAnlegg: number
    newAnlegg: number
  } | null>(null)

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }])
  }

  const generateEmbeddings = async () => {
    setIsRunning(true)
    setLogs([])
    setStats(null)

    try {
      addLog('info', '🚀 Starter embedding-generering...')

      // Hent statistikk
      addLog('info', '📊 Henter statistikk...')

      const { data: customers } = await supabase
        .from('customer')
        .select('id', { count: 'exact' })

      const { data: anlegg } = await supabase
        .from('anlegg')
        .select('id', { count: 'exact' })

      const { data: customerEmbeddings } = await supabase
        .from('ai_embeddings')
        .select('record_id', { count: 'exact' })
        .eq('table_name', 'customer')

      const { data: anleggEmbeddings } = await supabase
        .from('ai_embeddings')
        .select('record_id', { count: 'exact' })
        .eq('table_name', 'anlegg')

      const totalCustomers = customers?.length || 0
      const existingCustomers = customerEmbeddings?.length || 0
      const newCustomers = totalCustomers - existingCustomers

      const totalAnlegg = anlegg?.length || 0
      const existingAnlegg = anleggEmbeddings?.length || 0
      const newAnlegg = totalAnlegg - existingAnlegg

      setStats({
        totalCustomers,
        existingCustomers,
        newCustomers,
        totalAnlegg,
        existingAnlegg,
        newAnlegg,
      })

      addLog('info', `📊 Kunder: ${totalCustomers} totalt, ${existingCustomers} har embeddings, ${newCustomers} nye`)
      addLog('info', `🏢 Anlegg: ${totalAnlegg} totalt, ${existingAnlegg} har embeddings, ${newAnlegg} nye`)

      if (newCustomers === 0 && newAnlegg === 0) {
        addLog('success', '✅ Alle kunder og anlegg har allerede embeddings!')
        return
      }

      // Kall Edge Function for å generere embeddings
      addLog('info', '🔄 Kaller Edge Function for å generere embeddings...')
      addLog('info', '⚠️ Dette kan ta noen minutter...')

      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { force: false },
      })

      if (error) {
        throw error
      }

      addLog('success', `✅ Ferdig! ${data.customersProcessed} kunder og ${data.anleggProcessed} anlegg prosessert`)
      
      // Refresh statistikk
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error: any) {
      console.error('Embedding generation error:', error)
      addLog('error', `❌ Feil: ${error.message || 'Ukjent feil'}`)
      addLog('info', '💡 Tip: Kjør scriptet manuelt i terminalen: npx tsx scripts/generate-embeddings.ts')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-teal-400" />
            AI Embeddings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Generer embeddings for nye kunder og anlegg
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Hva er embeddings?</p>
            <p>
              Embeddings er matematiske representasjoner av tekst som lar AI-assistenten
              forstå og søke i kunder og anlegg. Når du legger til nye kunder eller anlegg,
              må du generere embeddings for at AI-en skal kunne finne dem.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">👥 Kunder</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Totalt:</span>
                <span className="text-gray-900 dark:text-white font-semibold">{stats.totalCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Har embeddings:</span>
                <span className="text-green-400 font-semibold">{stats.existingCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Nye (mangler):</span>
                <span className={`font-semibold ${stats.newCustomers > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {stats.newCustomers}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏢 Anlegg</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Totalt:</span>
                <span className="text-gray-900 dark:text-white font-semibold">{stats.totalAnlegg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Har embeddings:</span>
                <span className="text-green-400 font-semibold">{stats.existingAnlegg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Nye (mangler):</span>
                <span className={`font-semibold ${stats.newAnlegg > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {stats.newAnlegg}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <button
          onClick={generateEmbeddings}
          disabled={isRunning}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Genererer embeddings...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Generer Embeddings for Nye Kunder/Anlegg
            </>
          )}
        </button>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 Logg</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded ${
                  log.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : log.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-gray-700/50'
                }`}
              >
                {log.type === 'error' ? (
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                ) : log.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{log.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.timestamp.toLocaleTimeString('no-NO')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💻 Manuell Kjøring</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Hvis knappen over ikke fungerer, kan du kjøre scriptet manuelt i terminalen:
        </p>
        <div className="bg-gray-100 dark:bg-gray-900 rounded p-4 font-mono text-sm text-gray-700 dark:text-gray-300">
          <code>npx tsx scripts/generate-embeddings.ts</code>
        </div>
      </div>
    </div>
  )
}
