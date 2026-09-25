import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Shield, Eye, ClipboardCheck, Calculator } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useOfflineQueue } from '@/hooks/useOffline'
import { Button, IconButton } from '@/components/ui/Button'
import { UtstyrListe, type FeltDef, type StatusDef } from '@/components/utstyr/UtstyrListe'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannslukkerPreview } from '../BrannslukkerPreview'
import { useAuthStore } from '@/store/authStore'
import { KommentarViewBrannslukkere } from './KommentarViewBrannslukkere'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { KontrolldatoVelger } from '@/components/KontrolldatoVelger'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'
import { CO2VektKalkulator } from '@/components/CO2VektKalkulator'

interface Brannslukker {
  id: string
  anlegg_id: string
  apparat_nr?: string | null
  plassering?: string | null
  etasje?: string | null
  produsent?: string | null
  modell?: string | null
  brannklasse?: string | null
  produksjonsaar?: string | null
  service?: string | null
  siste_kontroll?: string | null
  status?: string[] | null
  type_avvik?: string[] | null
}

interface BrannslukkereViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onBack: () => void
}

const statusAlternativer = [
  'OK',
  'OK Byttet',
  'Byttet ved kontroll',
  'Ikke funnet',
  'Ikke tilkomst',
  'Utgått',
  'Skadet',
  'Mangler skilt',
  'Manometerfeil',
  'Ikke trykk',
  'Fjernet'
]

const modellAlternativer = [
  '',
  '2KG Pulver',
  '6KG Pulver',
  '9KG Pulver',
  '12KG Pulver',
  '6L Skum',
  '4L Vann',
  '6L Vann',
  '9L Vann',
  '2KG CO2',
  '5KG CO2',
  '10KG CO2',
  '6L Litium',
]

const brannklasseAlternativer = [
  'A', 'AB', 'ABC', 'ABF', 'B', 'AF'
]

const STATUS_DEF: StatusDef = {
  alle: statusAlternativer,
  ok: new Set(['OK', 'OK Byttet', 'Byttet ved kontroll']),
  noytral: new Set(['Ikke funnet', 'Ikke tilkomst', 'Fjernet']),
}

const etasjeAlternativer = [
  '',
  ...Array.from({ length: 15 }, (_, i) => `${i - 2} Etg`),
  'Ukjent'
]

const FELTER: FeltDef<Brannslukker>[] = [
  { key: 'plassering', navn: 'Plassering', placeholder: 'Gang', forslag: true },
  { key: 'etasje', navn: 'Etasje', bredde: 'w-24', type: 'select', valg: etasjeAlternativer, mobil: true },
  { key: 'produsent', navn: 'Produsent', bredde: 'w-28', forslag: true },
  { key: 'modell', navn: 'Modell', bredde: 'w-32', type: 'valgEllerTekst', valg: modellAlternativer, mobil: true },
  { key: 'brannklasse', navn: 'Klasse', bredde: 'w-20', type: 'valgEllerTekst', valg: brannklasseAlternativer, mobil: true },
  { key: 'produksjonsaar', navn: 'Prod.år', bredde: 'w-20', placeholder: '2019', mobil: true },
  { key: 'service', navn: 'Service (C)', bredde: 'w-24', placeholder: 'År' },
  { key: 'siste_kontroll', navn: 'Kontroll (B)', bredde: 'w-28', type: 'aar', placeholder: 'År' },
]

export function BrannslukkereView({ anleggId, kundeNavn, anleggNavn, onBack }: BrannslukkereViewProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [slukkere, setSlukkere] = useState<Brannslukker[]>([])
  const [loading, setLoading] = useState(false)
  const { isOnline, queueUpdate, queueInsert } = useOfflineQueue()
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ mode: 'save' | 'download'; doc: any; fileName: string; pdfBlob: Blob } | null>(null)
  const [kundeId, setKundeId] = useState<string | null>(null)
  const [evakueringsplanStatus, setEvakueringsplanStatus] = useState('')
  const [dropboxAvailable, setDropboxAvailable] = useState(false)
  const [kontrolldato, setKontrolldato] = useState<Date>(new Date())
  const [co2KalkulatorData, setCo2KalkulatorData] = useState<{ modell: string; apparatNr: string } | null>(null)

  useEffect(() => {
    loadSlukkere()
    loadEvakueringsplan(anleggId)
    // Sjekk Dropbox-status
    checkDropboxStatus().then(status => setDropboxAvailable(status.connected))
  }, [anleggId])

  async function loadSlukkere() {
    try {
      setLoading(true)
      
      // Hent kundeId fra anlegg
      const { data: anleggData } = await supabase
        .from('anlegg')
        .select('kundenr')
        .eq('id', anleggId)
        .single()
      
      if (anleggData) {
        setKundeId(anleggData.kundenr)
      }
      
      const { data, error } = await supabase
        .from('anleggsdata_brannslukkere')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('apparat_nr', { ascending: true, nullsFirst: false })

      if (error) throw error
      setSlukkere((data || []) as Brannslukker[])
    } catch (error) {
      console.error('Feil ved lasting av brannslukkere:', error)
      toast.error('Kunne ikke laste brannslukkere', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadEvakueringsplan(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      setEvakueringsplanStatus(data?.status || '')
    } catch (error) {
      console.error('Feil ved lasting av evakueringsplan:', error)
    }
  }

  async function saveEvakueringsplan(status: string = evakueringsplanStatus) {
    try {
      const { data: existing } = await supabase
        .from('evakueringsplan_status')
        .select('id')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('evakueringsplan_status')
          .update({ status: status })
          .eq('anlegg_id', anleggId)
      } else {
        await supabase
          .from('evakueringsplan_status')
          .insert({ anlegg_id: anleggId, status: status })
      }
    } catch (error) {
      console.error('Feil ved lagring av evakueringsplan:', error)
      throw error
    }
  }

  /** Lagrer én endring med en gang (offline: kø). Ruller tilbake ved feil. */
  async function lagreEndring(id: string, patch: Partial<Brannslukker>) {
    const forrige = slukkere.find(x => x.id === id)
    if (!forrige) return
    // Status settes → siste kontroll = i år (som «Fyll inn nåværende år»-knappen gjorde)
    const aar = String(new Date().getFullYear())
    if (patch.status && patch.status.length > 0 && forrige.siste_kontroll !== aar) patch = { ...patch, siste_kontroll: aar }
    setSlukkere(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
    if (!isOnline) { queueUpdate('anleggsdata_brannslukkere', { id, ...patch }); return }
    setLagrer(prev => new Set(prev).add(id))
    const { error } = await supabase.from('anleggsdata_brannslukkere').update(patch).eq('id', id)
    setLagrer(prev => { const n = new Set(prev); n.delete(id); return n })
    if (error) {
      const tilbake: Partial<Brannslukker> = {}
      for (const k of Object.keys(patch) as (keyof Brannslukker)[]) (tilbake as Record<string, unknown>)[k] = forrige[k]
      setSlukkere(prev => prev.map(x => x.id === id ? { ...x, ...tilbake } : x))
      toast.error('Kunne ikke lagre endringen', error)
    }
  }

  async function lagreEndringFlere(ids: string[], patch: Partial<Brannslukker>) {
    if (ids.length === 0) return
    setSlukkere(prev => prev.map(x => ids.includes(x.id) ? { ...x, ...patch } : x))
    if (!isOnline) { ids.forEach(id => queueUpdate('anleggsdata_brannslukkere', { id, ...patch })); return }
    const { error } = await supabase.from('anleggsdata_brannslukkere').update(patch).in('id', ids)
    if (error) { toast.error('Kunne ikke oppdatere', error); await loadSlukkere(); return }
    toast.success(`${ids.length} brannslukkere oppdatert`)
  }

  /** Nye apparater nummereres etter høyeste eksisterende nummer og lagres med en gang. */
  async function leggTilNye(antall: number) {
    const hoyeste = slukkere.reduce((m, x) => Math.max(m, parseInt(x.apparat_nr || '0') || 0), 0)
    const nye = Array.from({ length: antall }, (_, i) => ({ anlegg_id: anleggId, apparat_nr: String(hoyeste + i + 1), brannklasse: 'A', status: [] as string[] }))
    if (!isOnline) { nye.forEach(n => queueInsert('anleggsdata_brannslukkere', n)); toast.info('Lagt i kø – vises når du er på nett igjen'); return }
    const { error } = await supabase.from('anleggsdata_brannslukkere').insert(nye)
    if (error) { toast.error('Kunne ikke legge til', error); return }
    await loadSlukkere()
    toast.success(antall === 1 ? `Apparat ${hoyeste + 1} lagt til` : `${antall} apparater lagt til (${hoyeste + 1}–${hoyeste + antall})`)
  }

  async function deleteBrannslukker(s: Brannslukker) {
    if (!confirm(`Slette apparat ${s.apparat_nr ?? ''}${s.plassering ? ` (${s.plassering})` : ''}?`)) return
    const { error } = await supabase.from('anleggsdata_brannslukkere').delete().eq('id', s.id)
    if (error) { toast.error('Kunne ikke slette', error); return }
    setSlukkere(prev => prev.filter(x => x.id !== s.id))
    toast.success('Apparat slettet')
  }

  async function genererRapport(mode: 'preview' | 'save' | 'download' = 'preview') {
    try {
      setLoading(true)

      // Hent kontaktperson via junction table (samme metode som røykluker)
      const { data: kontaktResult } = await supabase
        .from('anlegg_kontaktpersoner')
        .select(`
          kontaktpersoner!inner(
            navn,
            telefon,
            epost
          )
        `)
        .eq('anlegg_id', anleggId)
        .eq('primar', true)
        .maybeSingle()
      
      const kontaktData = Array.isArray(kontaktResult?.kontaktpersoner) 
        ? kontaktResult.kontaktpersoner[0] 
        : kontaktResult?.kontaktpersoner

      // Hent innlogget bruker (tekniker) data
      const { data: tekniker, error: teknikerError } = await supabase
        .from('ansatte')
        .select('navn, telefon, epost, gronn_sertifikat_nummer')
        .eq('epost', user?.email)
        .maybeSingle()

      if (teknikerError) {
        console.error('Feil ved henting av tekniker:', teknikerError)
      }

      // Hent kommentarer for anlegget
      const { data: kommentarer } = await supabase
        .from('kommentar_brannslukkere')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('created_at', { ascending: false })

      const doc = new jsPDF()
      let yPos = 20

      // Logo - bruk fetch for å laste bildet
      try {
        const response = await fetch('/bsv-logo.png')
        const blob = await response.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        doc.addImage(base64, 'PNG', 20, yPos, 40, 15)
        yPos += 25
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('BSV FIRE', 20, yPos)
        doc.setTextColor(0)
        yPos += 15
      }

      // Tittel
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RAPPORT - BRANNSLUKKERE', 20, yPos)
      yPos += 12

      // Anleggsinformasjon - Profesjonell layout
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
      doc.text(kundeNavn, 20, yPos + 10)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('ANLEGG', 20, yPos + 16)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(anleggNavn, 20, yPos + 21)
      
      const idag = kontrolldato
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Kontrollert: ${idag.toLocaleDateString('nb-NO')}`, 20, yPos + 26)
      
      // Neste kontroll boks
      doc.setFillColor(254, 249, 195)
      doc.rect(104, yPos, 91, 28, 'FD')
      
      const nesteKontroll = new Date(idag)
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
      
      if (kontaktData?.navn) {
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
        doc.text(kontaktData.navn, leftCol + 3, yPos + 11)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        let infoY = yPos + 15
        if (kontaktData.telefon) {
          doc.text(`Tlf: ${kontaktData.telefon}`, leftCol + 3, infoY)
          infoY += 4
        }
        if (kontaktData.epost) {
          doc.text(`E-post: ${kontaktData.epost}`, leftCol + 3, infoY)
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
        if (tekniker.gronn_sertifikat_nummer) {
          doc.text(`Sertifikat: ${tekniker.gronn_sertifikat_nummer}`, rightCol + 3, infoY)
        }
      }
      
      doc.setTextColor(0, 0, 0)
      yPos += 28

      // Statistikk
      const totalt = slukkere.length
      const ok = slukkere.filter(s => 
        s.status?.includes('OK') || s.status?.includes('OK Byttet') || s.status?.includes('Byttet ved kontroll')
      ).length
      const ikkeKontrollert = slukkere.filter(s => 
        s.status?.includes('Ikke funnet') || s.status?.includes('Ikke tilkomst')
      ).length
      const avvik = slukkere.filter(s => 
        s.status?.some(st => !['OK', 'OK Byttet', 'Byttet ved kontroll', 'Ikke funnet', 'Ikke tilkomst'].includes(st))
      ).length

      // Statistikk - Profesjonell layout
      doc.setFillColor(41, 128, 185)
      doc.rect(15, yPos, 180, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('STATISTIKK', 20, yPos + 5.5)
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      // Status-seksjon
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
      doc.setTextColor(41, 128, 185)
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
      
      // Ikke kontrollert
      xPos += boxWidth + 2
      doc.setFillColor(249, 250, 251)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text(ikkeKontrollert.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('IKKE KONTR.', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Avvik
      xPos += boxWidth + 2
      doc.setFillColor(254, 242, 242)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(avvik.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('AVVIK', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

      // Hent evakueringsplan-status for tilleggsinformasjon
      const { data: evakPlan } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      // Tilleggsinformasjon (Evakueringsplan) - på side 1 etter statistikk
      if (evakPlan?.status) {
        yPos += 8
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('Tilleggsinformasjon', 17, yPos)
        yPos += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Evakueringsplaner: ${evakPlan.status}`, 17, yPos)
      }

      // Ny side for tabell
      doc.addPage()
      yPos = 20

      // Sorter etter apparat_nr
      const sortedForPdf = [...slukkere].sort((a, b) => {
        const numA = parseInt(a.apparat_nr || '0') || 0
        const numB = parseInt(b.apparat_nr || '0') || 0
        return numA - numB
      })

      // Tabell
      autoTable(doc, {
        startY: yPos,
        head: [['Nr', 'Plassering', 'Etasje', 'Produsent', 'Modell', 'Klasse', 'År', 'Service', 'Siste kontroll', 'Status']],
        body: sortedForPdf.map(s => [
          s.apparat_nr || '-',
          s.plassering || '-',
          s.etasje || '-',
          s.produsent || '-',
          s.modell || '-',
          s.brannklasse || '-',
          s.produksjonsaar || '-',
          s.service || '-',
          s.siste_kontroll || '-',
          // Vis alle statuser kommaseparert
          (Array.isArray(s.status) && s.status.length > 0) 
            ? s.status.join(', ') 
            : 'OK'
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 5, right: 5, bottom: 30 },
        columnStyles: {
          0: { cellWidth: 12 },  // Nr
          1: { cellWidth: 28 },  // Plassering
          2: { cellWidth: 16 },  // Etasje
          3: { cellWidth: 20 },  // Produsent (krympet)
          4: { cellWidth: 22 },  // Modell
          5: { cellWidth: 14 },  // Klasse (krympet)
          6: { cellWidth: 14 },  // År
          7: { cellWidth: 16 },  // Service
          8: { cellWidth: 22 },  // Siste kontroll
          9: { cellWidth: 'auto' },  // Status
        },
      })

      // Kommentarer seksjon - på ny side hvis det finnes kommentarer
      if (kommentarer && kommentarer.length > 0) {
        doc.addPage()
        yPos = 20

        // Kommentarer header med bakgrunn
        doc.setFillColor(220, 53, 69) // Red color for brannslukkere
        doc.rect(15, yPos - 5, 180, 12, 'F')
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('KOMMENTARER', 20, yPos + 3)
        doc.setTextColor(0, 0, 0)
        yPos += 15

        // Gå gjennom hver kommentar
        kommentarer.forEach((kommentar) => {
          // Sjekk om vi trenger ny side
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          // Kommentar boks
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.3)
          doc.setFillColor(250, 250, 250)
          
          // Beregn høyde basert på tekst
          const kommentarTekst = kommentar.kommentar || ''
          const textLines = doc.splitTextToSize(kommentarTekst, 170)
          const boxHeight = 12 + (textLines.length * 4)
          
          doc.rect(15, yPos, 180, boxHeight, 'FD')
          
          // Kommentar header (navn og dato)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(kommentar.opprettet_av || 'Ukjent', 20, yPos + 5)
          
          // Dato
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          const kommentarDato = kommentar.opprettet_dato || kommentar.created_at
          let datoTekst = 'Ukjent dato'
          if (kommentarDato) {
            try {
              const d = new Date(kommentarDato)
              datoTekst = d.toLocaleDateString('nb-NO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            } catch {
              datoTekst = kommentarDato
            }
          }
          doc.text(datoTekst, 190, yPos + 5, { align: 'right' })
          doc.setTextColor(0, 0, 0)
          
          // Kommentar tekst
          yPos += 9
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.text(textLines, 20, yPos)
          
          yPos += boxHeight - 9 + 5 // Mellomrom til neste kommentar
        })
      }

      // Legg til footer på alle sider
      const pageCount = (doc as any).internal.getNumberOfPages()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
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
        doc.text(`Side ${i} av ${pageCount}`, pageWidth - 20, footerY, { align: 'right' })
      }

      const pdfBlob = doc.output('blob')
      // Konverter norske bokstaver til vanlige for storage (Supabase støtter ikke æøå i filnavn)
      const anleggsnavnForStorage = anleggNavn
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')  // Erstatt mellomrom med underscore
        .replace(/[^a-zA-Z0-9._-]/g, '_')  // Fjern alle spesialtegn utenom punktum og bindestrek
      const fileName = `Rapport_Brannslukkere_${new Date().getFullYear()}_${anleggsnavnForStorage}.pdf`

      if (mode === 'preview') {
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til Supabase Storage
        const storagePath = `anlegg/${anleggId}/dokumenter/${fileName}`
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
            anlegg_id: anleggId,
            filnavn: fileName,
            url: urlData?.signedUrl || null,
            type: 'Brannslukkere Rapport',
            opplastet_dato: new Date().toISOString(),
            storage_path: storagePath
          })

        // Last opp til Dropbox hvis aktivert
        if (dropboxAvailable) {
          try {
            // Hent kundedata for Dropbox-sti
            const { data: anleggData } = await supabase
              .from('anlegg')
              .select(`
                anleggsnavn,
                kundenr,
                customer:kundenr (
                  kunde_nummer,
                  navn
                )
              `)
              .eq('id', anleggId)
              .single()

            if (anleggData) {
              const kundeNummer = (anleggData.customer as any)?.kunde_nummer
              const kundeNavnDropbox = (anleggData.customer as any)?.navn

              if (kundeNummer && kundeNavnDropbox) {
                console.log('📤 Laster opp brannslukkere-rapport til Dropbox...')
                const dropboxResult = await uploadKontrollrapportToDropbox(
                  kundeNummer,
                  kundeNavnDropbox,
                  anleggNavn,
                  fileName,
                  pdfBlob
                )

                if (dropboxResult.success) {
                  toast.success('Rapporten er lagret i Dropbox')
                } else {
                  toast.warning('Rapporten er lagret, men ikke i Dropbox', dropboxResult.error)
                }
              } else {
                toast.warning('Rapporten er lagret, men ikke i Dropbox', 'Kunden mangler kundenummer eller navn')
              }
            }
          } catch (dropboxError) {
            console.error('Feil ved Dropbox-opplasting:', dropboxError)
            toast.warning('Rapporten er lagret, men ikke i Dropbox', dropboxError instanceof Error ? dropboxError.message : undefined)
            // Ikke stopp prosessen hvis Dropbox feiler
          }
        }

        // Vis dialog for å sette tjeneste til fullført
        setPendingPdfSave({ mode, doc, fileName, pdfBlob })
        setShowFullfortDialog(true)
      }
    } catch (error) {
      console.error('Feil ved generering av rapport:', error)
      toast.error('Kunne ikke generere rapport')
    } finally {
      setLoading(false)
    }
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med slukkeutstyr_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ slukkeutstyr_fullfort: true })
        .eq('id', anleggId)

      if (error) throw error

      // Fullfør PDF-lagring
      if (pendingPdfSave) {
        const { mode, doc, fileName } = pendingPdfSave
        if (mode === 'download') {
          doc.save(fileName)
        }
      }

      // Lukk fullført-dialogen og vis send rapport-dialogen
      setShowFullfortDialog(false)
      setShowSendRapportDialog(true)
    } catch (error) {
      console.error('Feil ved oppdatering av tjenestestatus:', error)
      toast.warning('Rapport lagret, men kunne ikke oppdatere tjenestestatus')
      setShowFullfortDialog(false)
      setPendingPdfSave(null)
      setLoading(false)
    }
  }

  function handleSendRapportConfirm() {
    // Naviger til Send Rapporter med kunde og anlegg pre-valgt
    setShowSendRapportDialog(false)
    setPendingPdfSave(null)
    setLoading(false)
    
    if (kundeId) {
      navigate('/send-rapporter', { 
        state: { 
          kundeId: kundeId, 
          anleggId: anleggId 
        } 
      })
    }
  }

  function handleSendRapportCancel() {
    // Lukk dialogen uten å navigere
    setShowSendRapportDialog(false)
    setPendingPdfSave(null)
    setLoading(false)
  }

  function handleTjenesteAvbryt() {
    // Fullfør PDF-lagring uten å oppdatere status
    if (pendingPdfSave) {
      const { mode, doc, fileName } = pendingPdfSave
      if (mode === 'download') {
        doc.save(fileName)
        toast.success('Rapport lagret og lastet ned')
      } else {
        toast.success('Rapport lagret')
      }
    }
    setShowFullfortDialog(false)
    setPendingPdfSave(null)
    setLoading(false)
  }

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannslukkerPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        onBack={() => setPreviewPdf(null)}
        onSave={async () => {
          const storagePath = `anlegg/${anleggId}/dokumenter/${previewPdf.fileName}`
          const { error: uploadError } = await supabase.storage
            .from('anlegg.dokumenter')
            .upload(storagePath, previewPdf.blob, {
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
              anlegg_id: anleggId,
              filnavn: previewPdf.fileName,
              url: urlData?.signedUrl || null,
              type: 'Brannslukkere Rapport',
              opplastet_dato: new Date().toISOString(),
              storage_path: storagePath
            })
        }}
      />
    )
  }

  // Beregn statistikk
  const currentYear = new Date().getFullYear()
  
  const totalt = slukkere.length
  const ok = slukkere.filter(s => 
    s.status?.includes('OK') || s.status?.includes('OK Byttet') || s.status?.includes('Byttet ved kontroll')
  ).length
  const avvik = slukkere.filter(s => 
    s.status?.some(st => !['OK', 'OK Byttet', 'Byttet ved kontroll', 'Ikke funnet', 'Ikke tilkomst'].includes(st))
  ).length
  
  // Beregn utgått basert på brannklasse og produksjonsår/service
  const utgaatt = slukkere.filter(s => {
    // Bruk service-år hvis det finnes, ellers produksjonsår
    const serviceAar = parseInt(s.service || '0')
    const prodAar = parseInt(s.produksjonsaar || '0')
    const referanseAar = serviceAar > 0 ? serviceAar : prodAar
    
    if (!referanseAar || referanseAar === 0) return false
    
    const alder = currentYear - referanseAar
    const klasse = s.brannklasse || ''
    
    // ABC eller B: Utgått etter 10 år
    if (klasse.includes('ABC') || klasse === 'B') {
      return alder >= 10
    }
    // AB, ABF, A, AF: Utgått etter 5 år
    if (['AB', 'ABF', 'A', 'AF'].includes(klasse)) {
      return alder >= 5
    }
    
    return false
  }).length
  
  // Beregn "Byttes neste kontroll"
  const byttesNesteKontroll = slukkere.filter(s => {
    // Bruk service-år hvis det finnes, ellers produksjonsår
    const serviceAar = parseInt(s.service || '0')
    const prodAar = parseInt(s.produksjonsaar || '0')
    const referanseAar = serviceAar > 0 ? serviceAar : prodAar
    
    if (!referanseAar || referanseAar === 0) return false
    
    const alder = currentYear - referanseAar
    const klasse = s.brannklasse || ''
    
    // ABC eller B: Byttes ved 9 år
    if (klasse.includes('ABC') || klasse === 'B') {
      return alder === 9
    }
    // AB, ABF, A, AF: Byttes ved 4 år
    if (['AB', 'ABF', 'A', 'AF'].includes(klasse)) {
      return alder === 4
    }
    
    return false
  }).length

  const utgaattMerke = (x: Brannslukker) => {
    const serviceAar = parseInt(x.service || '0'); const prodAar = parseInt(x.produksjonsaar || '0')
    const ref = serviceAar > 0 ? serviceAar : prodAar
    if (!ref) return null
    const alder = currentYear - ref; const klasse = x.brannklasse || ''
    const grense = klasse.includes('ABC') || klasse === 'B' ? 10 : ['AB', 'ABF', 'A', 'AF'].includes(klasse) ? 5 : 0
    if (!grense) return null
    if (alder >= grense) return { tekst: 'Utgått', tone: 'r' as const }
    if (alder === grense - 1) return { tekst: 'Byttes neste', tone: 'y' as const }
    return null
  }
  const kontrollerte = slukkere.filter(x => x.status && x.status.length > 0).length

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Slukkeutstyr</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-red-500" />Brannslukkere</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{kundeNavn} · <span className="font-medium text-gray-900 dark:text-white">{anleggNavn}</span></p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300">{totalt} totalt</span>
          <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">{ok} OK</span>
          {avvik > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">{avvik} avvik</span>}
          {utgaatt > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">{utgaatt} utgått</span>}
          {byttesNesteKontroll > 0 && <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">{byttesNesteKontroll} byttes neste</span>}
        </div>
      </header>

      {!isOnline && <div className="card !py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">Du er offline – endringer lagres lokalt og sendes når du er på nett igjen.</div>}

      {loading && slukkere.length === 0 ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div> : (
        <UtstyrListe<Brannslukker>
          rader={slukkere}
          nummerKey="apparat_nr"
          felter={FELTER}
          status={STATUS_DEF}
          statusKey="status"
          lagrer={lagrer}
          onEndre={lagreEndring}
          onEndreFlere={lagreEndringFlere}
          onSlett={deleteBrannslukker}
          onLeggTil={leggTilNye}
          merke={utgaattMerke}
          ekstra={x => x.modell?.includes('CO2') ? <IconButton variant="ghost" label="CO2-vektkalkulator" icon={<Calculator />} onClick={() => setCo2KalkulatorData({ modell: x.modell || '', apparatNr: x.apparat_nr || '' })} className="w-8 h-8" /> : null}
          enhetsnavn={{ entall: 'brannslukker', flertall: 'brannslukkere' }}
        />
      )}

      <CO2VektKalkulator isOpen={co2KalkulatorData !== null} onClose={() => setCo2KalkulatorData(null)} modell={co2KalkulatorData?.modell || ''} apparatNr={co2KalkulatorData?.apparatNr} />

      {/* Fullfør kontroll - Samlet seksjon */}
      <div className="card bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Fullfør kontroll</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sjekkliste før du genererer rapport</p>
          </div>
        </div>

        {/* Sjekkliste */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Status 1: Enheter kontrollert */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            slukkere.length > 0 && slukkere.every(s => s.status && s.status.length > 0)
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                slukkere.length > 0 && slukkere.every(s => s.status && s.status.length > 0)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
                {slukkere.length > 0 && slukkere.every(s => s.status && s.status.length > 0) ? '✓' : '1'}
              </div>
              <div>
                <p className={`font-medium ${slukkere.length > 0 && slukkere.every(s => s.status && s.status.length > 0) ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Enheter kontrollert
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {slukkere.filter(s => s.status && s.status.length > 0).length} av {slukkere.length} enheter
                </p>
              </div>
            </div>
          </div>

          {/* Status 2: Evakueringsplan */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            evakueringsplanStatus 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                evakueringsplanStatus
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
                {evakueringsplanStatus ? '✓' : '2'}
              </div>
              <div>
                <p className={`font-medium ${evakueringsplanStatus ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Evakueringsplan
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {evakueringsplanStatus || 'Ikke satt'}
                </p>
              </div>
            </div>
          </div>

          {/* Status 3: Dato valgt */}
          <div className="p-4 rounded-xl border-2 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                ✓
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Kontrolldato</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {kontrolldato.toLocaleDateString('nb-NO')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Evakueringsplan dropdown */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Evakueringsplaner status
              </label>
              <select
                value={evakueringsplanStatus}
                onChange={(e) => {
                  setEvakueringsplanStatus(e.target.value)
                  saveEvakueringsplan(e.target.value)
                }}
                className="input"
              >
                <option value="">Velg status</option>
                <option value="Ja">✓ Ja - I orden</option>
                <option value="Nei">✗ Nei - Mangler</option>
                <option value="Må oppdateres">⚠ Må oppdateres</option>
              </select>
            </div>
            <div>
              <KontrolldatoVelger
                kontrolldato={kontrolldato}
                onDatoChange={setKontrolldato}
                label="Kontrolldato"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button variant="primary" size="md" icon={<Save />} loading={loading} disabled={slukkere.length === 0} onClick={() => genererRapport('save')} className="sm:flex-1">Generer rapport</Button>
          <Button variant="outline" size="md" icon={<Eye />} disabled={loading || slukkere.length === 0} onClick={() => genererRapport('preview')}>Forhåndsvis</Button>
        </div>
        {kontrollerte < slukkere.length && <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-3">{slukkere.length - kontrollerte} apparater har ikke fått status ennå. Du kan likevel generere rapport.</p>}
      </div>

      {/* Kommentarer seksjon */}
      <KommentarViewBrannslukkere
        anleggId={anleggId}
        kundeNavn={kundeNavn}
        anleggNavn={anleggNavn}
        onBack={() => {}}
      />

      {/* Dialog for å sette tjeneste til fullført */}
      <TjenesteFullfortDialog
        tjeneste="Slukkeutstyr"
        isOpen={showFullfortDialog}
        onConfirm={handleTjenesteFullfort}
        onCancel={handleTjenesteAvbryt}
      />

      {/* Dialog for å navigere til Send Rapporter */}
      <SendRapportDialog
        isOpen={showSendRapportDialog}
        onConfirm={handleSendRapportConfirm}
        onCancel={handleSendRapportCancel}
      />
    </div>
  )
}
