import { useState, useEffect } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import { generateTilbudPDF } from './TilbudPDF'

interface TilbudPreviewProps {
  tilbudData: any
  onClose: () => void
}

export function TilbudPreview({ tilbudData, onClose }: TilbudPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generatePreview()
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [])

  async function generatePreview() {
    try {
      setLoading(true)
      const doc = await generateTilbudPDF(tilbudData)
      const pdfBlob = doc.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
    } catch (error) {
      console.error('Error generating PDF preview:', error)
      alert('Kunne ikke generere forhåndsvisning')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    const doc = await generateTilbudPDF(tilbudData)
    const filename = `Tilbud_${tilbudData.kunde_navn.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Forhåndsvisning - Tilbud
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Last ned PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Genererer forhåndsvisning...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Kunne ikke laste forhåndsvisning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
