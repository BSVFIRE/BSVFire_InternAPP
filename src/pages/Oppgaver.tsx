import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, CheckSquare, Building2, User, Eye, Trash2, Calendar, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Oppgave {
  id: string
  oppgave_nummer: string
  kunde_id: string | null
  anlegg_id: string | null
  tekniker_id: string | null
  ordre_id: string | null
  prosjekt_id: string | null
  type: string
  prioritet: string | null
  status: string
  beskrivelse: string | null
  created_at: string
}

interface OppgaveMedDetaljer extends Oppgave {
  customer: {
    navn: string
  } | null
  anlegg: {
    anleggsnavn: string
  } | null
  tekniker: {
    navn: string
  } | null
  ordre: {
    type: string
  } | null
}

type SortOption = 'dato_nyeste' | 'dato_eldste' | 'prioritet' | 'status' | 'type'

const statusColors: Record<string, string> = {
  'Ikke påbegynt': 'bg-gray-900/30 text-gray-400 border-gray-800',
  'Pågående': 'bg-blue-900/30 text-blue-400 border-blue-800',
  'Fullført': 'bg-green-900/30 text-green-400 border-green-800',
}

const prioritetColors: Record<string, string> = {
  'Lav': 'bg-gray-900/30 text-gray-400 border-gray-800',
  'Medium': 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  'Høy': 'bg-red-900/30 text-red-400 border-red-800',
}

interface Tekniker {
  id: string
  navn: string
}

// Funksjon for å konvertere navn til initialer
function getInitials(navn: string): string {
  const initialMap: Record<string, string> = {
    'Erik Sebastian Skille': 'ESS',
    'Pål Gunnar Kåsa': 'PGK',
    'Kristoffer Skår': 'KS',
    'Vegard Ness': 'VN',
    'Martin Kyte': 'MK'
  }
  
  return initialMap[navn] || navn.split(' ').map(n => n[0]).join('').toUpperCase()
}

export function Oppgaver() {
  const [oppgaver, setOppgaver] = useState<OppgaveMedDetaljer[]>([])
  const [teknikere, setTeknikere] = useState<Tekniker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOppgave, setSelectedOppgave] = useState<OppgaveMedDetaljer | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list')
  const [sortBy, setSortBy] = useState<SortOption>('dato_nyeste')
  const [filterStatus, setFilterStatus] = useState<string>('alle')
  const [filterPrioritet, setFilterPrioritet] = useState<string>('alle')
  const [filterTekniker, setFilterTekniker] = useState<string>('alle')

  useEffect(() => {
    loadOppgaver()
  }, [])

  async function loadOppgaver() {
    try {
      setError(null)
      
      const [oppgaverResponse, teknikereResponse] = await Promise.all([
        supabase
          .from('oppgaver')
          .select(`
            *,
            customer:kunde_id(navn),
            anlegg:anlegg_id(anleggsnavn),
            tekniker:tekniker_id(navn),
            ordre:ordre_id(type)
          `)
          .order('oppgave_nummer', { ascending: false }),
        supabase
          .from('ansatte')
          .select('id, navn')
          .order('navn', { ascending: true })
      ])

      if (oppgaverResponse.error) throw new Error(oppgaverResponse.error.message)
      if (teknikereResponse.error) throw new Error(teknikereResponse.error.message)

      setOppgaver(oppgaverResponse.data || [])
      setTeknikere(teknikereResponse.data || [])
    } catch (err) {
      console.error('Feil ved lasting:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste oppgaver')
    } finally {
      setLoading(false)
    }
  }

  async function deleteOppgave(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne oppgaven?')) return

    try {
      const { error } = await supabase
        .from('oppgaver')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadOppgaver()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette oppgave')
    }
  }

  const filteredOppgaver = oppgaver.filter(o => {
    const matchesSearch = 
      o.oppgave_nummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.beskrivelse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.anlegg?.anleggsnavn.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'alle' || o.status === filterStatus
    const matchesPrioritet = filterPrioritet === 'alle' || o.prioritet === filterPrioritet
    const matchesTekniker = 
      filterTekniker === 'alle' || 
      (filterTekniker === 'ikke_tildelt' && !o.tekniker_id) ||
      o.tekniker_id === filterTekniker

    return matchesSearch && matchesStatus && matchesPrioritet && matchesTekniker
  })

  // Sortering
  const sortedOppgaver = [...filteredOppgaver].sort((a, b) => {
    switch (sortBy) {
      case 'dato_nyeste':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'dato_eldste':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'prioritet':
        const prioritetOrder: Record<string, number> = { 'Høy': 1, 'Medium': 2, 'Lav': 3 }
        return (prioritetOrder[a.prioritet || 'Lav'] || 4) - (prioritetOrder[b.prioritet || 'Lav'] || 4)
      case 'status':
        return a.status.localeCompare(b.status, 'nb-NO')
      case 'type':
        return a.type.localeCompare(b.type, 'nb-NO')
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Laster oppgaver...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Oppgaver</h1>
          <p className="text-gray-400">Administrer oppgaver</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <CheckSquare className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste oppgaver</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadOppgaver} className="btn-primary text-sm">
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
      <OppgaveForm
        oppgave={selectedOppgave}
        onSave={async () => {
          await loadOppgaver()
          setViewMode('list')
          setSelectedOppgave(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedOppgave(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedOppgave) {
    return (
      <OppgaveDetails
        oppgave={selectedOppgave}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedOppgave(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Oppgaver</h1>
          <p className="text-gray-400">Administrer arbeidsoppgaver</p>
        </div>
        <button
          onClick={() => {
            setSelectedOppgave(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ny oppgave
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter oppgave, kunde, anlegg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="alle">Alle statuser</option>
              <option value="Ikke påbegynt">Ikke påbegynt</option>
              <option value="Pågående">Pågående</option>
              <option value="Fullført">Fullført</option>
            </select>
            <select
              value={filterPrioritet}
              onChange={(e) => setFilterPrioritet(e.target.value)}
              className="input"
            >
              <option value="alle">Alle prioriteter</option>
              <option value="Høy">Høy</option>
              <option value="Medium">Medium</option>
              <option value="Lav">Lav</option>
            </select>
            <select
              value={filterTekniker}
              onChange={(e) => setFilterTekniker(e.target.value)}
              className="input"
            >
              <option value="alle">Alle teknikere</option>
              <option value="ikke_tildelt">Ikke tildelt</option>
              {teknikere.map((tekniker) => (
                <option key={tekniker.id} value={tekniker.id}>
                  {tekniker.navn}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input"
            >
              <option value="dato_nyeste">Nyeste først</option>
              <option value="dato_eldste">Eldste først</option>
              <option value="prioritet">Prioritet</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <CheckSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Totalt oppgaver</p>
              <p className="text-2xl font-bold text-white">{oppgaver.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <Calendar className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ikke påbegynt</p>
              <p className="text-2xl font-bold text-white">
                {oppgaver.filter(o => o.status === 'Ikke påbegynt').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <CheckSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pågående</p>
              <p className="text-2xl font-bold text-white">
                {oppgaver.filter(o => o.status === 'Pågående').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Fullført</p>
              <p className="text-2xl font-bold text-white">
                {oppgaver.filter(o => o.status === 'Fullført').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Oppgave Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Oppgaveliste
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({sortedOppgaver.length} {sortedOppgaver.length === 1 ? 'oppgave' : 'oppgaver'})
            </span>
          </h2>
        </div>
        
        {sortedOppgaver.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm || filterStatus !== 'alle' || filterPrioritet !== 'alle' || filterTekniker !== 'alle'
                ? 'Ingen oppgaver funnet'
                : 'Ingen oppgaver registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Oppgavenr</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Kunde/Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Tekniker</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Prioritet</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedOppgaver.map((oppgave) => (
                  <tr
                    key={oppgave.id}
                    className="border-b border-gray-800 hover:bg-dark-100 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="text-primary font-mono font-medium text-sm">
                        {oppgave.oppgave_nummer}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <CheckSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{oppgave.type}</p>
                          {oppgave.beskrivelse && (
                            <p className="text-sm text-gray-400 truncate max-w-xs">
                              {oppgave.beskrivelse}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {oppgave.customer && (
                          <p className="text-gray-300">{oppgave.customer.navn}</p>
                        )}
                        {oppgave.anlegg && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Building2 className="w-3 h-3" />
                            {oppgave.anlegg.anleggsnavn}
                          </div>
                        )}
                        {!oppgave.customer && !oppgave.anlegg && (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {oppgave.tekniker ? (
                        <div className="flex items-center gap-2 text-gray-300">
                          <User className="w-4 h-4 text-gray-500" />
                          <span title={oppgave.tekniker.navn}>{getInitials(oppgave.tekniker.navn)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Ikke tildelt</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {oppgave.prioritet ? (
                        <span className={`badge ${prioritetColors[oppgave.prioritet] || 'badge-info'}`}>
                          {oppgave.prioritet}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${statusColors[oppgave.status] || 'badge-info'}`}>
                        {oppgave.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {formatDate(oppgave.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedOppgave(oppgave)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOppgave(oppgave)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteOppgave(oppgave.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

// Oppgave Form Component
interface OppgaveFormProps {
  oppgave: OppgaveMedDetaljer | null
  onSave: () => void
  onCancel: () => void
}

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
}

function OppgaveForm({ oppgave, onSave, onCancel }: OppgaveFormProps) {
  const [formData, setFormData] = useState({
    type: oppgave?.type || '',
    kunde_id: oppgave?.kunde_id || '',
    anlegg_id: oppgave?.anlegg_id || '',
    tekniker_id: oppgave?.tekniker_id || '',
    prioritet: oppgave?.prioritet || '',
    status: oppgave?.status || 'Ikke påbegynt',
    beskrivelse: oppgave?.beskrivelse || '',
  })
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [teknikere, setTeknikere] = useState<Tekniker[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [erIntern, setErIntern] = useState(oppgave?.type === 'Internt')
  const [kanRedigereKundeAnlegg, setKanRedigereKundeAnlegg] = useState(!oppgave)

  const oppgavetyper = ['Faktura', 'Regnskap', 'Internt', 'Bestilling', 'Befaring', 'FG-Registrering', 'Dokumentasjon', 'DAC Underlag', 'Oppfølging']
  const prioriteter = ['Lav', 'Medium', 'Høy']
  const statuser = ['Ikke påbegynt', 'Pågående', 'Fullført']

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [kunderRes, teknikereRes] = await Promise.all([
        supabase.from('customer').select('id, navn').order('navn'),
        supabase.from('ansatte').select('id, navn').order('navn')
      ])

      if (kunderRes.data) setKunder(kunderRes.data)
      if (teknikereRes.data) setTeknikere(teknikereRes.data)

      if (formData.kunde_id) {
        await loadAnlegg(formData.kunde_id)
      }
    } catch (error) {
      console.error('Feil ved lasting:', error)
    } finally {
      setLoading(false)
    }
  }

  // Finn kundenavn og anleggsnavn for visning
  const kundeNavn = kunder.find(k => k.id === formData.kunde_id)?.navn || oppgave?.customer?.navn || ''
  const anleggNavn = anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn || oppgave?.anlegg?.anleggsnavn || ''

  async function loadAnlegg(kundeId: string) {
    try {
      const { data } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (data) {
        setAnlegg(data)
        if (data.length === 1) {
          setFormData(prev => ({ ...prev, anlegg_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        type: formData.type,
        kunde_id: formData.kunde_id || null,
        anlegg_id: formData.anlegg_id || null,
        tekniker_id: formData.tekniker_id || null,
        prioritet: formData.prioritet || null,
        status: formData.status,
        beskrivelse: formData.beskrivelse || null,
      }

      if (oppgave) {
        const { error } = await supabase
          .from('oppgaver')
          .update(dataToSave)
          .eq('id', oppgave.id)

        if (error) throw error

        // Hvis fakturaoppgave settes til Fullført, oppdater tilhørende ordre til Fakturert
        if (
          formData.type === 'Faktura' && 
          formData.status === 'Fullført' && 
          oppgave.status !== 'Fullført' &&
          oppgave.ordre_id
        ) {
          const { error: ordreError } = await supabase
            .from('ordre')
            .update({ status: 'Fakturert' })
            .eq('id', oppgave.ordre_id)

          if (ordreError) {
            console.error('Feil ved oppdatering av ordre:', ordreError)
            // Fortsett likevel, oppgaven er lagret
          }
        }
      } else {
        const { error } = await supabase
          .from('oppgaver')
          .insert([{ ...dataToSave, created_at: new Date().toISOString() }])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre oppgave')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {oppgave ? 'Rediger oppgave' : 'Ny oppgave'}
          </h1>
          <p className="text-gray-400">
            {oppgave ? 'Oppdater oppgaveinformasjon' : 'Opprett ny arbeidsoppgave'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => {
                const isIntern = e.target.value === 'Internt'
                setFormData({ 
                  ...formData, 
                  type: e.target.value,
                  kunde_id: isIntern ? '' : formData.kunde_id,
                  anlegg_id: isIntern ? '' : formData.anlegg_id
                })
                setErIntern(isIntern)
                if (isIntern) {
                  setAnlegg([])
                }
              }}
              className="input"
              required
            >
              <option value="">Velg type</option>
              {oppgavetyper.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
              required
            >
              {statuser.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Prioritet */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prioritet
            </label>
            <select
              value={formData.prioritet}
              onChange={(e) => setFormData({ ...formData, prioritet: e.target.value })}
              className="input"
            >
              <option value="">Velg prioritet</option>
              {prioriteter.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Tekniker */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tekniker
            </label>
            <select
              value={formData.tekniker_id}
              onChange={(e) => setFormData({ ...formData, tekniker_id: e.target.value })}
              className="input"
            >
              <option value="">Ikke tildelt</option>
              {teknikere.map((t) => (
                <option key={t.id} value={t.id}>{t.navn}</option>
              ))}
            </select>
          </div>

          {/* Kunde */}
          {!erIntern && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Kunde (valgfritt)
                </label>
                {oppgave && !kanRedigereKundeAnlegg && (
                  <button
                    type="button"
                    onClick={() => setKanRedigereKundeAnlegg(true)}
                    className="text-xs text-primary hover:text-primary-400 flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Rediger kunde/anlegg
                  </button>
                )}
              </div>
              {oppgave && !kanRedigereKundeAnlegg ? (
                <div className="input bg-dark-100 text-white">
                  {kundeNavn || 'Ingen kunde'}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Søk etter kunde..."
                    value={kundeSok}
                    onChange={(e) => setKundeSok(e.target.value)}
                    className="input"
                  />
                  <select
                    value={formData.kunde_id}
                    onChange={(e) => {
                      setFormData({ ...formData, kunde_id: e.target.value, anlegg_id: '' })
                      setAnlegg([])
                      if (e.target.value) loadAnlegg(e.target.value)
                    }}
                    className="input"
                    size={Math.min(kunder.filter(k => 
                      k.navn.toLowerCase().includes(kundeSok.toLowerCase())
                    ).length + 1, 8)}
                  >
                    <option value="">Ingen kunde</option>
                    {kunder
                      .filter(k => k.navn.toLowerCase().includes(kundeSok.toLowerCase()))
                      .map((kunde) => (
                        <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Anlegg */}
          {!erIntern && formData.kunde_id && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Anlegg (valgfritt)
              </label>
              {oppgave && !kanRedigereKundeAnlegg ? (
                <div className="input bg-dark-100 text-white">
                  {anleggNavn || 'Ingen anlegg'}
                </div>
              ) : anlegg.length === 0 ? (
                <div className="input bg-dark-100 text-gray-500">
                  Ingen anlegg funnet for denne kunden
                </div>
              ) : anlegg.length === 1 ? (
                <div className="input bg-dark-100 text-white">
                  {anlegg[0].anleggsnavn} (automatisk valgt)
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
                    value={formData.anlegg_id}
                    onChange={(e) => setFormData({ ...formData, anlegg_id: e.target.value })}
                    className="input"
                    size={Math.min(anlegg.filter(a => 
                      a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
                    ).length + 1, 8)}
                  >
                    <option value="">Ingen anlegg</option>
                    {anlegg
                      .filter(a => a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase()))
                      .map((a) => (
                        <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Beskrivelse */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={formData.beskrivelse}
              onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
              className="input"
              rows={4}
              placeholder="Beskriv oppgaven..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : oppgave ? 'Oppdater oppgave' : 'Opprett oppgave'}
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
    </div>
  )
}

// Oppgave Details Component
interface OppgaveDetailsProps {
  oppgave: OppgaveMedDetaljer
  onEdit: () => void
  onClose: () => void
}

function OppgaveDetails({ oppgave, onEdit, onClose }: OppgaveDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{oppgave.type}</h1>
          <p className="text-gray-400">
            {oppgave.customer?.navn || 'Ingen kunde'} 
            {oppgave.anlegg && ` - ${oppgave.anlegg.anleggsnavn}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
          <button onClick={onClose} className="btn-secondary">
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Oppgaveinformasjon</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Type</p>
                <p className="text-white">{oppgave.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <span className={`badge ${statusColors[oppgave.status] || 'badge-info'}`}>
                  {oppgave.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Prioritet</p>
                {oppgave.prioritet ? (
                  <span className={`badge ${prioritetColors[oppgave.prioritet] || 'badge-info'}`}>
                    {oppgave.prioritet}
                  </span>
                ) : (
                  <span className="text-gray-500">Ikke satt</span>
                )}
              </div>
              {oppgave.beskrivelse && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Beskrivelse</p>
                  <p className="text-white">{oppgave.beskrivelse}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400 mb-1">Kunde</p>
                <p className="text-white">{oppgave.customer?.navn || 'Ingen kunde'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Anlegg</p>
                <p className="text-white">{oppgave.anlegg?.anleggsnavn || 'Ingen anlegg'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Tekniker</p>
                <p className="text-white">{oppgave.tekniker?.navn || 'Ikke tildelt'}</p>
              </div>
              {oppgave.ordre && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Tilknyttet ordre</p>
                  <p className="text-white">{oppgave.ordre.type}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Opprettet</p>
                <p className="text-white text-sm">{formatDate(oppgave.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
