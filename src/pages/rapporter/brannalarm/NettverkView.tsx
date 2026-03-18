import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Search, Edit, Trash2, X, Wifi, WifiOff, Info, Check } from 'lucide-react'
import { NettverkEnhet } from '../Brannalarm'

interface EnhetTypeInfo {
  type: string
  antall: number
}

interface EnheterData {
  brannsentral?: number
  brannsentral_typer?: EnhetTypeInfo[]
  panel?: number
  panel_typer?: EnhetTypeInfo[]
  asp?: number
  asp_typer?: EnhetTypeInfo[]
  kraftforsyning?: number
  kraftforsyning_typer?: EnhetTypeInfo[]
}

interface NettverkViewProps {
  anleggId: string
  anleggsNavn: string
  nettverkListe: NettverkEnhet[]
  enheterData?: EnheterData
  onBack: () => void
  onRefresh: () => void
}

export function NettverkView({ anleggId, anleggsNavn, nettverkListe, enheterData, onBack, onRefresh }: NettverkViewProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingSystem, setEditingSystem] = useState<NettverkEnhet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nettverk_id: '',
    plassering: '',
    type: '',
    sw_id: '',
    spenning: '',
    ah: '',
    batterialder: '',
    batteri_ikke_aktuelt: false,
  })
  const [saving, setSaving] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  const localStorageKey = `nettverk_offline_${anleggId}`

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
      const operations = JSON.parse(stored)
      for (const op of operations) {
        if (op.type === 'insert') {
          await supabase.from('nettverk_brannalarm').insert(op.data)
        } else if (op.type === 'update') {
          await supabase.from('nettverk_brannalarm').update(op.data).eq('id', op.id)
        } else if (op.type === 'delete') {
          await supabase.from('nettverk_brannalarm').delete().eq('id', op.id)
        }
      }
      localStorage.removeItem(localStorageKey)
      setPendingChanges(0)
      onRefresh()
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    }
  }

  const filteredNettverk = (nettverkListe || []).filter(n =>
    String(n.nettverk_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(n.plassering || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(n.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(n.sw_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Beregn hvilke typer som allerede er brukt i nettverk (for å hindre duplikater)
  const usedTypes = (nettverkListe || []).map(n => n.type).filter(Boolean)
  
  // Funksjon for å sjekke om en type er brukt (og hvor mange ganger)
  const getTypeUsageCount = (type: string) => usedTypes.filter(t => t === type).length
  
  // Funksjon for å sjekke om en type kan velges (basert på antall registrert vs brukt)
  const canSelectType = (type: string, maxCount: number) => {
    const currentUsage = getTypeUsageCount(type)
    // Hvis vi redigerer og typen er den samme som før, tillat det
    if (editingSystem && editingSystem.type === type) {
      return currentUsage <= maxCount
    }
    return currentUsage < maxCount
  }

  function openDialog(system?: NettverkEnhet) {
    if (system) {
      setEditingSystem(system)
      setFormData({
        nettverk_id: String(system.nettverk_id || ''),
        plassering: system.plassering || '',
        type: system.type || '',
        sw_id: system.sw_id || '',
        spenning: system.spenning ? String(system.spenning) : '',
        ah: system.ah ? String(system.ah) : '',
        batterialder: system.batterialder ? String(system.batterialder) : '',
        batteri_ikke_aktuelt: (system as any).batteri_ikke_aktuelt || false,
      })
    } else {
      setEditingSystem(null)
      setFormData({
        nettverk_id: '',
        plassering: '',
        type: '',
        sw_id: '',
        spenning: '',
        ah: '',
        batterialder: '',
        batteri_ikke_aktuelt: false,
      })
    }
    setShowDialog(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Konverter string-verdier til riktige typer for databasen
      const data = {
        anlegg_id: anleggId,
        nettverk_id: formData.nettverk_id,
        plassering: formData.plassering,
        type: formData.type,
        sw_id: formData.sw_id,
        spenning: formData.spenning ? parseFloat(formData.spenning) : null,
        ah: formData.ah ? parseFloat(formData.ah) : null,
        batterialder: formData.batterialder ? parseInt(formData.batterialder) : null,
        batteri_ikke_aktuelt: formData.batteri_ikke_aktuelt,
      }

      if (isOnline) {
        if (editingSystem) {
          const { error } = await supabase.from('nettverk_brannalarm').update(data).eq('id', editingSystem.id)
          if (error) {
            console.error('Feil ved oppdatering av nettverk:', error)
            alert(`Feil ved lagring: ${error.message}`)
            setSaving(false)
            return
          }
        } else {
          const { error } = await supabase.from('nettverk_brannalarm').insert(data)
          if (error) {
            console.error('Feil ved innsetting av nettverk:', error)
            alert(`Feil ved lagring: ${error.message}`)
            setSaving(false)
            return
          }
        }
        onRefresh()
        setShowDialog(false)
      } else {
        const stored = localStorage.getItem(localStorageKey)
        const operations = stored ? JSON.parse(stored) : []
        if (editingSystem) {
          operations.push({ type: 'update', id: editingSystem.id, data })
        } else {
          operations.push({ type: 'insert', data })
        }
        localStorage.setItem(localStorageKey, JSON.stringify(operations))
        setPendingChanges(operations.length)
        alert('Offline - data lagret lokalt')
        setShowDialog(false)
      }

      setShowDialog(false)
      onRefresh()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av system')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette dette systemet?')) return

    try {
      await supabase
        .from('nettverk_brannalarm')
        .delete()
        .eq('id', id)
      
      onRefresh()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Feil ved sletting av system')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Brannalarm nettverk</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 truncate">{anleggsNavn}</p>
            </div>
          </div>
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
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {pendingChanges > 0 && (
            <span className="text-xs sm:text-sm text-orange-400">{pendingChanges} endringer venter</span>
          )}
          <button onClick={() => openDialog()} className="btn-primary flex items-center gap-2 text-sm sm:text-base">
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Nytt system</span>
            <span className="xs:hidden">Ny</span>
          </button>
        </div>
      </div>

      {/* Hjelpe-info: Sentralenheter som kan være i nettverk */}
      {enheterData && (enheterData.brannsentral || enheterData.panel || enheterData.asp || enheterData.kraftforsyning) && (
        <div className="card bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-400 mb-2">Registrerte sentralenheter</h3>
              <p className="text-xs text-gray-400 mb-3">
                Følgende enheter kan kobles i nettverk:
              </p>
              <div className="flex flex-wrap gap-3">
                {enheterData.brannsentral ? (
                  <div className="bg-gray-200 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏢</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Brannsentral: <strong className="text-gray-900 dark:text-white">{enheterData.brannsentral}</strong></span>
                    </div>
                    {enheterData.brannsentral_typer && enheterData.brannsentral_typer.length > 0 && (
                      <div className="mt-1 ml-7 text-xs space-y-0.5">
                        {enheterData.brannsentral_typer.map((t, i) => {
                          const usedCount = getTypeUsageCount(t.type)
                          const allUsed = usedCount >= t.antall
                          return (
                            <div key={i} className={`flex items-center gap-1 ${allUsed ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                              {allUsed && <Check className="w-3 h-3" />}
                              <span>{t.type} ({usedCount}/{t.antall})</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
                {enheterData.panel ? (
                  <div className="bg-gray-200 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎛️</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Brannpanel: <strong className="text-gray-900 dark:text-white">{enheterData.panel}</strong></span>
                    </div>
                    {enheterData.panel_typer && enheterData.panel_typer.length > 0 && (
                      <div className="mt-1 ml-7 text-xs space-y-0.5">
                        {enheterData.panel_typer.map((t, i) => {
                          const usedCount = getTypeUsageCount(t.type)
                          const allUsed = usedCount >= t.antall
                          return (
                            <div key={i} className={`flex items-center gap-1 ${allUsed ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                              {allUsed && <Check className="w-3 h-3" />}
                              <span>{t.type} ({usedCount}/{t.antall})</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
                {enheterData.asp ? (
                  <div className="bg-gray-200 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💨</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Aspirasjon: <strong className="text-gray-900 dark:text-white">{enheterData.asp}</strong></span>
                    </div>
                    {enheterData.asp_typer && enheterData.asp_typer.length > 0 && (
                      <div className="mt-1 ml-7 text-xs space-y-0.5">
                        {enheterData.asp_typer.map((t, i) => {
                          const usedCount = getTypeUsageCount(t.type)
                          const allUsed = usedCount >= t.antall
                          return (
                            <div key={i} className={`flex items-center gap-1 ${allUsed ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                              {allUsed && <Check className="w-3 h-3" />}
                              <span>{t.type} ({usedCount}/{t.antall})</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
                {enheterData.kraftforsyning ? (
                  <div className="bg-gray-200 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Kraftforsyning: <strong className="text-gray-900 dark:text-white">{enheterData.kraftforsyning}</strong></span>
                    </div>
                    {enheterData.kraftforsyning_typer && enheterData.kraftforsyning_typer.length > 0 && (
                      <div className="mt-1 ml-7 text-xs space-y-0.5">
                        {enheterData.kraftforsyning_typer.map((t, i) => {
                          const usedCount = getTypeUsageCount(t.type)
                          const allUsed = usedCount >= t.antall
                          return (
                            <div key={i} className={`flex items-center gap-1 ${allUsed ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                              {allUsed && <Check className="w-3 h-3" />}
                              <span>{t.type} ({usedCount}/{t.antall})</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Søk i nettverk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 text-sm"
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
            {searchTerm ? `Viser: ${filteredNettverk.length} av ${nettverkListe.length}` : `Totalt: ${nettverkListe.length}`} systemer
          </div>
        </div>

        {filteredNettverk.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">
              {searchTerm ? 'Ingen systemer funnet' : 'Ingen systemer i nettverk'}
            </div>
            {!searchTerm && (
              <button onClick={() => openDialog()} className="btn-primary mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Legg til system
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-20">
            {filteredNettverk.map((system) => (
              <div key={system.id} className="card bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 font-bold">{system.nettverk_id}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Nettverk {system.nettverk_id}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{system.plassering}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDialog(system)}
                      className="p-1.5 hover:bg-white/5 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(system.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {system.type && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                      {system.type}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-100 dark:bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-500 dark:text-gray-400 mb-1">SW-versjon</div>
                    <div className="text-gray-900 dark:text-white font-medium">{system.sw_id || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Spenning</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {(system as any).batteri_ikke_aktuelt ? 'N/A' : `${system.spenning || 0}V`}
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Kapasitet</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {(system as any).batteri_ikke_aktuelt ? 'N/A' : `${system.ah || 0}Ah`}
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Batterialder</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {(system as any).batteri_ikke_aktuelt ? 'N/A' : `${system.batterialder || 0} år`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingSystem ? 'Rediger system' : 'Legg til system'}
                </h2>
                <button onClick={() => setShowDialog(false)} className="p-2 hover:bg-white/5 rounded transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nettverk</label>
                  <input
                    type="text"
                    value={formData.nettverk_id}
                    onChange={(e) => setFormData({ ...formData, nettverk_id: e.target.value })}
                    className="input"
                    placeholder="F.eks. 1, 2, 3..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Plassering</label>
                  <input
                    type="text"
                    value={formData.plassering}
                    onChange={(e) => setFormData({ ...formData, plassering: e.target.value })}
                    className="input"
                    placeholder="F.eks. Teknisk rom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                {/* Dropdown med typer fra sentralenheter */}
                {enheterData && (enheterData.brannsentral_typer?.length || enheterData.panel_typer?.length || enheterData.asp_typer?.length || enheterData.kraftforsyning_typer?.length) ? (
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                  >
                    <option value="">Velg type...</option>
                    {enheterData.brannsentral_typer && enheterData.brannsentral_typer.length > 0 && (
                      <optgroup label="🏢 Brannsentral">
                        {enheterData.brannsentral_typer.map((t, i) => {
                          const canSelect = canSelectType(t.type, t.antall)
                          return (
                            <option key={`bs-${i}`} value={t.type} disabled={!canSelect}>
                              {t.type} {!canSelect ? '(alle brukt)' : `(${getTypeUsageCount(t.type)}/${t.antall})`}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                    {enheterData.panel_typer && enheterData.panel_typer.length > 0 && (
                      <optgroup label="🎛️ Brannpanel">
                        {enheterData.panel_typer.map((t, i) => {
                          const canSelect = canSelectType(t.type, t.antall)
                          return (
                            <option key={`bp-${i}`} value={t.type} disabled={!canSelect}>
                              {t.type} {!canSelect ? '(alle brukt)' : `(${getTypeUsageCount(t.type)}/${t.antall})`}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                    {enheterData.asp_typer && enheterData.asp_typer.length > 0 && (
                      <optgroup label="💨 Aspirasjon">
                        {enheterData.asp_typer.map((t, i) => {
                          const canSelect = canSelectType(t.type, t.antall)
                          return (
                            <option key={`asp-${i}`} value={t.type} disabled={!canSelect}>
                              {t.type} {!canSelect ? '(alle brukt)' : `(${getTypeUsageCount(t.type)}/${t.antall})`}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                    {enheterData.kraftforsyning_typer && enheterData.kraftforsyning_typer.length > 0 && (
                      <optgroup label="⚡ Kraftforsyning">
                        {enheterData.kraftforsyning_typer.map((t, i) => {
                          const canSelect = canSelectType(t.type, t.antall)
                          return (
                            <option key={`kf-${i}`} value={t.type} disabled={!canSelect}>
                              {t.type} {!canSelect ? '(alle brukt)' : `(${getTypeUsageCount(t.type)}/${t.antall})`}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                    <optgroup label="Annet">
                      <option value="__custom__">Skriv inn manuelt...</option>
                    </optgroup>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    placeholder="F.eks. BS420, BX-420"
                  />
                )}
                {formData.type === '__custom__' && (
                  <input
                    type="text"
                    value=""
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input mt-2"
                    placeholder="Skriv inn type manuelt..."
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SW-versjon</label>
                <input
                  type="text"
                  value={formData.sw_id}
                  onChange={(e) => setFormData({ ...formData, sw_id: e.target.value })}
                  className="input"
                  placeholder="F.eks. v2.1.0"
                />
              </div>

              {/* Batteri ikke aktuelt checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batteri_ikke_aktuelt"
                  checked={formData.batteri_ikke_aktuelt}
                  onChange={(e) => setFormData({ ...formData, batteri_ikke_aktuelt: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                />
                <label htmlFor="batteri_ikke_aktuelt" className="text-sm text-gray-300">
                  Batteri ikke aktuelt (vises som N/A i rapport)
                </label>
              </div>

              {!formData.batteri_ikke_aktuelt && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Spenning (V)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.spenning || ''}
                      onChange={(e) => setFormData({ ...formData, spenning: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Ah</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.ah || ''}
                      onChange={(e) => setFormData({ ...formData, ah: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Batterialder (år)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.batterialder || ''}
                      onChange={(e) => setFormData({ ...formData, batterialder: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowDialog(false)} className="btn-secondary">
                Avbryt
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Lagrer...' : 'Lagre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
