import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, CheckCircle, Info, X, Maximize2, Minimize2, WifiOff } from 'lucide-react'
import { KONTROLLPUNKTER_FG790, AVVIK_TYPER, AG_VERDIER, beregnPoengFraAG, FEILKODER, KONTROLLPUNKT_REFERANSER } from '@/lib/constants/fg790'
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
  const [showReferanseDialog, setShowReferanseDialog] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenPunkt, setFullscreenPunkt] = useState<string | null>(null)
  const [showKomplettDialog, setShowKomplettDialog] = useState(false)
  const [anleggsvurderingCollapsed, setAnleggsvurderingCollapsed] = useState(false)
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
  useEffect(() => {
    if (!hasUnsavedChanges || !currentKontrollId) return

    const autoSaveInterval = setInterval(() => {
      console.log('Autosave triggered')
      handleSave(true) // true = silent save
    }, 30000) // 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [hasUnsavedChanges, currentKontrollId])

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
      if (!silent) alert('✓ Lagret lokalt (offline). Synkroniseres når nettilgang er tilgjengelig.')
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
        alert(`Feil ved lagring: ${error.message}`)
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
        if (!silent) alert(`Feil ved lagring av anleggsvurdering: ${vurderingError.message}`)
      } else {
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        if (!silent) alert('Kontroll lagret! ✓')
      }
    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      alert(`Feil ved lagring: ${error.message || 'Ukjent feil'}`)
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
  const kontrollertePunkter = Object.values(data).filter(p => p.status === 'Kontrollert').length
  const avvikPunkter = Object.values(data).filter(p => p.avvik_type !== null && p.avvik_type !== '').length
  const agPunkter = Object.values(data).filter(p => p.ag_verdi && p.ag_verdi !== '').length
  const totalPoengTrekk = Object.values(data).reduce((sum, p) => sum + ((p.poeng_trekk || 0) * (p.antall_avvik || 1)), 0)
  const sluttScore = Math.max(0, 100 - totalPoengTrekk) // Starter på 100, trekker fra avvik
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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">FG790 Kontroll</h1>
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
              
              {/* Fullscreen toggle */}
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen()
                    setIsFullscreen(true)
                  } else {
                    document.exitFullscreen()
                    setIsFullscreen(false)
                  }
                }}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                title={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-gray-400" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Totalsum Score */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 mb-3 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Totalsum</div>
                <div className="text-3xl font-bold text-white">
                  {sluttScore.toFixed(1)}
                  <span className="text-lg text-gray-400 ml-1">/ 100</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  100 - {totalPoengTrekk.toFixed(1)} poeng trekk
                </div>
              </div>
              <div className={`text-6xl ${
                sluttScore >= 90 ? 'text-green-500' :
                sluttScore >= 70 ? 'text-yellow-500' :
                sluttScore >= 50 ? 'text-orange-500' :
                'text-red-500'
              }`}>
                {sluttScore >= 90 ? '🟢' :
                 sluttScore >= 70 ? '🟡' :
                 sluttScore >= 50 ? '🟠' :
                 '🔴'}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-900 rounded-lg p-3 mb-3">
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
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="text-gray-400">Kontrollert</div>
                <div className="text-green-400 font-semibold">{kontrollertePunkter}/{totalPunkter}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Avvik</div>
                <div className="text-orange-400 font-semibold">{avvikPunkter}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">AG-verdier</div>
                <div className="text-blue-400 font-semibold">{agPunkter}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Gjenstår</div>
                <div className="text-blue-400 font-semibold">{totalPunkter - kontrollertePunkter}</div>
              </div>
            </div>
          </div>

          {/* Anleggsvurdering (FG790 Tabell 3.5.2-1) */}
          <div className="bg-gray-900 rounded-lg border border-blue-500/30">
            <button
              onClick={() => setAnleggsvurderingCollapsed(!anleggsvurderingCollapsed)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-sm font-semibold text-blue-400">Anleggsvurdering (Tabell 3.5.2-1)</h3>
              <div className={`transform transition-transform ${anleggsvurderingCollapsed ? '' : 'rotate-90'}`}>
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            
            {!anleggsvurderingCollapsed && (
              <div className="px-4 pb-4 space-y-3">
            
                {/* Kontrollørens vurdering */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    1. Kontrollørens vurdering <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={kontrollorVurderingSum ?? ''}
                      onChange={(e) => {
                        setKontrollorVurderingSum(e.target.value ? parseInt(e.target.value) : null)
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Sum (0-100)"
                      className="input text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={kontrollorVurderingKommentar}
                      onChange={(e) => {
                        setKontrollorVurderingKommentar(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Kommentar"
                      className="input text-sm"
                    />
                  </div>
                </div>

                {/* Ingen anleggsvurdering */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <input
                      type="checkbox"
                      checked={ingenAnleggsvurdering}
                      onChange={(e) => {
                        setIngenAnleggsvurdering(e.target.checked)
                        setHasUnsavedChanges(true)
                      }}
                      className="rounded"
                    />
                    2. Ingen anleggsvurdering (Se 3.5.3.2)
                  </label>
                  {ingenAnleggsvurdering && (
                    <input
                      type="text"
                      value={ingenAnleggsvurderingKommentar}
                      onChange={(e) => {
                        setIngenAnleggsvurderingKommentar(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Kommentar (f.eks. 'Ikke fulldekkende anlegg. Mangler brannskille.')"
                      className="input text-sm w-full"
                      required
                    />
                  )}
                </div>

                {/* Kritisk funksjonsfeil */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <input
                      type="checkbox"
                      checked={kritiskFeil}
                      onChange={(e) => {
                        setKritiskFeil(e.target.checked)
                        setHasUnsavedChanges(true)
                      }}
                      className="rounded"
                    />
                    3. Kritisk funksjonsfeil (Se 3.5.3.3)
                  </label>
                  {kritiskFeil && (
                    <input
                      type="text"
                      value={kritiskFeilKommentar}
                      onChange={(e) => {
                        setKritiskFeilKommentar(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Kommentar (f.eks. 'Ikke-funksjonelt anlegg. Feil må utbedres umiddelbart.')"
                      className="input text-sm w-full bg-red-500/10 border-red-500/30"
                      required
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {Object.entries(KONTROLLPUNKTER_FG790).map(([posisjon, kategorier]) => {
          const isPosisjonCollapsed = collapsedPosisjoner.has(posisjon)
          const posisjonPunkter = Object.values(data).filter(p => p.posisjon === posisjon)
          const posisjonKontrollerte = posisjonPunkter.filter(p => p.status === 'Kontrollert').length
          
          return (
            <div key={posisjon} className="card">
              {/* Posisjon Header */}
              <div className="flex items-center justify-between w-full mb-4">
                <button
                  onClick={() => togglePosisjon(posisjon)}
                  className="flex items-center gap-3 flex-1 group"
                >
                  <div className={`transform transition-transform ${isPosisjonCollapsed ? '' : 'rotate-90'}`}>
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-primary group-hover:text-primary/80 transition-colors">
                      {posisjon}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {posisjonKontrollerte}/{posisjonPunkter.length} kontrollert
                      </span>
                      <div className="w-32 bg-gray-800 rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${(posisjonKontrollerte / posisjonPunkter.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Fullskjerm knapp for posisjon */}
                <button
                  onClick={() => setFullscreenPunkt(posisjon)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Åpne posisjon i fullskjerm"
                >
                  <Maximize2 className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Kategorier og punkter */}
              {!isPosisjonCollapsed && (
                <div className="space-y-4 ml-9">
                  {Object.entries(kategorier).map(([kategori, punkter]) => (
                    <div key={`${posisjon}|${kategori}`} className="border border-gray-800 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3">{kategori}</h3>
                      
                      <div className="space-y-3">
                        {punkter.map(tittel => {
                          const key = `${posisjon}|${kategori}|${tittel}`
                          const punktData = data[key]
                          
                          return (
                            <div
                              key={key}
                              className={`p-3 rounded-lg border transition-colors ${
                                punktData.status === 'Kontrollert'
                                  ? 'border-green-500/30 bg-green-500/5'
                                  : 'border-gray-800 bg-gray-900/50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-white font-medium flex-1">{tittel}</p>
                                
                                {/* Info knapp for referanse */}
                                {KONTROLLPUNKT_REFERANSER[tittel] && (
                                  <button
                                    onClick={() => setShowReferanseDialog(tittel)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Vis referanse NS 3960"
                                  >
                                    <Info className="w-4 h-4 text-blue-400" />
                                  </button>
                                )}
                              </div>

                              {/* Status buttons */}
                              <div className="flex flex-wrap gap-2">
                                {['Kontrollert', 'Ikke aktuell', 'Ikke tilkomst'].map(status => (
                                  <button
                                    key={status}
                                    onClick={() => updatePunkt(key, { status: status as any })}
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

                              {/* Avvik type, AG-verdi og poeng trekk */}
                              {punktData.status === 'Kontrollert' && (
                                <div className="mt-3 space-y-3">
                                  {/* AG-verdi (kun for POS.2 detektor-punkter) */}
                                  {punktData.posisjon === 'POS.2 - Visuell kontroll' && 
                                   punktData.tittel.toLowerCase().includes('detektor') && (
                                    <div>
                                      <label className="block text-sm text-gray-400 mb-2">
                                        AG-verdi
                                        <span className="text-xs text-gray-500 ml-2">(Forurensningsgrad)</span>
                                      </label>
                                      <div className="grid grid-cols-5 gap-2">
                                        {AG_VERDIER.map(ag => (
                                          <button
                                            key={ag.verdi}
                                            onClick={() => {
                                              updatePunkt(key, { 
                                                ag_verdi: ag.verdi,
                                                poeng_trekk: ag.poeng,
                                                avvik_type: ag.poeng > 0 ? 'Avvik' : null
                                              })
                                            }}
                                            className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                              punktData.ag_verdi === ag.verdi
                                                ? ag.poeng === 0
                                                  ? 'bg-green-500 text-white'
                                                  : ag.poeng < 1
                                                  ? 'bg-yellow-500 text-white'
                                                  : 'bg-red-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                          >
                                            <div className="text-xs">{ag.verdi}</div>
                                            <div className="text-xs opacity-75">({ag.poeng})</div>
                                          </button>
                                        ))}
                                      </div>
                                      {punktData.ag_verdi && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          {AG_VERDIER.find(a => a.verdi === punktData.ag_verdi)?.beskrivelse} - 
                                          Poeng: {beregnPoengFraAG(punktData.ag_verdi)}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-sm text-gray-400 mb-2">Avvik type</label>
                                    <select
                                      value={punktData.avvik_type || ''}
                                      onChange={(e) => updatePunkt(key, { avvik_type: e.target.value || null })}
                                      className="input text-sm"
                                    >
                                      <option value="">Ingen avvik</option>
                                      {AVVIK_TYPER.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Feilkode - vises kun hvis det er avvik */}
                                  {punktData.avvik_type && (
                                    <div>
                                      <label className="block text-sm text-gray-400 mb-2">Feilkode</label>
                                      <select
                                        value={punktData.feilkode || ''}
                                        onChange={(e) => updatePunkt(key, { feilkode: e.target.value })}
                                        className="input text-sm"
                                      >
                                        <option value="">Velg feilkode</option>
                                        {FEILKODER.map(kode => (
                                          <option key={kode} value={kode}>{kode}</option>
                                        ))}
                                      </select>
                                      
                                      {/* Egendefinert feilkode hvis "Annet" er valgt */}
                                      {(punktData.feilkode === 'Annet' || punktData.feilkode?.startsWith('Annet:')) && (
                                        <input
                                          type="text"
                                          placeholder="Skriv egendefinert feilkode..."
                                          value={punktData.feilkode?.startsWith('Annet:') ? punktData.feilkode.substring(7) : ''}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              updatePunkt(key, { feilkode: `Annet: ${e.target.value}` })
                                            } else {
                                              updatePunkt(key, { feilkode: 'Annet' })
                                            }
                                          }}
                                          className="input text-sm mt-2"
                                        />
                                      )}
                                    </div>
                                  )}

                                  {/* Poeng trekk - vises alltid når det er avvik */}
                                  {punktData.avvik_type && (
                                    <div>
                                      <label className="block text-sm text-gray-400 mb-2">
                                        Poeng trekk
                                        <span className="text-xs text-gray-500 ml-2">(Velg AG-verdi)</span>
                                      </label>
                                      <div className="grid grid-cols-5 gap-2">
                                        {AG_VERDIER.map(ag => (
                                          <button
                                            key={ag.verdi}
                                            onClick={() => updatePunkt(key, { 
                                              ag_verdi: ag.verdi,
                                              poeng_trekk: ag.poeng 
                                            })}
                                            className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                              punktData.ag_verdi === ag.verdi
                                                ? ag.poeng === 0
                                                  ? 'bg-green-500 text-white'
                                                  : ag.poeng < 1
                                                  ? 'bg-yellow-500 text-white'
                                                  : 'bg-red-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                          >
                                            <div className="text-xs">{ag.verdi}</div>
                                            <div className="text-xs opacity-75">({ag.poeng})</div>
                                          </button>
                                        ))}
                                      </div>
                                      {punktData.ag_verdi && (
                                        <div className="mt-2 space-y-2">
                                          <p className="text-xs text-gray-500">
                                            {AG_VERDIER.find(a => a.verdi === punktData.ag_verdi)?.beskrivelse} - 
                                            Poeng per avvik: {beregnPoengFraAG(punktData.ag_verdi)}
                                          </p>
                                          
                                          {/* Antall avvik */}
                                          <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                              Antall avvik av denne typen
                                            </label>
                                            <input
                                              type="number"
                                              min="1"
                                              max="99"
                                              value={punktData.antall_avvik || 1}
                                              onChange={(e) => {
                                                const antall = parseInt(e.target.value) || 1
                                                updatePunkt(key, { antall_avvik: Math.max(1, Math.min(99, antall)) })
                                              }}
                                              className="input text-sm w-24"
                                            />
                                            {punktData.antall_avvik > 1 && (
                                              <p className="text-xs text-orange-400 mt-1">
                                                Totalt: {punktData.antall_avvik} × {punktData.poeng_trekk} = {(punktData.antall_avvik * punktData.poeng_trekk).toFixed(1)} poeng
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Vis total poeng hvis AG-verdi er satt */}
                                  {punktData.ag_verdi && punktData.poeng_trekk > 0 && (
                                    <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                      <p className="text-sm text-orange-400">
                                        ⚠️ Poeng trekk: {(punktData.poeng_trekk * (punktData.antall_avvik || 1)).toFixed(1)} 
                                        {punktData.antall_avvik > 1 && ` (${punktData.antall_avvik} avvik)`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Kommentar */}
                              {punktData.status === 'Kontrollert' && (
                                <textarea
                                  value={punktData.kommentar || ''}
                                  onChange={(e) => updatePunkt(key, { kommentar: e.target.value || null })}
                                  placeholder="Kommentar..."
                                  className="input text-sm mt-2"
                                  rows={2}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800 z-50">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn-secondary flex items-center justify-center gap-2"
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
            {lastSaved && (
              <div className="text-xs text-gray-500 text-center">
                Sist lagret: {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {hasUnsavedChanges && !saving && (
              <div className="text-xs text-yellow-500 text-center">
                Ulagrede endringer
              </div>
            )}
          </div>
          <button
            onClick={() => {
              // Sjekk om alle punkter er kontrollert
              const alleKontrollert = Object.values(data).every(p => p.status !== null)
              
              // Sjekk om anleggsvurdering er utfylt (kun kontrollørens vurdering er påkrevd)
              const anleggsvurderingUtfylt = 
                kontrollorVurderingSum !== null
              
              if (!anleggsvurderingUtfylt) {
                alert('⚠️ Du må fylle ut Anleggsvurdering (Tabell 3.5.2-1) før du kan fullføre kontrollen.\n\nPåkrevd:\n• Kontrollørens vurdering (sum)')
                setAnleggsvurderingCollapsed(false) // Åpne seksjonen
                return
              }
              
              if (!alleKontrollert) {
                setShowKomplettDialog(true)
              } else {
                handleSave(false)
                if (currentKontrollId && onShowRapport) {
                  setTimeout(() => onShowRapport(currentKontrollId), 500)
                }
              }
            }}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Fullfør kontroll
          </button>
        </div>
      </div>

      {/* Komplett dialog */}
      {showKomplettDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowKomplettDialog(false)}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Ikke alle punkter er kontrollert</h3>
            <p className="text-gray-400 mb-6">
              Ikke alle punkter er kontrollert. Vil du fortsette til rapport?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowKomplettDialog(false)}
                className="btn-secondary flex-1"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  // Sjekk om anleggsvurdering er utfylt (kun kontrollørens vurdering er påkrevd)
                  const anleggsvurderingUtfylt = 
                    kontrollorVurderingSum !== null
                  
                  if (!anleggsvurderingUtfylt) {
                    alert('⚠️ Du må fylle ut Anleggsvurdering (Tabell 3.5.2-1) før du kan fullføre kontrollen.\n\nPåkrevd:\n• Kontrollørens vurdering (sum)')
                    setShowKomplettDialog(false)
                    setAnleggsvurderingCollapsed(false) // Åpne seksjonen
                    return
                  }
                  
                  setShowKomplettDialog(false)
                  handleSave(false)
                  if (currentKontrollId && onShowRapport) {
                    setTimeout(() => onShowRapport(currentKontrollId), 500)
                  }
                }}
                className="btn-primary flex-1"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullskjerm Posisjon Dialog */}
      {fullscreenPunkt && (() => {
        // Vis hele posisjonen i fullskjerm
        const posisjon = fullscreenPunkt as keyof typeof KONTROLLPUNKTER_FG790
        const kategorier = KONTROLLPUNKTER_FG790[posisjon]
        if (!kategorier) return null
          
          return (
            <div className="fixed inset-0 bg-gray-950 z-50 overflow-auto pb-20">
              <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 sticky top-0 bg-gray-950 pb-4 border-b border-gray-800">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{posisjon}</h2>
                    <p className="text-sm text-gray-400">Fullskjerm-visning</p>
                  </div>
                  <button
                    onClick={() => setFullscreenPunkt(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Lukk fullskjerm"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                {/* Alle punkter i posisjonen */}
                <div className="space-y-6">
                  {Object.entries(kategorier).map(([kategori, punkter]) => (
                    <div key={kategori} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">{kategori}</h3>
                      
                      <div className="space-y-4">
                        {punkter.map(tittel => {
                          const key = `${posisjon}|${kategori}|${tittel}`
                          const punktData = data[key]
                          
                          return (
                            <div key={key} className="border border-gray-700 rounded-lg p-4">
                              <p className="text-white font-medium mb-3">{tittel}</p>
                              
                              {/* Status buttons */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {['Kontrollert', 'Ikke aktuell', 'Ikke tilkomst'].map(status => (
                                  <button
                                    key={status}
                                    onClick={() => updatePunkt(key, { status: status as any })}
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

                              {/* Vis resten av feltene hvis kontrollert */}
                              {punktData.status === 'Kontrollert' && (
                                <div className="space-y-3 mt-3 pt-3 border-t border-gray-700">
                                  {/* AG-verdi (kun for POS.2 detektor-punkter) */}
                                  {punktData.posisjon === 'POS.2 - Visuell kontroll' && 
                                   punktData.tittel.toLowerCase().includes('detektor') && (
                                    <div>
                                      <label className="block text-sm text-gray-400 mb-2">
                                        AG-verdi
                                        <span className="text-xs text-gray-500 ml-2">(Forurensningsgrad)</span>
                                      </label>
                                      <div className="grid grid-cols-5 gap-2">
                                        {AG_VERDIER.map(ag => (
                                          <button
                                            key={ag.verdi}
                                            onClick={() => {
                                              updatePunkt(key, { 
                                                ag_verdi: ag.verdi,
                                                poeng_trekk: ag.poeng,
                                                avvik_type: ag.poeng > 0 ? 'Avvik' : null
                                              })
                                            }}
                                            className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                              punktData.ag_verdi === ag.verdi
                                                ? ag.poeng === 0
                                                  ? 'bg-green-500 text-white'
                                                  : ag.poeng < 1
                                                  ? 'bg-yellow-500 text-white'
                                                  : 'bg-red-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                          >
                                            <div className="text-xs">{ag.verdi}</div>
                                            <div className="text-xs opacity-75">({ag.poeng})</div>
                                          </button>
                                        ))}
                                      </div>
                                      {punktData.ag_verdi && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          {AG_VERDIER.find(a => a.verdi === punktData.ag_verdi)?.beskrivelse} - 
                                          Poeng: {beregnPoengFraAG(punktData.ag_verdi)}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-sm text-gray-400 mb-2">Avvik type</label>
                                    <select
                                      value={punktData.avvik_type || ''}
                                      onChange={(e) => updatePunkt(key, { avvik_type: e.target.value || null })}
                                      className="input text-sm w-full"
                                    >
                                      <option value="">Ingen avvik</option>
                                      {AVVIK_TYPER.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Feilkode - vises kun hvis det er avvik */}
                                  {punktData.avvik_type && (
                                    <div>
                                      <label className="block text-sm text-gray-400 mb-2">Feilkode</label>
                                      <select
                                        value={punktData.feilkode || ''}
                                        onChange={(e) => updatePunkt(key, { feilkode: e.target.value })}
                                        className="input text-sm w-full"
                                      >
                                        <option value="">Velg feilkode</option>
                                        {FEILKODER.map(kode => (
                                          <option key={kode} value={kode}>{kode}</option>
                                        ))}
                                      </select>
                                      
                                      {/* Egendefinert feilkode hvis "Annet" er valgt */}
                                      {(punktData.feilkode === 'Annet' || punktData.feilkode?.startsWith('Annet:')) && (
                                        <input
                                          type="text"
                                          placeholder="Skriv egendefinert feilkode..."
                                          value={punktData.feilkode?.startsWith('Annet:') ? punktData.feilkode.substring(7) : ''}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              updatePunkt(key, { feilkode: `Annet: ${e.target.value}` })
                                            } else {
                                              updatePunkt(key, { feilkode: 'Annet' })
                                            }
                                          }}
                                          className="input text-sm w-full mt-2"
                                        />
                                      )}
                                    </div>
                                  )}

                                  {/* Poeng trekk - vises alltid når det er avvik */}
                                  {punktData.avvik_type && (
                                    <div>
                                      <label className="block text-sm text-gray-400 mb-2">
                                        Poeng trekk
                                        <span className="text-xs text-gray-500 ml-2">(Velg AG-verdi)</span>
                                      </label>
                                      <div className="grid grid-cols-5 gap-2">
                                        {AG_VERDIER.map(ag => (
                                          <button
                                            key={ag.verdi}
                                            onClick={() => updatePunkt(key, { 
                                              ag_verdi: ag.verdi,
                                              poeng_trekk: ag.poeng 
                                            })}
                                            className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                              punktData.ag_verdi === ag.verdi
                                                ? ag.poeng === 0
                                                  ? 'bg-green-500 text-white'
                                                  : ag.poeng < 1
                                                  ? 'bg-yellow-500 text-white'
                                                  : 'bg-red-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                          >
                                            <div className="text-xs">{ag.verdi}</div>
                                            <div className="text-xs opacity-75">({ag.poeng})</div>
                                          </button>
                                        ))}
                                      </div>
                                      {punktData.ag_verdi && (
                                        <div className="mt-2 space-y-2">
                                          <p className="text-xs text-gray-500">
                                            {AG_VERDIER.find(a => a.verdi === punktData.ag_verdi)?.beskrivelse} - 
                                            Poeng per avvik: {beregnPoengFraAG(punktData.ag_verdi)}
                                          </p>
                                          
                                          {/* Antall avvik */}
                                          <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                              Antall avvik av denne typen
                                            </label>
                                            <input
                                              type="number"
                                              min="1"
                                              max="99"
                                              value={punktData.antall_avvik || 1}
                                              onChange={(e) => {
                                                const antall = parseInt(e.target.value) || 1
                                                updatePunkt(key, { antall_avvik: Math.max(1, Math.min(99, antall)) })
                                              }}
                                              className="input text-sm w-24"
                                            />
                                            {punktData.antall_avvik > 1 && (
                                              <p className="text-xs text-orange-400 mt-1">
                                                Totalt: {punktData.antall_avvik} × {punktData.poeng_trekk} = {(punktData.antall_avvik * punktData.poeng_trekk).toFixed(1)} poeng
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Vis total poeng hvis AG-verdi er satt */}
                                  {punktData.ag_verdi && punktData.poeng_trekk > 0 && (
                                    <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                      <p className="text-sm text-orange-400">
                                        ⚠️ Poeng trekk: {(punktData.poeng_trekk * (punktData.antall_avvik || 1)).toFixed(1)} 
                                        {punktData.antall_avvik > 1 && ` (${punktData.antall_avvik} avvik)`}
                                      </p>
                                    </div>
                                  )}

                                  {/* Kommentar */}
                                  <div>
                                    <label className="block text-sm text-gray-400 mb-2">Kommentar</label>
                                    <textarea
                                      value={punktData.kommentar || ''}
                                      onChange={(e) => updatePunkt(key, { kommentar: e.target.value || null })}
                                      placeholder="Kommentar..."
                                      className="input text-base w-full"
                                      rows={4}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
      })()}

      {/* Referanse Dialog */}
      {showReferanseDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReferanseDialog(null)}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-gray-700 max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Referanse NS 3960</h3>
                <p className="text-sm text-gray-400">{showReferanseDialog}</p>
              </div>
              <button
                onClick={() => setShowReferanseDialog(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-300 mb-2">
                <span className="font-semibold text-blue-400">Referanse:</span>
              </p>
              <p className="text-white font-mono text-sm">
                {KONTROLLPUNKT_REFERANSER[showReferanseDialog]}
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowReferanseDialog(null)}
                className="btn-secondary"
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
