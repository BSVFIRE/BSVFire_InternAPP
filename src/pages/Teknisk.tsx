import { useState, useEffect } from 'react'
import { Settings, Radio, Bell, FileText, ClipboardList } from 'lucide-react'
import { DetektorlisteView } from './teknisk/DetektorlisteView'
import { ServicerapportView } from './teknisk/ServicerapportView'
import { useLocation } from 'react-router-dom'

type TekniskView = 'oversikt' | 'detektorliste' | 'alarm' | 'prosjektering' | 'servicerapport'

export function Teknisk() {
  const location = useLocation()
  const [activeView, setActiveView] = useState<TekniskView>('oversikt')
  const [serviceRapportState, setServiceRapportState] = useState<any>(null)

  useEffect(() => {
    // Sjekk om vi kommer fra ordre med state for servicerapport
    if (location.state?.openServicerapport) {
      setActiveView('servicerapport')
      setServiceRapportState({
        anleggId: location.state.anleggId,
        anleggNavn: location.state.anleggNavn,
        ordreId: location.state.ordreId
      })
    }
  }, [location])

  if (activeView === 'detektorliste') {
    return <DetektorlisteView onBack={() => setActiveView('oversikt')} />
  }

  if (activeView === 'servicerapport') {
    return <ServicerapportView 
      onBack={() => {
        setActiveView('oversikt')
        setServiceRapportState(null)
      }} 
      initialAnleggId={serviceRapportState?.anleggId}
      initialOrdreId={serviceRapportState?.ordreId}
    />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Teknisk</h1>
        <p className="text-gray-400 dark:text-gray-400">Detektorlister, alarmorganisering og prosjektering</p>
      </div>

      {/* Kategorier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => setActiveView('detektorliste')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
              <Radio className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detektorlister</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Oversikt over detektorer</p>
            </div>
          </div>
          <p className="text-primary text-sm font-medium">Klikk for å åpne →</p>
        </button>

        <div className="card hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alarmorganisering</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Organisering av alarmer</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Kommer snart...</p>
        </div>

        <button
          onClick={() => setActiveView('servicerapport')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Servicerapport</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Tekstbaserte rapporter</p>
            </div>
          </div>
          <p className="text-primary text-sm font-medium">Klikk for å åpne →</p>
        </button>

        <div className="card hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prosjektering</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Prosjekteringsverktøy</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Kommer snart...</p>
        </div>
      </div>

      {/* Info box */}
      <div className="card bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-gray-900 dark:text-white font-medium mb-1">Teknisk seksjon under utvikling</h3>
            <p className="text-gray-400 dark:text-gray-400 text-sm">
              Denne seksjonen vil inneholde verktøy for detektorlister, alarmorganisering og prosjektering av brannsikkerhetssystemer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
