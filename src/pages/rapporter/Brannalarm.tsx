import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Flame, Settings, Network, Check, Cpu, Package, ClipboardCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cacheData } from '@/lib/offline'
import { StyringerView } from './brannalarm/StyringerViewNew.tsx'
import { NettverkView } from './brannalarm/NettverkView.tsx'
import { EnheterView } from './brannalarm/EnheterView.tsx'
import { TilleggsutstyrView } from './brannalarm/TilleggsutstyrView.tsx'
import { NyKontrollView } from './brannalarm/NyKontrollView.tsx'

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

export interface BrannalarmStyring {
  id?: string
  anlegg_id: string
  ovrige_antall?: number
  ovrige_status?: string
  ovrige_note?: string
  ovrige_aktiv?: boolean
  adgang_antall?: number
  adgang_status?: string
  adgang_note?: string
  adgang_aktiv?: boolean
  slukke_antall?: number
  slukke_status?: string
  slukke_note?: string
  slukke_aktiv?: boolean
  klokke_antall?: number
  klokke_status?: string
  klokke_note?: string
  klokke_aktiv?: boolean
  flash_blitz_antall?: number
  flash_blitz_status?: string
  flash_blitz_note?: string
  flash_blitz_aktiv?: boolean
  port_antall?: number
  port_status?: string
  port_note?: string
  port_aktiv?: boolean
  spjaeld_antall?: number
  spjaeld_status?: string
  spjaeld_note?: string
  spjaeld_aktiv?: boolean
  overvaking_antall?: number
  overvaking_status?: string
  overvaking_note?: string
  overvaking_aktiv?: boolean
  musikk_antall?: number
  musikk_status?: string
  musikk_note?: string
  musikk_aktiv?: boolean
  gardin_antall?: number
  gardin_status?: string
  gardin_note?: string
  gardin_aktiv?: boolean
  dorstyring_antall?: number
  dorstyring_status?: string
  dorstyring_note?: string
  dorstyring_aktiv?: boolean
  royklukker_antall?: number
  royklukker_status?: string
  royklukker_note?: string
  royklukker_aktiv?: boolean
  vent_antall?: number
  vent_status?: string
  vent_note?: string
  vent_aktiv?: boolean
  sd_antall?: number
  sd_status?: string
  sd_note?: string
  sd_aktiv?: boolean
  heis_antall?: number
  heis_status?: string
  heis_note?: string
  heis_aktiv?: boolean
  safe_antall?: number
  safe_status?: string
  safe_note?: string
  safe_aktiv?: boolean
}

export interface NettverkEnhet {
  id: string
  anlegg_id: string
  nettverk_id: string | number
  plassering: string
  type: string
  sw_id?: string
  spenning?: number
  ah?: number
  batterialder?: number
  created_at?: string
}

interface BrannalarmProps {
  onBack: () => void
}

type ViewMode = 'list' | 'styringer' | 'nettverk' | 'enheter' | 'tilleggsutstyr' | 'ny-kontroll'

export function Brannalarm({ onBack }: BrannalarmProps) {
  const location = useLocation()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  
  const [styringer, setStyringer] = useState<BrannalarmStyring | null>(null)
  const [nettverkListe, setNettverkListe] = useState<NettverkEnhet[]>([])
  const [leverandor, setLeverandor] = useState<string>('')
  const [sentraltype, setSentraltype] = useState<string>('')

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

  useEffect(() => {
    if (selectedAnlegg) {
      loadStyringer(selectedAnlegg)
      loadNettverk(selectedAnlegg)
      loadBrannalarmdata(selectedAnlegg)
    } else {
      setStyringer(null)
      setNettverkListe([])
      setLeverandor('')
      setSentraltype('')
    }
  }, [selectedAnlegg])

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

  async function loadStyringer(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('anleggsdata_brannalarm')
        .select('*')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      setStyringer(data || null)
    } catch (error) {
      console.error('Feil ved lasting av styringer:', error)
    }
  }

  async function loadNettverk(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('nettverk_brannalarm')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('nettverk_id')

      if (error) throw error
      setNettverkListe(data || [])
      cacheData(`brannalarm_nettverk_${anleggId}`, data || [])
    } catch (error) {
      console.error('Feil ved lasting av nettverk:', error)
    }
  }

  async function loadBrannalarmdata(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('anleggsdata_brannalarm')
        .select('leverandor, sentraltype')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setLeverandor(data.leverandor || '')
        setSentraltype(data.sentraltype || '')
      }
    } catch (error) {
      console.error('Feil ved lasting av brannalarmdata:', error)
    }
  }

  const filteredKunder = kunder.filter(k => 
    k.navn.toLowerCase().includes(kundeSok.toLowerCase())
  )

  const filteredAnlegg = anlegg.filter(a => 
    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
  )

  const selectedKundeData = kunder.find(k => k.id === selectedKunde)
  const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)

  if (viewMode === 'styringer' && selectedAnlegg) {
    return (
      <StyringerView
        anleggId={selectedAnlegg}
        anleggsNavn={selectedAnleggData?.anleggsnavn || ''}
        styringer={styringer}
        onBack={() => setViewMode('list')}
        onSave={loadStyringer}
      />
    )
  }

  if (viewMode === 'nettverk' && selectedAnlegg) {
    return (
      <NettverkView
        anleggId={selectedAnlegg}
        anleggsNavn={selectedAnleggData?.anleggsnavn || ''}
        nettverkListe={nettverkListe}
        onBack={() => setViewMode('list')}
        onRefresh={() => loadNettverk(selectedAnlegg)}
      />
    )
  }

  if (viewMode === 'enheter' && selectedAnlegg) {
    return (
      <EnheterView
        anleggId={selectedAnlegg}
        anleggsNavn={selectedAnleggData?.anleggsnavn || ''}
        enheter={styringer}
        onBack={() => setViewMode('list')}
        onSave={loadStyringer}
      />
    )
  }

  if (viewMode === 'tilleggsutstyr' && selectedAnlegg) {
    return (
      <TilleggsutstyrView
        anleggId={selectedAnlegg}
        anleggsNavn={selectedAnleggData?.anleggsnavn || ''}
        onBack={() => setViewMode('list')}
      />
    )
  }

  if (viewMode === 'ny-kontroll' && selectedAnlegg) {
    return (
      <NyKontrollView
        anleggId={selectedAnlegg}
        anleggsNavn={selectedAnleggData?.anleggsnavn || ''}
        kundeNavn={selectedKundeData?.navn || ''}
        onBack={() => setViewMode('list')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Flame className="w-8 h-8 text-red-500" />
              Brannalarm
            </h1>
            <p className="text-gray-400 mt-1">Kontroll og registrering av brannalarmsystemer</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <label className="block text-sm font-medium text-gray-300 mb-2">Velg kunde</label>
          <input
            type="text"
            placeholder="Søk kunde..."
            value={kundeSok}
            onChange={(e) => setKundeSok(e.target.value)}
            className="input mb-2"
          />
          <select value={selectedKunde} onChange={(e) => setSelectedKunde(e.target.value)} className="input">
            <option value="">-- Velg kunde --</option>
            {filteredKunder.map((kunde) => (
              <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
            ))}
          </select>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-300 mb-2">Velg anlegg</label>
          <input
            type="text"
            placeholder="Søk anlegg..."
            value={anleggSok}
            onChange={(e) => setAnleggSok(e.target.value)}
            className="input mb-2"
            disabled={!selectedKunde}
          />
          <select value={selectedAnlegg} onChange={(e) => setSelectedAnlegg(e.target.value)} className="input" disabled={!selectedKunde}>
            <option value="">-- Velg anlegg --</option>
            {filteredAnlegg.map((anlegg) => (
              <option key={anlegg.id} value={anlegg.id}>{anlegg.anleggsnavn}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedAnleggData && (
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Flame className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">{selectedAnleggData.anleggsnavn}</h3>
              {selectedAnleggData.adresse && (
                <p className="text-sm text-gray-400">
                  {selectedAnleggData.adresse}
                  {selectedAnleggData.postnummer && selectedAnleggData.poststed && 
                    `, ${selectedAnleggData.postnummer} ${selectedAnleggData.poststed}`}
                </p>
              )}
              <p className="text-sm text-gray-400 mt-1">Kunde: {selectedKundeData?.navn}</p>
              {(leverandor || sentraltype) && (
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  {leverandor && <span>Leverandør: {leverandor}</span>}
                  {sentraltype && <span>Sentraltype: {sentraltype}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAnlegg && (
        <>
          <button 
            onClick={() => setViewMode('ny-kontroll')} 
            className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all bg-gradient-to-br from-primary/10 to-transparent border-primary/30"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">Start ny kontroll</h3>
                <p className="text-sm text-gray-400">Velg mellom FG790 eller NS3960 kontroll</p>
              </div>
            </div>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button onClick={() => setViewMode('enheter')} className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Enheter</h3>
                  <p className="text-sm text-gray-400 mb-3">Registrer detektorer og komponenter</p>
                  {styringer && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <Check className="w-4 h-4" />
                      <span>Data registrert</span>
                    </div>
                  )}
                </div>
              </div>
            </button>

          <button onClick={() => setViewMode('styringer')} className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Settings className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Styringer</h3>
                <p className="text-sm text-gray-400 mb-3">Registrer og kontroller brannalarmstyringer</p>
                {styringer && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Data registrert</span>
                  </div>
                )}
              </div>
            </div>
          </button>

          <button onClick={() => setViewMode('nettverk')} className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Network className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Nettverk</h3>
                <p className="text-sm text-gray-400 mb-3">Administrer brannalarmnettverk og systemer</p>
                {nettverkListe.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <Network className="w-4 h-4" />
                    <span>{nettverkListe.length} systemer</span>
                  </div>
                )}
              </div>
            </div>
          </button>

          <button onClick={() => setViewMode('tilleggsutstyr')} className="card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Tilleggsutstyr</h3>
                <p className="text-sm text-gray-400 mb-3">Talevarsling, alarmsender og nøkkelsafe</p>
              </div>
            </div>
          </button>
          </div>
        </>
      )}

      {!selectedAnlegg && (
        <div className="card text-center py-12">
          <Flame className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Velg kunde og anlegg for å starte</h3>
          <p className="text-gray-400">Velg en kunde og et anlegg fra dropdownene over for å se brannalarmdata</p>
        </div>
      )}
    </div>
  )
}
