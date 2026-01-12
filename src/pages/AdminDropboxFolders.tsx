import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  KUNDE_FOLDERS,
  ANLEGG_FOLDERS
} from '@/services/dropboxFolderStructure'
import { 
  checkDropboxStatus, 
  startDropboxAuth, 
  disconnectDropbox,
  createDropboxFolder 
} from '@/services/dropboxServiceV2'
import { Cloud, FolderPlus, Building2, Loader2, CheckCircle, XCircle, AlertCircle, Unplug } from 'lucide-react'

interface Kunde {
  id: string
  navn: string
  kunde_nummer: string | null
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  dropbox_synced: boolean | null
}

interface DropboxStatusType {
  connected: boolean
  connected_by: string | null
  connected_at: string | null
}

export function AdminDropboxFolders() {
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState<string>('')
  const [selectedAnlegg, setSelectedAnlegg] = useState<string[]>([])
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedKunder, setSelectedKunder] = useState<string[]>([])
  const [kundeAnleggMap, setKundeAnleggMap] = useState<Record<string, Anlegg[]>>({})
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [progress, setProgress] = useState<{ message: string; current: number; total: number } | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatusType>({ connected: false, connected_by: null, connected_at: null })

  useEffect(() => {
    loadKunder()
    loadDropboxStatus()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnleggForKunde(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg([])
    }
  }, [selectedKunde])

  // Last anlegg for alle valgte kunder i multi-select modus
  useEffect(() => {
    if (multiSelectMode && selectedKunder.length > 0) {
      loadAnleggForMultipleKunder(selectedKunder)
    }
  }, [selectedKunder, multiSelectMode])

  async function loadDropboxStatus() {
    setCheckingStatus(true)
    try {
      const status = await checkDropboxStatus()
      setDropboxStatus(status)
    } catch (error) {
      console.error('Feil ved sjekk av Dropbox-status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  async function loadKunder() {
    const { data, error } = await supabase
      .from('customer')
      .select('id, navn, kunde_nummer')
      .not('kunde_nummer', 'is', null)
      .or('skjult.is.null,skjult.eq.false')
      .order('kunde_nummer')

    if (!error && data) {
      setKunder(data)
    }
  }

  async function loadAnleggForKunde(kundeId: string) {
    const { data, error } = await supabase
      .from('anlegg')
      .select('id, anleggsnavn, kundenr, dropbox_synced')
      .eq('kundenr', kundeId)
      .order('anleggsnavn')

    if (!error && data) {
      setAnlegg(data)
      setSelectedAnlegg(data.map(a => a.id))
    }
  }

  async function loadAnleggForMultipleKunder(kundeIds: string[]) {
    const { data, error } = await supabase
      .from('anlegg')
      .select('id, anleggsnavn, kundenr, dropbox_synced')
      .in('kundenr', kundeIds)
      .order('anleggsnavn')

    if (!error && data) {
      // Grupper anlegg per kunde
      const map: Record<string, Anlegg[]> = {}
      for (const kundeId of kundeIds) {
        map[kundeId] = data.filter(a => a.kundenr === kundeId)
      }
      setKundeAnleggMap(map)
    }
  }

  // Hjelpefunksjon for å opprette mapper via Edge Function
  async function createFoldersViaEdgeFunction(
    basePath: string,
    folders: string[],
    onProgress: (message: string, current: number, total: number) => void
  ): Promise<{ created: number; errors: string[] }> {
    let created = 0
    const errors: string[] = []

    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]
      const fullPath = `${basePath}/${folder}`
      
      onProgress(`Oppretter ${folder}...`, i + 1, folders.length)
      
      const success = await createDropboxFolder(fullPath)
      if (success) {
        created++
      } else {
        errors.push(folder)
      }
    }

    return { created, errors }
  }

  async function handleCreateKundeStructure() {
    const kunde = kunder.find(k => k.id === selectedKunde)
    if (!kunde || !kunde.kunde_nummer) return

    setLoading(true)
    setResult(null)
    setProgress({ message: 'Starter...', current: 0, total: KUNDE_FOLDERS.length })

    try {
      const safeKundeNavn = kunde.navn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const basePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kunde.kunde_nummer}_${safeKundeNavn}`
      
      const { created, errors } = await createFoldersViaEdgeFunction(
        basePath,
        KUNDE_FOLDERS,
        (message, current, total) => setProgress({ message, current, total })
      )

      if (errors.length === 0) {
        setResult({ success: true, message: `✅ Opprettet ${created} mapper for ${kunde.navn}` })
      } else {
        setResult({ success: false, message: `⚠️ Opprettet ${created} mapper, ${errors.length} feil` })
      }
    } catch (error) {
      setResult({ success: false, message: `❌ Feil: ${error}` })
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  async function handleCreateAnleggStructure(anleggId: string) {
    const kunde = kunder.find(k => k.id === selectedKunde)
    const anleggItem = anlegg.find(a => a.id === anleggId)
    if (!kunde || !kunde.kunde_nummer || !anleggItem) return

    setLoading(true)
    setResult(null)
    setProgress({ message: 'Starter...', current: 0, total: ANLEGG_FOLDERS.length })

    try {
      const safeKundeNavn = kunde.navn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const safeAnleggNavn = anleggItem.anleggsnavn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const basePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kunde.kunde_nummer}_${safeKundeNavn}/02_Bygg/${safeAnleggNavn}`
      
      const { created, errors } = await createFoldersViaEdgeFunction(
        basePath,
        ANLEGG_FOLDERS,
        (message, current, total) => setProgress({ message, current, total })
      )

      // Marker anlegget som synkronisert (uavhengig av om noen mapper allerede eksisterte)
      await supabase
        .from('anlegg')
        .update({ dropbox_synced: true })
        .eq('id', anleggId)
      
      // Oppdater lokal state
      setAnlegg(prev => prev.map(a => 
        a.id === anleggId ? { ...a, dropbox_synced: true } : a
      ))

      if (errors.length === 0) {
        setResult({ success: true, message: `✅ Opprettet ${created} mapper for ${anleggItem.anleggsnavn}` })
      } else {
        setResult({ success: true, message: `✅ Opprettet ${created} mapper (${errors.length} eksisterte allerede)` })
      }
    } catch (error) {
      setResult({ success: false, message: `❌ Feil: ${error}` })
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  async function handleCreateFullStructure() {
    const kunde = kunder.find(k => k.id === selectedKunde)
    if (!kunde || !kunde.kunde_nummer) return

    const selectedAnleggItems = anlegg.filter(a => selectedAnlegg.includes(a.id))

    setLoading(true)
    setResult(null)
    
    const totalSteps = KUNDE_FOLDERS.length + (selectedAnleggItems.length * ANLEGG_FOLDERS.length)
    setProgress({ message: 'Starter...', current: 0, total: totalSteps })

    try {
      const safeKundeNavn = kunde.navn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const kundeBasePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kunde.kunde_nummer}_${safeKundeNavn}`
      
      let totalCreated = 0
      let totalErrors = 0
      let currentStep = 0

      // Opprett kunde-mapper
      const kundeResult = await createFoldersViaEdgeFunction(
        kundeBasePath,
        KUNDE_FOLDERS,
        (message, current, _total) => {
          currentStep = current
          setProgress({ message, current: currentStep, total: totalSteps })
        }
      )
      totalCreated += kundeResult.created
      totalErrors += kundeResult.errors.length

      // Opprett anlegg-mapper
      for (const anleggItem of selectedAnleggItems) {
        const safeAnleggNavn = anleggItem.anleggsnavn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
        const anleggBasePath = `${kundeBasePath}/02_Bygg/${safeAnleggNavn}`
        
        const anleggResult = await createFoldersViaEdgeFunction(
          anleggBasePath,
          ANLEGG_FOLDERS,
          (message, current, _total) => {
            currentStep = KUNDE_FOLDERS.length + (selectedAnleggItems.indexOf(anleggItem) * ANLEGG_FOLDERS.length) + current
            setProgress({ message: `${anleggItem.anleggsnavn}: ${message}`, current: currentStep, total: totalSteps })
          }
        )
        totalCreated += anleggResult.created
        totalErrors += anleggResult.errors.length
      }

      // Marker alle anlegg som synkronisert (uavhengig av om noen mapper allerede eksisterte)
      await supabase
        .from('anlegg')
        .update({ dropbox_synced: true })
        .in('id', selectedAnlegg)
      
      // Oppdater lokal state
      setAnlegg(prev => prev.map(a => 
        selectedAnlegg.includes(a.id) ? { ...a, dropbox_synced: true } : a
      ))

      if (totalErrors === 0) {
        setResult({ 
          success: true, 
          message: `✅ Opprettet ${totalCreated} mapper for ${kunde.navn} med ${selectedAnleggItems.length} anlegg` 
        })
      } else {
        setResult({ 
          success: true, 
          message: `✅ Opprettet ${totalCreated} mapper (${totalErrors} eksisterte allerede)` 
        })
      }
    } catch (error) {
      setResult({ success: false, message: `❌ Feil: ${error}` })
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Er du sikker på at du vil koble fra Dropbox?')) return
    
    setLoading(true)
    try {
      await disconnectDropbox()
      await loadDropboxStatus()
      setResult({ success: true, message: 'Dropbox frakoblet' })
    } catch (error) {
      setResult({ success: false, message: `Feil ved frakobling: ${error}` })
    } finally {
      setLoading(false)
    }
  }

  function toggleAnlegg(anleggId: string) {
    setSelectedAnlegg(prev => 
      prev.includes(anleggId) 
        ? prev.filter(id => id !== anleggId)
        : [...prev, anleggId]
    )
  }

  function selectAllAnlegg() {
    setSelectedAnlegg(anlegg.map(a => a.id))
  }

  function deselectAllAnlegg() {
    setSelectedAnlegg([])
  }

  function toggleKunde(kundeId: string) {
    setSelectedKunder(prev =>
      prev.includes(kundeId)
        ? prev.filter(id => id !== kundeId)
        : [...prev, kundeId]
    )
  }

  // Marker anlegg som synkronisert med Dropbox
  async function toggleDropboxSynced(anleggId: string, currentSynced: boolean) {
    try {
      const { error } = await supabase
        .from('anlegg')
        .update({ dropbox_synced: !currentSynced })
        .eq('id', anleggId)

      if (error) throw error

      // Oppdater lokal state
      setAnlegg(prev => prev.map(a => 
        a.id === anleggId ? { ...a, dropbox_synced: !currentSynced } : a
      ))

      setResult({ 
        success: true, 
        message: !currentSynced 
          ? '✅ Anlegg markert som synkronisert med Dropbox' 
          : '✅ Dropbox-markering fjernet fra anlegg'
      })
    } catch (error) {
      setResult({ success: false, message: `❌ Feil: ${error}` })
    }
  }

  // Marker alle valgte anlegg som synkronisert
  async function markSelectedAsSynced() {
    if (selectedAnlegg.length === 0) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('anlegg')
        .update({ dropbox_synced: true })
        .in('id', selectedAnlegg)

      if (error) throw error

      // Oppdater lokal state
      setAnlegg(prev => prev.map(a => 
        selectedAnlegg.includes(a.id) ? { ...a, dropbox_synced: true } : a
      ))

      setResult({ 
        success: true, 
        message: `✅ ${selectedAnlegg.length} anlegg markert som synkronisert med Dropbox` 
      })
    } catch (error) {
      setResult({ success: false, message: `❌ Feil: ${error}` })
    } finally {
      setLoading(false)
    }
  }

  function selectAllKunder() {
    setSelectedKunder(kunder.map(k => k.id))
  }

  function deselectAllKunder() {
    setSelectedKunder([])
  }

  async function handleCreateMultipleKundeStructures() {
    if (selectedKunder.length === 0) return

    setLoading(true)
    setResult(null)

    // Beregn totalt antall mapper
    let totalFolders = 0
    const kundeData: { kunde: Kunde; anleggList: Anlegg[] }[] = []
    
    for (const kundeId of selectedKunder) {
      const kunde = kunder.find(k => k.id === kundeId)
      if (!kunde || !kunde.kunde_nummer) continue
      
      const anleggList = kundeAnleggMap[kundeId] || []
      kundeData.push({ kunde, anleggList })
      totalFolders += KUNDE_FOLDERS.length + (anleggList.length * ANLEGG_FOLDERS.length)
    }

    setProgress({ message: 'Starter...', current: 0, total: totalFolders })

    try {
      let totalCreated = 0
      let totalErrors = 0
      let currentStep = 0
      let processedKunder = 0

      for (const { kunde, anleggList } of kundeData) {
        const safeKundeNavn = kunde.navn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
        const kundeBasePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kunde.kunde_nummer}_${safeKundeNavn}`

        // Opprett kunde-mapper
        const kundeResult = await createFoldersViaEdgeFunction(
          kundeBasePath,
          KUNDE_FOLDERS,
          () => {
            currentStep++
            setProgress({ 
              message: `${kunde.navn}`, 
              current: currentStep, 
              total: totalFolders 
            })
          }
        )
        totalCreated += kundeResult.created
        totalErrors += kundeResult.errors.length

        // Opprett anlegg-mapper
        for (const anleggItem of anleggList) {
          const safeAnleggNavn = anleggItem.anleggsnavn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
          const anleggBasePath = `${kundeBasePath}/02_Bygg/${safeAnleggNavn}`

          const anleggResult = await createFoldersViaEdgeFunction(
            anleggBasePath,
            ANLEGG_FOLDERS,
            () => {
              currentStep++
              setProgress({ 
                message: `${kunde.navn} → ${anleggItem.anleggsnavn}`, 
                current: currentStep, 
                total: totalFolders 
              })
            }
          )
          totalCreated += anleggResult.created
          totalErrors += anleggResult.errors.length
        }

        processedKunder++
        
        // Liten pause mellom kunder for å unngå rate limiting
        if (processedKunder < kundeData.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      const totalAnlegg = kundeData.reduce((sum, k) => sum + k.anleggList.length, 0)
      
      if (totalErrors === 0) {
        setResult({
          success: true,
          message: `✅ Opprettet ${totalCreated} mapper for ${kundeData.length} kunder og ${totalAnlegg} anlegg`
        })
      } else {
        setResult({
          success: false,
          message: `⚠️ Opprettet ${totalCreated} mapper, ${totalErrors} feil`
        })
      }
    } catch (error) {
      setResult({ success: false, message: `❌ Feil: ${error}` })
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  // Loading state
  if (checkingStatus) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dropbox Mappestruktur</h1>
          <p className="text-gray-600 dark:text-gray-400">Opprett mappestruktur for kunder og anlegg</p>
        </div>
        <div className="card text-center py-12">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Sjekker Dropbox-tilkobling...</p>
        </div>
      </div>
    )
  }

  // Not connected state
  if (!dropboxStatus.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dropbox Mappestruktur</h1>
          <p className="text-gray-600 dark:text-gray-400">Opprett mappestruktur for kunder og anlegg</p>
        </div>

        <div className="card text-center py-12">
          <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Ikke koblet til Dropbox</h2>
          <p className="text-gray-400 mb-6">Koble til Dropbox for å aktivere automatisk mappeopprettelse for alle brukere</p>
          <button
            onClick={() => startDropboxAuth()}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Cloud className="w-5 h-5" />
            Koble til Dropbox
          </button>
        </div>
      </div>
    )
  }

  // Connected state
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dropbox Mappestruktur</h1>
        <p className="text-gray-600 dark:text-gray-400">Opprett mappestruktur for kunder og anlegg</p>
      </div>

      {/* Connection status */}
      <div className="card bg-green-500/10 border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-white font-medium">Dropbox tilkoblet</p>
              {dropboxStatus.connected_by && (
                <p className="text-sm text-gray-400">
                  Koblet til av {dropboxStatus.connected_by}
                  {dropboxStatus.connected_at && ` • ${new Date(dropboxStatus.connected_at).toLocaleDateString('nb-NO')}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="btn-secondary text-red-400 hover:text-red-300 flex items-center gap-2"
          >
            <Unplug className="w-4 h-4" />
            Koble fra
          </button>
        </div>
      </div>

      {/* Modus-velger */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => {
              setMultiSelectMode(false)
              setSelectedKunder([])
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !multiSelectMode 
                ? 'bg-primary text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={loading}
          >
            Én kunde
          </button>
          <button
            onClick={() => {
              setMultiSelectMode(true)
              setSelectedKunde('')
              setAnlegg([])
              setSelectedAnlegg([])
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              multiSelectMode 
                ? 'bg-primary text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={loading}
          >
            Flere kunder
          </button>
        </div>

        {!multiSelectMode ? (
          <>
            <h2 className="text-xl font-semibold text-white mb-4">1. Velg kunde</h2>
            <select
              value={selectedKunde}
              onChange={(e) => setSelectedKunde(e.target.value)}
              className="input w-full"
              disabled={loading}
            >
              <option value="">Velg en kunde...</option>
              {kunder.map(kunde => (
                <option key={kunde.id} value={kunde.id}>
                  {kunde.kunde_nummer} - {kunde.navn}
                </option>
              ))}
            </select>

            {selectedKunde && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCreateKundeStructure}
                  disabled={loading}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  Opprett kun kunde-mapper
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">1. Velg kunder</h2>
              <div className="flex gap-2">
                <button onClick={selectAllKunder} className="text-sm text-primary hover:underline" disabled={loading}>
                  Velg alle
                </button>
                <span className="text-gray-500">|</span>
                <button onClick={deselectAllKunder} className="text-sm text-primary hover:underline" disabled={loading}>
                  Fjern alle
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
              {kunder.map(kunde => {
                const anleggCount = kundeAnleggMap[kunde.id]?.length || 0
                return (
                  <label key={kunde.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedKunder.includes(kunde.id)}
                      onChange={() => toggleKunde(kunde.id)}
                      className="w-4 h-4 rounded"
                      disabled={loading}
                    />
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{kunde.kunde_nummer} - {kunde.navn}</span>
                    {selectedKunder.includes(kunde.id) && anleggCount > 0 && (
                      <span className="ml-auto text-xs text-gray-400">
                        {anleggCount} anlegg
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            {selectedKunder.length > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-3">
                  {(() => {
                    const totalAnlegg = selectedKunder.reduce((sum, id) => sum + (kundeAnleggMap[id]?.length || 0), 0)
                    const totalFolders = selectedKunder.length * KUNDE_FOLDERS.length + totalAnlegg * ANLEGG_FOLDERS.length
                    return `${selectedKunder.length} kunder, ${totalAnlegg} anlegg, ${totalFolders} mapper totalt`
                  })()}
                </div>
                <button
                  onClick={handleCreateMultipleKundeStructures}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 w-full justify-center"
                >
                  <FolderPlus className="w-5 h-5" />
                  Opprett mapper for {selectedKunder.length} kunder
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Velg anlegg */}
      {selectedKunde && anlegg.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">2. Velg anlegg</h2>
            <div className="flex gap-2">
              <button onClick={selectAllAnlegg} className="text-sm text-primary hover:underline">
                Velg alle
              </button>
              <span className="text-gray-500">|</span>
              <button onClick={deselectAllAnlegg} className="text-sm text-primary hover:underline">
                Fjern alle
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {anlegg.map(a => (
              <label key={a.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAnlegg.includes(a.id)}
                  onChange={() => toggleAnlegg(a.id)}
                  className="w-4 h-4 rounded"
                  disabled={loading}
                />
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {a.dropbox_synced && (
                    <Cloud className="w-2.5 h-2.5 text-blue-500 absolute -top-1 -right-1" />
                  )}
                </div>
                <span className="text-white">{a.anleggsnavn}</span>
                {a.dropbox_synced && (
                  <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Synkronisert</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      toggleDropboxSynced(a.id, !!a.dropbox_synced)
                    }}
                    disabled={loading}
                    className={`text-xs px-2 py-1 rounded ${
                      a.dropbox_synced 
                        ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' 
                        : 'text-blue-400 hover:bg-blue-500/10'
                    }`}
                    title={a.dropbox_synced ? 'Fjern Dropbox-markering' : 'Marker som synkronisert'}
                  >
                    {a.dropbox_synced ? 'Fjern sync' : 'Marker sync'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleCreateAnleggStructure(a.id)
                    }}
                    disabled={loading}
                    className="text-xs text-primary hover:underline"
                  >
                    Opprett mapper
                  </button>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
            <button
              onClick={handleCreateFullStructure}
              disabled={loading || selectedAnlegg.length === 0}
              className="btn-primary flex items-center gap-2 w-full justify-center"
            >
              <FolderPlus className="w-5 h-5" />
              Opprett full struktur ({selectedAnlegg.length} anlegg)
            </button>
            <button
              onClick={markSelectedAsSynced}
              disabled={loading || selectedAnlegg.length === 0}
              className="btn-secondary flex items-center gap-2 w-full justify-center text-blue-400 hover:text-blue-300"
            >
              <Cloud className="w-5 h-5" />
              Marker {selectedAnlegg.length} anlegg som synkronisert
            </button>
          </div>
        </div>
      )}

      {selectedKunde && anlegg.length === 0 && (
        <div className="card">
          <div className="flex items-center gap-3 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span>Ingen anlegg funnet for denne kunden</span>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-white">{progress.message}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {progress.current} av {progress.total}
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card ${result.success ? 'border-green-500/50' : 'border-red-500/50'}`}>
          <div className="flex items-center gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <span className="text-white">{result.message}</span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card bg-blue-500/10 border-blue-500/20">
        <h3 className="font-semibold text-white mb-2">Mappestruktur som opprettes:</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Kunde-mapper ({KUNDE_FOLDERS.length}):</p>
            <ul className="text-gray-300 space-y-0.5">
              <li>• 01_Avtaler (med undermapper)</li>
              <li>• 02_Bygg</li>
              <li>• 03_FDV</li>
              <li>• 04_Faktura</li>
              <li>• 99_Korrespondanse</li>
            </ul>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Anlegg-mapper ({ANLEGG_FOLDERS.length}):</p>
            <ul className="text-gray-300 space-y-0.5">
              <li>• 01_Tegninger (med undermapper)</li>
              <li>• 02_Brannalarm (med undermapper)</li>
              <li>• 03_Nødlys, 04_Brannslukkeutstyr...</li>
              <li>• 07_Rapporter (Servicerapport, Kontrollrapport)</li>
              <li>• 99_Foto</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
