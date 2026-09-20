import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Eye, Sparkles, Upload, X, Cloud, Camera, Check, User, Phone, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BSV_LOGO } from '@/assets/logoBase64'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { checkDropboxStatus } from '@/services/dropboxServiceV2'
import { Combobox } from '@/components/ui/Combobox'
import { toast } from '@/lib/toast'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button } from '@/components/ui/Button'
import { Felt } from '@/pages/anlegg/anleggSkjema'

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
  const { ansatt: meg } = useCurrentAnsatt()
  // Kladd for nye rapporter: overlever at fanen lukkes eller telefonen låses midt i skrivingen
  const kladdKey = rapport.id ? null : `servicerapport_kladd_${rapport.ordre_id ?? rapport.anlegg_id ?? 'ny'}`
  const [formData, setFormData] = useState<Servicerapport>(() => {
    if (!kladdKey) return rapport
    try { const k = localStorage.getItem(kladdKey); if (k) { const p = JSON.parse(k) as Partial<Servicerapport>; if (p.header || p.rapport_innhold) return { ...rapport, ...p } } } catch { /* ignorer */ }
    return rapport
  })
  useEffect(() => { if (!kladdKey) return; try { if (formData.header || formData.rapport_innhold) localStorage.setItem(kladdKey, JSON.stringify({ header: formData.header, rapport_innhold: formData.rapport_innhold, anlegg_id: formData.anlegg_id, tekniker_navn: formData.tekniker_navn, rapport_dato: formData.rapport_dato })) } catch { /* ignorer */ } }, [formData, kladdKey])
  // Tekniker = deg på nye rapporter
  useEffect(() => { if (!rapport.id && meg?.navn && !formData.tekniker_navn) setFormData(prev => ({ ...prev, tekniker_navn: meg.navn ?? '' })) }, [meg, rapport.id, formData.tekniker_navn])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [anleggDetails, setAnleggDetails] = useState<AnleggDetails | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiForslag, setAiForslag] = useState<{ tekst: string; modus: 'sprak' | 'stikkord' } | null>(null)
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

  async function handleAiImprove(modus: 'sprak' | 'stikkord' = 'sprak') {
    if (!formData.rapport_innhold.trim()) {
      toast.warning(modus === 'sprak' ? 'Skriv teksten først – så språkvasker AI den' : 'Skriv inn stikkord først')
      return
    }
    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-servicerapport', {
        body: { keywords: formData.rapport_innhold, anleggType: anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn, tekniker: formData.tekniker_navn, mode: modus }
      })
      if (error) throw error
      if (data?.error) { toast.error('AI-hjelpen feilet', data.details || data.error); return }
      const tekst = String(data?.improvedReport ?? '').trim()
      if (!tekst) { toast.warning('Fikk ingen tekst tilbake fra AI'); return }
      if (tekst === formData.rapport_innhold.trim()) { toast.info('AI fant ingenting å endre'); return }
      setAiForslag({ tekst, modus })
    } catch (error) {
      toast.error('Kunne ikke hente AI-hjelp', error)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
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
      toast.error('Kunne ikke lagre servicerapport', error)
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
      toast.warning('Kun bildefiler er tillatt (JPG, PNG osv.)')
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

  const valgtAnlegg = anlegg.find(a => a.id === formData.anlegg_id)
  const antallOrd = formData.rapport_innhold.split(/\s+/).filter(Boolean).length
  const kanLagre = !!formData.header.trim() && !!formData.anlegg_id && !!formData.rapport_innhold.trim() && !!formData.tekniker_navn

  if (showPreview) {
    return (
      <div className="space-y-5 pb-28">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button type="button" onClick={() => setShowPreview(false)} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Tilbake til redigering</button>
        </div>
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Forhåndsvisning</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Slik blir side 1 i PDF-en. Bilder legges på side 2.</p>
        </header>

        <div className="card max-w-4xl !bg-white text-black p-6 sm:p-8">
          <div className="mb-6">
            <img src={BSV_LOGO} alt="BSV Logo" className="w-40 sm:w-48 h-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 uppercase">SERVICERAPPORT</h1>
          </div>
          <div className="border-b-2 border-blue-600 pb-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">{formData.header || 'Servicerapport'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div><span className="font-semibold">Anlegg:</span> {valgtAnlegg?.anleggsnavn || 'Ikke valgt'}</div>
              <div><span className="font-semibold">Dato:</span> {new Date(formData.rapport_dato).toLocaleDateString('nb-NO')}</div>
              <div><span className="font-semibold">Tekniker:</span> {formData.tekniker_navn || 'Ikke angitt'}</div>
            </div>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{formData.rapport_innhold || 'Ingen innhold ennå…'}</div>
          {imagePreviewUrls.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Bilder</h3>
              <div className="grid grid-cols-2 gap-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
                    <img src={url} alt={`Bilde ${index + 1}`} className="w-full h-48 object-contain bg-gray-50" />
                    <div className="p-2 bg-gray-100 text-center"><p className="text-xs text-gray-600">Bilde {index + 1}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-12 pt-6 border-t border-gray-300">
            <p className="text-sm font-bold text-blue-600 mb-2">Brannteknisk Service og Vedlikehold AS</p>
            <p className="text-xs text-gray-600">Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600</p>
            <p className="text-xs text-gray-600">Adresse: Sælenveien 44, 5151 Straumsgrend</p>
            <p className="text-xs text-gray-500 mt-2">Generert: {new Date().toLocaleDateString('nb-NO')} {new Date().toLocaleTimeString('nb-NO')}</p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowPreview(false)} icon={<ArrowLeft />} className="mr-auto">Rediger</Button>
          <Button variant="primary" onClick={() => handleSubmit()} loading={loading || uploadingImages} disabled={!kanLagre} icon={<Save />}>Lagre og lag PDF</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <SendRapportDialog onConfirm={handleSendRapportConfirm} onCancel={handleSendRapportCancel} isOpen={showSendRapportDialog} />

      <form onSubmit={handleSubmit} className="pb-28">
        <div className="space-y-5 max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Servicerapporter</button>
          </div>
          <header>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{rapport.id ? 'Rediger servicerapport' : 'Ny servicerapport'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rapport.id ? formData.header : kladdKey && (formData.header || formData.rapport_innhold) ? 'Kladden lagres automatisk på denne enheten til rapporten er lagret.' : 'Fyll ut, legg ved bilder og lagre – PDF-en lages automatisk.'}</p>
          </header>

          {/* Grunnleggende */}
          <section className="card space-y-4">
            <Felt id="sr-tittel" label="Rapporttittel" pakrevd>
              <input id="sr-tittel" type="text" value={formData.header} onChange={(e) => handleChange('header', e.target.value)} className="input w-full" placeholder="F.eks. Årlig service brannalarmanlegg" required />
            </Felt>
            <Felt label="Anlegg" pakrevd hint={anleggDetails ? [anleggDetails.kunde_navn, [anleggDetails.adresse, anleggDetails.postnr && anleggDetails.poststed ? `${anleggDetails.postnr} ${anleggDetails.poststed}` : anleggDetails.poststed].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : 'Søk på anleggsnavn.'}>
              <Combobox
                options={anlegg.map(a => ({ id: a.id, value: a.id, label: a.anleggsnavn }))}
                value={formData.anlegg_id}
                onChange={(val) => handleChange('anlegg_id', val)}
                placeholder="Velg anlegg…"
                searchPlaceholder="Søk anlegg…"
                emptyMessage="Ingen anlegg funnet"
              />
            </Felt>
            {anleggDetails?.kontaktperson_navn && (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{anleggDetails.kontaktperson_navn}</span>
                {anleggDetails.kontaktperson_telefon && <a href={`tel:${anleggDetails.kontaktperson_telefon}`} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"><Phone className="w-3.5 h-3.5" />{anleggDetails.kontaktperson_telefon}</a>}
                {anleggDetails.kontaktperson_epost && <a href={`mailto:${anleggDetails.kontaktperson_epost}`} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"><Mail className="w-3.5 h-3.5" />{anleggDetails.kontaktperson_epost}</a>}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Felt id="sr-dato" label="Dato" pakrevd>
                <input id="sr-dato" type="date" value={formData.rapport_dato} onChange={(e) => handleChange('rapport_dato', e.target.value)} className="input w-full" required />
              </Felt>
              <Felt id="sr-tekniker" label="Tekniker" pakrevd>
                <select id="sr-tekniker" value={formData.tekniker_navn} onChange={(e) => handleChange('tekniker_navn', e.target.value)} className="input w-full" required>
                  <option value="">Velg tekniker</option>
                  {ansatte.map((ansatt) => <option key={ansatt.id} value={ansatt.navn}>{ansatt.navn}</option>)}
                </select>
              </Felt>
            </div>
          </section>

          {/* Rapporttekst */}
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Rapporttekst <span className="text-red-500">*</span></h2>
              <div className="flex items-center gap-2">
                <Button onClick={() => handleAiImprove('sprak')} loading={aiLoading} disabled={!formData.rapport_innhold.trim()} icon={<Sparkles className="text-purple-500" />} title="Retter skrivefeil og setningsbygning – beholder innhold og lengde">Språkvask</Button>
                <Button variant="ghost" onClick={() => handleAiImprove('stikkord')} disabled={aiLoading || !formData.rapport_innhold.trim()} title="Skriver stikkordene dine ut til hele setninger og avsnitt">Skriv ut fra stikkord</Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Skriv med egne ord – hva som er gjort, hva som ble funnet og hva som gjenstår. Språkvask retter språket etterpå uten å endre innholdet.</p>

            {aiForslag && (
              <div className="rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-purple-200 dark:border-purple-900/60">
                  <p className="text-sm font-medium text-gray-900 dark:text-white inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" />{aiForslag.modus === 'sprak' ? 'Forslag til språkvask' : 'Skrevet ut fra stikkordene'}<span className="text-xs font-normal text-gray-500">· {antallOrd} → {aiForslag.tekst.split(/\s+/).filter(Boolean).length} ord</span></p>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setAiForslag(null)}>Forkast</Button>
                    <Button variant="primary" icon={<Check />} onClick={() => { handleChange('rapport_innhold', aiForslag.tekst); setAiForslag(null); toast.success('Teksten er oppdatert') }}>Bruk forslaget</Button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-purple-200 dark:divide-purple-900/60">
                  <div className="p-3"><p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Din tekst</p><pre className="whitespace-pre-wrap font-sans text-sm text-gray-600 dark:text-gray-400 max-h-72 overflow-y-auto">{formData.rapport_innhold}</pre></div>
                  <div className="p-3"><p className="text-[11px] uppercase tracking-wider text-purple-500 mb-1">Forslag</p><pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-white max-h-72 overflow-y-auto">{aiForslag.tekst}</pre></div>
                </div>
              </div>
            )}

            <textarea
              id="sr-innhold"
              value={formData.rapport_innhold}
              onChange={(e) => handleChange('rapport_innhold', e.target.value)}
              className="input w-full !h-auto text-base leading-relaxed"
              rows={14}
              placeholder={"Eksempel:\nÅrlig kontroll av brannalarmanlegget. Alle detektorer testet med testgass, manuelle meldere utløst. Byttet batteri i sentralen (2 × 12 V 7 Ah). Detektor i lager B ga ikke alarm og er byttet. Anlegget er i normal drift."}
              required
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{antallOrd} ord · {formData.rapport_innhold.length} tegn</p>
          </section>

          {/* Bilder */}
          <section className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bilder {imagePreviewUrls.length > 0 && <span className="text-gray-400 font-normal">({imagePreviewUrls.length})</span>}</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">Legges på side 2 i PDF-en</span>
            </div>
            <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" id="image-upload" />
            <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" id="image-camera" />
            <div className="grid grid-cols-2 gap-2">
              <label htmlFor="image-camera" className="sm:hidden flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Ta bilde</span>
              </label>
              <label htmlFor="image-upload" className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Velg bilder</span>
                <span className="text-xs text-gray-500 mt-0.5 hidden sm:inline">eller dra og slipp her</span>
              </label>
            </div>
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {imagePreviewUrls.map((url, index) => {
                  const isExisting = index < existingImagePaths.length
                  const fileName = isExisting ? existingImagePaths[index].split('/').pop() : selectedImages[index - existingImagePaths.length]?.name
                  return (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                      <img src={url} alt={`Bilde ${index + 1}`} className="w-full h-32 object-cover" />
                      <button type="button" onClick={() => removeImage(index)} aria-label="Fjern bilde" className="absolute top-1.5 right-1.5 w-8 h-8 inline-flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                        <p className="text-[11px] text-white truncate">{fileName}{isExisting && <span className="text-green-300"> · lagret</span>}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          {dropboxAvailable && (
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mr-auto select-none">
              <input type="checkbox" checked={saveToDropbox} onChange={(e) => setSaveToDropbox(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary" />
              <Cloud className={`w-4 h-4 ${saveToDropbox ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">Lagre PDF i Dropbox</span><span className="sm:hidden">Dropbox</span>
            </label>
          )}
          {!dropboxAvailable && <span className="mr-auto" />}
          <Button variant="ghost" onClick={onCancel}>Avbryt</Button>
          <Button onClick={() => setShowPreview(true)} icon={<Eye />}><span className="hidden sm:inline">Forhåndsvis</span><span className="sm:hidden">Vis</span></Button>
          <Button variant="primary" type="submit" loading={loading || uploadingImages} disabled={!kanLagre} icon={<Save />}>{uploadingImages ? 'Laster opp…' : loading ? 'Lagrer…' : 'Lagre og lag PDF'}</Button>
        </div>
      </form>
    </>
  )
}
