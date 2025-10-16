import { X, WifiOff, Wifi, RefreshCw } from 'lucide-react'

interface OfflineInfoDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function OfflineInfoDialog({ isOpen, onClose }: OfflineInfoDialogProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Offline-modus</h2>
            <p className="text-sm text-gray-400">Jobb uten internett - synkroniser når du får tilgang</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Statusindikatorer */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Statusindikatorer</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs flex-shrink-0">
                  <WifiOff className="w-4 h-4" />
                  Offline
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <strong className="text-orange-400">Ingen internettilkobling.</strong> Alle endringer lagres lokalt på enheten din og synkroniseres automatisk når du får nett igjen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs flex-shrink-0">
                  <RefreshCw className="w-4 h-4" />
                  Synkroniserer...
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <strong className="text-blue-400">Laster opp endringer.</strong> Alle lokale endringer synkroniseres nå til databasen. Vent til dette er ferdig.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs flex-shrink-0">
                  <Wifi className="w-4 h-4" />
                  Lagret 14:30
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <strong className="text-green-400">Alt er synkronisert.</strong> Alle endringer er lagret i databasen. Tidspunktet viser når siste lagring skjedde.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hvordan det fungerer */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Hvordan det fungerer</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-white mb-1">1. Start med internett</h4>
                <p className="text-sm text-gray-400">
                  Åpne kontrollen mens du har internettilkobling. Systemet laster ned nødvendig data.
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-white mb-1">2. Jobb offline</h4>
                <p className="text-sm text-gray-400">
                  Mister du tilkoblingen, vises oransje "Offline" merke. Du kan fortsette å jobbe helt normalt - alle endringer lagres lokalt.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-white mb-1">3. Automatisk synkronisering</h4>
                <p className="text-sm text-gray-400">
                  Når du får internett igjen, vises blått "Synkroniserer..." merke. Alle endringer lastes automatisk opp - du trenger ikke gjøre noe.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-white mb-1">4. Ferdig synkronisert</h4>
                <p className="text-sm text-gray-400">
                  Grønn "Lagret" melding bekrefter at alt er synkronisert. Du kan trygt lukke appen eller fortsette å jobbe.
                </p>
              </div>
            </div>
          </div>

          {/* Praktiske eksempler */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Praktiske eksempler</h3>
            <div className="space-y-3">
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">🏢 Kontroll i kjeller uten dekning</h4>
                <p className="text-sm text-gray-400">
                  Start kontrollen i bilen med internett. Gå ned i kjelleren uten mobildekning. Utfør kontrollen som normalt. Når du kommer opp igjen, synkroniseres alt automatisk.
                </p>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">📱 Ustabil mobildekning</h4>
                <p className="text-sm text-gray-400">
                  Jobber du i et område med dårlig dekning, håndterer systemet dette automatisk. Endringer lagres lokalt når offline og synkroniseres når online.
                </p>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">🔋 Spare batteri</h4>
                <p className="text-sm text-gray-400">
                  Åpne kontrollen med internett, la siden laste ferdig, slå av mobildata for å spare batteri. Jobb offline så lenge du vil. Slå på internett når ferdig.
                </p>
              </div>
            </div>
          </div>

          {/* Viktige merknader */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ Viktig å vite</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span><strong>Ikke tøm nettleserens data</strong> mens du har usynkroniserte endringer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span><strong>Bruk kun én enhet</strong> om gangen for samme kontroll</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span><strong>Vent på synkronisering</strong> før du lukker appen eller bytter enhet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span><strong>Sjekk statusindikatoren</strong> for å vite om du er online eller offline</span>
              </li>
            </ul>
          </div>

          {/* Hva fungerer offline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h4 className="font-semibold text-green-400 mb-2">✅ Fungerer offline</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Åpne eksisterende kontroller</li>
                <li>• Fylle ut kontrollpunkter</li>
                <li>• Legge til kommentarer</li>
                <li>• Registrere avvik</li>
                <li>• Lagre endringer lokalt</li>
              </ul>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="font-semibold text-red-400 mb-2">❌ Krever internett</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Opprette ny kontroll</li>
                <li>• Laste ned data første gang</li>
                <li>• Generere PDF-rapport</li>
                <li>• Se andres endringer</li>
                <li>• Laste opp bilder</li>
              </ul>
            </div>
          </div>

          {/* Feilsøking */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">🔧 Feilsøking</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white text-sm mb-1">Endringer synkroniseres ikke?</h4>
                <p className="text-sm text-gray-400">
                  Vent litt - synkronisering kan ta noen sekunder. Sjekk at du har stabil internettilkobling. Last inn siden på nytt hvis problemet vedvarer.
                </p>
              </div>

              <div className="p-3 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white text-sm mb-1">"Offline" vises selv om jeg har internett?</h4>
                <p className="text-sm text-gray-400">
                  Sjekk at enheten faktisk har internettilkobling. Prøv å laste inn en annen nettside. Last inn siden på nytt (F5).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  )
}
