import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, HeartPulse, Save, Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocation, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ForstehjelpPreview } from './ForstehjelpPreview'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'
import { ForstehjelpListe } from './forstehjelp/ForstehjelpListe'
import { Combobox } from '@/components/ui/Combobox'

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
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'preview'>('list')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFileName, setPdfFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ fileName: string; pdfBlob: Blob } | null>(null)
  const [dropboxAvailable, setDropboxAvailable] = useState(false)
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
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
        .select('id, navn').or('skjult.is.null,skjult.eq.false')
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
        .select('id, anleggsnavn, kundenr, adresse, postnummer, poststed').or('skjult.is.null,skjult.eq.false')
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
      toast.error('Kunne ikke opprette enheten', error)
    } finally {
      setIsSaving(false)
    }
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
      toast.error('Kunne ikke markere alle sjekkpunkter', error)
    }
  }


  /** Lagrer én endring med en gang og ruller tilbake hvis det feiler */
  async function lagreEndring(id: string, patch: Partial<ForstehjelpEnhet>) {
    const forrige = forstehjelpListe.find(f => f.id === id)
    if (!forrige) return
    setForstehjelpListe(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
    setLagrer(prev => new Set(prev).add(id))
    const { error } = await supabase.from('anleggsdata_forstehjelp').update(patch).eq('id', id)
    setLagrer(prev => { const n = new Set(prev); n.delete(id); return n })
    if (error) {
      setForstehjelpListe(prev => prev.map(f => f.id === id ? forrige : f))
      toast.error('Kunne ikke lagre', error)
    }
  }

  /** Samme endring på flere enheter (velg flere) */
  async function lagreEndringFlere(ids: string[], patch: Partial<ForstehjelpEnhet>) {
    if (ids.length === 0) return
    const { error } = await supabase.from('anleggsdata_forstehjelp').update(patch).in('id', ids)
    if (error) { toast.error('Kunne ikke oppdatere', error); return }
    setForstehjelpListe(prev => prev.map(f => ids.includes(f.id) ? { ...f, ...patch } : f))
    toast.success(`${ids.length} ${ids.length === 1 ? 'enhet' : 'enheter'} oppdatert`)
  }

  async function slettEnhet(e: ForstehjelpEnhet) {
    if (!confirm(`Slette ${[e.internnummer, e.type, e.plassering].filter(Boolean).join(' · ') || 'enheten'}?`)) return
    const { error } = await supabase.from('anleggsdata_forstehjelp').delete().eq('id', e.id)
    if (error) { toast.error('Kunne ikke slette', error); return }
    setForstehjelpListe(prev => prev.filter(f => f.id !== e.id))
    toast.success('Enheten er slettet')
  }

  async function slettFlere(ids: string[]) {
    if (ids.length === 0) return
    const { error } = await supabase.from('anleggsdata_forstehjelp').delete().in('id', ids)
    if (error) { toast.error('Kunne ikke slette', error); throw error }
    setForstehjelpListe(prev => prev.filter(f => !ids.includes(f.id)))
    toast.success(`${ids.length} ${ids.length === 1 ? 'enhet' : 'enheter'} slettet`)
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

    // Hovedtabell uten sjekkpunkter
    autoTable(doc, {
      startY: yPos,
      head: [['Nr', 'Type', 'Plassering', 'Etasje', 'Utløpsdato', 'Status', 'Tillegg']],
      body: forstehjelpListe.map(f => [
        f.internnummer || '-',
        f.type || '-',
        f.plassering || '-',
        f.etasje || '-',
        f.utlopsdato ? new Date(f.utlopsdato).toLocaleDateString('nb-NO') : '-',
        f.status || '-',
        f.tillegg?.join(', ') || '-'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10, bottom: 25 },
      didDrawPage: () => {
        // Footer legges til på slutten
      }
    })

    // Sjekkpunkter seksjon - egen tabell
    yPos = (doc as any).lastAutoTable.finalY + 15
    
    // Sjekk om vi trenger ny side
    if (yPos > 240) {
      doc.addPage()
      yPos = 20
    }

    doc.setFillColor(34, 197, 94)
    doc.rect(10, yPos, 190, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('SJEKKPUNKTER OVERSIKT', 15, yPos + 5.5)
    doc.setTextColor(0, 0, 0)
    yPos += 12

    // Sjekkpunkter-tabell med kolonner for hver sjekk
    autoTable(doc, {
      startY: yPos,
      head: [['Nr', 'Type', 'Innhold', 'Utlop OK', 'Synlig', 'Skilt']],
      body: forstehjelpListe.map(f => [
        f.internnummer || '-',
        f.type || '-',
        { content: f.sjekkpunkter?.['Innhold komplett'] ? 'OK' : 'X', styles: { textColor: f.sjekkpunkter?.['Innhold komplett'] ? [34, 197, 94] : [220, 38, 38], fontStyle: 'bold' } },
        { content: (f.sjekkpunkter?.['Utløpsdato OK'] || f.sjekkpunkter?.['Væske ikke utgått'] || f.sjekkpunkter?.['Batteri OK']) ? 'OK' : 'X', styles: { textColor: (f.sjekkpunkter?.['Utløpsdato OK'] || f.sjekkpunkter?.['Væske ikke utgått'] || f.sjekkpunkter?.['Batteri OK']) ? [34, 197, 94] : [220, 38, 38], fontStyle: 'bold' } },
        { content: (f.sjekkpunkter?.['Plassering synlig'] || f.sjekkpunkter?.['Tilgjengelig'] || f.sjekkpunkter?.['Tilstand OK']) ? 'OK' : 'X', styles: { textColor: (f.sjekkpunkter?.['Plassering synlig'] || f.sjekkpunkter?.['Tilgjengelig'] || f.sjekkpunkter?.['Tilstand OK']) ? [34, 197, 94] : [220, 38, 38], fontStyle: 'bold' } },
        { content: f.sjekkpunkter?.['Skilt på plass'] ? 'OK' : 'X', styles: { textColor: f.sjekkpunkter?.['Skilt på plass'] ? [34, 197, 94] : [220, 38, 38], fontStyle: 'bold' } }
      ]),
      styles: { fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontSize: 8 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 22 },
        1: { halign: 'left', cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 10, right: 10, bottom: 25 }
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
      toast.error('Kunne ikke lage PDF-en', error)
    }
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
                toast.success('Rapporten er lagret i Dropbox')
              } else {
                toast.warning('Rapporten er lagret, men ikke i Dropbox', dropboxResult.error)
              }
            }
          }
        } catch (dropboxError) {
          console.error('Feil ved Dropbox-opplasting:', dropboxError)
            toast.warning('Rapporten er lagret, men ikke i Dropbox', dropboxError instanceof Error ? dropboxError.message : undefined)
        }
      }

      // Vis dialog for å sette tjeneste til fullført
      setPendingPdfSave({ fileName: storageFileName, pdfBlob })
      setShowFullfortDialog(true)
    } catch (error) {
      console.error('Feil ved PDF-generering:', error)
      toast.error('Kunne ikke lage rapporten', error)
    }
  }

  async function lagreOgLastNedPDF() {
    await genererOgLastNedPDF()
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
      toast.warning('Rapporten er lagret, men statusen ble ikke oppdatert')
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
    <div className="space-y-5">
      {/* Brødsmule */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button
          type="button"
          onClick={() => { if (fromAnlegg && state?.anleggId) navigate('/anlegg', { state: { viewAnleggId: state.anleggId } }); else onBack() }}
          className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"
        >
          <ArrowLeft className="w-4 h-4" />{fromAnlegg ? 'Anlegget' : 'Rapporter'}
        </button>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
          <HeartPulse className="w-6 h-6 text-primary" />Førstehjelp
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {selectedAnlegg
            ? <>{selectedKundeNavn} · <b className="font-semibold text-gray-700 dark:text-gray-300">{selectedAnleggNavn}</b> · <button type="button" onClick={() => setSelectedAnlegg('')} className="hover:text-primary underline-offset-2 hover:underline">bytt anlegg</button></>
            : 'Kofferter, øyeskylling og hjertestartere – velg anlegg for å starte'}
        </p>
      </header>

      {/* Velger */}
      {!selectedAnlegg && (
        <div className="card space-y-4 max-w-2xl">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Kunde</span>
            <Combobox
              options={kunder.map(k => ({ id: k.id, value: k.id, label: k.navn }))}
              value={selectedKunde}
              onChange={val => { setSelectedKunde(val); setSelectedAnlegg('') }}
              placeholder="Velg kunde…"
              searchPlaceholder="Søk kunde…"
              emptyMessage="Ingen kunder funnet"
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Anlegg</span>
            {!selectedKunde ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Velg kunde først.</p>
            ) : anlegg.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen anlegg på denne kunden.</p>
            ) : (
              <Combobox
                options={anlegg.map(a => ({ id: a.id, value: a.id, label: a.anleggsnavn }))}
                value={selectedAnlegg}
                onChange={setSelectedAnlegg}
                placeholder="Velg anlegg…"
                searchPlaceholder="Søk anlegg…"
                emptyMessage="Ingen anlegg funnet"
              />
            )}
          </div>
        </div>
      )}

      {/* Valgt anlegg info og liste */}
      {selectedAnlegg && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedKundeNavn} · <b className="font-semibold text-gray-700 dark:text-gray-300">{selectedAnleggNavn}</b>
            </p>
            <div className="flex items-center gap-2">
              <Button icon={<Check />} onClick={markerAlleSjekkpunkter}>Huk av alle sjekkpunkter</Button>
              <Button icon={<FileText />} onClick={visForhandsvisning} disabled={forstehjelpListe.length === 0}>Rapport</Button>
            </div>
          </div>

          {loading ? (
            <div className="card py-12 text-center text-sm text-gray-500">Laster utstyret…</div>
          ) : (
            <ForstehjelpListe
              enheter={forstehjelpListe}
              lagrer={lagrer}
              onEndre={lagreEndring}
              onEndreFlere={lagreEndringFlere}
              onSlett={slettEnhet}
              onSlettFlere={slettFlere}
              onNy={() => setViewMode('create')}
            />
          )}
        </>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Om førstehjelp</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
              Førstehjelp-modulen lar deg registrere og administrere kontroller for førstehjelpstasjoner.
            </p>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
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
