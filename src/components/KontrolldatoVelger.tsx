import { Calendar } from 'lucide-react'

interface KontrolldatoVelgerProps {
  kontrolldato: Date
  onDatoChange: (dato: Date) => void
  label?: string
}

export function KontrolldatoVelger({ 
  kontrolldato, 
  onDatoChange, 
  label = 'Kontrolldato' 
}: KontrolldatoVelgerProps) {

  const formatDato = (dato: Date) => {
    return dato.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleDatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nyDato = new Date(e.target.value)
    if (!isNaN(nyDato.getTime())) {
      onDatoChange(nyDato)
    }
  }

  const settTilIdag = () => {
    onDatoChange(new Date())
  }

  const formatForInput = (dato: Date) => {
    return dato.toISOString().split('T')[0]
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={formatForInput(kontrolldato)}
            onChange={handleDatoChange}
            max={formatForInput(new Date())}
            className="input pl-10 pr-3"
          />
        </div>
        <button
          type="button"
          onClick={settTilIdag}
          className="btn-secondary btn-sm whitespace-nowrap"
          title="Sett til dagens dato"
        >
          I dag
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Valgt dato: {formatDato(kontrolldato)}
      </p>
    </div>
  )
}
