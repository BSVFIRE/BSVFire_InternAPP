import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Eye, ClipboardCheck, Droplets } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useOfflineQueue } from '@/hooks/useOffline'
import { Button } from '@/components/ui/Button'
import { UtstyrListe, type FeltDef, type StatusDef } from '@/components/utstyr/UtstyrListe'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannslangerPreview } from '../BrannslangerPreview'
import { useAuthStore } from '@/store/authStore'
import { KommentarViewBrannslanger } from './KommentarViewBrannslanger'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { KontrolldatoVelger } from '@/components/KontrolldatoVelger'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'

interface Brannslange {
  id: string
  anlegg_id: string
  slangenummer?: string | null
  plassering?: string | null
  etasje?: string | null
  produsent?: string | null
  modell?: string | null
  brannklasse?: string | null
  produksjonsaar?: string | null
  sistekontroll?: string | null
  trykktest?: string | null
  status?: string | null
  type_avvik?: string[] | null
}

interface BrannslangerViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onBack: () => void
}

const statusAlternativer = [
  'OK',
  'Ikke funnet',
  'Ikke tilkomst',
  'Skade på slange',
  'Feil strålerør',
  'Ikke vann',
  'Rust i skap',
  'Mangler skilt',
  'Slange feil vei',
  'Lekkasje',
  'Må trykktestes',
  'Skade tilførselsslange',
  'Lekkasje nav',
  'Lekkasje slange',
  'Lekkasje Strålerør'
]

const modellAlternativer = [
  '',
  '30M 19mm',
  '30M 25mm',
  '25M 19mm',
  '25M 25mm',
  'Husbrannslange',
  'Bruksslange',
]

const brannklasseAlternativer = [
  'A'
]

const STATUS_DEF: StatusDef = {
  alle: statusAlternativer,
  ok: new Set(['OK']),
  noytral: new Set(['Ikke funnet', 'Ikke tilkomst']),
}

const etasjeAlternativer = [
  '',
  ...Array.from({ length: 15 }, (_, i) => `${i - 2} Etg`),
  'Ukjent'
]

const FELTER: FeltDef<Brannslange>[] = [
  { key: 'plassering', navn: 'Plassering', placeholder: 'Gang', forslag: true },
  { key: 'etasje', navn: 'Etasje', bredde: 'w-24', type: 'select', valg: etasjeAlternativer, mobil: true },
  { key: 'produsent', navn: 'Produsent', bredde: 'w-28', forslag: true },
  { key: 'modell', navn: 'Modell', bredde: 'w-32', type: 'valgEllerTekst', valg: modellAlternativer, mobil: true },
  { key: 'brannklasse', navn: 'Klasse', bredde: 'w-16', type: 'select', valg: brannklasseAlternativer },
  { key: 'produksjonsaar', navn: 'Prod.år', bredde: 'w-20', placeholder: '2019', mobil: true },
  { key: 'trykktest', navn: 'Trykktest', bredde: 'w-24', type: 'aar', placeholder: 'År', mobil: true },
  { key: 'sistekontroll', navn: 'Kontroll', bredde: 'w-24', type: 'aar', placeholder: 'År' },
]

export function BrannslangerView({ anleggId, kundeNavn, anleggNavn, onBack }: BrannslangerViewProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [slanger, setSlanger] = useState<Brannslange[]>([])
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
  useEffect(() => {
    loadSlanger()
    loadEvakueringsplan(anleggId)
    // Sjekk Dropbox-status
    checkDropboxStatus().then(status => setDropboxAvailable(status.connected))
  }, [anleggId])

  async function loadSlanger() {
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
        .from('anleggsdata_brannslanger')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('slangenummer', { ascending: true, nullsFirst: false })

      if (error) throw error
      
      console.log('Lastet inn fra database:', data?.length, 'brannslanger')
      
      // Konverter status og type_avvik fra database format
      const processedData = (data || []).map(slange => ({
        ...slange,
        slangenummer: slange.slangenummer != null ? String(slange.slangenummer) : null,
        type_avvik: Array.isArray(slange.type_avvik) ? slange.type_avvik : []
      })) as Brannslange[]
      
      // Sjekk for duplikater
      const ids = processedData.map(s => s.id)
      const uniqueIds = new Set(ids)
      if (ids.length !== uniqueIds.size) {
        console.error('ADVARSEL: Duplikate IDer funnet i database!')
      }
      
      setSlanger(processedData)
    } catch (error) {
      console.error('Feil ved lasting av brannslanger:', error)
      toast.error('Kunne ikke laste brannslanger', error)
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

  /** Lagrer én endring med en gang (offline: kø). Status settes → siste kontroll = i år. */
  async function lagreEndring(id: string, patch: Partial<Brannslange>) {
    const forrige = slanger.find(x => x.id === id)
    if (!forrige) return
    const aar = String(new Date().getFullYear())
    if (patch.type_avvik && patch.type_avvik.length > 0 && forrige.sistekontroll !== aar) patch = { ...patch, sistekontroll: aar }
    setSlanger(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
    const tilDb = { ...patch, ...(patch.type_avvik ? { type_avvik: patch.type_avvik.length ? patch.type_avvik : null } : {}) }
    if (!isOnline) { queueUpdate('anleggsdata_brannslanger', { id, ...tilDb }); return }
    setLagrer(prev => new Set(prev).add(id))
    const { error } = await supabase.from('anleggsdata_brannslanger').update(tilDb).eq('id', id)
    setLagrer(prev => { const n = new Set(prev); n.delete(id); return n })
    if (error) {
      const tilbake: Partial<Brannslange> = {}
      for (const k of Object.keys(patch) as (keyof Brannslange)[]) (tilbake as Record<string, unknown>)[k] = forrige[k]
      setSlanger(prev => prev.map(x => x.id === id ? { ...x, ...tilbake } : x))
      toast.error('Kunne ikke lagre endringen', error)
    }
  }

  async function lagreEndringFlere(ids: string[], patch: Partial<Brannslange>) {
    if (ids.length === 0) return
    setSlanger(prev => prev.map(x => ids.includes(x.id) ? { ...x, ...patch } : x))
    if (!isOnline) { ids.forEach(id => queueUpdate('anleggsdata_brannslanger', { id, ...patch })); return }
    const { error } = await supabase.from('anleggsdata_brannslanger').update(patch).in('id', ids)
    if (error) { toast.error('Kunne ikke oppdatere', error); await loadSlanger(); return }
    toast.success(`${ids.length} brannslanger oppdatert`)
  }

  async function leggTilNye(antall: number) {
    const hoyeste = slanger.reduce((m, x) => Math.max(m, parseInt(x.slangenummer || '0') || 0), 0)
    const nye = Array.from({ length: antall }, (_, i) => ({ anlegg_id: anleggId, slangenummer: hoyeste + i + 1, brannklasse: 'A' }))
    if (!isOnline) { nye.forEach(n => queueInsert('anleggsdata_brannslanger', n)); toast.info('Lagt i kø – vises når du er på nett igjen'); return }
    const { error } = await supabase.from('anleggsdata_brannslanger').insert(nye)
    if (error) { toast.error('Kunne ikke legge til', error); return }
    await loadSlanger()
    toast.success(antall === 1 ? `Slange ${hoyeste + 1} lagt til` : `${antall} slanger lagt til (${hoyeste + 1}–${hoyeste + antall})`)
  }

  async function deleteSlange(s: Brannslange) {
    if (!confirm(`Slette slange ${s.slangenummer ?? ''}${s.plassering ? ` (${s.plassering})` : ''}?`)) return
    const { error } = await supabase.from('anleggsdata_brannslanger').delete().eq('id', s.id)
    if (error) { toast.error('Kunne ikke slette', error); return }
    setSlanger(prev => prev.filter(x => x.id !== s.id))
    toast.success('Slange slettet')
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
        .from('kommentar_brannslanger')
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
      doc.text('RAPPORT - BRANNSLANGER', 20, yPos)
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

      // Beregn trykktest-statistikk
      const currentYear = new Date().getFullYear()
      const trykktestVedKontroll = slanger.filter(s => {
        const year = parseInt(s.trykktest || '0')
        return year === currentYear
      }).length
      const trykktestVedNeste = slanger.filter(s => {
        const year = parseInt(s.trykktest || '0')
        return year === currentYear - 4
      }).length
      const maaTrykktestes = slanger.filter(s => {
        const year = parseInt(s.trykktest || '0')
        return year > 0 && year <= currentYear - 5
      }).length

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
      
      // Trykktest-seksjon
      yPos += boxHeight + 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Trykktest', 17, yPos)
      yPos += 5
      
      xPos = 17
      const wideBoxWidth = 58
      
      // Trykktest ved kontroll
      doc.setFillColor(240, 253, 244)
      doc.rect(xPos, yPos, wideBoxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 163, 74)
      doc.text(trykktestVedKontroll.toString(), xPos + wideBoxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('VED KONTROLL', xPos + wideBoxWidth/2, yPos + 18, { align: 'center' })
      
      // Ved neste kontroll
      xPos += wideBoxWidth + 2
      doc.setFillColor(254, 249, 195)
      doc.rect(xPos, yPos, wideBoxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(202, 138, 4)
      doc.text(trykktestVedNeste.toString(), xPos + wideBoxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('VED NESTE', xPos + wideBoxWidth/2, yPos + 18, { align: 'center' })
      
      // Må trykktestes
      xPos += wideBoxWidth + 2
      doc.setFillColor(254, 242, 242)
      doc.rect(xPos, yPos, wideBoxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(maaTrykktestes.toString(), xPos + wideBoxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('MÅ TRYKKTESTES', xPos + wideBoxWidth/2, yPos + 18, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

      // Hent evakueringsplan-status for tilleggsinformasjon
      const { data: evakPlan } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      // Tilleggsinformasjon (Evakueringsplan) - på side 1 etter trykktest
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

      // Sorter etter slangenummer
      const sortedForPdf = [...slanger].sort((a, b) => {
        const numA = parseInt(a.slangenummer || '0') || 0
        const numB = parseInt(b.slangenummer || '0') || 0
        return numA - numB
      })

      // Tabell
      autoTable(doc, {
        startY: yPos,
        head: [['Nr', 'Plassering', 'Etasje', 'Produsent', 'Modell', 'Klasse', 'År', 'Siste', 'Trykktest', 'Status']],
        body: sortedForPdf.map(s => [
          s.slangenummer || '-',
          s.plassering || '-',
          s.etasje || '-',
          s.produsent || '-',
          s.modell || '-',
          s.brannklasse || '-',
          s.produksjonsaar || '-',
          s.sistekontroll || '-',
          s.trykktest || '-',
          // Bestem status basert på type_avvik
          (() => {
            if (!Array.isArray(s.type_avvik) || s.type_avvik.length === 0 || s.type_avvik.includes('OK')) {
              return 'OK'
            }
            const ikkeKontrollert = s.type_avvik.filter(a => a === 'Ikke tilkomst' || a === 'Ikke funnet')
            if (ikkeKontrollert.length > 0 && ikkeKontrollert.length === s.type_avvik.length) {
              return ikkeKontrollert.join(', ')
            }
            return s.type_avvik.join(', ')
          })()
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, bottom: 30 },
      })

      // Kommentarer seksjon - på ny side hvis det finnes kommentarer
      if (kommentarer && kommentarer.length > 0) {
        doc.addPage()
        yPos = 20

        // Kommentarer header med bakgrunn
        doc.setFillColor(13, 110, 253) // Blue color for brannslanger
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
      const fileName = `Rapport_Brannslanger_${new Date().getFullYear()}_${anleggsnavnForStorage}.pdf`

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
            type: 'Brannslanger Rapport',
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
                console.log('📤 Laster opp brannslanger-rapport til Dropbox...')
                const dropboxResult = await uploadKontrollrapportToDropbox(
                  kundeNummer,
                  kundeNavnDropbox,
                  anleggNavn,
                  fileName,
                  pdfBlob
                )

                if (dropboxResult.success) {
                  console.log('✅ Brannslanger-rapport lastet opp til Dropbox:', dropboxResult.path)
                } else {
                  console.warn('⚠️ Dropbox-opplasting feilet:', dropboxResult.error)
                }
              } else {
                console.warn('⚠️ Kundenummer mangler - kan ikke laste opp til Dropbox')
              }
            }
          } catch (dropboxError) {
            console.error('❌ Feil ved Dropbox-opplasting:', dropboxError)
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

  // Beregn statistikk basert på type_avvik
  const totalt = slanger.length
  const ok = slanger.filter(s => 
    !Array.isArray(s.type_avvik) || s.type_avvik.length === 0 || s.type_avvik.includes('OK')
  ).length
  const ikkeKontrollert = slanger.filter(s => {
    if (!Array.isArray(s.type_avvik) || s.type_avvik.length === 0) return false
    // Kun "Ikke kontrollert" hvis ALLE avvik er "Ikke funnet" eller "Ikke tilkomst"
    const ikkeKontrollertAvvik = s.type_avvik.filter(a => a === 'Ikke funnet' || a === 'Ikke tilkomst')
    return ikkeKontrollertAvvik.length > 0 && ikkeKontrollertAvvik.length === s.type_avvik.length
  }).length
  const avvik = slanger.filter(s => {
    if (!Array.isArray(s.type_avvik) || s.type_avvik.length === 0 || s.type_avvik.includes('OK')) return false
    // Avvik hvis det finnes andre avvik enn "Ikke kontrollert"
    const ikkeKontrollertAvvik = s.type_avvik.filter(a => a === 'Ikke funnet' || a === 'Ikke tilkomst')
    return ikkeKontrollertAvvik.length !== s.type_avvik.length
  }).length

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannslangerPreview
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
              type: 'Brannslanger Rapport',
              opplastet_dato: new Date().toISOString(),
              storage_path: storagePath
            })
        }}
      />
    )
  }

  const currentYear = new Date().getFullYear()
  const trykkMerke = (x: Brannslange) => {
    const aar = parseInt(x.trykktest || '0')
    if (!aar) return null
    if (aar <= currentYear - 5) return { tekst: 'Må trykktestes', tone: 'r' as const }
    if (aar === currentYear - 4) return { tekst: 'Trykktest neste', tone: 'y' as const }
    return null
  }
  const kontrollerte = slanger.filter(x => x.type_avvik && x.type_avvik.length > 0).length

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Slukkeutstyr</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Droplets className="w-6 h-6 text-blue-500" />Brannslanger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{kundeNavn} · <span className="font-medium text-gray-900 dark:text-white">{anleggNavn}</span></p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300">{totalt} totalt</span>
          <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">{ok} OK</span>
          {avvik > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">{avvik} avvik</span>}
          {ikkeKontrollert > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300">{ikkeKontrollert} ikke funnet/tilkomst</span>}
        </div>
      </header>

      {!isOnline && <div className="card !py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">Du er offline – endringer lagres lokalt og sendes når du er på nett igjen.</div>}

      {loading && slanger.length === 0 ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div> : (
        <UtstyrListe<Brannslange>
          rader={slanger}
          nummerKey="slangenummer"
          felter={FELTER}
          status={STATUS_DEF}
          statusKey="type_avvik"
          lagrer={lagrer}
          onEndre={lagreEndring}
          onEndreFlere={lagreEndringFlere}
          onSlett={deleteSlange}
          onLeggTil={leggTilNye}
          merke={trykkMerke}
          enhetsnavn={{ entall: 'brannslange', flertall: 'brannslanger' }}
        />
      )}

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
            slanger.length > 0 && slanger.every(s => s.type_avvik && s.type_avvik.length > 0)
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                slanger.length > 0 && slanger.every(s => s.type_avvik && s.type_avvik.length > 0)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
                {slanger.length > 0 && slanger.every(s => s.type_avvik && s.type_avvik.length > 0) ? '✓' : '1'}
              </div>
              <div>
                <p className={`font-medium ${slanger.length > 0 && slanger.every(s => s.type_avvik && s.type_avvik.length > 0) ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Enheter kontrollert
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {slanger.filter(s => s.type_avvik && s.type_avvik.length > 0).length} av {slanger.length} enheter
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
          <Button variant="primary" size="md" icon={<Save />} loading={loading} disabled={slanger.length === 0} onClick={() => genererRapport('save')} className="sm:flex-1">Generer rapport</Button>
          <Button variant="outline" size="md" icon={<Eye />} disabled={loading || slanger.length === 0} onClick={() => genererRapport('preview')}>Forhåndsvis</Button>
        </div>
        {kontrollerte < slanger.length && <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-3">{slanger.length - kontrollerte} slanger har ikke fått status ennå. Du kan likevel generere rapport.</p>}
      </div>

      {/* Kommentarer seksjon */}
      <KommentarViewBrannslanger
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
