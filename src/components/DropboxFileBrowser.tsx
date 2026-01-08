import { useState, useEffect } from 'react'
import { X, Folder, FileText, File, Download, Loader2, ExternalLink, ChevronRight, ChevronDown, RefreshCw, CheckSquare, Square } from 'lucide-react'
import { listAnleggDropboxFiles, getDropboxDownloadLink, DropboxEntry, buildAnleggDropboxPath } from '@/services/dropboxServiceV2'

interface DropboxFileBrowserProps {
  isOpen: boolean
  onClose: () => void
  kundeNummer: string
  kundeNavn: string
  anleggNavn: string
}

// Filtype-ikoner basert på extension
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />
    case 'dwg':
    case 'dxf':
      return <File className="w-5 h-5 text-blue-500" />
    case 'rvt':
    case 'rfa':
      return <File className="w-5 h-5 text-purple-500" />
    case 'doc':
    case 'docx':
      return <FileText className="w-5 h-5 text-blue-600" />
    case 'xls':
    case 'xlsx':
      return <FileText className="w-5 h-5 text-green-600" />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <File className="w-5 h-5 text-yellow-500" />
    default:
      return <File className="w-5 h-5 text-gray-400" />
  }
}

// Formater filstørrelse
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Formater dato
function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Bygg mappestruktur fra flat liste
interface FolderNode {
  name: string
  path: string
  children: Map<string, FolderNode>
  files: DropboxEntry[]
}

function buildFolderTree(entries: DropboxEntry[], basePath: string): FolderNode {
  const root: FolderNode = {
    name: 'Anlegg',
    path: basePath,
    children: new Map(),
    files: []
  }

  for (const entry of entries) {
    // Fjern basePath fra stien for å få relativ sti
    const relativePath = entry.path_display.replace(basePath, '').replace(/^\//, '')
    const parts = relativePath.split('/')
    
    if (entry['.tag'] === 'file') {
      // Finn riktig mappe og legg til filen
      let current = root
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: `${current.path}/${part}`,
            children: new Map(),
            files: []
          })
        }
        current = current.children.get(part)!
      }
      current.files.push(entry)
    } else if (entry['.tag'] === 'folder') {
      // Opprett mappe-noder
      let current = root
      for (const part of parts) {
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: `${current.path}/${part}`,
            children: new Map(),
            files: []
          })
        }
        current = current.children.get(part)!
      }
    }
  }

  return root
}

// Rekursiv mappe-komponent
function FolderItem({ node, level = 0, selectedFiles, onToggleFile }: { 
  node: FolderNode
  level?: number
  selectedFiles: Set<string>
  onToggleFile: (path: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels

  const hasContent = node.children.size > 0 || node.files.length > 0
  
  // Sjekk om alle filer i mappen er valgt
  const allFilesSelected = node.files.length > 0 && node.files.every(f => selectedFiles.has(f.path_display))
  const someFilesSelected = node.files.some(f => selectedFiles.has(f.path_display))

  function toggleAllInFolder() {
    if (allFilesSelected) {
      // Fjern alle
      node.files.forEach(f => {
        if (selectedFiles.has(f.path_display)) {
          onToggleFile(f.path_display)
        }
      })
    } else {
      // Velg alle
      node.files.forEach(f => {
        if (!selectedFiles.has(f.path_display)) {
          onToggleFile(f.path_display)
        }
      })
    }
  }

  return (
    <div className="select-none">
      {level > 0 && (
        <div className="flex items-center">
          {/* Checkbox for å velge alle filer i mappen */}
          {node.files.length > 0 && (
            <button
              onClick={toggleAllInFolder}
              className="p-1 ml-1"
              style={{ marginLeft: `${level * 16 - 8}px` }}
              title={allFilesSelected ? 'Fjern alle valgte' : 'Velg alle filer i mappen'}
            >
              {allFilesSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : someFilesSelected ? (
                <div className="w-4 h-4 border-2 border-primary rounded bg-primary/30" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors text-left"
          >
            {hasContent ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )
            ) : (
              <div className="w-4" />
            )}
            <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{node.name}</span>
            {node.files.length > 0 && (
              <span className="text-xs text-gray-400 ml-auto">({node.files.length})</span>
            )}
          </button>
        </div>
      )}

      {(isExpanded || level === 0) && (
        <div>
          {/* Undermapper */}
          {Array.from(node.children.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
            .map((child) => (
              <FolderItem 
                key={child.path} 
                node={child} 
                level={level + 1} 
                selectedFiles={selectedFiles}
                onToggleFile={onToggleFile}
              />
            ))}

          {/* Filer */}
          {node.files
            .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
            .map((file) => {
              const isSelected = selectedFiles.has(file.path_display)
              return (
                <div
                  key={file.path_display}
                  onClick={() => onToggleFile(file.path_display)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/10 hover:bg-primary/20' 
                      : 'hover:bg-gray-100 dark:hover:bg-dark-100'
                  }`}
                  style={{ paddingLeft: `${(level + 1) * 16 + 4}px` }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFile(file.path_display) }}
                    className="p-0.5"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {getFileIcon(file.name)}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="text-xs text-gray-400 hidden md:block">
                    {formatDate(file.server_modified)}
                  </span>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export function DropboxFileBrowser({ isOpen, onClose, kundeNummer, kundeNavn, anleggNavn }: DropboxFileBrowserProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null)
  const [totalFiles, setTotalFiles] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  function toggleFile(path: string) {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedFiles(new Set())
  }

  async function downloadSelectedFiles() {
    if (selectedFiles.size === 0) return
    
    setDownloading(true)
    let downloadedCount = 0
    
    for (const path of selectedFiles) {
      try {
        const result = await getDropboxDownloadLink(path)
        if (result.success && result.link) {
          // Åpne hver fil i ny fane med liten forsinkelse
          window.open(result.link, '_blank')
          downloadedCount++
          // Liten pause mellom nedlastinger for å unngå popup-blokkering
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.error('Feil ved nedlasting av fil:', path, error)
      }
    }
    
    setDownloading(false)
    
    if (downloadedCount > 0) {
      alert(`${downloadedCount} fil${downloadedCount !== 1 ? 'er' : ''} åpnet for nedlasting`)
      clearSelection()
    }
  }

  async function loadFiles() {
    setLoading(true)
    setError(null)
    
    try {
      const result = await listAnleggDropboxFiles(kundeNummer, kundeNavn, anleggNavn)
      
      if (!result.success) {
        setError(result.error || 'Kunne ikke laste filer')
        return
      }

      const entries = result.entries || []
      const files = entries.filter(e => e['.tag'] === 'file')
      setTotalFiles(files.length)

      const basePath = buildAnleggDropboxPath(kundeNummer, kundeNavn, anleggNavn)
      const tree = buildFolderTree(entries, basePath)
      setFolderTree(tree)
    } catch (err: any) {
      setError(err.message || 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadFiles()
    }
  }, [isOpen, kundeNummer, kundeNavn, anleggNavn])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dropbox-filer
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {anleggNavn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Oppdater"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Laster filer fra Dropbox...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Kunne ikke laste filer</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{error}</p>
            </div>
          ) : folderTree ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalFiles} fil{totalFiles !== 1 ? 'er' : ''} funnet
                  {selectedFiles.size > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      ({selectedFiles.size} valgt)
                    </span>
                  )}
                </p>
                {selectedFiles.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Fjern valg
                  </button>
                )}
              </div>
              <FolderItem 
                node={folderTree} 
                selectedFiles={selectedFiles}
                onToggleFile={toggleFile}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-gray-100 dark:bg-dark-100 rounded-full flex items-center justify-center mb-4">
                <Folder className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Ingen filer funnet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Det er ingen filer i Dropbox-mappen for dette anlegget ennå.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <a
            href={`https://www.dropbox.com/home${encodeURI(buildAnleggDropboxPath(kundeNummer, kundeNavn, anleggNavn))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Åpne i Dropbox
          </a>
          <div className="flex items-center gap-2">
            {selectedFiles.size > 0 && (
              <button
                onClick={downloadSelectedFiles}
                disabled={downloading}
                className="btn-primary flex items-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Last ned {selectedFiles.size} fil{selectedFiles.size !== 1 ? 'er' : ''}
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Lukk
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
