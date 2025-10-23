import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Battery, Info, Server, CheckCircle, HelpCircle, Wifi, WifiOff, Clock, Eye, Download, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuthStore } from '@/store/authStore'
import { RoyklukerPreview } from '../RoyklukerPreview'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'

interface RoyklukeSentral {
  id: string
  sentral_nr?: number | null
  plassering?: string | null
}

interface RoyklukeData {
  id?: string
  sentral_id?: string | null
  // Type
  anlegg_type?: string | null
  // Anleggsinfo
  anleggsinfo?: string | null
  // Sentral
  sentral_produsent?: string | null
  // Batteriinformasjon
  batteri_v?: string | null
  batteri_alder?: number | null
  ladespenning?: string | null
  // Branngardin
  branngardin_type?: string | null
  branngardin_antall?: number | null
  branngardin_produsent?: string | null
  branngardin_klassifisering?: string | null
  aktiveringspenning?: string | null
  hvilespenning?: string | null
  branngardin_merknad?: string | null
  // Sjekkpunkter
  sjekk_ledeskinner?: string | null
  sjekk_beslag?: string | null
  sjekk_motor?: string | null
  sjekk_gardin_status?: string | null
  // Signal
  signaltype?: string | null
  // Tilstand
  tilstand_sentral?: string | null
  tilstand_ladespenning?: string | null
  tilstand_nettspenning?: string | null
  tilstand_nettlampe?: string | null
  tilstand_feillampe?: string | null
  tilstand_aktiveringslampe?: string | null
  tilstand_bryter?: string | null
  tilstand_signal?: string | null
  // Kontroll
  kontroll_funksjonstest?: string | null
  kontroll_forskriftsmessig?: string | null
  kontroll_anbefalte_utbedringer?: string | null
  // Røykluker-spesifikke felter
  motor_type?: string | null
  motor_antall?: number | null
  roykluke_type?: string | null
  roykluke_luketype?: string | null
  roykluke_storrelse?: string | null
  roykluke_antall?: number | null
  roykluke_merknad?: string | null
  batteri_type?: string | null
  batteri_spenning?: string | null
  ladespenning_status?: string | null
  krets_nr?: string | null
  krets_aktiveringspenning?: string | null
  krets_hvilespenning?: string | null
  krets_motstand?: string | null
  sjekk_manuell_utloser?: string | null
  sjekk_karm?: string | null
  sjekk_overlys?: string | null
  sjekk_beslag_roykluke?: string | null
  sjekk_krets?: string | null
  byttet_utstyr?: string | null
  byttet_utstyr_antall?: number | null
  created_at?: string
}

interface DataViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
}

const statusOptions = ['Ok', 'Avvik']
const kontrollOptions = ['Ja', 'Nei']
const klassifiseringOptions = [
  '',
  'E 60',
  'E 120',
  'EW 30',
  'EW 60',
  'EI 30',
  'EI 60'
]

export function DataView({ anleggId, kundeNavn, anleggNavn }: DataViewProps) {
  const navigate = useNavigate()
  const { user: _user } = useAuthStore()
  const [sentraler, setSentraler] = useState<RoyklukeSentral[]>([])
  const [selectedSentral, setSelectedSentral] = useState<string>('')
  const [data, setData] = useState<RoyklukeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showKlassifiseringHelp, setShowKlassifiseringHelp] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ mode: 'save' | 'download'; doc: any; fileName: string } | null>(null)
  const [kundeId, setKundeId] = useState<string | null>(null)

  useEffect(() => {
    loadSentraler()
  }, [anleggId])

  useEffect(() => {
    if (selectedSentral) {
      loadData()
    }
  }, [selectedSentral])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('Tilbake online - synkroniserer data...')
      syncOfflineData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      console.log('Offline - data lagres lokalt')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [selectedSentral])

  // Autosave effect
  useEffect(() => {
    if (hasChanges && data && selectedSentral) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }

      // Set new timeout for autosave (3 seconds after last change)
      const timeout = setTimeout(() => {
        console.log('Autosave triggered')
        autoSave()
      }, 3000)

      setAutoSaveTimeout(timeout)
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
    }
  }, [data, hasChanges])

  // Load from localStorage on mount
  useEffect(() => {
    if (selectedSentral) {
      loadFromLocalStorage()
    }
  }, [selectedSentral])

  async function loadSentraler() {
    try {
      // Hent kundeId fra anlegg
      const { data: anleggData } = await supabase
        .from('anlegg')
        .select('kundenr')
        .eq('id', anleggId)
        .single()
      
      if (anleggData) {
        setKundeId(anleggData.kundenr)
      }
      
      const { data: sentralData, error } = await supabase
        .from('roykluke_sentraler')
        .select('id, sentral_nr, plassering')
        .eq('anlegg_id', anleggId)
        .order('sentral_nr', { ascending: true })

      if (error) throw error
      setSentraler(sentralData || [])
      
      if (sentralData && sentralData.length > 0) {
        setSelectedSentral(sentralData[0].id)
      }
    } catch (error) {
      console.error('Feil ved lasting av sentraler:', error)
    }
  }

  async function loadData() {
    if (!selectedSentral) return

    try {
      setLoading(true)
      const { data: sentralData, error } = await supabase
        .from('roykluke_sentraler')
        .select('*')
        .eq('id', selectedSentral)
        .single()

      if (error) {
        console.error('Feil ved lasting av sentraldata:', error)
        throw error
      }
      
      if (sentralData) {
        setData(sentralData as RoyklukeData)
      }
    } catch (error) {
      console.error('Feil ved lasting av data:', error)
      alert('Kunne ikke laste sentraldata')
    } finally {
      setLoading(false)
    }
  }

  function getLocalStorageKey() {
    return `roykluke_data_${selectedSentral}`
  }

  function saveToLocalStorage(dataToSave: RoyklukeData) {
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(dataToSave))
      localStorage.setItem(`${getLocalStorageKey()}_timestamp`, new Date().toISOString())
      console.log('Data lagret til localStorage')
    } catch (error) {
      console.error('Feil ved lagring til localStorage:', error)
    }
  }

  function loadFromLocalStorage() {
    try {
      const savedData = localStorage.getItem(getLocalStorageKey())
      if (savedData) {
        const timestamp = localStorage.getItem(`${getLocalStorageKey()}_timestamp`)
        console.log('Fant lokal kopi i localStorage (lagret:', timestamp, ')')
        // Merk: Vi laster ikke automatisk fra localStorage for å unngå å overskrive nyere data
        // Data synkroniseres automatisk når man kommer online igjen
      }
    } catch (error) {
      console.error('Feil ved lasting fra localStorage:', error)
    }
  }

  async function autoSave() {
    if (!data || !selectedSentral) return

    try {
      setSaving(true)
      
      // Lagre til localStorage først (offline backup)
      saveToLocalStorage(data)

      // Prøv å lagre til database hvis online
      if (isOnline) {
        const { error } = await supabase
          .from('roykluke_sentraler')
          .update(data)
          .eq('id', selectedSentral)

        if (error) {
          console.error('Feil ved autosave:', error)
          // Ikke kast feil - data er lagret lokalt
        } else {
          setHasChanges(false)
          setLastSaved(new Date())
          console.log('Autosave fullført')
        }
      } else {
        console.log('Offline - data lagret lokalt')
      }
    } catch (error) {
      console.error('Feil ved autosave:', error)
    } finally {
      setSaving(false)
    }
  }

  async function syncOfflineData() {
    if (!selectedSentral) return

    try {
      const savedData = localStorage.getItem(getLocalStorageKey())
      if (savedData) {
        const parsed = JSON.parse(savedData) as RoyklukeData
        
        const { error } = await supabase
          .from('roykluke_sentraler')
          .update(parsed)
          .eq('id', selectedSentral)

        if (error) {
          console.error('Feil ved synkronisering:', error)
        } else {
          console.log('Offline data synkronisert')
          setLastSaved(new Date())
          // Fjern fra localStorage etter vellykket synkronisering
          localStorage.removeItem(getLocalStorageKey())
          localStorage.removeItem(`${getLocalStorageKey()}_timestamp`)
        }
      }
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    }
  }

  async function lagreData() {
    if (!data || !selectedSentral) return

    try {
      setSaving(true)
      
      // Lagre til localStorage først
      saveToLocalStorage(data)

      // Lagre til database
      const { error } = await supabase
        .from('roykluke_sentraler')
        .update(data)
        .eq('id', selectedSentral)

      if (error) {
        console.error('Feil ved oppdatering:', error)
        throw error
      }

      setHasChanges(false)
      setLastSaved(new Date())
      alert('Data lagret!')
      
      // Fjern fra localStorage etter vellykket lagring
      localStorage.removeItem(getLocalStorageKey())
      localStorage.removeItem(`${getLocalStorageKey()}_timestamp`)
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert(isOnline ? 'Kunne ikke lagre data til server, men data er lagret lokalt' : 'Offline - data lagret lokalt')
    } finally {
      setSaving(false)
    }
  }

  function updateData(field: keyof RoyklukeData, value: any) {
    if (!data) return
    setData({ ...data, [field]: value })
    setHasChanges(true)
  }

  async function genererRapport(mode: 'preview' | 'save' | 'download' = 'preview') {
    try {
      setGeneratingPdf(true)

      // Hent alle sentraler med full data
      const { data: alleSentraler, error: sentralError } = await supabase
        .from('roykluke_sentraler')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('sentral_nr', { ascending: true })

      if (sentralError) throw sentralError

      // Hent alle luker
      const sentralIds = alleSentraler?.map(s => s.id) || []
      let alleLuker: any[] = []
      
      if (sentralIds.length > 0) {
        const { data: lukerData, error: lukerError } = await supabase
          .from('roykluke_luker')
          .select('*')
          .in('sentral_id', sentralIds)
          .order('plassering', { ascending: true })

        if (lukerError) throw lukerError
        alleLuker = lukerData || []
      }

      // Hent kontaktperson via junction table
      const { data: kontaktData } = await supabase
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
      
      const kontakt = Array.isArray(kontaktData?.kontaktpersoner) 
        ? kontaktData.kontaktpersoner[0] 
        : kontaktData?.kontaktpersoner

      // Hent tekniker basert på epost
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: tekniker } = await supabase
        .from('ansatte')
        .select('navn, telefon, epost')
        .eq('epost', authUser?.email)
        .maybeSingle()

      // Hent kommentarer for anlegget
      const { data: kommentarer } = await supabase
        .from('kommentar_roykluker')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('created_at', { ascending: false })

      const doc = new jsPDF()
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
      doc.text('RAPPORT - RØYKLUKER', 20, yPos)
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
      
      const idag = new Date()
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
      let leftCol = 17
      let rightCol = 104
      
      if (kontakt?.navn) {
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
        doc.text(kontakt.navn, leftCol + 3, yPos + 11)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        let infoY = yPos + 15
        if (kontakt.telefon) {
          doc.text(`Tlf: ${kontakt.telefon}`, leftCol + 3, infoY)
          infoY += 4
        }
        if (kontakt.epost) {
          doc.text(`E-post: ${kontakt.epost}`, leftCol + 3, infoY)
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
      const totaltSentraler = alleSentraler?.length || 0
      const totaltLuker = alleLuker.length
      const lukerOk = alleLuker.filter(l => l.status === 'OK').length
      const lukerAvvik = alleLuker.filter(l => l.status === 'Avvik').length

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
      
      // Totalt sentraler
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.setFillColor(248, 250, 252)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text(totaltSentraler.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('SENTRALER', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Totalt luker
      xPos += boxWidth + 2
      doc.setFillColor(248, 250, 252)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text(totaltLuker.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('TOTALT LUKER', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // OK
      xPos += boxWidth + 2
      doc.setFillColor(240, 253, 244)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 163, 74)
      doc.text(lukerOk.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('OK', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Avvik
      xPos += boxWidth + 2
      doc.setFillColor(254, 242, 242)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(lukerAvvik.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('AVVIK', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

      // Gå gjennom hver sentral - én per side
      alleSentraler?.forEach((sentral, index) => {
        // Ny side for hver sentral
        doc.addPage()
        yPos = 20

        // Sentral header med bakgrunn
        doc.setFillColor(41, 128, 185)
        doc.rect(15, yPos - 5, 180, 12, 'F')
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(`Sentral ${sentral.sentral_nr || index + 1}`, 20, yPos + 3)
        doc.setTextColor(0, 0, 0)
        yPos += 15

        // Grunnleggende info - kompakt boks
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.setFillColor(250, 250, 250)
        doc.rect(15, yPos, 180, 8, 'FD')
        yPos += 5
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Type:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(sentral.anlegg_type || 'Branngardin', 35, yPos)
        doc.setFont('helvetica', 'bold')
        doc.text('Plassering:', 75, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(sentral.plassering || '-', 100, yPos)
        doc.setFont('helvetica', 'bold')
        doc.text('Status:', 155, yPos)
        doc.setFont('helvetica', 'normal')
        const statusColor = sentral.status === 'OK' ? [0, 128, 0] : sentral.status === 'Avvik' ? [255, 165, 0] : [0, 0, 0]
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
        doc.text(sentral.status || '-', 170, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 6

        // Grunnleggende data seksjon med alignment
        yPos += 2
        const labelWidth = 40  // Fast bredde for labels
        
        // Anleggsinfo
        if (sentral.anleggsinfo) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text('Info:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          const anleggsLines = doc.splitTextToSize(sentral.anleggsinfo, 155)
          doc.text(anleggsLines, 20 + labelWidth, yPos)
          yPos += (anleggsLines.length * 3.5) + 1
        }

        // Sentral med alignment
        doc.setFontSize(8)
        if (sentral.sentral_produsent) {
          doc.setFont('helvetica', 'bold')
          doc.text('Sentral:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          doc.text(sentral.sentral_produsent, 20 + labelWidth, yPos)
          yPos += 4
        }
        
        // Signal med alignment
        if (sentral.signaltype) {
          doc.setFont('helvetica', 'bold')
          doc.text('Signal:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          doc.text(sentral.signaltype, 20 + labelWidth, yPos)
          yPos += 4
        }
        
        // Batteri med alignment
        if (sentral.batteri_v || sentral.batteri_alder || sentral.ladespenning) {
          doc.setFont('helvetica', 'bold')
          doc.text('Batteri:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          let battText = ''
          if (sentral.batteri_v) battText += `${sentral.batteri_v}`
          if (sentral.batteri_alder) battText += ` (${sentral.batteri_alder})`
          if (sentral.ladespenning) battText += ` Lade: ${sentral.ladespenning}`
          doc.text(battText, 20 + labelWidth, yPos)
          yPos += 4
        }
        yPos += 1

        // Kolonner for kompakt layout
        const leftCol = 20
        const rightCol = 110

        // Branngardin eller Røykluker basert på type - med seksjonsboks
        if (sentral.anlegg_type === 'Branngardin') {
          // Branngardin
          if (sentral.branngardin_type || sentral.branngardin_produsent) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text('BRANNGARDIN', 20, yPos)
            yPos += 4
            
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            let leftY = yPos
            let rightY = yPos
            
            if (sentral.branngardin_type) {
              doc.text(`Type: ${sentral.branngardin_type}`, leftCol, leftY)
              leftY += 3.5
            }
            if (sentral.branngardin_antall) {
              doc.text(`Antall: ${sentral.branngardin_antall}`, rightCol, rightY)
              rightY += 3.5
            }
            if (sentral.branngardin_produsent) {
              doc.text(`Produsent: ${sentral.branngardin_produsent}`, leftCol, leftY)
              leftY += 3.5
            }
            if (sentral.branngardin_klassifisering) {
              doc.text(`Klassifisering: ${sentral.branngardin_klassifisering}`, rightCol, rightY)
              rightY += 3.5
            }
            if (sentral.aktiveringspenning) {
              doc.text(`Aktivering: ${sentral.aktiveringspenning}`, leftCol, leftY)
              leftY += 3.5
            }
            if (sentral.hvilespenning) {
              doc.text(`Hvile: ${sentral.hvilespenning}`, rightCol, rightY)
              rightY += 3.5
            }
            
            yPos = Math.max(leftY, rightY) + 2
          }
        } else if (sentral.anlegg_type === 'Røykluker') {
          // Overskrift
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text('RØYKLUKER', 20, yPos)
          yPos += 4

          // Motor (hvis finnes)
          doc.setFontSize(8)
          if (sentral.motor_type || sentral.motor_antall) {
            doc.setFont('helvetica', 'bold')
            doc.text('Motor:', 20, yPos)
            doc.setFont('helvetica', 'normal')
            let motorText = ''
            if (sentral.motor_type) motorText += sentral.motor_type
            if (sentral.motor_antall) motorText += ` (${sentral.motor_antall} stk)`
            doc.text(motorText, 38, yPos)
            yPos += 3.5
          }

          // Røykluker detaljer - to kolonner
          doc.setFont('helvetica', 'normal')
          let leftY = yPos
          let rightY = yPos
          
          if (sentral.roykluke_type) {
            doc.text(`Type: ${sentral.roykluke_type}`, leftCol, leftY)
            leftY += 3.5
          }
          if (sentral.roykluke_luketype) {
            doc.text(`Luketype: ${sentral.roykluke_luketype}`, rightCol, rightY)
            rightY += 3.5
          }
          if (sentral.roykluke_storrelse) {
            doc.text(`Størrelse: ${sentral.roykluke_storrelse}`, leftCol, leftY)
            leftY += 3.5
          }
          if (sentral.roykluke_antall) {
            doc.text(`Antall: ${sentral.roykluke_antall} stk`, rightCol, rightY)
            rightY += 3.5
          }
          
          yPos = Math.max(leftY, rightY) + 2

          // Krets - egen subseksjon
          if (sentral.krets_nr || sentral.krets_aktiveringspenning) {
            doc.setFont('helvetica', 'bold')
            doc.text('Krets:', 20, yPos)
            yPos += 3
            doc.setFont('helvetica', 'normal')
            
            leftY = yPos
            rightY = yPos
            
            if (sentral.krets_nr) {
              doc.text(`Nr: ${sentral.krets_nr}`, leftCol, leftY)
              leftY += 3.5
            }
            if (sentral.krets_aktiveringspenning) {
              doc.text(`Aktivering: ${sentral.krets_aktiveringspenning}`, rightCol, rightY)
              rightY += 3.5
            }
            if (sentral.krets_hvilespenning) {
              doc.text(`Hvile: ${sentral.krets_hvilespenning}`, leftCol, leftY)
              leftY += 3.5
            }
            if (sentral.krets_motstand) {
              doc.text(`Motstand: ${sentral.krets_motstand}`, rightCol, rightY)
              rightY += 3.5
            }
            
            yPos = Math.max(leftY, rightY) + 1
          }
          
          yPos += 2
        }

        // Sjekkpunkter i tabell - ultra kompakt (dynamisk basert på type)
        yPos += 3
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('SJEKKPUNKTER', 20, yPos)
        yPos += 3

        // Sjekkpunkter - 4 kolonner (2 punkt/status par per rad)
        const sjekkpunkterBody = sentral.anlegg_type === 'Røykluker' ? [
          ['Sentral', sentral.tilstand_sentral || 'Ok', 'Ladespenning', sentral.tilstand_ladespenning || 'Ok'],
          ['Nettspenning', sentral.tilstand_nettspenning || 'Ok', 'Nettlampe', sentral.tilstand_nettlampe || 'Ok'],
          ['Feillampe', sentral.tilstand_feillampe || 'Ok', 'Aktiveringslampe', sentral.tilstand_aktiveringslampe || 'Ok'],
          ['Motor', sentral.sjekk_motor || 'Ok', 'Manuell utløser', sentral.sjekk_manuell_utloser || 'Ok'],
          ['Karm', sentral.sjekk_karm || 'Ok', 'Overlys', sentral.sjekk_overlys || 'Ok'],
          ['Beslag', sentral.sjekk_beslag_roykluke || 'Ok', 'Krets', sentral.sjekk_krets || 'Ok'],
        ] : [
          ['Ledeskinner', sentral.sjekk_ledeskinner || 'Ok', 'Beslag', sentral.sjekk_beslag || 'Ok'],
          ['Motor', sentral.sjekk_motor || 'Ok', 'Gardin status', sentral.sjekk_gardin_status || 'Ok'],
        ]

        autoTable(doc, {
          startY: yPos,
          head: [['Punkt', 'Status', 'Punkt', 'Status']],
          body: sjekkpunkterBody,
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 45 },
            2: { cellWidth: 45 },
            3: { cellWidth: 45 }
          },
          margin: { left: 15, right: 15 },
          theme: 'grid'
        })
        yPos = (doc as any).lastAutoTable.finalY + 2

        // Tilstand i tabell - ultra kompakt
        yPos += 3
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('TILSTAND', 20, yPos)
        yPos += 3

        autoTable(doc, {
          startY: yPos,
          head: [['Punkt', 'Status', 'Punkt', 'Status']],
          body: [
            ['Sentral', sentral.tilstand_sentral || 'Ok', 'Ladespenning', sentral.tilstand_ladespenning || 'Ok'],
            ['Nettspenning', sentral.tilstand_nettspenning || 'Ok', 'Nettlampe', sentral.tilstand_nettlampe || 'Ok'],
            ['Feillampe', sentral.tilstand_feillampe || 'Ok', 'Aktiveringslampe', sentral.tilstand_aktiveringslampe || 'Ok'],
            ['Bryter', sentral.tilstand_bryter || 'Ok', 'Signal', sentral.tilstand_signal || 'Ok'],
          ],
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 45 },
            2: { cellWidth: 45 },
            3: { cellWidth: 45 }
          },
          margin: { left: 15, right: 15 },
          theme: 'grid'
        })
        yPos = (doc as any).lastAutoTable.finalY + 2

        // Byttet utstyr, Kontroll og Merknad i én kompakt seksjon
        const hasByttetUtstyr = sentral.anlegg_type === 'Røykluker' && (sentral.byttet_utstyr || sentral.byttet_utstyr_antall)
        const hasKontroll = sentral.kontroll_funksjonstest || sentral.kontroll_forskriftsmessig || sentral.kontroll_anbefalte_utbedringer
        const merknadText = sentral.anlegg_type === 'Røykluker' ? sentral.roykluke_merknad : sentral.branngardin_merknad
        
        if (hasByttetUtstyr || hasKontroll || merknadText) {
          yPos += 3
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text('KONTROLL & MERKNADER', 20, yPos)
          yPos += 4
          doc.setFontSize(8)
          
          // Byttet utstyr (inline)
          if (hasByttetUtstyr) {
            doc.setFont('helvetica', 'bold')
            doc.text('Byttet utstyr:', 20, yPos)
            doc.setFont('helvetica', 'normal')
            let byttetText = ''
            if (sentral.byttet_utstyr) byttetText += sentral.byttet_utstyr
            if (sentral.byttet_utstyr_antall) byttetText += ` (${sentral.byttet_utstyr_antall} stk)`
            doc.text(byttetText, 20 + labelWidth + 15, yPos)
            yPos += 3.5
          }
          
          // Funksjonstest og Forskriftsmessig
          if (sentral.kontroll_funksjonstest || sentral.kontroll_forskriftsmessig) {
            if (sentral.kontroll_funksjonstest) {
              doc.setFont('helvetica', 'bold')
              doc.text('Funksjonstest:', 20, yPos)
              doc.setFont('helvetica', 'normal')
              doc.text(sentral.kontroll_funksjonstest, 20 + labelWidth + 15, yPos)
            }
            if (sentral.kontroll_forskriftsmessig) {
              doc.setFont('helvetica', 'bold')
              doc.text('Forskriftsmessig:', 110, yPos)
              doc.setFont('helvetica', 'normal')
              doc.text(sentral.kontroll_forskriftsmessig, 160, yPos)
            }
            yPos += 3.5
          }
          
          // Utbedringer
          if (sentral.kontroll_anbefalte_utbedringer) {
            doc.setFont('helvetica', 'bold')
            doc.text('Utbedringer:', 20, yPos)
            doc.setFont('helvetica', 'normal')
            const utbedringerLines = doc.splitTextToSize(sentral.kontroll_anbefalte_utbedringer, 130)
            doc.text(utbedringerLines, 20 + labelWidth + 15, yPos)
            yPos += (utbedringerLines.length * 3.5) + 1
          }
          
          // Merknad
          if (merknadText) {
            doc.setFont('helvetica', 'bold')
            doc.text('Merknad:', 20, yPos)
            doc.setFont('helvetica', 'normal')
            const merknadLines = doc.splitTextToSize(merknadText, 130)
            doc.text(merknadLines, 20 + labelWidth + 15, yPos)
            yPos += (merknadLines.length * 3.5) + 2
          }
        }

        // Luker for denne sentralen - ultra kompakt
        const sentralLuker = alleLuker.filter(l => l.sentral_id === sentral.id)
        if (sentralLuker.length > 0) {
          yPos += 3
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.text(`LUKER (${sentralLuker.length})`, 20, yPos)
          yPos += 3

          autoTable(doc, {
            startY: yPos,
            head: [['Plassering', 'Status', 'Skader', 'Test']],
            body: sentralLuker.map(l => [
              l.plassering || '-',
              l.status || '-',
              l.skader || '-',
              l.funksjonstest ? 'Ja' : 'Nei'
            ]),
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 15, right: 15 },
            theme: 'grid'
          })
        }
      })

      // Kommentarer seksjon - på ny side hvis det finnes kommentarer
      if (kommentarer && kommentarer.length > 0) {
        doc.addPage()
        yPos = 20

        // Kommentarer header med bakgrunn
        doc.setFillColor(138, 43, 226) // Purple color
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

      // Footer på alle sider
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
      const fileName = `Rapport_Roykluker_${new Date().getFullYear()}_${anleggNavn.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

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
            type: 'Røykluker Rapport',
            opplastet_dato: new Date().toISOString(),
            storage_path: storagePath
          })

        // Vis dialog for å sette tjeneste til fullført
        setPendingPdfSave({ mode, doc, fileName })
        setShowFullfortDialog(true)
      }
    } catch (error) {
      console.error('Feil ved generering av rapport:', error)
      alert('Kunne ikke generere rapport')
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med roykluker_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ roykluker_fullfort: true })
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
      alert('Rapport lagret, men kunne ikke oppdatere status')
      setShowFullfortDialog(false)
      setPendingPdfSave(null)
      setGeneratingPdf(false)
    }
  }

  function handleSendRapportConfirm() {
    // Naviger til Send Rapporter med kunde og anlegg pre-valgt
    setShowSendRapportDialog(false)
    setPendingPdfSave(null)
    setGeneratingPdf(false)
    
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
    setGeneratingPdf(false)
  }

  function handleTjenesteAvbryt() {
    // Fullfør PDF-lagring uten å oppdatere status
    if (pendingPdfSave) {
      const { mode, doc, fileName } = pendingPdfSave
      if (mode === 'download') {
        doc.save(fileName)
        alert('Rapport lagret og lastet ned!')
      } else {
        alert('Rapport lagret!')
      }
    }
    setShowFullfortDialog(false)
    setPendingPdfSave(null)
    setGeneratingPdf(false)
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laster data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Ingen data funnet</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sentraldata</h2>
          <p className="text-gray-400">{kundeNavn} - {anleggNavn}</p>
          
          {/* Status indikatorer */}
          <div className="flex items-center gap-4 mt-2">
            {/* Online/Offline status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">Offline - data lagres lokalt</span>
                </>
              )}
            </div>
            
            {/* Sist lagret */}
            {lastSaved && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  Sist lagret: {lastSaved.toLocaleTimeString('nb-NO')}
                </span>
              </div>
            )}
            
            {/* Autosave indikator */}
            {saving && (
              <span className="text-sm text-primary">Lagrer...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => genererRapport('preview')}
            disabled={generatingPdf}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-5 h-5" />
            Forhåndsvisning
          </button>
          <button
            onClick={() => genererRapport('save')}
            disabled={generatingPdf}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            Lagre rapport
          </button>
          <button
            onClick={() => genererRapport('download')}
            disabled={generatingPdf}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Lagre og last ned
          </button>
        </div>
      </div>

      {/* Sentral-velger */}
      {sentraler.length > 0 ? (
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <Server className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-white">Velg sentral</h3>
          </div>
          <select
            value={selectedSentral}
            onChange={(e) => {
              if (hasChanges && !confirm('Du har ulagrede endringer. Vil du fortsette?')) {
                return
              }
              setSelectedSentral(e.target.value)
              setHasChanges(false)
            }}
            className="input"
          >
            {sentraler.map(sentral => (
              <option key={sentral.id} value={sentral.id}>
                Sentral {sentral.sentral_nr || 'Uten nr'} - {sentral.plassering || 'Ingen plassering'}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="card bg-yellow-500/10 border-yellow-500/20">
          <p className="text-yellow-400">
            Ingen sentraler funnet for dette anlegget. Opprett sentraler i "Sentraler og Luker" først.
          </p>
        </div>
      )}

      {/* Type og Anleggsinfo */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Type og Anleggsinfo</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type anlegg</label>
            <select
              value={data.anlegg_type || 'Branngardin'}
              onChange={(e) => updateData('anlegg_type', e.target.value)}
              className="input"
            >
              <option value="Branngardin">Branngardin</option>
              <option value="Røykluker">Røykluker</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Anleggsinfo</label>
            <textarea
              value={data.anleggsinfo || ''}
              onChange={(e) => updateData('anleggsinfo', e.target.value)}
              className="input min-h-[80px]"
              placeholder="Generell informasjon om anlegget..."
            />
          </div>
        </div>
      </div>

      {/* Sentral */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Sentral</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Produsent</label>
            <input
              type="text"
              value={data.sentral_produsent || ''}
              onChange={(e) => updateData('sentral_produsent', e.target.value)}
              className="input"
              placeholder="f.eks. Coopers"
            />
          </div>
        </div>
      </div>

      {/* Batteri */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Battery className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Batteri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batteri spenning</label>
            <input
              type="text"
              value={data.batteri_v || ''}
              onChange={(e) => updateData('batteri_v', e.target.value)}
              className="input"
              placeholder="f.eks. 27.36v"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batteri årstal</label>
            <input
              type="number"
              value={data.batteri_alder || ''}
              onChange={(e) => updateData('batteri_alder', parseInt(e.target.value) || null)}
              className="input"
              placeholder="f.eks. 2023"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ladespenning</label>
            <input
              type="text"
              value={data.ladespenning || ''}
              onChange={(e) => updateData('ladespenning', e.target.value)}
              className="input"
              placeholder="f.eks. 27.44v"
            />
          </div>
        </div>
      </div>

      {/* Branngardin - kun hvis type er Branngardin */}
      {data.anlegg_type === 'Branngardin' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Branngardin</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <input
              type="text"
              value={data.branngardin_type || ''}
              onChange={(e) => updateData('branngardin_type', e.target.value)}
              className="input"
              placeholder="f.eks. Fallsafe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Antall</label>
            <input
              type="number"
              value={data.branngardin_antall || ''}
              onChange={(e) => updateData('branngardin_antall', parseInt(e.target.value) || null)}
              className="input"
              placeholder="Antall"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Produsent</label>
            <input
              type="text"
              value={data.branngardin_produsent || ''}
              onChange={(e) => updateData('branngardin_produsent', e.target.value)}
              className="input"
              placeholder="f.eks. Coopers Firemaster"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-300">Klassifisering</label>
              <button
                type="button"
                onClick={() => setShowKlassifiseringHelp(true)}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Vis informasjon om klassifisering"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <select
              value={data.branngardin_klassifisering || ''}
              onChange={(e) => updateData('branngardin_klassifisering', e.target.value)}
              className="input"
            >
              {klassifiseringOptions.map(k => (
                <option key={k} value={k}>{k || 'Velg klassifisering'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Aktiveringspenning</label>
            <input
              type="text"
              value={data.aktiveringspenning || ''}
              onChange={(e) => updateData('aktiveringspenning', e.target.value)}
              className="input"
              placeholder="f.eks. 11.87v"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hvilespenning</label>
            <input
              type="text"
              value={data.hvilespenning || ''}
              onChange={(e) => updateData('hvilespenning', e.target.value)}
              className="input"
              placeholder="f.eks. 0v"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Merknad</label>
            <textarea
              value={data.branngardin_merknad || ''}
              onChange={(e) => updateData('branngardin_merknad', e.target.value)}
              className="input min-h-[80px]"
              placeholder="Merknad..."
            />
          </div>
        </div>
        </div>
      )}

      {/* Motor - kun hvis type er Røykluker */}
      {data.anlegg_type === 'Røykluker' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Motor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Motortype</label>
              <input
                type="text"
                value={data.motor_type || ''}
                onChange={(e) => updateData('motor_type', e.target.value)}
                className="input"
                placeholder="f.eks. Afg 24v"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Antall</label>
              <input
                type="number"
                value={data.motor_antall || ''}
                onChange={(e) => updateData('motor_antall', parseInt(e.target.value) || null)}
                className="input"
                placeholder="Antall"
              />
            </div>
          </div>
        </div>
      )}

      {/* Røykluker - kun hvis type er Røykluker */}
      {data.anlegg_type === 'Røykluker' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Røykluker</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <input
                type="text"
                value={data.roykluke_type || ''}
                onChange={(e) => updateData('roykluke_type', e.target.value)}
                className="input"
                placeholder="f.eks. Karm/Kuppel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Luketype</label>
              <input
                type="text"
                value={data.roykluke_luketype || ''}
                onChange={(e) => updateData('roykluke_luketype', e.target.value)}
                className="input"
                placeholder="f.eks. Pc-lys"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Størrelse</label>
              <input
                type="text"
                value={data.roykluke_storrelse || ''}
                onChange={(e) => updateData('roykluke_storrelse', e.target.value)}
                className="input"
                placeholder="f.eks. 120x150cm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Antall</label>
              <input
                type="number"
                value={data.roykluke_antall || ''}
                onChange={(e) => updateData('roykluke_antall', parseInt(e.target.value) || null)}
                className="input"
                placeholder="Antall"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Merknad</label>
              <textarea
                value={data.roykluke_merknad || ''}
                onChange={(e) => updateData('roykluke_merknad', e.target.value)}
                className="input min-h-[80px]"
                placeholder="Merknad..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Krets - kun hvis type er Røykluker */}
      {data.anlegg_type === 'Røykluker' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Krets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nr</label>
              <input
                type="text"
                value={data.krets_nr || ''}
                onChange={(e) => updateData('krets_nr', e.target.value)}
                className="input"
                placeholder="f.eks. 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Aktiveringspenning</label>
              <input
                type="text"
                value={data.krets_aktiveringspenning || ''}
                onChange={(e) => updateData('krets_aktiveringspenning', e.target.value)}
                className="input"
                placeholder="f.eks. 24.21v"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hvilespenning</label>
              <input
                type="text"
                value={data.krets_hvilespenning || ''}
                onChange={(e) => updateData('krets_hvilespenning', e.target.value)}
                className="input"
                placeholder="f.eks. 0v"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Motstand</label>
              <input
                type="text"
                value={data.krets_motstand || ''}
                onChange={(e) => updateData('krets_motstand', e.target.value)}
                className="input"
                placeholder="Motstand"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sjekkpunkter */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Sjekkpunkter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ledeskinner</label>
            <select
              value={data.sjekk_ledeskinner || 'Ok'}
              onChange={(e) => updateData('sjekk_ledeskinner', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Beslag</label>
            <select
              value={data.sjekk_beslag || 'Ok'}
              onChange={(e) => updateData('sjekk_beslag', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Motor</label>
            <select
              value={data.sjekk_motor || 'Ok'}
              onChange={(e) => updateData('sjekk_motor', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gardin status</label>
            <select
              value={data.sjekk_gardin_status || 'Ok'}
              onChange={(e) => updateData('sjekk_gardin_status', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          {/* Ekstra sjekkpunkter for Røykluker */}
          {data.anlegg_type === 'Røykluker' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Manuell utløser</label>
                <select
                  value={data.sjekk_manuell_utloser || 'Ok'}
                  onChange={(e) => updateData('sjekk_manuell_utloser', e.target.value)}
                  className="input"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Karm</label>
                <select
                  value={data.sjekk_karm || 'Ok'}
                  onChange={(e) => updateData('sjekk_karm', e.target.value)}
                  className="input"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Overlys</label>
                <select
                  value={data.sjekk_overlys || 'Ok'}
                  onChange={(e) => updateData('sjekk_overlys', e.target.value)}
                  className="input"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Beslag (Røykluker)</label>
                <select
                  value={data.sjekk_beslag_roykluke || 'Ok'}
                  onChange={(e) => updateData('sjekk_beslag_roykluke', e.target.value)}
                  className="input"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Krets</label>
                <select
                  value={data.sjekk_krets || 'Ok'}
                  onChange={(e) => updateData('sjekk_krets', e.target.value)}
                  className="input"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Byttet utstyr - kun for Røykluker */}
      {data.anlegg_type === 'Røykluker' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Byttet utstyr</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Utstyr</label>
              <input
                type="text"
                value={data.byttet_utstyr || ''}
                onChange={(e) => updateData('byttet_utstyr', e.target.value)}
                className="input"
                placeholder="f.eks. KS3023;Batteri 12V 12AH"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Antall</label>
              <input
                type="number"
                value={data.byttet_utstyr_antall || ''}
                onChange={(e) => updateData('byttet_utstyr_antall', parseInt(e.target.value) || null)}
                className="input"
                placeholder="Antall"
              />
            </div>
          </div>
        </div>
      )}

      {/* Signal */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Signal</h3>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Signaltype</label>
          <input
            type="text"
            value={data.signaltype || ''}
            onChange={(e) => updateData('signaltype', e.target.value)}
            className="input"
            placeholder="f.eks. Br.signal, testet lokalt"
          />
        </div>
      </div>

      {/* Sjekkpunkter Tilstand */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Sjekkpunkter - Tilstand</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sentral</label>
            <select
              value={data.tilstand_sentral || 'Ok'}
              onChange={(e) => updateData('tilstand_sentral', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ladespenning</label>
            <select
              value={data.tilstand_ladespenning || 'Ok'}
              onChange={(e) => updateData('tilstand_ladespenning', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nettspenning</label>
            <select
              value={data.tilstand_nettspenning || 'Ok'}
              onChange={(e) => updateData('tilstand_nettspenning', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nettlampe</label>
            <select
              value={data.tilstand_nettlampe || 'Ok'}
              onChange={(e) => updateData('tilstand_nettlampe', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Feillampe</label>
            <select
              value={data.tilstand_feillampe || 'Ok'}
              onChange={(e) => updateData('tilstand_feillampe', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Aktiveringslampe</label>
            <select
              value={data.tilstand_aktiveringslampe || 'Ok'}
              onChange={(e) => updateData('tilstand_aktiveringslampe', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bryter</label>
            <select
              value={data.tilstand_bryter || 'Ok'}
              onChange={(e) => updateData('tilstand_bryter', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Signal</label>
            <select
              value={data.tilstand_signal || 'Ok'}
              onChange={(e) => updateData('tilstand_signal', e.target.value)}
              className="input"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kontroll */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Kontroll</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Funksjonstestet anlegg</label>
              <select
                value={data.kontroll_funksjonstest || 'Ja'}
                onChange={(e) => updateData('kontroll_funksjonstest', e.target.value)}
                className="input"
              >
                {kontrollOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Er anlegget i forskriftsmessig tilstand</label>
              <select
                value={data.kontroll_forskriftsmessig || 'Ja'}
                onChange={(e) => updateData('kontroll_forskriftsmessig', e.target.value)}
                className="input"
              >
                {kontrollOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Anbefalte utbedringer</label>
            <textarea
              value={data.kontroll_anbefalte_utbedringer || ''}
              onChange={(e) => updateData('kontroll_anbefalte_utbedringer', e.target.value)}
              className="input min-h-[80px]"
              placeholder="Anbefalte utbedringer..."
            />
          </div>
        </div>
      </div>

      {/* Lagre-knapp nederst */}
      {hasChanges && (
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Du har ulagrede endringer</p>
            <button
              onClick={lagreData}
              disabled={saving}
              className="btn-primary"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Lagrer...' : 'Lagre endringer'}
            </button>
          </div>
        </div>
      )}

      {/* Klassifisering hjelp modal */}
      {showKlassifiseringHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-dark-200 border-b border-dark-100 p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🔥 Klassifisering av branngardiner
              </h3>
              <button
                onClick={() => setShowKlassifiseringHelp(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Brannmotstand */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">🔥 1. Brannmotstand – EN 13501-2</h4>
                <p className="text-gray-300 mb-4">
                  Branngardiner testes og klassifiseres etter EN 1634-1 (brannmotstandstester) og deretter klassifiseres etter EN 13501-2.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-100">
                        <th className="text-left p-3 text-gray-400 font-medium">Klassifisering</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Betydning</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Forklaring</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">E</td>
                        <td className="p-3 text-gray-300">Integritet (Integrity)</td>
                        <td className="p-3 text-gray-300">Evne til å hindre gjennomslag av flammer og varme gasser.</td>
                      </tr>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">EW</td>
                        <td className="p-3 text-gray-300">Integritet + Strålingsbegrensning</td>
                        <td className="p-3 text-gray-300">I tillegg til E, begrenser den varme stråling.</td>
                      </tr>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">EI</td>
                        <td className="p-3 text-gray-300">Integritet + Isolasjon</td>
                        <td className="p-3 text-gray-300">Full brannmotstand — hindrer temperaturøkning på ikke-eksponert side.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-blue-400 mb-2">📌 Typiske branngardiner får ofte:</p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li><strong className="text-white">E 60, E 120</strong> → brukes der målet er å stoppe flammer og røyk.</li>
                    <li><strong className="text-white">EW 30, EW 60</strong> → brukes ofte i korridorer, atrier, åpninger.</li>
                    <li><strong className="text-white">EI 30, EI 60</strong> (sjeldnere, men finnes med spesielle isolerende lag) → brukt der full brannseksjonering kreves.</li>
                  </ul>
                </div>
              </div>

              {/* Røykmotstand */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">💨 2. Røykmotstand – EN 1634-3 / EN 12101-1</h4>
                <p className="text-gray-300 mb-4">
                  Dersom gardinen også skal begrense røykspredning, testes den etter EN 1634-3 og/eller EN 12101-1.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-100">
                        <th className="text-left p-3 text-gray-400 font-medium">Klassifisering</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Betydning</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">Sa</td>
                        <td className="p-3 text-gray-300">Røykbegrensning ved romtemperatur (ambient smoke)</td>
                      </tr>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">S200</td>
                        <td className="p-3 text-gray-300">Røykbegrensning ved 200 °C</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-sm text-purple-400">📌 En typisk røykgardin (smoke curtain) har gjerne Sa eller S200-klassifisering.</p>
                </div>
              </div>

              {/* Standarder */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">⚙️ 3. Bruksstandard og testmetode</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-100">
                        <th className="text-left p-3 text-gray-400 font-medium">Standard</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Beskrivelse</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">EN 1634-1</td>
                        <td className="p-3 text-gray-300">Test av brannmotstand for dører, porter, luker og gardiner</td>
                      </tr>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">EN 1634-3</td>
                        <td className="p-3 text-gray-300">Test av røyktetthet</td>
                      </tr>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">EN 12101-1</td>
                        <td className="p-3 text-gray-300">Røyk- og varmeavtrekkssystemer – Spesifikasjon for røykgardiner</td>
                      </tr>
                      <tr className="border-b border-dark-100">
                        <td className="p-3 text-white font-semibold">EN 16034</td>
                        <td className="p-3 text-gray-300">Ytelsesstandard for brann- og røyktette produkter (samkjøring med CE-merking)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CE-merking */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">🧾 4. CE-merking</h4>
                <p className="text-gray-300">
                  For å kunne omsettes i Europa, må branngardiner være CE-merket i henhold til EN 16034 og (der det er relevant) EN 13241 (porter og rullesystemer).
                  CE-merkingen må inkludere klassifiseringsverdier (E, EW, EI, Sa/S200) og testinstitutt.
                </p>
              </div>

              {/* Eksempler */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">⚠️ 5. Eksempler på komplette klassifiseringer</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-dark-100 rounded-lg">
                    <strong className="text-white">E 120 Sa</strong>
                    <span className="text-gray-300"> → holder tett mot flammer i 120 minutter og begrenser røyk.</span>
                  </div>
                  <div className="p-3 bg-dark-100 rounded-lg">
                    <strong className="text-white">EW 60 S200</strong>
                    <span className="text-gray-300"> → holder flammer ute i 60 min, begrenser stråling og røyk ved 200 °C.</span>
                  </div>
                  <div className="p-3 bg-dark-100 rounded-lg">
                    <strong className="text-white">EI 60</strong>
                    <span className="text-gray-300"> → full isolasjon og integritet i 60 minutter.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-dark-200 border-t border-dark-100 p-4">
              <button
                onClick={() => setShowKlassifiseringHelp(false)}
                className="btn-primary w-full"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview */}
      {previewPdf && (
        <RoyklukerPreview
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
                type: 'Røykluker Rapport',
                opplastet_dato: new Date().toISOString(),
                storage_path: storagePath
              })
          }}
        />
      )}

      {/* Dialog for å sette tjeneste til fullført */}
      <TjenesteFullfortDialog
        tjeneste="Røykluker"
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
