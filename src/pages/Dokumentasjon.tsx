import { BookOpen, FileText, Download, Upload, Mail, FileCheck, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dokumentasjon() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dokumentasjon</h1>
        <p className="text-gray-400 dark:text-gray-400">Administrer dokumenter og filer</p>
      </div>

      {/* Placeholder content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/rapport-oversikt')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rapporter</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Oversikt over dokumenter</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Se, last ned og slett dokumenter for et anlegg</p>
        </button>

        <button
          onClick={() => navigate('/send-rapporter')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send rapporter</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Send rapporter via e-post</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Velg dokumenter og mottakere</p>
        </button>

        <button
          onClick={() => navigate('/last-opp')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Last opp</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Last opp dokumenter</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Velg kunde og anlegg for å laste opp PDF-filer</p>
        </button>

        <button
          onClick={() => navigate('/nedlastinger')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nedlastinger</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Dokumenter og e-posthistorikk</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Se alle dokumenter og e-postutsendelser</p>
        </button>

        <button
          onClick={() => navigate('/tilbud-serviceavtale')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tilbud Serviceavtale</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Opprett serviceavtaletilbud</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Lag tilbud på serviceavtaler med kunde og tjenester</p>
        </button>

        <button
          onClick={() => navigate('/tilbud-alarmoverforing')}
          className="card hover:border-primary/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
              <Radio className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tilbud Alarmoverføring</h3>
              <p className="text-sm text-gray-400 dark:text-gray-400">Alarm 24/7 overføring</p>
            </div>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Opprett tilbud på alarmoverføring med mottakere og priser</p>
        </button>
      </div>

      {/* Info box */}
      <div className="card bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-gray-900 dark:text-white font-medium mb-1">Dokumentasjon under utvikling</h3>
            <p className="text-gray-400 dark:text-gray-400 text-sm">
              Denne seksjonen vil inneholde funksjonalitet for å administrere, laste opp og laste ned dokumenter.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
