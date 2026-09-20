import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Flame, Network, Cpu, Package, ClipboardCheck, Play, Plus, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { useLocation, useNavigate } from 'react-router-dom'
import { cacheData } from '@/lib/offline'
import { NettverkView } from './brannalarm/NettverkView.tsx'
import { EnheterView } from './brannalarm/EnheterView.tsx'
import { TilleggsutstyrView } from './brannalarm/TilleggsutstyrView.tsx'
import { NyKontrollView } from './brannalarm/NyKontrollView.tsx'
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
  fromAnlegg?: boolean
}

type ViewMode = 'list' | 'nettverk' | 'enheter' | 'tilleggsutstyr' | 'ny-kontroll'

export function Brannalarm({ onBack, fromAnlegg }: BrannalarmProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
  const [styringer, setStyringer] = useState<BrannalarmStyring | null>(null)
  const [nettverkListe, setNettverkListe] = useState<NettverkEnhet[]>([])
  const [leverandor, setLeverandor] = useState<string>('')
  const [sentraltype, setSentraltype] = useState<string>('')
  const [kontroller, setKontroller] = useState<{ id: string; dato: string | null; kontroll_status: string | null; rapport_type: string | null; har_feil: boolean | null }[]>([])
  const [visVelger, setVisVelger] = useState(!state?.anleggId)
  const [kontrollStart, setKontrollStart] = useState<{ startKontroll?: { id: string; type: 'FG790' | 'NS3960' }; startNy?: boolean }>({})

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
      loadKontroller(selectedAnlegg)
    } else {
      setKontroller([])
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

  async function loadKontroller(anleggId: string) {
    const { data } = await supabase.from('anleggsdata_kontroll').select('id, dato, kontroll_status, rapport_type, har_feil').eq('anlegg_id', anleggId).order('dato', { ascending: false }).limit(5)
    setKontroller(data ?? [])
  }

  const selectedKundeData = kunder.find(k => k.id === selectedKunde)
  const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)

  if (viewMode === 'nettverk' && selectedAnlegg) {
    // Hent sentralenheter fra styringer-data for å vise i NettverkView
    // Parse type/modell JSON arrays
    const parseTyper = (typeStr: string | undefined): { type: string; antall: number }[] => {
      if (!typeStr) return []
      try {
        if (typeStr.startsWith('[')) {
          return JSON.parse(typeStr)
        }
        return typeStr ? [{ type: typeStr, antall: 1 }] : []
      } catch {
        return typeStr ? [{ type: typeStr, antall: 1 }] : []
      }
    }
    
    // Hvis det finnes enheter men ingen type, legg til generisk type
    const getTyperWithFallback = (typeStr: string | undefined, antall: number, fallbackName: string): { type: string; antall: number }[] => {
      const typer = parseTyper(typeStr)
      if (typer.length === 0 && antall > 0) {
        return [{ type: `${fallbackName} (ukjent type)`, antall }]
      }
      return typer
    }
    
    const enheterData = styringer ? {
      brannsentral: (styringer as any).brannsentral_antall || 0,
      brannsentral_typer: getTyperWithFallback((styringer as any).brannsentral_type, (styringer as any).brannsentral_antall || 0, 'Brannsentral'),
      panel: (styringer as any).panel_antall || 0,
      panel_typer: getTyperWithFallback((styringer as any).panel_type, (styringer as any).panel_antall || 0, 'Brannpanel'),
      asp: (styringer as any).asp_antall || 0,
      asp_typer: getTyperWithFallback((styringer as any).asp_type, (styringer as any).asp_antall || 0, 'Aspirasjon'),
      kraftforsyning: (styringer as any).kraftforsyning_antall || 0,
      kraftforsyning_typer: getTyperWithFallback((styringer as any).kraftforsyning_type, (styringer as any).kraftforsyning_antall || 0, 'Kraftforsyning'),
    } : undefined
    
    return (
      <NettverkView
        anleggId={selectedAnlegg}
        anleggsNavn={selectedAnleggData?.anleggsnavn || ''}
        nettverkListe={nettverkListe}
        enheterData={enheterData}
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
        onBack={() => { setViewMode('list'); setKontrollStart({}); loadKontroller(selectedAnlegg) }}
        startKontroll={kontrollStart.startKontroll}
        startNy={kontrollStart.startNy}
      />
    )
  }

  const st = styringer as Record<string, unknown> | null
  const tall = (k: string) => Number(st?.[`${k}_antall`] ?? 0) || 0
  const detektorer = ['rd', 'vd', 'multi', 'flame', 'linje', 'asp', 'mm', 'traadlos'].reduce((s, k) => s + tall(k), 0)
  const sentraler = tall('brannsentral') + tall('panel')
  const styringerAktive = ['ovrige', 'adgang', 'slukke', 'klokke', 'flash_blitz', 'port', 'spjaeld', 'overvaking', 'musikk', 'gardin', 'dorstyring', 'royklukker', 'vent', 'sd', 'heis', 'safe'].filter(k => st?.[`${k}_aktiv`]).length
  const utkast = kontroller.find(k => k.kontroll_status === 'utkast')
  const sisteFerdig = kontroller.find(k => k.kontroll_status !== 'utkast')
  const kontrollType = (t: string | null): 'FG790' | 'NS3960' => (t === 'NS3960' ? 'NS3960' : 'FG790')

  function tilbake() {
    if (fromAnlegg && state?.anleggId) navigate(`/anlegg/${state.anleggId}`)
    else onBack()
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={tilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />{fromAnlegg ? 'Anlegg' : 'Rapporter'}</button>
        {selectedAnleggData && <><span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{selectedAnleggData.anleggsnavn}</span></>}
      </div>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Flame className="w-6 h-6 text-red-500" />Brannalarm</h1>
          {selectedAnlegg ? (
            <button type="button" onClick={() => setVisVelger(v => !v)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary mt-0.5 text-left">
              {selectedKundeData?.navn} · <span className="font-medium text-gray-900 dark:text-white">{selectedAnleggData?.anleggsnavn}</span> <span className="text-xs">{visVelger ? '· skjul velger' : '· bytt anlegg'}</span>
            </button>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Velg kunde og anlegg for å starte.</p>}
        </div>
        {selectedAnlegg && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {utkast ? (
              <>
                <Button variant="outline" icon={<Plus />} onClick={() => { setKontrollStart({ startNy: true }); setViewMode('ny-kontroll') }}><span className="hidden sm:inline">Ny kontroll</span></Button>
                <Button variant="primary" icon={<Play />} onClick={() => { setKontrollStart({ startKontroll: { id: utkast.id, type: kontrollType(utkast.rapport_type) } }); setViewMode('ny-kontroll') }}>Fortsett {kontrollType(utkast.rapport_type)}</Button>
              </>
            ) : (
              <Button variant="primary" icon={<ClipboardCheck />} onClick={() => { setKontrollStart({ startNy: true }); setViewMode('ny-kontroll') }}>Start ny kontroll</Button>
            )}
          </div>
        )}
      </header>

      {(visVelger || !selectedAnlegg) && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Combobox label="Kunde" options={kunder.map(k => ({ id: k.id, label: k.navn }))} value={selectedKunde} onChange={val => { setSelectedKunde(val); setSelectedAnlegg('') }} placeholder="Søk og velg kunde…" searchPlaceholder="Skriv for å søke…" emptyMessage="Ingen kunder funnet" />
            <Combobox label="Anlegg" options={anlegg.map(a => ({ id: a.id, label: a.anleggsnavn, sublabel: a.adresse ? `${a.adresse}${a.poststed ? `, ${a.poststed}` : ''}` : undefined }))} value={selectedAnlegg} onChange={val => { setSelectedAnlegg(val); if (val) setVisVelger(false) }} placeholder="Søk og velg anlegg…" searchPlaceholder="Skriv for å søke…" emptyMessage="Ingen anlegg funnet" disabled={!selectedKunde} />
          </div>
        </div>
      )}

      {selectedAnlegg && selectedAnleggData && (
        <>
          {/* Kontroller */}
          <section className="card !p-4 space-y-3" aria-label="Kontroller">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Kontroller</h2>
              <button type="button" onClick={() => { setKontrollStart({}); setViewMode('ny-kontroll') }} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">Alle kontroller og rapporter <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            {utkast && (
              <button type="button" onClick={() => { setKontrollStart({ startKontroll: { id: utkast.id, type: kontrollType(utkast.rapport_type) } }); setViewMode('ny-kontroll') }} className="w-full flex items-center gap-3 p-3 rounded-lg border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-left hover:border-yellow-500">
                <span className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 flex items-center justify-center flex-shrink-0"><Play className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white">Påbegynt {utkast.rapport_type}-kontroll</span><span className="block text-xs text-gray-600 dark:text-gray-400">Startet {formatDate(utkast.dato)} · ikke ferdigstilt – trykk for å fortsette</span></span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            )}
            {sisteFerdig ? (
              <div className="flex items-center gap-3 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sisteFerdig.har_feil ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-gray-700 dark:text-gray-300">Siste ferdige: <b className="text-gray-900 dark:text-white">{sisteFerdig.rapport_type}</b> {formatDate(sisteFerdig.dato)}{sisteFerdig.kontroll_status === 'sendt' ? ' · sendt kunde' : ''}</span>
                {sisteFerdig.har_feil && <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400"><AlertTriangle className="w-3.5 h-3.5" />med feil</span>}
              </div>
            ) : !utkast && <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kontroller registrert på anlegget ennå.</p>}
          </section>

          {/* Anleggsdata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Kort ikon={<Cpu className="w-5 h-5" />} farge="bg-purple-500/10 text-purple-500" tittel="Enheter og styringer" tekst={sentraler || detektorer || styringerAktive ? [sentraler ? `${sentraler} sentral${sentraler === 1 ? '' : 'er'}/panel` : null, detektorer ? `${detektorer} detektorer/meldere` : null, styringerAktive ? `${styringerAktive} styringer` : null].filter(Boolean).join(' · ') : 'Ingen registrert'} tom={!sentraler && !detektorer && !styringerAktive} onClick={() => setViewMode('enheter')} />
            <Kort ikon={<Network className="w-5 h-5" />} farge="bg-blue-500/10 text-blue-500" tittel="Nettverk" tekst={nettverkListe.length ? `${nettverkListe.length} ${nettverkListe.length === 1 ? 'system' : 'systemer'}` : 'Ingen registrert'} tom={!nettverkListe.length} onClick={() => setViewMode('nettverk')} />
            <Kort ikon={<Package className="w-5 h-5" />} farge="bg-green-500/10 text-green-500" tittel="Tilleggsutstyr" tekst="Talevarsling, alarmsender, nøkkelsafe" onClick={() => setViewMode('tilleggsutstyr')} />
          </div>

          <section className="card !p-4">
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Adresse</dt><dd className="text-gray-900 dark:text-white">{[selectedAnleggData.adresse, [selectedAnleggData.postnummer, selectedAnleggData.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '–'}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Leverandør</dt><dd className="text-gray-900 dark:text-white">{leverandor || <span className="text-gray-400">Ikke satt</span>}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Sentraltype</dt><dd className="text-gray-900 dark:text-white">{sentraltype || <span className="text-gray-400">Ikke satt</span>}</dd>
            </dl>
          </section>
        </>
      )}
    </div>
  )
}

function Kort({ ikon, farge, tittel, tekst, tom, onClick }: { ikon: React.ReactNode; farge: string; tittel: string; tekst: string; tom?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card !p-4 text-left hover:border-primary transition-colors flex items-center gap-3">
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${farge}`}>{ikon}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-gray-900 dark:text-white">{tittel}</span><span className={`block text-xs truncate ${tom ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>{tekst}</span></span>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  )
}
