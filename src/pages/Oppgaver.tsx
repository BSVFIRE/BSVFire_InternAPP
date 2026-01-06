import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Plus, Search, CheckSquare, Building2, User, Eye, Trash2, Calendar, Edit, LayoutGrid, Table } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { OPPGAVE_STATUSER, OPPGAVE_STATUS_COLORS, PRIORITETER, PRIORITET_COLORS } from '@/lib/constants'

interface Oppgave {
  id: string
  oppgave_nummer: string
  kunde_id: string | null
  anlegg_id: string | null
  tekniker_id: string | null
  ordre_id: string | null
  prosjekt_id: string | null
  kontaktperson: string | null
  type: string
  tittel: string | null
  prioritet: string | null
  status: string
  beskrivelse: string | null
  forfallsdato: string | null
  opprettet_dato: string
  sist_oppdatert: string | null
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
  const location = useLocation()
  const { user } = useAuthStore()
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
  const [filterTekniker, setFilterTekniker] = useState<string>('')
  const [inkluderFullforte, setInkluderFullforte] = useState(false)
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table'
  })

  useEffect(() => {
    loadOppgaver()
  }, [])

  // Sett tekniker-filter til innlogget bruker som default
  useEffect(() => {
    async function setDefaultTekniker() {
      if (!user?.email) return
      
      try {
        const { data: ansatt } = await supabase
          .from('ansatte')
          .select('id')
          .eq('epost', user.email)
          .single()
        
        if (ansatt) {
          setFilterTekniker(ansatt.id)
        }
      } catch (error) {
        console.log('Kunne ikke finne ansatt for bruker:', error)
        setFilterTekniker('alle')
      }
    }
    
    setDefaultTekniker()
  }, [user])

  // Håndter navigasjon fra Dashboard
  useEffect(() => {
    const state = location.state as { selectedOppgaveId?: string } | null
    if (state?.selectedOppgaveId && oppgaver.length > 0) {
      const oppgave = oppgaver.find(o => o.id === state.selectedOppgaveId)
      if (oppgave) {
        setSelectedOppgave(oppgave)
        setViewMode('edit')
      }
    }
  }, [location.state, oppgaver])

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

  // Marker oppgave som sett av tekniker
  async function markerOppgaveSomSett(oppgaveId: string) {
    try {
      await supabase
        .from('oppgaver')
        .update({ 
          sett_av_tekniker: true, 
          sett_dato: new Date().toISOString() 
        })
        .eq('id', oppgaveId)
    } catch (error) {
      // Ignorer feil hvis kolonnen ikke finnes ennå
      console.log('Kunne ikke markere oppgave som sett:', error)
    }
  }

  // Åpne oppgave og marker som sett
  function openOppgave(oppgaveItem: OppgaveMedDetaljer) {
    setSelectedOppgave(oppgaveItem)
    setViewMode('view')
    markerOppgaveSomSett(oppgaveItem.id)
  }

  const filteredOppgaver = oppgaver.filter(o => {
    const matchesSearch = 
      o.oppgave_nummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.tittel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.beskrivelse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.anlegg?.anleggsnavn.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'alle' || o.status === filterStatus
    const matchesPrioritet = filterPrioritet === 'alle' || o.prioritet === filterPrioritet
    const matchesTekniker = 
      filterTekniker === 'alle' || 
      (filterTekniker === 'ikke_tildelt' && !o.tekniker_id) ||
      o.tekniker_id === filterTekniker

    // Skjul fullførte oppgaver som standard
    const isFullfort = o.status === 'Fullført'
    const shouldShow = !isFullfort || inkluderFullforte

    return matchesSearch && matchesStatus && matchesPrioritet && matchesTekniker && shouldShow
  })

  // Sortering
  const sortedOppgaver = [...filteredOppgaver].sort((a, b) => {
    switch (sortBy) {
      case 'dato_nyeste':
        return new Date(b.opprettet_dato).getTime() - new Date(a.opprettet_dato).getTime()
      case 'dato_eldste':
        return new Date(a.opprettet_dato).getTime() - new Date(b.opprettet_dato).getTime()
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
          <p className="text-gray-400 dark:text-gray-400">Laster oppgaver...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Oppgaver</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer oppgaver</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Oppgaver</h1>
          <p className="text-sm sm:text-base text-gray-400 dark:text-gray-400">Administrer arbeidsoppgaver</p>
        </div>
        <button
          onClick={() => {
            setSelectedOppgave(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Ny oppgave
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
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
              {Object.values(OPPGAVE_STATUSER).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={filterPrioritet}
              onChange={(e) => setFilterPrioritet(e.target.value)}
              className="input"
            >
              <option value="alle">Alle prioriteter</option>
              {Object.values(PRIORITETER).map(prioritet => (
                <option key={prioritet} value={prioritet}>{prioritet}</option>
              ))}
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

          {/* Checkboks for å inkludere fullførte */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inkluderFullforte}
                onChange={(e) => setInkluderFullforte(e.target.checked)}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Inkluder fullførte</span>
            </label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Totalt oppgaver</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{oppgaver.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-gray-500/10 rounded-lg flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Ikke påbegynt</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {oppgaver.filter(o => o.status === 'Ikke påbegynt').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg flex-shrink-0">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Pågående</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {oppgaver.filter(o => o.status === OPPGAVE_STATUSER.PAGAENDE).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Fullført</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {oppgaver.filter(o => o.status === OPPGAVE_STATUSER.FULLFORT).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Oppgave Liste */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Oppgaveliste
            <span className="ml-2 text-xs sm:text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({sortedOppgaver.length} {sortedOppgaver.length === 1 ? 'oppgave' : 'oppgaver'})
            </span>
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-100 rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('table')}
              className={`p-2 rounded transition-colors ${
                displayMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Tabellvisning"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('cards')}
              className={`p-2 rounded transition-colors ${
                displayMode === 'cards'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Kortvisning"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {sortedOppgaver.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm || filterStatus !== 'alle' || filterPrioritet !== 'alle' || filterTekniker !== 'alle'
                ? 'Ingen oppgaver funnet'
                : 'Ingen oppgaver registrert ennå'}
            </p>
          </div>
        ) : displayMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOppgaver.map((oppgave) => (
              <div
                key={oppgave.id}
                onClick={() => {
                  setSelectedOppgave(oppgave)
                  setViewMode('edit')
                }}
                className="bg-gray-50 dark:bg-dark-100 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-primary font-mono font-medium text-sm truncate">{oppgave.oppgave_nummer}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{oppgave.type}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <span className={`badge text-xs ${OPPGAVE_STATUS_COLORS[oppgave.status] || 'badge-info'}`}>
                      {oppgave.status}
                    </span>
                    {oppgave.prioritet && (
                      <span className={`badge text-xs ${PRIORITET_COLORS[oppgave.prioritet] || 'badge-info'}`}>
                        {oppgave.prioritet}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {oppgave.beskrivelse && (
                    <p className="text-gray-500 dark:text-gray-300 text-xs line-clamp-2">
                      {oppgave.beskrivelse}
                    </p>
                  )}
                  {oppgave.customer && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{oppgave.customer.navn}</span>
                    </div>
                  )}
                  {oppgave.anlegg && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                      <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{oppgave.anlegg.anleggsnavn}</span>
                    </div>
                  )}
                  {oppgave.tekniker && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span title={oppgave.tekniker.navn}>{getInitials(oppgave.tekniker.navn)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatDate(oppgave.opprettet_dato)}</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openOppgave(oppgave)
                        }}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors touch-target"
                        title="Vis detaljer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOppgave(oppgave)
                          setViewMode('edit')
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors touch-target"
                        title="Rediger"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteOppgave(oppgave.id)
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                        title="Slett"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Oppgavenr</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Kunde/Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Tekniker</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Prioritet</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedOppgaver.map((oppgave) => (
                  <tr
                    key={oppgave.id}
                    onClick={() => {
                      setSelectedOppgave(oppgave)
                      setViewMode('edit')
                    }}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors cursor-pointer"
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
                          <p className="text-gray-900 dark:text-white font-medium">{oppgave.type}</p>
                          {oppgave.beskrivelse && (
                            <p className="text-sm text-gray-400 dark:text-gray-400 truncate max-w-xs">
                              {oppgave.beskrivelse}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {oppgave.customer && (
                          <p className="text-gray-500 dark:text-gray-300">{oppgave.customer.navn}</p>
                        )}
                        {oppgave.anlegg && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400">
                            <Building2 className="w-3 h-3" />
                            {oppgave.anlegg.anleggsnavn}
                          </div>
                        )}
                        {!oppgave.customer && !oppgave.anlegg && (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {oppgave.tekniker ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                          <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span title={oppgave.tekniker.navn}>{getInitials(oppgave.tekniker.navn)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Ikke tildelt</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {oppgave.prioritet ? (
                        <span className={`badge ${PRIORITET_COLORS[oppgave.prioritet] || 'badge-info'}`}>
                          {oppgave.prioritet}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${OPPGAVE_STATUS_COLORS[oppgave.status] || 'badge-info'}`}>
                        {oppgave.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300 text-sm">
                      {formatDate(oppgave.opprettet_dato)}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openOppgave(oppgave)}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOppgave(oppgave)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteOppgave(oppgave.id)}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

interface Kontaktperson {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
  rolle: string | null
}

function OppgaveForm({ oppgave, onSave, onCancel }: OppgaveFormProps) {
  // Beregn default forfallsdato (2 uker frem i tid)
  const getDefaultForfallsdato = () => {
    const dato = new Date()
    dato.setDate(dato.getDate() + 14) // 2 uker = 14 dager
    return dato.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    type: oppgave?.type || '',
    tittel: oppgave?.tittel || '',
    kunde_id: oppgave?.kunde_id || '',
    anlegg_id: oppgave?.anlegg_id || '',
    tekniker_id: oppgave?.tekniker_id || '',
    kontaktperson: oppgave?.kontaktperson || '',
    prioritet: oppgave?.prioritet || '',
    status: oppgave?.status || 'Ikke påbegynt',
    beskrivelse: oppgave?.beskrivelse || '',
    forfallsdato: oppgave?.forfallsdato ? oppgave.forfallsdato.split('T')[0] : getDefaultForfallsdato(),
  })
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [teknikere, setTeknikere] = useState<Tekniker[]>([])
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [erIntern, setErIntern] = useState(oppgave?.type === 'Internt')
  const [kanRedigereKundeAnlegg, setKanRedigereKundeAnlegg] = useState(!oppgave)
  const [visNyKontaktperson, setVisNyKontaktperson] = useState(false)
  const [nyKontaktperson, setNyKontaktperson] = useState({
    navn: '',
    epost: '',
    telefon: '',
    rolle: ''
  })

  const oppgavetyper = ['Faktura', 'Regnskap', 'Internt', 'Bestilling', 'Befaring', 'FG-Registrering', 'Dokumentasjon', 'DAC Underlag', 'Oppfølging']
  const prioriteter = Object.values(PRIORITETER)
  const statuser = Object.values(OPPGAVE_STATUSER)

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
      if (formData.anlegg_id) {
        await loadKontaktpersoner(formData.anlegg_id)
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
      console.log('🏢 Laster anlegg for kunde:', kundeId)
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) {
        console.error('❌ Feil ved lasting av anlegg:', error)
        throw error
      }
      
      console.log('✅ Anlegg lastet:', data?.length || 0, 'anlegg')
      setAnlegg(data || [])
      
      // Hvis det kun er ett anlegg, velg det automatisk
      if (data && data.length === 1) {
        console.log('🎯 Auto-velger anlegg:', data[0].anleggsnavn)
        setFormData(prev => ({ ...prev, anlegg_id: data[0].id }))
        await loadKontaktpersoner(data[0].id)
      }
    } catch (error) {
      console.error('💥 Feil ved lasting av anlegg:', error)
    }
  }

  async function loadKontaktpersoner(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg_kontaktpersoner')
        .select(`
          kontaktperson_id,
          kontaktpersoner (
            id,
            navn,
            epost,
            telefon,
            rolle
          )
        `)
        .eq('anlegg_id', anleggId)

      if (error) throw error
      
      const kontakter = data?.map((item: any) => item.kontaktpersoner).filter(Boolean) || []
      setKontaktpersoner(kontakter)
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner:', error)
      setKontaktpersoner([])
    }
  }

  async function opprettNyKontaktperson() {
    if (!nyKontaktperson.navn || !formData.anlegg_id) {
      alert('Navn og anlegg er påkrevd')
      return
    }

    try {
      // Opprett kontaktperson
      const { data: kontaktData, error: kontaktError } = await supabase
        .from('kontaktpersoner')
        .insert([{
          navn: nyKontaktperson.navn,
          epost: nyKontaktperson.epost || null,
          telefon: nyKontaktperson.telefon || null,
          rolle: nyKontaktperson.rolle || null,
          opprettet_dato: new Date().toISOString()
        }])
        .select()
        .single()

      if (kontaktError) throw kontaktError

      // Link til anlegg
      const { error: linkError } = await supabase
        .from('anlegg_kontaktpersoner')
        .insert([{
          anlegg_id: formData.anlegg_id,
          kontaktperson_id: kontaktData.id,
          primar: false
        }])

      if (linkError) throw linkError

      // Oppdater formData med ny kontaktperson
      setFormData({ ...formData, kontaktperson: kontaktData.id })
      
      // Last inn kontaktpersoner på nytt
      await loadKontaktpersoner(formData.anlegg_id)
      
      // Nullstill skjema
      setNyKontaktperson({ navn: '', epost: '', telefon: '', rolle: '' })
      setVisNyKontaktperson(false)
    } catch (error) {
      console.error('Feil ved opprettelse av kontaktperson:', error)
      alert('Kunne ikke opprette kontaktperson')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave: Record<string, any> = {
        type: formData.type,
        status: formData.status,
        ordre_id: null,
        prosjekt_id: null,
      }

      // Legg kun til felter som har verdier for å unngå foreign key constraint feil
      if (formData.tittel) dataToSave.tittel = formData.tittel
      else dataToSave.tittel = null
      
      if (formData.kunde_id) dataToSave.kunde_id = formData.kunde_id
      else dataToSave.kunde_id = null
      
      if (formData.anlegg_id) dataToSave.anlegg_id = formData.anlegg_id
      else dataToSave.anlegg_id = null
      
      if (formData.tekniker_id) dataToSave.tekniker_id = formData.tekniker_id
      else dataToSave.tekniker_id = null
      
      if (formData.kontaktperson) dataToSave.kontaktperson = formData.kontaktperson
      else dataToSave.kontaktperson = null
      
      if (formData.prioritet) dataToSave.prioritet = formData.prioritet
      else dataToSave.prioritet = null
      
      if (formData.beskrivelse) dataToSave.beskrivelse = formData.beskrivelse
      else dataToSave.beskrivelse = null
      
      if (formData.forfallsdato) dataToSave.forfallsdato = new Date(formData.forfallsdato).toISOString()
      else dataToSave.forfallsdato = null

      if (oppgave) {
        const { error } = await supabase
          .from('oppgaver')
          .update({
            ...dataToSave,
            sist_oppdatert: new Date().toISOString(),
          })
          .eq('id', oppgave.id)

        if (error) throw error

        // Hvis fakturaoppgave settes til Fullført, oppdater tilhørende ordre til Fakturert
        if (
          formData.type === 'Faktura' && 
          formData.status === OPPGAVE_STATUSER.FULLFORT && 
          oppgave.status !== OPPGAVE_STATUSER.FULLFORT &&
          oppgave.ordre_id
        ) {
          const { error: ordreError } = await supabase
            .from('ordre')
            .update({ 
              status: 'Fakturert',
              sist_oppdatert: new Date().toISOString()
            })
            .eq('id', oppgave.ordre_id)

          if (ordreError) {
            console.error('Feil ved oppdatering av ordre:', ordreError)
            // Fortsett likevel, oppgaven er lagret
          }
        }
      } else {
        const { error } = await supabase
          .from('oppgaver')
          .insert([{ ...dataToSave, opprettet_dato: new Date().toISOString() }])

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {oppgave ? 'Rediger oppgave' : 'Ny oppgave'}
          </h1>
          <p className="text-gray-400 dark:text-gray-400">
            {oppgave ? 'Oppdater oppgaveinformasjon' : 'Opprett ny arbeidsoppgave'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
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

          {/* Tittel */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Tittel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tittel}
              onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
              className="input"
              placeholder="Kort beskrivelse av oppgaven..."
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
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

          {/* Forfallsdato */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Forfallsdato
            </label>
            <input
              type="date"
              value={formData.forfallsdato}
              onChange={(e) => setFormData({ ...formData, forfallsdato: e.target.value })}
              className="input"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">2 uker standard</p>
          </div>

          {/* Tekniker */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
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

          {/* Kontaktperson */}
          {formData.anlegg_id && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Kontaktperson (valgfritt)
              </label>
              <div className="space-y-2">
                <select
                  value={formData.kontaktperson}
                  onChange={(e) => setFormData({ ...formData, kontaktperson: e.target.value })}
                  className="input"
                >
                  <option value="">Ingen kontaktperson</option>
                  {kontaktpersoner.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.navn} {k.rolle ? `(${k.rolle})` : ''}
                    </option>
                  ))}
                </select>
                
                {!visNyKontaktperson ? (
                  <button
                    type="button"
                    onClick={() => setVisNyKontaktperson(true)}
                    className="text-xs text-primary hover:text-primary-400"
                  >
                    + Opprett ny kontaktperson
                  </button>
                ) : (
                  <div className="p-3 bg-dark-100 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-gray-300">Ny kontaktperson</p>
                    <input
                      type="text"
                      placeholder="Navn *"
                      value={nyKontaktperson.navn}
                      onChange={(e) => setNyKontaktperson({ ...nyKontaktperson, navn: e.target.value })}
                      className="input text-sm"
                    />
                    <input
                      type="email"
                      placeholder="E-post"
                      value={nyKontaktperson.epost}
                      onChange={(e) => setNyKontaktperson({ ...nyKontaktperson, epost: e.target.value })}
                      className="input text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Telefon"
                      value={nyKontaktperson.telefon}
                      onChange={(e) => setNyKontaktperson({ ...nyKontaktperson, telefon: e.target.value })}
                      className="input text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Rolle"
                      value={nyKontaktperson.rolle}
                      onChange={(e) => setNyKontaktperson({ ...nyKontaktperson, rolle: e.target.value })}
                      className="input text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={opprettNyKontaktperson}
                        className="btn-primary text-xs py-1 px-3"
                      >
                        Lagre
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVisNyKontaktperson(false)
                          setNyKontaktperson({ navn: '', epost: '', telefon: '', rolle: '' })
                        }}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kunde */}
          {!erIntern && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">
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
                <div className="input bg-dark-100 text-gray-900 dark:text-white">
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
                    onChange={async (e) => {
                      const kundeId = e.target.value
                      setFormData({ ...formData, kunde_id: kundeId, anlegg_id: '', kontaktperson: '' })
                      setAnlegg([])
                      setKontaktpersoner([])
                      if (kundeId) {
                        await loadAnlegg(kundeId)
                      }
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Anlegg (valgfritt)
              </label>
              {oppgave && !kanRedigereKundeAnlegg ? (
                <div className="input bg-dark-100 text-gray-900 dark:text-white">
                  {anleggNavn || 'Ingen anlegg'}
                </div>
              ) : anlegg.length === 0 ? (
                <div className="input bg-dark-100 text-gray-400 dark:text-gray-500">
                  Ingen anlegg funnet for denne kunden
                </div>
              ) : anlegg.length === 1 ? (
                <div className="input bg-dark-100 text-gray-900 dark:text-white">
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
                    onChange={(e) => {
                      setFormData({ ...formData, anlegg_id: e.target.value, kontaktperson: '' })
                      if (e.target.value) loadKontaktpersoner(e.target.value)
                    }}
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
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
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

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
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
    <div className="space-y-4 sm:space-y-6 pb-20">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 truncate">{oppgave.type}</h1>
          <p className="text-sm sm:text-base text-gray-400 dark:text-gray-400 truncate">
            {oppgave.customer?.navn || 'Ingen kunde'} 
            {oppgave.anlegg && ` - ${oppgave.anlegg.anleggsnavn}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onEdit} className="btn-primary flex items-center gap-2 text-sm sm:text-base">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
          <button onClick={onClose} className="btn-secondary text-sm sm:text-base">
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Oppgaveinformasjon</h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Type</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white">{oppgave.type}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Status</p>
                <span className={`badge ${OPPGAVE_STATUS_COLORS[oppgave.status] || 'badge-info'}`}>
                  {oppgave.status}
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Prioritet</p>
                {oppgave.prioritet ? (
                  <span className={`badge ${PRIORITET_COLORS[oppgave.prioritet] || 'badge-info'}`}>
                    {oppgave.prioritet}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">Ikke satt</span>
                )}
              </div>
              {oppgave.beskrivelse && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Beskrivelse</p>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{oppgave.beskrivelse}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Kunde</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white truncate">{oppgave.customer?.navn || 'Ingen kunde'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Anlegg</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white truncate">{oppgave.anlegg?.anleggsnavn || 'Ingen anlegg'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Tekniker</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white">{oppgave.tekniker?.navn || 'Ikke tildelt'}</p>
              </div>
              {oppgave.ordre && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Tilknyttet ordre</p>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{oppgave.ordre.type}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Opprettet</p>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(oppgave.opprettet_dato)}</p>
              </div>
              {oppgave.sist_oppdatert && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(oppgave.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
