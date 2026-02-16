import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FileText, Lightbulb, Flame, Shield, Wind, HeartPulse } from 'lucide-react'
import { Nodlys } from './rapporter/Nodlys'
import { Brannalarm } from './rapporter/Brannalarm'
import { Slukkeutstyr } from './rapporter/Slukkeutstyr'
import { Roykluker } from './rapporter/Roykluker'
import { Forstehjelp } from './rapporter/Forstehjelp'

type RapportType = 'oversikt' | 'nodlys' | 'brannalarm' | 'slukkeutstyr' | 'roykluker' | 'forstehjelp'

const rapportTyper = [
  { id: 'nodlys', navn: 'Nødlys', icon: Lightbulb, color: 'yellow', beskrivelse: 'Kontroll og registrering av nødlysarmaturer' },
  { id: 'brannalarm', navn: 'Brannalarm', icon: Flame, color: 'red', beskrivelse: 'Kontroll av brannalarmsystemer' },
  { id: 'slukkeutstyr', navn: 'Slukkeutstyr', icon: Shield, color: 'blue', beskrivelse: 'Kontroll av brannslukkere og brannslanger' },
  { id: 'roykluker', navn: 'Røykluker', icon: Wind, color: 'gray', beskrivelse: 'Kontroll av røykluker' },
  { id: 'forstehjelp', navn: 'Førstehjelp', icon: HeartPulse, color: 'green', beskrivelse: 'Kontroll av førstehjelpstasjoner' },
]

export function Rapporter() {
  const location = useLocation()
  const state = location.state as { rapportType?: string; kundeId?: string; anleggId?: string } | null
  const [activeRapport, setActiveRapport] = useState<RapportType>('oversikt')

  // Hvis vi kommer fra anlegg med forhåndsvalgt rapporttype
  useEffect(() => {
    if (state?.rapportType) {
      setActiveRapport(state.rapportType as RapportType)
    }
  }, [state])

  // Sjekk om vi kommer fra anlegg (har både kundeId og anleggId)
  const fromAnlegg = !!(state?.kundeId && state?.anleggId)

  if (activeRapport === 'nodlys') {
    return <Nodlys onBack={() => setActiveRapport('oversikt')} fromAnlegg={fromAnlegg} />
  }

  if (activeRapport === 'brannalarm') {
    return <Brannalarm onBack={() => setActiveRapport('oversikt')} fromAnlegg={fromAnlegg} />
  }

  if (activeRapport === 'slukkeutstyr') {
    return <Slukkeutstyr onBack={() => setActiveRapport('oversikt')} fromAnlegg={fromAnlegg} />
  }

  if (activeRapport === 'roykluker') {
    return <Roykluker onBack={() => setActiveRapport('oversikt')} fromAnlegg={fromAnlegg} />
  }

  if (activeRapport === 'forstehjelp') {
    return <Forstehjelp onBack={() => setActiveRapport('oversikt')} fromAnlegg={fromAnlegg} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Rapporter</h1>
        <p className="text-gray-400 dark:text-gray-400">Velg rapporttype for å starte</p>
      </div>

      {/* Rapport Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {rapportTyper.map((rapport) => {
          const Icon = rapport.icon
          const isAvailable = rapport.id === 'nodlys' || rapport.id === 'brannalarm' || rapport.id === 'slukkeutstyr' || rapport.id === 'roykluker' || rapport.id === 'forstehjelp'
          
          return (
            <button
              key={rapport.id}
              onClick={() => isAvailable && setActiveRapport(rapport.id as RapportType)}
              disabled={!isAvailable}
              className={`
                card text-left transition-all
                ${isAvailable 
                  ? 'hover:border-primary hover:shadow-lg hover:shadow-primary/20 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center mb-4
                ${rapport.color === 'yellow' && 'bg-yellow-500/10'}
                ${rapport.color === 'red' && 'bg-red-500/10'}
                ${rapport.color === 'blue' && 'bg-blue-500/10'}
                ${rapport.color === 'gray' && 'bg-gray-500/10'}
                ${rapport.color === 'green' && 'bg-green-500/10'}
              `}>
                <Icon className={`
                  w-6 h-6
                  ${rapport.color === 'yellow' && 'text-yellow-500'}
                  ${rapport.color === 'red' && 'text-red-500'}
                  ${rapport.color === 'blue' && 'text-blue-500'}
                  ${rapport.color === 'gray' && 'text-gray-400 dark:text-gray-500'}
                  ${rapport.color === 'green' && 'text-green-500'}
                `} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{rapport.navn}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">{rapport.beskrivelse}</p>
              {!isAvailable && (
                <span className="inline-block mt-3 text-xs text-gray-400 dark:text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  Kommer snart
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Info Section */}
      <div className="card bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Om rapporter</h3>
            <p className="text-gray-400 dark:text-gray-400 text-sm mb-3">
              Rapportmodulen lar deg registrere og administrere kontroller for ulike typer brannsikkerhetsutstyr.
            </p>
            <ul className="space-y-2 text-sm text-gray-400 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Velg kunde og anlegg for å starte
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Registrer utstyr og utfør kontroller
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Eksporter rapporter til PDF
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
