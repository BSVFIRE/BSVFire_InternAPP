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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Brannalarm enheter</h1>
            <p className="text-gray-400 mt-1">{anleggsNavn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Online/Offline status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">Offline</span>
              </>
            )}
          </div>
          
          {/* Pending changes */}
          {pendingChanges > 0 && (
            <span className="text-sm text-orange-400 flex items-center gap-2">
              {pendingChanges} endring venter på synkronisering
            </span>
          )}
          
          {/* Lagringsstatus */}
          {saving && (
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              {isOnline ? 'Lagrer...' : 'Lagrer lokalt...'}
            </span>
          )}
          {!saving && lastSaved && pendingChanges === 0 && (
            <span className="text-sm text-green-400">
              Lagret {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Lagre enheter
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalKomponenter}</div>
              <div className="text-sm text-gray-400">Totalt komponenter</div>
            </div>
          </div>
        </div>

        <div className="card bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{aktiveEnheter}</div>
              <div className="text-sm text-gray-400">Aktive enhetstyper</div>
            </div>
          </div>
        </div>

        <div className="card bg-gray-500/10 border-gray-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{enhetsTyper.length}</div>
              <div className="text-sm text-gray-400">Enhetstyper</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {kategorier.map((kat) => (
            <button
              key={kat}
              onClick={() => setFilterKategori(kat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterKategori === kat ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {kat === 'all' ? 'Alle' : kat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewMode === 'compact' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Kompakt
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewMode === 'detailed' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Detaljert
          </button>
        </div>
      </div>

      {/* Enheter Table/Grid */}
      {viewMode === 'compact' ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Enhet</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400 w-24">Aktiv</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400 w-32">Antall</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400 w-48">Type/Modell</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Notat</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnheter.map(({ key, navn, icon }) => {
                const isActive = localEnheter[key]?.aktiv || false
                
                return (
                  <tr key={key} className={`border-t border-gray-800 ${isActive ? 'bg-primary/5' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                          {navn}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
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
                    </td>
                    <td className="p-4">
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
                        className="input text-center w-20"
                        min="0"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={localEnheter[key]?.type || ''}
                        onChange={(e) => {
                          setLocalEnheter(prev => ({
                            ...prev,
                            [key]: { ...prev[key], type: e.target.value }
                          }))
                        }}
                        disabled={!isActive}
                        placeholder="Type/modell..."
                        className="input text-sm"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={localEnheter[key]?.note || ''}
                        onChange={(e) => {
                          setLocalEnheter(prev => ({
                            ...prev,
                            [key]: { ...prev[key], note: e.target.value }
                          }))
                        }}
                        disabled={!isActive}
                        placeholder="Legg til notat..."
                        className="input text-sm"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
