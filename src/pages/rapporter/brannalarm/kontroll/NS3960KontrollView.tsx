import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardCheck, MessageSquare, MoreHorizontal, Plus, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { FileText } from 'lucide-react'
import { STYRINGER, StyringRad, lesEgendefinerte, lesStyringer, styringTilKolonner, type Egendefinert, type Styring } from '../EnheterView'
import type { BrannalarmStyring } from '../../Brannalarm'
import { useOfflineStatus, useOfflineQueue } from '@/hooks/useOffline'
import { cacheData, getCachedData } from '@/lib/offline'

interface Avvik {
  id: string
  beskrivelse: string
}

interface KontrollpunktData {
  kontrollpunkt_navn: string
  status: 'Kontrollert' | 'Ikke aktuell' | 'Ikke tilkomst' | null
  avvik: boolean
  avvikListe: Avvik[]
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
    'Trådløse anlegg - internkommunikasjon',
    'Enhet for utkobling',
    'Tidsforsinkelse',
    'Todetektor-avhengighet',
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
    'Gjennomgang av detektorliste',
    'Gjennomgang egenkontroll med sluttbruker',
    'Servicemerking/kontroll oblat',
    'Opplæring sluttkunde',
    'Tegninger som bygget',
    'Projekteringsgrunnlag, Overvåket område, Spesielle områder, Begrenset alarmanlegg, Dokumentasjon på fravik fra prosjekteringsstandard',
  ],
}

export function NS3960KontrollView({ anleggId, anleggsNavn: initialAnleggsNavn, kontrollId, onBack, onShowRapport }: NS3960KontrollViewProps) {
  const { isOnline, isSyncing } = useOfflineStatus()
  const { queueInsert, queueUpdate } = useOfflineQueue()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'gjenstar' | 'avvik' | 'alle'>('gjenstar')
  const [apent, setApent] = useState<string | null>(null)
  const [visOm, setVisOm] = useState(false)
  // Styringer på anlegget – status settes her under kontrollen og lagres på anleggsdata_brannalarm
  const [styr, setStyr] = useState<Record<string, Styring>>({})
  const [egne, setEgne] = useState<Egendefinert[]>([])
  const [brannalarmRadId, setBrannalarmRadId] = useState<string | null>(null)
  const [styrLagrer, setStyrLagrer] = useState<string | null>(null)
  const [styrNotat, setStyrNotat] = useState<Set<string>>(new Set())
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
        { kontrollpunkt_navn: navn, status: null, avvik: false, avvikListe: [], kommentar: '' }
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
        .select('*')
        .eq('anlegg_id', anleggId)
        .maybeSingle()
      
      if (brannalarmError) {
        console.error('Feil ved henting av brannalarmdata:', brannalarmError)
      } else if (brannalarmData) {
        setLeverandor(brannalarmData.leverandor || '')
        setSentraltype(brannalarmData.sentraltype || '')
        setBrannalarmRadId(brannalarmData.id)
        setStyr(lesStyringer(brannalarmData as unknown as BrannalarmStyring))
        setEgne(lesEgendefinerte(brannalarmData as unknown as BrannalarmStyring))
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
                avvikListe: punkt.avvik_liste ? JSON.parse(punkt.avvik_liste) : [],
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
          data: kontrollpunkter ? Object.fromEntries(
            kontrollpunkter.map(p => [p.kontrollpunkt_navn, {
              kontrollpunkt_navn: p.kontrollpunkt_navn,
              status: p.status,
              avvik: p.avvik || false,
              avvikListe: p.avvik_liste ? JSON.parse(p.avvik_liste) : [],
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
      toast.warning('Kontrollen er ikke klar ennå – vent litt og prøv igjen.')
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
      toast.info('Lagret lokalt – synkroniseres når du er på nett igjen')
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
      
      // Lagre alle punkter med upsert (oppdater hvis eksisterer, ellers insert)
      const punkterToSave = Object.values(data).map(punkt => ({
        kontroll_id: currentKontrollId,
        anlegg_id: anleggId,
        kontrollpunkt_navn: punkt.kontrollpunkt_navn,
        status: punkt.status,
        avvik: punkt.avvik,
        avvik_liste: JSON.stringify(punkt.avvikListe || []),
        kommentar: punkt.kommentar,
      }))
      
      console.log('Lagrer kontrollpunkter:', punkterToSave.length)

      const { error } = await supabase
        .from('ns3960_kontrollpunkter')
        .upsert(punkterToSave, { 
          onConflict: 'kontroll_id,kontrollpunkt_navn',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Supabase error:', error)
        console.error('Feilmelding:', error.message)
        console.error('Feilkode:', error.code)
        console.error('Detaljer:', error.details)
        if (error.message?.includes('avvik_liste')) {
          throw new Error('Database-feil: avvik_liste kolonnen mangler. Kjør SQL: ALTER TABLE ns3960_kontrollpunkter ADD COLUMN IF NOT EXISTS avvik_liste TEXT;')
        }
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
      toast.error('Kunne ikke lagre kontrollen', error)
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
        toast.success('Kontrollen er lagret')
        onBack()
      }
    } catch (error) {
      console.error('Feil ved fullføring:', error)
      toast.error('Kunne ikke fullføre kontrollen', error)
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
      
      // Oppdater kontrollpunkter med upsert
      const punkterToSave = Object.values(data).map(punkt => ({
        kontroll_id: currentKontrollId,
        anlegg_id: anleggId,
        kontrollpunkt_navn: punkt.kontrollpunkt_navn,
        status: punkt.status,
        avvik: punkt.avvik,
        avvik_liste: JSON.stringify(punkt.avvikListe || []),
        kommentar: punkt.kommentar,
      }))

      await supabase
        .from('ns3960_kontrollpunkter')
        .upsert(punkterToSave, { 
          onConflict: 'kontroll_id,kontrollpunkt_navn',
          ignoreDuplicates: false 
        })

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

  const totalPunkter = allKontrollpunkter.length
  const ferdigVurdertePunkter = Object.values(data).filter(p => p.status !== null).length
  const avvikPunkter = Object.values(data).filter(p => p.avvik).length
  const progress = Math.round((ferdigVurdertePunkter / totalPunkter) * 100)
  const gjenstar = totalPunkter - ferdigVurdertePunkter

  async function skrivBrannalarm(merke: string, kolonner: Record<string, unknown>): Promise<boolean> {
    setStyrLagrer(merke)
    const res = brannalarmRadId
      ? await supabase.from('anleggsdata_brannalarm').update(kolonner).eq('id', brannalarmRadId)
      : await supabase.from('anleggsdata_brannalarm').upsert({ anlegg_id: anleggId, ...kolonner }, { onConflict: 'anlegg_id' }).select('id').single()
    setStyrLagrer(null)
    if (res.error) { toast.error('Kunne ikke lagre styring', res.error); return false }
    if (!brannalarmRadId && 'data' in res && res.data) setBrannalarmRadId((res.data as { id: string }).id)
    return true
  }
  async function lagreStyring(key: string, ny: Styring) {
    const forrige = styr[key]
    setStyr(prev => ({ ...prev, [key]: ny }))
    if (!(await skrivBrannalarm(key, styringTilKolonner(key, ny)))) setStyr(prev => ({ ...prev, [key]: forrige }))
  }
  async function lagreEgenStyring(id: string, ny: Styring) {
    const forrige = egne
    const oppdatert = egne.map(x => x.id === id ? { ...x, antall: ny.antall, status: ny.status, note: ny.note, avvik: ny.avvik } : x)
    setEgne(oppdatert)
    if (!(await skrivBrannalarm(`e:${id}`, { egendefinerte: oppdatert }))) setEgne(forrige)
  }
  const aktiveStyringer = STYRINGER.filter(x => styr[x.key]?.aktiv)
  const egneStyringer = egne.filter(x => x.slag === 'styring')
  const styringerTotalt = aktiveStyringer.length + egneStyringer.length
  const styringerVurdert = aktiveStyringer.filter(x => styr[x.key].status).length + egneStyringer.filter(x => x.status).length
  const styringerAvvik = aktiveStyringer.filter(x => styr[x.key].avvik.length > 0).length + egneStyringer.filter(x => x.avvik.length > 0).length

  function visPunkt(navn: string) {
    const p = data[navn]
    if (filter === 'gjenstar') return p.status === null
    if (filter === 'avvik') return p.avvik
    return true
  }
  function settStatus(navn: string, status: KontrollpunktData['status']) {
    const p = data[navn]
    updatePunkt(navn, { status: p.status === status ? null : status })
  }
  function toggleAvvik(navn: string) {
    const p = data[navn]
    if (p.avvik) updatePunkt(navn, { avvik: false, avvikListe: [] })
    else { updatePunkt(navn, { avvik: true, avvikListe: p.avvikListe.length ? p.avvikListe : [{ id: crypto.randomUUID(), beskrivelse: '' }], status: p.status ?? 'Kontrollert' }); setApent(navn) }
  }
  async function tilbake() {
    if (hasUnsavedChanges) await autoSave()
    onBack()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={tilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Brannalarm</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggsNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">NS 3960-kontroll</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{anleggsNavn}{leverandor || sentraltype ? ` · ${[leverandor, sentraltype].filter(Boolean).join(' ')}` : ''}</p>
        </div>
        <p className="text-xs text-gray-400 sm:text-right whitespace-nowrap">{!isOnline ? 'Offline – lagres lokalt' : autoSaving || isSyncing ? 'Lagrer…' : hasUnsavedChanges ? 'Ulagrede endringer' : lastSaved ? `Lagret ${lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : 'Lagres automatisk'}</p>
      </header>

      {/* Fremdrift – henger igjen øverst mens du scroller */}
      <div className="sticky top-16 lg:top-2 z-10 -mx-4 px-4 sm:mx-0 sm:px-0 pt-1 pb-2 bg-white/90 dark:bg-dark/90 backdrop-blur">
        <div className="card !p-3 space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">{ferdigVurdertePunkter} av {totalPunkter} vurdert <span className="text-gray-400 font-normal">· {progress} %</span></span>
            {avvikPunkter > 0 && <span className="inline-flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400"><AlertTriangle className="w-4 h-4" />{avvikPunkter} med avvik</span>}
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden"><div className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${progress}%` }} /></div>
          <div className="flex gap-2 overflow-x-auto -mx-3 px-3" role="group" aria-label="Filter">
            <Chip aktiv={filter === 'gjenstar'} onClick={() => setFilter('gjenstar')}>Gjenstår <b>{gjenstar}</b></Chip>
            <Chip aktiv={filter === 'avvik'} onClick={() => setFilter('avvik')}><span className="w-2 h-2 rounded-full bg-orange-500" />Avvik <b>{avvikPunkter}</b></Chip>
            <Chip aktiv={filter === 'alle'} onClick={() => setFilter('alle')}>Alle <b>{totalPunkter}</b></Chip>
          </div>
        </div>
      </div>

      {gjenstar === 0 && styringerVurdert === styringerTotalt && filter === 'gjenstar' && (
        <div className="card text-center py-8 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Alle {totalPunkter} punkter er vurdert 🎉</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Fyll ut «Om kontrollen» nederst og trykk «Fullfør og lag rapport». <button type="button" onClick={() => setFilter('alle')} className="text-primary hover:underline">Vis alle punkter</button></p>
        </div>
      )}

      {Object.entries(KONTROLLPUNKTER_BY_CATEGORY).map(([kategori, punkter]) => {
        const synlige = punkter.filter(visPunkt)
        if (synlige.length === 0) return null
        const ferdig = punkter.filter(n => data[n]?.status != null).length
        const lukket = collapsedCategories.has(kategori)
        return (
          <section key={kategori} className="card !p-0 overflow-hidden" aria-label={kategori}>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-100">
              <button type="button" onClick={() => toggleCategory(kategori)} aria-expanded={!lukket} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', !lukket && 'rotate-90')} />
                <span className="font-semibold text-gray-900 dark:text-white truncate">{kategori}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{ferdig} av {punkter.length}</span>
                {ferdig === punkter.length && <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3} />}
              </button>
              <DropdownMenu trigger={open => <IconButton variant="ghost" label="Handlinger for kategorien" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                <MenuItem icon={<Check />} onSelect={() => markAllInCategory(kategori, 'Kontrollert')}>Merk alle som kontrollert</MenuItem>
                <MenuItem icon={<X />} onSelect={() => markAllInCategory(kategori, 'Ikke aktuell')}>Merk alle som ikke aktuell</MenuItem>
              </DropdownMenu>
            </div>
            {!lukket && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {synlige.map(navn => {
                  const p = data[navn]
                  const erApen = apent === navn
                  const harDetaljer = p.avvik || Boolean(p.kommentar)
                  return (
                    <div key={navn} className={cn('px-3 py-2', p.avvik ? 'bg-orange-50/50 dark:bg-orange-900/10' : p.status === 'Kontrollert' ? '' : p.status ? 'bg-gray-50/60 dark:bg-dark-100/40' : '')}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <button type="button" onClick={() => setApent(erApen ? null : navn)} aria-expanded={erApen} className="flex-1 min-w-0 flex items-start gap-2.5 text-left py-1">
                          <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-px', p.avvik ? 'bg-orange-500 border-orange-500 text-white' : p.status === 'Kontrollert' ? 'bg-green-500 border-green-500 text-white' : p.status ? 'bg-gray-400 border-gray-400 text-white' : 'border-gray-300 dark:border-gray-600')}>
                            {p.avvik ? <AlertTriangle className="w-3 h-3" /> : p.status === 'Kontrollert' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : p.status ? <X className="w-3 h-3" strokeWidth={3} /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className={cn('block text-sm leading-snug', p.status ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium')}>{navn}</span>
                            {(harDetaljer && !erApen) && <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{p.avvik ? `${p.avvikListe.filter(a => a.beskrivelse.trim()).length || p.avvikListe.length} avvik${p.avvikListe[0]?.beskrivelse ? `: ${p.avvikListe[0].beskrivelse}` : ''}` : ''}{p.avvik && p.kommentar ? ' · ' : ''}{p.kommentar ? `Kommentar: ${p.kommentar}` : ''}</span>}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 flex-shrink-0 pl-8 sm:pl-0">
                          <button type="button" onClick={() => settStatus(navn, 'Kontrollert')} aria-pressed={p.status === 'Kontrollert'} className={cn('h-9 px-3.5 rounded-lg text-sm font-semibold border inline-flex items-center gap-1', p.status === 'Kontrollert' ? 'bg-green-500 border-green-500 text-white' : 'border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20')}><Check className="w-3.5 h-3.5" strokeWidth={3} />OK</button>
                          <button type="button" onClick={() => settStatus(navn, 'Ikke aktuell')} aria-pressed={p.status === 'Ikke aktuell'} title="Ikke aktuell" className={cn('h-9 px-2.5 rounded-lg text-xs border', p.status === 'Ikke aktuell' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>N/A</button>
                          <button type="button" onClick={() => settStatus(navn, 'Ikke tilkomst')} aria-pressed={p.status === 'Ikke tilkomst'} title="Ikke tilkomst" className={cn('h-9 px-2.5 rounded-lg text-xs border whitespace-nowrap', p.status === 'Ikke tilkomst' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>Ikke tilkomst</button>
                          <button type="button" onClick={() => toggleAvvik(navn)} aria-pressed={p.avvik} title="Avvik" className={cn('h-9 px-2.5 rounded-lg text-xs border inline-flex items-center gap-1', p.avvik ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600')}><AlertTriangle className="w-3.5 h-3.5" />{p.avvik ? p.avvikListe.length : 'Avvik'}</button>
                          <IconButton variant="ghost" label={erApen ? 'Skjul detaljer' : 'Kommentar og detaljer'} icon={p.kommentar ? <MessageSquare className="text-primary" /> : <ChevronDown className={cn('transition-transform', erApen && 'rotate-180')} />} onClick={() => setApent(erApen ? null : navn)} className="w-8 h-8" />
                        </div>
                      </div>
                      {erApen && (
                        <div className="mt-2 ml-8 space-y-2">
                          {p.avvik && (
                            <div className="space-y-1.5">
                              {p.avvikListe.map((a, idx) => (
                                <div key={a.id} className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                                  <input value={a.beskrivelse} onChange={e => updatePunkt(navn, { avvikListe: p.avvikListe.map((x, i) => i === idx ? { ...x, beskrivelse: e.target.value } : x) })} placeholder="Beskriv avviket …" autoFocus={!a.beskrivelse && idx === p.avvikListe.length - 1} className="input !h-[36px] !min-h-[36px] !py-0 text-sm flex-1" />
                                  <IconButton variant="ghost" label="Fjern avvik" icon={<X />} onClick={() => { const l = p.avvikListe.filter((_, i) => i !== idx); updatePunkt(navn, { avvikListe: l, avvik: l.length > 0 }) }} className="w-8 h-8 hover:!text-red-500" />
                                </div>
                              ))}
                              <button type="button" onClick={() => updatePunkt(navn, { avvikListe: [...p.avvikListe, { id: crypto.randomUUID(), beskrivelse: '' }] })} className="text-xs text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Ett avvik til</button>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-2.5 flex-shrink-0" />
                            <textarea value={p.kommentar} onChange={e => updatePunkt(navn, { kommentar: e.target.value })} placeholder="Kommentar til punktet (valgfritt)" rows={2} className="input !h-auto text-sm flex-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {/* Styringer på anlegget */}
      {styringerTotalt > 0 && (
        <section className="card !p-0 overflow-hidden" aria-label="Styringer">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-100">
            <button type="button" onClick={() => toggleCategory('__styringer')} aria-expanded={!collapsedCategories.has('__styringer')} className="flex items-center gap-2 flex-1 min-w-0 text-left">
              <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', !collapsedCategories.has('__styringer') && 'rotate-90')} />
              <span className="font-semibold text-gray-900 dark:text-white">Styringer på anlegget</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{styringerVurdert} av {styringerTotalt}</span>
              {styringerVurdert === styringerTotalt && <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3} />}
              {styringerAvvik > 0 && <span className="text-xs text-orange-600 dark:text-orange-400">· {styringerAvvik} avvik</span>}
            </button>
            <DropdownMenu trigger={open => <IconButton variant="ghost" label="Handlinger" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
              <MenuItem icon={<Check />} onSelect={() => { aktiveStyringer.forEach(x => { if (!styr[x.key].status) lagreStyring(x.key, { ...styr[x.key], status: 'Kontrollert' }) }); egneStyringer.forEach(x => { if (!x.status) lagreEgenStyring(x.id, { aktiv: true, antall: x.antall, status: 'Kontrollert', note: x.note, avvik: x.avvik }) }) }}>Merk resten som kontrollert</MenuItem>
            </DropdownMenu>
          </div>
          {!collapsedCategories.has('__styringer') && filter !== 'alle' && aktiveStyringer.filter(x => filter === 'gjenstar' ? !styr[x.key].status : styr[x.key].avvik.length > 0).length + egneStyringer.filter(x => filter === 'gjenstar' ? !x.status : x.avvik.length > 0).length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{filter === 'gjenstar' ? 'Alle styringer har fått status.' : 'Ingen styringer med avvik.'} <button type="button" onClick={() => setFilter('alle')} className="text-primary hover:underline">Vis alle</button></p>
          )}
          {!collapsedCategories.has('__styringer') && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {aktiveStyringer.filter(x => filter === 'alle' || (filter === 'gjenstar' ? !styr[x.key].status : styr[x.key].avvik.length > 0)).map(x => (
                <StyringRad key={x.key} navn={x.navn} Ikon={x.icon} st={styr[x.key]} lagrer={styrLagrer === x.key} notatApen={styrNotat.has(x.key)} onNotat={() => setStyrNotat(prev => { const n = new Set(prev); n.add(x.key); return n })} onLagre={ny => lagreStyring(x.key, ny)} />
              ))}
              {egneStyringer.filter(x => filter === 'alle' || (filter === 'gjenstar' ? !x.status : x.avvik.length > 0)).map(x => (
                <StyringRad key={x.id} navn={x.navn} Ikon={FileText} egen st={{ aktiv: true, antall: x.antall, status: x.status, note: x.note, avvik: x.avvik }} lagrer={styrLagrer === `e:${x.id}`} notatApen={styrNotat.has(`e:${x.id}`)} onNotat={() => setStyrNotat(prev => { const n = new Set(prev); n.add(`e:${x.id}`); return n })} onLagre={ny => lagreEgenStyring(x.id, ny)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Om kontrollen */}
      <section className="card !p-0 overflow-hidden" aria-label="Om kontrollen">
        <button type="button" onClick={() => setVisOm(v => !v)} aria-expanded={visOm} className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-dark-100 text-left">
          <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', visOm && 'rotate-90')} />
          <span className="font-semibold text-gray-900 dark:text-white">Om kontrollen</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{[leverandor && `${leverandor}${sentraltype ? ` ${sentraltype}` : ''}`, harFeil ? 'Feil i anlegget' : null, harUtkoblinger ? 'Utkoblinger' : null, merknader ? 'Merknader' : null].filter(Boolean).join(' · ') || 'Leverandør, merknader, feil og utkoblinger'}</span>
        </button>
        {visOm && (
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label htmlFor="k-lev" className="block text-sm font-medium text-gray-900 dark:text-white">Leverandør</label><input id="k-lev" value={leverandor} onChange={e => { setLeverandor(e.target.value); setHasUnsavedChanges(true) }} placeholder="F.eks. Autronica" className="input" /></div>
              <div className="space-y-1.5"><label htmlFor="k-sen" className="block text-sm font-medium text-gray-900 dark:text-white">Sentraltype</label><input id="k-sen" value={sentraltype} onChange={e => { setSentraltype(e.target.value); setHasUnsavedChanges(true) }} placeholder="F.eks. Autrosafe" className="input" /></div>
            </div>
            <div className="space-y-1.5"><label htmlFor="k-merk" className="block text-sm font-medium text-gray-900 dark:text-white">Merknader til kontrollen</label><textarea id="k-merk" value={merknader} onChange={e => { setMerknader(e.target.value); setHasUnsavedChanges(true) }} rows={3} placeholder="Generelle merknader som skal med i rapporten" className="input !h-auto" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"><input type="checkbox" checked={harFeil} onChange={e => { setHarFeil(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 rounded text-primary focus:ring-primary" />Feil i anlegget</label>
                {harFeil && <textarea value={feilKommentar} onChange={e => { setFeilKommentar(e.target.value); setHasUnsavedChanges(true) }} rows={2} placeholder="Beskriv feilene" className="input !h-auto text-sm" />}
              </div>
              <div className="space-y-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"><input type="checkbox" checked={harUtkoblinger} onChange={e => { setHarUtkoblinger(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 rounded text-primary focus:ring-primary" />Utkoblinger</label>
                {harUtkoblinger && <textarea value={utkoblingKommentar} onChange={e => { setUtkoblingKommentar(e.target.value); setHasUnsavedChanges(true) }} rows={2} placeholder="Beskriv utkoblingene" className="input !h-auto text-sm" />}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bunnlinje */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-auto tabular-nums">{gjenstar > 0 ? `${gjenstar} punkter gjenstår` : 'Alle punkter vurdert'}{styringerTotalt - styringerVurdert > 0 ? ` · ${styringerTotalt - styringerVurdert} styringer` : ''}{avvikPunkter + styringerAvvik ? ` · ${avvikPunkter + styringerAvvik} avvik` : ''}</span>
        <Button variant="ghost" loading={saving} disabled={!hasUnsavedChanges} onClick={handleSave}><span className="hidden sm:inline">Lagre nå</span><span className="sm:hidden">Lagre</span></Button>
        <Button variant="primary" icon={<ClipboardCheck />} loading={saving} onClick={handleComplete}>Fullfør og lag rapport</Button>
      </div>
    </div>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[32px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
