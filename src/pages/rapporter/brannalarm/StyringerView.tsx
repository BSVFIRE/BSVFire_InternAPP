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
  const [filterKategori, setFilterKategori] = useState<string>('all')
  const [isOnline] = useState(navigator.onLine)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

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

      if (styringer?.id) {
        await supabase
          .from('anleggsdata_brannalarm')
          .update(data)
          .eq('id', styringer.id)
      } else {
        await supabase
          .from('anleggsdata_brannalarm')
          .insert(data)
      }

      setLastSaved(new Date())
      onSave(anleggId)
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av styringer')
    } finally {
      setSaving(false)
    }
  }

  const kategorier = ['all', ...Array.from(new Set(styringTyper.map(s => s.kategori)))]
  const filteredStyringer = styringTyper.filter(({ kategori }) => {
    if (filterKategori === 'all') return true
    return kategori === filterKategori
  })
  const aktiveStyringer = styringTyper.filter(({ key }) => localStyringer[key]?.aktiv).length
  const totalKomponenter = styringTyper.reduce((sum, { key }) => 
    sum + (localStyringer[key]?.antall || 0), 0
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
          {saving && (
            <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="hidden sm:inline">Lagrer...</span>
            </span>
          )}
          {!saving && lastSaved && (
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
              <div className="text-2xl font-bold text-white">{aktiveStyringer}</div>
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
              <div className="text-2xl font-bold text-white">{styringTyper.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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

      {/* Styringer List */}
      <div className="space-y-3 pb-20">
        {filteredStyringer.map(({ key, navn, icon }) => {
          const isActive = localStyringer[key]?.aktiv || false
          console.log(`${navn}: isActive=${isActive}, data=`, localStyringer[key])
          
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
                    <option value="">-- Velg status --</option>
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
    </div>
  )
}
