import { ArrowLeft, Construction } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

export function PlaceholderKontroll() {
  const navigate = useNavigate()
  const { type, anleggId } = useParams()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="card text-center">
          <Construction className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {type === 'fg790' ? 'FG790' : 'NS3960'} Kontroll
          </h1>
          <p className="text-gray-400 mb-6">
            Denne kontrollskjermen er under utvikling og vil snart være klar.
          </p>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-400 mb-2">Hva kommer:</h3>
            {type === 'fg790' ? (
              <ul className="text-sm text-gray-300 space-y-1 text-left">
                <li>• POS.1 - Dokumentasjon (8 kontrollpunkter)</li>
                <li>• POS.2 - Visuell kontroll (24 kontrollpunkter)</li>
                <li>• POS.3 - Funksjonstest (15 kontrollpunkter)</li>
                <li>• AG-verdier, feilkoder og avviktyper</li>
                <li>• Lagring som utkast</li>
                <li>• PDF-generering</li>
              </ul>
            ) : (
              <ul className="text-sm text-gray-300 space-y-1 text-left">
                <li>• Kontroll prosedyre (13 punkter)</li>
                <li>• Visuelle kontroller (5 punkter)</li>
                <li>• Dokumentasjon og opplæring (4 punkter)</li>
                <li>• Status og avvik-registrering</li>
                <li>• Lagring som utkast</li>
                <li>• PDF-generering</li>
              </ul>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Tilbake
            </button>
            <button
              onClick={() => navigate('/rapporter/brannalarm')}
              className="btn-primary"
            >
              Til Brannalarm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
