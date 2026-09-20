import { useState, useEffect } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Building2, Edit, Eye, FileText, MoreHorizontal, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { supabase } from '../../lib/supabase'
import { ServicerapportEditor } from './ServicerapportEditor'
import { ServicerapportPreview } from './ServicerapportPreview'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  kunde_navn?: string
  ordre_id?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  image_urls?: string[]
  opprettet_dato?: string
  sist_oppdatert?: string
}

interface ServicerapportViewProps {
  onBack: () => void
  initialAnleggId?: string
  initialOrdreId?: string
}

type SortField = 'dato' | 'tittel' | 'anlegg' | 'tekniker'
type SortDirection = 'asc' | 'desc'
const SIDE = 30

export function ServicerapportView({ onBack, initialAnleggId, initialOrdreId }: ServicerapportViewProps) {
  const [rapporter, setRapporter] = useState<Servicerapport[]>([])
  const [selectedRapport, setSelectedRapport] = useState<Servicerapport | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('dato')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const { ansatt: meg } = useCurrentAnsatt()
  const [chip, setChip] = useState<'alle' | 'mine' | 'mnd' | 'aar'>('alle')
  const [anleggFilter, setAnleggFilter] = useState(initialAnleggId && !initialOrdreId ? initialAnleggId : '')
  const [visAntall, setVisAntall] = useState(SIDE)

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection(field === 'dato' ? 'desc' : 'asc') }
  }

  useEffect(() => {
    loadRapporter()
    // Fra ordre: åpne ny rapport med anlegg og ordre ferdig valgt
    if (initialAnleggId && initialOrdreId) handleNewRapport(initialAnleggId, initialOrdreId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAnleggId, initialOrdreId])

  async function loadRapporter() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('servicerapporter')
        .select(`
          *,
          anlegg:anlegg_id (
            anleggsnavn,
            customer:kundenr ( navn )
          )
        `)
        .order('rapport_dato', { ascending: false })

      if (error) {
        console.error('Error loading servicerapporter:', error)
        throw error
      }

      console.log('Loaded servicerapporter:', data)

      const rapporterWithAnleggNavn = data?.map((rapport: any) => ({
        ...rapport,
        anlegg_navn: rapport.anlegg?.anleggsnavn || 'Ukjent anlegg',
        kunde_navn: rapport.anlegg?.customer?.navn || undefined
      })) || []

      setRapporter(rapporterWithAnleggNavn)
    } catch (error) {
      console.error('Feil ved lasting av servicerapporter:', error)
      // Vis tom liste ved feil
      setRapporter([])
    } finally {
      setLoading(false)
    }
  }

  function handleNewRapport(anleggId?: string, ordreId?: string) {
    const newRapport: Servicerapport = {
      id: '',
      anlegg_id: anleggId || '',
      ordre_id: ordreId,
      rapport_dato: new Date().toISOString().split('T')[0],
      tekniker_navn: '',
      header: '',
      rapport_innhold: ''
    }
    setSelectedRapport(newRapport)
    setIsEditing(true)
  }

  function handleEditRapport(rapport: Servicerapport) {
    setSelectedRapport(rapport)
    setIsEditing(true)
  }

  async function handleSaveRapport(rapport: Servicerapport): Promise<Servicerapport> {
    try {
      let savedRapport: Servicerapport = rapport
      
      if (rapport.id) {
        // Update existing (sist_oppdatert oppdateres automatisk av trigger)
        const { error } = await supabase
          .from('servicerapporter')
          .update({
            anlegg_id: rapport.anlegg_id,
            ordre_id: rapport.ordre_id || null,
            rapport_dato: rapport.rapport_dato,
            tekniker_navn: rapport.tekniker_navn,
            header: rapport.header,
            rapport_innhold: rapport.rapport_innhold,
            image_urls: rapport.image_urls || []
          })
          .eq('id', rapport.id)

        if (error) throw error
        
        // Hent anleggsnavn for den oppdaterte rapporten
        const { data: anleggData } = await supabase
          .from('anlegg')
          .select('anleggsnavn')
          .eq('id', rapport.anlegg_id)
          .single()
        
        savedRapport = { ...rapport, anlegg_navn: anleggData?.anleggsnavn }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('servicerapporter')
          .insert({
            anlegg_id: rapport.anlegg_id,
            ordre_id: rapport.ordre_id || null,
            rapport_dato: rapport.rapport_dato,
            tekniker_navn: rapport.tekniker_navn,
            header: rapport.header,
            rapport_innhold: rapport.rapport_innhold,
            image_urls: rapport.image_urls || []
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          // Hent anleggsnavn for den nye rapporten
          const { data: anleggData } = await supabase
            .from('anlegg')
            .select('anleggsnavn')
            .eq('id', rapport.anlegg_id)
            .single()
          
          savedRapport = { 
            ...rapport, 
            id: data.id,
            anlegg_navn: anleggData?.anleggsnavn,
            image_urls: data.image_urls || []
          }
        }
      }

      await loadRapporter()
      // Note: Don't close editor here - let ServicerapportEditor handle it after dialog
      return savedRapport
    } catch (error) {
      console.error('Feil ved lagring av servicerapport:', error)
      alert('Kunne ikke lagre servicerapport')
      throw error
    }
  }

  async function handleDeleteRapport(rapport: Servicerapport) {
    if (!confirm(`Er du sikker på at du vil slette rapporten "${rapport.header}"?\n\nDenne handlingen kan ikke angres.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('servicerapporter')
        .delete()
        .eq('id', rapport.id)

      if (error) throw error

      toast.success('Rapport slettet')
      await loadRapporter()
    } catch (error) {
      console.error('Feil ved sletting av servicerapport:', error)
      toast.error('Kunne ikke slette servicerapport', error)
    }
  }

  if (isEditing && selectedRapport) {
    return (
      <ServicerapportEditor
        rapport={selectedRapport}
        onSave={handleSaveRapport}
        onCancel={() => {
          setIsEditing(false)
          setSelectedRapport(null)
        }}
      />
    )
  }

  if (showPreview && selectedRapport) {
    return (
      <ServicerapportPreview
        rapport={selectedRapport}
        onBack={() => setShowPreview(false)}
      />
    )
  }

  const s = searchQuery.trim().toLowerCase()
  const iAar = (r: Servicerapport, aar: number) => new Date(r.rapport_dato).getFullYear() === aar
  const naa = new Date()
  const teller = {
    alle: rapporter.length,
    mine: meg ? rapporter.filter(r => r.tekniker_navn === meg.navn).length : 0,
    mnd: rapporter.filter(r => { const d = new Date(r.rapport_dato); return d.getFullYear() === naa.getFullYear() && d.getMonth() === naa.getMonth() }).length,
    aar: rapporter.filter(r => iAar(r, naa.getFullYear())).length,
  }
  const grunnlag = rapporter.filter(r => {
    if (anleggFilter && r.anlegg_id !== anleggFilter) return false
    if (chip === 'mine' && meg && r.tekniker_navn !== meg.navn) return false
    if (chip === 'mnd') { const d = new Date(r.rapport_dato); if (d.getFullYear() !== naa.getFullYear() || d.getMonth() !== naa.getMonth()) return false }
    if (chip === 'aar' && !iAar(r, naa.getFullYear())) return false
    if (!s) return true
    return [r.header, r.anlegg_navn, r.tekniker_navn, r.kunde_navn, r.rapport_innhold].some(v => v?.toLowerCase().includes(s))
  })
  const sortert = [...grunnlag].sort((a, b) => {
    let c = 0
    if (sortField === 'dato') c = a.rapport_dato.localeCompare(b.rapport_dato)
    else if (sortField === 'tittel') c = (a.header || '').localeCompare(b.header || '', 'nb-NO')
    else if (sortField === 'anlegg') c = (a.anlegg_navn || '').localeCompare(b.anlegg_navn || '', 'nb-NO')
    else c = (a.tekniker_navn || '').localeCompare(b.tekniker_navn || '', 'nb-NO')
    return sortDirection === 'asc' ? c : -c
  })
  const synlig = sortert.slice(0, visAntall)
  const anleggNavnFilter = anleggFilter ? rapporter.find(r => r.anlegg_id === anleggFilter)?.anlegg_navn : null
  const harFilter = Boolean(s || chip !== 'alle' || anleggFilter)
  // Grupper på måned når vi sorterer på dato
  const grupper: { tittel: string; rader: Servicerapport[] }[] = []
  for (const r of synlig) {
    const t = sortField === 'dato' ? new Date(r.rapport_dato).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }) : ''
    const g = grupper[grupper.length - 1]
    if (g && g.tittel === t) g.rader.push(r); else grupper.push({ tittel: t, rader: [r] })
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Teknisk</button>
      </div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Servicerapporter</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${teller.aar} i ${naa.getFullYear()} · ${teller.alle} totalt`}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => handleNewRapport(anleggFilter || undefined)}><span className="hidden sm:inline">Ny rapport</span></Button>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="search" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setVisAntall(SIDE) }} placeholder="Søk i tittel, anlegg, kunde, tekniker eller innhold…" aria-label="Søk" className="input pl-9 !min-h-[38px] !h-[38px]" />
        </div>
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-[38px]" role="group" aria-label="Sorter">
          {([['dato', 'Dato'], ['anlegg', 'Anlegg'], ['tekniker', 'Tekniker'], ['tittel', 'Tittel']] as [SortField, string][]).map(([f, navn]) => (
            <button key={f} type="button" aria-pressed={sortField === f} onClick={() => toggleSort(f)} className={cn('px-3 text-sm inline-flex items-center gap-1', sortField === f ? 'bg-primary text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{navn}{sortField === f && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Filter">
        <Chip aktiv={chip === 'alle'} onClick={() => setChip('alle')}>Alle <b>{teller.alle}</b></Chip>
        {meg && <Chip aktiv={chip === 'mine'} onClick={() => setChip('mine')}>Mine <b>{teller.mine}</b></Chip>}
        <Chip aktiv={chip === 'mnd'} onClick={() => setChip('mnd')}>Denne måneden <b>{teller.mnd}</b></Chip>
        <Chip aktiv={chip === 'aar'} onClick={() => setChip('aar')}>{naa.getFullYear()} <b>{teller.aar}</b></Chip>
        {anleggFilter && <Chip aktiv onClick={() => setAnleggFilter('')}><Building2 className="w-3.5 h-3.5" />{anleggNavnFilter ?? 'Anlegg'}<X className="w-3.5 h-3.5" /></Chip>}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, sortert.length)}</b> av {sortert.length}</>}</span>
        {harFilter && <button type="button" onClick={() => { setSearchQuery(''); setChip('alle'); setAnleggFilter('') }} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      : sortert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen rapporter matcher filtrene.' : 'Ingen servicerapporter ennå.'}</div>
      : grupper.map((g, gi) => (
        <section key={gi} className="space-y-2">
          {g.tittel && <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">{g.tittel}</h2>}
          {g.rader.map(r => (
            <div key={r.id} className="card !p-3.5 flex items-center gap-3 group">
              <button type="button" onClick={() => { setSelectedRapport(r); setShowPreview(true) }} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                <span className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5" /></span>
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900 dark:text-white truncate">{r.header || '(uten tittel)'}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[r.anlegg_navn, r.kunde_navn, formatDate(r.rapport_dato), r.tekniker_navn].filter(Boolean).join(' · ')}{r.image_urls?.length ? ` · ${r.image_urls.length} bilde${r.image_urls.length === 1 ? '' : 'r'}` : ''}{r.ordre_id ? ' · fra ordre' : ''}</span>
                </span>
              </button>
              <span className="hidden sm:flex items-center gap-1">
                <IconButton variant="ghost" label="Vis" icon={<Eye />} onClick={() => { setSelectedRapport(r); setShowPreview(true) }} className="w-8 h-8" />
                <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => handleEditRapport(r)} className="w-8 h-8" />
              </span>
              <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                <MenuItem icon={<Edit />} onSelect={() => handleEditRapport(r)}>Rediger</MenuItem>
                {r.anlegg_id && <MenuItem icon={<Building2 />} onSelect={() => setAnleggFilter(r.anlegg_id)}>Alle rapporter på anlegget</MenuItem>}
                <MenuSeparator />
                <MenuItem icon={<Trash2 />} danger onSelect={() => handleDeleteRapport(r)}>Slett rapport…</MenuItem>
              </DropdownMenu>
            </div>
          ))}
        </section>
      ))}
      {sortert.length > visAntall && <button type="button" onClick={() => setVisAntall(n => n + SIDE)} className="block mx-auto text-sm text-gray-500 dark:text-gray-400 hover:text-primary py-2">Vis {Math.min(SIDE, sortert.length - visAntall)} til ({visAntall} av {sortert.length} vist)</button>}
    </div>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
