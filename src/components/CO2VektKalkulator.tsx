import { useState, useEffect } from 'react'
import { X, Calculator, CheckCircle, XCircle } from 'lucide-react'

interface CO2VektKalkulatorProps {
  isOpen: boolean
  onClose: () => void
  modell: string
  apparatNr?: string
}

export function CO2VektKalkulator({ isOpen, onClose, modell, apparatNr }: CO2VektKalkulatorProps) {
  const [tar, setTar] = useState<string>('')
  const [patron, setPatron] = useState<string>('')
  const [maaltVekt, setMaaltVekt] = useState<string>('')

  // Sett standard patron-vekt basert på modell
  useEffect(() => {
    if (modell.includes('2KG')) {
      setPatron('2')
    } else if (modell.includes('5KG')) {
      setPatron('5')
    } else if (modell.includes('10KG')) {
      setPatron('10')
    }
  }, [modell])

  if (!isOpen) return null

  const tarGram = parseFloat(tar) || 0
  const patronGram = parseFloat(patron) || 0
  const maaltGram = parseFloat(maaltVekt) || 0
  
  const totalVekt = tarGram + patronGram
  const maksAvvik = patronGram * 0.05 // 5% av patron
  const minVekt = totalVekt - maksAvvik
  
  const erGodkjent = maaltGram > 0 && maaltGram <= totalVekt && maaltGram >= minVekt
  const erForLav = maaltGram > 0 && maaltGram < minVekt
  const erForHoy = maaltGram > 0 && maaltGram > totalVekt

  const harAlleVerdier = tarGram > 0 && patronGram > 0 && maaltGram > 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CO2 Vektkalkulator</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {modell} {apparatNr ? `- Nr. ${apparatNr}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* TAR input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              TAR (Tara) - Vekt av tom flaske
            </label>
            <div className="relative">
              <input
                type="number"
                value={tar}
                onChange={(e) => setTar(e.target.value)}
                placeholder="F.eks. 7.5"
                className="input w-full pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Står på etikett/stempel på apparatet</p>
          </div>

          {/* Patron input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CO2-innhold
            </label>
            <div className="relative">
              <input
                type="number"
                value={patron}
                onChange={(e) => setPatron(e.target.value)}
                placeholder="F.eks. 5"
                className="input w-full pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Står på etikett/stempel på apparatet</p>
          </div>

          {/* Beregnet totalvekt */}
          {tarGram > 0 && patronGram > 0 && (
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Beregnet totalvekt:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{totalVekt.toLocaleString('nb-NO')} kg</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Maks avvik (5% av CO2):</span>
                <span className="font-medium text-orange-500">{maksAvvik.toLocaleString('nb-NO')} kg</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Godkjent område:</span>
                <span className="font-medium text-green-500">{minVekt.toLocaleString('nb-NO')} - {totalVekt.toLocaleString('nb-NO')} kg</span>
              </div>
            </div>
          )}

          {/* Målt vekt input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Målt vekt - Faktisk vekt på vekten
            </label>
            <div className="relative">
              <input
                type="number"
                value={maaltVekt}
                onChange={(e) => setMaaltVekt(e.target.value)}
                placeholder="F.eks. 12.3"
                className="input w-full pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
            </div>
          </div>

          {/* Resultat */}
          {harAlleVerdier && (
            <div className={`rounded-lg p-4 ${
              erGodkjent 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-3">
                {erGodkjent ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">GODKJENT</p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Vekten er innenfor godkjent område
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">IKKE GODKJENT</p>
                      <p className="text-sm text-red-600 dark:text-red-500">
                        {erForLav && `Vekten er ${(minVekt - maaltGram).toLocaleString('nb-NO')} kg for lav`}
                        {erForHoy && `Vekten er ${(maaltGram - totalVekt).toLocaleString('nb-NO')} kg for høy`}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Detaljert beregning */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm">
                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                  <span>Differanse fra total:</span>
                  <span className={`font-medium ${maaltGram <= totalVekt ? 'text-green-600' : 'text-red-600'}`}>
                    {maaltGram <= totalVekt ? '-' : '+'}{Math.abs(totalVekt - maaltGram).toLocaleString('nb-NO')} kg
                  </span>
                  <span>Prosent av CO2:</span>
                  <span className={`font-medium ${((totalVekt - maaltGram) / patronGram * 100) <= 5 ? 'text-green-600' : 'text-red-600'}`}>
                    {((totalVekt - maaltGram) / patronGram * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  )
}
