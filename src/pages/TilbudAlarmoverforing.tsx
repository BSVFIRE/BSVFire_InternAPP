import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Search, Building, Edit, Trash2, Eye, 
  AlertCircle, ArrowLeft, Radio, Users,
  DollarSign, Phone, Mail, User, Send, Download
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { downloadAlarmoverforingPDF, getAlarmoverforingPDFBlob, previewAlarmoverforingPDF } from './tilbud/AlarmoverforingPDF'
import { uploadToDropbox } from '@/services/dropboxServiceV2'

// Konstanter for prisberegning
const FAST_PRIS_PER_MAANED = 400 // kr eks mva
const MVA_SATS = 0.25 // 25% mva
const BSV_KOSTNAD_PER_MAANED = 79 // kr per måned

// Simkort priser
const SIMKORT_PRIS_PER_MAANED = 100 // kr eks mva
const SIMKORT_BSV_KOSTNAD_PER_MAANED = 49 // kr per måned
const VEKTER_UTRYKNING_PRIS = 1950 // kr eks mva

interface AlarmoverforingTilbud {
  id: string
  anlegg_id: string
  alarm_type: string
  beskrivelse: string | null
  fast_pris: number
  rabatt_prosent: number
  rabatt_belop: number
  pris_eks_mva: number
  mva_belop: number
  pris_ink_mva: number
  brutto_fortjeneste_maaned: number
  brutto_fortjeneste_aar: number
  bsv_kostnad_per_maaned: number
  inkluderer_simkort: boolean
  simkort_pris: number
  simkort_bsv_kostnad: number
  fakturering: 'kvartal' | 'aar'
  mottakere: Mottaker[]
  kommentar: string | null
  status: 'Utkast' | 'Sendt' | 'Aktiv' | 'Inaktiv' | 'Avsluttet'
  pdf_url: string | null
  created_at: string
  updated_at: string | null
  // Joined data
  anlegg?: {
    anleggsnavn: string
    adresse: string | null
    postnummer: string | null
    poststed: string | null
    customer?: {
      navn: string
    }
  }
}

interface Mottaker {
  navn: string
  telefon: string
  epost: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kundenr: string
  customer?: {
    id: string
    navn: string
  } | null
}

interface Kontaktperson {
  id: string
  navn: string
  telefon: string | null
  epost: string | null
  rolle: string | null
}

type ViewMode = 'list' | 'create' | 'edit' | 'view'

function beregnPriser(rabattProsent: number, inkludererSimkort: boolean) {
  // Basispris
  const basispris = FAST_PRIS_PER_MAANED + (inkludererSimkort ? SIMKORT_PRIS_PER_MAANED : 0)
  const rabattBelop = (basispris * rabattProsent / 100)
  const prisEksMva = basispris - rabattBelop
  const mvaBelop = prisEksMva * MVA_SATS
  const prisInkMva = prisEksMva + mvaBelop
  
  // Årlige priser
  const prisEksMvaAar = prisEksMva * 12
  const mvaBelopAar = mvaBelop * 12
  const prisInkMvaAar = prisInkMva * 12
  
  // BSV kostnad
  const bsvKostnadMaaned = BSV_KOSTNAD_PER_MAANED + (inkludererSimkort ? SIMKORT_BSV_KOSTNAD_PER_MAANED : 0)
  
  // BSV fortjeneste beregning
  const bruttoFortjenesteMaaned = prisEksMva - bsvKostnadMaaned
  const bruttoFortjenesteAar = bruttoFortjenesteMaaned * 12
  
  return {
    basispris,
    rabattBelop,
    prisEksMva,
    mvaBelop,
    prisInkMva,
    prisEksMvaAar,
    mvaBelopAar,
    prisInkMvaAar,
    bsvKostnadMaaned,
    bruttoFortjenesteMaaned,
    bruttoFortjenesteAar,
  }
}

export function TilbudAlarmoverforing() {
  const [tilbud, setTilbud] = useState<AlarmoverforingTilbud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTilbud, setSelectedTilbud] = useState<AlarmoverforingTilbud | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    loadTilbud()
  }, [])

  async function loadTilbud() {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('alarmoverforing')
        .select(`
          *,
          anlegg:anlegg_id (
            anleggsnavn,
            adresse,
            postnummer,
            poststed,
            customer:kundenr (
              navn
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTilbud(data || [])
    } catch (err) {
      console.error('Feil ved lasting av alarmoverføringer:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste alarmoverføringer')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTilbud(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne alarmoverføringen?')) return

    try {
      const { error } = await supabase
        .from('alarmoverforing')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadTilbud()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette alarmoverføring')
    }
  }

  const filteredTilbud = tilbud.filter(t =>
    t.alarm_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.anlegg?.anleggsnavn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.anlegg?.customer?.navn?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Laster alarmoverføringer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tilbud Alarmoverføring</h1>
          <p className="text-gray-500 dark:text-gray-400">Opprett tilbud på alarmoverføring 24/7</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste alarmoverføringer</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadTilbud} className="btn-primary text-sm">
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <AlarmoverforingForm
        tilbud={selectedTilbud}
        onSave={async () => {
          await loadTilbud()
          setViewMode('list')
          setSelectedTilbud(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedTilbud(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedTilbud) {
    return (
      <AlarmoverforingDetails
        tilbud={selectedTilbud}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedTilbud(null)
        }}
        onStatusChange={async () => {
          await loadTilbud()
          setViewMode('list')
          setSelectedTilbud(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tilbud Alarmoverføring</h1>
          <p className="text-gray-500 dark:text-gray-400">Opprett tilbud på alarmoverføring 24/7</p>
        </div>
        <button
          onClick={() => {
            setSelectedTilbud(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nytt tilbud
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Søk etter kunde, anlegg eller alarmtype..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const aktiveTilbud = tilbud.filter(t => t.status === 'Aktiv')
        const totalInntektMnd = aktiveTilbud.reduce((sum, t) => sum + (t.pris_eks_mva || 0), 0)
        const totalUtgiftMnd = aktiveTilbud.reduce((sum, t) => sum + (t.bsv_kostnad_per_maaned || 0), 0)
        const totalFortjenesteMnd = aktiveTilbud.reduce((sum, t) => sum + (t.brutto_fortjeneste_maaned || 0), 0)
        const antallMedSimkort = aktiveTilbud.filter(t => t.inkluderer_simkort).length
        
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Radio className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Totalt tilbud</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{tilbud.length}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Radio className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Aktive</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {aktiveTilbud.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Radio className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Inaktive</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tilbud.filter(t => t.status === 'Inaktiv').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Radio className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Med Simkort</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{antallMedSimkort}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Økonomisk oversikt */}
            <div className="card bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Økonomisk oversikt (aktive avtaler)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Månedlig inntekt */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Inntekt/mnd (eks. mva)</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalInntektMnd.toLocaleString('nb-NO')} kr
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Årlig: {(totalInntektMnd * 12).toLocaleString('nb-NO')} kr
                  </p>
                </div>

                {/* Månedlig utgift */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">BSV Utgifter/mnd</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {totalUtgiftMnd.toLocaleString('nb-NO')} kr
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Årlig: {(totalUtgiftMnd * 12).toLocaleString('nb-NO')} kr
                  </p>
                </div>

                {/* Månedlig fortjeneste */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fortjeneste/mnd</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalFortjenesteMnd.toLocaleString('nb-NO')} kr
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Årlig: {(totalFortjenesteMnd * 12).toLocaleString('nb-NO')} kr
                  </p>
                </div>

                {/* Margin */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fortjenestemargin</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {totalInntektMnd > 0 ? ((totalFortjenesteMnd / totalInntektMnd) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Snitt per avtale: {aktiveTilbud.length > 0 ? (totalFortjenesteMnd / aktiveTilbud.length).toFixed(0) : 0} kr/mnd
                  </p>
                </div>
              </div>

              {/* Detaljer */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Alarm (79 kr/stk):</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{aktiveTilbud.length * BSV_KOSTNAD_PER_MAANED} kr/mnd</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Simkort (49 kr/stk):</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{antallMedSimkort * SIMKORT_BSV_KOSTNAD_PER_MAANED} kr/mnd</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fastpris alarm:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{FAST_PRIS_PER_MAANED} kr/mnd</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Simkort pris:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{SIMKORT_PRIS_PER_MAANED} kr/mnd</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* Tilbud Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alarmoverføringer
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
              ({filteredTilbud.length} {filteredTilbud.length === 1 ? 'tilbud' : 'tilbud'})
            </span>
          </h2>
        </div>
        
        {filteredTilbud.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Ingen alarmoverføringer funnet' : 'Ingen alarmoverføringer opprettet ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Kunde/Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Alarmtype</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Pris/mnd</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filteredTilbud.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setSelectedTilbud(t)
                      setViewMode('view')
                    }}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {t.anlegg?.customer?.navn || 'Ukjent kunde'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t.anlegg?.anleggsnavn || 'Ukjent anlegg'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
                        {t.alarm_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        t.status === 'Aktiv' 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : t.status === 'Inaktiv'
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                          : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {t.pris_ink_mva?.toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ink. mva</p>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300 text-sm">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedTilbud(t)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTilbud(t)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTilbud(t.id)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Slett"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Form Component
interface AlarmoverforingFormProps {
  tilbud: AlarmoverforingTilbud | null
  onSave: () => void
  onCancel: () => void
}

function AlarmoverforingForm({ tilbud, onSave, onCancel }: AlarmoverforingFormProps) {
  const [anleggList, setAnleggList] = useState<Anlegg[]>([])
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [loadingAnlegg, setLoadingAnlegg] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchAnlegg, setSearchAnlegg] = useState('')
  
  const [formData, setFormData] = useState({
    anlegg_id: tilbud?.anlegg_id || '',
    alarm_type: tilbud?.alarm_type || '',
    beskrivelse: tilbud?.beskrivelse || '',
    rabatt_prosent: tilbud?.rabatt_prosent || 0,
    inkluderer_simkort: tilbud?.inkluderer_simkort || false,
    fakturering: tilbud?.fakturering || 'kvartal' as const,
    kommentar: tilbud?.kommentar || '',
    status: tilbud?.status || 'Utkast' as const,
    mottakere: tilbud?.mottakere || [] as Mottaker[],
  })

  const priser = beregnPriser(formData.rabatt_prosent, formData.inkluderer_simkort)

  useEffect(() => {
    loadAnlegg()
  }, [])

  useEffect(() => {
    if (formData.anlegg_id) {
      loadKontaktpersoner(formData.anlegg_id)
    }
  }, [formData.anlegg_id])

  async function loadAnlegg() {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select(`
          id,
          anleggsnavn,
          adresse,
          postnummer,
          poststed,
          kundenr,
          customer:kundenr (
            id,
            navn
          )
        `)
        .order('anleggsnavn')

      if (error) throw error
      // Map the data to handle customer array from Supabase join
      const mappedData = (data || []).map(item => ({
        ...item,
        customer: Array.isArray(item.customer) ? item.customer[0] : item.customer
      }))
      setAnleggList(mappedData)
    } catch (err) {
      console.error('Feil ved lasting av anlegg:', err)
    } finally {
      setLoadingAnlegg(false)
    }
  }

  async function loadKontaktpersoner(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select(`
          id,
          navn,
          telefon,
          epost,
          rolle,
          anlegg_kontaktpersoner!inner(anlegg_id)
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)

      if (error) throw error
      setKontaktpersoner(data || [])
    } catch (err) {
      console.error('Feil ved lasting av kontaktpersoner:', err)
    }
  }

  function addMottaker(kontaktperson?: Kontaktperson) {
    const newMottaker: Mottaker = kontaktperson 
      ? {
          navn: kontaktperson.navn,
          telefon: kontaktperson.telefon || '',
          epost: kontaktperson.epost || '',
        }
      : { navn: '', telefon: '', epost: '' }

    // Check if already added
    const exists = formData.mottakere.some(m => 
      m.navn === newMottaker.navn && 
      m.telefon === newMottaker.telefon &&
      m.epost === newMottaker.epost
    )

    if (!exists) {
      setFormData(prev => ({
        ...prev,
        mottakere: [...prev.mottakere, newMottaker]
      }))
    }
  }

  function removeMottaker(index: number) {
    setFormData(prev => ({
      ...prev,
      mottakere: prev.mottakere.filter((_, i) => i !== index)
    }))
  }

  function updateMottaker(index: number, field: keyof Mottaker, value: string) {
    setFormData(prev => ({
      ...prev,
      mottakere: prev.mottakere.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.anlegg_id) {
      alert('Vennligst velg et anlegg')
      return
    }
    if (!formData.alarm_type.trim()) {
      alert('Vennligst fyll inn alarmtype')
      return
    }

    setSaving(true)

    try {
      const payload = {
        anlegg_id: formData.anlegg_id,
        alarm_type: formData.alarm_type.trim(),
        beskrivelse: formData.beskrivelse.trim() || null,
        fast_pris: FAST_PRIS_PER_MAANED,
        rabatt_prosent: formData.rabatt_prosent,
        rabatt_belop: priser.rabattBelop,
        pris_eks_mva: priser.prisEksMva,
        mva_belop: priser.mvaBelop,
        pris_ink_mva: priser.prisInkMva,
        brutto_fortjeneste_maaned: priser.bruttoFortjenesteMaaned,
        brutto_fortjeneste_aar: priser.bruttoFortjenesteAar,
        bsv_kostnad_per_maaned: priser.bsvKostnadMaaned,
        inkluderer_simkort: formData.inkluderer_simkort,
        simkort_pris: formData.inkluderer_simkort ? SIMKORT_PRIS_PER_MAANED : 0,
        simkort_bsv_kostnad: formData.inkluderer_simkort ? SIMKORT_BSV_KOSTNAD_PER_MAANED : 0,
        fakturering: formData.fakturering,
        kommentar: formData.kommentar.trim() || null,
        status: formData.status,
        mottakere: formData.mottakere,
      }

      if (tilbud) {
        const { error } = await supabase
          .from('alarmoverforing')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', tilbud.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('alarmoverforing')
          .insert([{ ...payload, created_at: new Date().toISOString() }])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre alarmoverføring')
    } finally {
      setSaving(false)
    }
  }

  const filteredAnlegg = anleggList.filter(a =>
    a.anleggsnavn?.toLowerCase().includes(searchAnlegg.toLowerCase()) ||
    a.customer?.navn?.toLowerCase().includes(searchAnlegg.toLowerCase())
  )

  const selectedAnlegg = anleggList.find(a => a.id === formData.anlegg_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {tilbud ? 'Rediger Alarmoverføring' : 'Ny Alarmoverføring'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Alarm 24/7 Overføring - Fastpris {FAST_PRIS_PER_MAANED} kr/mnd eks. mva
          </p>
        </div>
        <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Tilbake
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anlegg Selection */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Velg anlegg
          </h2>
          
          {loadingAnlegg ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Søk etter anlegg eller kunde..."
                  value={searchAnlegg}
                  onChange={(e) => setSearchAnlegg(e.target.value)}
                  className="input pl-10"
                />
              </div>
              
              {selectedAnlegg ? (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedAnlegg.anleggsnavn}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedAnlegg.customer?.navn} • {selectedAnlegg.adresse}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, anlegg_id: '' }))}
                      className="text-sm text-primary hover:underline"
                    >
                      Endre
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {filteredAnlegg.slice(0, 20).map(anlegg => (
                    <button
                      key={anlegg.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, anlegg_id: anlegg.id }))}
                      className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-dark-100 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{anlegg.anleggsnavn}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {anlegg.customer?.navn} • {anlegg.adresse}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Alarm Info */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Alarminformasjon
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Alarmtype *
            </label>
            <input
              type="text"
              value={formData.alarm_type}
              onChange={(e) => setFormData(prev => ({ ...prev, alarm_type: e.target.value }))}
              className="input"
              placeholder="F.eks. Brannalarm, Innbruddsalarm, etc."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={formData.beskrivelse}
              onChange={(e) => setFormData(prev => ({ ...prev, beskrivelse: e.target.value }))}
              className="input min-h-[100px]"
              placeholder="Beskriv alarmoverføringen..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="input"
              >
                <option value="Utkast">Utkast</option>
                <option value="Sendt">Sendt</option>
                <option value="Aktiv">Aktiv</option>
                <option value="Inaktiv">Inaktiv</option>
                <option value="Avsluttet">Avsluttet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Rabatt (%)
              </label>
              <input
                type="number"
                value={formData.rabatt_prosent}
                onChange={(e) => setFormData(prev => ({ ...prev, rabatt_prosent: parseFloat(e.target.value) || 0 }))}
                className="input"
                min="0"
                max="100"
                step="0.5"
              />
            </div>
          </div>

          {/* Simkort tilvalg */}
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.inkluderer_simkort}
                onChange={(e) => setFormData(prev => ({ ...prev, inkluderer_simkort: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Inkluder Simkort</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  +{SIMKORT_PRIS_PER_MAANED} kr/mnd eks. mva (BSV kostnad: {SIMKORT_BSV_KOSTNAD_PER_MAANED} kr/mnd)
                </p>
              </div>
            </label>
          </div>

          {/* Faktureringsvalg */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Fakturering
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                formData.fakturering === 'kvartal' 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-gray-50 dark:bg-dark-100 border-gray-200 dark:border-gray-700 hover:border-primary/50'
              }`}>
                <input
                  type="radio"
                  name="fakturering"
                  value="kvartal"
                  checked={formData.fakturering === 'kvartal'}
                  onChange={() => setFormData(prev => ({ ...prev, fakturering: 'kvartal' }))}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Kvartalsvis</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(priser.prisInkMva * 3).toFixed(0)} kr ink. mva
                  </p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                formData.fakturering === 'aar' 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-gray-50 dark:bg-dark-100 border-gray-200 dark:border-gray-700 hover:border-primary/50'
              }`}>
                <input
                  type="radio"
                  name="fakturering"
                  value="aar"
                  checked={formData.fakturering === 'aar'}
                  onChange={() => setFormData(prev => ({ ...prev, fakturering: 'aar' }))}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Årlig</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(priser.prisInkMva * 12).toFixed(0)} kr ink. mva
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Vekterutrykning info */}
          <div className="mt-4 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="flex items-start gap-3">
              <div className="text-orange-500 mt-0.5">⚠️</div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Vekterutrykning</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fastpris ved vekterutrykning: {VEKTER_UTRYKNING_PRIS} kr eks. mva. Ved utrykning faktureres dette i separat faktura.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Prisberegning
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Månedlig */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Månedlig pris</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Alarmoverføring:</span>
                  <span className="text-gray-900 dark:text-white">{FAST_PRIS_PER_MAANED} kr</span>
                </div>
                {formData.inkluderer_simkort && (
                  <div className="flex justify-between text-blue-500">
                    <span>Simkort:</span>
                    <span>+{SIMKORT_PRIS_PER_MAANED} kr</span>
                  </div>
                )}
                {formData.rabatt_prosent > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Rabatt ({formData.rabatt_prosent}%):</span>
                    <span>-{priser.rabattBelop.toFixed(0)} kr</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Pris eks. mva:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{priser.prisEksMva.toFixed(0)} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">MVA (25%):</span>
                  <span className="text-gray-900 dark:text-white">{priser.mvaBelop.toFixed(0)} kr</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-900 dark:text-white">Total ink. mva:</span>
                  <span className="font-bold text-primary">{priser.prisInkMva.toFixed(0)} kr</span>
                </div>
              </div>
            </div>

            {/* Årlig */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Årlig pris</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Pris eks. mva:</span>
                  <span className="text-gray-900 dark:text-white">{priser.prisEksMvaAar.toFixed(0)} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">MVA:</span>
                  <span className="text-gray-900 dark:text-white">{priser.mvaBelopAar.toFixed(0)} kr</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-900 dark:text-white">Total ink. mva:</span>
                  <span className="font-bold text-primary">{priser.prisInkMvaAar.toFixed(0)} kr</span>
                </div>
              </div>
            </div>
          </div>

          {/* BSV Fortjeneste */}
          <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <h3 className="font-medium text-green-600 dark:text-green-400 mb-2">BSV Fortjeneste</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Per måned:</span>
                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                  {priser.bruttoFortjenesteMaaned.toFixed(0)} kr
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Per år:</span>
                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                  {priser.bruttoFortjenesteAar.toFixed(0)} kr
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              BSV kostnad: {priser.bsvKostnadMaaned} kr/mnd
              {formData.inkluderer_simkort && ` (Alarm: ${BSV_KOSTNAD_PER_MAANED} kr + Simkort: ${SIMKORT_BSV_KOSTNAD_PER_MAANED} kr)`}
            </p>
          </div>
        </div>

        {/* Mottakere */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Alarmmottakere
            </h2>
            <button
              type="button"
              onClick={() => addMottaker()}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Legg til manuelt
            </button>
          </div>

          {/* Kontaktpersoner fra anlegg */}
          {kontaktpersoner.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Velg fra kontaktpersoner:</p>
              <div className="flex flex-wrap gap-2">
                {kontaktpersoner.map(kp => (
                  <button
                    key={kp.id}
                    type="button"
                    onClick={() => addMottaker(kp)}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-dark-100 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    {kp.navn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mottaker liste */}
          {formData.mottakere.length > 0 ? (
            <div className="space-y-3">
              {formData.mottakere.map((mottaker, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Mottaker {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMottaker(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Navn</label>
                      <input
                        type="text"
                        value={mottaker.navn}
                        onChange={(e) => updateMottaker(index, 'navn', e.target.value)}
                        className="input text-sm"
                        placeholder="Navn"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={mottaker.telefon}
                        onChange={(e) => updateMottaker(index, 'telefon', e.target.value)}
                        className="input text-sm"
                        placeholder="Telefon"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">E-post</label>
                      <input
                        type="email"
                        value={mottaker.epost}
                        onChange={(e) => updateMottaker(index, 'epost', e.target.value)}
                        className="input text-sm"
                        placeholder="E-post"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500 dark:text-gray-400">
              Ingen mottakere lagt til ennå
            </p>
          )}
        </div>

        {/* Kommentar */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Kommentar</h2>
          <textarea
            value={formData.kommentar}
            onChange={(e) => setFormData(prev => ({ ...prev, kommentar: e.target.value }))}
            className="input min-h-[100px]"
            placeholder="Eventuelle kommentarer..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : tilbud ? 'Oppdater' : 'Opprett tilbud'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Avbryt
          </button>
        </div>
      </form>
    </div>
  )
}

// Details Component
interface AlarmoverforingDetailsProps {
  tilbud: AlarmoverforingTilbud
  onEdit: () => void
  onClose: () => void
  onStatusChange: () => void
}

function AlarmoverforingDetails({ tilbud, onEdit, onClose, onStatusChange }: AlarmoverforingDetailsProps) {
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [sendingPDF, setSendingPDF] = useState(false)

  // Hent kundenummer for Dropbox-sti
  const [kundenummer, setKundenummer] = useState<string>('')
  
  useEffect(() => {
    async function fetchKundenummer() {
      if (tilbud.anlegg_id) {
        const { data } = await supabase
          .from('anlegg')
          .select('kundenr')
          .eq('id', tilbud.anlegg_id)
          .single()
        if (data?.kundenr) {
          setKundenummer(data.kundenr)
        }
      }
    }
    fetchKundenummer()
  }, [tilbud.anlegg_id])

  function getPDFData() {
    return {
      kunde_navn: tilbud.anlegg?.customer?.navn || 'Ukjent kunde',
      anlegg_navn: tilbud.anlegg?.anleggsnavn || 'Ukjent anlegg',
      anlegg_adresse: tilbud.anlegg?.adresse || undefined,
      anlegg_postnummer: tilbud.anlegg?.postnummer || undefined,
      anlegg_poststed: tilbud.anlegg?.poststed || undefined,
      alarm_type: tilbud.alarm_type,
      beskrivelse: tilbud.beskrivelse || undefined,
      fast_pris: tilbud.fast_pris,
      inkluderer_simkort: tilbud.inkluderer_simkort,
      simkort_pris: tilbud.simkort_pris || SIMKORT_PRIS_PER_MAANED,
      rabatt_prosent: tilbud.rabatt_prosent,
      rabatt_belop: tilbud.rabatt_belop,
      pris_eks_mva: tilbud.pris_eks_mva,
      mva_belop: tilbud.mva_belop,
      pris_ink_mva: tilbud.pris_ink_mva,
      fakturering: tilbud.fakturering || 'kvartal',
      mottakere: tilbud.mottakere || [],
      opprettet: tilbud.created_at,
      tilbudsnummer: tilbud.id.slice(0, 8).toUpperCase(),
    }
  }

  async function handlePreviewPDF() {
    setGeneratingPDF(true)
    try {
      await previewAlarmoverforingPDF(getPDFData())
    } catch (error) {
      console.error('Feil ved forhåndsvisning av PDF:', error)
      alert('Kunne ikke vise PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  async function handleDownloadPDF() {
    setGeneratingPDF(true)
    try {
      await downloadAlarmoverforingPDF(getPDFData())
    } catch (error) {
      console.error('Feil ved generering av PDF:', error)
      alert('Kunne ikke generere PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  async function handleSendPDF() {
    if (!confirm('Dette vil generere PDF, lagre den til Dropbox og sette status til "Sendt". Fortsette?')) {
      return
    }

    setSendingPDF(true)
    try {
      // Generer PDF blob
      const pdfBlob = await getAlarmoverforingPDFBlob(getPDFData())
      
      // Bygg filnavn og sti
      const kundeNavn = tilbud.anlegg?.customer?.navn || 'Ukjent'
      const anleggNavn = tilbud.anlegg?.anleggsnavn || 'Ukjent'
      const dato = new Date().toISOString().split('T')[0]
      const fileName = `Tilbud_Alarmoverforing_${dato}.pdf`
      
      // Bygg Dropbox-sti (bruker tilpasset sti for tilbud)
      const safeKundeNavn = kundeNavn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const safeAnleggNavn = anleggNavn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const basePath = '/NY MAPPESTRUKTUR 2026/01_KUNDER'
      const dropboxPath = `${basePath}/${kundenummer}_${safeKundeNavn}/02_Bygg/${safeAnleggNavn}/08_Tilbud/${fileName}`
      
      // Last opp til Dropbox
      const uploadResult = await uploadToDropbox(dropboxPath, pdfBlob)
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Kunne ikke laste opp til Dropbox')
      }

      // Oppdater status til "Sendt" og lagre PDF URL
      const { error: updateError } = await supabase
        .from('alarmoverforing')
        .update({ 
          status: 'Sendt',
          pdf_url: dropboxPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', tilbud.id)

      if (updateError) throw updateError

      alert('PDF generert og lagret til Dropbox. Status satt til "Sendt".')
      onStatusChange()
    } catch (error) {
      console.error('Feil ved sending av PDF:', error)
      alert('Kunne ikke sende PDF: ' + (error instanceof Error ? error.message : 'Ukjent feil'))
    } finally {
      setSendingPDF(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Alarmoverføring Detaljer
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {tilbud.anlegg?.customer?.navn} - {tilbud.anlegg?.anleggsnavn}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePreviewPDF} 
            disabled={generatingPDF}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {generatingPDF ? 'Genererer...' : 'Forhåndsvis'}
          </button>
          <button 
            onClick={handleDownloadPDF} 
            disabled={generatingPDF}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Last ned PDF
          </button>
          <button 
            onClick={handleSendPDF} 
            disabled={sendingPDF || tilbud.status === 'Sendt'}
            className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
            {sendingPDF ? 'Sender...' : tilbud.status === 'Sendt' ? 'Allerede sendt' : 'Send tilbud'}
          </button>
          <button onClick={onEdit} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
          <button onClick={onClose} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informasjon</h2>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Alarmtype</span>
              <p className="font-medium text-gray-900 dark:text-white">{tilbud.alarm_type}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
              <p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  tilbud.status === 'Aktiv' 
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : tilbud.status === 'Sendt'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : tilbud.status === 'Utkast'
                    ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                    : tilbud.status === 'Inaktiv'
                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  {tilbud.status}
                </span>
              </p>
            </div>

            {tilbud.beskrivelse && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Beskrivelse</span>
                <p className="text-gray-900 dark:text-white">{tilbud.beskrivelse}</p>
              </div>
            )}

            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Simkort</span>
              <p className="text-gray-900 dark:text-white">
                {tilbud.inkluderer_simkort ? (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                    Inkludert
                  </span>
                ) : (
                  <span className="text-gray-500">Ikke inkludert</span>
                )}
              </p>
            </div>

            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Opprettet</span>
              <p className="text-gray-900 dark:text-white">{formatDate(tilbud.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Priser */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Priser</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Alarmoverføring/mnd:</span>
              <span className="text-gray-900 dark:text-white">{tilbud.fast_pris} kr</span>
            </div>

            {tilbud.inkluderer_simkort && (
              <div className="flex justify-between text-blue-500">
                <span>Simkort/mnd:</span>
                <span>+{tilbud.simkort_pris} kr</span>
              </div>
            )}
            
            {tilbud.rabatt_prosent > 0 && (
              <div className="flex justify-between text-orange-500">
                <span>Rabatt ({tilbud.rabatt_prosent}%):</span>
                <span>-{tilbud.rabatt_belop?.toFixed(0)} kr</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pris eks. mva:</span>
              <span className="text-gray-900 dark:text-white">{tilbud.pris_eks_mva?.toFixed(0)} kr</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">MVA:</span>
              <span className="text-gray-900 dark:text-white">{tilbud.mva_belop?.toFixed(0)} kr</span>
            </div>
            
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-medium text-gray-900 dark:text-white">Total/mnd ink. mva:</span>
              <span className="font-bold text-primary">{tilbud.pris_ink_mva?.toFixed(0)} kr</span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="font-medium text-gray-900 dark:text-white">Total/år ink. mva:</span>
              <span className="font-bold text-primary">{(tilbud.pris_ink_mva * 12)?.toFixed(0)} kr</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              <strong>BSV Fortjeneste:</strong> {tilbud.brutto_fortjeneste_maaned?.toFixed(0)} kr/mnd 
              ({tilbud.brutto_fortjeneste_aar?.toFixed(0)} kr/år)
            </p>
          </div>
        </div>

        {/* Mottakere */}
        <div className="card space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alarmmottakere</h2>
          
          {tilbud.mottakere && tilbud.mottakere.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tilbud.mottakere.map((mottaker, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium text-gray-900 dark:text-white">{mottaker.navn}</span>
                  </div>
                  {mottaker.telefon && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      {mottaker.telefon}
                    </div>
                  )}
                  {mottaker.epost && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="w-3 h-3" />
                      {mottaker.epost}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Ingen mottakere registrert</p>
          )}
        </div>

        {/* Kommentar */}
        {tilbud.kommentar && (
          <div className="card space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kommentar</h2>
            <p className="text-gray-900 dark:text-white">{tilbud.kommentar}</p>
          </div>
        )}
      </div>
    </div>
  )
}
