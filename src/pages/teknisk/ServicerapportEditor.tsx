import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Eye, Sparkles, Upload, X, Cloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BSV_LOGO } from '@/assets/logoBase64'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { checkDropboxStatus } from '@/services/dropboxServiceV2'
import { Combobox } from '@/components/ui/Combobox'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  ordre_id?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  image_urls?: string[]
  opprettet_dato?: string
  sist_oppdatert?: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string
  postnr?: string
  poststed?: string
  customer?: {
    navn: string
  }
}

interface AnleggDetails {
  anleggsnavn: string
  adresse: string
  postnr: string
  poststed: string
  kunde_navn: string
  kontaktperson_navn?: string
  kontaktperson_telefon?: string
  kontaktperson_epost?: string
}

interface Ansatt {
  id: string
  navn: string
}

interface ServicerapportEditorProps {
  rapport: Servicerapport
  onSave: (rapport: Servicerapport) => Promise<Servicerapport>
  onCancel: () => void
}

export function ServicerapportEditor({ rapport, onSave, onCancel }: ServicerapportEditorProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Servicerapport>(rapport)
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [anleggDetails, setAnleggDetails] = useState<AnleggDetails | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [savedRapportData, setSavedRapportData] = useState<{ kundeId: string; anleggId: string } | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [existingImagePaths, setExistingImagePaths] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [saveToDropbox, setSaveToDropbox] = useState(true) // Standard: lagre til Dropbox
  const [dropboxAvailable, setDropboxAvailable] = useState(false)

  useEffect(() => {
    loadAnlegg()
    loadAnsatte()
    loadExistingImages()
    // Sjekk Dropbox-status asynkront
    checkDropboxStatus().then(status => setDropboxAvailable(status.connected))
  }, [])

  useEffect(() => {
    if (formData.anlegg_id && anlegg.length > 0) {
      loadAnleggDetails(formData.anlegg_id)
    } else {
      setAnleggDetails(null)
    }
  }, [formData.anlegg_id, anlegg])

  async function loadExistingImages() {
    // Last inn eksisterende bilder hvis rapporten har noen
    if (rapport.image_urls && rapport.image_urls.length > 0) {
      const urls: string[] = []
      
      for (const imagePath of rapport.image_urls) {
        try {
          const { data } = await supabase.storage
            .from('anlegg.dokumenter')
            .createSignedUrl(imagePath, 60 * 60) // 1 time
          
          if (data?.signedUrl) {
            urls.push(data.signedUrl)
          }
        } catch (error) {
          console.error('Feil ved lasting av bilde:', error)
        }
      }
      
      setImagePreviewUrls(urls)
      setExistingImagePaths(rapport.image_urls)
    }
  }


  async function loadAnlegg() {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, kundenr')
        .order('anleggsnavn')

      if (error) throw error
      const anleggData = data || []
      setAnlegg(anleggData)
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  async function loadAnsatte() {
    try {
      const { data, error } = await supabase
        .from('ansatte')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setAnsatte(data || [])
    } catch (error) {
      console.error('Feil ved lasting av ansatte:', error)
    }
  }

  async function loadAnleggDetails(anleggId: string) {
    try {
      console.log('Loading anlegg details for:', anleggId)
      
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('anleggsnavn, adresse, postnummer, poststed, kundenr')
        .eq('id', anleggId)
        .single()

      console.log('Anlegg data:', anleggData, 'Error:', anleggError)

      if (anleggError) {
        console.error('Error loading anlegg:', anleggError)
        // Vis i det minste anleggsnavnet fra dropdown
        const selectedAnlegg = anlegg.find(a => a.id === anleggId)
        if (selectedAnlegg) {
          setAnleggDetails({
            anleggsnavn: selectedAnlegg.anleggsnavn,
            adresse: '',
            postnr: '',
            poststed: '',
            kunde_navn: ''
          })
        }
        return
      }

      // Hent primær kontaktperson for anlegget (ikke kritisk hvis det feiler)
      const { data: kontaktData, error: kontaktError } = await supabase
        .from('anlegg_kontaktpersoner')
        .select(`
          kontaktpersoner:kontaktperson_id (
            navn,
            telefon,
            epost
          )
        `)
        .eq('anlegg_id', anleggId)
        .eq('primar', true)
        .maybeSingle()

      console.log('Kontakt data:', kontaktData, 'Error:', kontaktError)

      // Hent kundenavn separat
      let kundeNavn = ''
      if (anleggData.kundenr) {
        const { data: kundeData } = await supabase
          .from('customer')
          .select('navn')
          .eq('id', anleggData.kundenr)
          .single()
        kundeNavn = kundeData?.navn || ''
      }

      const details: AnleggDetails = {
        anleggsnavn: anleggData.anleggsnavn || '',
        adresse: anleggData.adresse || '',
        postnr: anleggData.postnummer || '',
        poststed: anleggData.poststed || '',
        kunde_navn: kundeNavn,
        kontaktperson_navn: (kontaktData?.kontaktpersoner as any)?.navn,
        kontaktperson_telefon: (kontaktData?.kontaktpersoner as any)?.telefon,
        kontaktperson_epost: (kontaktData?.kontaktpersoner as any)?.epost
      }

      console.log('Setting anlegg details:', details)
      setAnleggDetails(details)
    } catch (error) {
      console.error('Feil ved lasting av anleggsdetaljer:', error)
      // Vis i det minste anleggsnavnet
      const selectedAnlegg = anlegg.find(a => a.id === anleggId)
      if (selectedAnlegg) {
        setAnleggDetails({
          anleggsnavn: selectedAnlegg.anleggsnavn,
          adresse: '',
          postnr: '',
          poststed: '',
          kunde_navn: ''
        })
      }
    }
  }

  function handleChange(field: keyof Servicerapport, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleAiImprove() {
    if (!formData.rapport_innhold.trim()) {
      alert('Skriv inn stikkord eller en kort beskrivelse først')
      return
    }

    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-servicerapport', {
        body: {
          keywords: formData.rapport_innhold,
          anleggType: anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn,
          tekniker: formData.tekniker_navn
        }
      })

      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (data?.error) {
        console.error('Function returned error:', data.error)
        alert(`❌ Feil: ${data.error}\n\n${data.details || 'Sjekk at Azure OpenAI er konfigurert i Supabase.'}`)
        return
      }

      if (data?.improvedReport) {
        // Vis forbedret rapport i en dialog for godkjenning
        const userApproved = confirm(
          'AI har generert en forbedret rapport. Vil du erstatte den nåværende teksten?\n\n' +
          'Klikk OK for å godkjenne, eller Avbryt for å beholde den nåværende teksten.'
        )

        if (userApproved) {
          handleChange('rapport_innhold', data.improvedReport)
          alert('✅ Rapporten er oppdatert med AI-forbedret innhold!')
        }
      } else {
        alert('⚠️ Ingen forbedret rapport mottatt fra AI.')
      }
    } catch (error) {
      console.error('Feil ved AI-forbedring:', error)
      alert('❌ Kunne ikke forbedre rapporten med AI.\n\nSjekk at Azure OpenAI er konfigurert i Supabase Dashboard → Edge Functions → Secrets.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Last opp bilder først hvis det finnes noen
      let imageUrls: string[] = existingImagePaths // Start med eksisterende bilder
      if (selectedImages.length > 0) {
        setUploadingImages(true)
        const uploadedUrls = await uploadImages(selectedImages, formData.anlegg_id)
        imageUrls = [...imageUrls, ...uploadedUrls]
        setUploadingImages(false)
      }

      // Lagre rapporten med bildene
      const rapportWithImages = { ...formData, image_urls: imageUrls }
      const savedRapport = await onSave(rapportWithImages)
      
      // Generer og lagre PDF til storage (og Dropbox hvis aktivert)
      if (savedRapport.anlegg_id && savedRapport.id) {
        const { generateServicerapportPDF } = await import('./ServicerapportPDF')
        const result = await generateServicerapportPDF(
          savedRapport, 
          true, // lagre til storage
          saveToDropbox && dropboxAvailable // lagre til Dropbox hvis valgt
        )
        
        if (result.success) {
          // Logg Dropbox-resultat
          if (result.dropboxPath) {
            console.log('✅ Rapport lagret til Dropbox:', result.dropboxPath)
          } else if (result.dropboxError && saveToDropbox) {
            console.warn('⚠️ Dropbox-feil:', result.dropboxError)
          }
          
          // Hent kunde-ID fra anlegget
          const selectedAnlegg = anlegg.find(a => a.id === savedRapport.anlegg_id)
          if (selectedAnlegg) {
            setSavedRapportData({
              kundeId: selectedAnlegg.kundenr,
              anleggId: savedRapport.anlegg_id
            })
          }
          // Vis dialog for å sende rapport
          setShowSendRapportDialog(true)
        }
      }
    } catch (error) {
      console.error('Feil ved lagring/generering:', error)
      alert('Kunne ikke lagre servicerapport')
      setLoading(false)
    }
  }

  function handleSendRapportConfirm() {
    // Naviger til Send Rapporter med kunde og anlegg pre-valgt
    setShowSendRapportDialog(false)
    setLoading(false)
    if (savedRapportData) {
      navigate('/send-rapporter', { 
        state: { 
          kundeId: savedRapportData.kundeId, 
          anleggId: savedRapportData.anleggId 
        } 
      })
    }
  }

  function handleSendRapportCancel() {
    // Lukk dialogen og editoren
    setShowSendRapportDialog(false)
    setLoading(false)
    onCancel() // Lukk editoren og gå tilbake til listen
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length !== files.length) {
      alert('Kun bildefiler er tillatt (JPG, PNG, etc.)')
    }
    
    // Opprett preview URLs
    const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file))
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    setSelectedImages(prev => [...prev, ...imageFiles])
  }

  function removeImage(index: number) {
    const existingCount = existingImagePaths.length
    
    if (index < existingCount) {
      // Fjern eksisterende bilde
      setExistingImagePaths(prev => prev.filter((_, i) => i !== index))
      setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
    } else {
      // Fjern nytt bilde
      const newImageIndex = index - existingCount
      URL.revokeObjectURL(imagePreviewUrls[index])
      setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
      setSelectedImages(prev => prev.filter((_, i) => i !== newImageIndex))
    }
  }

  async function uploadImages(images: File[], anleggId: string): Promise<string[]> {
    const uploadedUrls: string[] = []
    
    for (const image of images) {
      try {
        const timestamp = Date.now()
        const safeFileName = image.name.replace(/[^a-zA-Z0-9.]/g, '_')
        const fileName = `servicerapport_${timestamp}_${safeFileName}`
        const filePath = `anlegg/${anleggId}/servicerapporter/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('anlegg.dokumenter')
          .upload(filePath, image, {
            contentType: image.type,
            upsert: false
          })
        
        if (uploadError) {
          console.error('Feil ved opplasting av bilde:', uploadError)
          throw uploadError
        }
        
        uploadedUrls.push(filePath)
      } catch (error) {
        console.error('Feil ved opplasting av bilde:', error)
        throw error
      }
    }
    
    return uploadedUrls
  }

  if (showPreview) {
    return (
      <div className="space-y-6">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Forhåndsvisning</h1>
              <p className="text-gray-600 dark:text-gray-400">Slik vil rapporten se ut</p>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="card max-w-4xl mx-auto !bg-white text-black p-8">
          {/* Logo */}
          <div className="mb-6">
            <img src={BSV_LOGO} alt="BSV Logo" className="w-48 h-auto mb-4" />
            <h1 className="text-3xl font-bold text-blue-600 uppercase mb-2">SERVICERAPPORT</h1>
          </div>
          
          {/* Header */}
          <div className="border-b-2 border-blue-600 pb-4 mb-6">
            <h2 className="text-2xl font-bold mb-4">{formData.header || 'Servicerapport'}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Anlegg:</span>{' '}
                {anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn || 'Ikke valgt'}
              </div>
              <div>
                <span className="font-semibold">Dato:</span>{' '}
                {new Date(formData.rapport_dato).toLocaleDateString('nb-NO')}
              </div>
              <div>
                <span className="font-semibold">Tekniker:</span> {formData.tekniker_navn || 'Ikke angitt'}
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap">{formData.rapport_innhold || 'Ingen innhold ennå...'}</div>
          </div>

          {/* Images Preview */}
          {imagePreviewUrls.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Bilder</h3>
              <div className="grid grid-cols-2 gap-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Bilde ${index + 1}`}
                      className="w-full h-48 object-contain bg-gray-50"
                    />
                    <div className="p-2 bg-gray-100 text-center">
                      <p className="text-xs text-gray-600">Bilde {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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

  return (
    <>
      {/* Dialog */}
      <SendRapportDialog
        onConfirm={handleSendRapportConfirm}
        onCancel={handleSendRapportCancel}
        isOpen={showSendRapportDialog}
      />

      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {rapport.id ? 'Rediger servicerapport' : 'Ny servicerapport'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Fyll ut informasjon og rapportinnhold</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rapporttittel *
              </label>
              <input
                type="text"
                value={formData.header}
                onChange={(e) => handleChange('header', e.target.value)}
                className="input w-full"
                placeholder="F.eks. Årlig service brannalarmanlegg"
                required
              />
            </div>

            {/* Anlegg */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anlegg <span className="text-red-500">*</span>
              </label>
              <Combobox
                options={anlegg.map(a => ({ id: a.id, value: a.id, label: a.anleggsnavn }))}
                value={formData.anlegg_id}
                onChange={(val) => handleChange('anlegg_id', val)}
                placeholder="Søk og velg anlegg..."
                searchPlaceholder="Skriv for å søke..."
                emptyMessage="Ingen anlegg funnet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dato *
              </label>
              <input
                type="date"
                value={formData.rapport_dato}
                onChange={(e) => handleChange('rapport_dato', e.target.value)}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tekniker *
              </label>
              <select
                value={formData.tekniker_navn}
                onChange={(e) => handleChange('tekniker_navn', e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Velg tekniker</option>
                {ansatte.map((ansatt) => (
                  <option key={ansatt.id} value={ansatt.navn}>
                    {ansatt.navn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Anleggsdetaljer */}
        {anleggDetails && (
          <div className="card bg-blue-500/5 border-blue-500/20">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Anleggsdetaljer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Kunde</label>
                <p className="text-gray-900 dark:text-white">{anleggDetails.kunde_navn || 'Ikke angitt'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Anlegg</label>
                <p className="text-gray-900 dark:text-white">{anleggDetails.anleggsnavn}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Adresse</label>
                <p className="text-gray-900 dark:text-white">
                  {anleggDetails.adresse || 'Ikke angitt'}
                  {anleggDetails.postnr && anleggDetails.poststed && (
                    <><br />{anleggDetails.postnr} {anleggDetails.poststed}</>
                  )}
                </p>
              </div>
              {anleggDetails.kontaktperson_navn && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Kontaktperson</label>
                  <p className="text-gray-900 dark:text-white">{anleggDetails.kontaktperson_navn}</p>
                  {anleggDetails.kontaktperson_telefon && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{anleggDetails.kontaktperson_telefon}</p>
                  )}
                  {anleggDetails.kontaktperson_epost && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{anleggDetails.kontaktperson_epost}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Content Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rapportinnhold</h2>
            <button
              type="button"
              onClick={handleAiImprove}
              disabled={aiLoading || !formData.rapport_innhold.trim()}
              className="btn-primary flex items-center gap-2 text-sm"
              title="Bruk AI til å forbedre rapporten"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Genererer...' : 'Forbedre med AI'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rapport tekst *
            </label>
            <textarea
              value={formData.rapport_innhold}
              onChange={(e) => handleChange('rapport_innhold', e.target.value)}
              className="input w-full font-mono"
              rows={20}
              placeholder="Skriv rapportinnholdet her...

Eksempel:
1. INNLEDNING
   - Formål med service
   - Dato og tid for utførelse

2. UTFØRT ARBEID
   - Beskrivelse av utførte arbeider
   - Komponenter som er kontrollert

3. FUNN OG OBSERVASJONER
   - Eventuelle avvik
   - Anbefalinger

4. KONKLUSJON
   - Oppsummering
   - Neste service"
              required
            />
            <div className="flex items-start gap-2 mt-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 <strong>Tips:</strong> Skriv stikkord eller en kort beskrivelse, og klikk "Forbedre med AI" for å få en profesjonell rapport.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bilder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Vises på side 2 i PDF</p>
          </div>
          
          <div className="space-y-4">
            {/* File input */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Klikk for å velge bilder</span>
                <span className="text-xs text-gray-500 mt-1">eller dra og slipp her</span>
              </label>
            </label>

            {/* Image previews */}
            {imagePreviewUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bilder ({imagePreviewUrls.length})
                  {existingImagePaths.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({existingImagePaths.length} eksisterende, {selectedImages.length} nye)
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagePreviewUrls.map((url, index) => {
                    const isExisting = index < existingImagePaths.length
                    const fileName = isExisting 
                      ? existingImagePaths[index].split('/').pop() 
                      : selectedImages[index - existingImagePaths.length]?.name
                    
                    return (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                        <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded px-2 py-1">
                          <p className="text-xs text-white truncate">{fileName}</p>
                          {isExisting && (
                            <p className="text-xs text-green-400">Eksisterende</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
          <div className="flex items-center gap-3">
            {/* Dropbox toggle eller koble til-knapp */}
            {/* Dropbox toggle - vises kun hvis Dropbox er tilkoblet */}
            {dropboxAvailable && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToDropbox}
                  onChange={(e) => setSaveToDropbox(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                />
                <Cloud className={`w-5 h-5 ${saveToDropbox ? 'text-blue-400' : 'text-gray-500'}`} />
                <span className="text-sm text-gray-300">Dropbox</span>
              </label>
            )}
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Forhåndsvisning
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {uploadingImages ? 'Laster opp bilder...' : loading ? 'Lagrer og genererer...' : 'Lagre og generer rapport'}
            </button>
          </div>
        </div>
      </form>
    </div>
    </>
  )
}
