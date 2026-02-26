import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Volume2, Radio, Key, X, Wifi, WifiOff, Save } from 'lucide-react'

interface Kontaktperson {
  id: string
  navn: string
  epost?: string
  telefon?: string
  primar?: boolean
}

interface TilleggsutstyrData {
  id?: string
  anlegg_id: string
  // Talevarsling
  talevarsling?: boolean
  talevarsling_leverandor?: string
  talevarsling_batteri_type?: string
  talevarsling_batteri_alder?: string
  talevarsling_plassering?: string
  talevarsling_kommentar?: string
  // Alarmsender
  alarmsender_i_anlegg?: boolean
  mottaker?: string[]
  gsm_nummer?: string
  plassering?: string
  batterialder?: string
  batteritype?: string
  forsynet_fra_brannsentral?: boolean
  sender_2G_4G?: string
  mottaker_kommentar?: string
  ekstern_mottaker?: string[]
  ekstern_mottaker_info?: string
  ekstern_mottaker_aktiv?: boolean
  // Nøkkelsafe
  nokkelsafe?: boolean
  nokkelsafe_type?: string
  nokkelsafe_plassering?: string
  nokkelsafe_innhold?: string
  nokkelsafe_kommentar?: string
}

interface TilleggsutstyrViewProps {
  anleggId: string
  anleggsNavn: string
  onBack: () => void
}

export function TilleggsutstyrView({ anleggId, anleggsNavn, onBack }: TilleggsutstyrViewProps) {
  const [data, setData] = useState<TilleggsutstyrData>({
    anlegg_id: anleggId,
    talevarsling: false,
    alarmsender_i_anlegg: false,
    nokkelsafe: false,
    forsynet_fra_brannsentral: false,
    mottaker: [],
    ekstern_mottaker: [],
    ekstern_mottaker_aktiv: false,
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [showKontaktDialog, setShowKontaktDialog] = useState(false)
  const [selectedKontakter, setSelectedKontakter] = useState<string[]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialData, setInitialData] = useState<TilleggsutstyrData | null>(null)
  const localStorageKey = `tilleggsutstyr_offline_${anleggId}`

  useEffect(() => {
    loadData()
    loadKontaktpersoner()
  }, [anleggId])

  // Sjekk om det er ulagrede endringer
  useEffect(() => {
    if (initialData) {
      const hasChanges = JSON.stringify(data) !== JSON.stringify(initialData)
      setHasUnsavedChanges(hasChanges)
    }
  }, [data, initialData])

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
      const savedData = JSON.parse(stored)
      if (data.id) {
        await supabase.from('anleggsdata_brannalarm').update(savedData).eq('id', data.id)
      } else {
        await supabase.from('anleggsdata_brannalarm').insert(savedData)
      }
      localStorage.removeItem(localStorageKey)
      setPendingChanges(0)
      setLastSaved(new Date())
      await loadData()
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    } finally {
      setSaving(false)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      const { data: brannalarmData, error } = await supabase
        .from('anleggsdata_brannalarm')
        .select('*')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (error) throw error

      if (brannalarmData) {
        const eksternMottaker = brannalarmData.ekstern_mottaker || []
        const loadedData = {
          id: brannalarmData.id,
          anlegg_id: anleggId,
          talevarsling: brannalarmData.talevarsling || false,
          talevarsling_leverandor: brannalarmData.talevarsling_leverandor || '',
          talevarsling_batteri_type: brannalarmData.talevarsling_batteri_type || '',
          talevarsling_batteri_alder: brannalarmData.talevarsling_batteri_alder || '',
          talevarsling_plassering: brannalarmData.talevarsling_plassering || '',
          talevarsling_kommentar: brannalarmData.talevarsling_kommentar || '',
          alarmsender_i_anlegg: brannalarmData.alarmsender_i_anlegg || false,
          mottaker: brannalarmData.mottaker || [],
          gsm_nummer: brannalarmData.gsm_nummer || '',
          plassering: brannalarmData.plassering || '',
          batterialder: brannalarmData.batterialder || '',
          batteritype: brannalarmData.batteritype || '',
          forsynet_fra_brannsentral: brannalarmData.forsynet_fra_brannsentral || false,
          sender_2G_4G: brannalarmData.sender_2G_4G || '',
          mottaker_kommentar: brannalarmData.mottaker_kommentar || '',
          ekstern_mottaker: eksternMottaker,
          ekstern_mottaker_info: brannalarmData.ekstern_mottaker_info || '',
          ekstern_mottaker_aktiv: brannalarmData.ekstern_mottaker_aktiv || false,
          nokkelsafe: brannalarmData.nokkelsafe || false,
          nokkelsafe_type: brannalarmData.nokkelsafe_type || '',
          nokkelsafe_plassering: brannalarmData.nokkelsafe_plassering || '',
          nokkelsafe_innhold: brannalarmData.nokkelsafe_innhold || '',
          nokkelsafe_kommentar: brannalarmData.nokkelsafe_kommentar || '',
        }
        setData(loadedData)
        setInitialData(loadedData)
        setSelectedKontakter(eksternMottaker)
      } else {
        setInitialData(data)
      }
    } catch (error) {
      console.error('Feil ved lasting av tilleggsutstyr:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadKontaktpersoner() {
    try {
      // Try junction table approach first
      let { data: kontakter, error } = await supabase
        .from('kontaktpersoner')
        .select(`
          *,
          anlegg_kontaktpersoner!inner(
            anlegg_id,
            primar
          )
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)

      // Fallback to direct approach if junction table fails
      if (error || !kontakter || kontakter.length === 0) {
        const fallback = await supabase
          .from('kontaktpersoner')
          .select('*')
          .eq('anlegg_id', anleggId)
        
        kontakter = fallback.data || []
      }

      setKontaktpersoner(kontakter as Kontaktperson[])
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner:', error)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Update ekstern_mottaker_info based on selected contacts
      const eksternMottakerInfo = selectedKontakter
        .map(navn => {
          const person = kontaktpersoner.find(k => k.navn === navn)
          if (!person) return navn
          const info = [person.navn]
          if (person.epost) info.push(`E-post: ${person.epost}`)
          if (person.telefon) info.push(`Tlf: ${person.telefon}`)
          return info.join(', ')
        })
        .join(' | ')

      const saveData = {
        anlegg_id: anleggId,
        talevarsling: data.talevarsling,
        talevarsling_leverandor: data.talevarsling_leverandor,
        talevarsling_batteri_type: data.talevarsling_batteri_type,
        talevarsling_batteri_alder: data.talevarsling_batteri_alder,
        talevarsling_plassering: data.talevarsling_plassering,
        talevarsling_kommentar: data.talevarsling_kommentar,
        alarmsender_i_anlegg: data.alarmsender_i_anlegg,
        mottaker: data.mottaker,
        gsm_nummer: data.gsm_nummer,
        plassering: data.plassering,
        batterialder: data.batterialder,
        batteritype: data.batteritype,
        forsynet_fra_brannsentral: data.forsynet_fra_brannsentral,
        sender_2G_4G: data.sender_2G_4G,
        mottaker_kommentar: data.mottaker_kommentar,
        ekstern_mottaker: selectedKontakter,
        ekstern_mottaker_info: eksternMottakerInfo,
        ekstern_mottaker_aktiv: data.mottaker?.includes('Ekstern') || false,
        nokkelsafe: data.nokkelsafe,
        nokkelsafe_type: data.nokkelsafe_type,
        nokkelsafe_plassering: data.nokkelsafe_plassering,
        nokkelsafe_innhold: data.nokkelsafe_innhold,
        nokkelsafe_kommentar: data.nokkelsafe_kommentar,
      }

      if (isOnline) {
        if (data.id) {
          await supabase.from('anleggsdata_brannalarm').update(saveData).eq('id', data.id)
        } else {
          const { data: newData } = await supabase
            .from('anleggsdata_brannalarm')
            .upsert(saveData, { onConflict: 'anlegg_id' })
            .select()
            .single()
          if (newData) {
            setData(prev => ({ ...prev, id: newData.id }))
          }
        }
        setLastSaved(new Date())
        setInitialData(data) // Reset ulagrede endringer
        alert('Tilleggsutstyr lagret!')
      } else {
        localStorage.setItem(localStorageKey, JSON.stringify(saveData))
        setPendingChanges(1)
        setInitialData(data) // Reset ulagrede endringer
        alert('Offline - data lagret lokalt og vil synkroniseres når du er online igjen')
      }
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av tilleggsutstyr')
    } finally {
      setSaving(false)
    }
  }

  const mottakerOptions = ['110 Brannvesen', 'Alarmsentral', 'Intern', 'Ekstern']
  const sender2G4GOptions = ['2G', '4G', 'Begge']

  function toggleMottaker(option: string) {
    const currentMottakere = data.mottaker || []
    if (currentMottakere.includes(option)) {
      setData({ ...data, mottaker: currentMottakere.filter(m => m !== option) })
    } else {
      setData({ ...data, mottaker: [...currentMottakere, option] })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Tilleggsutstyr</h1>
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
        </div>
      </div>

      {/* Talevarsling */}
      <div className={`card transition-all ${data.talevarsling ? 'border-blue-500/30 bg-blue-500/5' : ''}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            data.talevarsling ? 'bg-blue-500/20' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Volume2 className={`w-6 h-6 ${data.talevarsling ? 'text-blue-400' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${data.talevarsling ? 'text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  Talevarsling
                </h3>
                <p className="text-sm text-gray-400">Registrer talevarslingsutstyr</p>
              </div>
              <button
                onClick={() => setData({ ...data, talevarsling: !data.talevarsling })}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  data.talevarsling ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                  data.talevarsling ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {data.talevarsling && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Leverandør</label>
                  <input
                    type="text"
                    value={data.talevarsling_leverandor || ''}
                    onChange={(e) => setData({ ...data, talevarsling_leverandor: e.target.value })}
                    className="input"
                    placeholder="F.eks. Bosch, Siemens..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batteri type</label>
                  <input
                    type="text"
                    value={data.talevarsling_batteri_type || ''}
                    onChange={(e) => setData({ ...data, talevarsling_batteri_type: e.target.value })}
                    className="input"
                    placeholder="F.eks. 12V 7Ah..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batteri alder (år)</label>
                  <input
                    type="number"
                    value={data.talevarsling_batteri_alder || ''}
                    onChange={(e) => setData({ ...data, talevarsling_batteri_alder: e.target.value })}
                    className="input"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plassering</label>
                  <input
                    type="text"
                    value={data.talevarsling_plassering || ''}
                    onChange={(e) => setData({ ...data, talevarsling_plassering: e.target.value })}
                    className="input"
                    placeholder="F.eks. Teknisk rom..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kommentar</label>
                  <textarea
                    value={data.talevarsling_kommentar || ''}
                    onChange={(e) => setData({ ...data, talevarsling_kommentar: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Legg til kommentar..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alarmsender */}
      <div className={`card transition-all ${data.alarmsender_i_anlegg ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            data.alarmsender_i_anlegg ? 'bg-orange-500/20' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Radio className={`w-6 h-6 ${data.alarmsender_i_anlegg ? 'text-orange-400' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${data.alarmsender_i_anlegg ? 'text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                  Alarmsender
                </h3>
                <p className="text-sm text-gray-400">Registrer alarmsender i anlegg</p>
              </div>
              <button
                onClick={() => setData({ ...data, alarmsender_i_anlegg: !data.alarmsender_i_anlegg })}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  data.alarmsender_i_anlegg ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                  data.alarmsender_i_anlegg ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {data.alarmsender_i_anlegg && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mottaker</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {mottakerOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => toggleMottaker(option)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          data.mottaker?.includes(option)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sender 2G/4G</label>
                    <select
                      value={data.sender_2G_4G || ''}
                      onChange={(e) => setData({ ...data, sender_2G_4G: e.target.value })}
                      className="input"
                    >
                      <option value="">Velg type</option>
                      {sender2G4GOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GSM-nummer</label>
                    <input
                      type="text"
                      value={data.gsm_nummer || ''}
                      onChange={(e) => setData({ ...data, gsm_nummer: e.target.value })}
                      className="input"
                      placeholder="F.eks. +47 xxx xx xxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plassering</label>
                    <input
                      type="text"
                      value={data.plassering || ''}
                      onChange={(e) => setData({ ...data, plassering: e.target.value })}
                      className="input"
                      placeholder="F.eks. Teknisk rom..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batterialder (år)</label>
                    <input
                      type="text"
                      value={data.batterialder || ''}
                      onChange={(e) => setData({ ...data, batterialder: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batteritype</label>
                    <input
                      type="text"
                      value={data.batteritype || ''}
                      onChange={(e) => setData({ ...data, batteritype: e.target.value })}
                      className="input"
                      placeholder="F.eks. 12V 7Ah..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="forsynt"
                    checked={data.forsynet_fra_brannsentral || false}
                    onChange={(e) => setData({ ...data, forsynet_fra_brannsentral: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="forsynt" className="text-sm text-gray-700 dark:text-gray-300">
                    Forsynt fra brannsentral
                  </label>
                </div>

                {/* Eksterne mottakere - vises kun hvis "Ekstern" er valgt */}
                {data.mottaker?.includes('Ekstern') && (
                  <div className="border border-orange-500/20 rounded-lg p-4 bg-orange-500/5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eksterne mottakere</label>
                    <button
                      onClick={() => setShowKontaktDialog(true)}
                      className="btn-secondary mb-3"
                    >
                      Velg kontaktperson(er)
                    </button>
                    
                    {selectedKontakter.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedKontakter.map((navn) => {
                          const person = kontaktpersoner.find(k => k.navn === navn)
                          return (
                            <div key={navn} className="flex items-center gap-2 bg-orange-500/20 px-3 py-1.5 rounded-lg">
                              <div>
                                <div className="text-sm font-medium text-white">{navn}</div>
                                {person?.epost && (
                                  <div className="text-xs text-gray-400">{person.epost}</div>
                                )}
                              </div>
                              <button
                                onClick={() => setSelectedKontakter(prev => prev.filter(n => n !== navn))}
                                className="text-gray-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kommentar</label>
                  <textarea
                    value={data.mottaker_kommentar || ''}
                    onChange={(e) => setData({ ...data, mottaker_kommentar: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Legg til kommentar..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kontaktperson Dialog */}
      {showKontaktDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Velg kontaktperson(er)</h2>
              <p className="text-sm text-gray-400 mt-1">Velg eksterne mottakere for alarmsender</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {kontaktpersoner.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Ingen kontaktpersoner funnet for dette anlegget</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {kontaktpersoner.map((person) => (
                    <label
                      key={person.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-gray-800 hover:border-orange-500/30 hover:bg-orange-500/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKontakter.includes(person.navn)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKontakter(prev => [...prev, person.navn])
                          } else {
                            setSelectedKontakter(prev => prev.filter(n => n !== person.navn))
                          }
                        }}
                        className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{person.navn}</span>
                          {person.primar && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                              Primær
                            </span>
                          )}
                        </div>
                        {person.epost && (
                          <div className="text-sm text-gray-400 mt-1">📧 {person.epost}</div>
                        )}
                        {person.telefon && (
                          <div className="text-sm text-gray-400">📞 {person.telefon}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowKontaktDialog(false)}
                className="btn-secondary"
              >
                Avbryt
              </button>
              <button
                onClick={() => setShowKontaktDialog(false)}
                className="btn-primary"
              >
                OK ({selectedKontakter.length} valgt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nøkkelsafe */}
      <div className={`card transition-all ${data.nokkelsafe ? 'border-purple-500/30 bg-purple-500/5' : ''}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            data.nokkelsafe ? 'bg-purple-500/20' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Key className={`w-6 h-6 ${data.nokkelsafe ? 'text-purple-400' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${data.nokkelsafe ? 'text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                  Nøkkelsafe
                </h3>
                <p className="text-sm text-gray-400">Registrer nøkkelsafe</p>
              </div>
              <button
                onClick={() => setData({ ...data, nokkelsafe: !data.nokkelsafe })}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  data.nokkelsafe ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                  data.nokkelsafe ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {data.nokkelsafe && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <input
                    type="text"
                    value={data.nokkelsafe_type || ''}
                    onChange={(e) => setData({ ...data, nokkelsafe_type: e.target.value })}
                    className="input"
                    placeholder="F.eks. KeySafe Pro..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plassering</label>
                  <input
                    type="text"
                    value={data.nokkelsafe_plassering || ''}
                    onChange={(e) => setData({ ...data, nokkelsafe_plassering: e.target.value })}
                    className="input"
                    placeholder="F.eks. Ved hovedinngang..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Innhold</label>
                  <input
                    type="text"
                    value={data.nokkelsafe_innhold || ''}
                    onChange={(e) => setData({ ...data, nokkelsafe_innhold: e.target.value })}
                    className="input"
                    placeholder="F.eks. Hovedn økkel, teknisk rom..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kommentar</label>
                  <textarea
                    value={data.nokkelsafe_kommentar || ''}
                    onChange={(e) => setData({ ...data, nokkelsafe_kommentar: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Legg til kommentar..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Button - Sticky på mobil/iPad */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-dark via-white/95 dark:via-dark/95 to-transparent pointer-events-none z-40">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full py-4 px-6 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/25"
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
