import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Upload, Search, FileText, Trash2, Download, Plus, X, Building2, Check, Settings, Edit2, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FDVViewProps {
  onBack: () => void
  initialAnleggId?: string
  initialKundeId?: string
}

interface Leverandor {
  id: string
  navn: string
}

interface Produkttype {
  id: string
  navn: string
}

interface Datablad {
  id: string
  leverandor_id: string | null
  produkttype_id: string | null
  tittel: string
  produktnavn: string | null
  artikkelnummer: string | null
  revisjon: string | null
  revisjon_dato: string | null
  beskrivelse: string | null
  filnavn: string
  fil_url: string
  fil_storrelse: number | null
  opprettet_dato: string
  leverandor?: Leverandor
  produkttype?: Produkttype
}

interface Anlegg {
  id: string
  anleggsnavn: string
  adresse: string | null
  kunde?: { navn: string }
}

interface AnleggDatablad {
  id: string
  anlegg_id: string
  datablad_id: string
  antall: number
  plassering: string | null
  notater: string | null
  datablad?: Datablad
}

type ViewMode = 'bibliotek' | 'generer'

export function FDVView({ onBack, initialAnleggId }: FDVViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('bibliotek')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  const [datablader, setDatablader] = useState<Datablad[]>([])
  const [leverandorer, setLeverandorer] = useState<Leverandor[]>([])
  const [produkttyper, setProdukttyper] = useState<Produkttype[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLeverandor, setFilterLeverandor] = useState<string>('')
  const [filterProdukttype, setFilterProdukttype] = useState<string>('')
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    tittel: '', produktnavn: '', artikkelnummer: '',
    leverandor_id: '', produkttype_id: '', revisjon: '',
    revisjon_dato: '', beskrivelse: ''
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedAnlegg, setSelectedAnlegg] = useState<string>(initialAnleggId || '')
  const [anleggDatablader, setAnleggDatablader] = useState<AnleggDatablad[]>([])
  const [generating, setGenerating] = useState(false)
  const [fdvTittel, setFdvTittel] = useState('')
  
  const [showNewLeverandorModal, setShowNewLeverandorModal] = useState(false)
  const [showNewProdukttypeModal, setShowNewProdukttypeModal] = useState(false)
  const [newLeverandorNavn, setNewLeverandorNavn] = useState('')
  const [newProdukttypeNavn, setNewProdukttypeNavn] = useState('')
  
  const [showManageLeverandorerModal, setShowManageLeverandorerModal] = useState(false)
  const [showManageProdukttypeModal, setShowManageProdukttypeModal] = useState(false)
  const [editingLeverandor, setEditingLeverandor] = useState<Leverandor | null>(null)
  const [editingProdukttype, setEditingProdukttype] = useState<Produkttype | null>(null)
  const [expandedLeverandorer, setExpandedLeverandorer] = useState<Set<string>>(new Set())
  const [expandedDatabladId, setExpandedDatabladId] = useState<string | null>(null)
  const [editingDatablad, setEditingDatablad] = useState<{
    id: string
    tittel: string
    produktnavn: string
    artikkelnummer: string
    leverandor_id: string
    produkttype_id: string
    revisjon: string
    beskrivelse: string
    newFile: File | null
  } | null>(null)
  const [savingDatablad, setSavingDatablad] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedAnlegg) loadAnleggDatablader(selectedAnlegg) }, [selectedAnlegg])

  async function loadData() {
    try {
      setLoading(true)
      const [leverandorRes, produkttypeRes, databladRes, anleggRes] = await Promise.all([
        supabase.from('fdv_leverandorer').select('*').order('navn'),
        supabase.from('fdv_produkttyper').select('*').order('navn'),
        supabase.from('fdv_datablader').select(`*, leverandor:fdv_leverandorer(id, navn), produkttype:fdv_produkttyper(id, navn)`).order('tittel'),
        supabase.from('anlegg').select(`id, anleggsnavn, adresse, kunde:customer(navn)`).order('anleggsnavn')
      ])
      if (leverandorRes.data) setLeverandorer(leverandorRes.data)
      if (produkttypeRes.data) setProdukttyper(produkttypeRes.data)
      if (databladRes.data) setDatablader(databladRes.data)
      if (anleggRes.data) setAnlegg(anleggRes.data as any)
    } catch (error) {
      console.error('Feil ved lasting av data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAnleggDatablader(anleggId: string) {
    const { data } = await supabase
      .from('fdv_anlegg_datablader')
      .select(`*, datablad:fdv_datablader(*, leverandor:fdv_leverandorer(id, navn), produkttype:fdv_produkttyper(id, navn))`)
      .eq('anlegg_id', anleggId)
    if (data) setAnleggDatablader(data as any)
  }

  function sanitizeFileName(name: string): string {
    return name
      .replace(/æ/gi, 'ae')
      .replace(/ø/gi, 'o')
      .replace(/å/gi, 'a')
      .replace(/[¤#%&{}\\<>*?/$!'":@+`|=]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim()
  }

  async function handleUpload() {
    if (!uploadFile || !uploadData.tittel) { alert('Tittel og fil er påkrevd'); return }
    try {
      setUploading(true)
      
      // Build filename from Leverandør_Produkttype_Tittel
      const leverandorNavn = leverandorer.find(l => l.id === uploadData.leverandor_id)?.navn || 'Ukjent'
      const produkttypeNavn = produkttyper.find(p => p.id === uploadData.produkttype_id)?.navn || 'Ukjent'
      const tittel = uploadData.tittel
      const baseFileName = sanitizeFileName(`${leverandorNavn}_${produkttypeNavn}_${tittel}`)
      const fileName = `${baseFileName}.pdf`
      const filePath = `datablader/${fileName}`
      const { error: uploadError } = await supabase.storage.from('fdv-datablader').upload(filePath, uploadFile)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('fdv-datablader').getPublicUrl(filePath)
      const { error: insertError } = await supabase.from('fdv_datablader').insert({
        tittel: uploadData.tittel, produktnavn: uploadData.produktnavn || null,
        artikkelnummer: uploadData.artikkelnummer || null, leverandor_id: uploadData.leverandor_id || null,
        produkttype_id: uploadData.produkttype_id || null, revisjon: uploadData.revisjon || null,
        revisjon_dato: uploadData.revisjon_dato || null, beskrivelse: uploadData.beskrivelse || null,
        filnavn: uploadFile.name, fil_url: urlData.publicUrl, fil_storrelse: uploadFile.size
      })
      if (insertError) throw insertError
      setShowUploadModal(false)
      setUploadData({ tittel: '', produktnavn: '', artikkelnummer: '', leverandor_id: '', produkttype_id: '', revisjon: '', revisjon_dato: '', beskrivelse: '' })
      setUploadFile(null)
      loadData()
    } catch (error: any) {
      console.error('Feil ved opplasting:', error)
      alert('Kunne ikke laste opp: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDatablad(id: string, filUrl: string) {
    if (!confirm('Er du sikker på at du vil slette dette databladet?')) return
    try {
      const urlParts = filUrl.split('/fdv-datablader/')
      if (urlParts.length > 1) await supabase.storage.from('fdv-datablader').remove([urlParts[1]])
      const { error } = await supabase.from('fdv_datablader').delete().eq('id', id)
      if (error) throw error
      loadData()
    } catch (error: any) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleAddToAnlegg(databladId: string) {
    if (!selectedAnlegg) { alert('Velg et anlegg først'); return }
    try {
      const { error } = await supabase.from('fdv_anlegg_datablader').insert({ anlegg_id: selectedAnlegg, datablad_id: databladId })
      if (error) {
        if (error.code === '23505') alert('Dette databladet er allerede lagt til på anlegget')
        else throw error
      } else {
        loadAnleggDatablader(selectedAnlegg)
      }
    } catch (error: any) {
      console.error('Feil ved tillegging:', error)
      alert('Kunne ikke legge til: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleRemoveFromAnlegg(id: string) {
    try {
      const { error } = await supabase.from('fdv_anlegg_datablader').delete().eq('id', id)
      if (error) throw error
      loadAnleggDatablader(selectedAnlegg)
    } catch (error: any) {
      console.error('Feil ved fjerning:', error)
    }
  }

  function startEditingDatablad(d: Datablad) {
    setEditingDatablad({
      id: d.id,
      tittel: d.tittel,
      produktnavn: d.produktnavn || '',
      artikkelnummer: d.artikkelnummer || '',
      leverandor_id: d.leverandor_id || '',
      produkttype_id: d.produkttype_id || '',
      revisjon: d.revisjon || '',
      beskrivelse: d.beskrivelse || '',
      newFile: null
    })
    setExpandedDatabladId(d.id)
  }

  async function handleSaveDatablad() {
    if (!editingDatablad) return
    try {
      setSavingDatablad(true)
      const original = datablader.find(d => d.id === editingDatablad.id)
      if (!original) return

      // Calculate new filename based on current metadata
      const leverandorNavn = leverandorer.find(l => l.id === editingDatablad.leverandor_id)?.navn || 'Ukjent'
      const produkttypeNavn = produkttyper.find(p => p.id === editingDatablad.produkttype_id)?.navn || 'Ukjent'
      const baseFileName = sanitizeFileName(`${leverandorNavn}_${produkttypeNavn}_${editingDatablad.tittel}`)
      const newFilnavn = `${baseFileName}.pdf`
      const newFilePath = `datablader/${newFilnavn}`

      let newFilUrl = original.fil_url

      // Check if filename needs to change (metadata changed or new file uploaded)
      const filenameChanged = newFilnavn !== original.filnavn

      if (editingDatablad.newFile) {
        // New file uploaded - delete old and upload new
        if (original.fil_url) {
          const oldPath = original.fil_url.split('/fdv-datablader/')[1]
          if (oldPath) {
            await supabase.storage.from('fdv-datablader').remove([decodeURIComponent(oldPath)])
          }
        }
        const { error: uploadError } = await supabase.storage.from('fdv-datablader').upload(newFilePath, editingDatablad.newFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('fdv-datablader').getPublicUrl(newFilePath)
        newFilUrl = urlData.publicUrl
      } else if (filenameChanged && original.fil_url) {
        // No new file, but filename changed - rename existing file by copy+delete
        const oldPath = original.fil_url.split('/fdv-datablader/')[1]
        if (oldPath) {
          // Download existing file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('fdv-datablader')
            .download(decodeURIComponent(oldPath))
          
          if (downloadError) {
            console.warn('Kunne ikke laste ned eksisterende fil for omdøping:', downloadError)
          } else if (fileData) {
            // Upload with new name
            const { error: uploadError } = await supabase.storage
              .from('fdv-datablader')
              .upload(newFilePath, fileData, { upsert: true })
            
            if (uploadError) {
              console.warn('Kunne ikke laste opp fil med nytt navn:', uploadError)
            } else {
              // Delete old file
              await supabase.storage.from('fdv-datablader').remove([decodeURIComponent(oldPath)])
              // Update URL
              const { data: urlData } = supabase.storage.from('fdv-datablader').getPublicUrl(newFilePath)
              newFilUrl = urlData.publicUrl
            }
          }
        }
      }

      // Update database record
      const { error: updateError } = await supabase.from('fdv_datablader').update({
        tittel: editingDatablad.tittel,
        produktnavn: editingDatablad.produktnavn || null,
        artikkelnummer: editingDatablad.artikkelnummer || null,
        leverandor_id: editingDatablad.leverandor_id || null,
        produkttype_id: editingDatablad.produkttype_id || null,
        revisjon: editingDatablad.revisjon || null,
        beskrivelse: editingDatablad.beskrivelse || null,
        fil_url: newFilUrl,
        filnavn: newFilnavn
      }).eq('id', editingDatablad.id)

      if (updateError) throw updateError

      // Reload data and close editor
      await loadData()
      setEditingDatablad(null)
      setExpandedDatabladId(null)
      alert('Datablad oppdatert!')
    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setSavingDatablad(false)
    }
  }

  async function handleAddLeverandor() {
    if (!newLeverandorNavn.trim()) return
    try {
      const { data, error } = await supabase.from('fdv_leverandorer').insert({ navn: newLeverandorNavn.trim() }).select().single()
      if (error) throw error
      setLeverandorer([...leverandorer, data])
      setUploadData({ ...uploadData, leverandor_id: data.id })
      setNewLeverandorNavn('')
      setShowNewLeverandorModal(false)
    } catch (error: any) {
      alert('Kunne ikke legge til leverandør: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleAddProdukttype() {
    if (!newProdukttypeNavn.trim()) return
    try {
      const { data, error } = await supabase.from('fdv_produkttyper').insert({ navn: newProdukttypeNavn.trim() }).select().single()
      if (error) throw error
      setProdukttyper([...produkttyper, data].sort((a, b) => a.navn.localeCompare(b.navn)))
      setUploadData({ ...uploadData, produkttype_id: data.id })
      setNewProdukttypeNavn('')
      setShowNewProdukttypeModal(false)
    } catch (error: any) {
      alert('Kunne ikke legge til produkttype: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleDeleteLeverandor(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne leverandøren?')) return
    try {
      const { error } = await supabase.from('fdv_leverandorer').delete().eq('id', id)
      if (error) throw error
      setLeverandorer(leverandorer.filter(l => l.id !== id))
    } catch (error: any) {
      alert('Kunne ikke slette leverandør: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleDeleteProdukttype(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne produkttypen?')) return
    try {
      const { error } = await supabase.from('fdv_produkttyper').delete().eq('id', id)
      if (error) throw error
      setProdukttyper(produkttyper.filter(p => p.id !== id))
    } catch (error: any) {
      alert('Kunne ikke slette produkttype: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleUpdateLeverandor() {
    if (!editingLeverandor || !editingLeverandor.navn.trim()) return
    try {
      const { error } = await supabase.from('fdv_leverandorer').update({ navn: editingLeverandor.navn.trim() }).eq('id', editingLeverandor.id)
      if (error) throw error
      setLeverandorer(leverandorer.map(l => l.id === editingLeverandor.id ? editingLeverandor : l).sort((a, b) => a.navn.localeCompare(b.navn)))
      setEditingLeverandor(null)
    } catch (error: any) {
      alert('Kunne ikke oppdatere leverandør: ' + (error?.message || 'Ukjent feil'))
    }
  }

  function moveDatablad(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= anleggDatablader.length) return
    const newList = [...anleggDatablader]
    const temp = newList[index]
    newList[index] = newList[newIndex]
    newList[newIndex] = temp
    setAnleggDatablader(newList)
  }

  async function handleUpdateProdukttype() {
    if (!editingProdukttype || !editingProdukttype.navn.trim()) return
    try {
      const { error } = await supabase.from('fdv_produkttyper').update({ navn: editingProdukttype.navn.trim() }).eq('id', editingProdukttype.id)
      if (error) throw error
      setProdukttyper(produkttyper.map(p => p.id === editingProdukttype.id ? editingProdukttype : p).sort((a, b) => a.navn.localeCompare(b.navn)))
      setEditingProdukttype(null)
    } catch (error: any) {
      alert('Kunne ikke oppdatere produkttype: ' + (error?.message || 'Ukjent feil'))
    }
  }

  async function handleGenerateFDV() {
    if (!selectedAnlegg || anleggDatablader.length === 0) { alert('Velg et anlegg og legg til datablader først'); return }
    if (!fdvTittel.trim()) { alert('Skriv inn en tittel for FDV-dokumentet'); return }
    try {
      setGenerating(true)
      const selectedAnleggInfo = anlegg.find(a => a.id === selectedAnlegg)
      
      // Import pdf-lib for merging PDFs
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      
      // Create the main merged PDF document
      const mergedPdf = await PDFDocument.create()
      const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
      
      // Create title page
      const titlePage = mergedPdf.addPage()
      const { width, height } = titlePage.getSize()
      
      titlePage.drawText('FDV-Dokumentasjon', {
        x: width / 2 - 100,
        y: height - 150,
        size: 28,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      titlePage.drawText(fdvTittel, {
        x: width / 2 - (fdvTittel.length * 5),
        y: height - 200,
        size: 20,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      })
      
      if (selectedAnleggInfo) {
        let yOffset = 250
        titlePage.drawText(`Anlegg: ${selectedAnleggInfo.anleggsnavn}`, {
          x: 50,
          y: height - yOffset,
          size: 14,
          font: helveticaFont
        })
        yOffset += 25
        if (selectedAnleggInfo.adresse) {
          titlePage.drawText(`Adresse: ${selectedAnleggInfo.adresse}`, {
            x: 50,
            y: height - yOffset,
            size: 14,
            font: helveticaFont
          })
          yOffset += 25
        }
        if (selectedAnleggInfo.kunde?.navn) {
          titlePage.drawText(`Kunde: ${selectedAnleggInfo.kunde.navn}`, {
            x: 50,
            y: height - yOffset,
            size: 14,
            font: helveticaFont
          })
        }
      }
      
      // Footer with company info
      titlePage.drawText('FDV levert av', {
        x: 50,
        y: 70,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      })
      titlePage.drawText('Brannteknisk Service og Vedlikehold AS', {
        x: 50,
        y: 55,
        size: 12,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2)
      })
      titlePage.drawText(`Generert: ${new Date().toLocaleDateString('nb-NO')}`, {
        x: width - 150,
        y: 55,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      })
      
      // Create table of contents page
      const tocPage = mergedPdf.addPage()
      tocPage.drawText('Innholdsfortegnelse', {
        x: 50,
        y: height - 50,
        size: 20,
        font: helveticaBold
      })
      
      let tocY = height - 100
      
      anleggDatablader.forEach((ad, index) => {
        const datablad = ad.datablad
        if (datablad) {
          const leverandorNavn = datablad.leverandor?.navn || ''
          tocPage.drawText(`${index + 1}. ${datablad.tittel}`, {
            x: 50,
            y: tocY,
            size: 12,
            font: helveticaBold
          })
          tocPage.drawText(`   ${leverandorNavn}`, {
            x: 50,
            y: tocY - 15,
            size: 10,
            font: helveticaFont,
            color: rgb(0.4, 0.4, 0.4)
          })
          tocY -= 35
          if (tocY < 50) {
            // Would need new page for TOC, simplified for now
            tocY = height - 50
          }
        }
      })
      
      // Fetch and merge each datablad PDF
      for (const ad of anleggDatablader) {
        const datablad = ad.datablad
        if (datablad?.fil_url) {
          try {
            // Extract file path from URL
            const urlParts = datablad.fil_url.split('/fdv-datablader/')
            if (urlParts.length < 2) {
              console.warn(`Ugyldig fil-URL for: ${datablad.tittel}`)
              continue
            }
            const filePath = decodeURIComponent(urlParts[1])
            
            // Download using Supabase storage (handles auth and private buckets)
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('fdv-datablader')
              .download(filePath)
            
            if (downloadError || !fileData) {
              console.warn(`Kunne ikke hente PDF: ${datablad.tittel}`, downloadError)
              continue
            }
            const pdfBytes = await fileData.arrayBuffer()
            
            // Load the PDF document
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
            
            // Copy all pages from the datablad PDF
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
            copiedPages.forEach((page: any) => {
              mergedPdf.addPage(page)
            })
          } catch (pdfError) {
            console.warn(`Feil ved lasting av PDF ${datablad.tittel}:`, pdfError)
            // Add an error page instead
            const errorPage = mergedPdf.addPage()
            errorPage.drawText(`Kunne ikke laste: ${datablad.tittel}`, {
              x: 50,
              y: height - 100,
              size: 14,
              font: helveticaFont,
              color: rgb(0.8, 0, 0)
            })
          }
        }
      }
      
      // Save the merged PDF
      const mergedPdfBytes = await mergedPdf.save()
      const pdfBlob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' })
      const fileName = sanitizeFileName(`FDV_${fdvTittel}_${selectedAnleggInfo?.anleggsnavn || 'dokument'}`) + '.pdf'
      
      // Save to fdv-datablader bucket (for FDV module)
      const { error: uploadError } = await supabase.storage.from('fdv-datablader').upload(`genererte/${fileName}`, pdfBlob, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('fdv-datablader').getPublicUrl(`genererte/${fileName}`)
      
      // Also save to anlegg.dokumenter bucket (same as other reports)
      const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${fileName}`
      const { error: anleggUploadError } = await supabase.storage
        .from('anlegg.dokumenter')
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        })
      
      if (anleggUploadError) {
        console.warn('Kunne ikke lagre til anlegg.dokumenter:', anleggUploadError)
      } else {
        // Generate signed URL and save to dokumenter table
        const { data: signedUrlData } = await supabase.storage
          .from('anlegg.dokumenter')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year
        
        const { error: dbError } = await supabase
          .from('dokumenter')
          .upsert({
            anlegg_id: selectedAnlegg,
            filnavn: fileName,
            url: signedUrlData?.signedUrl || null,
            type: 'FDV Rapport',
            opplastet_dato: new Date().toISOString(),
            storage_path: storagePath
          }, {
            onConflict: 'anlegg_id,filnavn'
          })
        
        if (dbError) {
          console.warn('Kunne ikke lagre til dokumenter-tabell:', dbError)
        }
      }
      
      const { error: insertError } = await supabase.from('fdv_genererte_dokumenter').insert({
        anlegg_id: selectedAnlegg, tittel: fdvTittel, fil_url: urlData.publicUrl,
        inkluderte_datablader: anleggDatablader.map(ad => ad.datablad_id)
      })
      if (insertError) throw insertError
      
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      alert('FDV-dokument generert og lagret!')
    } catch (error: any) {
      console.error('Feil ved generering:', error)
      alert('Kunne ikke generere FDV: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setGenerating(false)
    }
  }

  const filteredDatablader = datablader
    .filter(d => {
      const matchesSearch = !searchQuery || d.tittel.toLowerCase().includes(searchQuery.toLowerCase()) || d.produktnavn?.toLowerCase().includes(searchQuery.toLowerCase()) || d.artikkelnummer?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLeverandor = !filterLeverandor || d.leverandor_id === filterLeverandor
      const matchesProdukttype = !filterProdukttype || d.produkttype_id === filterProdukttype
      return matchesSearch && matchesLeverandor && matchesProdukttype
    })
    .sort((a, b) => {
      const leverandorA = a.leverandor?.navn || ''
      const leverandorB = b.leverandor?.navn || ''
      if (leverandorA !== leverandorB) return leverandorA.localeCompare(leverandorB)
      return a.tittel.localeCompare(b.tittel)
    })

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FDV / Datablader</h1>
            <p className="text-gray-600 dark:text-gray-400">Last opp og administrer datablader, generer FDV-dokumentasjon</p>
          </div>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-primary flex items-center gap-2">
          <Upload className="w-5 h-5" /> Last opp datablad
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setViewMode('bibliotek')} className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'bibliotek' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'}`}>
          <FileText className="w-4 h-4 inline mr-2" /> Datablad-bibliotek
        </button>
        <button onClick={() => setViewMode('generer')} className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'generer' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'}`}>
          <Building2 className="w-4 h-4 inline mr-2" /> Generer FDV
        </button>
      </div>

      {viewMode === 'bibliotek' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Søk i datablader..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input w-full pl-10" />
              </div>
            </div>
            <div className="flex gap-2">
              <select value={filterLeverandor} onChange={e => setFilterLeverandor(e.target.value)} className="input">
                <option value="">Alle leverandører</option>
                {leverandorer.map(l => <option key={l.id} value={l.id}>{l.navn}</option>)}
              </select>
              <button onClick={() => setShowManageLeverandorerModal(true)} className="btn-secondary p-2" title="Administrer leverandører">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <select value={filterProdukttype} onChange={e => setFilterProdukttype(e.target.value)} className="input">
                <option value="">Alle produkttyper</option>
                {produkttyper.map(p => <option key={p.id} value={p.id}>{p.navn}</option>)}
              </select>
              <button onClick={() => setShowManageProdukttypeModal(true)} className="btn-secondary p-2" title="Administrer produkttyper">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Tittel</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Leverandør</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Revisjon</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDatablader.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">Ingen datablader funnet</td></tr>
                  ) : (
                    filteredDatablader.map(d => (
                      <>
                        <tr 
                          key={d.id} 
                          className={`border-b border-gray-100 dark:border-dark-100 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer ${expandedDatabladId === d.id ? 'bg-gray-50 dark:bg-dark-100' : ''}`}
                          onClick={() => {
                            if (expandedDatabladId === d.id) {
                              setExpandedDatabladId(null)
                              setEditingDatablad(null)
                            } else {
                              startEditingDatablad(d)
                            }
                          }}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {expandedDatabladId === d.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{d.tittel}</div>
                                {d.produktnavn && <div className="text-sm text-gray-500">{d.produktnavn}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.leverandor?.navn || '-'}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.produkttype?.navn || '-'}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.revisjon || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <a href={d.fil_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="Åpne PDF">
                                <Download className="w-4 h-4" />
                              </a>
                              <button onClick={() => handleDeleteDatablad(d.id, d.fil_url)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Slett">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedDatabladId === d.id && editingDatablad && (
                          <tr key={`${d.id}-edit`}>
                            <td colSpan={5} className="p-4 bg-gray-50 dark:bg-dark-100 border-b border-gray-200 dark:border-dark-200">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tittel *</label>
                                    <input type="text" value={editingDatablad.tittel} onChange={e => setEditingDatablad({ ...editingDatablad, tittel: e.target.value })} className="input w-full" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produktnavn</label>
                                    <input type="text" value={editingDatablad.produktnavn} onChange={e => setEditingDatablad({ ...editingDatablad, produktnavn: e.target.value })} className="input w-full" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Artikkelnummer</label>
                                    <input type="text" value={editingDatablad.artikkelnummer} onChange={e => setEditingDatablad({ ...editingDatablad, artikkelnummer: e.target.value })} className="input w-full" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leverandør</label>
                                    <select value={editingDatablad.leverandor_id} onChange={e => setEditingDatablad({ ...editingDatablad, leverandor_id: e.target.value })} className="input w-full">
                                      <option value="">Velg leverandør...</option>
                                      {leverandorer.map(l => <option key={l.id} value={l.id}>{l.navn}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produkttype</label>
                                    <select value={editingDatablad.produkttype_id} onChange={e => setEditingDatablad({ ...editingDatablad, produkttype_id: e.target.value })} className="input w-full">
                                      <option value="">Velg produkttype...</option>
                                      {produkttyper.map(p => <option key={p.id} value={p.id}>{p.navn}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Revisjon</label>
                                    <input type="text" value={editingDatablad.revisjon} onChange={e => setEditingDatablad({ ...editingDatablad, revisjon: e.target.value })} className="input w-full" placeholder="F.eks. 1.0" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beskrivelse</label>
                                  <textarea value={editingDatablad.beskrivelse} onChange={e => setEditingDatablad({ ...editingDatablad, beskrivelse: e.target.value })} className="input w-full" rows={2} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Erstatt PDF-fil (valgfritt)</label>
                                  <input type="file" accept=".pdf" onChange={e => setEditingDatablad({ ...editingDatablad, newFile: e.target.files?.[0] || null })} className="input w-full" />
                                  {editingDatablad.newFile && (
                                    <p className="text-sm text-green-600 mt-1">Ny fil valgt: {editingDatablad.newFile.name}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">Nåværende fil: {d.filnavn}</p>
                                </div>
                                {(editingDatablad.leverandor_id || editingDatablad.produkttype_id || editingDatablad.tittel) && (
                                  <div className="p-3 bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filnavn som genereres ved ny PDF:</label>
                                    <p className="text-sm font-mono text-primary break-all">
                                      {sanitizeFileName(`${leverandorer.find(l => l.id === editingDatablad.leverandor_id)?.navn || 'Leverandør'}_${produkttyper.find(p => p.id === editingDatablad.produkttype_id)?.navn || 'Produkttype'}_${editingDatablad.tittel || 'Tittel'}`)}.pdf
                                    </p>
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); setExpandedDatabladId(null); setEditingDatablad(null) }} className="btn-secondary">
                                    Avbryt
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleSaveDatablad() }} disabled={savingDatablad || !editingDatablad.tittel} className="btn-primary disabled:opacity-50">
                                    {savingDatablad ? 'Lagrer...' : 'Lagre endringer'}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'generer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Velg anlegg</h3>
              <select value={selectedAnlegg} onChange={e => setSelectedAnlegg(e.target.value)} className="input w-full">
                <option value="">Velg anlegg...</option>
                {anlegg.map(a => <option key={a.id} value={a.id}>{a.anleggsnavn} {a.kunde?.navn ? `(${a.kunde.navn})` : ''}</option>)}
              </select>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Velg datablader</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {(() => {
                  // Group datablader by leverandør
                  const grouped = filteredDatablader.reduce((acc, d) => {
                    const leverandorId = d.leverandor_id || 'ukjent'
                    const leverandorNavn = d.leverandor?.navn || 'Ukjent leverandør'
                    if (!acc[leverandorId]) {
                      acc[leverandorId] = { navn: leverandorNavn, datablader: [] }
                    }
                    acc[leverandorId].datablader.push(d)
                    return acc
                  }, {} as Record<string, { navn: string; datablader: Datablad[] }>)
                  
                  return Object.entries(grouped).map(([leverandorId, group]) => {
                    const isExpanded = expandedLeverandorer.has(leverandorId)
                    const addedCount = group.datablader.filter(d => anleggDatablader.some(ad => ad.datablad_id === d.id)).length
                    
                    return (
                      <div key={leverandorId} className="border border-gray-200 dark:border-dark-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedLeverandorer)
                            if (isExpanded) {
                              newSet.delete(leverandorId)
                            } else {
                              newSet.add(leverandorId)
                            }
                            setExpandedLeverandorer(newSet)
                          }}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-200 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                            <span className="font-medium text-gray-900 dark:text-white">{group.navn}</span>
                            <span className="text-sm text-gray-500">({group.datablader.length})</span>
                          </div>
                          {addedCount > 0 && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">{addedCount} valgt</span>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="p-2 space-y-2 bg-white dark:bg-dark-100">
                            {group.datablader.map(d => {
                              const isAdded = anleggDatablader.some(ad => ad.datablad_id === d.id)
                              return (
                                <div key={d.id} className={`p-3 rounded-lg border ${isAdded ? 'border-green-500 bg-green-500/10' : 'border-gray-200 dark:border-dark-200'}`}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">{d.tittel}</div>
                                      {d.produkttype?.navn && <div className="text-sm text-gray-500">{d.produkttype.navn}</div>}
                                    </div>
                                    {isAdded ? (
                                      <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <button onClick={() => handleAddToAnlegg(d.id)} disabled={!selectedAnlegg} className="btn-secondary text-sm py-1 px-3 disabled:opacity-50">
                                        <Plus className="w-4 h-4 inline mr-1" /> Legg til
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Valgte datablader for FDV</h3>
              {anleggDatablader.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Ingen datablader valgt</p>
              ) : (
                <div className="space-y-2">
                  {anleggDatablader.map((ad, index) => (
                    <div key={ad.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button 
                            onClick={() => moveDatablad(index, 'up')} 
                            disabled={index === 0}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Flytt opp"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => moveDatablad(index, 'down')} 
                            disabled={index === anleggDatablader.length - 1}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Flytt ned"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm">{index + 1}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{ad.datablad?.tittel}</div>
                          <div className="text-sm text-gray-500">{ad.datablad?.leverandor?.navn}</div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFromAnlegg(ad.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generer FDV-dokument</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">FDV Tittel</label>
                  <input type="text" value={fdvTittel} onChange={e => setFdvTittel(e.target.value)} className="input w-full" placeholder="F.eks. FDV Brannalarmanlegg" />
                </div>
                <button onClick={handleGenerateFDV} disabled={generating || anleggDatablader.length === 0} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {generating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-5 h-5" />}
                  {generating ? 'Genererer...' : 'Generer og last ned FDV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Last opp datablad</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produktnavn *</label>
                  <input type="text" value={uploadData.tittel} onChange={e => setUploadData({ ...uploadData, tittel: e.target.value })} className="input w-full" placeholder="F.eks. SD-851E" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Artikkelnummer</label>
                  <input type="text" value={uploadData.artikkelnummer} onChange={e => setUploadData({ ...uploadData, artikkelnummer: e.target.value })} className="input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leverandør</label>
                <div className="flex gap-2">
                  <select value={uploadData.leverandor_id} onChange={e => setUploadData({ ...uploadData, leverandor_id: e.target.value })} className="input flex-1">
                    <option value="">Velg leverandør...</option>
                    {leverandorer.map(l => <option key={l.id} value={l.id}>{l.navn}</option>)}
                  </select>
                  <button onClick={() => setShowNewLeverandorModal(true)} className="btn-secondary"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produkttype</label>
                <div className="flex gap-2">
                  <select value={uploadData.produkttype_id} onChange={e => setUploadData({ ...uploadData, produkttype_id: e.target.value })} className="input flex-1">
                    <option value="">Velg produkttype...</option>
                    {produkttyper.map(p => <option key={p.id} value={p.id}>{p.navn}</option>)}
                  </select>
                  <button onClick={() => setShowNewProdukttypeModal(true)} className="btn-secondary"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Revisjon</label>
                  <input type="text" value={uploadData.revisjon} onChange={e => setUploadData({ ...uploadData, revisjon: e.target.value })} className="input w-full" placeholder="F.eks. Rev. 2.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Revisjonsdato</label>
                  <input type="date" value={uploadData.revisjon_dato} onChange={e => setUploadData({ ...uploadData, revisjon_dato: e.target.value })} className="input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beskrivelse</label>
                <textarea value={uploadData.beskrivelse} onChange={e => setUploadData({ ...uploadData, beskrivelse: e.target.value })} className="input w-full h-20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PDF-fil *</label>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-dark-200 rounded-lg hover:border-primary transition-colors">
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="w-5 h-5" />
                      <span>{uploadFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <span>Klikk for å velge PDF-fil</span>
                    </div>
                  )}
                </button>
              </div>
              {(uploadData.leverandor_id || uploadData.produkttype_id || uploadData.tittel) && (
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filnavn som genereres:</label>
                  <p className="text-sm font-mono text-primary break-all">
                    {sanitizeFileName(`${leverandorer.find(l => l.id === uploadData.leverandor_id)?.navn || 'Leverandør'}_${produkttyper.find(p => p.id === uploadData.produkttype_id)?.navn || 'Produkttype'}_${uploadData.tittel || 'Produktnavn'}`)}.pdf
                  </p>
                </div>
              )}
              <button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadData.tittel} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
                {uploading ? 'Laster opp...' : 'Last opp datablad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewLeverandorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowNewLeverandorModal(false)}>
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ny leverandør</h3>
            </div>
            <div className="p-4 space-y-4">
              <input type="text" value={newLeverandorNavn} onChange={e => setNewLeverandorNavn(e.target.value)} className="input w-full" placeholder="Leverandørnavn" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowNewLeverandorModal(false)} className="btn-secondary flex-1">Avbryt</button>
                <button onClick={handleAddLeverandor} className="btn-primary flex-1">Legg til</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewProdukttypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowNewProdukttypeModal(false)}>
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ny produkttype</h3>
            </div>
            <div className="p-4 space-y-4">
              <input type="text" value={newProdukttypeNavn} onChange={e => setNewProdukttypeNavn(e.target.value)} className="input w-full" placeholder="Produkttype" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowNewProdukttypeModal(false)} className="btn-secondary flex-1">Avbryt</button>
                <button onClick={handleAddProdukttype} className="btn-primary flex-1">Legg til</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManageLeverandorerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowManageLeverandorerModal(false); setEditingLeverandor(null) }}>
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Administrer leverandører</h3>
              <button onClick={() => { setShowManageLeverandorerModal(false); setEditingLeverandor(null) }} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-dark-200">
              <div className="flex gap-2">
                <input type="text" value={newLeverandorNavn} onChange={e => setNewLeverandorNavn(e.target.value)} className="input flex-1" placeholder="Ny leverandør..." onKeyDown={e => e.key === 'Enter' && handleAddLeverandor()} />
                <button onClick={handleAddLeverandor} className="btn-primary"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {leverandorer.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  {editingLeverandor?.id === l.id ? (
                    <div className="flex-1 flex gap-2">
                      <input type="text" value={editingLeverandor.navn} onChange={e => setEditingLeverandor({ ...editingLeverandor, navn: e.target.value })} className="input flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && handleUpdateLeverandor()} />
                      <button onClick={handleUpdateLeverandor} className="btn-primary text-sm py-1 px-2">Lagre</button>
                      <button onClick={() => setEditingLeverandor(null)} className="btn-secondary text-sm py-1 px-2">Avbryt</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-900 dark:text-white">{l.navn}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingLeverandor(l)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="Rediger">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteLeverandor(l.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Slett">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showManageProdukttypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowManageProdukttypeModal(false); setEditingProdukttype(null) }}>
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Administrer produkttyper</h3>
              <button onClick={() => { setShowManageProdukttypeModal(false); setEditingProdukttype(null) }} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-dark-200">
              <div className="flex gap-2">
                <input type="text" value={newProdukttypeNavn} onChange={e => setNewProdukttypeNavn(e.target.value)} className="input flex-1" placeholder="Ny produkttype..." onKeyDown={e => e.key === 'Enter' && handleAddProdukttype()} />
                <button onClick={handleAddProdukttype} className="btn-primary"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {produkttyper.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  {editingProdukttype?.id === p.id ? (
                    <div className="flex-1 flex gap-2">
                      <input type="text" value={editingProdukttype.navn} onChange={e => setEditingProdukttype({ ...editingProdukttype, navn: e.target.value })} className="input flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && handleUpdateProdukttype()} />
                      <button onClick={handleUpdateProdukttype} className="btn-primary text-sm py-1 px-2">Lagre</button>
                      <button onClick={() => setEditingProdukttype(null)} className="btn-secondary text-sm py-1 px-2">Avbryt</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-900 dark:text-white">{p.navn}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingProdukttype(p)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="Rediger">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProdukttype(p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Slett">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
