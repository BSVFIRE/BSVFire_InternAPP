import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Search, CheckCircle, AlertTriangle, WifiOff, Wifi } from 'lucide-react'
import { useOfflineStatus, useOfflineQueue } from '@/hooks/useOffline'
import { cacheData, getCachedData } from '@/lib/offline'

interface KontrollpunktData {
  kontrollpunkt_navn: string
  status: 'Kontrollert' | 'Ikke aktuell' | 'Ikke tilkomst' | null
  avvik: boolean
  kommentar: string
}

interface NS3960KontrollViewProps {
  anleggId: string
  anleggsNavn: string
  kontrollId?: string
  onBack: () => void
  onShowRapport?: (kontrollId: string) => void
}

const KONTROLLPUNKTER_BY_CATEGORY = {
  'Kontroll prosedyre': [
    'Sløyfe scannet på sentral(er)',
    'Analyse av data scannet',
    'Gjennomgang logg: brannalarmer, feil og forvarsler',
    'Kontroll av betjening sentral(er)',
    'Kontroll av lamper, summer og display sentral(er)',
    'Kontroll av spesialdetektorer',
    'Kontroll av batteri, driftspenning og ladespenning sentral(er)',
    'Test av detektorer',
    'Test av manuelle meldere',
    'Test av sprinklerkontroll alarm og overvåking',
    'Test av alarmorganer',
    'Test av alarmoverføring',
    'Test av signalutganger',
  ],
  'Visuelle kontroller': [
    'Visuell kontroll av O-planer',
    'Visuell kontroll av alarmorganer',
    'Visuell kontroll av sløyfeenheter',
    'Vurdering av deteksjon og varsling i anlegg',
    'Vurdering av deteksjon i anlegg O.H hmmling (stikkprøver)',
  ],
  'Dokumentasjon og opplæring': [
    'Kontrolljournal gjennomgått og utfylt',
    'Gjennomgang egenkontroll med sluttbruker',
    'Servicemerking/kontroll oblat',
    'Opplæring sluttkunde',
  ],
}

export function NS3960KontrollView({ anleggId, anleggsNavn: initialAnleggsNavn, kontrollId, onBack, onShowRapport }: NS3960KontrollViewProps) {
  const { isOnline, isSyncing } = useOfflineStatus()
  const { queueInsert, queueUpdate } = useOfflineQueue()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false)
  const [anleggsNavn, setAnleggsNavn] = useState(initialAnleggsNavn)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentKontrollId, setCurrentKontrollId] = useState<string | undefined>(kontrollId)
  
  // Ekstra felter for kontroll
  const [merknader, setMerknader] = useState('')
  const [harFeil, setHarFeil] = useState(false)
  const [feilKommentar, setFeilKommentar] = useState('')
  const [harUtkoblinger, setHarUtkoblinger] = useState(false)
  const [utkoblingKommentar, setUtkoblingKommentar] = useState('')
  
  // Anleggsdata fra brannalarm-tabellen
  const [leverandor, setLeverandor] = useState('')
  const [sentraltype, setSentraltype] = useState('')

  // Initialize all kontrollpunkter
  const allKontrollpunkter = Object.values(KONTROLLPUNKTER_BY_CATEGORY).flat()
  const [data, setData] = useState<Record<string, KontrollpunktData>>(
    Object.fromEntries(
      allKontrollpunkter.map(navn => [
        navn,
        { kontrollpunkt_navn: navn, status: null, avvik: false, kommentar: '' }
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

  // Auto-save when data changes
  useEffect(() => {
    if (!loading && hasUnsavedChanges) {
      const timer = setTimeout(() => {
        autoSave()
      }, 2000) // Auto-save 2 seconds after last change
      return () => clearTimeout(timer)
    }
  }, [data, merknader, harFeil, feilKommentar, harUtkoblinger, utkoblingKommentar, leverandor, sentraltype, hasUnsavedChanges, loading])

  async function loadData() {
    if (!anleggId) {
      console.log('Ingen anleggId, stopper lasting')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('Laster NS3960 data for anlegg:', anleggId)
      
      // Try to load from cache first if offline
      if (!isOnline) {
        const cachedData = getCachedData<any>(`ns3960_kontroll_${anleggId}`)
        if (cachedData) {
          console.log('📦 Laster data fra cache (offline)')
          setAnleggsNavn(cachedData.anleggsNavn || initialAnleggsNavn)
          setLeverandor(cachedData.leverandor || '')
          setSentraltype(cachedData.sentraltype || '')
          setMerknader(cachedData.merknader || '')
          setHarFeil(cachedData.harFeil || false)
          setFeilKommentar(cachedData.feilKommentar || '')
          setHarUtkoblinger(cachedData.harUtkoblinger || false)
          setUtkoblingKommentar(cachedData.utkoblingKommentar || '')
          setCurrentKontrollId(cachedData.kontrollId)
          if (cachedData.data) {
            setData(cachedData.data)
          }
          setLoading(false)
          return
        }
      }

      // Hent anleggsnavn
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('anleggsnavn')
        .eq('id', anleggId)
        .single()

      if (anleggError) {
        console.error('Feil ved henting av anleggsnavn:', anleggError)
      } else if (anleggData) {
        console.log('Anleggsnavn hentet:', anleggData.anleggsnavn)
        setAnleggsNavn(anleggData.anleggsnavn)
      }
      
      // Hent brannalarmdata (leverandør og sentraltype)
      const { data: brannalarmData, error: brannalarmError } = await supabase
        .from('anleggsdata_brannalarm')
        .select('leverandor, sentraltype')
        .eq('anlegg_id', anleggId)
        .maybeSingle()
      
      if (brannalarmError) {
        console.error('Feil ved henting av brannalarmdata:', brannalarmError)
      } else if (brannalarmData) {
        console.log('Brannalarmdata hentet:', brannalarmData)
        setLeverandor(brannalarmData.leverandor || '')
        setSentraltype(brannalarmData.sentraltype || '')
      }

      // Hvis vi ikke har kontrollId, sjekk om det finnes et eksisterende utkast
      let idToUse = kontrollId || currentKontrollId
      
      if (!idToUse) {
        console.log('Ingen kontrollId, sjekker etter eksisterende utkast...')
        
        // Først, sjekk om det finnes et utkast
        const { data: existingDraft, error: draftError } = await supabase
          .from('anleggsdata_kontroll')
          .select('id, kontroll_status, dato')
          .eq('anlegg_id', anleggId)
          .eq('rapport_type', 'NS3960')
          .eq('kontroll_status', 'utkast')
          .maybeSingle()

        if (draftError) {
          console.error('Feil ved sjekk av utkast:', draftError)
        }

        if (existingDraft) {
          console.log('Fant eksisterende utkast:', existingDraft)
          idToUse = existingDraft.id
          setCurrentKontrollId(existingDraft.id)
        } else {
          // Opprett ny kontroll hvis ingen utkast finnes
          console.log('Ingen utkast funnet, oppretter ny kontroll...')
          
          // Hent innlogget bruker
          const { data: { user } } = await supabase.auth.getUser()
          console.log('Innlogget bruker:', user?.id)
          
          // Hent ansatt-ID basert på bruker-ID
          const { data: ansatt } = await supabase
            .from('ansatte')
            .select('id')
            .eq('epost', user?.email)
            .maybeSingle()
          
          console.log('Ansatt-ID:', ansatt?.id)
          
          const { data: newKontroll, error: createError } = await supabase
            .from('anleggsdata_kontroll')
            .insert({
              anlegg_id: anleggId,
              dato: new Date().toISOString(),
              kontroll_status: 'utkast',
              rapport_type: 'NS3960',
              kontrollor_id: ansatt?.id || null,
            })
            .select()
            .single()

          if (createError) {
            console.error('Feil ved opprettelse av kontroll:', createError)
            console.error('Error code:', createError.code)
            console.error('Error message:', createError.message)
            console.error('Error details:', createError.details)
            console.error('Error hint:', createError.hint)
            
            // Hvis 409 (conflict), prøv å hente den eksisterende kontrollen
            if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
              console.log('Unique constraint violation - henter eksisterende kontroll...')
              const { data: anyExisting } = await supabase
                .from('anleggsdata_kontroll')
                .select('id, kontroll_status, dato')
                .eq('anlegg_id', anleggId)
                .eq('rapport_type', 'NS3960')
                .order('dato', { ascending: false })
                .limit(1)
                .maybeSingle()
              
              if (anyExisting) {
                console.log('Bruker eksisterende kontroll:', anyExisting)
                idToUse = anyExisting.id
                setCurrentKontrollId(anyExisting.id)
              }
            }
          } else if (newKontroll) {
            console.log('Ny kontroll opprettet med ID:', newKontroll.id)
            idToUse = newKontroll.id
            setCurrentKontrollId(newKontroll.id)
          }
        }
      }

      // Hent eksisterende data hvis kontrollId finnes
      if (idToUse) {
        console.log('Henter eksisterende kontrollpunkter for kontroll:', idToUse)
        
        // Hent kontrolldata
        const { data: kontrollData, error: kontrollError } = await supabase
          .from('anleggsdata_kontroll')
          .select('merknader, har_feil, feil_kommentar, har_utkoblinger, utkobling_kommentar')
          .eq('id', idToUse)
          .single()
        
        if (kontrollError) {
          console.error('Feil ved henting av kontrolldata:', kontrollError)
        } else if (kontrollData) {
          setMerknader(kontrollData.merknader || '')
          setHarFeil(kontrollData.har_feil || false)
          setFeilKommentar(kontrollData.feil_kommentar || '')
          setHarUtkoblinger(kontrollData.har_utkoblinger || false)
          setUtkoblingKommentar(kontrollData.utkobling_kommentar || '')
        }
        
        // Hent kontrollpunkter
        const { data: kontrollpunkter, error: punkterError } = await supabase
          .from('ns3960_kontrollpunkter')
          .select('*')
          .eq('kontroll_id', idToUse)

        if (punkterError) {
          console.error('Feil ved henting av kontrollpunkter:', punkterError)
        } else if (kontrollpunkter) {
          console.log('Hentet kontrollpunkter:', kontrollpunkter.length)
          const newData = { ...data }
          kontrollpunkter.forEach(punkt => {
            if (newData[punkt.kontrollpunkt_navn]) {
              newData[punkt.kontrollpunkt_navn] = {
                kontrollpunkt_navn: punkt.kontrollpunkt_navn,
                status: punkt.status,
                avvik: punkt.avvik || false,
                kommentar: punkt.kommentar || '',
              }
            }
          })
          setData(newData)
        }
        
        // Cache data for offline use
        cacheData(`ns3960_kontroll_${anleggId}`, {
          kontrollId: idToUse,
          anleggsNavn,
          leverandor,
          sentraltype,
          merknader: kontrollData?.merknader || '',
          harFeil: kontrollData?.har_feil || false,
          feilKommentar: kontrollData?.feil_kommentar || '',
          harUtkoblinger: kontrollData?.har_utkoblinger || false,
          utkoblingKommentar: kontrollData?.utkobling_kommentar || '',
          data: kontrollpunkter ? Object.fromEntries(
            kontrollpunkter.map(p => [p.kontrollpunkt_navn, {
              kontrollpunkt_navn: p.kontrollpunkt_navn,
              status: p.status,
              avvik: p.avvik || false,
              kommentar: p.kommentar || '',
            }])
          ) : data
        })
      } else {
        console.log('Ingen kontrollId, starter ny kontroll')
      }
    } catch (error) {
      console.error('Feil ved lasting:', error)
    } finally {
      console.log('Lasting fullført')
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!anleggId || !currentKontrollId) {
      console.error('Mangler anleggId eller kontrollId:', { anleggId, currentKontrollId })
      alert('Kan ikke lagre: Kontroll er ikke initialisert ennå. Vent litt og prøv igjen.')
      return
    }

    setSaving(true)
    
    // Save to cache immediately for offline access
    cacheData(`ns3960_kontroll_${anleggId}`, {
      kontrollId: currentKontrollId,
      anleggsNavn,
      leverandor,
      sentraltype,
      merknader,
      harFeil,
      feilKommentar,
      harUtkoblinger,
      utkoblingKommentar,
      data
    })
    
    // If offline, queue changes for later sync
    if (!isOnline) {
      console.log('📴 Offline - lagrer lokalt og legger i synkroniseringskø')
      
      // Queue kontroll update
      queueUpdate('anleggsdata_kontroll', {
        id: currentKontrollId,
        merknader,
        har_feil: harFeil,
        feil_kommentar: feilKommentar,
        har_utkoblinger: harUtkoblinger,
        utkobling_kommentar: utkoblingKommentar,
        updated_at: new Date().toISOString(),
      })
      
      // Queue brannalarm data update
      queueUpdate('anleggsdata_brannalarm', {
        anlegg_id: anleggId,
        leverandor,
        sentraltype,
      })
      
      // Queue kontrollpunkter (we'll need to handle this specially on sync)
      Object.values(data).forEach(punkt => {
        queueInsert('ns3960_kontrollpunkter', {
          kontroll_id: currentKontrollId,
          anlegg_id: anleggId,
          kontrollpunkt_navn: punkt.kontrollpunkt_navn,
          status: punkt.status,
          avvik: punkt.avvik,
          kommentar: punkt.kommentar,
        })
      })
      
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      alert('✓ Lagret lokalt (offline). Synkroniseres når nettilgang er tilgjengelig.')
      setSaving(false)
      return
    }
    
    try {
      // Oppdater kontrolldata
      const { error: kontrollError } = await supabase
        .from('anleggsdata_kontroll')
        .update({
          merknader,
          har_feil: harFeil,
          feil_kommentar: feilKommentar,
          har_utkoblinger: harUtkoblinger,
          utkobling_kommentar: utkoblingKommentar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentKontrollId)
      
      if (kontrollError) {
        console.error('Feil ved oppdatering av kontrolldata:', kontrollError)
        throw kontrollError
      }
      
      // Oppdater brannalarmdata (leverandør og sentraltype)
      const { error: brannalarmError } = await supabase
        .from('anleggsdata_brannalarm')
        .upsert({
          anlegg_id: anleggId,
          leverandor,
          sentraltype,
        }, {
          onConflict: 'anlegg_id'
        })
      
      if (brannalarmError) {
        console.error('Feil ved oppdatering av brannalarmdata:', brannalarmError)
        // Ikke kast feil her, fortsett med lagring av kontrollpunkter
      }
      
      // Slett eksisterende kontrollpunkter for denne kontrollen
      await supabase
        .from('ns3960_kontrollpunkter')
        .delete()
        .eq('kontroll_id', currentKontrollId)

      // Lagre alle punkter
      const punkterToSave = Object.values(data).map(punkt => ({
        kontroll_id: currentKontrollId,
        anlegg_id: anleggId,
        kontrollpunkt_navn: punkt.kontrollpunkt_navn,
        status: punkt.status,
        avvik: punkt.avvik,
        kommentar: punkt.kommentar,
      }))

      const { error } = await supabase
        .from('ns3960_kontrollpunkter')
        .insert(punkterToSave)

      if (error) {
        console.error('Supabase error:', error)
        if (error.message?.includes('kontroll_id')) {
          throw new Error('Database-feil: kontroll_id kolonnen mangler. Kjør SQL-migrasjonen først.')
        }
        throw error
      }

      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      console.log('Kontroll lagret!')
    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      alert(`Feil ved lagring: ${error.message || 'Ukjent feil'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!anleggId) return

    const allChecked = Object.values(data).every(p => p.status !== null)
    if (!allChecked) {
      const confirm = window.confirm('Ikke alle punkter er kontrollert. Vil du fortsette til rapport?')
      if (!confirm) return
    }

    setSaving(true)
    try {
      // Save all data first (men ikke endre status ennå)
      await handleSave()

      // Gå til rapport-generering
      if (onShowRapport && currentKontrollId) {
        onShowRapport(currentKontrollId)
      } else {
        alert('Kontroll klar for rapport-generering! ✓')
        onBack()
      }
    } catch (error) {
      console.error('Feil ved fullføring:', error)
      alert('Feil ved fullføring')
    } finally {
      setSaving(false)
    }
  }

  function updatePunkt(navn: string, updates: Partial<KontrollpunktData>) {
    setData(prev => ({
      ...prev,
      [navn]: { ...prev[navn], ...updates }
    }))
    setHasUnsavedChanges(true)
  }

  async function autoSave() {
    if (!anleggId || !currentKontrollId) return
    
    setAutoSaving(true)
    
    // Always save to cache
    cacheData(`ns3960_kontroll_${anleggId}`, {
      kontrollId: currentKontrollId,
      anleggsNavn,
      leverandor,
      sentraltype,
      merknader,
      harFeil,
      feilKommentar,
      harUtkoblinger,
      utkoblingKommentar,
      data
    })
    
    // Skip online save if offline
    if (!isOnline) {
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      setAutoSaving(false)
      return
    }
    
    try {
      // Oppdater kontrolldata
      await supabase
        .from('anleggsdata_kontroll')
        .update({
          merknader,
          har_feil: harFeil,
          feil_kommentar: feilKommentar,
          har_utkoblinger: harUtkoblinger,
          utkobling_kommentar: utkoblingKommentar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentKontrollId)
      
      // Oppdater brannalarmdata (leverandør og sentraltype)
      await supabase
        .from('anleggsdata_brannalarm')
        .upsert({
          anlegg_id: anleggId,
          leverandor,
          sentraltype,
        }, {
          onConflict: 'anlegg_id'
        })
      
      // Oppdater kontrollpunkter
      await supabase
        .from('ns3960_kontrollpunkter')
        .delete()
        .eq('kontroll_id', currentKontrollId)

      const punkterToSave = Object.values(data).map(punkt => ({
        kontroll_id: currentKontrollId,
        anlegg_id: anleggId,
        kontrollpunkt_navn: punkt.kontrollpunkt_navn,
        status: punkt.status,
        avvik: punkt.avvik,
        kommentar: punkt.kommentar,
      }))

      await supabase
        .from('ns3960_kontrollpunkter')
        .insert(punkterToSave)

      setLastSaved(new Date())
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Auto-save feil:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  function toggleCategory(category: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  function markAllInCategory(category: string, status: 'Kontrollert' | 'Ikke aktuell') {
    const punkter = KONTROLLPUNKTER_BY_CATEGORY[category as keyof typeof KONTROLLPUNKTER_BY_CATEGORY]
    if (!punkter) return
    const newData = { ...data }
    punkter.forEach((punkt: string) => {
      newData[punkt] = { ...newData[punkt], status }
    })
    setData(newData)
    setHasUnsavedChanges(true)
  }

  const filteredCategories = searchQuery
    ? Object.entries(KONTROLLPUNKTER_BY_CATEGORY).reduce((acc, [category, punkter]) => {
        const filtered = punkter.filter(p =>
          p.toLowerCase().includes(searchQuery.toLowerCase())
        )
        if (filtered.length > 0) {
          acc[category] = filtered
        }
        return acc
      }, {} as Record<string, string[]>)
    : KONTROLLPUNKTER_BY_CATEGORY

  const totalPunkter = allKontrollpunkter.length
  const kontrollertePunkter = Object.values(data).filter(p => p.status === 'Kontrollert').length
  const avvikPunkter = Object.values(data).filter(p => p.avvik).length
  const progress = Math.round((kontrollertePunkter / totalPunkter) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">NS3960 Kontroll</h1>
                <p className="text-sm text-gray-400">{anleggsNavn}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Offline/Online indicator */}
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs">
                  <WifiOff className="w-4 h-4" />
                  Offline
                </div>
              )}
              {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Synkroniserer...
                </div>
              )}
              {/* Auto-save indicator */}
              {autoSaving && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Lagrer...
                </div>
              )}
              {lastSaved && !autoSaving && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  {isOnline && <Wifi className="w-3 h-3" />}
                  Lagret {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-white/5 rounded-lg"
              >
                <Search className="w-5 h-5 text-gray-400" />
              </button>
              <button 
                onClick={() => setShowOnlyUnchecked(!showOnlyUnchecked)}
                className={`btn-secondary text-sm ${showOnlyUnchecked ? 'bg-primary text-white' : ''}`}
              >
                {showOnlyUnchecked ? 'Vis alle' : 'Kun ukontrollerte'}
              </button>
              <button onClick={loadData} className="btn-secondary text-sm">
                Oppdater
              </button>
            </div>
          </div>

          {showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk i kontrollpunkter..."
              className="input mb-4"
              autoFocus
            />
          )}

          {/* Progress */}
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Fremdrift</span>
              <span className="text-sm font-semibold text-white">{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="text-gray-400">Kontrollert</div>
                <div className="text-green-400 font-semibold">{kontrollertePunkter}/{totalPunkter}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Avvik</div>
                <div className="text-orange-400 font-semibold">{avvikPunkter}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Gjenstår</div>
                <div className="text-blue-400 font-semibold">{totalPunkter - kontrollertePunkter}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {Object.entries(filteredCategories).map(([category, punkter]) => {
          const isCollapsed = collapsedCategories.has(category)
          const categoryPunkter = showOnlyUnchecked 
            ? punkter.filter(p => data[p].status !== 'Kontrollert')
            : punkter
          const completedCount = punkter.filter(p => data[p].status === 'Kontrollert').length
          
          if (showOnlyUnchecked && categoryPunkter.length === 0) return null
          
          return (
          <div key={category} className="card">
            {/* Category Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-3 flex-1 text-left group"
              >
                <div className={`transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                    {category}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      {completedCount}/{punkter.length} kontrollert
                    </span>
                    <div className="flex-1 max-w-xs bg-gray-800 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(completedCount / punkter.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Quick actions */}
              {!isCollapsed && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markAllInCategory(category, 'Kontrollert')}
                    className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                  >
                    ✓ Marker alle
                  </button>
                  <button
                    onClick={() => markAllInCategory(category, 'Ikke aktuell')}
                    className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Ikke aktuell
                  </button>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
            <div className="space-y-3">
              {punkter.map(punkt => {
                const punktData = data[punkt]
                return (
                  <div
                    key={punkt}
                    className={`p-4 rounded-lg border transition-colors ${
                      punktData.avvik
                        ? 'border-orange-500/30 bg-orange-500/5'
                        : punktData.status === 'Kontrollert'
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-gray-800 bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {punktData.status === 'Kontrollert' && !punktData.avvik && (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      )}
                      {punktData.avvik && (
                        <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-white font-medium mb-3">{punkt}</p>

                        {/* Status buttons */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {['Kontrollert', 'Ikke aktuell', 'Ikke tilkomst'].map(status => (
                            <button
                              key={status}
                              onClick={() => updatePunkt(punkt, { status: status as any })}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                punktData.status === status
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>

                        {/* Avvik checkbox */}
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={punktData.avvik}
                            onChange={(e) => updatePunkt(punkt, { avvik: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500"
                          />
                          <span className="text-sm text-gray-300">Avvik</span>
                        </label>

                        {/* Kommentar */}
                        <textarea
                          value={punktData.kommentar}
                          onChange={(e) => updatePunkt(punkt, { kommentar: e.target.value })}
                          placeholder="Kommentar..."
                          className="input text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
          )
        })}
      </div>

      {/* Ekstra informasjon */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Tilleggsinformasjon</h3>
        
        {/* Anleggsinfo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Leverandør
            </label>
            <input
              type="text"
              value={leverandor}
              onChange={(e) => {
                setLeverandor(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Leverandør..."
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sentraltype
            </label>
            <input
              type="text"
              value={sentraltype}
              onChange={(e) => {
                setSentraltype(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Sentraltype..."
              className="input"
            />
          </div>
        </div>
        
        {/* Merknader */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Merknader
          </label>
          <textarea
            value={merknader}
            onChange={(e) => {
              setMerknader(e.target.value)
              setHasUnsavedChanges(true)
            }}
            placeholder="Generelle merknader til kontrollen..."
            className="input"
            rows={3}
          />
        </div>

        {/* Har feil */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={harFeil}
              onChange={(e) => {
                setHarFeil(e.target.checked)
                setHasUnsavedChanges(true)
              }}
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-300">Har feil</span>
          </label>
          {harFeil && (
            <textarea
              value={feilKommentar}
              onChange={(e) => {
                setFeilKommentar(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Beskriv feilene..."
              className="input mt-2"
              rows={2}
            />
          )}
        </div>

        {/* Har utkoblinger */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={harUtkoblinger}
              onChange={(e) => {
                setHarUtkoblinger(e.target.checked)
                setHasUnsavedChanges(true)
              }}
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-sm font-medium text-gray-300">Har utkoblinger</span>
          </label>
          {harUtkoblinger && (
            <textarea
              value={utkoblingKommentar}
              onChange={(e) => {
                setUtkoblingKommentar(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Beskriv utkoblingene..."
              className="input mt-2"
              rows={2}
            />
          )}
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lagre
              </>
            )}
          </button>
          <button
            onClick={handleComplete}
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Fullfør kontroll
          </button>
        </div>
      </div>
    </div>
  )
}
