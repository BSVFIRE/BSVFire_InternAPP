import { ArrowLeft, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BrannslangerPreviewProps {
  pdfBlob: Blob
  fileName: string
  onBack: () => void
  onSave: () => Promise<void>
}

export function BrannslangerPreview({ pdfBlob, fileName, onBack, onSave }: BrannslangerPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(pdfBlob)
    setPdfUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [pdfBlob])

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave()
      
      // Last ned PDF også
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = fileName
      link.click()
      
      alert('Rapport generert og lagret!')
      onBack()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre rapport')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-200 overflow-auto">
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Forhåndsvisning - Brannslangerrapport
              </h2>
              <p className="text-gray-400">{fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {saving ? 'Genererer...' : 'Generer rapport'}
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-gray-500 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PDF Forhåndsvisning"
            />
          )}
        </div>
      </div>
    </div>
  )
}
