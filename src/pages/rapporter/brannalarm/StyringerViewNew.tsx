import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check, AlertCircle, Eye, Filter, Wifi, WifiOff } from 'lucide-react'
import { BrannalarmStyring } from '../Brannalarm'

interface StyringerViewProps {
  anleggId: string
  anleggsNavn: string
  styringer: BrannalarmStyring | null
  onBack: () => void
  onSave: (anleggId: string) => void
}

const statusOptions = ['Kontrollert Ok', 'Avvik', 'Visuell kontroll', 'Ikke aktuelt']

const styringTyper = [
  { key: 'ovrige', navn: 'Øvrige styringer', icon: '📋', kategori: 'Generelt' },
  { key: 'adgang', navn: 'Adgangskontroll', icon: '🔑', kategori: 'Sikkerhet' },
  { key: 'slukke', navn: 'Slukkeanlegg', icon: '💦', kategori: 'Slukking' },
  { key: 'klokke', navn: 'Klokkekurser', icon: '⏰', kategori: 'Varsling' },
  { key: 'flash_blitz', navn: 'Flash/Blitz', icon: '⚡', kategori: 'Varsling' },
  { key: 'port', navn: 'Port', icon: '🚪', kategori: 'Adgang' },
  { key: 'spjaeld', navn: 'Brannspjæld', icon: '🛡️', kategori: 'Ventilasjon' },
  { key: 'overvaking', navn: 'Overvåking', icon: '📹', kategori: 'Sikkerhet' },
  { key: 'musikk', navn: 'Musikkmuting', icon: '🎵', kategori: 'Varsling' },
  { key: 'gardin', navn: 'Branngardin', icon: '🪟', kategori: 'Brannskille' },
  { key: 'dorstyring', navn: 'Dørstyring', icon: '🚪', kategori: 'Adgang' },
  { key: 'royklukker', navn: 'Røykluker', icon: '💨', kategori: 'Ventilasjon' },
  { key: 'vent', navn: 'Ventilasjonsanlegg', icon: '💨', kategori: 'Ventilasjon' },
  { key: 'sd', navn: 'SD-Anlegg', icon: '🔌', kategori: 'Slukking' },
  { key: 'heis', navn: 'Heisstyringer', icon: '🛗', kategori: 'Transport' },
  { key: 'safe', navn: 'Nøkkelsafe', icon: '🔒', kategori: 'Sikkerhet' },
]

export function StyringerView({ anleggId, anleggsNavn, styringer, onBack, onSave }: StyringerViewProps) {
  const [localStyringer, setLocalStyringer] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const localStorageKey = `styringer_offline_${anleggId}`

  useEffect(() => {
    const initial: Record<string, any> = {}
    styringTyper.forEach(({ key }) => {
      initial[key] = {
        antall: styringer?.[`${key}_antall` as keyof BrannalarmStyring] || 0,
        status: styringer?.[`${key}_status` as keyof BrannalarmStyring] || '',
        note: styringer?.[`${key}_note` as keyof BrannalarmStyring] || '',
        aktiv: styringer?.[`${key}_aktiv` as keyof BrannalarmStyring] || false,
      }
    })
    setLocalStyringer(initial)
  }, [styringer])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineData()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const stored = localStorage.getItem(localStorageKey)
    if (stored && navigator.onLine) syncOfflineData()
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
      if (styringer?.id) {
        await supabase.from('anleggsdata_brannalarm').update(data).eq('id', styringer.id)
      } else {
        await supabase.from('anleggsdata_brannalarm').insert(data)
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
      styringTyper.forEach(({ key }) => {
        data[`${key}_antall`] = localStyringer[key]?.antall || 0
        data[`${key}_status`] = localStyringer[key]?.status || ''
        data[`${key}_note`] = localStyringer[key]?.note || ''
        data[`${key}_aktiv`] = localStyringer[key]?.aktiv || false
      })
      if (isOnline) {
        if (styringer?.id) {
          await supabase.from('anleggsdata_brannalarm').update(data).eq('id', styringer.id)
        } else {
          await supabase.from('anleggsdata_brannalarm').insert(data)
        }
        setLastSaved(new Date())
        onSave(anleggId)
        onBack()
      } else {
        localStorage.setItem(localStorageKey, JSON.stringify(data))
        setPendingChanges(1)
        alert('Offline - data lagret lokalt og vil synkroniseres når du er online igjen')
        onBack()
      }
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av styringer')
    } finally {
      setSaving(false)
    }
  }

  const filteredStyringer = styringTyper.filter(({ key }) => {
    const isActive = localStyringer[key]?.aktiv
    if (filterStatus === 'active') return isActive
    if (filterStatus === 'inactive') return !isActive
    return true
  })

  const aktiveStyringer = styringTyper.filter(({ key }) => localStyringer[key]?.aktiv).length
  const avvikStyringer = styringTyper.filter(({ key }) => 
    localStyringer[key]?.aktiv && localStyringer[key]?.status === 'Avvik'
  ).length

  function getStatusColor(status: string) {
    switch (status) {
      case 'Kontrollert Ok': return 'text-green-400 bg-green-500/10'
      case 'Avvik': return 'text-red-400 bg-red-500/10'
      case 'Visuell kontroll': return 'text-blue-400 bg-blue-500/10'
      case 'Ikke aktuelt': return 'text-gray-400 bg-gray-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Brannalarm styringer</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1 truncate">{anleggsNavn}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
          {pendingChanges > 0 && (
            <span className="text-xs sm:text-sm text-orange-400">{pendingChanges} endring venter</span>
          )}
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
              <div className="text-xs text-gray-400 truncate">Aktive styringer</div>
              <div className="text-2xl font-bold text-white">{aktiveStyringer}</div>
            </div>
          </div>
        </div>

        <div className="card bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400 truncate">Med avvik</div>
              <div className="text-2xl font-bold text-white">{avvikStyringer}</div>
            </div>
          </div>
        </div>

        <div className="card bg-gray-500/10 border-gray-500/20 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400 truncate">Totalt</div>
              <div className="text-2xl font-bold text-white">{styringTyper.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
              filterStatus === 'all' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Alle ({styringTyper.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
              filterStatus === 'active' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Aktive ({aktiveStyringer})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
              filterStatus === 'inactive' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Inaktive ({styringTyper.length - aktiveStyringer})
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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

      {/* Styringer List */}
      {viewMode === 'compact' ? (
        <div className="space-y-3 pb-20">
          {filteredStyringer.map(({ key, navn, icon }) => {
            const isActive = localStyringer[key]?.aktiv || false
            
            return (
              <div key={key} className={`card ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
                {/* Første rad: Navn, Toggle, Antall */}
                <div className={`flex items-center gap-3 ${isActive ? 'mb-3' : ''}`}>
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <span className={`font-medium text-sm flex-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {navn}
                  </span>
                  <button
                    onClick={() => {
                      setLocalStyringer(prev => ({
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
                    value={localStyringer[key]?.antall || 0}
                    onChange={(e) => {
                      setLocalStyringer(prev => ({
                        ...prev,
                        [key]: { ...prev[key], antall: parseInt(e.target.value) || 0 }
                      }))
                    }}
                    disabled={!isActive}
                    className="input text-center w-16 text-sm flex-shrink-0"
                    min="0"
                  />
                </div>
                
                {/* Andre rad: Status og Notat (kun hvis aktiv) */}
                {isActive && (
                  <div className="space-y-2 pt-3 border-t border-gray-800">
                    <select
                      value={localStyringer[key]?.status || ''}
                      onChange={(e) => {
                        setLocalStyringer(prev => ({
                          ...prev,
                          [key]: { ...prev[key], status: e.target.value }
                        }))
                      }}
                      className="input text-sm w-full"
                    >
                      <option value="">Velg status</option>
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <textarea
                      value={localStyringer[key]?.note || ''}
                      onChange={(e) => {
                        setLocalStyringer(prev => ({
                          ...prev,
                          [key]: { ...prev[key], note: e.target.value }
                        }))
                      }}
                      className="input text-sm w-full"
                      rows={2}
                      placeholder="Legg til notat..."
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStyringer.map(({ key, navn, icon, kategori }) => {
            const isActive = localStyringer[key]?.aktiv || false
            const status = localStyringer[key]?.status || ''
            
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
                          setLocalStyringer(prev => ({
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Antall</label>
                          <input
                            type="number"
                            value={localStyringer[key]?.antall || 0}
                            onChange={(e) => {
                              setLocalStyringer(prev => ({
                                ...prev,
                                [key]: { ...prev[key], antall: parseInt(e.target.value) || 0 }
                              }))
                            }}
                            className="input"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                          <select
                            value={localStyringer[key]?.status || ''}
                            onChange={(e) => {
                              setLocalStyringer(prev => ({
                                ...prev,
                                [key]: { ...prev[key], status: e.target.value }
                              }))
                            }}
                            className="input"
                          >
                            <option value="">Velg status</option>
                            {statusOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-1">
                          {status && (
                            <div className="pt-7">
                              <span className={`inline-block px-3 py-1.5 text-sm rounded-lg ${getStatusColor(status)}`}>
                                {status}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Notat</label>
                          <textarea
                            value={localStyringer[key]?.note || ''}
                            onChange={(e) => {
                              setLocalStyringer(prev => ({
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
