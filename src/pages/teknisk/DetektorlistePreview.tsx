import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { ArrowLeft, Download } from 'lucide-react'
import { DetektorlistePDF } from './DetektorlistePDF'

interface DetektorItem {
  adresse: string
  type: string
  plassering: string
  kart: string
  akse: string
  etasje: string
  kommentar: string
}

interface DetektorlistePreviewProps {
  kundeNavn: string
  anleggNavn: string
  anleggAdresse?: string
  revisjon: string
  dato: string
  servicetekniker: string
  kontaktperson?: string
  mobil?: string
  epost?: string
  annet?: string
  detektorer: DetektorItem[]
  onBack: () => void
}

export function DetektorlistePreview({
  kundeNavn,
  anleggNavn,
  anleggAdresse,
  revisjon,
  dato,
  servicetekniker,
  kontaktperson,
  mobil,
  epost,
  annet,
  detektorer,
  onBack,
}: DetektorlistePreviewProps) {
  const fileName = `Detektorliste_${kundeNavn.replace(/\s+/g, '_')}_${anleggNavn.replace(/\s+/g, '_')}_Rev${revisjon}.pdf`

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
                Forhåndsvisning - Detektorliste
              </h2>
              <p className="text-gray-400">
                {kundeNavn} - {anleggNavn} - Revisjon {revisjon}
              </p>
            </div>
          </div>
          <PDFDownloadLink
            document={
              <DetektorlistePDF
                kundeNavn={kundeNavn}
                anleggNavn={anleggNavn}
                anleggAdresse={anleggAdresse}
                revisjon={revisjon}
                dato={dato}
                servicetekniker={servicetekniker}
                kontaktperson={kontaktperson}
                mobil={mobil}
                epost={epost}
                annet={annet}
                detektorer={detektorer}
              />
            }
            fileName={fileName}
            className="btn-primary flex items-center gap-2"
          >
            {({ loading }) => (
              <>
                <Download className="w-5 h-5" />
                {loading ? 'Genererer...' : 'Last ned PDF'}
              </>
            )}
          </PDFDownloadLink>
        </div>

        {/* PDF Viewer */}
        <div className="bg-gray-500 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <PDFViewer
            width="100%"
            height="100%"
            showToolbar={true}
          >
            <DetektorlistePDF
              kundeNavn={kundeNavn}
              anleggNavn={anleggNavn}
              anleggAdresse={anleggAdresse}
              revisjon={revisjon}
              dato={dato}
              servicetekniker={servicetekniker}
              kontaktperson={kontaktperson}
              mobil={mobil}
              epost={epost}
              annet={annet}
              detektorer={detektorer}
            />
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}
