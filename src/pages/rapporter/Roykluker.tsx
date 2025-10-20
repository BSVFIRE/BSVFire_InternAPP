import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Wind, Building2, Server, Battery, MessageSquare } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SentralerView } from './roykluker/SentralerView'
import { DataView } from './roykluker/DataView'
import { KommentarView } from './roykluker/KommentarView'

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

interface RoyklukerProps {
  onBack: () => void
  fromAnlegg?: boolean
}

export function Roykluker({ onBack, fromAnlegg }: RoyklukerProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [activeView, setActiveView] = useState<'select' | 'sentraler' | 'data' | 'kommentar'>('select')

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

  // Hvis vi er i en av view-modusene
  if (activeView === 'sentraler' && selectedAnlegg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('select')}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Røykluker</h1>
            <p className="text-gray-400">Sentraler og Luker</p>
          </div>
        </div>
        <SentralerView
          anleggId={selectedAnlegg}
          kundeNavn={selectedKundeNavn}
          anleggNavn={selectedAnleggNavn}
        />
      </div>
    )
  }

  if (activeView === 'data' && selectedAnlegg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('select')}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Røykluker</h1>
            <p className="text-gray-400">Sentraldata</p>
          </div>
        </div>
        <DataView
          anleggId={selectedAnlegg}
          kundeNavn={selectedKundeNavn}
          anleggNavn={selectedAnleggNavn}
        />
      </div>
    )
  }

  if (activeView === 'kommentar' && selectedAnlegg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('select')}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Røykluker</h1>
            <p className="text-gray-400">Kommentarer</p>
          </div>
        </div>
        <KommentarView
          anleggId={selectedAnlegg}
          kundeNavn={selectedKundeNavn}
          anleggNavn={selectedAnleggNavn}
        />
      </div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Røykluker</h1>
            <p className="text-gray-400">Kontroll av røykluker</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sentraler og Luker */}
            <button
              onClick={() => setActiveView('sentraler')}
              className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Server className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sentraler og Luker</h3>
              <p className="text-sm text-gray-400">
                Administrer røyklukesentraler og tilhørende luker
              </p>
            </button>

            {/* Sentraldata */}
            <button
              onClick={() => setActiveView('data')}
              className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <Battery className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sentraldata</h3>
              <p className="text-sm text-gray-400">
                Registrer batteriinformasjon og tekniske data per sentral
              </p>
            </button>

            {/* Kommentarer */}
            <button
              onClick={() => setActiveView('kommentar')}
              className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Kommentarer</h3>
              <p className="text-sm text-gray-400">
                Legg til og vis kommentarer om røyklukesystemet
              </p>
            </button>
          </div>
        </>
      )}

      {/* Info Section */}
      <div className="card bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Wind className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Om røykluker</h3>
            <p className="text-gray-400 text-sm mb-3">
              Røykluker-modulen lar deg registrere og administrere kontroller for røykluker.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Velg kunde og anlegg for å starte
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Registrer røykluker og utfør kontroller
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
