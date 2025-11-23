import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check, AlertCircle, Eye, Filter, Wifi, WifiOff } from 'lucide-react'
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
  const localStorageKey = `enheter_offline_${anleggId}`

  useEffect(() => {
    const initial: Record<string, any> = {}
    enhetsTyper.forEach(({ key }) => {
      initial[key] = {
        antall: enheter?.[`${key}_antall` as keyof BrannalarmStyring] || 0,
        type: enheter?.[`${key}_type` as keyof BrannalarmStyring] || '',
        note: enheter?.[`${key}_note` as keyof BrannalarmStyring] || '',
        aktiv: enheter?.[`${key}_aktiv` as keyof BrannalarmStyring] || false,
      }
    })
    setLocalEnheter(initial)
  }, [enheter])

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
        onSave(anleggId)
        onBack()
      } else {
        // Offline: lagre lokalt
        localStorage.setItem(localStorageKey, JSON.stringify(data))
        setPendingChanges(1)
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
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Brannalarm enheter</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1 truncate">{anleggsNavn}</p>
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
              <div className="text-2xl font-bold text-white">{totalKomponenter}</div>
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
              <div className="text-2xl font-bold text-white">{aktiveEnheter}</div>
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
              <div className="text-2xl font-bold text-white">{enhetsTyper.length}</div>
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
                filterKategori === kat ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {kat === 'all' ? 'Alle' : kat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
              viewMode === 'compact' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Kompakt
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
              viewMode === 'detailed' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Detaljert
          </button>
        </div>
      </div>

      {/* Enheter Table/Grid */}
      {viewMode === 'compact' ? (
        <div className="space-y-3 pb-20">
          {filteredEnheter.map(({ key, navn, icon }) => {
            const isActive = localEnheter[key]?.aktiv || false
            
            return (
              <div key={key} className={`card ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
                {/* Første rad: Navn, Toggle, Antall */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <span className={`font-medium text-sm flex-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {navn}
                  </span>
                  <button
                    onClick={() => {
                      setLocalEnheter(prev => ({
                        ...prev,
                        [key]: { ...prev[key], aktiv: !prev[key]?.aktiv }
                      }))
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                      isActive ? 'bg-primary' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                  <input
                    type="number"
                    value={localEnheter[key]?.antall || 0}
                    onChange={(e) => {
                      setLocalEnheter(prev => ({
                        ...prev,
                        [key]: { ...prev[key], antall: parseInt(e.target.value) || 0 }
                      }))
                    }}
                    disabled={!isActive}
                    className="input text-center w-16 text-sm flex-shrink-0"
                    min="0"
                  />
                </div>
                
                {/* Andre rad: Type/Modell og Notat (kun hvis aktiv) */}
                {isActive && (
                  <div className="space-y-2 pt-3 border-t border-gray-800">
                    <input
                      type="text"
                      value={localEnheter[key]?.type || ''}
                      onChange={(e) => {
                        setLocalEnheter(prev => ({
                          ...prev,
                          [key]: { ...prev[key], type: e.target.value }
                        }))
                      }}
                      placeholder="Type/modell..."
                      className="input text-sm w-full"
                    />
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
                      className="input text-sm w-full"
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
                    isActive ? 'bg-primary/20' : 'bg-gray-800'
                  }`}>
                    {icon}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-semibold ${isActive ? 'text-primary' : 'text-white'}`}>
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
                          isActive ? 'bg-primary' : 'bg-gray-700'
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
                          <label className="block text-sm font-medium text-gray-300 mb-2">Antall</label>
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
                          <label className="block text-sm font-medium text-gray-300 mb-2">Type/Modell</label>
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
                          <label className="block text-sm font-medium text-gray-300 mb-2">Notat</label>
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
    </div>
  )
}
