import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Lightbulb, Edit, Building2, Eye, Save, Upload, FileSpreadsheet, ClipboardCheck, MoreHorizontal } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useLocation, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useOfflineQueue } from '@/hooks/useOffline'
import { cacheData } from '@/lib/offline'
import { NodlysPreview } from './NodlysPreview'
import { KommentarViewNodlys } from './KommentarViewNodlys'
import { NodlysImport } from './NodlysImport'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { KontrolldatoVelger } from '@/components/KontrolldatoVelger'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'
import { Combobox } from '@/components/ui/Combobox'
import { toast } from '@/lib/toast'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { NodlysListe } from './nodlys/NodlysListe'
import { BATTERITYPER, type NodlysEnhet } from './nodlys/typer'

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

interface NettverkEnhet {
  id: string
  anlegg_id: string | null
  kunde: string | null
  nettverk_id: string | null
  plassering: string | null
  type: string | null
  ah: string | null
  spenning: string | null
  batterialder: number | null
  created_at: string
}

interface NodlysProps {
  onBack: () => void
  fromAnlegg?: boolean
}

const statusTyper = ['OK', 'Defekt', 'Mangler', 'Utskiftet', 'Batterifeil', 'Skadet armatur']
const etasjeOptions = ['-2.Etg', '-1.Etg', '0.Etg', '1.Etg', '2.Etg', '3.Etg', '4.Etg', '5.Etg', '6.Etg', '7.Etg', '8.Etg', '9.Etg', '10.Etg']
const typeOptions = ['ML', 'LL', 'Strobe', 'Fluoriserende']

export function Nodlys({ onBack, fromAnlegg }: NodlysProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  const { isOnline, queueUpdate } = useOfflineQueue()
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [nodlysListe, setNodlysListe] = useState<NodlysEnhet[]>([])
  const [nettverkListe, setNettverkListe] = useState<NettverkEnhet[]>([])
  const [harNettverk, setHarNettverk] = useState(false)
  const [evakueringsplanStatus, setEvakueringsplanStatus] = useState('')
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'bulk' | 'nettverk' | 'import'>('list')
  const [selectedNodlys, setSelectedNodlys] = useState<NodlysEnhet | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ mode: 'save' | 'download'; doc: any; fileName: string } | null>(null)
  const [dropboxAvailable, setDropboxAvailable] = useState(false)
  const [kontrolldato, setKontrolldato] = useState<Date>(new Date())
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
  const [visVelger, setVisVelger] = useState(!state?.anleggId)

  useEffect(() => {
    loadKunder()
    // Sjekk Dropbox-status
    checkDropboxStatus().then(status => setDropboxAvailable(status.connected))
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
      loadNodlys(selectedAnlegg)
      checkNettverk(selectedAnlegg)
      loadEvakueringsplan(selectedAnlegg)
    } else {
      setNodlysListe([])
      setNettverkListe([])
      setHarNettverk(false)
      setEvakueringsplanStatus('')
    }
  }, [selectedAnlegg])

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
        .select('id, anleggsnavn, kundenr').or('skjult.is.null,skjult.eq.false')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  async function loadNodlys(anleggId: string) {
    try {
      setLoading(true)
      
      if (isOnline) {
        const { data, error } = await supabase
          .from('anleggsdata_nodlys')
          .select('*')
          .eq('anlegg_id', anleggId)
          .order('plassering', { ascending: true, nullsFirst: false })

        if (error) throw error
        setNodlysListe(data || [])
        // Cache data for offline use
        cacheData(`nodlys_${anleggId}`, data || [])
      } else {
        // Offline: bruk cached data
        const { getCachedData } = await import('@/lib/offline')
        const cached = getCachedData<NodlysEnhet[]>(`nodlys_${anleggId}`)
        if (cached) {
          setNodlysListe(cached)
          console.log('📦 Bruker cached nødlysdata (offline)')
        } else {
          console.log('⚠️ Ingen cached data tilgjengelig')
        }
      }
    } catch (error) {
      console.error('Feil ved lasting av nødlys:', error)
    } finally {
      setLoading(false)
    }
  }

  async function checkNettverk(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('nettverk_nodlys')
        .select('*')
        .eq('anlegg_id', anleggId)

      if (error) throw error
      setNettverkListe(data || [])
      setHarNettverk((data || []).length > 0)
    } catch (error) {
      console.error('Feil ved sjekk av nettverk:', error)
      setHarNettverk(false)
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
        .eq('anlegg_id', selectedAnlegg)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('evakueringsplan_status')
          .update({ status: status })
          .eq('anlegg_id', selectedAnlegg)
      } else {
        await supabase
          .from('evakueringsplan_status')
          .insert({ anlegg_id: selectedAnlegg, status: status })
      }
      toast.success('Evakueringsplan-status lagret')
    } catch (error) {
      console.error('Feil ved lagring:', error)
      toast.error('Kunne ikke lagre evakueringsplan-status')
    }
  }


  async function deleteNodlys(id: string) {
    const enhet = nodlysListe.find(n => n.id === id)
    if (!confirm(`Slette armatur ${enhet?.internnummer ?? ''}${enhet?.plassering ? ` (${enhet.plassering})` : ''}?`)) return
    try {
      const { error } = await supabase.from('anleggsdata_nodlys').delete().eq('id', id)
      if (error) throw error
      setNodlysListe(prev => prev.filter(n => n.id !== id))
      toast.success('Armatur slettet')
    } catch (error) {
      console.error('Feil ved sletting:', error)
      toast.error('Kunne ikke slette armatur', error)
    }
  }

  /** Sletter flere armaturer på én gang – bekreftelsen skjer i listen */
  async function deleteNodlysFlere(ids: string[]) {
    if (ids.length === 0) return
    try {
      const { error } = await supabase.from('anleggsdata_nodlys').delete().in('id', ids)
      if (error) throw error
      setNodlysListe(prev => { const ny = prev.filter(n => !ids.includes(n.id)); cacheData(`nodlys_${selectedAnlegg}`, ny); return ny })
      toast.success(`${ids.length} ${ids.length === 1 ? 'armatur' : 'armaturer'} slettet`)
    } catch (error) {
      console.error('Feil ved sletting:', error)
      toast.error('Kunne ikke slette armaturene', error)
      throw error
    }
  }

  /** Lagrer én endring med en gang (offline: legges i kø). Ruller tilbake hvis lagringen feiler. */
  async function lagreEndring(id: string, patch: Partial<NodlysEnhet>) {
    const forrige = nodlysListe.find(n => n.id === id)
    if (!forrige) return
    setNodlysListe(prev => { const ny = prev.map(n => n.id === id ? { ...n, ...patch } : n); cacheData(`nodlys_${selectedAnlegg}`, ny); return ny })
    if (!isOnline) { queueUpdate('anleggsdata_nodlys', { id, ...patch }); return }
    setLagrer(prev => new Set(prev).add(id))
    const { error } = await supabase.from('anleggsdata_nodlys').update(patch).eq('id', id)
    setLagrer(prev => { const n = new Set(prev); n.delete(id); return n })
    if (error) {
      const tilbake: Partial<NodlysEnhet> = {}
      for (const k of Object.keys(patch) as (keyof NodlysEnhet)[]) (tilbake as Record<string, unknown>)[k] = forrige[k]
      setNodlysListe(prev => prev.map(n => n.id === id ? { ...n, ...tilbake } : n))
      toast.error('Kunne ikke lagre endringen', error)
    }
  }

  /** Samme endring på flere armaturer (velg flere → sett bygg/etasje/…) */
  async function lagreEndringFlere(ids: string[], patch: Partial<NodlysEnhet>) {
    if (ids.length === 0) return
    if (!isOnline) { ids.forEach(id => queueUpdate('anleggsdata_nodlys', { id, ...patch })); setNodlysListe(prev => prev.map(n => ids.includes(n.id) ? { ...n, ...patch } : n)); return }
    const { error } = await supabase.from('anleggsdata_nodlys').update(patch).in('id', ids)
    if (error) { toast.error('Kunne ikke oppdatere', error); return }
    setNodlysListe(prev => { const ny = prev.map(n => ids.includes(n.id) ? { ...n, ...patch } : n); cacheData(`nodlys_${selectedAnlegg}`, ny); return ny })
    toast.success(`${ids.length} armaturer oppdatert`)
  }

  async function markerAlleKontrollert() {
    const ids = nodlysListe.filter(n => !n.kontrollert).map(n => n.id)
    if (ids.length === 0) return
    if (!confirm(`Merke ${ids.length} armaturer som kontrollert?`)) return
    const { error } = await supabase.from('anleggsdata_nodlys').update({ kontrollert: true }).in('id', ids)
    if (error) { toast.error('Kunne ikke oppdatere', error); return }
    setNodlysListe(prev => prev.map(n => ({ ...n, kontrollert: true })))
    toast.success(`${ids.length} armaturer merket som kontrollert`)
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med nødlys_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ nodlys_fullfort: true })
        .eq('id', selectedAnlegg)

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
    navigate('/send-rapporter', { 
      state: { 
        kundeId: selectedKunde, 
        anleggId: selectedAnlegg 
      } 
    })
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

  async function genererPDF(mode: 'preview' | 'save' | 'download' = 'preview') {
    try {
      setLoading(true)

      // Hent anleggsdata
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('*')
        .eq('id', selectedAnlegg)
        .single()

      if (anleggError) {
        console.error('Feil ved henting av anlegg:', anleggError)
        throw anleggError
      }

      // Hent kunde separat
      // customer har ikke telefon/epost-kolonner – spørringen feilet stille før
      const { data: kundeData } = await supabase
        .from('customer')
        .select('navn')
        .eq('id', anleggData.kundenr)
        .single()

      // Hent kontaktperson via junction table
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

      // Hent tekniker-info fra ansatte-tabellen
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: tekniker } = await supabase
        .from('ansatte')
        .select('navn, telefon, epost')
        .eq('epost', authUser?.email)
        .maybeSingle()

      // Hent kommentarer for anlegget
      const { data: kommentarer } = await supabase
        .from('kommentar_nodlys')
        .select('*')
        .eq('anlegg_id', selectedAnlegg)
        .order('created_at', { ascending: false })

      // Hent evakueringsplan-status
      const { data: evakPlan } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', selectedAnlegg)
        .maybeSingle()

      // Generer PDF
      const doc = new jsPDF()
      
      // Funksjon for å legge til footer på hver side
      const addFooter = (pageNum: number) => {
        // Bruk gjeldende sides mål – listesiden er liggende, resten stående
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
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
        doc.text(`Side ${pageNum}`, pageWidth - 20, footerY, { align: 'right' })
        
        // Reset farge
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
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        // Fallback til tekst hvis logo ikke lastes
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('BSV FIRE', 20, yPos)
        doc.setTextColor(0)
        yPos += 10
      }

      // Tittel
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RAPPORT - NØDLYS', 20, yPos)
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
      doc.text(kundeData?.navn || selectedKundeNavn || '-', 20, yPos + 10)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('ANLEGG', 20, yPos + 16)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(anleggData?.anleggsnavn || '-', 20, yPos + 21)
      
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
      yPos += 28

      // Statistikk
      const totalt = nodlysListe.length
      const ok = nodlysListe.filter(n => n.status === 'OK').length
      const defekt = nodlysListe.filter(n => n.status === 'Defekt').length
      const kontrollert = nodlysListe.filter(n => n.kontrollert).length
      const batterifeil = nodlysListe.filter(n => n.status === 'Batterifeil').length
      const skadetArmatur = nodlysListe.filter(n => n.status === 'Skadet armatur').length

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
      
      // Kontrollert
      xPos += boxWidth + 2
      doc.setFillColor(249, 250, 251)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text(kontrollert.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('KONTROLLERT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Defekt
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
      doc.text('DEFEKT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Ny rad for Batterifeil og Skadet armatur
      yPos += boxHeight + 4
      xPos = 17
      
      // Batterifeil
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.setFillColor(254, 243, 199)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(217, 119, 6)
      doc.text(batterifeil.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('BATTERIFEIL', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Skadet armatur
      xPos += boxWidth + 2
      doc.setFillColor(254, 226, 226)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(185, 28, 28)
      doc.text(skadetArmatur.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('SKADET ARMATUR', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

      // Tilleggsinformasjon (Evakueringsplan)
      if (evakPlan?.status) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TILLEGGSINFORMASJON', 20, yPos)
        yPos += 10

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Evakueringsplaner:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(evakPlan.status, 70, yPos)
        yPos += 10
      }

      // Legg til footer på første side
      addFooter(1)

      // Ny side for nødlysliste – liggende, så alle kolonnene får plass
      doc.addPage('a4', 'landscape')
      yPos = 20

      // Logo på side 2
      try {
        const logoImg = new Image()
        logoImg.src = '/bsv-logo.png'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        doc.addImage(logoImg, 'PNG', 20, yPos, 40, 15)
        yPos += 20
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('BSV FIRE', 20, yPos)
        doc.setTextColor(0)
        yPos += 10
      }

      // Nødlysliste (tabell) - Sortert etter armatur_id
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('NØDLYSLISTE', 20, yPos)
      yPos += 5

      // Sorter etter armatur_id (numerisk)
      const harBygg = nodlysListe.some(n => n.bygg)
      const sortedNodlysForPdf = [...nodlysListe].sort((a, b) => {
        const numA = parseInt(a.amatur_id || '0') || 0
        const numB = parseInt(b.amatur_id || '0') || 0
        return numA - numB
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Armatur ID', 'Fordeling', 'Kurs', harBygg ? 'Bygg / etasje' : 'Etasje', 'Plassering', 'Produsent', 'Type', 'Batteri', 'Status', 'Kontrollert', 'Notat']],
        body: sortedNodlysForPdf.map(n => [
          n.amatur_id || '-',
          n.fordeling || '-',
          n.kurs || '-',
          harBygg ? [n.bygg, n.etasje].filter(Boolean).join(' – ') || '-' : (n.etasje || '-'),
          n.plassering || '-',
          n.produsent || '-',
          n.type || '-',
          n.batteritype || '-',
          n.status || '-',
          n.kontrollert ? 'Ja' : 'Nei',
          n.notat || ''
        ]),
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 24 }, 2: { cellWidth: 16 }, 3: { cellWidth: harBygg ? 34 : 18 }, 5: { cellWidth: 26 }, 6: { cellWidth: 18 }, 7: { cellWidth: 22 }, 8: { cellWidth: 24 }, 9: { cellWidth: 18 } },
        margin: { left: 10, right: 10, bottom: 25 },
        didDrawPage: () => {
          // Legg til footer på hver side
          // const pageCount = (doc as any).internal.getNumberOfPages()
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
          addFooter(currentPage)
        }
      })

      // Kommentarer seksjon - på ny (stående) side hvis det finnes kommentarer
      if (kommentarer && kommentarer.length > 0) {
        doc.addPage('a4', 'portrait')
        yPos = 20

        // Tittel
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('KOMMENTARER', 20, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 15

        // Gå gjennom hver kommentar
        kommentarer.forEach((kommentar) => {
          // Sjekk om vi trenger ny side
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }

          // Kommentar boks
          doc.setDrawColor(220, 220, 220)
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
          
          // Kommentar tekst
          doc.setFontSize(9)
          doc.setTextColor(0, 0, 0)
          yPos += 9
          doc.setFont('helvetica', 'normal')
          doc.text(textLines, 20, yPos)
          
          yPos += boxHeight - 9 + 5 // Mellomrom til neste kommentar
        })

        // Legg til footer på kommentar-siden
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
        addFooter(currentPage)
      }

      const pdfBlob = doc.output('blob')
      // Konverter norske bokstaver til vanlige for storage (Supabase støtter ikke æøå i filnavn)
      const anleggsnavnForStorage = (anleggData?.anleggsnavn || 'Anlegg')
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')  // Erstatt mellomrom med underscore
        .replace(/[^a-zA-Z0-9._-]/g, '_')  // Fjern alle spesialtegn utenom punktum og bindestrek
      const fileName = `Rapport_Nodlys_${new Date().getFullYear()}_${anleggsnavnForStorage}.pdf`

      if (mode === 'preview') {
        // Vis forhåndsvisning
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til Supabase Storage
        const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${fileName}`
        
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
            filnavn: fileName,
            url: urlData?.signedUrl || null,
            type: 'Nødlys Rapport',
            opplastet_dato: new Date().toISOString(),
            storage_path: storagePath
          })

        // Vis dialog for å sette tjeneste til fullført
        setPendingPdfSave({ mode, doc, fileName })
        setShowFullfortDialog(true)
      }
    } catch (error) {
      console.error('Feil ved generering av rapport:', error)
      toast.error('Kunne ikke generere rapport')
    } finally {
      setLoading(false)
    }
  }

  // Eksporter nødlysliste til Excel
  function eksporterTilExcel() {
    try {
      const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)
      const anleggsnavn = selectedAnleggData?.anleggsnavn || 'Anlegg'
      
      // Sorter etter armatur_id (numerisk)
      const sortedData = [...nodlysListe].sort((a, b) => {
        const numA = parseInt(a.amatur_id || '0') || 0
        const numB = parseInt(b.amatur_id || '0') || 0
        return numA - numB
      })

      // Forbered data for Excel
      const excelData = sortedData.map(n => ({
        'Intern nr.': n.internnummer || '',
        'Armatur ID': n.amatur_id || '',
        'Fordeling': n.fordeling || '',
        'Kurs': n.kurs || '',
        'Bygg': n.bygg || '',
        'Etasje': n.etasje || '',
        'Plassering': n.plassering || '',
        'Produsent': n.produsent || '',
        'Type': n.type || '',
        'Batteritype': n.batteritype || '',
        'Status': n.status || '',
        'Kontrollert': n.kontrollert ? 'Ja' : 'Nei',
        'Notat': n.notat || ''
      }))

      // Opprett arbeidsbok
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Sett kolonnebredder
      ws['!cols'] = [
        { wch: 10 }, // Intern nr.
        { wch: 12 }, // Armatur ID
        { wch: 12 }, // Fordeling
        { wch: 10 }, // Kurs
        { wch: 10 }, // Etasje
        { wch: 20 }, // Plassering
        { wch: 15 }, // Produsent
        { wch: 12 }, // Type
        { wch: 15 }, // Status
        { wch: 12 }, // Kontrollert
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Nødlysliste')

      // Generer filnavn
      const dato = new Date().toISOString().split('T')[0]
      const filnavnSafe = anleggsnavn
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `Nodlysliste_${filnavnSafe}_${dato}.xlsx`

      // Last ned
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Feil ved eksport til Excel:', error)
      toast.error('Kunne ikke eksportere til Excel')
    }
  }

  // Hent unike verdier for autocomplete

  const selectedKundeNavn = kunder.find(k => k.id === selectedKunde)?.navn || ''
  const selectedAnleggNavn = anlegg.find(a => a.id === selectedAnlegg)?.anleggsnavn || ''

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <NodlysPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        onBack={() => setPreviewPdf(null)}
        onSave={async () => {
          // Lagre PDF til Supabase Storage
          const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${previewPdf.fileName}`
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
              anlegg_id: selectedAnlegg,
              filnavn: previewPdf.fileName,
              url: urlData?.signedUrl || null,
              type: 'Nødlys Rapport',
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
                .eq('id', selectedAnlegg)
                .single()

              if (anleggData) {
                const kundeNummer = (anleggData.customer as any)?.kunde_nummer
                const kundeNavnDropbox = (anleggData.customer as any)?.navn

                if (kundeNummer && kundeNavnDropbox) {
                  console.log('📤 Laster opp nødlys-rapport til Dropbox...')
                  const dropboxResult = await uploadKontrollrapportToDropbox(
                    kundeNummer,
                    kundeNavnDropbox,
                    selectedAnleggNavn,
                    previewPdf.fileName,
                    previewPdf.blob
                  )

                  if (dropboxResult.success) {
                    console.log('✅ Nødlys-rapport lastet opp til Dropbox:', dropboxResult.path)
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
        }}
      />
    )
  }

  // Sjekk viewMode først (viktig for å håndtere skjemaer i fullskjerm)
  if (viewMode === 'nettverk') {
    return (
      <NettverkView
        anleggId={selectedAnlegg}
        nettverkListe={nettverkListe}
        onBack={() => setViewMode('list')}
        onUpdate={() => checkNettverk(selectedAnlegg)}
      />
    )
  }

  if (viewMode === 'import') {
    return (
      <NodlysImport
        anleggId={selectedAnlegg}
        onClose={() => setViewMode('list')}
        onImportComplete={async () => {
          await loadNodlys(selectedAnlegg)
        }}
      />
    )
  }

  if (viewMode === 'bulk') {
    return (
      <BulkAddForm
        anleggId={selectedAnlegg}
        onSave={async () => {
          await loadNodlys(selectedAnlegg)
          setViewMode('list')
        }}
        onCancel={() => {
          setViewMode('list')
        }}
      />
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <NodlysForm
        nodlys={selectedNodlys}
        anleggId={selectedAnlegg}
        onSave={async () => {
          await loadNodlys(selectedAnlegg)
          setViewMode('list')
          setSelectedNodlys(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedNodlys(null)
        }}
      />
    )
  }

  const alleKontrollert = nodlysListe.length > 0 && nodlysListe.every(n => n.kontrollert)
  const antallKontrollert = nodlysListe.filter(n => n.kontrollert).length

  function tilbake() {
    if (fromAnlegg && state?.anleggId) navigate(`/anlegg/${state.anleggId}`)
    else onBack()
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={tilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />{fromAnlegg ? 'Anlegg' : 'Rapporter'}</button>
        {selectedAnleggNavn && <><span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{selectedAnleggNavn}</span></>}
      </div>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Lightbulb className="w-6 h-6 text-yellow-500" />Nødlys</h1>
          {selectedAnlegg ? (
            <button type="button" onClick={() => setVisVelger(v => !v)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary mt-0.5 text-left">
              {selectedKundeNavn} · <span className="font-medium text-gray-900 dark:text-white">{selectedAnleggNavn}</span> <span className="text-xs">{visVelger ? '· skjul velger' : '· bytt anlegg'}</span>
            </button>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Velg kunde og anlegg for å starte kontrollen.</p>}
        </div>
        {selectedAnlegg && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu trigger={open => <IconButton variant="outline" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} />}>
              <MenuItem icon={<Plus />} onSelect={() => setViewMode('bulk')}>Legg til flere (nummerert)</MenuItem>
              <MenuItem icon={<Upload />} onSelect={() => setViewMode('import')}>Importer fra Excel/Numbers/CSV</MenuItem>
              <MenuItem icon={<FileSpreadsheet />} onSelect={eksporterTilExcel}>Eksporter til Excel</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Building2 />} onSelect={() => setViewMode('nettverk')}>{harNettverk ? `Sentralisert anlegg (${nettverkListe.length})` : 'Legg til sentralisert anlegg'}</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<ClipboardCheck />} onSelect={markerAlleKontrollert}>{alleKontrollert ? 'Alle er kontrollert' : `Merk alle ${nodlysListe.length - antallKontrollert} gjenstående som kontrollert…`}</MenuItem>
            </DropdownMenu>
            <Button variant="primary" icon={<Plus />} onClick={() => { setSelectedNodlys(null); setViewMode('create') }}><span className="hidden sm:inline">Ny armatur</span></Button>
          </div>
        )}
      </header>

      {/* Kunde/anlegg-velger – bare når vi ikke kom fra et anlegg, eller brukeren vil bytte */}
      {(visVelger || !selectedAnlegg) && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Combobox label="Kunde" options={kunder.map(k => ({ id: k.id, label: k.navn }))} value={selectedKunde} onChange={val => { setSelectedKunde(val); setSelectedAnlegg('') }} placeholder="Søk og velg kunde…" searchPlaceholder="Skriv for å søke…" emptyMessage="Ingen kunder funnet" />
            <Combobox label="Anlegg" options={anlegg.map(a => ({ id: a.id, label: a.anleggsnavn, sublabel: a.adresse ? `${a.adresse}${a.poststed ? `, ${a.poststed}` : ''}` : undefined }))} value={selectedAnlegg} onChange={val => { setSelectedAnlegg(val); if (val) setVisVelger(false) }} placeholder="Søk og velg anlegg…" searchPlaceholder="Skriv for å søke…" emptyMessage="Ingen anlegg funnet" disabled={!selectedKunde} />
          </div>
        </div>
      )}

      {selectedAnlegg && (
        <>
          {!isOnline && <div className="card !py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">Du er offline – endringer lagres lokalt og sendes når du er på nett igjen.</div>}

          {loading && nodlysListe.length === 0 ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div> : (
            <NodlysListe
              enheter={nodlysListe}
              lagrer={lagrer}
              onEndre={lagreEndring}
              onEndreFlere={lagreEndringFlere}
              onSlett={e => deleteNodlys(e.id)}
              onSlettFlere={deleteNodlysFlere}
              onRediger={e => { setSelectedNodlys(e); setViewMode('edit') }}
            />
          )}

          {/* Fullfør kontroll */}
          <section className="card space-y-4" aria-label="Fullfør kontroll">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><ClipboardCheck className="w-5 h-5" /></span>
              <div><h2 className="text-base font-semibold text-gray-900 dark:text-white">Fullfør kontroll</h2><p className="text-xs text-gray-500 dark:text-gray-400">Sjekk punktene, velg dato og generer rapporten.</p></div>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <Punkt ok={alleKontrollert} tittel="Armaturer kontrollert" tekst={`${antallKontrollert} av ${nodlysListe.length}`} />
              <Punkt ok={Boolean(evakueringsplanStatus)} tittel="Evakueringsplan" tekst={evakueringsplanStatus || 'Ikke satt'} />
              <Punkt ok tittel="Kontrolldato" tekst={kontrolldato.toLocaleDateString('nb-NO')} />
            </ol>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="evak-status" className="block text-sm font-medium text-gray-900 dark:text-white">Evakueringsplaner</label>
                <select id="evak-status" value={evakueringsplanStatus} onChange={e => { setEvakueringsplanStatus(e.target.value); saveEvakueringsplan(e.target.value) }} className="input">
                  <option value="">Velg status</option>
                  <option value="Ja">Ja – i orden</option>
                  <option value="Nei">Nei – mangler</option>
                  <option value="Må oppdateres">Må oppdateres</option>
                </select>
              </div>
              <KontrolldatoVelger kontrolldato={kontrolldato} onDatoChange={setKontrolldato} label="Kontrolldato" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button variant="primary" size="md" icon={<Save />} loading={loading} disabled={nodlysListe.length === 0} onClick={() => genererPDF('save')} className="sm:flex-1">Generer rapport</Button>
              <Button variant="outline" size="md" icon={<Eye />} disabled={loading || nodlysListe.length === 0} onClick={() => genererPDF('preview')}>Forhåndsvis</Button>
            </div>
            {!alleKontrollert && nodlysListe.length > 0 && <p className="text-xs text-yellow-700 dark:text-yellow-400">{nodlysListe.length - antallKontrollert} armaturer er ikke kontrollert ennå. Du kan likevel generere rapport.</p>}
          </section>

          <KommentarViewNodlys anleggId={selectedAnlegg} kundeNavn={selectedKundeNavn} anleggNavn={selectedAnleggNavn} onBack={() => {}} />
        </>
      )}

      <TjenesteFullfortDialog tjeneste="Nødlys" isOpen={showFullfortDialog} onConfirm={handleTjenesteFullfort} onCancel={handleTjenesteAvbryt} />
      <SendRapportDialog isOpen={showSendRapportDialog} onConfirm={handleSendRapportConfirm} onCancel={handleSendRapportCancel} />
    </div>
  )
}

function Punkt({ ok, tittel, tekst }: { ok: boolean; tittel: string; tekst: string }) {
  return (
    <li className={`flex items-center gap-3 p-3 rounded-lg border ${ok ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-800'}`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-dark-100 text-gray-500'}`}>{ok ? '✓' : '•'}</span>
      <span className="min-w-0"><span className={`block font-medium ${ok ? 'text-green-800 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{tittel}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{tekst}</span></span>
    </li>
  )
}

// Nødlys Form Component
interface NodlysFormProps {
  nodlys: NodlysEnhet | null
  anleggId: string
  onSave: () => void
  onCancel: () => void
}

function NodlysForm({ nodlys, anleggId, onSave, onCancel }: NodlysFormProps) {
  const { isOnline, queueInsert, queueUpdate } = useOfflineQueue()
  const [formData, setFormData] = useState({
    internnummer: nodlys?.internnummer || '',
    amatur_id: nodlys?.amatur_id || '',
    fordeling: nodlys?.fordeling || '',
    kurs: nodlys?.kurs || '',
    bygg: nodlys?.bygg || '',
    batteritype: nodlys?.batteritype || '',
    notat: nodlys?.notat || '',
    etasje: nodlys?.etasje || '',
    type: nodlys?.type || '',
    produsent: nodlys?.produsent || '',
    plassering: nodlys?.plassering || '',
    status: nodlys?.status || 'OK',
    kontrollert: nodlys?.kontrollert || false,
  })
  const [saving, setSaving] = useState(false)
  const [fordelingOptions, setFordelingOptions] = useState<string[]>([])
  const [byggOptions, setByggOptions] = useState<string[]>([])
  const [kursOptions, setKursOptions] = useState<string[]>([])
  const [produsentOptions, setProdusentOptions] = useState<string[]>([])
  const [showFordelingSuggestions, setShowFordelingSuggestions] = useState(false)
  const [showKursSuggestions, setShowKursSuggestions] = useState(false)
  const [showProdusentSuggestions, setShowProdusentSuggestions] = useState(false)
  const [nesteInternnummer, setNesteInternnummer] = useState<number | null>(null)

  // Hent unike verdier fra eksisterende nødlysenheter og beregn neste internnummer
  useEffect(() => {
    async function loadOptions() {
      try {
        const { data, error } = await supabase
          .from('anleggsdata_nodlys')
          .select('fordeling, kurs, produsent, bygg, internnummer')
          .eq('anlegg_id', anleggId)

        if (error) throw error
        
        if (data) {
          const fordelinger = Array.from(new Set(data.map(d => d.fordeling).filter((v): v is string => v !== null && v !== ''))).sort()
          const kurser = Array.from(new Set(data.map(d => d.kurs).filter((v): v is string => v !== null && v !== ''))).sort()
          const produsenter = Array.from(new Set(data.map(d => d.produsent).filter((v): v is string => v !== null && v !== ''))).sort()
          
          setFordelingOptions(fordelinger)
          setByggOptions(Array.from(new Set(data.map(d => d.bygg).filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b, 'nb-NO', { numeric: true })))
          setKursOptions(kurser)
          setProdusentOptions(produsenter)

          // Beregn neste internnummer hvis vi oppretter ny enhet
          if (!nodlys) {
            const internnumre = data
              .map(d => parseInt(d.internnummer || '0'))
              .filter(n => !isNaN(n) && n > 0)
            
            const maxNummer = internnumre.length > 0 ? Math.max(...internnumre) : 0
            const neste = maxNummer + 1
            setNesteInternnummer(neste)
            setFormData(prev => ({ ...prev, internnummer: neste.toString() }))
          }
        }
      } catch (error) {
        console.error('Feil ved lasting av alternativer:', error)
      }
    }
    loadOptions()
  }, [anleggId, nodlys])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        anlegg_id: anleggId,
        internnummer: formData.internnummer || null,
        amatur_id: formData.amatur_id || null,
        fordeling: formData.fordeling || null,
        kurs: formData.kurs || null,
        bygg: formData.bygg.trim() || null,
        batteritype: formData.batteritype.trim() || null,
        notat: formData.notat.trim() || null,
        etasje: formData.etasje || null,
        type: formData.type || null,
        produsent: formData.produsent || null,
        plassering: formData.plassering || null,
        status: formData.status || null,
        kontrollert: formData.kontrollert,
      }

      if (nodlys) {
        // Update
        if (isOnline) {
          const { error } = await supabase
            .from('anleggsdata_nodlys')
            .update(dataToSave)
            .eq('id', nodlys.id)

          if (error) throw error
        } else {
          queueUpdate('anleggsdata_nodlys', { id: nodlys.id, ...dataToSave })
          console.log('📝 Endring lagret lokalt - synkroniseres når du er online igjen')
        }
      } else {
        // Create
        if (isOnline) {
          const { error } = await supabase
            .from('anleggsdata_nodlys')
            .insert([dataToSave])

          if (error) throw error
        } else {
          queueInsert('anleggsdata_nodlys', dataToSave)
          console.log('📝 Ny enhet lagret lokalt - synkroniseres når du er online igjen')
        }
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      toast.error('Kunne ikke lagre armatur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {nodlys ? 'Rediger nødlysenhet' : 'Ny nødlysenhet'}
          </h1>
          <p className="text-gray-400">
            {nodlys ? 'Oppdater nødlysinformasjon' : 'Registrer ny nødlysarmatur'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Internnummer */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Internnummer
              {!nodlys && nesteInternnummer && (
                <span className="ml-2 text-xs text-green-400">
                  (Foreslått: {nesteInternnummer})
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.internnummer}
              onChange={(e) => setFormData({ ...formData, internnummer: e.target.value })}
              className="input"
              placeholder={nesteInternnummer ? `Foreslått: ${nesteInternnummer}` : "F.eks. 1, 2, 3, etc."}
            />
          </div>

          {/* Armatur ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Armatur ID
            </label>
            <input
              type="text"
              value={formData.amatur_id}
              onChange={(e) => setFormData({ ...formData, amatur_id: e.target.value })}
              className="input"
              placeholder="Armatur-identifikator"
            />
          </div>

          {/* Plassering */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plassering
            </label>
            <input
              type="text"
              value={formData.plassering}
              onChange={(e) => setFormData({ ...formData, plassering: e.target.value })}
              className="input"
              placeholder="F.eks. Gang, Over hoveddør, etc."
            />
          </div>

          {/* Fordeling */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fordeling
            </label>
            <input
              type="text"
              value={formData.fordeling}
              onChange={(e) => {
                setFormData({ ...formData, fordeling: e.target.value })
                setShowFordelingSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowFordelingSuggestions(formData.fordeling.length > 0)}
              onBlur={() => setTimeout(() => setShowFordelingSuggestions(false), 200)}
              className="input"
              placeholder="Skriv eller velg fordeling"
            />
            {showFordelingSuggestions && fordelingOptions.filter(opt => 
              opt.toLowerCase().includes(formData.fordeling.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {fordelingOptions
                  .filter(opt => opt.toLowerCase().includes(formData.fordeling.toLowerCase()))
                  .map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData({ ...formData, fordeling: option })
                        setShowFordelingSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Kurs */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kurs
            </label>
            <input
              type="text"
              value={formData.kurs}
              onChange={(e) => {
                setFormData({ ...formData, kurs: e.target.value })
                setShowKursSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowKursSuggestions(formData.kurs.length > 0)}
              onBlur={() => setTimeout(() => setShowKursSuggestions(false), 200)}
              className="input"
              placeholder="Skriv eller velg kurs"
            />
            {showKursSuggestions && kursOptions.filter(opt => 
              opt.toLowerCase().includes(formData.kurs.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {kursOptions
                  .filter(opt => opt.toLowerCase().includes(formData.kurs.toLowerCase()))
                  .map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData({ ...formData, kurs: option })
                        setShowKursSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Bygg */}
          <div>
            <label htmlFor="nodlys-bygg" className="block text-sm font-medium text-gray-300 mb-2">
              Bygg <span className="text-gray-500 font-normal">(valgfritt)</span>
            </label>
            <input
              id="nodlys-bygg"
              type="text"
              list="nodlys-bygg-forslag"
              value={formData.bygg}
              onChange={(e) => setFormData({ ...formData, bygg: e.target.value })}
              className="input"
              placeholder="F.eks. Bygg 1, Fløy B"
            />
            <datalist id="nodlys-bygg-forslag">{byggOptions.map(b => <option key={b} value={b} />)}</datalist>
          </div>

          {/* Etasje */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Etasje
            </label>
            <select
              value={formData.etasje}
              onChange={(e) => setFormData({ ...formData, etasje: e.target.value })}
              className="input"
            >
              <option value="">Velg etasje</option>
              {etasjeOptions.map((etasje) => (
                <option key={etasje} value={etasje}>{etasje}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              <option value="">Velg type</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Produsent */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Produsent
            </label>
            <input
              type="text"
              value={formData.produsent}
              onChange={(e) => {
                setFormData({ ...formData, produsent: e.target.value })
                setShowProdusentSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowProdusentSuggestions(formData.produsent.length > 0)}
              onBlur={() => setTimeout(() => setShowProdusentSuggestions(false), 200)}
              className="input"
              placeholder="Skriv eller velg produsent"
            />
            {showProdusentSuggestions && produsentOptions.filter(opt => 
              opt.toLowerCase().includes(formData.produsent.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {produsentOptions
                  .filter(opt => opt.toLowerCase().includes(formData.produsent.toLowerCase()))
                  .map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData({ ...formData, produsent: option })
                        setShowProdusentSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Batteritype */}
          <div>
            <label htmlFor="nodlys-batteri" className="block text-sm font-medium text-gray-300 mb-2">
              Batteritype
            </label>
            <input
              id="nodlys-batteri"
              type="text"
              list="nodlys-batteri-forslag"
              value={formData.batteritype}
              onChange={(e) => setFormData({ ...formData, batteritype: e.target.value })}
              className="input"
              placeholder="F.eks. NiCd 3,6V 1,5Ah"
            />
            <datalist id="nodlys-batteri-forslag">{BATTERITYPER.map(b => <option key={b} value={b} />)}</datalist>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
            >
              <option value="">Velg status</option>
              {statusTyper.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Notat */}
          <div className="md:col-span-2">
            <label htmlFor="nodlys-notat" className="block text-sm font-medium text-gray-300 mb-2">
              Notat
            </label>
            <textarea
              id="nodlys-notat"
              value={formData.notat}
              onChange={(e) => setFormData({ ...formData, notat: e.target.value })}
              rows={2}
              className="input !h-auto"
              placeholder="F.eks. «Bak himling», «Venter på deler», «Byttet batteri 2026»"
            />
          </div>

          {/* Kontrollert */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.kontrollert}
                onChange={(e) => setFormData({ ...formData, kontrollert: e.target.checked })}
                className="w-4 h-4 text-primary bg-dark-100 border-gray-700 rounded focus:ring-primary focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-300">Kontrollert</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : nodlys ? 'Oppdater' : 'Opprett'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  )
}

// Nettverk View Component
interface NettverkViewProps {
  anleggId: string
  nettverkListe: NettverkEnhet[]
  onBack: () => void
  onUpdate: () => void
}

function NettverkView({ anleggId, nettverkListe, onBack, onUpdate }: NettverkViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<NettverkEnhet>>({})
  const [isCreating, setIsCreating] = useState(false)

  async function saveNettverk() {
    try {
      if (isCreating) {
        // Opprett ny
        const { error } = await supabase
          .from('nettverk_nodlys')
          .insert([{ ...editData, anlegg_id: anleggId }])

        if (error) throw error
      } else if (editingId) {
        // Oppdater eksisterende
        const { error } = await supabase
          .from('nettverk_nodlys')
          .update(editData)
          .eq('id', editingId)

        if (error) throw error
      }
      
      setEditingId(null)
      setEditData({})
      setIsCreating(false)
      onUpdate()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      toast.error('Kunne ikke lagre endringer')
    }
  }

  function startCreate() {
    setIsCreating(true)
    setEditingId(null)
    setEditData({})
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData({})
    setIsCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sentralisert nødlysanlegg</h1>
          <p className="text-gray-400">Nettverksenheter for dette anlegget</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Nettverksenheter ({nettverkListe.length})
          </h2>
          <button
            onClick={startCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ny nettverksenhet
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Nettverk ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">AH</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Spenning</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Batterialder</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {nettverkListe.map((enhet) => (
                <tr key={enhet.id} className="border-b border-gray-800 hover:bg-dark-100">
                  <td className="py-3 px-4 text-gray-300">{enhet.nettverk_id || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.plassering || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.type || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.ah || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.spenning || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.batterialder || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(enhet.id)
                          setEditData(enhet)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Rediger"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(editingId || isCreating) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isCreating ? 'Ny nettverksenhet' : 'Rediger nettverksenhet'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nettverk ID</label>
              <input
                type="text"
                value={editData.nettverk_id || ''}
                onChange={(e) => setEditData({ ...editData, nettverk_id: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plassering</label>
              <input
                type="text"
                value={editData.plassering || ''}
                onChange={(e) => setEditData({ ...editData, plassering: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <input
                type="text"
                value={editData.type || ''}
                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">AH</label>
              <input
                type="text"
                value={editData.ah || ''}
                onChange={(e) => setEditData({ ...editData, ah: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Spenning</label>
              <input
                type="text"
                value={editData.spenning || ''}
                onChange={(e) => setEditData({ ...editData, spenning: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Batterialder</label>
              <input
                type="number"
                value={editData.batterialder || ''}
                onChange={(e) => setEditData({ ...editData, batterialder: parseInt(e.target.value) || null })}
                className="input"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={saveNettverk} className="btn-primary">
              {isCreating ? 'Opprett' : 'Lagre'}
            </button>
            <button onClick={cancelEdit} className="btn-secondary">Avbryt</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Bulk Add Form Component
interface BulkAddFormProps {
  anleggId: string
  onSave: () => void
  onCancel: () => void
}

function BulkAddForm({ anleggId, onSave, onCancel }: BulkAddFormProps) {
  const { isOnline, queueInsert } = useOfflineQueue()
  const [antall, setAntall] = useState(5)
  const [saving, setSaving] = useState(false)
  const [startNummer, setStartNummer] = useState<number>(1)

  // Hent neste ledige internnummer
  useEffect(() => {
    async function getNesteNummer() {
      try {
        const { data, error } = await supabase
          .from('anleggsdata_nodlys')
          .select('internnummer')
          .eq('anlegg_id', anleggId)

        if (error) throw error
        
        if (data) {
          const internnumre = data
            .map(d => parseInt(d.internnummer || '0'))
            .filter(n => !isNaN(n) && n > 0)
          
          const maxNummer = internnumre.length > 0 ? Math.max(...internnumre) : 0
          setStartNummer(maxNummer + 1)
        }
      } catch (error) {
        console.error('Feil ved henting av neste nummer:', error)
      }
    }
    getNesteNummer()
  }, [anleggId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (antall < 1 || antall > 25) {
      toast.warning('Antall må være mellom 1 og 25')
      return
    }

    setSaving(true)

    try {
      // Opprett array med nødlysenheter med automatisk nummerering
      const nyeEnheter = Array.from({ length: antall }, (_, index) => ({
        anlegg_id: anleggId,
        internnummer: (startNummer + index).toString(),
        amatur_id: null,
        fordeling: null,
        kurs: null,
        bygg: null,
        batteritype: null,
        notat: null,
        etasje: null,
        type: null,
        produsent: null,
        plassering: null,
        status: null,
        kontrollert: false,
      }))

      if (isOnline) {
        const { error } = await supabase
          .from('anleggsdata_nodlys')
          .insert(nyeEnheter)

        if (error) throw error
      } else {
        // Offline: legg alle enheter i kø
        nyeEnheter.forEach(enhet => {
          queueInsert('anleggsdata_nodlys', enhet)
        })
        console.log(`📝 ${antall} nye enheter lagret lokalt - synkroniseres når du er online igjen`)
      }

      onSave()
    } catch (error) {
      console.error('Feil ved opprettelse:', error)
      toast.error('Kunne ikke opprette armaturer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Legg til flere nødlysenheter</h1>
          <p className="text-gray-400">Opprett flere tomme rader som du kan fylle ut etterpå</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Antall enheter å opprette <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={antall}
            onChange={(e) => setAntall(parseInt(e.target.value) || 0)}
            className="input"
            min="1"
            max="25"
            required
          />
          <p className="text-sm text-gray-400 mt-2">
            Maks 25 enheter om gangen. Internnummer vil automatisk bli satt fra <span className="text-green-400 font-semibold">{startNummer}</span> til <span className="text-green-400 font-semibold">{startNummer + antall - 1}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving || antall < 1 || antall > 25}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Oppretter...' : `Opprett ${antall} ${antall === 1 ? 'enhet' : 'enheter'}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>

      <div className="card bg-blue-900/10 border-blue-800/30">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Tips</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Internnummer settes automatisk basert på eksisterende enheter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Klikk på en celle i tabellen for å redigere</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Autocomplete for Fordeling, Kurs og Produsent basert på tidligere verdier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Perfekt når du skal registrere mange nødlys raskt</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
