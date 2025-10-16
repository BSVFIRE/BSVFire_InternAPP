import { useState } from 'react'
import { ArrowLeft, FileText, ClipboardCheck } from 'lucide-react'
import { KontrollOversiktView } from './KontrollOversiktView'
import { NS3960KontrollView } from './kontroll/NS3960KontrollView'
import { NS3960RapportView } from './kontroll/NS3960RapportView'
import { FG790KontrollView } from './kontroll/FG790KontrollView'
import { FG790RapportView } from './kontroll/FG790RapportView'

interface NyKontrollViewProps {
  anleggId: string
  anleggsNavn: string
  kundeNavn?: string
  onBack: () => void
}

type ViewState = 'oversikt' | 'valg' | 'fg790' | 'ns3960' | 'rapport' | 'fg790rapport'

export function NyKontrollView({ anleggId, anleggsNavn, kundeNavn, onBack }: NyKontrollViewProps) {
  const [viewState, setViewState] = useState<ViewState>('oversikt')
  const [selectedType, setSelectedType] = useState<'FG790' | 'NS3960' | null>(null)
  const [selectedKontrollId, setSelectedKontrollId] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleStart() {
    if (!selectedType) {
      alert('Velg kontrolltype først')
      return
    }

    if (selectedType === 'FG790') {
      setViewState('fg790')
    } else {
      setViewState('ns3960')
    }
  }

  function handleOpenKontroll(kontrollId: string, type: 'FG790' | 'NS3960') {
    setSelectedKontrollId(kontrollId)
    setSelectedType(type) // Sett selectedType slik at rapport-visning fungerer
    if (type === 'FG790') {
      setViewState('fg790')
    } else {
      setViewState('ns3960')
    }
  }

  function handleBackToOversikt() {
    setViewState('oversikt')
    setSelectedKontrollId(undefined)
    setRefreshKey(prev => prev + 1) // Force refresh
  }

  function handleShowRapport(kontrollId: string) {
    setSelectedKontrollId(kontrollId)
    // Sjekk kontrolltype basert på selectedType eller hent fra database
    if (selectedType === 'FG790') {
      setViewState('fg790rapport')
    } else {
      setViewState('rapport')
    }
  }

  // Show overview first
  if (viewState === 'oversikt') {
    return (
      <KontrollOversiktView
        key={refreshKey}
        anleggId={anleggId}
        anleggsNavn={anleggsNavn}
        onBack={onBack}
        onStartNy={() => setViewState('valg')}
        onOpenKontroll={handleOpenKontroll}
      />
    )
  }

  // Show NS3960 kontroll
  if (viewState === 'ns3960') {
    return (
      <NS3960KontrollView
        anleggId={anleggId}
        anleggsNavn={anleggsNavn}
        kontrollId={selectedKontrollId}
        onBack={handleBackToOversikt}
        onShowRapport={handleShowRapport}
      />
    )
  }

  // Show NS3960 rapport
  if (viewState === 'rapport' && selectedKontrollId) {
    return (
      <NS3960RapportView
        kontrollId={selectedKontrollId}
        anleggId={anleggId}
        kundeNavn={kundeNavn}
        onBack={handleBackToOversikt}
      />
    )
  }

  // Show FG790 rapport
  if (viewState === 'fg790rapport' && selectedKontrollId) {
    return (
      <FG790RapportView
        kontrollId={selectedKontrollId}
        anleggId={anleggId}
        kundeNavn={kundeNavn}
        onBack={handleBackToOversikt}
      />
    )
  }

  // Show FG790 kontroll
  if (viewState === 'fg790') {
    return (
      <FG790KontrollView
        anleggId={anleggId}
        anleggsNavn={anleggsNavn}
        kontrollId={selectedKontrollId}
        onBack={handleBackToOversikt}
        onShowRapport={handleShowRapport}
      />
    )
  }

  // Show valg (selection screen)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => setViewState('oversikt')} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Velg kontrolltype</h1>
          <p className="text-gray-400 mt-1">{anleggsNavn}</p>
        </div>
      </div>

      {/* Info */}
      <div className="card bg-blue-500/10 border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Velg kontrolltype</h3>
            <p className="text-sm text-gray-400">
              Velg hvilken type kontroll du skal utføre. FG790 er standard kontroll med 3 posisjoner (Dokumentasjon, Visuell kontroll, Funksjonstest). 
              NS3960 er en forenklet kontroll med fokus på prosedyre, visuelle kontroller og dokumentasjon.
            </p>
          </div>
        </div>
      </div>

      {/* Control Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FG790 */}
        <button
          onClick={() => setSelectedType('FG790')}
          className={`card text-left transition-all ${
            selectedType === 'FG790'
              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
              : 'hover:border-gray-700'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedType === 'FG790' ? 'bg-primary/20' : 'bg-gray-800'
            }`}>
              <FileText className={`w-8 h-8 ${selectedType === 'FG790' ? 'text-primary' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-xl font-bold ${selectedType === 'FG790' ? 'text-primary' : 'text-white'}`}>
                  FG790 Kontroll
                </h3>
                {selectedType === 'FG790' && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <ClipboardCheck className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">Standard brannalarmkontroll</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-gray-300">POS.1 - Dokumentasjon (8 punkter)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-gray-300">POS.2 - Visuell kontroll (24 punkter)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-gray-300">POS.3 - Funksjonstest (15 punkter)</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Inkluderer:</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">AG-verdier</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">Feilkoder</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">Avviktyper</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">Kommentarer</span>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* NS3960 */}
        <button
          onClick={() => setSelectedType('NS3960')}
          className={`card text-left transition-all ${
            selectedType === 'NS3960'
              ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
              : 'hover:border-gray-700'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedType === 'NS3960' ? 'bg-green-500/20' : 'bg-gray-800'
            }`}>
              <ClipboardCheck className={`w-8 h-8 ${selectedType === 'NS3960' ? 'text-green-400' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-xl font-bold ${selectedType === 'NS3960' ? 'text-green-400' : 'text-white'}`}>
                  NS3960 Kontroll
                </h3>
                {selectedType === 'NS3960' && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <ClipboardCheck className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">Forenklet kontroll etter NS3960</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-gray-300">Kontroll prosedyre (13 punkter)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-gray-300">Visuelle kontroller (5 punkter)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-gray-300">Dokumentasjon og opplæring (4 punkter)</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Inkluderer:</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">Status</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">Avvik</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">Kommentarer</span>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button onClick={() => setViewState('oversikt')} className="btn-secondary">
          Tilbake
        </button>
        <button
          onClick={handleStart}
          disabled={!selectedType}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start kontroll
        </button>
      </div>
    </div>
  )
}
