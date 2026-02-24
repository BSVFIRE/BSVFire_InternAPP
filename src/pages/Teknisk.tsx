import { useState, useEffect } from 'react'
import { Settings, Radio, Bell, FileText, ClipboardList, Cpu, FolderOpen } from 'lucide-react'
import { DetektorlisteView } from './teknisk/DetektorlisteView'
import { ServicerapportView } from './teknisk/ServicerapportView'
import { AlarmorganiseringView } from './teknisk/AlarmorganiseringView'
import { AddresseringView } from './teknisk/AddresseringView'
import { ProsjekteringView } from './teknisk/ProsjekteringView'
import { FDVView } from './teknisk/FDVView'
import { useLocation, useNavigate } from 'react-router-dom'

type TekniskView = 'oversikt' | 'detektorliste' | 'alarm' | 'prosjektering' | 'servicerapport' | 'addressering' | 'fdv'

export function Teknisk() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<TekniskView>('oversikt')
  const [serviceRapportState, setServiceRapportState] = useState<any>(null)
  const [returnToAnlegg, setReturnToAnlegg] = useState<string | null>(null)

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
    // Sjekk om vi kommer fra anlegg med tab-parameter
    else if (location.state?.tab) {
      const tabMap: Record<string, TekniskView> = {
        'detektorliste': 'detektorliste',
        'alarmorganisering': 'alarm',
        'prosjektering': 'prosjektering',
        'servicerapport': 'servicerapport',
        'addressering': 'addressering',
        'fdv': 'fdv'
      }
      const view = tabMap[location.state.tab]
      if (view) {
        setActiveView(view)
        // Lagre anlegg-info for bruk i undervisningene
        if (location.state.anleggId) {
          setServiceRapportState({
            anleggId: location.state.anleggId,
            kundeId: location.state.kundeId
          })
          // Lagre anlegg-ID for tilbake-navigasjon
          setReturnToAnlegg(location.state.anleggId)
        }
      }
    }
  }, [location])

  // Funksjon for å håndtere tilbake-navigasjon
  const handleBack = () => {
    if (returnToAnlegg) {
      // Naviger tilbake til anlegget
      navigate('/anlegg', { state: { viewAnleggId: returnToAnlegg } })
    } else {
      setActiveView('oversikt')
    }
  }

  if (activeView === 'detektorliste') {
    return <DetektorlisteView 
      onBack={handleBack} 
      initialAnleggId={serviceRapportState?.anleggId}
      initialKundeId={serviceRapportState?.kundeId}
    />
  }

  if (activeView === 'alarm') {
    return <AlarmorganiseringView 
      onBack={handleBack} 
      initialAnleggId={serviceRapportState?.anleggId}
      initialKundeId={serviceRapportState?.kundeId}
    />
  }

  if (activeView === 'servicerapport') {
    return <ServicerapportView 
      onBack={() => {
        if (returnToAnlegg) {
          navigate('/anlegg', { state: { viewAnleggId: returnToAnlegg } })
        } else {
          setActiveView('oversikt')
        }
        setServiceRapportState(null)
      }} 
      initialAnleggId={serviceRapportState?.anleggId}
      initialOrdreId={serviceRapportState?.ordreId}
    />
  }

  if (activeView === 'addressering') {
    return <AddresseringView onBack={handleBack} />
  }

  if (activeView === 'prosjektering') {
    return <ProsjekteringView 
      onBack={handleBack} 
      initialAnleggId={serviceRapportState?.anleggId}
      initialKundeId={serviceRapportState?.kundeId}
    />
  }

  if (activeView === 'fdv') {
    return <FDVView 
      onBack={handleBack} 
      initialAnleggId={serviceRapportState?.anleggId}
      initialKundeId={serviceRapportState?.kundeId}
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

        <button
          onClick={() => setActiveView('alarm')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alarmorganisering</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Organisering av alarmer</p>
            </div>
          </div>
          <p className="text-primary text-sm font-medium">Klikk for å åpne →</p>
        </button>

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

        <button
          onClick={() => setActiveView('addressering')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Addressering</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">DIP-switch konfigurasjon</p>
            </div>
          </div>
          <p className="text-primary text-sm font-medium">Klikk for å åpne →</p>
        </button>

        <button
          onClick={() => setActiveView('prosjektering')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prosjektering</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Prosjekteringsverktøy</p>
            </div>
          </div>
          <p className="text-primary text-sm font-medium">Klikk for å åpne →</p>
        </button>

        <button
          onClick={() => setActiveView('fdv')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">FDV / Datablader</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Datablader og FDV-dokumentasjon</p>
            </div>
          </div>
          <p className="text-primary text-sm font-medium">Klikk for å åpne →</p>
        </button>
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
