import { useState, useEffect } from 'react'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { CURRENT_VERSION } from '@/lib/changelog'

const CHECK_INTERVAL = 5 * 60 * 1000 // Sjekk hvert 5. minutt

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function checkForUpdate() {
      try {
        // Legg til timestamp for å unngå cache
        const response = await fetch(`/version.json?t=${Date.now()}`)
        if (!response.ok) return
        
        const data = await response.json()
        const serverVersion = data.version
        
        // Sammenlign med nåværende versjon i appen
        if (serverVersion && serverVersion !== CURRENT_VERSION) {
          setNewVersion(serverVersion)
          setUpdateAvailable(true)
        }
      } catch (error) {
        // Ignorer feil - kan være offline
        console.debug('Kunne ikke sjekke for oppdateringer:', error)
      }
    }

    // Sjekk ved oppstart
    checkForUpdate()

    // Sjekk periodisk
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  function handleRefresh() {
    // Force refresh uten cache
    window.location.reload()
  }

  function handleDismiss() {
    setDismissed(true)
  }

  if (!updateAvailable || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl shadow-2xl p-4 max-w-sm border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Ny versjon tilgjengelig!</h3>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-white/80 mt-1">
              Versjon {newVersion} er klar med nye funksjoner og forbedringer.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-3 w-full bg-white text-primary font-medium py-2 px-4 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Oppdater nå
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
