import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Shield, Building2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrannslukkereView } from './slukkeutstyr/BrannslukkereView'
import { BrannslangerView } from './slukkeutstyr/BrannslangerView'
import { Combobox } from '@/components/ui/Combobox'

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
}

interface SlukkeutstyrProps {
  onBack: () => void
  fromAnlegg?: boolean
}

type ViewMode = 'select' | 'brannslukkere' | 'brannslanger'

export function Slukkeutstyr({ onBack, fromAnlegg }: SlukkeutstyrProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [viewMode, setViewMode] = useState<ViewMode>('select')

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
    }
  }, [selectedKunde])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, kundenr, adresse, postnummer, poststed')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  const selectedKundeNavn = kunder.find(k => k.id === selectedKunde)?.navn || ''
  const selectedAnleggNavn = anlegg.find(a => a.id === selectedAnlegg)?.anleggsnavn || ''

  // Hvis vi er i brannslukkere eller brannslanger view
  if (viewMode === 'brannslukkere' && selectedAnlegg) {
    return (
      <BrannslukkereView
        anleggId={selectedAnlegg}
        kundeNavn={selectedKundeNavn}
        anleggNavn={selectedAnleggNavn}
        onBack={() => setViewMode('select')}
      />
    )
  }

  if (viewMode === 'brannslanger' && selectedAnlegg) {
    return (
      <BrannslangerView
        anleggId={selectedAnlegg}
        kundeNavn={selectedKundeNavn}
        anleggNavn={selectedAnleggNavn}
        onBack={() => setViewMode('select')}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (fromAnlegg && state?.anleggId) {
                // Naviger tilbake til anleggsvisningen
                navigate('/anlegg', { state: { viewAnleggId: state.anleggId } })
              } else {
                // Naviger til rapporter-oversikten
                onBack()
              }
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Slukkeutstyr</h1>
            <p className="text-gray-600 dark:text-gray-400">Kontroll av slukkeutstyr (kommer snart)</p>
          </div>
        </div>
      </div>

      {/* Kunde og Anlegg Velger */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kunde */}
          <div>
            <Combobox
              label="Velg kunde"
              options={kunder.map(k => ({ id: k.id, label: k.navn }))}
              value={selectedKunde}
              onChange={(val) => {
                setSelectedKunde(val)
                setSelectedAnlegg('')
              }}
              placeholder="Søk og velg kunde..."
              searchPlaceholder="Skriv for å søke..."
              emptyMessage="Ingen kunder funnet"
            />
          </div>

          {/* Anlegg */}
          <div>
            <Combobox
              label="Velg anlegg"
              options={anlegg.map(a => ({ 
                id: a.id, 
                label: a.anleggsnavn,
                sublabel: a.adresse ? `${a.adresse}${a.poststed ? `, ${a.poststed}` : ''}` : undefined
              }))}
              value={selectedAnlegg}
              onChange={(val) => setSelectedAnlegg(val)}
              placeholder="Søk og velg anlegg..."
              searchPlaceholder="Skriv for å søke..."
              emptyMessage="Ingen anlegg funnet"
              disabled={!selectedKunde}
            />
          </div>
        </div>
      </div>

      {/* Valgt anlegg info og modulvalg */}
      {selectedAnlegg && (
        <>
          {/* Valgt anlegg info */}
          <div className="card bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Valgt anlegg</p>
                <p className="text-gray-900 dark:text-white font-medium">{selectedKundeNavn} - {selectedAnleggNavn}</p>
              </div>
            </div>
          </div>

          {/* Modulvalg */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brannslukkere */}
            <button
              onClick={() => setViewMode('brannslukkere')}
              className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Brannslukkere</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Registrer og kontroller brannslukkere
              </p>
            </button>

            {/* Brannslanger */}
            <button
              onClick={() => setViewMode('brannslanger')}
              className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Brannslanger</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Registrer og kontroller brannslanger
              </p>
            </button>
          </div>
        </>
      )}

      {/* Info Section */}
      <div className="card bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Om slukkeutstyr</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Slukkeutstyr-modulen lar deg registrere og administrere kontroller for brannslukkere og brannslanger.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Velg kunde og anlegg for å starte
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Velg mellom brannslukkere eller brannslanger
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
