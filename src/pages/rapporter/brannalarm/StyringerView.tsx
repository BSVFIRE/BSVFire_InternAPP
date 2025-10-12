import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check } from 'lucide-react'
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

      onSave(anleggId)
      onBack()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av styringer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Brannalarm styringer</h1>
            <p className="text-gray-400 mt-1">{anleggsNavn}</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Lagrer...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Lagre styringer
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {styringTyper.map(({ key, navn, icon }) => {
          const isActive = localStyringer[key]?.aktiv || false
          
          return (
            <div key={key} className={`card transition-all ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
              <button
                onClick={() => {
                  setLocalStyringer(prev => ({
                    ...prev,
                    [key]: {
                      ...prev[key],
                      aktiv: !prev[key]?.aktiv
                    }
                  }))
                }}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 rounded-lg transition-colors"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${isActive ? 'bg-primary/20' : 'bg-gray-800'}`}>
                  {icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${isActive ? 'text-primary' : 'text-white'}`}>{navn}</h3>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-primary' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </button>

              {isActive && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
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
                      <option value="">-- Velg status --</option>
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
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
                      rows={3}
                      placeholder="Legg til notat..."
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
