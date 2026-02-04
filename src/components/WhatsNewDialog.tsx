import { useState, useEffect } from 'react'
import { X, Sparkles, CheckCircle, Wrench, Bug, Info } from 'lucide-react'
import { changelog, CURRENT_VERSION, getChangesSinceVersion, ChangelogEntry } from '@/lib/changelog'

const STORAGE_KEY = 'bsvfire_last_seen_version'

interface WhatsNewDialogProps {
  forceShow?: boolean
  onClose?: () => void
}

export function WhatsNewDialog({ forceShow = false, onClose }: WhatsNewDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newChanges, setNewChanges] = useState<ChangelogEntry[]>([])

  useEffect(() => {
    if (forceShow) {
      setNewChanges(changelog)
      setIsOpen(true)
      return
    }

    const lastSeenVersion = localStorage.getItem(STORAGE_KEY)
    
    if (!lastSeenVersion) {
      // Første gang - vis alle endringer
      setNewChanges(changelog.slice(0, 1)) // Bare siste versjon
      setIsOpen(true)
    } else if (lastSeenVersion !== CURRENT_VERSION) {
      // Ny versjon siden sist
      const changes = getChangesSinceVersion(lastSeenVersion)
      if (changes.length > 0) {
        setNewChanges(changes)
        setIsOpen(true)
      }
    }
  }, [forceShow])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
    setIsOpen(false)
    onClose?.()
  }

  function getIcon(type: 'feature' | 'improvement' | 'fix' | 'info') {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
      case 'improvement':
        return <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0" />
      case 'fix':
        return <Bug className="w-4 h-4 text-orange-400 flex-shrink-0" />
      case 'info':
        return <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
    }
  }

  function getTypeLabel(type: 'feature' | 'improvement' | 'fix' | 'info') {
    switch (type) {
      case 'feature':
        return 'Ny funksjon'
      case 'improvement':
        return 'Forbedring'
      case 'fix':
        return 'Feilretting'
      case 'info':
        return 'Info'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Hva er nytt?</h2>
              <p className="text-white/80 text-sm">Siste oppdateringer i BSV Fire</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {newChanges.map((entry, entryIndex) => (
            <div key={entry.version} className={entryIndex > 0 ? 'mt-6 pt-6 border-t border-gray-200 dark:border-gray-700' : ''}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {entry.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-100 px-2 py-1 rounded">
                  v{entry.version} • {new Date(entry.date).toLocaleDateString('nb-NO')}
                </span>
              </div>
              
              <ul className="space-y-3">
                {entry.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {getIcon(change.type)}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {getTypeLabel(change.type)}
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        {change.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-100">
          <button
            onClick={handleClose}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Forstått, la oss gå!
          </button>
        </div>
      </div>
    </div>
  )
}
