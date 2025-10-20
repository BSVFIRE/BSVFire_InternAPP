import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Search, Edit, Trash2, Plus, AlertCircle, Building2, TrendingUp, History, X, ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

interface Pris {
  id: string
  anlegg_id: string
  kundenummer: string
  prisbrannalarm: number | null
  prisnodlys: number | null
  prisekstern: number | null
  prisslukkeutstyr: number | null
  prisroykluker: number | null
  kunde: string | null
  created_at: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
}

interface PrisHistorikk {
  id: string
  anlegg_id: string
  felt_navn: string
  gammel_verdi: number | null
  ny_verdi: number | null
  endret_av: string
  endret_dato: string
  endrings_type: string
  kommentar: string | null
  created_at: string
}

export function Priser() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { anleggId?: string; kundeId?: string } | null
  
  const [priser, setPriser] = useState<Pris[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [kunder, setKunder] = useState<{[key: string]: {id: string, navn: string, kunde_nummer: string | null}}>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPris, setSelectedPris] = useState<Pris | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedAnleggId, setSelectedAnleggId] = useState<string | null>(state?.anleggId || null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setError(null)
      
      // Hent priser, anlegg og kunder parallelt
      const [priserResponse, anleggResponse, kunderResponse] = await Promise.all([
        supabase.from('priser_kundenummer').select('*').order('created_at', { ascending: false }),
        supabase.from('anlegg').select('id, anleggsnavn, kundenr'),
        supabase.from('customer').select('id, navn, kunde_nummer')
      ])

      if (priserResponse.error) throw new Error(priserResponse.error.message)
      if (anleggResponse.error) throw new Error(anleggResponse.error.message)
      if (kunderResponse.error) throw new Error(kunderResponse.error.message)

      setPriser(priserResponse.data || [])
      setAnlegg(anleggResponse.data || [])
      
      // Lag en map av kunder for rask oppslag
      const kunderMap: {[key: string]: {id: string, navn: string, kunde_nummer: string | null}} = {}
      kunderResponse.data?.forEach(kunde => {
        kunderMap[kunde.id] = kunde
      })
      setKunder(kunderMap)
    } catch (err) {
      console.error('Feil ved lasting:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste data')
    } finally {
      setLoading(false)
    }
  }

  async function deletePris(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne prisen?')) return

    try {
      const { error } = await supabase.from('priser_kundenummer').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette pris')
    }
  }

  function getAnleggsNavn(anleggId: string): string {
    const anleggItem = anlegg.find(a => a.id === anleggId)
    return anleggItem?.anleggsnavn || 'Ukjent anlegg'
  }

  function getPrisForAnlegg(anleggId: string): Pris | null {
    return priser.find(p => p.anlegg_id === anleggId) || null
  }

  // Kombiner alle anlegg med deres priser (eller null hvis ingen pris)
  const anleggMedPriser = anlegg.map(a => ({
    anlegg: a,
    pris: getPrisForAnlegg(a.id)
  }))

  const filteredAnleggMedPriser = anleggMedPriser
    .filter(({ anlegg: a, pris: p }) => {
      const matchesSearch = 
        a.anleggsnavn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p?.kundenummer?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        p?.kunde?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesAnlegg = !selectedAnleggId || a.id === selectedAnleggId
      
      return matchesSearch && matchesAnlegg
    })
    .sort((a, b) => {
      return a.anlegg.anleggsnavn.localeCompare(b.anlegg.anleggsnavn, 'nb-NO')
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Laster priser...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kontrollpriser</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer priser per anlegg</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste priser</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadData} className="btn-primary text-sm">
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
      <PrisForm
        pris={selectedPris}
        anlegg={anlegg}
        kunder={kunder}
        preselectedAnleggId={selectedAnleggId}
        onSave={async () => {
          await loadData()
          setViewMode('list')
          setSelectedPris(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedPris(null)
        }}
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
              if (state?.anleggId) {
                // Naviger tilbake til anleggsvisningen
                navigate('/anlegg', { state: { viewAnleggId: state.anleggId } })
              } else {
                // Naviger tilbake i historikken
                navigate(-1)
              }
            }}
            className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
            title="Tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kontrollpriser</h1>
            <p className="text-gray-400 dark:text-gray-400">Administrer priser per anlegg</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedAnleggId && (
            <button
              onClick={() => {
                setSelectedAnleggId(null)
                navigate('/priser', { replace: true })
              }}
              className="btn-secondary"
            >
              Vis alle anlegg
            </button>
          )}
          <button
            onClick={() => {
              setSelectedPris(null)
              setViewMode('create')
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ny pris
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter anlegg, kunde..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          {selectedAnleggId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-900 dark:text-white">
                {getAnleggsNavn(selectedAnleggId)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Totalt priser</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{priser.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Building2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Med brannalarm</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {priser.filter(p => p.prisbrannalarm !== null && p.prisbrannalarm > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Med nødlys</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {priser.filter(p => p.prisnodlys !== null && p.prisnodlys > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prisliste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prisliste
            <span className="ml-2 text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({filteredAnleggMedPriser.length} {filteredAnleggMedPriser.length === 1 ? 'anlegg' : 'anlegg'})
            </span>
          </h2>
        </div>
        
        {filteredAnleggMedPriser.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm ? 'Ingen anlegg funnet' : 'Ingen anlegg registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Kundenummer</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Brannalarm</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Nødlys</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Ekstern</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Slukkeutstyr</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Røykluker</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnleggMedPriser.map(({ anlegg: a, pris }) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{a.anleggsnavn}</p>
                          {pris?.kunde && (
                            <p className="text-sm text-gray-400 dark:text-gray-400">{pris.kunde}</p>
                          )}
                          {!pris && (
                            <p className="text-sm text-yellow-500">Ingen priser registrert</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {pris?.kundenummer || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {pris?.prisbrannalarm !== null && pris?.prisbrannalarm !== undefined ? `${pris.prisbrannalarm.toLocaleString('nb-NO')} kr` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {pris?.prisnodlys !== null && pris?.prisnodlys !== undefined ? `${pris.prisnodlys.toLocaleString('nb-NO')} kr` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {pris?.prisekstern !== null && pris?.prisekstern !== undefined ? `${pris.prisekstern.toLocaleString('nb-NO')} kr` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {pris?.prisslukkeutstyr !== null && pris?.prisslukkeutstyr !== undefined ? `${pris.prisslukkeutstyr.toLocaleString('nb-NO')} kr` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {pris?.prisroykluker !== null && pris?.prisroykluker !== undefined ? `${pris.prisroykluker.toLocaleString('nb-NO')} kr` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {pris ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPris(pris)
                                setViewMode('edit')
                              }}
                              className="p-2 text-gray-400 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Rediger"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePris(pris.id)}
                              className="p-2 text-gray-400 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Slett"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedPris(null)
                              setSelectedAnleggId(a.id)
                              setViewMode('create')
                            }}
                            className="p-2 text-gray-400 dark:text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Legg til pris"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 dark:border-gray-700">
                <tr className="bg-gray-50 dark:bg-dark-100 font-semibold">
                  <td className="py-3 px-4 text-gray-900 dark:text-white" colSpan={2}>
                    Total
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                    {filteredAnleggMedPriser.reduce((sum, { pris }) => sum + (pris?.prisbrannalarm || 0), 0).toLocaleString('nb-NO')} kr
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                    {filteredAnleggMedPriser.reduce((sum, { pris }) => sum + (pris?.prisnodlys || 0), 0).toLocaleString('nb-NO')} kr
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                    {filteredAnleggMedPriser.reduce((sum, { pris }) => sum + (pris?.prisekstern || 0), 0).toLocaleString('nb-NO')} kr
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                    {filteredAnleggMedPriser.reduce((sum, { pris }) => sum + (pris?.prisslukkeutstyr || 0), 0).toLocaleString('nb-NO')} kr
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white whitespace-nowrap">
                    {filteredAnleggMedPriser.reduce((sum, { pris }) => sum + (pris?.prisroykluker || 0), 0).toLocaleString('nb-NO')} kr
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
                <tr className="bg-primary/10 font-bold">
                  <td className="py-3 px-4 text-gray-900 dark:text-white" colSpan={2}>
                    Total sum (alle fag)
                  </td>
                  <td className="py-3 px-4 text-right text-primary whitespace-nowrap" colSpan={6}>
                    {filteredAnleggMedPriser.reduce((sum, { pris }) => 
                      sum + (pris?.prisbrannalarm || 0) + (pris?.prisnodlys || 0) + (pris?.prisekstern || 0) + 
                      (pris?.prisslukkeutstyr || 0) + (pris?.prisroykluker || 0), 0
                    ).toLocaleString('nb-NO')} kr
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Pris Form Component
interface PrisFormProps {
  pris: Pris | null
  anlegg: Anlegg[]
  kunder: {[key: string]: {id: string, navn: string, kunde_nummer: string | null}}
  preselectedAnleggId: string | null
  onSave: () => void
  onCancel: () => void
}

function PrisForm({ pris, anlegg, kunder, preselectedAnleggId, onSave, onCancel }: PrisFormProps) {
  const [formData, setFormData] = useState({
    anlegg_id: pris?.anlegg_id || preselectedAnleggId || '',
    kundenummer: pris?.kundenummer || '',
    prisbrannalarm: pris?.prisbrannalarm?.toString() || '',
    prisnodlys: pris?.prisnodlys?.toString() || '',
    prisekstern: pris?.prisekstern?.toString() || '',
    prisslukkeutstyr: pris?.prisslukkeutstyr?.toString() || '',
    prisroykluker: pris?.prisroykluker?.toString() || '',
    kunde: pris?.kunde || '',
  })
  const [saving, setSaving] = useState(false)
  const [showIndexModal, setShowIndexModal] = useState(false)
  const [indexPercentage, setIndexPercentage] = useState('')
  const [indexComment, setIndexComment] = useState('')
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [prisHistorikk, setPrisHistorikk] = useState<PrisHistorikk[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Oppdater kundenummer og kunde når anlegg endres eller ved initialisering
  useEffect(() => {
    if (formData.anlegg_id && anlegg.length > 0) {
      const selectedAnlegg = anlegg.find(a => a.id === formData.anlegg_id)
      
      if (selectedAnlegg && selectedAnlegg.kundenr) {
        const kunde = kunder[selectedAnlegg.kundenr]
        
        if (kunde) {
          const newKundenummer = kunde.kunde_nummer || ''
          const newKunde = kunde.navn || ''
          
          // Kun oppdater hvis verdiene faktisk er forskjellige
          if (formData.kundenummer !== newKundenummer || formData.kunde !== newKunde) {
            setFormData(prev => ({
              ...prev,
              kundenummer: newKundenummer,
              kunde: newKunde
            }))
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.anlegg_id, anlegg, kunder])

  async function loadPrisHistorikk() {
    if (!formData.anlegg_id) return
    
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('prishistorikk')
        .select('*')
        .eq('anlegg_id', formData.anlegg_id)
        .order('endret_dato', { ascending: false })
      
      if (error) throw error
      setPrisHistorikk(data || [])
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Feil ved henting av prishistorikk:', error)
      alert('Kunne ikke hente prishistorikk')
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleIndexRegulation() {
    if (!indexPercentage || parseFloat(indexPercentage) === 0) {
      alert('Vennligst angi en gyldig prosentsats')
      return
    }

    const percentage = parseFloat(indexPercentage) / 100
    const oldValues = {
      prisbrannalarm: formData.prisbrannalarm ? parseFloat(formData.prisbrannalarm) : null,
      prisnodlys: formData.prisnodlys ? parseFloat(formData.prisnodlys) : null,
      prisekstern: formData.prisekstern ? parseFloat(formData.prisekstern) : null,
      prisslukkeutstyr: formData.prisslukkeutstyr ? parseFloat(formData.prisslukkeutstyr) : null,
      prisroykluker: formData.prisroykluker ? parseFloat(formData.prisroykluker) : null,
    }

    const newFormData = { ...formData }
    
    if (oldValues.prisbrannalarm) {
      const newValue = oldValues.prisbrannalarm * (1 + percentage)
      newFormData.prisbrannalarm = newValue.toFixed(2)
    }
    if (oldValues.prisnodlys) {
      const newValue = oldValues.prisnodlys * (1 + percentage)
      newFormData.prisnodlys = newValue.toFixed(2)
    }
    if (oldValues.prisekstern) {
      const newValue = oldValues.prisekstern * (1 + percentage)
      newFormData.prisekstern = newValue.toFixed(2)
    }
    if (oldValues.prisslukkeutstyr) {
      const newValue = oldValues.prisslukkeutstyr * (1 + percentage)
      newFormData.prisslukkeutstyr = newValue.toFixed(2)
    }
    if (oldValues.prisroykluker) {
      const newValue = oldValues.prisroykluker * (1 + percentage)
      newFormData.prisroykluker = newValue.toFixed(2)
    }

    setFormData(newFormData)
    setShowIndexModal(false)
    setIndexPercentage('')
    setIndexComment('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        anlegg_id: formData.anlegg_id,
        kundenummer: formData.kundenummer || null,
        prisbrannalarm: formData.prisbrannalarm ? parseFloat(formData.prisbrannalarm) : null,
        prisnodlys: formData.prisnodlys ? parseFloat(formData.prisnodlys) : null,
        prisekstern: formData.prisekstern ? parseFloat(formData.prisekstern) : null,
        prisslukkeutstyr: formData.prisslukkeutstyr ? parseFloat(formData.prisslukkeutstyr) : null,
        prisroykluker: formData.prisroykluker ? parseFloat(formData.prisroykluker) : null,
        kunde: formData.kunde || null,
      }

      if (pris) {
        // Update - historikk håndteres av database trigger
        const { error } = await supabase
          .from('priser_kundenummer')
          .update(dataToSave)
          .eq('id', pris.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('priser_kundenummer')
          .insert([dataToSave])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre pris')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {pris ? 'Rediger pris' : 'Ny pris'}
          </h1>
          <p className="text-gray-400 dark:text-gray-400">
            {pris ? 'Oppdater prisinformasjon' : 'Registrer ny pris'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Indeksregulering og Historikk knapper */}
        {pris && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Indeksregulering</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400">Juster alle priser med en prosentsats</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIndexModal(true)}
                className="btn-primary text-sm"
              >
                Indeksreguler
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Prishistorikk</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400">Se alle prisendringer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadPrisHistorikk}
                disabled={loadingHistory}
                className="btn-secondary text-sm"
              >
                {loadingHistory ? 'Laster...' : 'Vis historikk'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anlegg */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Anlegg <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.anlegg_id}
              onChange={(e) => setFormData({ ...formData, anlegg_id: e.target.value })}
              className="input"
              required
              disabled={!!pris || !!preselectedAnleggId}
            >
              <option value="">Velg anlegg</option>
              {anlegg.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.anleggsnavn}
                </option>
              ))}
            </select>
          </div>

          {/* Kundenummer */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kundenummer
            </label>
            <input
              type="text"
              value={formData.kundenummer}
              onChange={(e) => setFormData({ ...formData, kundenummer: e.target.value })}
              className="input bg-gray-50 dark:bg-dark-100"
              placeholder="Hentes automatisk fra anlegg"
              readOnly
            />
          </div>

          {/* Kunde */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kunde
            </label>
            <input
              type="text"
              value={formData.kunde}
              onChange={(e) => setFormData({ ...formData, kunde: e.target.value })}
              className="input bg-gray-50 dark:bg-dark-100"
              placeholder="Hentes automatisk fra anlegg"
              readOnly
            />
          </div>

          {/* Priser */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Brannalarm (kr)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.prisbrannalarm}
              onChange={(e) => setFormData({ ...formData, prisbrannalarm: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Nødlys (kr)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.prisnodlys}
              onChange={(e) => setFormData({ ...formData, prisnodlys: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Ekstern (kr)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.prisekstern}
              onChange={(e) => setFormData({ ...formData, prisekstern: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Slukkeutstyr (kr)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.prisslukkeutstyr}
              onChange={(e) => setFormData({ ...formData, prisslukkeutstyr: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Røykluker (kr)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.prisroykluker}
              onChange={(e) => setFormData({ ...formData, prisroykluker: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : pris ? 'Oppdater pris' : 'Opprett pris'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>

      {/* Indeksregulering Modal */}
      {showIndexModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-200 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Indeksregulering</h3>
                <p className="text-sm text-gray-400 dark:text-gray-400">Juster alle priser med en prosentsats</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                  Prosentsats (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={indexPercentage}
                  onChange={(e) => setIndexPercentage(e.target.value)}
                  className="input"
                  placeholder="F.eks. 3.5 for 3.5% økning"
                  autoFocus
                />
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  Bruk negativt tall for reduksjon (f.eks. -2.5)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                  Kommentar (valgfri)
                </label>
                <textarea
                  value={indexComment}
                  onChange={(e) => setIndexComment(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="F.eks. Årlig indeksregulering 2024"
                />
              </div>

              {/* Forhåndsvisning */}
              {indexPercentage && parseFloat(indexPercentage) !== 0 && (
                <div className="p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-400 mb-2">Forhåndsvisning:</p>
                  <div className="space-y-1 text-xs">
                    {formData.prisbrannalarm && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-gray-400">Brannalarm:</span>
                        <span className="text-gray-900 dark:text-white">
                          {parseFloat(formData.prisbrannalarm).toLocaleString('nb-NO')} kr → {(parseFloat(formData.prisbrannalarm) * (1 + parseFloat(indexPercentage) / 100)).toFixed(2)} kr
                        </span>
                      </div>
                    )}
                    {formData.prisnodlys && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-gray-400">Nødlys:</span>
                        <span className="text-gray-900 dark:text-white">
                          {parseFloat(formData.prisnodlys).toLocaleString('nb-NO')} kr → {(parseFloat(formData.prisnodlys) * (1 + parseFloat(indexPercentage) / 100)).toFixed(2)} kr
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleIndexRegulation}
                className="btn-primary flex-1"
              >
                Bruk regulering
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIndexModal(false)
                  setIndexPercentage('')
                  setIndexComment('')
                }}
                className="btn-secondary flex-1"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prishistorikk Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <History className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prishistorikk</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-400">
                    {anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {prisHistorikk.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 dark:text-gray-400">Ingen prisendringer registrert ennå</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prisHistorikk.map((historikk) => (
                    <div
                      key={historikk.id}
                      className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-500">
                            {historikk.felt_navn}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500">
                            {historikk.endrings_type}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-400">
                          {new Date(historikk.endret_dato).toLocaleString('nb-NO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 dark:text-gray-400 mb-1">Gammel verdi</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {historikk.gammel_verdi !== null 
                              ? `${historikk.gammel_verdi.toLocaleString('nb-NO')} kr` 
                              : '-'}
                          </p>
                        </div>
                        <div className="text-gray-400 dark:text-gray-400">→</div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 dark:text-gray-400 mb-1">Ny verdi</p>
                          <p className="text-sm font-medium text-green-500">
                            {historikk.ny_verdi !== null 
                              ? `${historikk.ny_verdi.toLocaleString('nb-NO')} kr` 
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {historikk.kommentar && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-400 dark:text-gray-400 mb-1">Kommentar</p>
                          <p className="text-sm text-gray-900 dark:text-white">{historikk.kommentar}</p>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-400 dark:text-gray-400">
                        Endret av: {historikk.endret_av}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn-secondary w-full"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
