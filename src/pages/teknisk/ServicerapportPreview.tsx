import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { generateServicerapportPDF } from './ServicerapportPDF'
import { BSV_LOGO } from '@/assets/logoBase64'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  ordre_id?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  opprettet_dato?: string
  sist_oppdatert?: string
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
      <div className="card max-w-4xl mx-auto !bg-white text-black p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-6">
          <img src={BSV_LOGO} alt="BSV Logo" className="w-48 h-auto mb-4" />
          <h1 className="text-3xl font-bold text-blue-600 uppercase mb-2">SERVICERAPPORT</h1>
        </div>
        
        {/* Header Section */}
        <div className="border-b-2 border-blue-600 pb-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{rapport.header}</h2>
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
          <p className="text-sm font-bold text-blue-600 mb-2">Brannteknisk Service og Vedlikehold AS</p>
          <p className="text-xs text-gray-600">
            Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600
          </p>
          <p className="text-xs text-gray-600">
            Adresse: Sælenveien 44, 5151 Straumsgrend
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Generert: {new Date().toLocaleDateString('nb-NO')} {new Date().toLocaleTimeString('nb-NO')}
          </p>
        </div>
      </div>
    </div>
  )
}
