import { BookOpen, FileText, Download, Upload } from 'lucide-react'

export function Dokumentasjon() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dokumentasjon</h1>
        <p className="text-gray-400">Administrer dokumenter og filer</p>
      </div>

      {/* Placeholder content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Rapporter</h3>
              <p className="text-sm text-gray-400">Genererte rapporter</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Kommer snart...</p>
        </div>

        <div className="card hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Last opp</h3>
              <p className="text-sm text-gray-400">Last opp dokumenter</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Kommer snart...</p>
        </div>

        <div className="card hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Nedlastinger</h3>
              <p className="text-sm text-gray-400">Tidligere nedlastinger</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Kommer snart...</p>
        </div>
      </div>

      {/* Info box */}
      <div className="card bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-white font-medium mb-1">Dokumentasjon under utvikling</h3>
            <p className="text-gray-400 text-sm">
              Denne seksjonen vil inneholde funksjonalitet for å administrere, laste opp og laste ned dokumenter.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
