import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardCheck, MessageSquare, Minus, MoreHorizontal, Plus, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { KONTROLLPUNKTER_FG790, AVVIK_TYPER, AG_VERDIER, FEILKODER, KONTROLLPUNKT_REFERANSER } from '@/lib/constants/fg790'
import { useOfflineStatus, useOfflineQueue } from '@/hooks/useOffline'
import { cacheData, getCachedData } from '@/lib/offline'

interface KontrollpunktData {
  posisjon: string
  kategori: string
  tittel: string
  status: 'Kontrollert' | 'Ikke aktuell' | 'Ikke tilkomst' | null
  avvik_type: string | null
  feilkode: string | null
  ag_verdi: string | null
  kommentar: string | null
  poeng_trekk: number
  antall_avvik: number
}

interface FG790KontrollViewProps {
  anleggId: string
  anleggsNavn: string
  kontrollId?: string
  onBack: () => void
  onShowRapport?: (kontrollId: string) => void
}

export function FG790KontrollView({ 
  anleggId, 
  anleggsNavn: initialAnleggsNavn, 
  kontrollId, 
  onBack, 
  onShowRapport 
}: FG790KontrollViewProps) {
  const { isOnline, isSyncing } = useOfflineStatus()
  const { queueInsert, queueUpdate } = useOfflineQueue()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [anleggsNavn, setAnleggsNavn] = useState(initialAnleggsNavn)
  const [currentKontrollId, setCurrentKontrollId] = useState<string | undefined>(kontrollId)
  const [collapsedPosisjoner, setCollapsedPosisjoner] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'gjenstar' | 'avvik' | 'alle'>('gjenstar')
  const [apent, setApent] = useState<string | null>(null)
  const [visVurdering, setVisVurdering] = useState(false)
  const [vurderingMangler, setVurderingMangler] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Anleggsvurdering felter
  const [kontrollorVurderingSum, setKontrollorVurderingSum] = useState<number | null>(null)
  const [kontrollorVurderingKommentar, setKontrollorVurderingKommentar] = useState('')
  const [ingenAnleggsvurdering, setIngenAnleggsvurdering] = useState(false)
  const [ingenAnleggsvurderingKommentar, setIngenAnleggsvurderingKommentar] = useState('')
  const [kritiskFeil, setKritiskFeil] = useState(false)
  const [kritiskFeilKommentar, setKritiskFeilKommentar] = useState('')
  
  // Initialize all kontrollpunkter
  const allKontrollpunkter: KontrollpunktData[] = []
  Object.entries(KONTROLLPUNKTER_FG790).forEach(([posisjon, kategorier]) => {
    Object.entries(kategorier).forEach(([kategori, punkter]) => {
      punkter.forEach(tittel => {
        allKontrollpunkter.push({
          posisjon,
          kategori,
          tittel,
          status: null,
          avvik_type: null,
          feilkode: null,
          ag_verdi: null,
          kommentar: null,
          poeng_trekk: 0,
          antall_avvik: 1
        })
      })
    })
  })

  const [data, setData] = useState<Record<string, KontrollpunktData>>(
    Object.fromEntries(
      allKontrollpunkter.map(punkt => [
        `${punkt.posisjon}|${punkt.kategori}|${punkt.tittel}`,
        punkt
      ])
    )
  )

  useEffect(() => {
    loadData()
  }, [anleggId, kontrollId])

  // Store current kontroll and anlegg IDs for AIAssistant
  useEffect(() => {
    if (currentKontrollId && anleggId) {
      localStorage.setItem('current_kontroll_id', currentKontrollId)
      localStorage.setItem('current_anlegg_id', anleggId)
    }
    
    // Cleanup when leaving
    return () => {
      localStorage.removeItem('current_kontroll_id')
      localStorage.removeItem('current_anlegg_id')
    }
  }, [currentKontrollId, anleggId])

  // Autosave every 30 seconds if there are unsaved changes
  // Autolagring 2,5 s etter siste endring
  useEffect(() => {
    if (!hasUnsavedChanges || !currentKontrollId || loading) return
    const t = setTimeout(() => handleSave(true), 2500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, kontrollorVurderingSum, kontrollorVurderingKommentar, ingenAnleggsvurdering, ingenAnleggsvurderingKommentar, kritiskFeil, kritiskFeilKommentar, hasUnsavedChanges, currentKontrollId, loading])

  async function loadData() {
    if (!anleggId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Try to load from cache first if offline
      if (!isOnline) {
        const cachedData = getCachedData<any>(`fg790_kontroll_${anleggId}`)
        if (cachedData) {
          console.log('📦 Laster data fra cache (offline)')
          setAnleggsNavn(cachedData.anleggsNavn || initialAnleggsNavn)
          setCurrentKontrollId(cachedData.kontrollId)
          setKontrollorVurderingSum(cachedData.kontrollorVurderingSum)
          setKontrollorVurderingKommentar(cachedData.kontrollorVurderingKommentar || '')
          setIngenAnleggsvurdering(cachedData.ingenAnleggsvurdering || false)
          setIngenAnleggsvurderingKommentar(cachedData.ingenAnleggsvurderingKommentar || '')
          setKritiskFeil(cachedData.kritiskFeil || false)
          setKritiskFeilKommentar(cachedData.kritiskFeilKommentar || '')
          if (cachedData.data) {
            setData(cachedData.data)
          }
          setLoading(false)
          return
        }
      }

      // Hent anleggsnavn
      const { data: anleggData } = await supabase
        .from('anlegg')
        .select('anleggsnavn')
        .eq('id', anleggId)
        .single()

      if (anleggData) {
        setAnleggsNavn(anleggData.anleggsnavn)
      }

      // Sjekk om det finnes et eksisterende utkast
      let idToUse = kontrollId || currentKontrollId
      
      if (!idToUse) {
        const { data: existingDraft } = await supabase
          .from('anleggsdata_kontroll')
          .select('id')
          .eq('anlegg_id', anleggId)
          .eq('rapport_type', 'FG790')
          .eq('kontroll_status', 'utkast')
          .maybeSingle()

        if (existingDraft) {
          idToUse = existingDraft.id
          setCurrentKontrollId(existingDraft.id)
        } else {
          // Opprett ny kontroll
          const { data: { user } } = await supabase.auth.getUser()
          const { data: ansatt } = await supabase
            .from('ansatte')
            .select('id')
            .eq('epost', user?.email)
            .maybeSingle()
          
          const { data: newKontroll } = await supabase
            .from('anleggsdata_kontroll')
            .insert({
              anlegg_id: anleggId,
              dato: new Date().toISOString(),
              kontroll_status: 'utkast',
              rapport_type: 'FG790',
              kontrollor_id: ansatt?.id || null,
            })
            .select()
            .single()

          if (newKontroll) {
            idToUse = newKontroll.id
            setCurrentKontrollId(newKontroll.id)
          }
        }
      }

      // Hent eksisterende kontrollpunkter
      if (idToUse) {
        // Hent anleggsvurdering data
        const { data: kontrollData } = await supabase
          .from('anleggsdata_kontroll')
          .select('kontrollor_vurdering_sum, kontrollor_vurdering_kommentar, ingen_anleggsvurdering, ingen_anleggsvurdering_kommentar, kritisk_feil, kritisk_feil_kommentar')
          .eq('id', idToUse)
          .single()
        
        if (kontrollData) {
          setKontrollorVurderingSum(kontrollData.kontrollor_vurdering_sum)
          setKontrollorVurderingKommentar(kontrollData.kontrollor_vurdering_kommentar || '')
          setIngenAnleggsvurdering(kontrollData.ingen_anleggsvurdering || false)
          setIngenAnleggsvurderingKommentar(kontrollData.ingen_anleggsvurdering_kommentar || '')
          setKritiskFeil(kontrollData.kritisk_feil || false)
          setKritiskFeilKommentar(kontrollData.kritisk_feil_kommentar || '')
        }

        const { data: kontrollpunkter } = await supabase
          .from('kontrollsjekkpunkter_brannalarm')
          .select('*')
          .eq('kontroll_id', idToUse)
        if (kontrollpunkter && kontrollpunkter.length > 0) {
          const newData = { ...data }
          kontrollpunkter.forEach(punkt => {
            const key = `${punkt.posisjon}|${punkt.kategori}|${punkt.tittel}`
            if (newData[key]) {
              newData[key] = {
                ...newData[key],
                posisjon: punkt.posisjon,
                kategori: punkt.kategori,
                tittel: punkt.tittel,
                status: punkt.status,
                avvik_type: punkt.avvik_type,
                feilkode: punkt.feilkode,
                ag_verdi: punkt.ag_verdi,
                kommentar: punkt.kommentar,
                poeng_trekk: punkt.poeng_trekk || 0,
                antall_avvik: punkt.antall_avvik || 1,
              }
            }
          })
          setData(newData)
        }
        
        // Cache data for offline use
        cacheData(`fg790_kontroll_${anleggId}`, {
          kontrollId: idToUse,
          anleggsNavn,
          kontrollorVurderingSum,
          kontrollorVurderingKommentar,
          ingenAnleggsvurdering,
          ingenAnleggsvurderingKommentar,
          kritiskFeil,
          kritiskFeilKommentar,
          data: kontrollpunkter ? Object.fromEntries(
            kontrollpunkter.map(p => [
              `${p.posisjon}|${p.kategori}|${p.tittel}`,
              {
                posisjon: p.posisjon,
                kategori: p.kategori,
                tittel: p.tittel,
                status: p.status,
                avvik_type: p.avvik_type,
                feilkode: p.feilkode,
                ag_verdi: p.ag_verdi,
                kommentar: p.kommentar,
                poeng_trekk: p.poeng_trekk || 0,
                antall_avvik: p.antall_avvik || 1,
              }
            ])
          ) : data
        })
      }
    } catch (error) {
      console.error('Feil ved lasting:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(silent = false) {
    if (!anleggId || !currentKontrollId) {
      if (!silent) alert('Kan ikke lagre: Kontroll er ikke initialisert ennå.')
      return
    }

    setSaving(true)
    
    // Save to cache immediately for offline access
    cacheData(`fg790_kontroll_${anleggId}`, {
      kontrollId: currentKontrollId,
      anleggsNavn,
      kontrollorVurderingSum,
      kontrollorVurderingKommentar,
      ingenAnleggsvurdering,
      ingenAnleggsvurderingKommentar,
      kritiskFeil,
      kritiskFeilKommentar,
      data
    })
    
    // If offline, queue changes for later sync
    if (!isOnline) {
      console.log('📴 Offline - lagrer lokalt og legger i synkroniseringskø')
      
      // Queue anleggsvurdering update
      queueUpdate('anleggsdata_kontroll', {
        id: currentKontrollId,
        kontrollor_vurdering_sum: kontrollorVurderingSum,
        kontrollor_vurdering_kommentar: kontrollorVurderingKommentar || null,
        ingen_anleggsvurdering: ingenAnleggsvurdering,
        ingen_anleggsvurdering_kommentar: ingenAnleggsvurderingKommentar || null,
        kritisk_feil: kritiskFeil,
        kritisk_feil_kommentar: kritiskFeilKommentar || null,
      })
      
      // Queue kontrollpunkter
      Object.values(data).forEach(punkt => {
        queueInsert('kontrollsjekkpunkter_brannalarm', {
          kontroll_id: currentKontrollId,
          anlegg_id: anleggId,
          kontrollaar: new Date().getFullYear(),
          posisjon: punkt.posisjon,
          kategori: punkt.kategori,
          tittel: punkt.tittel,
          sjekkpunkt: punkt.tittel, // Bruker tittel som sjekkpunkt for bakoverkompatibilitet
          status: punkt.status,
          avvik_type: punkt.avvik_type || null,
          feilkode: punkt.feilkode || null,
          ag_verdi: punkt.ag_verdi || null,
          kommentar: punkt.kommentar || null,
          poeng_trekk: punkt.poeng_trekk || 0,
          antall_avvik: punkt.antall_avvik || 1,
        })
      })
      
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      if (!silent) toast.info('Lagret lokalt – synkroniseres når du er på nett igjen')
      setSaving(false)
      return
    }
    
    try {
      // Slett eksisterende kontrollpunkter
      await supabase
        .from('kontrollsjekkpunkter_brannalarm')
        .delete()
        .eq('kontroll_id', currentKontrollId)

      // Lagre alle punkter
      const punkterToSave = Object.values(data).map(punkt => ({
        kontroll_id: currentKontrollId,
        anlegg_id: anleggId,
        kontrollaar: new Date().getFullYear(),
        posisjon: punkt.posisjon,
        kategori: punkt.kategori,
        tittel: punkt.tittel,
        status: punkt.status,
        avvik_type: punkt.avvik_type || null,
        feilkode: punkt.feilkode || null,
        ag_verdi: punkt.ag_verdi || null,
        kommentar: punkt.kommentar || null,
        poeng_trekk: punkt.poeng_trekk || 0,
        antall_avvik: punkt.antall_avvik || 1,
      }))

      const { error } = await supabase
        .from('kontrollsjekkpunkter_brannalarm')
        .insert(punkterToSave)

      if (error) {
        console.error('Feil ved lagring:', error)
        toast.error('Kunne ikke lagre kontrollen', error)
        return
      }

      // Lagre anleggsvurdering data
      const { error: vurderingError } = await supabase
        .from('anleggsdata_kontroll')
        .update({
          kontrollor_vurdering_sum: kontrollorVurderingSum,
          kontrollor_vurdering_kommentar: kontrollorVurderingKommentar || null,
          ingen_anleggsvurdering: ingenAnleggsvurdering,
          ingen_anleggsvurdering_kommentar: ingenAnleggsvurderingKommentar || null,
          kritisk_feil: kritiskFeil,
          kritisk_feil_kommentar: kritiskFeilKommentar || null,
        })
        .eq('id', currentKontrollId)

      if (vurderingError) {
        console.error('Feil ved lagring av anleggsvurdering:', vurderingError)
        if (!silent) toast.error('Kunne ikke lagre anleggsvurderingen', vurderingError)
      } else {
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        if (!silent) toast.success('Kontroll lagret')
      }
    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      toast.error('Kunne ikke lagre kontrollen', error)
    } finally {
      setSaving(false)
    }
  }

  function updatePunkt(key: string, updates: Partial<KontrollpunktData>) {
    setData(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }))
    setHasUnsavedChanges(true)
  }

  function togglePosisjon(posisjon: string) {
    setCollapsedPosisjoner(prev => {
      const next = new Set(prev)
      if (next.has(posisjon)) {
        next.delete(posisjon)
      } else {
        next.add(posisjon)
      }
      return next
    })
  }

  const totalPunkter = allKontrollpunkter.length
  const vurdertePunkter = Object.values(data).filter(p => p.status !== null).length
  const avvikPunkter = Object.values(data).filter(p => Boolean(p.avvik_type)).length
  const totalPoengTrekk = Object.values(data).reduce((sum, p) => sum + ((p.poeng_trekk || 0) * (p.antall_avvik || 1)), 0)
  const sluttScore = Math.max(0, 100 - totalPoengTrekk)
  const progress = Math.round((vurdertePunkter / totalPunkter) * 100)
  const gjenstar = totalPunkter - vurdertePunkter
  const vurderingOk = ingenAnleggsvurdering || kontrollorVurderingSum !== null

  const erDetektorPunkt = (p: KontrollpunktData) => p.posisjon === 'POS.2 - Visuell kontroll' && p.tittel.toLowerCase().includes('detektor')
  function visPunkt(p: KontrollpunktData) {
    if (filter === 'gjenstar') return p.status === null
    if (filter === 'avvik') return Boolean(p.avvik_type)
    return true
  }
  function settStatus(key: string, status: KontrollpunktData['status']) {
    const p = data[key]
    updatePunkt(key, { status: p.status === status ? null : status })
  }
  function toggleAvvik(key: string) {
    const p = data[key]
    if (p.avvik_type) updatePunkt(key, { avvik_type: null, feilkode: null, poeng_trekk: 0, antall_avvik: 1, ag_verdi: erDetektorPunkt(p) ? p.ag_verdi : null })
    else { updatePunkt(key, { avvik_type: 'Avvik', status: p.status ?? 'Kontrollert' }); setApent(key) }
  }
  function merkAlle(posisjon: string, status: 'Kontrollert' | 'Ikke aktuell') {
    setData(prev => { const n = { ...prev }; for (const k of Object.keys(n)) if (n[k].posisjon === posisjon && n[k].status === null) n[k] = { ...n[k], status }; return n })
    setHasUnsavedChanges(true)
  }
  async function tilbake() { if (hasUnsavedChanges) await handleSave(true); onBack() }
  async function fullfor() {
    if (!vurderingOk) { setVurderingMangler(true); setVisVurdering(true); toast.warning('Fyll ut kontrollørens vurdering (tabell 3.5.2-1) før du fullfører'); document.getElementById('fg-vurdering')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    if (gjenstar > 0 && !confirm(`${gjenstar} punkter er ikke vurdert. Fortsette til rapport likevel?`)) return
    await handleSave(true)
    if (currentKontrollId && onShowRapport) onShowRapport(currentKontrollId)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={tilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Brannalarm</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggsNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">FG 790-kontroll</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{anleggsNavn}</p>
        </div>
        <p className="text-xs text-gray-400 sm:text-right whitespace-nowrap">{!isOnline ? 'Offline – lagres lokalt' : saving || isSyncing ? 'Lagrer…' : hasUnsavedChanges ? 'Ulagrede endringer' : lastSaved ? `Lagret ${lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : 'Lagres automatisk'}</p>
      </header>

      {/* Score + fremdrift, klebrig */}
      <div className="sticky top-0 lg:top-2 z-10 -mx-4 px-4 sm:mx-0 sm:px-0 pt-1 pb-2 bg-white/90 dark:bg-dark/90 backdrop-blur">
        <div className="card !p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{vurdertePunkter} av {totalPunkter} vurdert <span className="text-gray-400 font-normal">· {progress} %</span></span>
            <span className={cn('inline-flex items-baseline gap-1 tabular-nums', sluttScore >= 90 ? 'text-green-700 dark:text-green-400' : sluttScore >= 70 ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')} title={`100 − ${totalPoengTrekk.toFixed(1)} poeng trekk`}><span className="text-xl font-bold">{sluttScore.toFixed(sluttScore % 1 ? 1 : 0)}</span><span className="text-xs">/ 100</span></span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden"><div className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${progress}%` }} /></div>
          <div className="flex gap-2 overflow-x-auto -mx-3 px-3" role="group" aria-label="Filter">
            <Chip aktiv={filter === 'gjenstar'} onClick={() => setFilter('gjenstar')}>Gjenstår <b>{gjenstar}</b></Chip>
            <Chip aktiv={filter === 'avvik'} onClick={() => setFilter('avvik')}><span className="w-2 h-2 rounded-full bg-orange-500" />Avvik <b>{avvikPunkter}</b></Chip>
            <Chip aktiv={filter === 'alle'} onClick={() => setFilter('alle')}>Alle <b>{totalPunkter}</b></Chip>
            {totalPoengTrekk > 0 && <span className="ml-auto self-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">−{totalPoengTrekk.toFixed(1)} poeng</span>}
          </div>
        </div>
      </div>

      {gjenstar === 0 && filter === 'gjenstar' && (
        <div className="card text-center py-8 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Alle {totalPunkter} punkter er vurdert 🎉</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Fyll ut anleggsvurderingen nederst og trykk «Fullfør og lag rapport». <button type="button" onClick={() => setFilter('alle')} className="text-primary hover:underline">Vis alle punkter</button></p>
        </div>
      )}

      {Object.entries(KONTROLLPUNKTER_FG790).map(([posisjon, kategorier]) => {
        const iPos = Object.values(data).filter(p => p.posisjon === posisjon)
        const synlige = iPos.filter(visPunkt)
        if (synlige.length === 0) return null
        const ferdig = iPos.filter(p => p.status !== null).length
        const lukket = collapsedPosisjoner.has(posisjon)
        const [posKode, posNavn] = posisjon.split(' - ')
        return (
          <section key={posisjon} className="card !p-0 overflow-hidden" aria-label={posisjon}>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-100">
              <button type="button" onClick={() => togglePosisjon(posisjon)} aria-expanded={!lukket} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', !lukket && 'rotate-90')} />
                <span className="text-[11px] font-mono text-gray-400">{posKode}</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate">{posNavn}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{ferdig} av {iPos.length}</span>
                {ferdig === iPos.length && <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3} />}
              </button>
              <DropdownMenu trigger={open => <IconButton variant="ghost" label="Handlinger" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                <MenuItem icon={<Check />} onSelect={() => merkAlle(posisjon, 'Kontrollert')}>Merk resten som kontrollert</MenuItem>
                <MenuItem icon={<X />} onSelect={() => merkAlle(posisjon, 'Ikke aktuell')}>Merk resten som ikke aktuell</MenuItem>
              </DropdownMenu>
            </div>
            {!lukket && Object.entries(kategorier).map(([kategori, titler]) => {
              const rader = titler.map(t => `${posisjon}|${kategori}|${t}`).filter(k => visPunkt(data[k]))
              if (rader.length === 0) return null
              return (
                <div key={kategori}>
                  {Object.keys(kategorier).length > 1 && <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{kategori}</div>}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rader.map(key => {
                      const p = data[key]
                      const erApen = apent === key
                      const ref = KONTROLLPUNKT_REFERANSER[p.tittel]
                      const harAvvik = Boolean(p.avvik_type)
                      const trekk = (p.poeng_trekk || 0) * (p.antall_avvik || 1)
                      return (
                        <div key={key} className={cn('px-3 py-2', harAvvik ? 'bg-orange-50/50 dark:bg-orange-900/10' : p.status && p.status !== 'Kontrollert' ? 'bg-gray-50/60 dark:bg-dark-100/40' : '')}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <button type="button" onClick={() => setApent(erApen ? null : key)} aria-expanded={erApen} className="flex-1 min-w-0 flex items-start gap-2.5 text-left py-1">
                              <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-px', harAvvik ? 'bg-orange-500 border-orange-500 text-white' : p.status === 'Kontrollert' ? 'bg-green-500 border-green-500 text-white' : p.status ? 'bg-gray-400 border-gray-400 text-white' : 'border-gray-300 dark:border-gray-600')}>
                                {harAvvik ? <AlertTriangle className="w-3 h-3" /> : p.status === 'Kontrollert' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : p.status ? <X className="w-3 h-3" strokeWidth={3} /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className={cn('block text-sm leading-snug', p.status ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium')}>{p.tittel}</span>
                                <span className="block text-[11px] text-gray-400 mt-0.5 truncate">{ref && ref !== '--' ? `NS 3960: ${ref}` : ''}{!erApen && harAvvik ? `${ref && ref !== '--' ? ' · ' : ''}${p.avvik_type}${p.feilkode ? ` · ${p.feilkode}` : ''}${trekk ? ` · −${trekk.toFixed(1)} p` : ''}` : ''}{!erApen && !harAvvik && p.ag_verdi ? `${ref && ref !== '--' ? ' · ' : ''}${p.ag_verdi}` : ''}{!erApen && p.kommentar ? ' · kommentar' : ''}</span>
                              </span>
                            </button>
                            <div className="flex items-center gap-1.5 flex-shrink-0 pl-8 sm:pl-0">
                              <button type="button" onClick={() => settStatus(key, 'Kontrollert')} aria-pressed={p.status === 'Kontrollert'} className={cn('h-9 px-3.5 rounded-lg text-sm font-semibold border inline-flex items-center gap-1', p.status === 'Kontrollert' ? 'bg-green-500 border-green-500 text-white' : 'border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20')}><Check className="w-3.5 h-3.5" strokeWidth={3} />OK</button>
                              <button type="button" onClick={() => settStatus(key, 'Ikke aktuell')} aria-pressed={p.status === 'Ikke aktuell'} title="Ikke aktuell" className={cn('h-9 px-2.5 rounded-lg text-xs border', p.status === 'Ikke aktuell' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>N/A</button>
                              <button type="button" onClick={() => settStatus(key, 'Ikke tilkomst')} aria-pressed={p.status === 'Ikke tilkomst'} title="Ikke tilkomst" className={cn('h-9 px-2.5 rounded-lg text-xs border whitespace-nowrap', p.status === 'Ikke tilkomst' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>Ikke tilkomst</button>
                              <button type="button" onClick={() => toggleAvvik(key)} aria-pressed={harAvvik} title="Avvik / merknad" className={cn('h-9 px-2.5 rounded-lg text-xs border inline-flex items-center gap-1', harAvvik ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600')}><AlertTriangle className="w-3.5 h-3.5" />{harAvvik ? (p.antall_avvik > 1 ? p.antall_avvik : '') : 'Avvik'}</button>
                              <IconButton variant="ghost" label={erApen ? 'Skjul detaljer' : 'Detaljer'} icon={p.kommentar ? <MessageSquare className="text-primary" /> : <ChevronDown className={cn('transition-transform', erApen && 'rotate-180')} />} onClick={() => setApent(erApen ? null : key)} className="w-8 h-8" />
                            </div>
                          </div>

                          {erApen && (
                            <div className="mt-2 ml-8 space-y-3">
                              {/* Forurensningsgrad for detektorpunkter – uavhengig av avvik */}
                              {erDetektorPunkt(p) && (
                                <Rad label="Forurensningsgrad (AG)">
                                  <AgVelger verdi={p.ag_verdi} onVelg={ag => updatePunkt(key, { ag_verdi: ag.verdi, poeng_trekk: ag.poeng, avvik_type: ag.poeng > 0 ? (p.avvik_type ?? 'Avvik') : p.avvik_type })} />
                                </Rad>
                              )}
                              {harAvvik && (
                                <>
                                  <Rad label="Type">
                                    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-9" role="radiogroup" aria-label="Avvikstype">
                                      {AVVIK_TYPER.map(t => <button key={t} type="button" role="radio" aria-checked={p.avvik_type === t} onClick={() => updatePunkt(key, { avvik_type: t })} className={cn('px-3 text-sm', p.avvik_type === t ? (t === 'Avvik' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{t}</button>)}
                                    </div>
                                  </Rad>
                                  <Rad label="Feilkode">
                                    <div className="flex flex-wrap gap-1.5">
                                      {FEILKODER.map(f => { const valgt = p.feilkode === f || (f === 'Annet' && p.feilkode?.startsWith('Annet')); return <button key={f} type="button" onClick={() => updatePunkt(key, { feilkode: valgt && f !== 'Annet' ? null : f })} className={cn('h-8 px-2.5 rounded-full border text-xs', valgt ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{f}</button> })}
                                    </div>
                                    {p.feilkode?.startsWith('Annet') && <input value={p.feilkode.startsWith('Annet:') ? p.feilkode.slice(7) : ''} onChange={e => updatePunkt(key, { feilkode: e.target.value ? `Annet: ${e.target.value}` : 'Annet' })} placeholder="Beskriv feilkoden" autoFocus className="input !h-[36px] !min-h-[36px] !py-0 text-sm mt-2" />}
                                  </Rad>
                                  {!erDetektorPunkt(p) && (
                                    <Rad label="Poengtrekk">
                                      <AgVelger verdi={p.ag_verdi} onVelg={ag => updatePunkt(key, { ag_verdi: ag.verdi, poeng_trekk: ag.poeng })} />
                                    </Rad>
                                  )}
                                  <Rad label="Antall avvik">
                                    <div className="flex items-center gap-3">
                                      <div className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                                        <button type="button" onClick={() => updatePunkt(key, { antall_avvik: Math.max(1, (p.antall_avvik || 1) - 1) })} aria-label="Ett færre" className="w-9 h-9 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                                        <span className="w-12 text-center text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{p.antall_avvik || 1}</span>
                                        <button type="button" onClick={() => updatePunkt(key, { antall_avvik: Math.min(99, (p.antall_avvik || 1) + 1) })} aria-label="Ett til" className="w-9 h-9 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                                      </div>
                                      {trekk > 0 && <span className="text-xs text-orange-700 dark:text-orange-400 tabular-nums">{p.antall_avvik > 1 ? `${p.antall_avvik} × ${p.poeng_trekk} = ` : ''}−{trekk.toFixed(1)} poeng</span>}
                                    </div>
                                  </Rad>
                                </>
                              )}
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-gray-400 mt-2.5 flex-shrink-0" />
                                <textarea value={p.kommentar ?? ''} onChange={e => updatePunkt(key, { kommentar: e.target.value || null })} placeholder="Kommentar (kommer i rapporten)" rows={2} className="input !h-auto text-sm flex-1" />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}

      {/* Anleggsvurdering */}
      <section id="fg-vurdering" className={cn('card !p-0 overflow-hidden', vurderingMangler && !vurderingOk && 'border-red-400 dark:border-red-700')} aria-label="Anleggsvurdering">
        <button type="button" onClick={() => setVisVurdering(v => !v)} aria-expanded={visVurdering} className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-dark-100 text-left">
          <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', visVurdering && 'rotate-90')} />
          <span className="font-semibold text-gray-900 dark:text-white">Anleggsvurdering</span>
          <span className="text-xs text-gray-400">tabell 3.5.2-1</span>
          <span className={cn('ml-auto text-xs', vurderingOk ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{ingenAnleggsvurdering ? 'Ingen vurdering' : kontrollorVurderingSum !== null ? `Sum ${kontrollorVurderingSum}` : 'Påkrevd før fullføring'}{kritiskFeil ? ' · kritisk feil' : ''}</span>
        </button>
        {visVurdering && (
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-[160px_1fr] gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fg-sum" className="block text-sm font-medium text-gray-900 dark:text-white">Kontrollørens vurdering <span className="text-red-500">*</span></label>
                <input id="fg-sum" type="number" min={0} max={100} inputMode="numeric" value={kontrollorVurderingSum ?? ''} onChange={e => { setKontrollorVurderingSum(e.target.value === '' ? null : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))); setHasUnsavedChanges(true) }} placeholder="0–100" disabled={ingenAnleggsvurdering} className={cn('input', vurderingMangler && !vurderingOk && '!border-red-400')} />
                <button type="button" onClick={() => { setKontrollorVurderingSum(Math.round(sluttScore)); setHasUnsavedChanges(true) }} disabled={ingenAnleggsvurdering} className="text-xs text-primary hover:underline disabled:opacity-40">Bruk beregnet {Math.round(sluttScore)}</button>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fg-vk" className="block text-sm font-medium text-gray-900 dark:text-white">Kommentar til vurderingen</label>
                <textarea id="fg-vk" value={kontrollorVurderingKommentar} onChange={e => { setKontrollorVurderingKommentar(e.target.value); setHasUnsavedChanges(true) }} rows={3} placeholder="Begrunnelse, helhetsinntrykk …" className="input !h-auto" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"><input type="checkbox" checked={ingenAnleggsvurdering} onChange={e => { setIngenAnleggsvurdering(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 rounded text-primary focus:ring-primary" />Ingen anleggsvurdering</label>
                {ingenAnleggsvurdering && <textarea value={ingenAnleggsvurderingKommentar} onChange={e => { setIngenAnleggsvurderingKommentar(e.target.value); setHasUnsavedChanges(true) }} rows={2} placeholder="Hvorfor ikke?" className="input !h-auto text-sm" />}
              </div>
              <div className={cn('space-y-2 p-3 rounded-lg border', kritiskFeil ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-800')}>
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"><input type="checkbox" checked={kritiskFeil} onChange={e => { setKritiskFeil(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 rounded text-red-600 focus:ring-red-500" />Kritisk funksjonsfeil</label>
                {kritiskFeil && <textarea value={kritiskFeilKommentar} onChange={e => { setKritiskFeilKommentar(e.target.value); setHasUnsavedChanges(true) }} rows={2} placeholder="Beskriv feilen" className="input !h-auto text-sm" />}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-auto tabular-nums">{gjenstar > 0 ? `${gjenstar} punkter gjenstår` : 'Alle punkter vurdert'}{avvikPunkter ? ` · ${avvikPunkter} avvik` : ''}{!vurderingOk ? ' · vurdering mangler' : ''}</span>
        <Button variant="ghost" loading={saving} disabled={!hasUnsavedChanges} onClick={() => handleSave(false)}><span className="hidden sm:inline">Lagre nå</span><span className="sm:hidden">Lagre</span></Button>
        <Button variant="primary" icon={<ClipboardCheck />} loading={saving} onClick={fullfor}>Fullfør og lag rapport</Button>
      </div>
    </div>
  )
}

function Rad({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-[150px_1fr] gap-1 sm:gap-3 items-start"><span className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:pt-2">{label}</span><div>{children}</div></div>
}

/** AG0 0 · AG1 0,5 · AG2 0,8 · AG3 2 · AGIU 0 */
function AgVelger({ verdi, onVelg }: { verdi: string | null; onVelg: (ag: { verdi: string; poeng: number; beskrivelse: string }) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {AG_VERDIER.map(ag => (
          <button key={ag.verdi} type="button" onClick={() => onVelg(ag)} aria-pressed={verdi === ag.verdi} title={ag.beskrivelse}
            className={cn('h-9 px-3 rounded-lg border text-sm font-semibold inline-flex items-center gap-1.5', verdi === ag.verdi ? (ag.poeng === 0 ? 'bg-green-500 border-green-500 text-white' : ag.poeng < 1 ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-red-500 border-red-500 text-white') : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>
            {ag.verdi}<span className="text-xs font-normal opacity-80">{ag.poeng ? `−${ag.poeng}` : '0'}</span>
          </button>
        ))}
      </div>
      {verdi && <p className="text-xs text-gray-500 dark:text-gray-400">{AG_VERDIER.find(a => a.verdi === verdi)?.beskrivelse}</p>}
    </div>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[32px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
