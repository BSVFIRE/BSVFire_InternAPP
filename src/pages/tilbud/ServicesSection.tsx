import { CheckSquare, Square } from 'lucide-react'

interface ServicesSectionProps {
  formData: any
  setFormData: (data: any) => void
}

export function ServicesSection({ formData, setFormData }: ServicesSectionProps) {
  const services = [
    {
      key: 'tjeneste_brannalarm',
      label: 'Brannalarm',
      color: 'red'
    },
    {
      key: 'tjeneste_nodlys',
      label: 'Nødlys',
      color: 'yellow'
    },
    {
      key: 'tjeneste_slukkeutstyr',
      label: 'Slukkeuttsyr',
      color: 'blue'
    },
    {
      key: 'tjeneste_rokluker',
      label: 'Røkluker',
      color: 'purple'
    },
    {
      key: 'tjeneste_eksternt',
      label: 'Eksternt',
      color: 'green'
    }
  ]

  const eksternTyper = [
    'Sprinkler',
    'Elektro',
    'Ventilasjon',
    'Rør',
    'Gass anlegg',
    'Slukke anlegg',
    'Annet'
  ]

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Velg hvilke tjenester som skal inkluderes i tilbudet
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((service) => {
          const isSelected = formData[service.key]
          const colorClasses = {
            red: {
              selected: 'bg-red-500/10 border-red-500 ring-2 ring-red-500/20',
              text: 'text-red-600 dark:text-red-400',
              hover: 'hover:border-red-500/40'
            },
            yellow: {
              selected: 'bg-yellow-500/10 border-yellow-500 ring-2 ring-yellow-500/20',
              text: 'text-yellow-600 dark:text-yellow-400',
              hover: 'hover:border-yellow-500/40'
            },
            blue: {
              selected: 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20',
              text: 'text-blue-600 dark:text-blue-400',
              hover: 'hover:border-blue-500/40'
            },
            purple: {
              selected: 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20',
              text: 'text-purple-600 dark:text-purple-400',
              hover: 'hover:border-purple-500/40'
            },
            green: {
              selected: 'bg-green-500/10 border-green-500 ring-2 ring-green-500/20',
              text: 'text-green-600 dark:text-green-400',
              hover: 'hover:border-green-500/40'
            }
          }

          const colors = colorClasses[service.color as keyof typeof colorClasses]

          return (
            <button
              key={service.key}
              type="button"
              onClick={() => setFormData({ ...formData, [service.key]: !formData[service.key] })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? colors.selected
                  : `bg-gray-500/5 border-gray-500/20 ${colors.hover}`
              }`}
            >
              <div className="flex items-center gap-3">
                {isSelected ? (
                  <CheckSquare className={`w-5 h-5 ${colors.text}`} />
                ) : (
                  <Square className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
                <span className={`font-medium ${isSelected ? colors.text : 'text-gray-900 dark:text-white'}`}>
                  {service.label}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Ekstern type selection - shown when Eksternt is selected */}
      {formData.tjeneste_eksternt && (
        <div className="mt-4 p-4 bg-green-500/5 border-2 border-green-500/20 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type ekstern tjeneste <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.ekstern_type || ''}
            onChange={(e) => setFormData({ ...formData, ekstern_type: e.target.value })}
            className="input"
            required={formData.tjeneste_eksternt}
          >
            <option value="">Velg type ekstern tjeneste</option>
            {eksternTyper.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          
          {/* Show text input if "Annet" is selected */}
          {formData.ekstern_type === 'Annet' && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Spesifiser type
              </label>
              <input
                type="text"
                value={formData.ekstern_type_annet || ''}
                onChange={(e) => setFormData({ ...formData, ekstern_type_annet: e.target.value })}
                className="input"
                placeholder="Beskriv type ekstern tjeneste..."
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}
