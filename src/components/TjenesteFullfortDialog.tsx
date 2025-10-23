import { CheckCircle } from 'lucide-react'

interface TjenesteFullfortDialogProps {
  tjeneste: 'Brannalarm' | 'Nødlys' | 'Røykluker' | 'Slukkeutstyr'
  onConfirm: () => void
  onCancel: () => void
  isOpen: boolean
}

export function TjenesteFullfortDialog({ 
  tjeneste, 
  onConfirm, 
  onCancel, 
  isOpen 
}: TjenesteFullfortDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-200 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Sett {tjeneste} til Utført?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Rapporten er klar til å lagres. Vil du markere {tjeneste.toLowerCase()}-kontrollen som utført?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Du kan alltid endre statusen manuelt senere.
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
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Ja, sett til Utført
          </button>
        </div>
      </div>
    </div>
  )
}
