import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check, AlertCircle, Eye, Filter, Wifi, WifiOff, Plus, Minus, Save } from 'lucide-react'
import { BrannalarmStyring } from '../Brannalarm'

interface EnheterViewProps {
  anleggId: string
  anleggsNavn: string
  enheter: BrannalarmStyring | null
  onBack: () => void
  onSave: (anleggId: string) => void
}

const enhetsTyper = [
  // Sentral og styring
  { key: 'brannsentral', navn: 'Brannsentral', icon: '🏢', kategori: 'Sentral og styring' },
  { key: 'panel', navn: 'Brannpanel', icon: '🎛️', kategori: 'Sentral og styring' },
  { key: 'kraftforsyning', navn: 'Kraftforsyning', icon: '⚡', kategori: 'Sentral og styring' },
  { key: 'batteri', navn: 'Batteri', icon: '🔋', kategori: 'Sentral og styring' },
  { key: 'sloyfer', navn: 'Sløyfer', icon: '🔗', kategori: 'Sentral og styring' },
  { key: 'io', navn: 'IO-styring', icon: '🔌', kategori: 'Sentral og styring' },
  
  // Detektorer
  { key: 'rd', navn: 'Røykdetektor', icon: '🔍', kategori: 'Detektorer' },
  { key: 'vd', navn: 'Varmedetektor', icon: '🌡️', kategori: 'Detektorer' },
  { key: 'multi', navn: 'Multikriteriedetektor', icon: '🔍', kategori: 'Detektorer' },
  { key: 'flame', navn: 'Flammedetektor', icon: '🔥', kategori: 'Detektorer' },
  { key: 'linje', navn: 'Linjedetektor', icon: '📏', kategori: 'Detektorer' },
  { key: 'asp', navn: 'Aspirasjon', icon: '💨', kategori: 'Detektorer' },
  { key: 'mm', navn: 'Manuell melder', icon: '🔔', kategori: 'Detektorer' },
  { key: 'traadlos', navn: 'Trådløse enheter', icon: '📡', kategori: 'Detektorer' },
  
  // Styring og slokning
  { key: 'sprinkler', navn: 'Sprinklerkontroll', icon: '💦', kategori: 'Styring og slokning' },
  { key: 'avstiller', navn: 'Avstillingsbryter', icon: '🔘', kategori: 'Styring og slokning' },
  
  // Varsling
  { key: 'brannklokke', navn: 'Brannklokke', icon: '🔔', kategori: 'Varsling' },
  { key: 'sirene', navn: 'Sirene', icon: '🔊', kategori: 'Varsling' },
  { key: 'optisk', navn: 'Optisk varsling', icon: '👁️', kategori: 'Varsling' },
  { key: 'annet', navn: 'Annet', icon: '📝', kategori: 'Annet' },
]

export function EnheterView({ anleggId, anleggsNavn, enheter, onBack, onSave }: EnheterViewProps) {
  const [localEnheter, setLocalEnheter] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [filterKategori, setFilterKategori] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialEnheter, setInitialEnheter] = useState<Record<string, any>>({})
  const localStorageKey = `enheter_offline_${anleggId}`

  useEffect(() => {
    const initial: Record<string, any> = {}
    enhetsTyper.forEach(({ key }) => {
      const existingType = enheter?.[`${key}_type` as keyof BrannalarmStyring] || ''
      const existingAntall = enheter?.[`${key}_antall` as keyof BrannalarmStyring] || 0
      
      // Parse existing types - støtter både gammelt format (string) og nytt format (JSON array)
      let typer: { type: string; antall: number }[] = []
      if (typeof existingType === 'string' && existingType.startsWith('[')) {
        try {
          typer = JSON.parse(existingType)
        } catch {
          typer = existingType ? [{ type: existingType, antall: existingAntall as number }] : []
        }
      } else if (existingType) {
        typer = [{ type: existingType as string, antall: existingAntall as number }]
      }
      
      initial[key] = {
        antall: existingAntall,
        type: existingType,
        typer: typer,
        note: enheter?.[`${key}_note` as keyof BrannalarmStyring] || '',
        aktiv: enheter?.[`${key}_aktiv` as keyof BrannalarmStyring] || false,
      }
    })
    setLocalEnheter(initial)
    setInitialEnheter(initial)
  }, [enheter])

  // Sjekk om det er ulagrede endringer
  useEffect(() => {
    const hasChanges = JSON.stringify(localEnheter) !== JSON.stringify(initialEnheter)
    setHasUnsavedChanges(hasChanges && Object.keys(initialEnheter).length > 0)
  }, [localEnheter, initialEnheter])

  // Advarsel ved navigering bort (browser)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sjekk om det er pending data ved mount
    const stored = localStorage.getItem(localStorageKey)
    if (stored && navigator.onLine) {
      syncOfflineData()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [anleggId])

  async function syncOfflineData() {
    const stored = localStorage.getItem(localStorageKey)
    if (!stored) return

    try {
      setSaving(true)
      const data = JSON.parse(stored)

      if (enheter?.id) {
        await supabase
          .from('anleggsdata_brannalarm')
          .update(data)
          .eq('id', enheter.id)
      } else {
        await supabase
          .from('anleggsdata_brannalarm')
          .insert(data)
      }

      localStorage.removeItem(localStorageKey)
      setPendingChanges(0)
      setLastSaved(new Date())
      onSave(anleggId)
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data: any = { anlegg_id: anleggId }
      
      enhetsTyper.forEach(({ key }) => {
        data[`${key}_antall`] = localEnheter[key]?.antall || 0
        data[`${key}_type`] = localEnheter[key]?.type || ''
        data[`${key}_note`] = localEnheter[key]?.note || ''
        data[`${key}_aktiv`] = localEnheter[key]?.aktiv || false
      })

      if (isOnline) {
        // Online: lagre direkte til database
        if (enheter?.id) {
          await supabase
            .from('anleggsdata_brannalarm')
            .update(data)
            .eq('id', enheter.id)
        } else {
          await supabase
            .from('anleggsdata_brannalarm')
            .insert(data)
        }
        setLastSaved(new Date())
        setInitialEnheter(localEnheter) // Reset ulagrede endringer
        onSave(anleggId)
        onBack()
      } else {
        // Offline: lagre lokalt
        localStorage.setItem(localStorageKey, JSON.stringify(data))
        setPendingChanges(1)
        setInitialEnheter(localEnheter) // Reset ulagrede endringer
        alert('Offline - data lagret lokalt og vil synkroniseres når du er online igjen')
        onBack()
      }
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av enheter')
    } finally {
      setSaving(false)
    }
  }

  const kategorier = ['all', ...Array.from(new Set(enhetsTyper.map(e => e.kategori)))]
  
  const filteredEnheter = enhetsTyper.filter(({ kategori }) => {
    if (filterKategori === 'all') return true
    return kategori === filterKategori
  })

  const aktiveEnheter = enhetsTyper.filter(({ key }) => localEnheter[key]?.aktiv).length
  const totalKomponenter = enhetsTyper.reduce((sum, { key }) => 
    sum + (localEnheter[key]?.antall || 0), 0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!confirm('⚠️ Du har ulagrede endringer!\n\nVil du lagre før du går tilbake?')) {
                  if (confirm('Er du sikker på at du vil forkaste endringene?')) {
                    onBack()
                  }
                } else {
                  handleSave()
                }
              } else {
                onBack()
              }
            }} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Brannalarm enheter</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 truncate">{anleggsNavn}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Online/Offline status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-xs sm:text-sm text-green-400">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-400" />
                <span className="text-xs sm:text-sm text-yellow-400">Offline</span>
              </>
            )}
          </div>
          
          {/* Pending changes */}
          {pendingChanges > 0 && (
            <span className="text-xs sm:text-sm text-orange-400 flex items-center gap-2">
              {pendingChanges} endring venter
            </span>
          )}
          
          {/* Lagringsstatus */}
          {saving && (
            <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="hidden sm:inline">{isOnline ? 'Lagrer...' : 'Lagrer lokalt...'}</span>
            </span>
          )}
          {!saving && lastSaved && pendingChanges === 0 && (
            <span className="text-xs sm:text-sm text-green-400 hidden sm:inline">
              Lagret {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm sm:text-base min-w-[44px] justify-center">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Lagrer...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span className="hidden sm:inline">Lagre</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400 truncate">Totalt komponenter</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalKomponenter}</div>
            </div>
          </div>
        </div>

        <div className="card bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400 truncate">Aktive enhetstyper</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{aktiveEnheter}</div>
            </div>
          </div>
        </div>

        <div className="card bg-gray-500/10 border-gray-500/20 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400 truncate">Enhetstyper</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{enhetsTyper.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-2 sm:pb-0">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {kategorier.map((kat) => (
            <button
              key={kat}
              onClick={() => setFilterKategori(kat)}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
                filterKategori === kat ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {kat === 'all' ? 'Alle' : kat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'compact' 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
            }`}
          >
            Kompakt
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'detailed' 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
            }`}
          >
            Detaljert
          </button>
        </div>
      </div>

      {/* Enheter Table/Grid */}
      {viewMode === 'compact' ? (
        /* KOMPAKT: Klikk for å ekspandere detaljer */
        <div className="space-y-2 pb-24">
          {filteredEnheter.map(({ key, navn, icon }) => {
            const isActive = localEnheter[key]?.aktiv || false
            const antall = localEnheter[key]?.antall || 0
            const isExpanded = expandedKey === key && isActive
            
            return (
              <div 
                key={key} 
                className={`rounded-xl border transition-all ${
                  isActive 
                    ? 'border-primary/30 bg-primary/5' 
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-50'
                }`}
              >
                {/* Hovedrad - alltid synlig */}
                <div className="flex items-center gap-3 p-3">
                  <span className="text-xl flex-shrink-0">{icon}</span>
                  
                  {/* Klikk på navn for å ekspandere */}
                  <button
                    onClick={() => {
                      if (isActive) {
                        setExpandedKey(expandedKey === key ? null : key)
                      }
                    }}
                    className={`font-medium text-sm flex-1 text-left truncate ${
                      isActive 
                        ? 'text-gray-900 dark:text-white cursor-pointer hover:text-primary' 
                        : 'text-gray-500 dark:text-gray-400 cursor-default'
                    }`}
                  >
                    {navn}
                    {isActive && <span className="ml-1 text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>}
                  </button>
                  
                  {/* Toggle */}
                  <button
                    onClick={() => {
                      const wasActive = localEnheter[key]?.aktiv
                      const currentTyper = localEnheter[key]?.typer || []
                      setLocalEnheter(prev => ({
                        ...prev,
                        [key]: { 
                          ...prev[key], 
                          aktiv: !wasActive,
                          typer: !wasActive && currentTyper.length === 0 ? [{ type: '', antall: 1 }] : currentTyper,
                          antall: !wasActive && currentTyper.length === 0 ? 1 : prev[key]?.antall || 0
                        }
                      }))
                      if (!isActive) {
                        setExpandedKey(key)
                      }
                    }}
                    className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${
                      isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                  
                  {/* Antall visning - viser totalt antall fra alle typer */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-16 justify-end">
                    {isActive && (
                      <span className="px-3 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg text-sm whitespace-nowrap">
                        {antall} stk
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Ekspandert detaljer */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    {/* Type/modell liste */}
                    <div className="space-y-2">
                      {(localEnheter[key]?.typer || []).map((t: { type: string; antall: number }, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={t.type}
                            onChange={(e) => {
                              const newTyper = [...(localEnheter[key]?.typer || [])]
                              newTyper[idx] = { ...newTyper[idx], type: e.target.value }
                              const totalAntall = newTyper.reduce((sum, item) => sum + (item.antall || 0), 0)
                              setLocalEnheter(prev => ({
                                ...prev,
                                [key]: { ...prev[key], typer: newTyper, antall: totalAntall, type: JSON.stringify(newTyper) }
                              }))
                            }}
                            placeholder="Type/modell..."
                            className="input text-sm flex-1 h-10"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={t.antall || 0}
                            onChange={(e) => {
                              const newTyper = [...(localEnheter[key]?.typer || [])]
                              newTyper[idx] = { ...newTyper[idx], antall: parseInt(e.target.value) || 0 }
                              const totalAntall = newTyper.reduce((sum, item) => sum + (item.antall || 0), 0)
                              setLocalEnheter(prev => ({
                                ...prev,
                                [key]: { ...prev[key], typer: newTyper, antall: totalAntall, type: JSON.stringify(newTyper) }
                              }))
                            }}
                            className="w-14 h-10 text-center font-semibold text-gray-900 dark:text-white bg-white dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg"
                          />
                          <button
                            onClick={() => {
                              const newTyper = (localEnheter[key]?.typer || []).filter((_: any, i: number) => i !== idx)
                              const totalAntall = newTyper.reduce((sum: number, item: { antall: number }) => sum + (item.antall || 0), 0)
                              setLocalEnheter(prev => ({
                                ...prev,
                                [key]: { ...prev[key], typer: newTyper, antall: totalAntall, type: JSON.stringify(newTyper) }
                              }))
                            }}
                            className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newTyper = [...(localEnheter[key]?.typer || []), { type: '', antall: 1 }]
                          const totalAntall = newTyper.reduce((sum, item) => sum + (item.antall || 0), 0)
                          setLocalEnheter(prev => ({
                            ...prev,
                            [key]: { ...prev[key], typer: newTyper, antall: totalAntall, type: JSON.stringify(newTyper) }
                          }))
                        }}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Legg til type/modell
                      </button>
                    </div>
                    <input
                      type="text"
                      value={localEnheter[key]?.note || ''}
                      onChange={(e) => {
                        setLocalEnheter(prev => ({
                          ...prev,
                          [key]: { ...prev[key], note: e.target.value }
                        }))
                      }}
                      placeholder="Legg til notat..."
                      className="input text-sm w-full h-11"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnheter.map(({ key, navn, icon, kategori }) => {
            const isActive = localEnheter[key]?.aktiv || false
            
            return (
              <div key={key} className={`card ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    isActive ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {icon}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-semibold ${isActive ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                          {navn}
                        </h3>
                        <p className="text-xs text-gray-500">{kategori}</p>
                      </div>
                      <button
                        onClick={() => {
                          setLocalEnheter(prev => ({
                            ...prev,
                            [key]: { ...prev[key], aktiv: !prev[key]?.aktiv }
                          }))
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          isActive ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {isActive && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Antall</label>
                          <input
                            type="number"
                            value={localEnheter[key]?.antall || 0}
                            onChange={(e) => {
                              setLocalEnheter(prev => ({
                                ...prev,
                                [key]: { ...prev[key], antall: parseInt(e.target.value) || 0 }
                              }))
                            }}
                            className="input"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type/Modell</label>
                          <input
                            type="text"
                            value={localEnheter[key]?.type || ''}
                            onChange={(e) => {
                              setLocalEnheter(prev => ({
                                ...prev,
                                [key]: { ...prev[key], type: e.target.value }
                              }))
                            }}
                            className="input"
                            placeholder="F.eks. Siemens FDO181..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notat</label>
                          <textarea
                            value={localEnheter[key]?.note || ''}
                            onChange={(e) => {
                              setLocalEnheter(prev => ({
                                ...prev,
                                [key]: { ...prev[key], note: e.target.value }
                              }))
                            }}
                            className="input"
                            rows={2}
                            placeholder="Legg til notat..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Save Button - Sticky på mobil/iPad */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-dark via-white/95 dark:via-dark/95 to-transparent pointer-events-none z-40">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <button 
            onClick={handleSave} 
            disabled={saving || !hasUnsavedChanges} 
            className={`w-full py-4 px-6 ${hasUnsavedChanges ? 'bg-primary hover:bg-primary/90' : 'bg-gray-400'} disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg ${hasUnsavedChanges ? 'shadow-primary/25' : 'shadow-gray-400/25'}`}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isOnline ? 'Lagrer...' : 'Lagrer lokalt...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Lagre endringer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
