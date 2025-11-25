import { useState } from 'react'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { InspectionNotes } from './InspectionNotes'

interface FloatingNotesButtonProps {
  kontrollId: string
  anleggId: string
}

export function FloatingNotesButton({ kontrollId, anleggId }: FloatingNotesButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <>
      {/* Floating Button - Full size */}
      {!isOpen && !isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <button
            onClick={() => setIsOpen(true)}
            className="p-4 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
            title="Åpne kontrollnotater"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute -top-2 -left-2 w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Skjul knapp"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Minimized Button - Small tab on the side */}
      {!isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-0 z-50 p-2 bg-primary hover:bg-primary/90 text-white rounded-l-lg shadow-lg transition-all"
          title="Vis notater-knapp"
        >
          <MessageSquare className="w-5 h-5" />
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
