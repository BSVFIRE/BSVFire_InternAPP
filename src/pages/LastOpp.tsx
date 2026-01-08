import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Upload, Building2, FileText, ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, Cloud, Folder } from 'lucide-react'
import { listAnleggDropboxFiles } from '@/services/dropboxServiceV2'

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
  dropbox_synced?: boolean | null
  kunde_nummer?: string | null
}

interface DropboxFolder {
  name: string
  path: string
}

interface UploadResult {
  filename: string
  success: boolean
  error?: string
}

const DOKUMENT_TYPER = [
  'Detektorliste',
  'Serviceavtale',
  'Prosjekteringsunderlag',
  'Brannkonsept',
  'Tegning',
  'Annet'
] as const

export function LastOpp() {
  const navigate = useNavigate()
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  
  const [selectedKunde, setSelectedKunde] = useState('')
  const [selectedAnlegg, setSelectedAnlegg] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dokumentType, setDokumentType] = useState<string>('Detektorliste')
  const [customFilename, setCustomFilename] = useState('')
  
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [showResults, setShowResults] = useState(false)
  
  // Dropbox state
  const [saveToDropbox, setSaveToDropbox] = useState(false)
  const [dropboxFolders, setDropboxFolders] = useState<DropboxFolder[]>([])
  const [selectedDropboxFolder, setSelectedDropboxFolder] = useState('')
  const [loadingDropboxFolders, setLoadingDropboxFolders] = useState(false)

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
    }
  }, [selectedKunde])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('anlegg')
        .select('*')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Last Dropbox-mapper når anlegg velges
  async function loadDropboxFolders(anleggObj: Anlegg) {
    if (!anleggObj.dropbox_synced || !anleggObj.kunde_nummer) {
      setDropboxFolders([])
      return
    }

    setLoadingDropboxFolders(true)
    try {
      const result = await listAnleggDropboxFiles(
        anleggObj.kunde_nummer,
        selectedKundeObj?.navn || '',
        anleggObj.anleggsnavn
      )

      if (result.success && result.entries) {
        // Filtrer kun mapper
        const folders = result.entries
          .filter((e: any) => e['.tag'] === 'folder')
          .map((f: any) => ({
            name: f.name,
            path: f.path_display
          }))
        setDropboxFolders(folders)
        
        // Sett default til første mappe hvis finnes
        if (folders.length > 0) {
          setSelectedDropboxFolder(folders[0].path)
        }
      }
    } catch (error) {
      console.error('Feil ved lasting av Dropbox-mapper:', error)
    } finally {
      setLoadingDropboxFolders(false)
    }
  }

  // Last Dropbox-mapper når anlegg endres
  useEffect(() => {
    if (selectedAnlegg) {
      const anleggObj = anlegg.find(a => a.id === selectedAnlegg)
      if (anleggObj) {
        loadDropboxFolders(anleggObj)
      }
    } else {
      setDropboxFolders([])
      setSaveToDropbox(false)
    }
  }, [selectedAnlegg])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    // Filter to only allow PDF files
    const pdfFiles = files.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length !== files.length) {
      alert('Kun PDF-filer er tillatt')
    }
    
    setSelectedFiles(pdfFiles)
  }

  function removeFile(index: number) {
    setSelectedFiles(files => files.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (!selectedAnlegg || selectedFiles.length === 0) {
      alert('Velg anlegg og minst én fil')
      return
    }

    if (dokumentType === 'Annet' && !customFilename.trim()) {
      alert('Vennligst skriv inn et filnavn for "Annet"')
      return
    }

    setLoading(true)
    setShowResults(false)
    const results: UploadResult[] = []

    try {
      for (const file of selectedFiles) {
        try {
          // Generate filename based on document type
          let baseFilename = dokumentType === 'Annet' ? customFilename.trim() : dokumentType
          const filename = `${baseFilename}.pdf`
          const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${filename}`

          console.log('📤 Laster opp fil:', filename, 'til', storagePath)

          const { error: uploadError } = await supabase.storage
            .from('anlegg.dokumenter')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('❌ Feil ved opplasting:', uploadError)
            results.push({
              filename: file.name,
              success: false,
              error: uploadError.message
            })
          } else {
            console.log('✅ Fil lastet opp:', filename)
            
            // Generate signed URL for the uploaded file
            const { data: urlData } = await supabase.storage
              .from('anlegg.dokumenter')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

            // Insert record into dokumenter table
            const { error: dbError } = await supabase
              .from('dokumenter')
              .insert({
                anlegg_id: selectedAnlegg,
                filnavn: filename,
                url: urlData?.signedUrl || null,
                type: dokumentType,
                opplastet_dato: new Date().toISOString(),
                storage_path: storagePath
              })

            if (dbError) {
              console.error('⚠️ Feil ved lagring til database:', dbError)
              // Still mark as success since file was uploaded to storage
            }

            // Last opp til Dropbox hvis valgt
            if (saveToDropbox && selectedDropboxFolder) {
              try {
                const { uploadToDropbox } = await import('@/services/dropboxServiceV2')
                const dropboxPath = `${selectedDropboxFolder}/${filename}`
                
                // uploadToDropbox tar Blob direkte
                await uploadToDropbox(dropboxPath, file)
                console.log('☁️ Fil lastet opp til Dropbox:', dropboxPath)
              } catch (dropboxError) {
                console.error('⚠️ Feil ved Dropbox-opplasting:', dropboxError)
                // Ikke marker som feil - Storage-opplasting var vellykket
              }
            }

            results.push({
              filename: file.name,
              success: true
            })
          }
        } catch (error) {
          console.error('💥 Feil ved opplasting av fil:', file.name, error)
          results.push({
            filename: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Ukjent feil'
          })
        }
      }

      setUploadResults(results)
      setShowResults(true)

      // Clear files if all uploads were successful
      if (results.every(r => r.success)) {
        setSelectedFiles([])
        setCustomFilename('')
      }
    } catch (error) {
      console.error('💥 Feil ved opplasting:', error)
      alert('En feil oppstod under opplasting')
    } finally {
      setLoading(false)
    }
  }

  const filteredKunder = kunder.filter(k =>
    k.navn.toLowerCase().includes(kundeSok.toLowerCase())
  )

  const filteredAnlegg = anlegg.filter(a =>
    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
  )

  const selectedKundeObj = kunder.find(k => k.id === selectedKunde)
  const selectedAnleggObj = anlegg.find(a => a.id === selectedAnlegg)

  const successCount = uploadResults.filter(r => r.success).length
  const failureCount = uploadResults.filter(r => !r.success).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/dokumentasjon')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til dokumentasjon
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Last opp dokumenter</h1>
          <p className="text-gray-400 dark:text-gray-400">Velg kunde og anlegg for å laste opp PDF-filer</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Selection */}
        <div className="space-y-6">
          {/* Kunde selector */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Velg kunde</h3>
                <p className="text-sm text-gray-400">Søk og velg kunde</p>
              </div>
            </div>

            <input
              type="text"
              placeholder="Søk etter kunde..."
              value={kundeSok}
              onChange={(e) => setKundeSok(e.target.value)}
              className="input mb-3"
            />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredKunder.map((kunde) => (
                <button
                  key={kunde.id}
                  onClick={() => setSelectedKunde(kunde.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedKunde === kunde.id
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-700'
                  }`}
                >
                  <div className="font-medium text-white">{kunde.navn}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Anlegg selector */}
          {selectedKunde && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Velg anlegg</h3>
                  <p className="text-sm text-gray-400">Søk og velg anlegg</p>
                </div>
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Søk etter anlegg..."
                    value={anleggSok}
                    onChange={(e) => setAnleggSok(e.target.value)}
                    className="input mb-3"
                  />

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredAnlegg.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAnlegg(a.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedAnlegg === a.id
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-700'
                        }`}
                      >
                        <div className="font-medium text-white">{a.anleggsnavn}</div>
                        {a.adresse && (
                          <div className="text-sm text-gray-400 mt-1">{a.adresse}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right column - File upload */}
        <div className="space-y-6">
          {/* Selected info */}
          {(selectedKundeObj || selectedAnleggObj) && (
            <div className="card bg-blue-500/5 border-blue-500/20">
              <h3 className="font-semibold text-white mb-3">Valgt:</h3>
              {selectedKundeObj && (
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>Kunde: {selectedKundeObj.navn}</span>
                </div>
              )}
              {selectedAnleggObj && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Building2 className="w-4 h-4" />
                  <span>Anlegg: {selectedAnleggObj.anleggsnavn}</span>
                </div>
              )}
            </div>
          )}

          {/* File upload */}
          {selectedAnlegg && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Last opp filer</h3>
                  <p className="text-sm text-gray-400">Kun PDF-filer</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Document type selector */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Dokumenttype
                  </label>
                  <select
                    value={dokumentType}
                    onChange={(e) => setDokumentType(e.target.value)}
                    className="input"
                  >
                    {DOKUMENT_TYPER.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom filename input for "Annet" */}
                {dokumentType === 'Annet' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Filnavn
                    </label>
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="Skriv inn filnavn..."
                      className="input"
                    />
                  </div>
                )}

                {/* Dropbox-valg */}
                {selectedAnleggObj?.dropbox_synced && selectedAnleggObj?.kunde_nummer && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveToDropbox}
                          onChange={(e) => setSaveToDropbox(e.target.checked)}
                          className="w-4 h-4 text-primary rounded border-gray-600"
                        />
                        <Cloud className="w-5 h-5 text-blue-500" />
                        <span className="text-white font-medium">Lagre også til Dropbox</span>
                      </label>
                    </div>
                    
                    {saveToDropbox && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Velg mappe i Dropbox
                        </label>
                        {loadingDropboxFolders ? (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Laster mapper...
                          </div>
                        ) : dropboxFolders.length > 0 ? (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {dropboxFolders.map((folder) => (
                              <button
                                key={folder.path}
                                type="button"
                                onClick={() => setSelectedDropboxFolder(folder.path)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                  selectedDropboxFolder === folder.path
                                    ? 'bg-primary/20 border border-primary text-white'
                                    : 'bg-gray-800/50 border border-transparent text-gray-300 hover:border-gray-600'
                                }`}
                              >
                                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                <span className="text-sm truncate">{folder.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Ingen mapper funnet i Dropbox</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <label className="block">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Klikk for å velge PDF-filer</span>
                    <span className="text-xs text-gray-500 mt-1">eller dra og slipp her</span>
                  </label>
                </label>

                {/* Selected files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white">Valgte filer ({selectedFiles.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm text-white truncate">{file.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload button */}
                <button
                  onClick={handleUpload}
                  disabled={loading || selectedFiles.length === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Laster opp...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Last opp {selectedFiles.length} fil{selectedFiles.length !== 1 ? 'er' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Upload results */}
          {showResults && uploadResults.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  failureCount === 0 ? 'bg-green-500/10' : 'bg-yellow-500/10'
                }`}>
                  {failureCount === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Opplastingsresultat</h3>
                  <p className="text-sm text-gray-400">
                    {successCount} vellykket{successCount !== 1 ? 'e' : ''}, {failureCount} feilet
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 px-3 py-2 rounded-lg ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{result.filename}</div>
                      {result.error && (
                        <div className="text-xs text-red-400 mt-1">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
