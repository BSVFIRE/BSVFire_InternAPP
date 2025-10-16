import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Save, Trash2, Wind, Search, ChevronDown, ChevronRight } from 'lucide-react'

interface RoyklukeSentral {
  id?: string
  anlegg_id: string
  anlegg_type?: string | null
  sentral_nr?: number | null
  plassering?: string | null
  status?: string | null
  batteri_v?: string | null
  batteri_ah?: string | null
  manuell_utlos?: boolean | null
  funksjonsteste?: boolean | null
  service_resatt?: boolean | null
  batteri_alder?: number | null
  created_at?: string
}

interface RoyklukeLuke {
  id?: string
  sentral_id?: string | null
  luke_type?: string | null
  funksjonstest?: boolean | null
  status?: string | null
  skader?: string | null
  plassering?: string | null
  Koblet_til?: string | null
  created_at?: string
}

interface SentralerViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
}

const statusAlternativer = ['OK', 'Avvik', 'Ikke funnet', 'Defekt']

export function SentralerView({ anleggId, kundeNavn, anleggNavn }: SentralerViewProps) {
  const [sentraler, setSentraler] = useState<RoyklukeSentral[]>([])
  const [luker, setLuker] = useState<RoyklukeLuke[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSentral, setExpandedSentral] = useState<string | null>(null)
  const [editingSentral, setEditingSentral] = useState<string | null>(null)
  const [showTypeDialog, setShowTypeDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [anleggId])

  async function loadData() {
    try {
      setLoading(true)
      
      const { data: sentralData, error: sentralError } = await supabase
        .from('roykluke_sentraler')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('sentral_nr', { ascending: true })

      if (sentralError) throw sentralError
      setSentraler(sentralData || [])

      // Hent kun luker som tilhører sentraler for dette anlegget
      const sentralIds = sentralData?.map(s => s.id) || []
      
      if (sentralIds.length > 0) {
        const { data: lukerData, error: lukerError } = await supabase
          .from('roykluke_luker')
          .select('*')
          .in('sentral_id', sentralIds)
          .order('plassering', { ascending: true })

        if (lukerError) throw lukerError
        setLuker(lukerData || [])
      } else {
        setLuker([])
      }
    } catch (error) {
      console.error('Feil ved lasting av data:', error)
      alert('Kunne ikke laste røyklukedata')
    } finally {
      setLoading(false)
    }
  }

  async function leggTilSentral(type: 'Branngardin' | 'Røykluker') {
    const nySentral = {
      anlegg_id: anleggId,
      anlegg_type: type,
      sentral_nr: null,
      plassering: '',
      status: 'OK'
    }

    try {
      const { data, error } = await supabase
        .from('roykluke_sentraler')
        .insert([nySentral])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setSentraler([...sentraler, data])
      setEditingSentral(data.id!)
      setShowTypeDialog(false)
    } catch (error: any) {
      console.error('Feil ved opprettelse av sentral:', error)
      alert(`Kunne ikke opprette sentral: ${error?.message || 'Ukjent feil'}`)
    }
  }

  async function lagreSentral(sentral: RoyklukeSentral) {
    if (!sentral.id) return

    try {
      const { error } = await supabase
        .from('roykluke_sentraler')
        .update(sentral)
        .eq('id', sentral.id)

      if (error) throw error
      setEditingSentral(null)
    } catch (error) {
      console.error('Feil ved lagring av sentral:', error)
      alert('Kunne ikke lagre sentral')
    }
  }

  async function slettSentral(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne sentralen?')) return

    try {
      const { error } = await supabase
        .from('roykluke_sentraler')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette sentral')
    }
  }

  async function leggTilLuke(sentralId: string) {
    // Finn sentralen for å arve type
    const sentral = sentraler.find(s => s.id === sentralId)
    
    const nyLuke: RoyklukeLuke = {
      sentral_id: sentralId,
      luke_type: sentral?.anlegg_type || 'Branngardin',
      plassering: '',
      status: 'OK',
      skader: '',
      funksjonstest: false,
      Koblet_til: ''
    }

    try {
      const { data, error } = await supabase
        .from('roykluke_luker')
        .insert([nyLuke])
        .select()
        .single()

      if (error) throw error
      setLuker([...luker, data])
    } catch (error) {
      console.error('Feil ved opprettelse av luke:', error)
      alert('Kunne ikke opprette luke')
    }
  }

  async function lagreLuke(luke: RoyklukeLuke) {
    if (!luke.id) return

    try {
      const { error } = await supabase
        .from('roykluke_luker')
        .update(luke)
        .eq('id', luke.id)

      if (error) throw error
    } catch (error) {
      console.error('Feil ved lagring av luke:', error)
      alert('Kunne ikke lagre luke')
    }
  }

  async function slettLuke(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne luka?')) return

    try {
      const { error } = await supabase
        .from('roykluke_luker')
        .delete()
        .eq('id', id)

      if (error) throw error
      setLuker(luker.filter(l => l.id !== id))
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette luke')
    }
  }

  function updateSentral(id: string, field: keyof RoyklukeSentral, value: any) {
    setSentraler(sentraler.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  function updateLuke(id: string, field: keyof RoyklukeLuke, value: any) {
    setLuker(luker.map(l => 
      l.id === id ? { ...l, [field]: value } : l
    ))
  }

  function getLukerForSentral(sentralId: string) {
    return luker.filter(l => l.sentral_id === sentralId)
  }

  const filteredSentraler = sentraler.filter(sentral => {
    const search = searchTerm.toLowerCase()
    return (
      String(sentral.sentral_nr || '').toLowerCase().includes(search) ||
      sentral.plassering?.toLowerCase().includes(search) ||
      sentral.status?.toLowerCase().includes(search)
    )
  })

  const stats = {
    totaltSentraler: sentraler.length,
    totaltLuker: luker.length,
    lukerOk: luker.filter(l => l.status === 'OK').length,
    lukerAvvik: luker.filter(l => l.status === 'Avvik').length,
  }

  if (loading && sentraler.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laster røykluker...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Sentraler og Luker</h2>
        <p className="text-gray-400">{kundeNavn} - {anleggNavn}</p>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-blue-500/10 border-blue-500/20">
          <div className="text-sm text-gray-400">Sentraler</div>
          <div className="text-2xl font-bold text-blue-400">{stats.totaltSentraler}</div>
        </div>
        <div className="card bg-purple-500/10 border-purple-500/20">
          <div className="text-sm text-gray-400">Luker totalt</div>
          <div className="text-2xl font-bold text-purple-400">{stats.totaltLuker}</div>
        </div>
        <div className="card bg-green-500/10 border-green-500/20">
          <div className="text-sm text-gray-400">Luker OK</div>
          <div className="text-2xl font-bold text-green-400">{stats.lukerOk}</div>
        </div>
        <div className="card bg-yellow-500/10 border-yellow-500/20">
          <div className="text-sm text-gray-400">Luker Avvik</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.lukerAvvik}</div>
        </div>
      </div>

      {/* Verktøylinje */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Søk etter sentraler..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <button onClick={() => setShowTypeDialog(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Ny sentral
          </button>
        </div>
      </div>

      {/* Type valg dialog */}
      {showTypeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Velg type anlegg</h3>
            <div className="space-y-3">
              <button
                onClick={() => leggTilSentral('Branngardin')}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-900">Branngardin</div>
                <div className="text-sm text-gray-700">Opprett sentral for branngardin</div>
              </button>
              <button
                onClick={() => leggTilSentral('Røykluker')}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-900">Røykluker</div>
                <div className="text-sm text-gray-700">Opprett sentral for røykluker</div>
              </button>
            </div>
            <button
              onClick={() => setShowTypeDialog(false)}
              className="w-full mt-4 btn-secondary"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Sentraler liste */}
      <div className="space-y-4">
        {filteredSentraler.map((sentral) => {
          const sentralLuker = getLukerForSentral(sentral.id!)
          const isExpanded = expandedSentral === sentral.id
          const isEditing = editingSentral === sentral.id

          return (
            <div key={sentral.id} className="card">
              {/* Sentral header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => setExpandedSentral(isExpanded ? null : sentral.id!)}
                    className="p-1 hover:bg-dark-100 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <Wind className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      Sentral {sentral.sentral_nr || 'Uten nr'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {sentral.plassering || 'Ingen plassering'} • {sentralLuker.length} luker
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => lagreSentral(sentral)}
                      className="btn-primary btn-sm"
                    >
                      <Save className="w-4 h-4" />
                      Lagre
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingSentral(sentral.id!)}
                      className="btn-secondary btn-sm"
                    >
                      Rediger
                    </button>
                  )}
                  <button
                    onClick={() => slettSentral(sentral.id!)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sentral detaljer */}
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-dark-100 rounded-lg">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Sentral nr</label>
                    <input
                      type="number"
                      value={sentral.sentral_nr || ''}
                      onChange={(e) => updateSentral(sentral.id!, 'sentral_nr', parseInt(e.target.value) || null)}
                      className="input input-sm"
                      placeholder="Nr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select
                      value={sentral.status || ''}
                      onChange={(e) => updateSentral(sentral.id!, 'status', e.target.value)}
                      className="input input-sm"
                    >
                      {statusAlternativer.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Batteri alder (år)</label>
                    <input
                      type="number"
                      value={sentral.batteri_alder || ''}
                      onChange={(e) => updateSentral(sentral.id!, 'batteri_alder', parseInt(e.target.value) || null)}
                      className="input input-sm"
                      placeholder="År"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Batteri V</label>
                    <input
                      type="text"
                      value={sentral.batteri_v || ''}
                      onChange={(e) => updateSentral(sentral.id!, 'batteri_v', e.target.value)}
                      className="input input-sm"
                      placeholder="12V"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Batteri Ah</label>
                    <input
                      type="text"
                      value={sentral.batteri_ah || ''}
                      onChange={(e) => updateSentral(sentral.id!, 'batteri_ah', e.target.value)}
                      className="input input-sm"
                      placeholder="7Ah"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sentral.manuell_utlos || false}
                        onChange={(e) => updateSentral(sentral.id!, 'manuell_utlos', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-300">Manuell utløs</span>
                    </label>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-400 mb-1">Plassering</label>
                    <input
                      type="text"
                      value={sentral.plassering || ''}
                      onChange={(e) => updateSentral(sentral.id!, 'plassering', e.target.value)}
                      className="input input-sm"
                      placeholder="Plassering"
                    />
                  </div>
                </div>
              )}

              {/* Luker */}
              {isExpanded && (
                <div className="border-t border-dark-100 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300">Luker</h4>
                    <button
                      onClick={() => leggTilLuke(sentral.id!)}
                      className="btn-secondary btn-sm"
                    >
                      <Plus className="w-3 h-3" />
                      Legg til luke
                    </button>
                  </div>

                  {sentralLuker.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Ingen luker registrert
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sentralLuker.map((luke) => (
                        <div
                          key={luke.id}
                          className="p-3 bg-dark-100 rounded-lg flex items-center gap-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 flex-1">
                            <input
                              type="text"
                              value={luke.plassering || ''}
                              onChange={(e) => updateLuke(luke.id!, 'plassering', e.target.value)}
                              onBlur={() => lagreLuke(luke)}
                              className="input input-sm md:col-span-2"
                              placeholder="Plassering"
                            />
                            <select
                              value={luke.status || ''}
                              onChange={(e) => {
                                updateLuke(luke.id!, 'status', e.target.value)
                                lagreLuke({ ...luke, status: e.target.value })
                              }}
                              className={`input input-sm ${
                                luke.status === 'OK' ? 'text-green-400' :
                                luke.status === 'Avvik' ? 'text-yellow-400' :
                                'text-gray-400'
                              }`}
                            >
                              {statusAlternativer.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={luke.skader || ''}
                              onChange={(e) => updateLuke(luke.id!, 'skader', e.target.value)}
                              onBlur={() => lagreLuke(luke)}
                              className="input input-sm"
                              placeholder="Skader"
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={luke.funksjonstest || false}
                                onChange={(e) => {
                                  updateLuke(luke.id!, 'funksjonstest', e.target.checked)
                                  lagreLuke({ ...luke, funksjonstest: e.target.checked })
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-300">Funksjonstest</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => lagreLuke(luke)}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                              title="Lagre luke"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => slettLuke(luke.id!)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Slett luke"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredSentraler.length === 0 && (
          <div className="card text-center py-12">
            <Wind className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Ingen sentraler funnet</p>
            <p className="text-sm text-gray-500 mt-2">Legg til en ny sentral for å komme i gang</p>
          </div>
        )}
      </div>
    </div>
  )
}
