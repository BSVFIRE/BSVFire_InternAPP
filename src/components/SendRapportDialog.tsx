import { Mail } from 'lucide-react'

interface SendRapportDialogProps {
  onConfirm: () => void
  onCancel: () => void
  isOpen: boolean
}

export function SendRapportDialog({ 
  onConfirm, 
  onCancel, 
  isOpen 
}: SendRapportDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-200 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Send rapporter
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Send rapporter via e-post
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Velg dokumenter og mottakere
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-dark-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            Nei, ikke nå
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Ja, naviger til Send rapporter
          </button>
        </div>
      </div>
    </div>
  )
}
