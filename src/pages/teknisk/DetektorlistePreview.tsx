import { useState } from 'react'
import { PDFViewer, PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { ArrowLeft, Download, Upload, Check, AlertCircle } from 'lucide-react'
import { DetektorlistePDF } from './DetektorlistePDF'
import { supabase } from '@/lib/supabase'
import { uploadDetektorlisteToDropbox, checkDropboxStatus } from '@/services/dropboxServiceV2'

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
  kundeId: string
  anleggId: string
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
  kundeId,
  anleggId,
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
  const [generating, setGenerating] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    dropbox: 'idle' | 'uploading' | 'success' | 'error'
    storage: 'idle' | 'uploading' | 'success' | 'error'
    dropboxError?: string
    storageError?: string
  }>({ dropbox: 'idle', storage: 'idle' })

  const fileName = `Detektorliste_${kundeNavn.replace(/\s+/g, '_')}_${anleggNavn.replace(/\s+/g, '_')}_Rev${revisjon}.pdf`

  async function handleGeneratePDF() {
    setGenerating(true)
    setUploadStatus({ dropbox: 'idle', storage: 'idle' })

    try {
      // Generer PDF blob
      const pdfDocument = (
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
      )
      const pdfBlob = await pdf(pdfDocument).toBlob()

      // Hent kundenummer fra database
      const { data: kundeData } = await supabase
        .from('customer')
        .select('id, kunde_nummer')
        .eq('id', kundeId)
        .single()

      const kundeNummer = kundeData?.kunde_nummer || kundeId
      
      console.log('📤 Laster opp detektorliste:', { kundeNummer, kundeNavn, anleggNavn, fileName })

      // 1. Last opp til Supabase Storage (i dokumenter-mappen så det vises i anlegg)
      setUploadStatus(prev => ({ ...prev, storage: 'uploading' }))
      try {
        const storagePath = `anlegg/${anleggId}/dokumenter/${fileName}`
        console.log('📦 Laster opp til Storage:', storagePath)
        const { error: storageError } = await supabase.storage
          .from('anlegg.dokumenter')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (storageError) throw storageError
        console.log('✅ Storage opplasting vellykket')
        setUploadStatus(prev => ({ ...prev, storage: 'success' }))
      } catch (error: any) {
        console.error('Feil ved opplasting til Storage:', error)
        setUploadStatus(prev => ({ 
          ...prev, 
          storage: 'error', 
          storageError: error?.message || 'Ukjent feil' 
        }))
      }

      // 2. Last opp til Dropbox
      setUploadStatus(prev => ({ ...prev, dropbox: 'uploading' }))
      try {
        const dropboxStatus = await checkDropboxStatus()
        if (!dropboxStatus.connected) {
          throw new Error('Dropbox er ikke tilkoblet')
        }

        const result = await uploadDetektorlisteToDropbox(
          kundeNummer,
          kundeNavn,
          anleggNavn,
          fileName,
          pdfBlob
        )

        if (!result.success) {
          throw new Error(result.error || 'Ukjent feil')
        }
        setUploadStatus(prev => ({ ...prev, dropbox: 'success' }))
      } catch (error: any) {
        console.error('Feil ved opplasting til Dropbox:', error)
        setUploadStatus(prev => ({ 
          ...prev, 
          dropbox: 'error', 
          dropboxError: error?.message || 'Ukjent feil' 
        }))
      }

    } catch (error) {
      console.error('Feil ved generering av PDF:', error)
    } finally {
      setGenerating(false)
    }
  }

  function getStatusIcon(status: 'idle' | 'uploading' | 'success' | 'error') {
    switch (status) {
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      case 'success':
        return <Check className="w-4 h-4 text-green-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return null
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
                Forhåndsvisning - Detektorliste
              </h2>
              <p className="text-gray-400">
                {kundeNavn} - {anleggNavn} - Revisjon {revisjon}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Upload status */}
            {(uploadStatus.dropbox !== 'idle' || uploadStatus.storage !== 'idle') && (
              <div className="flex items-center gap-4 px-4 py-2 bg-dark-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Storage:</span>
                  {getStatusIcon(uploadStatus.storage)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Dropbox:</span>
                  {getStatusIcon(uploadStatus.dropbox)}
                </div>
              </div>
            )}
            
            {/* Generer PDF knapp */}
            <button
              onClick={handleGeneratePDF}
              disabled={generating}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {generating ? 'Genererer...' : 'Generer & Lagre PDF'}
            </button>

            {/* Last ned PDF */}
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
