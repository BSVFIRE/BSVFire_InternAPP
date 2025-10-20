import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Shield, Building2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrannslukkereView } from './slukkeutstyr/BrannslukkereView'
import { BrannslangerView } from './slukkeutstyr/BrannslangerView'

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
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
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
            <h1 className="text-3xl font-bold text-white mb-2">Slukkeutstyr</h1>
            <p className="text-gray-400">Kontroll av slukkeutstyr (kommer snart)</p>
          </div>
        </div>
      </div>

      {/* Kunde og Anlegg Velger */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kunde */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg kunde <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Søk etter kunde..."
                value={kundeSok}
                onChange={(e) => setKundeSok(e.target.value)}
                className="input"
              />
              <select
                value={selectedKunde}
                onChange={(e) => {
                  setSelectedKunde(e.target.value)
                  setSelectedAnlegg('')
                }}
                className="input"
                size={Math.min(kunder.filter(k => 
                  k.navn.toLowerCase().includes(kundeSok.toLowerCase())
                ).length + 1, 8)}
              >
                <option value="">Velg kunde</option>
                {kunder
                  .filter(k => k.navn.toLowerCase().includes(kundeSok.toLowerCase()))
                  .map((kunde) => (
                    <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Anlegg */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg anlegg <span className="text-red-500">*</span>
            </label>
            {!selectedKunde ? (
              <div className="input bg-dark-100 text-gray-500 cursor-not-allowed">
                Velg kunde først
              </div>
            ) : anlegg.length === 0 ? (
              <div className="input bg-dark-100 text-gray-500">
                Ingen anlegg funnet for denne kunden
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={anleggSok}
                  onChange={(e) => setAnleggSok(e.target.value)}
                  className="input"
                />
                <select
                  value={selectedAnlegg}
                  onChange={(e) => setSelectedAnlegg(e.target.value)}
                  className="input"
                  size={Math.min(anlegg.filter(a => 
                    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
                  ).length + 1, 8)}
                >
                  <option value="">Velg anlegg</option>
                  {anlegg
                    .filter(a => a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase()))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
                    ))}
                </select>
              </div>
            )}
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
                <p className="text-sm text-gray-400">Valgt anlegg</p>
                <p className="text-white font-medium">{selectedKundeNavn} - {selectedAnleggNavn}</p>
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
              <h3 className="text-lg font-semibold text-white mb-2">Brannslukkere</h3>
              <p className="text-sm text-gray-400">
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
              <h3 className="text-lg font-semibold text-white mb-2">Brannslanger</h3>
              <p className="text-sm text-gray-400">
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
            <h3 className="text-lg font-semibold text-white mb-2">Om slukkeutstyr</h3>
            <p className="text-gray-400 text-sm mb-3">
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
