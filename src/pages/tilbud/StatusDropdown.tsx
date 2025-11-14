import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

// Dropdown for rask statusendring i tilbudslisten
interface StatusDropdownProps {
  currentStatus: 'utkast' | 'sendt' | 'godkjent' | 'avvist'
  onStatusChange: (newStatus: 'utkast' | 'sendt' | 'godkjent' | 'avvist') => Promise<void>
}

export function StatusDropdown({ currentStatus, onStatusChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const statusOptions = [
    { value: 'utkast', label: 'Utkast', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    { value: 'sendt', label: 'Sendt', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { value: 'godkjent', label: 'Godkjent', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    { value: 'avvist', label: 'Avvist', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  ] as const

  const currentConfig = statusOptions.find(opt => opt.value === currentStatus) || statusOptions[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleStatusChange = async (newStatus: 'utkast' | 'sendt' | 'godkjent' | 'avvist') => {
    if (newStatus === currentStatus) {
      setIsOpen(false)
      return
    }

    setIsUpdating(true)
    try {
      await onStatusChange(newStatus)
      setIsOpen(false)
    } catch (error) {
      console.error('Feil ved oppdatering av status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        disabled={isUpdating}
        className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-all ${currentConfig.className} hover:opacity-80 disabled:opacity-50`}
      >
        {isUpdating ? (
          <>
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Oppdaterer...
          </>
        ) : (
          <>
            {currentConfig.label}
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>

      {isOpen && !isUpdating && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation()
                handleStatusChange(option.value)
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                option.value === currentStatus
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100'
              }`}
            >
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${option.className}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
