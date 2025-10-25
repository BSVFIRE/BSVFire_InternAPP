import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { InspectionNotes } from './InspectionNotes'

interface FloatingNotesButtonProps {
  kontrollId: string
  anleggId: string
}

export function FloatingNotesButton({ kontrollId, anleggId }: FloatingNotesButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
          title="Åpne kontrollnotater"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Notes Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md h-[600px] shadow-2xl">
            <InspectionNotes
              kontrollId={kontrollId}
              anleggId={anleggId}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
