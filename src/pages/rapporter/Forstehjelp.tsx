import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, HeartPulse, Building2, Plus, Trash2, Save, Check, X, Edit, Eye } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ForstehjelpPreview } from './ForstehjelpPreview'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
}

interface ForstehjelpEnhet {
  id: string
  anlegg_id: string
  internnummer: string | null
  type: string | null
  plassering: string | null
  etasje: string | null
  produsent: string | null
  utlopsdato: string | null
  status: string | null
  kontrollert: boolean | null
  kommentar: string | null
  kundenavn: string | null
  sjekkpunkter: Record<string, boolean> | null
  tillegg: string[] | null
  created_at: string
}

interface ForstehjelpProps {
  onBack: () => void
  fromAnlegg?: boolean
}

const statusTyper = ['OK', 'Defekt', 'Mangler', 'Utskiftet', 'Utgått']
const etasjeOptions = ['-2.Etg', '-1.Etg', '0.Etg', '1.Etg', '2.Etg', '3.Etg', '4.Etg', '5.Etg', '6.Etg', '7.Etg', '8.Etg', '9.Etg', '10.Etg']
const typeOptions = ['Førstehjelpskoffert', 'Øyeskylling', 'Hjertestarter (AED)', 'Førstehjelpsstasjon', 'Båre', 'Annet']
const tilleggOptions = ['Plasterstasjon', 'Brannskade']

// Sjekkpunkter per type
const sjekkpunkterPerType: Record<string, string[]> = {
  'Førstehjelpskoffert': ['Innhold komplett', 'Utløpsdato OK', 'Plassering synlig', 'Skilt på plass'],
  'Øyeskylling': ['Væske ikke utgått', 'Tilgjengelig', 'Skilt på plass'],
  'Hjertestarter (AED)': ['Batteri OK', 'Elektroder OK', 'Tilgjengelig', 'Skilt på plass'],
  'Førstehjelpsstasjon': ['Innhold komplett', 'Utløpsdato OK', 'Plassering synlig', 'Skilt på plass'],
  'Plasterstasjon': ['Innhold komplett', 'Utløpsdato OK', 'Tilgjengelig'],
  'Båre': ['Tilstand OK', 'Tilgjengelig'],
  'Annet': ['Tilstand OK']
}

export function Forstehjelp({ onBack, fromAnlegg }: ForstehjelpProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [forstehjelpListe, setForstehjelpListe] = useState<ForstehjelpEnhet[]>([])
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'preview'>('list')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFileName, setPdfFileName] = useState('')
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [kommentarModal, setKommentarModal] = useState<{ id: string; internnummer: string; kommentar: string } | null>(null)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ fileName: string; pdfBlob: Blob } | null>(null)
  const [dropboxAvailable, setDropboxAvailable] = useState(false)
  const [kundeId, setKundeId] = useState<string | null>(null)

  // Form state for ny enhet
  const [formData, setFormData] = useState({
    internnummer: '',
    type: '',
    plassering: '',
    etasje: '',
    produsent: '',
    utlopsdato: '',
    status: 'OK',
    kommentar: ''
  })

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
    }
  }, [selectedKunde])

  useEffect(() => {
    if (selectedAnlegg) {
      loadForstehjelp(selectedAnlegg)
      // Sjekk Dropbox-status
      checkDropboxStatus().then(status => {
        setDropboxAvailable(status.connected)
      })
    } else {
      setForstehjelpListe([])
    }
  }, [selectedAnlegg])

  useEffect(() => {
    if (selectedKunde) {
      setKundeId(selectedKunde)
    }
  }, [selectedKunde])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, kundenr, adresse, postnummer, poststed')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  async function loadForstehjelp(anleggId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('anleggsdata_forstehjelp')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('internnummer', { ascending: true })

      if (error) throw error
      setForstehjelpListe(data || [])
    } catch (error) {
      console.error('Feil ved lasting av førstehjelp:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createForstehjelp() {
    if (!selectedAnlegg) return

    try {
      setIsSaving(true)
      const kundeNavn = kunder.find(k => k.id === selectedKunde)?.navn || null

      // Generer neste FH-nummer
      const eksisterendeNummer = forstehjelpListe
        .map(f => f.internnummer)
        .filter(n => n && n.startsWith('FH-'))
        .map(n => parseInt(n!.replace('FH-', '')) || 0)
      const nesteNummer = eksisterendeNummer.length > 0 ? Math.max(...eksisterendeNummer) + 1 : 1
      const internnummer = `FH-${nesteNummer.toString().padStart(3, '0')}`

      const { error } = await supabase
        .from('anleggsdata_forstehjelp')
        .insert({
          anlegg_id: selectedAnlegg,
          internnummer: internnummer,
          type: formData.type || null,
          plassering: formData.plassering || null,
          etasje: formData.etasje || null,
          produsent: formData.produsent || null,
          utlopsdato: formData.utlopsdato || null,
          status: formData.status || 'OK',
          kommentar: formData.kommentar || null,
          kundenavn: kundeNavn,
          kontrollert: false
        })

      if (error) throw error

      // Reset form og last på nytt
      setFormData({
        internnummer: '',
        type: '',
        plassering: '',
        etasje: '',
        produsent: '',
        utlopsdato: '',
        status: 'OK',
        kommentar: ''
      })
      setViewMode('list')
      await loadForstehjelp(selectedAnlegg)
    } catch (error) {
      console.error('Feil ved opprettelse:', error)
      alert('Kunne ikke opprette førstehjelpenhet')
    } finally {
      setIsSaving(false)
    }
  }

  async function updateForstehjelp(id: string, field: string, value: string | boolean | Record<string, boolean> | string[] | null) {
    try {
      const { error } = await supabase
        .from('anleggsdata_forstehjelp')
        .update({ [field]: value })
        .eq('id', id)

      if (error) throw error
      
      // Oppdater lokal state
      setForstehjelpListe(prev => 
        prev.map(f => f.id === id ? { ...f, [field]: value } : f)
      )
    } catch (error) {
      console.error('Feil ved oppdatering:', error)
      alert('Kunne ikke oppdatere')
    }
  }

  async function deleteForstehjelp(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne førstehjelpenheten?')) return

    try {
      const { error } = await supabase
        .from('anleggsdata_forstehjelp')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadForstehjelp(selectedAnlegg)
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette førstehjelpenhet')
    }
  }

  function startEditing(id: string, field: string, currentValue: string | null) {
    setEditingCell({ id, field })
    setEditValue(currentValue || '')
  }

  async function saveInlineEdit(id: string, field: string) {
    await updateForstehjelp(id, field, editValue || null)
    setEditingCell(null)
    setEditValue('')
  }

  function cancelEditing() {
    setEditingCell(null)
    setEditValue('')
  }

  async function toggleSjekkpunkt(id: string, punkt: string, currentSjekkpunkter: Record<string, boolean> | null) {
    const updatedSjekkpunkter = {
      ...(currentSjekkpunkter || {}),
      [punkt]: !(currentSjekkpunkter?.[punkt] || false)
    }
    await updateForstehjelp(id, 'sjekkpunkter', updatedSjekkpunkter)
  }

  async function toggleTillegg(id: string, tillegg: string, currentTillegg: string[] | null) {
    const current = currentTillegg || []
    const isSelected = current.includes(tillegg)
    const updatedTillegg = isSelected 
      ? current.filter(t => t !== tillegg)
      : [...current, tillegg]
    await updateForstehjelp(id, 'tillegg', updatedTillegg)
  }

  async function markerAlleSjekkpunkter() {
    if (!confirm('Vil du markere alle sjekkpunkter som utført?')) return

    try {
      // Oppdater hver enhet med alle sjekkpunkter markert
      for (const enhet of forstehjelpListe) {
        const typeSjekkpunkter = sjekkpunkterPerType[enhet.type || 'Annet'] || sjekkpunkterPerType['Annet']
        const alleSjekkpunkter: Record<string, boolean> = {}
        typeSjekkpunkter.forEach(punkt => {
          alleSjekkpunkter[punkt] = true
        })
        
        await supabase
          .from('anleggsdata_forstehjelp')
          .update({ sjekkpunkter: alleSjekkpunkter })
          .eq('id', enhet.id)
      }
      
      await loadForstehjelp(selectedAnlegg)
    } catch (error) {
      console.error('Feil ved markering:', error)
      alert('Kunne ikke markere alle sjekkpunkter')
    }
  }

  async function genererPDFBlob(): Promise<{ blob: Blob; fileName: string }> {
    const anleggData = anlegg.find(a => a.id === selectedAnlegg)
    const kundeNavn = kunder.find(k => k.id === selectedKunde)?.navn || ''
    const kontrolldato = new Date()

    // Hent kontaktperson
    const { data: kontaktResult } = await supabase
      .from('anlegg_kontaktpersoner')
      .select(`
        kontaktpersoner!inner(
          navn,
          telefon,
          epost
        )
      `)
      .eq('anlegg_id', selectedAnlegg)
      .eq('primar', true)
      .maybeSingle()
    
    const primaerKontakt = Array.isArray(kontaktResult?.kontaktpersoner) 
      ? kontaktResult.kontaktpersoner[0] 
      : kontaktResult?.kontaktpersoner

    // Hent tekniker-info
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: tekniker } = await supabase
      .from('ansatte')
      .select('navn, telefon, epost')
      .eq('epost', authUser?.email)
      .maybeSingle()

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Footer funksjon
    const addFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - 20
      
      // Linje over footer
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(20, footerY - 5, pageWidth - 20, footerY - 5)
      
      // Firmanavn (blå og bold)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 102, 204)
      doc.text('Brannteknisk Service og Vedlikehold AS', 20, footerY)
      
      // Org.nr, e-post og telefon
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600', 20, footerY + 4)
      
      // Adresse
      doc.text('Adresse: Sælenveien 44, 5151 Straumsgrend', 20, footerY + 8)
      
      // Generert dato (lys grå)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      const genererDato = new Date().toLocaleDateString('nb-NO') + ' ' + new Date().toLocaleTimeString('nb-NO')
      doc.text(`Generert: ${genererDato}`, 20, footerY + 13)
      
      // Sidetall (høyre side)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Side ${pageNum} av ${totalPages}`, pageWidth - 20, footerY, { align: 'right' })
      
      doc.setTextColor(0)
    }

    let yPos = 20

    // Logo
    try {
      const logoImg = new Image()
      logoImg.src = '/bsv-logo.png'
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve
        logoImg.onerror = reject
      })
      doc.addImage(logoImg, 'PNG', 20, yPos, 40, 15)
      yPos += 20
    } catch {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 197, 94)
      doc.text('BSV FIRE', 20, yPos)
      doc.setTextColor(0)
      yPos += 10
    }

    // Tittel
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('RAPPORT - FØRSTEHJELP', 20, yPos)
    yPos += 12

    // Anleggsinformasjon - Profesjonell layout (som Nødlys)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.setFillColor(250, 250, 250)
    doc.rect(17, yPos, 85, 28, 'FD')
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('KUNDE', 20, yPos + 5)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(kundeNavn || '-', 20, yPos + 10)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('ANLEGG', 20, yPos + 16)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(anleggData?.anleggsnavn || '-', 20, yPos + 21)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Kontrollert: ${kontrolldato.toLocaleDateString('nb-NO')}`, 20, yPos + 26)
    
    // Neste kontroll boks
    doc.setFillColor(254, 249, 195)
    doc.rect(104, yPos, 91, 28, 'FD')
    
    const nesteKontroll = new Date(kontrolldato)
    nesteKontroll.setMonth(nesteKontroll.getMonth() + 12)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('NESTE KONTROLL', 107, yPos + 5)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(202, 138, 4)
    doc.text(nesteKontroll.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }).toUpperCase(), 107, yPos + 14)
    
    yPos += 32

    // Kontaktpersoner - To kolonner
    const colWidth = 85
    const leftCol = 17
    const rightCol = 104
    
    if (primaerKontakt?.navn) {
      doc.setDrawColor(220, 220, 220)
      doc.setFillColor(250, 250, 250)
      doc.rect(leftCol, yPos, colWidth, 24, 'FD')
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('KONTAKTPERSON', leftCol + 3, yPos + 5)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(primaerKontakt.navn, leftCol + 3, yPos + 11)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      let infoY = yPos + 15
      if (primaerKontakt.telefon) {
        doc.text(`Tlf: ${primaerKontakt.telefon}`, leftCol + 3, infoY)
        infoY += 4
      }
      if (primaerKontakt.epost) {
        doc.text(`E-post: ${primaerKontakt.epost}`, leftCol + 3, infoY)
      }
    }

    if (tekniker?.navn) {
      doc.setFillColor(240, 253, 244)
      doc.rect(rightCol, yPos, colWidth + 6, 24, 'FD')
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('UTFØRT AV', rightCol + 3, yPos + 5)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 163, 74)
      doc.text(tekniker.navn, rightCol + 3, yPos + 11)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      let infoY = yPos + 15
      if (tekniker.telefon) {
        doc.text(`Tlf: ${tekniker.telefon}`, rightCol + 3, infoY)
        infoY += 4
      }
      if (tekniker.epost) {
        doc.text(`E-post: ${tekniker.epost}`, rightCol + 3, infoY)
      }
    }
    
    doc.setTextColor(0, 0, 0)
    if (primaerKontakt?.navn || tekniker?.navn) {
      yPos += 28
    }

    // Statistikk
    const totalt = forstehjelpListe.length
    const ok = forstehjelpListe.filter(f => f.status === 'OK').length
    const defekt = forstehjelpListe.filter(f => f.status === 'Defekt' || f.status === 'Utgått').length
    
    // Beregn sjekkpunkter fullført
    let totalSjekkpunkter = 0
    let fullfortSjekkpunkter = 0
    forstehjelpListe.forEach(f => {
      const typeSjekkpunkter = sjekkpunkterPerType[f.type || 'Annet'] || sjekkpunkterPerType['Annet']
      totalSjekkpunkter += typeSjekkpunkter.length
      typeSjekkpunkter.forEach(punkt => {
        if (f.sjekkpunkter?.[punkt]) fullfortSjekkpunkter++
      })
    })

    // Statistikk - Profesjonell layout
    doc.setFillColor(34, 197, 94)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('STATISTIKK', 20, yPos + 5.5)
    doc.setTextColor(0, 0, 0)
    yPos += 12
    
    // Status-bokser
    const boxWidth = 43
    const boxHeight = 22
    let xPos = 17
    
    // Totalt
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.setFillColor(248, 250, 252)
    doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 197, 94)
    doc.text(totalt.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('TOTALT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
    
    // OK
    xPos += boxWidth + 2
    doc.setFillColor(240, 253, 244)
    doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text(ok.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('OK', xPos + boxWidth/2, yPos + 18, { align: 'center' })
    
    // Sjekkpunkter
    xPos += boxWidth + 2
    doc.setFillColor(249, 250, 251)
    doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text(`${fullfortSjekkpunkter}/${totalSjekkpunkter}`, xPos + boxWidth/2, yPos + 12, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('SJEKKPUNKTER', xPos + boxWidth/2, yPos + 18, { align: 'center' })
    
    // Defekt/Utgått
    xPos += boxWidth + 2
    doc.setFillColor(254, 242, 242)
    doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text(defekt.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('DEFEKT/UTGÅTT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    yPos += boxHeight + 8

    // Ny side for liste
    doc.addPage()
    yPos = 20

    // Førstehjelpsliste (tabell)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('FØRSTEHJELPSLISTE', 20, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Nr', 'Type', 'Plassering', 'Etasje', 'Utløpsdato', 'Status', 'Tillegg', 'Sjekkpunkter']],
      body: forstehjelpListe.map(f => {
        const typeSjekkpunkter = sjekkpunkterPerType[f.type || 'Annet'] || sjekkpunkterPerType['Annet']
        const fullforte = typeSjekkpunkter.filter(p => f.sjekkpunkter?.[p]).length
        const sjekkStatus = `${fullforte}/${typeSjekkpunkter.length}`
        
        return [
          f.internnummer || '-',
          f.type || '-',
          f.plassering || '-',
          f.etasje || '-',
          f.utlopsdato ? new Date(f.utlopsdato).toLocaleDateString('nb-NO') : '-',
          f.status || '-',
          f.tillegg?.join(', ') || '-',
          sjekkStatus
        ]
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10, bottom: 25 },
      didDrawPage: () => {
        // Footer legges til på slutten
      }
    })

    // Kommentarer seksjon - på ny side hvis det finnes kommentarer
    const enheterMedKommentar = forstehjelpListe.filter(f => f.kommentar && f.kommentar.trim() !== '')
    if (enheterMedKommentar.length > 0) {
      doc.addPage()
      let kommentarY = 20

      // Tittel
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('KOMMENTARER', 20, kommentarY)
      kommentarY += 15

      // Gå gjennom hver kommentar
      enheterMedKommentar.forEach((enhet) => {
        // Sjekk om vi trenger ny side
        if (kommentarY > 250) {
          doc.addPage()
          kommentarY = 20
        }

        // Kommentar boks
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.3)
        doc.setFillColor(250, 250, 250)
        
        // Beregn høyde basert på tekst
        const kommentarTekst = enhet.kommentar || ''
        const textLines = doc.splitTextToSize(kommentarTekst, 170)
        const boxHeight = 16 + (textLines.length * 5)
        
        doc.rect(15, kommentarY, 180, boxHeight, 'FD')
        
        // Enhet nummer og type
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(34, 197, 94)
        doc.text(`${enhet.internnummer || '-'}`, 20, kommentarY + 6)
        
        doc.setTextColor(100, 100, 100)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`${enhet.type || '-'} - ${enhet.plassering || '-'}`, 50, kommentarY + 6)
        
        // Kommentar tekst
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text(textLines, 20, kommentarY + 13)
        
        kommentarY += boxHeight + 5
      })

      }

    // Legg til footer på alle sider
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      addFooter(i, pageCount)
    }

    const fileName = `Forstehjelp_${anleggData?.anleggsnavn || 'rapport'}_${new Date().toISOString().split('T')[0]}.pdf`
    const blob = doc.output('blob')
    
    return { blob, fileName }
  }

  async function visForhandsvisning() {
    try {
      const { blob, fileName } = await genererPDFBlob()
      setPdfBlob(blob)
      setPdfFileName(fileName)
      setViewMode('preview')
    } catch (error) {
      console.error('Feil ved PDF-generering:', error)
      alert('Kunne ikke generere PDF')
    }
  }

  async function lagreOgLastNedPDF() {
    // Kan utvides til å lagre til Dropbox etc.
    return Promise.resolve()
  }

  async function genererOgLastNedPDF() {
    try {
      const { blob: pdfBlob } = await genererPDFBlob()
      const anleggData = anlegg.find(a => a.id === selectedAnlegg)
      
      // Konverter norske bokstaver for storage
      const anleggsnavnForStorage = (anleggData?.anleggsnavn || 'rapport')
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const storageFileName = `Rapport_Forstehjelp_${new Date().getFullYear()}_${anleggsnavnForStorage}.pdf`

      // Lagre til Supabase Storage
      const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${storageFileName}`
      const { error: uploadError } = await supabase.storage
        .from('anlegg.dokumenter')
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Generate signed URL
      const { data: urlData } = await supabase.storage
        .from('anlegg.dokumenter')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      // Insert record into dokumenter table
      await supabase
        .from('dokumenter')
        .insert({
          anlegg_id: selectedAnlegg,
          filnavn: storageFileName,
          url: urlData?.signedUrl || null,
          type: 'Førstehjelp Rapport',
          opplastet_dato: new Date().toISOString(),
          storage_path: storagePath
        })

      // Last opp til Dropbox hvis aktivert
      if (dropboxAvailable) {
        try {
          const { data: anleggDataFull } = await supabase
            .from('anlegg')
            .select(`
              anleggsnavn,
              kundenr,
              customer:kundenr (
                kunde_nummer,
                navn
              )
            `)
            .eq('id', selectedAnlegg)
            .single()

          if (anleggDataFull) {
            const kundeNummer = (anleggDataFull.customer as any)?.kunde_nummer
            const kundeNavnDropbox = (anleggDataFull.customer as any)?.navn

            if (kundeNummer && kundeNavnDropbox) {
              console.log('📤 Laster opp førstehjelp-rapport til Dropbox...')
              const dropboxResult = await uploadKontrollrapportToDropbox(
                kundeNummer,
                kundeNavnDropbox,
                anleggData?.anleggsnavn || '',
                storageFileName,
                pdfBlob
              )

              if (dropboxResult.success) {
                console.log('✅ Førstehjelp-rapport lastet opp til Dropbox:', dropboxResult.path)
              } else {
                console.warn('⚠️ Dropbox-opplasting feilet:', dropboxResult.error)
              }
            }
          }
        } catch (dropboxError) {
          console.error('❌ Feil ved Dropbox-opplasting:', dropboxError)
        }
      }

      // Vis dialog for å sette tjeneste til fullført
      setPendingPdfSave({ fileName: storageFileName, pdfBlob })
      setShowFullfortDialog(true)
    } catch (error) {
      console.error('Feil ved PDF-generering:', error)
      alert('Kunne ikke generere rapport')
    }
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med forstehjelp_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ forstehjelp_fullfort: true })
        .eq('id', selectedAnlegg)

      if (error) throw error

      // Last ned PDF
      if (pendingPdfSave) {
        const url = URL.createObjectURL(pendingPdfSave.pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = pendingPdfSave.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      // Lukk fullført-dialogen og vis send rapport-dialogen
      setShowFullfortDialog(false)
      setShowSendRapportDialog(true)
    } catch (error) {
      console.error('Feil ved oppdatering av tjenestestatus:', error)
      alert('Rapport lagret, men kunne ikke oppdatere status')
      setShowFullfortDialog(false)
    }
  }

  function handleSkipFullfort() {
    // Last ned PDF uten å sette fullført
    if (pendingPdfSave) {
      const url = URL.createObjectURL(pendingPdfSave.pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = pendingPdfSave.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    setShowFullfortDialog(false)
  }

  const selectedKundeNavn = kunder.find(k => k.id === selectedKunde)?.navn || ''
  const selectedAnleggNavn = anlegg.find(a => a.id === selectedAnlegg)?.anleggsnavn || ''

  // Preview
  if (viewMode === 'preview' && pdfBlob) {
    return (
      <ForstehjelpPreview
        pdfBlob={pdfBlob}
        fileName={pdfFileName}
        onBack={() => setViewMode('list')}
        onSave={lagreOgLastNedPDF}
      />
    )
  }

  // Create/Edit form
  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('list')}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Ny førstehjelpenhet</h1>
            <p className="text-gray-400">{selectedKundeNavn} - {selectedAnleggNavn}</p>
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Internnummer</label>
              <div className="input bg-gray-700/50 text-gray-400">
                Genereres automatisk (FH-XXX)
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
              >
                <option value="">Velg type</option>
                {typeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plassering</label>
              <input
                type="text"
                value={formData.plassering}
                onChange={(e) => setFormData({ ...formData, plassering: e.target.value })}
                className="input"
                placeholder="F.eks. Resepsjon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Etasje</label>
              <select
                value={formData.etasje}
                onChange={(e) => setFormData({ ...formData, etasje: e.target.value })}
                className="input"
              >
                <option value="">Velg etasje</option>
                {etasjeOptions.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Produsent</label>
              <input
                type="text"
                value={formData.produsent}
                onChange={(e) => setFormData({ ...formData, produsent: e.target.value })}
                className="input"
                placeholder="F.eks. Cederroth"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Utløpsdato</label>
              <input
                type="date"
                value={formData.utlopsdato}
                onChange={(e) => setFormData({ ...formData, utlopsdato: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                {statusTyper.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Kommentar</label>
              <textarea
                value={formData.kommentar}
                onChange={(e) => setFormData({ ...formData, kommentar: e.target.value })}
                className="input"
                rows={3}
                placeholder="Eventuelle merknader..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setViewMode('list')}
              className="btn-secondary"
            >
              Avbryt
            </button>
            <button
              onClick={createForstehjelp}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Lagrer...' : 'Lagre'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (fromAnlegg && state?.anleggId) {
                navigate('/anlegg', { state: { viewAnleggId: state.anleggId } })
              } else {
                onBack()
              }
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Førstehjelp</h1>
            <p className="text-gray-400">Kontroll av førstehjelpstasjoner</p>
          </div>
        </div>
      </div>

      {/* Kunde og Anlegg Velger */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kunde */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg kunde <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Søk etter kunde..."
                value={kundeSok}
                onChange={(e) => setKundeSok(e.target.value)}
                className="input"
              />
              <select
                value={selectedKunde}
                onChange={(e) => {
                  setSelectedKunde(e.target.value)
                  setSelectedAnlegg('')
                }}
                className="input"
                size={Math.min(kunder.filter(k => 
                  k.navn.toLowerCase().includes(kundeSok.toLowerCase())
                ).length + 1, 8)}
              >
                <option value="">Velg kunde</option>
                {kunder
                  .filter(k => k.navn.toLowerCase().includes(kundeSok.toLowerCase()))
                  .map((kunde) => (
                    <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Anlegg */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg anlegg <span className="text-red-500">*</span>
            </label>
            {!selectedKunde ? (
              <div className="input bg-dark-100 text-gray-500 cursor-not-allowed">
                Velg kunde først
              </div>
            ) : anlegg.length === 0 ? (
              <div className="input bg-dark-100 text-gray-500">
                Ingen anlegg funnet for denne kunden
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={anleggSok}
                  onChange={(e) => setAnleggSok(e.target.value)}
                  className="input"
                />
                <select
                  value={selectedAnlegg}
                  onChange={(e) => setSelectedAnlegg(e.target.value)}
                  className="input"
                  size={Math.min(anlegg.filter(a => 
                    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
                  ).length + 1, 8)}
                >
                  <option value="">Velg anlegg</option>
                  {anlegg
                    .filter(a => a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase()))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Valgt anlegg info og liste */}
      {selectedAnlegg && (
        <>
          {/* Valgt anlegg info */}
          <div className="card bg-green-500/5 border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-400">Valgt anlegg</p>
                  <p className="text-white font-medium">{selectedKundeNavn} - {selectedAnleggNavn}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markerAlleSjekkpunkter}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Marker alle kontrollert
                </button>
                <button
                  onClick={genererOgLastNedPDF}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Generer rapport
                </button>
                <button
                  onClick={visForhandsvisning}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Forhåndsvis PDF
                </button>
                <button
                  onClick={() => setViewMode('create')}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ny enhet
                </button>
              </div>
            </div>
          </div>

          {/* Statistikk */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card bg-gray-500/10">
              <p className="text-sm text-gray-400">Totalt</p>
              <p className="text-2xl font-bold text-white">{forstehjelpListe.length}</p>
            </div>
            <div className="card bg-green-500/10">
              <p className="text-sm text-gray-400">OK</p>
              <p className="text-2xl font-bold text-green-500">{forstehjelpListe.filter(f => f.status === 'OK').length}</p>
            </div>
            <div className="card bg-red-500/10">
              <p className="text-sm text-gray-400">Defekt/Utgått</p>
              <p className="text-2xl font-bold text-red-500">{forstehjelpListe.filter(f => f.status === 'Defekt' || f.status === 'Utgått').length}</p>
            </div>
            <div className="card bg-blue-500/10">
              <p className="text-sm text-gray-400">Kontrollert</p>
              <p className="text-2xl font-bold text-blue-500">{forstehjelpListe.filter(f => f.kontrollert).length}</p>
            </div>
          </div>

          {/* Liste */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Førstehjelpenheter ({forstehjelpListe.length})</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : forstehjelpListe.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <HeartPulse className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ingen førstehjelpenheter registrert</p>
                <button
                  onClick={() => setViewMode('create')}
                  className="btn-primary mt-4"
                >
                  Legg til første enhet
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Nr</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Type</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Plassering</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Etasje</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Utløpsdato</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Tillegg</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Sjekkpunkter</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Kommentar</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forstehjelpListe.map((enhet) => (
                      <tr key={enhet.id} className="border-b border-gray-800 hover:bg-dark-100">
                        {/* Internnummer */}
                        <td className="py-3 px-2">
                          {editingCell?.id === enhet.id && editingCell?.field === 'internnummer' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input py-1 px-2 text-sm w-20"
                                autoFocus
                              />
                              <button onClick={() => saveInlineEdit(enhet.id, 'internnummer')} className="text-green-500 hover:text-green-400">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="text-red-500 hover:text-red-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEditing(enhet.id, 'internnummer', enhet.internnummer)}
                              className="cursor-pointer hover:text-primary text-white"
                            >
                              {enhet.internnummer || '-'}
                            </span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-2">
                          {editingCell?.id === enhet.id && editingCell?.field === 'type' ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input py-1 px-2 text-sm"
                                autoFocus
                              >
                                <option value="">Velg type</option>
                                {typeOptions.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <button onClick={() => saveInlineEdit(enhet.id, 'type')} className="text-green-500 hover:text-green-400">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="text-red-500 hover:text-red-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEditing(enhet.id, 'type', enhet.type)}
                              className="cursor-pointer hover:text-primary text-white"
                            >
                              {enhet.type || '-'}
                            </span>
                          )}
                        </td>

                        {/* Plassering */}
                        <td className="py-3 px-2">
                          {editingCell?.id === enhet.id && editingCell?.field === 'plassering' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input py-1 px-2 text-sm w-32"
                                autoFocus
                              />
                              <button onClick={() => saveInlineEdit(enhet.id, 'plassering')} className="text-green-500 hover:text-green-400">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="text-red-500 hover:text-red-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEditing(enhet.id, 'plassering', enhet.plassering)}
                              className="cursor-pointer hover:text-primary text-white"
                            >
                              {enhet.plassering || '-'}
                            </span>
                          )}
                        </td>

                        {/* Etasje */}
                        <td className="py-3 px-2">
                          {editingCell?.id === enhet.id && editingCell?.field === 'etasje' ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input py-1 px-2 text-sm"
                                autoFocus
                              >
                                <option value="">Velg</option>
                                {etasjeOptions.map(e => (
                                  <option key={e} value={e}>{e}</option>
                                ))}
                              </select>
                              <button onClick={() => saveInlineEdit(enhet.id, 'etasje')} className="text-green-500 hover:text-green-400">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="text-red-500 hover:text-red-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEditing(enhet.id, 'etasje', enhet.etasje)}
                              className="cursor-pointer hover:text-primary text-white"
                            >
                              {enhet.etasje || '-'}
                            </span>
                          )}
                        </td>

                        {/* Utløpsdato */}
                        <td className="py-3 px-2">
                          {editingCell?.id === enhet.id && editingCell?.field === 'utlopsdato' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input py-1 px-2 text-sm"
                                autoFocus
                              />
                              <button onClick={() => saveInlineEdit(enhet.id, 'utlopsdato')} className="text-green-500 hover:text-green-400">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="text-red-500 hover:text-red-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEditing(enhet.id, 'utlopsdato', enhet.utlopsdato)}
                              className={`cursor-pointer hover:text-primary ${enhet.utlopsdato && new Date(enhet.utlopsdato) < new Date() ? 'text-red-500' : 'text-white'}`}
                            >
                              {enhet.utlopsdato ? new Date(enhet.utlopsdato).toLocaleDateString('nb-NO') : '-'}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-2">
                          <select
                            value={enhet.status || ''}
                            onChange={(e) => updateForstehjelp(enhet.id, 'status', e.target.value)}
                            className={`py-1 px-2 rounded text-sm font-medium ${
                              enhet.status === 'OK' ? 'bg-green-500/20 text-green-500' :
                              enhet.status === 'Defekt' || enhet.status === 'Utgått' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }`}
                          >
                            {statusTyper.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>

                        {/* Tillegg */}
                        <td className="py-3 px-2">
                          {enhet.type === 'Øyeskylling' || enhet.type === 'Hjertestarter (AED)' || enhet.type === 'Båre' ? (
                            <span className="text-gray-500 text-xs">-</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {tilleggOptions.map((tillegg) => {
                                const isSelected = enhet.tillegg?.includes(tillegg) || false
                                return (
                                  <button
                                    key={tillegg}
                                    onClick={() => toggleTillegg(enhet.id, tillegg, enhet.tillegg)}
                                    className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 whitespace-nowrap ${
                                      isSelected 
                                        ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' 
                                        : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                                    }`}
                                    title={tillegg}
                                  >
                                    {isSelected && <Check className="w-3 h-3" />}
                                    {tillegg}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </td>

                        {/* Sjekkpunkter */}
                        <td className="py-3 px-2">
                          <div className="flex flex-col gap-1">
                            {(sjekkpunkterPerType[enhet.type || 'Annet'] || sjekkpunkterPerType['Annet']).map((punkt) => {
                              const isChecked = enhet.sjekkpunkter?.[punkt] || false
                              return (
                                <button
                                  key={punkt}
                                  onClick={() => toggleSjekkpunkt(enhet.id, punkt, enhet.sjekkpunkter)}
                                  className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 whitespace-nowrap ${
                                    isChecked 
                                      ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                                      : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                                  }`}
                                  title={punkt}
                                >
                                  {isChecked && <Check className="w-3 h-3" />}
                                  {punkt}
                                </button>
                              )
                            })}
                          </div>
                        </td>

                        {/* Kommentar */}
                        <td className="py-3 px-2">
                          <span
                            onClick={() => setKommentarModal({ id: enhet.id, internnummer: enhet.internnummer || '-', kommentar: enhet.kommentar || '' })}
                            className="cursor-pointer hover:text-primary text-gray-400 text-sm max-w-[120px] truncate block"
                            title={enhet.kommentar || 'Klikk for å legge til'}
                          >
                            {enhet.kommentar || '-'}
                          </span>
                        </td>

                        {/* Handlinger */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setKommentarModal({ id: enhet.id, internnummer: enhet.internnummer || '-', kommentar: enhet.kommentar || '' })}
                              className="p-1 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded"
                              title="Rediger kommentar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteForstehjelp(enhet.id)}
                              className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                              title="Slett"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Kommentar Modal */}
      {kommentarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-200 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Rediger kommentar</h3>
              <button
                onClick={() => setKommentarModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-3">Enhet: <span className="text-green-500 font-medium">{kommentarModal.internnummer}</span></p>
            <textarea
              value={kommentarModal.kommentar}
              onChange={(e) => setKommentarModal({ ...kommentarModal, kommentar: e.target.value })}
              className="input w-full h-32 resize-none"
              placeholder="Skriv kommentar her..."
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setKommentarModal(null)}
                className="btn-secondary"
              >
                Avbryt
              </button>
              <button
                onClick={async () => {
                  await updateForstehjelp(kommentarModal.id, 'kommentar', kommentarModal.kommentar || null)
                  setKommentarModal(null)
                }}
                className="btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TjenesteFullfort Dialog */}
      <TjenesteFullfortDialog
        isOpen={showFullfortDialog}
        onCancel={handleSkipFullfort}
        onConfirm={handleTjenesteFullfort}
        tjeneste="Førstehjelp"
      />

      {/* SendRapport Dialog */}
      <SendRapportDialog
        isOpen={showSendRapportDialog}
        onCancel={() => setShowSendRapportDialog(false)}
        onConfirm={() => {
          setShowSendRapportDialog(false)
          navigate('/send-rapporter', { state: { anleggId: selectedAnlegg, kundeId: kundeId || selectedKunde } })
        }}
      />

      {/* Info Section */}
      <div className="card bg-green-500/5 border-green-500/20">
        <div className="flex items-start gap-3">
          <HeartPulse className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Om førstehjelp</h3>
            <p className="text-gray-400 text-sm mb-3">
              Førstehjelp-modulen lar deg registrere og administrere kontroller for førstehjelpstasjoner.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Velg kunde og anlegg for å starte
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Registrer førstehjelpstasjoner med type, plassering og utløpsdato
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Marker enheter som kontrollert
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Eksporter rapporter til PDF
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
