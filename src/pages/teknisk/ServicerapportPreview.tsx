import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { generateServicerapportPDF } from './ServicerapportPDF'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  created_at: string
  updated_at: string
}

interface ServicerapportPreviewProps {
  rapport: Servicerapport
  onBack: () => void
}

export function ServicerapportPreview({ rapport, onBack }: ServicerapportPreviewProps) {
  const [generating, setGenerating] = useState(false)

  async function handleGeneratePDF() {
    setGenerating(true)
    try {
      const result = await generateServicerapportPDF(rapport, true) // true = lagre til storage
      if (result.success) {
        alert('✅ Servicerapport generert og lagret til anleggsdokumenter!')
      }
    } catch (error) {
      console.error('Feil ved generering av PDF:', error)
      alert('Kunne ikke generere PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Forhåndsvisning</h1>
            <p className="text-gray-400">Servicerapport</p>
          </div>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          {generating ? 'Genererer...' : 'Generer PDF'}
        </button>
      </div>

      {/* Preview Content */}
      <div className="card max-w-4xl mx-auto bg-white text-black p-8 shadow-2xl">
        {/* Header Section */}
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{rapport.header}</h1>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-gray-700">Anlegg:</span>
              <p className="text-gray-900">{rapport.anlegg_navn || 'Ikke tilknyttet anlegg'}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Dato:</span>
              <p className="text-gray-900">{new Date(rapport.rapport_dato).toLocaleDateString('nb-NO')}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Tekniker:</span>
              <p className="text-gray-900">{rapport.tekniker_navn}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Rapport ID:</span>
              <p className="text-gray-900 text-sm font-mono">{rapport.id.substring(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
            {rapport.rapport_innhold}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600">
            Generert: {new Date().toLocaleDateString('nb-NO')} {new Date().toLocaleTimeString('nb-NO')}
          </p>
        </div>
      </div>
    </div>
  )
}
