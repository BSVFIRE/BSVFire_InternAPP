import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Download, Eye, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannalarmPreview } from './BrannalarmPreview'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { KontrolldatoVelger } from '@/components/KontrolldatoVelger'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'

interface NS3960RapportViewProps {
  kontrollId: string
  anleggId: string
  kundeNavn?: string
  onBack: () => void
}

interface AnleggData {
  anleggsnavn: string
  adresse?: string
  postnummer?: string
  poststed?: string
  kundenr: string
}

interface KundeData {
  navn: string
  kontaktperson?: string
  telefon?: string
  epost?: string
}

interface Kontaktperson {
  navn: string
  telefon?: string
  epost?: string
  primar?: boolean
}

interface BrannalarmData {
  leverandor?: string
  sentraltype?: string
  // Talevarsling
  talevarsling?: boolean
  talevarsling_leverandor?: string
  talevarsling_batteri_type?: string
  talevarsling_batteri_alder?: string
  talevarsling_plassering?: string
  talevarsling_kommentar?: string
  // Alarmsender
  alarmsender_i_anlegg?: boolean
  mottaker?: string[]
  sender_2G_4G?: string
  gsm_nummer?: string
  plassering?: string
  batterialder?: string
  batteritype?: string
  forsynet_fra_brannsentral?: boolean
  mottaker_kommentar?: string
  ekstern_mottaker?: string[]
  ekstern_mottaker_info?: string
  ekstern_mottaker_aktiv?: boolean
  // Nøkkelsafe
  nokkelsafe?: boolean
  nokkelsafe_type?: string
  nokkelsafe_plassering?: string
  nokkelsafe_innhold?: string
  nokkelsafe_kommentar?: string
}

interface KontrollData {
  dato: string
  kontrollor_id?: string
  merknader?: string
  har_feil?: boolean
  feil_kommentar?: string
  har_utkoblinger?: boolean
  utkobling_kommentar?: string
}

interface AnsattData {
  navn: string
  epost?: string
  telefon?: string
  fg_sertifikat_nr?: string
}

interface AvvikItem {
  id: string
  beskrivelse: string
}

interface Kontrollpunkt {
  kontrollpunkt_navn: string
  status: string
  avvik: boolean
  avvik_liste?: string // JSON string
  kommentar?: string
}

interface Enhet {
  type: string
  antall: number
  typeModell?: string
  kommentar?: string
}

interface Styring {
  type: string
  antall: number
  status: string
  note?: string
  har_avvik?: boolean
  avvik?: string[]
}

interface NettverkEnhet {
  nettverk_id: string | number
  plassering: string
  type: string
  sw_id?: string
  spenning?: number
  ah?: number
  batterialder?: number
}

export function NS3960RapportView({ kontrollId, anleggId, kundeNavn, onBack }: NS3960RapportViewProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [anleggData, setAnleggData] = useState<AnleggData | null>(null)
  const [kundeData, setKundeData] = useState<KundeData | null>(null)
  const [brannalarmData, setBrannalarmData] = useState<BrannalarmData | null>(null)
  const [kontrollData, setKontrollData] = useState<KontrollData | null>(null)
  const [kontrollpunkter, setKontrollpunkter] = useState<Kontrollpunkt[]>([])
  const [enheter, setEnheter] = useState<Enhet[]>([])
  const [styringer, setStyringer] = useState<Styring[]>([])
  const [nettverk, setNettverk] = useState<NettverkEnhet[]>([])
  const [primaerKontakt, setPrimaerKontakt] = useState<Kontaktperson | null>(null)
  const [kontrollorData, setKontrollorData] = useState<AnsattData | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [dropboxAvailable, setDropboxAvailable] = useState(false)
  const [kontrolldato, setKontrolldato] = useState<Date>(new Date())

  useEffect(() => {
    loadData()
    // Sjekk Dropbox-status
    checkDropboxStatus().then(status => setDropboxAvailable(status.connected))
  }, [kontrollId, anleggId])

  async function loadData() {
    try {
      setLoading(true)

      // Hent anleggsdata
      const { data: anlegg } = await supabase
        .from('anlegg')
        .select('anleggsnavn, adresse, postnummer, poststed, kundenr')
        .eq('id', anleggId)
        .single()

      if (anlegg) setAnleggData(anlegg)

      // Bruk kundenavn fra props (kommer fra parent component)
      if (kundeNavn) {
        setKundeData({ navn: kundeNavn })
      }

      // Hent brannalarmdata
      const { data: brannalarm } = await supabase
        .from('anleggsdata_brannalarm')
        .select('*')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (brannalarm) setBrannalarmData(brannalarm)

      // Hent kontrolldata
      const { data: kontroll } = await supabase
        .from('anleggsdata_kontroll')
        .select('dato, kontrollor_id, merknader, har_feil, feil_kommentar, har_utkoblinger, utkobling_kommentar')
        .eq('id', kontrollId)
        .single()

      if (kontroll) {
        setKontrollData(kontroll)
      }

      // Hent innlogget bruker (kontrollør) data
      const { data: { user } } = await supabase.auth.getUser()
      const { data: ansatt } = await supabase
        .from('ansatte')
        .select('navn, epost, telefon, fg_sertifikat_nr')
        .eq('epost', user?.email)
        .maybeSingle()
      
      if (ansatt) setKontrollorData(ansatt)

      // Hent kontrollpunkter
      const { data: punkter } = await supabase
        .from('ns3960_kontrollpunkter')
        .select('*')
        .eq('kontroll_id', kontrollId)

      if (punkter) setKontrollpunkter(punkter)

      // Hent enheter (kun aktive) - transformere fra kolonner til rader
      if (brannalarm) {
        const enheterArray: Enhet[] = []
        const enhetTypes = [
          // Sentral og styring
          { key: 'brannsentral', label: 'Brannsentral' },
          { key: 'panel', label: 'Brannpanel' },
          { key: 'kraftforsyning', label: 'Kraftforsyning' },
          { key: 'batteri', label: 'Batteri' },
          { key: 'sloyfer', label: 'Sløyfer' },
          { key: 'io', label: 'IO-styring' },
          // Detektorer
          { key: 'rd', label: 'Røykdetektor' },
          { key: 'vd', label: 'Varmedetektor' },
          { key: 'multi', label: 'Multikriteriedetektor' },
          { key: 'flame', label: 'Flammedetektor' },
          { key: 'linje', label: 'Linjedetektor' },
          { key: 'asp', label: 'Aspirasjon' },
          { key: 'mm', label: 'Manuell melder' },
          { key: 'traadlos', label: 'Trådløse enheter' },
          // Styring og slokning
          { key: 'sprinkler', label: 'Sprinklerkontroll' },
          { key: 'avstiller', label: 'Avstillingsbryter' },
          // Varsling
          { key: 'brannklokke', label: 'Brannklokke' },
          { key: 'sirene', label: 'Sirene' },
          { key: 'optisk', label: 'Optisk varsling' },
          { key: 'annet', label: 'Annet' },
        ]

        // Hent enheter fra brannalarm-kolonner
        enhetTypes.forEach(({ key, label }) => {
          if (brannalarm[`${key}_antall`] && brannalarm[`${key}_antall`] > 0) {
            // Håndter typeModell som kan være JSON eller vanlig tekst
            let typeModellText = ''
            const rawTypeModell = brannalarm[`${key}_type`]
            if (rawTypeModell) {
              try {
                // Sjekk om det er JSON (array av typer)
                const parsed = JSON.parse(rawTypeModell)
                if (Array.isArray(parsed)) {
                  // Formater som "Type1 (x2), Type2 (x3)"
                  typeModellText = parsed
                    .filter((t: any) => t.type && t.antall > 0)
                    .map((t: any) => `${t.type} (${t.antall})`)
                    .join(', ')
                } else {
                  typeModellText = rawTypeModell
                }
              } catch {
                // Ikke JSON, bruk som vanlig tekst
                typeModellText = rawTypeModell
              }
            }
            
            enheterArray.push({
              type: label,
              antall: brannalarm[`${key}_antall`] || 0,
              typeModell: typeModellText,
              kommentar: brannalarm[`${key}_note`] || '',
            })
          }
        })
        setEnheter(enheterArray)
      }

      // Hent styringer (kun aktive) - må transformere fra kolonner til rader
      if (brannalarm) {
        const styringerArray: Styring[] = []
        const styringTypes = [
          { key: 'ovrige', label: 'Øvrige' },
          { key: 'adgang', label: 'Adgangskontroll' },
          { key: 'slukke', label: 'Slukkeanlegg' },
          { key: 'klokke', label: 'Klokke' },
          { key: 'flash_blitz', label: 'Flash/Blitz' },
          { key: 'port', label: 'Port' },
          { key: 'spjaeld', label: 'Spjeld' },
          { key: 'overvaking', label: 'Overvåking' },
          { key: 'musikk', label: 'Musikk' },
          { key: 'gardin', label: 'Gardin' },
          { key: 'dorstyring', label: 'Dørstyring' },
          { key: 'royklukker', label: 'Røyklukker' },
          { key: 'vent', label: 'Ventilasjon' },
          { key: 'sd', label: 'SD-anlegg' },
          { key: 'heis', label: 'Heis' },
          { key: 'safe', label: 'Safe' },
        ]

        styringTypes.forEach(({ key, label }) => {
          if (brannalarm[`${key}_aktiv`]) {
            // Parse avvik fra JSON string
            let avvikListe: string[] = []
            const avvikStr = brannalarm[`${key}_avvik`]
            if (avvikStr && typeof avvikStr === 'string') {
              try {
                avvikListe = JSON.parse(avvikStr)
              } catch {
                avvikListe = avvikStr ? [avvikStr] : []
              }
            }
            
            styringerArray.push({
              type: label,
              antall: brannalarm[`${key}_antall`] || 0,
              status: brannalarm[`${key}_status`] || '',
              note: brannalarm[`${key}_note`] || '',
              har_avvik: brannalarm[`${key}_har_avvik`] || false,
              avvik: avvikListe,
            })
          }
        })

        setStyringer(styringerArray)
      }

      // Hent nettverk
      const { data: nettverkData, error: nettverkError } = await supabase
        .from('nettverk_brannalarm')
        .select('nettverk_id, plassering, type, sw_id, spenning, ah, batterialder, batteri_ikke_aktuelt')
        .eq('anlegg_id', anleggId)
        .order('nettverk_id')

      console.log('Nettverk data:', nettverkData, 'Error:', nettverkError)
      if (nettverkData) setNettverk(nettverkData)

      // Hent primær kontaktperson - prøv junction table først
      let kontakter: any = null
      let kontaktError: any = null
      
      const primaerResult = await supabase
        .from('kontaktpersoner')
        .select(`
          navn,
          telefon,
          epost,
          anlegg_kontaktpersoner!inner(primar)
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)
        .eq('anlegg_kontaktpersoner.primar', true)
        .maybeSingle()

      // Fallback: hent første kontaktperson hvis ingen primær
      if (!primaerResult.data) {
        const fallback = await supabase
          .from('kontaktpersoner')
          .select(`
            navn,
            telefon,
            epost,
            anlegg_kontaktpersoner!inner(anlegg_id)
          `)
          .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)
          .limit(1)
          .maybeSingle()
        
        kontakter = fallback.data
        kontaktError = fallback.error
      } else {
        kontakter = primaerResult.data
        kontaktError = primaerResult.error
      }

      console.log('Primær kontakt data:', kontakter, 'Error:', kontaktError)
      if (kontakter) setPrimaerKontakt(kontakter)

    } catch (error) {
      console.error('Feil ved lasting av data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generatePDF(preview: boolean = false) {
    if (!anleggData || !kontrollData) {
      alert('Mangler data for å generere rapport')
      return
    }

    setGenerating(true)
    try {
      console.log('Starter PDF-generering...')
      console.log('AnleggData:', anleggData)
      console.log('KontrollData:', kontrollData)
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Last Noralarm-logo på forhånd
      let noralarmLogoImg: HTMLImageElement | null = null
      try {
        noralarmLogoImg = new Image()
        noralarmLogoImg.src = '/noralarm-logo.png'
        await new Promise((resolve, reject) => {
          noralarmLogoImg!.onload = resolve
          noralarmLogoImg!.onerror = reject
          setTimeout(reject, 2000)
        })
      } catch {
        noralarmLogoImg = null
      }
      
      // Last FG-logo på forhånd
      let fgLogoImg: HTMLImageElement | null = null
      try {
        fgLogoImg = new Image()
        fgLogoImg.src = '/fg_logo.png'
        await new Promise((resolve, reject) => {
          fgLogoImg!.onload = resolve
          fgLogoImg!.onerror = reject
          setTimeout(reject, 2000)
        })
      } catch {
        fgLogoImg = null
      }
      
      // Funksjon for å legge til footer på hver side
      const addFooter = (pageNum: number) => {
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
        
        // Logoer på side 1 (FG og Noralarm)
        if (pageNum === 1) {
          // FG-logo (venstre)
          if (fgLogoImg) {
            const fgX = pageWidth - 70
            const fgY = footerY + 1
            doc.addImage(fgLogoImg, 'PNG', fgX, fgY, 10, 10)
            
            doc.setFontSize(5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text('FG-godkjent', fgX, fgY - 1)
          }
          
          // Noralarm-logo (høyre)
          const noralarmX = pageWidth - 50
          const noralarmY = footerY + 1
          
          if (noralarmLogoImg) {
            doc.addImage(noralarmLogoImg, 'PNG', noralarmX, noralarmY, 20, 10)
            
            doc.setFontSize(5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text('Medlem av', noralarmX, noralarmY - 1)
          } else {
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(227, 30, 36)
            doc.text('Medlem av NORALARM', noralarmX, noralarmY + 5)
          }
        }
        
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
        yPos += 25
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        // Fallback til tekst hvis logo ikke lastes
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
      doc.text('KONTROLLRAPPORT - BRANNALARM', 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text('Kontrollen er utført i henhold til gjeldende forebyggendeforskrift (FOB) og NS 3960', 20, yPos)
      doc.setTextColor(0)
      yPos += 10

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
      doc.text(kundeData?.navn || '-', 20, yPos + 10)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('ANLEGG', 20, yPos + 16)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(anleggData.anleggsnavn, 20, yPos + 21)
      
      const kontrollDato = kontrolldato
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Kontrollert: ${kontrollDato.toLocaleDateString('nb-NO')}`, 20, yPos + 26)
      
      // Neste kontroll boks
      doc.setFillColor(254, 249, 195)
      doc.rect(104, yPos, 91, 28, 'FD')
      
      const nesteKontroll = new Date(kontrollDato)
      nesteKontroll.setFullYear(nesteKontroll.getFullYear() + 1)
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

      if (kontrollorData?.navn) {
        doc.setFillColor(240, 253, 244)
        doc.rect(rightCol, yPos, colWidth + 6, 24, 'FD')
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('KONTROLL UTFØRT AV', rightCol + 3, yPos + 5)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(22, 163, 74)
        doc.text(kontrollorData.navn, rightCol + 3, yPos + 11)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        let infoY = yPos + 15
        if (kontrollorData.telefon) {
          doc.text(`Tlf: ${kontrollorData.telefon}`, rightCol + 3, infoY)
          infoY += 4
        }
        if (kontrollorData.fg_sertifikat_nr) {
          doc.text(`Sertifikat: ${kontrollorData.fg_sertifikat_nr}`, rightCol + 3, infoY)
        }
      }
      
      doc.setTextColor(0, 0, 0)
      yPos += 38

      // Teknisk informasjon - med boks
      if (brannalarmData?.leverandor || brannalarmData?.sentraltype) {
        // Beregn høyde for boksen
        const tekniskRows = (brannalarmData.leverandor ? 1 : 0) + (brannalarmData.sentraltype ? 1 : 0)
        const boksHoyde = 10 + (tekniskRows * 6)
        
        // Tegn boks med lys bakgrunn
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.3)
        doc.setFillColor(250, 250, 250)
        doc.rect(17, yPos - 2, 176, boksHoyde, 'FD')
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('Teknisk informasjon', 20, yPos + 4)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        
        let tekniskY = yPos + 10
        if (brannalarmData.leverandor) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 80, 80)
          doc.text('Leverandør', 20, tekniskY)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          doc.text(brannalarmData.leverandor, 55, tekniskY)
          tekniskY += 6
        }
        if (brannalarmData.sentraltype) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 80, 80)
          doc.text('Sentraltype', 20, tekniskY)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          doc.text(brannalarmData.sentraltype, 55, tekniskY)
        }
        
        yPos += boksHoyde + 5
      }

      // Merknader - egen boks
      if (kontrollData.merknader) {
        const merknadLines = doc.splitTextToSize(kontrollData.merknader, 165)
        const merknadHoyde = 10 + (merknadLines.length * 4)
        
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.3)
        doc.setFillColor(250, 250, 250)
        doc.rect(17, yPos - 2, 176, merknadHoyde, 'FD')
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('Generell kommentar', 20, yPos + 4)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(merknadLines, 20, yPos + 10)
        
        yPos += merknadHoyde + 5
      }

      // Feil registrert - egen boks med rød markering
      if (kontrollData.har_feil) {
        const feilTekst = kontrollData.feil_kommentar || 'Ja'
        const feilLines = doc.splitTextToSize(feilTekst, 165)
        const feilHoyde = 10 + (feilLines.length * 4)
        
        doc.setDrawColor(220, 53, 69)
        doc.setLineWidth(0.5)
        doc.setFillColor(255, 245, 245)
        doc.rect(17, yPos - 2, 176, feilHoyde, 'FD')
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 53, 69)
        doc.text('Feil registrert ved ankomst', 20, yPos + 4)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(feilLines, 20, yPos + 10)
        
        yPos += feilHoyde + 5
      }

      // Utkoblinger - egen boks med oransje markering
      if (kontrollData.har_utkoblinger) {
        const utkoblingTekst = kontrollData.utkobling_kommentar || 'Ja'
        const utkoblingLines = doc.splitTextToSize(utkoblingTekst, 165)
        const utkoblingHoyde = 10 + (utkoblingLines.length * 4)
        
        doc.setDrawColor(255, 152, 0)
        doc.setLineWidth(0.5)
        doc.setFillColor(255, 250, 240)
        doc.rect(17, yPos - 2, 176, utkoblingHoyde, 'FD')
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 152, 0)
        doc.text('Utkoblinger registrert ved ankomst', 20, yPos + 4)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(utkoblingLines, 20, yPos + 10)
        
        yPos += utkoblingHoyde + 5
      }

      // Legg til footer på første side
      addFooter(1)

      // Start side 2 for enheter
      doc.addPage()
      yPos = 20

      // Enheter - med undertabell for type/modell
      if (enheter.length > 0) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Enheter', 20, yPos)
        yPos += 7

        // Bygg hierarkisk tabell med enheter og type/modell detaljer
        const enheterTableData: (string | { content: string; styles?: any; rowSpan?: number })[][] = []
        
        enheter.forEach(e => {
          // Tell antall underrader for rowSpan
          let underrader = 0
          if (e.typeModell && e.typeModell.trim() !== '') {
            const types = e.typeModell.split(', ')
            underrader = types.filter(t => t.trim()).length
          }
          
          // Hovedrad for enheten med rowSpan på kommentar
          enheterTableData.push([
            { content: e.type, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: e.antall.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: e.kommentar || '-', styles: { fillColor: [240, 240, 240] }, rowSpan: underrader > 0 ? underrader + 1 : 1 }
          ])
          
          // Parse og legg til type/modell detaljer som underrader
          if (e.typeModell && e.typeModell.trim() !== '') {
            const types = e.typeModell.split(', ')
            types.forEach(t => {
              const match = t.match(/^(.+?)\s*\((\d+)\)$/)
              if (match) {
                enheterTableData.push([
                  { content: `              ${match[1].trim()}`, styles: { textColor: [80, 80, 80], fontSize: 8 } },
                  { content: match[2], styles: { textColor: [80, 80, 80], fontSize: 8 } }
                ])
              } else if (t.trim()) {
                enheterTableData.push([
                  { content: `              ${t.trim()}`, styles: { textColor: [80, 80, 80], fontSize: 8 } },
                  { content: '1', styles: { textColor: [80, 80, 80], fontSize: 8 } }
                ])
              }
            })
          }
        })

        autoTable(doc, {
          startY: yPos,
          head: [['Enhet / Type', 'Antall', 'Kommentar']],
          body: enheterTableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 55 }
          },
          margin: { left: 10, right: 10, bottom: 25 },
          didDrawCell: (data: any) => {
            // Tegn pil for underrader (type/modell)
            if (data.section === 'body' && data.column.index === 0) {
              const cellText = data.cell.raw?.content || data.cell.raw
              if (typeof cellText === 'string' && cellText.startsWith('              ')) {
                const x = data.cell.x + 4
                const y = data.cell.y + data.cell.height / 2
                
                // Tegn grønn pil ->
                doc.setDrawColor(40, 167, 69) // Grønn
                doc.setLineWidth(0.5)
                doc.line(x, y, x + 6, y) // Horisontal linje
                doc.line(x + 4, y - 1.8, x + 6, y) // Øvre pilspiss
                doc.line(x + 4, y + 1.8, x + 6, y) // Nedre pilspiss
              }
            }
          },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // Styringer - alltid på ny side
      if (styringer.length > 0) {
        doc.addPage()
        yPos = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Styringer', 20, yPos)
        yPos += 7

        const styringerRows = styringer.map(s => [
          s.har_avvik ? `${s.type} *` : s.type,
          s.antall.toString(),
          s.status || '-',
          s.note || '-',
          s.har_avvik ? 'Ja' : 'Ingen'
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Type', 'Antall', 'Status', 'Notat', 'Avvik']],
          body: styringerRows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
          styles: { fontSize: 9 },
          margin: { left: 10, right: 10, bottom: 25 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 45 },
            3: { cellWidth: 55 },
            4: { cellWidth: 20, halign: 'center' }
          },
          didParseCell: (data: any) => {
            // Marker hele raden med svak gul bakgrunn hvis det er avvik
            if (data.section === 'body') {
              const typeText = data.row.cells[0]?.raw as string
              if (typeText?.endsWith(' *')) {
                data.cell.styles.fillColor = [255, 248, 225] // Svak gul bakgrunn
              }
              // Fargelegg avvik-kolonnen basert på verdi
              if (data.column.index === 4) {
                const avvikText = data.cell.raw as string
                if (avvikText === 'Ja') {
                  data.cell.styles.textColor = [220, 53, 69] // Rød
                  data.cell.styles.fontStyle = 'bold'
                } else if (avvikText === 'Ingen') {
                  data.cell.styles.textColor = [40, 167, 69] // Grønn
                }
              }
            }
          },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 5
        
        // Legg til forklarende fotnote etter styringer
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100)
        doc.text('* Markerte punkter har utvidet informasjon i "Oppsummering av avvik" eller "Kommentarer"', 20, yPos)
        doc.setTextColor(0)
        yPos += 8
      }

      // Nettverk
      console.log('Nettverk i PDF:', nettverk)
      if (nettverk.length > 0) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Nettverk', 20, yPos)
        yPos += 7

        const nettverkRows = nettverk.map(n => [
          n.nettverk_id.toString(),
          n.plassering || '-',
          n.type || '-',
          n.sw_id || '-',
          (n as any).batteri_ikke_aktuelt ? 'N/A' : (n.spenning ? `${n.spenning}V` : '-'),
          (n as any).batteri_ikke_aktuelt ? 'N/A' : (n.ah ? `${n.ah}Ah` : '-'),
          (n as any).batteri_ikke_aktuelt ? 'N/A' : (n.batterialder ? n.batterialder.toString() : '-')
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Nettverk', 'Plassering', 'Type', 'SW-versjon', 'Spenning', 'Ah', 'Batterialder']],
          body: nettverkRows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 8 },
          margin: { left: 10, right: 10, bottom: 25 },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // Kontrollpunkter - start på ny side, gruppert etter kategori
      if (kontrollpunkter.length > 0) {
        doc.addPage()
        yPos = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Kontrollpunkter', 20, yPos)
        yPos += 10

        // Definer kategorier og hvilke kontrollpunkter som tilhører hver
        const kategorier = {
          '1. Kontrollprosedyre': [
            'Sløyfe scannet på sentral(er)',
            'Analyse av data scannet',
            'Gjennomgang logg: brannalarmer, feil og forvarsler',
            'Kontroll av betjening sentral(er)',
            'Kontroll av lamper, summer og display sentral(er)',
            'Kontroll av spesialdetektorer',
            'Kontroll av batteri, driftspenning og ladespenning sentral(er)',
            'Test av detektorer',
            'Test av manuelle meldere',
            'Test av sprinklerkontroll alarm og overvåking',
            'Test av alarmorganer',
            'Test av alarmoverføring',
            'Test av signalutganger',
            'Trådløse anlegg - internkommunikasjon',
            'Enhet for utkobling',
            'Tidsforsinkelse',
            'Todetektor-avhengighet',
          ],
          '2. Visuelle kontroller': [
            'Visuell kontroll av O-planer',
            'Visuell kontroll av alarmorganer',
            'Visuell kontroll av sløyfeenheter',
            'Vurdering av deteksjon og varsling i anlegg',
            'Vurdering av deteksjon i anlegg O.H hmmling (stikkprøver)',
          ],
          '3. Dokumentasjon og opplæring': [
            'Kontrolljournal gjennomgått og utfylt',
            'Gjennomgang egenkontroll med sluttbruker',
            'Servicemerking/kontroll oblat',
            'Opplæring sluttkunde',
            'Tegninger som bygget',
            'Projekteringsgrunnlag, Overvåket område, Spesielle områder, Begrenset alarmanlegg, Dokumentasjon på fravik fra prosjekteringsstandard',
          ],
        }

        // Generer tabell for hver kategori
        Object.entries(kategorier).forEach(([kategoriNavn, punktNavn], katIndex) => {
          // Finn kontrollpunkter som tilhører denne kategorien
          const kategoriPunkter = kontrollpunkter.filter(p => 
            punktNavn.includes(p.kontrollpunkt_navn)
          )

          if (kategoriPunkter.length === 0) return

          // Start ny side for Visuelle kontroller (kategori 2)
          if (katIndex === 1) {
            doc.addPage()
            yPos = 20
          }
          // Sjekk om vi trenger ny side for andre kategorier
          else if (yPos > 240) {
            doc.addPage()
            yPos = 20
          }

          // Kategori-overskrift
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(41, 128, 185)
          doc.text(kategoriNavn, 20, yPos)
          doc.setTextColor(0)
          yPos += 5

          const punkterRows = kategoriPunkter.map(p => {
            // Sjekk om det er avvik eller kommentar - legg til markering
            const harMerInfo = p.avvik || (p.kommentar && p.kommentar.trim() !== '')
            // Bruk "-" for "Ikke aktuell", "Ja" for avvik, "Ingen" for ingen avvik
            const avvikTekst = p.status === 'Ikke aktuell' ? '-' : (p.avvik ? 'Ja' : 'Ingen')
            const kontrollpunktNavn = harMerInfo ? `${p.kontrollpunkt_navn} *` : p.kontrollpunkt_navn
            
            return [
              kontrollpunktNavn,
              p.status || '-',
              avvikTekst
            ]
          })

          autoTable(doc, {
            startY: yPos,
            head: [['Kontrollpunkt', 'Status', 'Avvik']],
            body: punkterRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
            styles: { fontSize: 8 },
            margin: { left: 10, right: 10, bottom: 25 },
            columnStyles: {
              0: { cellWidth: 120 },
              1: { cellWidth: 40 },
              2: { cellWidth: 25, halign: 'center' }
            },
            didParseCell: (data: any) => {
              // Marker hele raden med svak bakgrunn hvis det er mer info
              if (data.section === 'body') {
                const kontrollpunktText = data.row.cells[0]?.raw as string
                if (kontrollpunktText?.endsWith(' *')) {
                  if (data.column.index === 0) {
                    data.cell.styles.fillColor = [255, 248, 225]
                  }
                }
                // Fargelegg avvik-kolonnen basert på verdi
                if (data.column.index === 2) {
                  const avvikText = data.cell.raw as string
                  if (avvikText === 'Ja') {
                    data.cell.styles.textColor = [220, 53, 69] // Rød
                    data.cell.styles.fontStyle = 'bold'
                  } else if (avvikText === 'Ingen') {
                    data.cell.styles.textColor = [40, 167, 69] // Grønn
                  } else if (avvikText === '-') {
                    data.cell.styles.textColor = [150, 150, 150] // Grå
                  }
                }
              }
            },
            didDrawPage: () => {
              const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
              addFooter(currentPage)
            }
          })

          yPos = (doc as any).lastAutoTable.finalY + 8
        })

        // Legg til forklarende fotnote etter siste kategori
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100)
        doc.text('* Markerte punkter har utvidet informasjon i "Oppsummering av avvik" eller "Kommentarer"', 20, yPos)
        doc.setTextColor(0)
        yPos += 8
      }

      // Talevarsling, Nøkkelsafe, Alarmsender - start på ny side
      if (brannalarmData?.talevarsling || brannalarmData?.nokkelsafe || brannalarmData?.alarmsender_i_anlegg) {
        doc.addPage()
        yPos = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Tilleggsutstyr', 20, yPos)
        yPos += 10

        // Talevarsling - med tabell
        if (brannalarmData.talevarsling) {
          const talevarslingData: string[][] = []
          if (brannalarmData.talevarsling_leverandor) {
            talevarslingData.push(['Leverandør', brannalarmData.talevarsling_leverandor])
          }
          if (brannalarmData.talevarsling_batteri_type) {
            talevarslingData.push(['Batteritype', brannalarmData.talevarsling_batteri_type])
          }
          if (brannalarmData.talevarsling_batteri_alder) {
            talevarslingData.push(['Batterialder', `${brannalarmData.talevarsling_batteri_alder} år`])
          }
          if (brannalarmData.talevarsling_plassering) {
            talevarslingData.push(['Plassering', brannalarmData.talevarsling_plassering])
          }
          if (brannalarmData.talevarsling_kommentar) {
            talevarslingData.push(['Kommentar', brannalarmData.talevarsling_kommentar])
          }

          if (talevarslingData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Talevarsling', '']],
              body: talevarslingData,
              theme: 'grid',
              headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 10 },
              styles: { fontSize: 9, cellPadding: 3 },
              columnStyles: {
                0: { cellWidth: 45, fontStyle: 'bold', fillColor: [245, 245, 245] },
                1: { cellWidth: 140 }
              },
              margin: { left: 10, right: 10, bottom: 25 },
              didDrawPage: () => {
                const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
                addFooter(currentPage)
              }
            })
            yPos = (doc as any).lastAutoTable.finalY + 8
          }
        }

        // Nøkkelsafe - med tabell
        if (brannalarmData.nokkelsafe) {
          if (yPos > 230) {
            doc.addPage()
            yPos = 20
          }

          const nokkelsafeData: string[][] = []
          if (brannalarmData.nokkelsafe_type) {
            nokkelsafeData.push(['Type', brannalarmData.nokkelsafe_type])
          }
          if (brannalarmData.nokkelsafe_plassering) {
            nokkelsafeData.push(['Plassering', brannalarmData.nokkelsafe_plassering])
          }
          if (brannalarmData.nokkelsafe_innhold) {
            nokkelsafeData.push(['Innhold', brannalarmData.nokkelsafe_innhold])
          }
          if (brannalarmData.nokkelsafe_kommentar) {
            nokkelsafeData.push(['Kommentar', brannalarmData.nokkelsafe_kommentar])
          }

          if (nokkelsafeData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Nøkkelsafe', '']],
              body: nokkelsafeData,
              theme: 'grid',
              headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 10 },
              styles: { fontSize: 9, cellPadding: 3 },
              columnStyles: {
                0: { cellWidth: 45, fontStyle: 'bold', fillColor: [245, 245, 245] },
                1: { cellWidth: 140 }
              },
              margin: { left: 10, right: 10, bottom: 25 },
              didDrawPage: () => {
                const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
                addFooter(currentPage)
              }
            })
            yPos = (doc as any).lastAutoTable.finalY + 8
          }
        }

        // Alarmsender - med tabell
        if (brannalarmData.alarmsender_i_anlegg) {
          if (yPos > 200) {
            doc.addPage()
            yPos = 20
          }

          const alarmsenderData: string[][] = []
          if (brannalarmData.mottaker && brannalarmData.mottaker.length > 0) {
            alarmsenderData.push(['Mottaker', brannalarmData.mottaker.join(', ')])
          }
          if (brannalarmData.sender_2G_4G) {
            alarmsenderData.push(['Sendertype', brannalarmData.sender_2G_4G])
          }
          if (brannalarmData.gsm_nummer) {
            alarmsenderData.push(['GSM-nummer', brannalarmData.gsm_nummer])
          }
          if (brannalarmData.plassering) {
            alarmsenderData.push(['Plassering', brannalarmData.plassering])
          }
          if (brannalarmData.batterialder) {
            alarmsenderData.push(['Batterialder', `${brannalarmData.batterialder} år`])
          }
          if (brannalarmData.batteritype) {
            alarmsenderData.push(['Batteritype', brannalarmData.batteritype])
          }
          if (brannalarmData.forsynet_fra_brannsentral) {
            alarmsenderData.push(['Forsynt fra brannsentral', 'Ja'])
          }
          // Eksterne mottakere - inkludert i samme tabell
          if (brannalarmData.ekstern_mottaker_aktiv && brannalarmData.ekstern_mottaker_info) {
            alarmsenderData.push(['Eksterne mottakere', brannalarmData.ekstern_mottaker_info])
          }
          // Kommentar til alarmsender
          if (brannalarmData.mottaker_kommentar) {
            alarmsenderData.push(['Kommentar', brannalarmData.mottaker_kommentar])
          }

          if (alarmsenderData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Alarmsender', '']],
              body: alarmsenderData,
              theme: 'grid',
              headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 10 },
              styles: { fontSize: 9, cellPadding: 3 },
              columnStyles: {
                0: { cellWidth: 45, fontStyle: 'bold', fillColor: [245, 245, 245] },
                1: { cellWidth: 140 }
              },
              margin: { left: 10, right: 10, bottom: 25 },
              didDrawPage: () => {
                const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
                addFooter(currentPage)
              }
            })
            yPos = (doc as any).lastAutoTable.finalY + 8
          }
        }
      }

      // Avvik-oppsummering - etter tilleggsutstyr
      const avvikPunkter = kontrollpunkter.filter(p => p.avvik)
      const styringerMedAvvik = styringer.filter(s => s.har_avvik && s.avvik && s.avvik.length > 0)
      
      if (avvikPunkter.length > 0 || styringerMedAvvik.length > 0) {
        // Alltid ny side for avviksoppsummering
        doc.addPage()
        yPos = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Oppsummering av avvik', 20, yPos)
        yPos += 10

        // Bygg avvikstabell-data
        const avvikTableData: string[][] = []
        let avvikNr = 1

        // Kontrollpunkt-avvik
        avvikPunkter.forEach((punkt) => {
          let avvikBeskrivelser: string[] = []
          
          if (punkt.avvik_liste) {
            try {
              const avvikListe: AvvikItem[] = JSON.parse(punkt.avvik_liste)
              avvikBeskrivelser = avvikListe.map(a => a.beskrivelse || '(Ingen beskrivelse)')
            } catch {
              avvikBeskrivelser = ['(Kunne ikke lese avvik)']
            }
          }

          avvikTableData.push([
            avvikNr.toString(),
            'Kontrollpunkt',
            punkt.kontrollpunkt_navn,
            avvikBeskrivelser.join('\n') || '-',
            punkt.kommentar || '-'
          ])
          avvikNr++
        })

        // Styringer-avvik
        styringerMedAvvik.forEach((styring) => {
          const avvikBeskrivelser = styring.avvik?.filter(a => a.trim() !== '') || []
          
          avvikTableData.push([
            avvikNr.toString(),
            'Styring',
            styring.type,
            avvikBeskrivelser.join('\n') || '-',
            styring.note || '-'
          ])
          avvikNr++
        })

        // Tegn tabell
        autoTable(doc, {
          startY: yPos,
          head: [['Nr', 'Type', 'Punkt/Styring', 'Avvik', 'Kommentar']],
          body: avvikTableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [220, 53, 69],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'top'
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 45 },
            3: { cellWidth: 55 },
            4: { cellWidth: 45 }
          },
          margin: { left: 10, right: 10, bottom: 25 },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // Kommentarer (uten avvik) - vises separat
      const kommentarPunkter = kontrollpunkter.filter(p => !p.avvik && p.kommentar && p.kommentar.trim() !== '')
      if (kommentarPunkter.length > 0) {
        // Start på ny side hvis ikke nok plass
        if (yPos > 200) {
          doc.addPage()
          yPos = 20
        } else if (yPos > 100) {
          // Legg til litt mellomrom hvis vi fortsetter på samme side
          yPos += 10
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Kommentarer', 20, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        kommentarPunkter.forEach((punkt, index) => {
          // Sjekk om vi trenger ny side
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          // Kommentar nummer og kontrollpunkt
          doc.setFont('helvetica', 'bold')
          doc.text(`${index + 1}. ${punkt.kontrollpunkt_navn}`, 20, yPos)
          yPos += 6

          // Status
          doc.setFont('helvetica', 'normal')
          if (punkt.status) {
            doc.text(`Status: ${punkt.status}`, 25, yPos)
            yPos += 5
          }

          // Kommentar
          doc.setFont('helvetica', 'bold')
          doc.text('Kommentar:', 25, yPos)
          yPos += 5
          doc.setFont('helvetica', 'normal')
          const kommentarLines = doc.splitTextToSize(punkt.kommentar || '', 165)
          doc.text(kommentarLines, 25, yPos)
          yPos += kommentarLines.length * 5 + 8

          // Sjekk igjen om vi trenger ny side for neste kommentar
          if (yPos > 250 && index < kommentarPunkter.length - 1) {
            doc.addPage()
            yPos = 20
          }
        })
      }

      // Legg til footer på siste side (etter både avvik og kommentarer)
      if (avvikPunkter.length > 0 || kommentarPunkter.length > 0) {
        const totalPages = (doc as any).internal.getNumberOfPages()
        addFooter(totalPages)
      }

      // ===== FORSKRIFTER OG EIERS PLIKTER =====
      doc.addPage()
      yPos = 20
      const forskrifterPage = (doc as any).internal.getCurrentPageInfo().pageNumber

      // Hovedoverskrift
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Forskrifter og eiers plikter', 20, yPos)
      yPos += 10

      // Innledning
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(80, 80, 80)
      const innledning = 'Basert på gjeldende krav i brann- og eksplosjonsvernloven med tilhørende forskrifter.'
      doc.text(innledning, 20, yPos)
      doc.setTextColor(0)
      yPos += 10

      // Eiers ansvar
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Eiers ansvar', 20, yPos)
      yPos += 6

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const eiersAnsvar = 'Eier av byggverk har et overordnet ansvar for at bygget til enhver tid oppfyller gjeldende krav til brannsikkerhet. Dette innebærer at bygning, tekniske installasjoner og organisatoriske tiltak skal være tilpasset byggets bruk og risikobilde.'
      const eiersAnsvarLines = doc.splitTextToSize(eiersAnsvar, 170)
      doc.text(eiersAnsvarLines, 20, yPos)
      yPos += eiersAnsvarLines.length * 4 + 6

      // Eier skal påse at:
      doc.setFont('helvetica', 'bold')
      doc.text('Eier skal påse at:', 20, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const plikter = [
        'Brannalarmanlegg og øvrige sikkerhetsinstallasjoner er prosjektert, installert og vedlikeholdt i henhold til gjeldende regelverk og standarder',
        'Sikkerhetsinstallasjoner fungerer som forutsatt og bidrar til å oppdage og begrense konsekvensene av brann',
        'Brukere av byggverket har nødvendig kunnskap om rutiner og bruk av sikkerhetsutstyr'
      ]

      plikter.forEach(plikt => {
        const pliktLines = doc.splitTextToSize('- ' + plikt, 165)
        doc.text(pliktLines, 25, yPos)
        yPos += pliktLines.length * 4 + 2
      })
      yPos += 4

      // Systematisk kontroll
      doc.setFont('helvetica', 'bold')
      doc.text('Systematisk kontroll og vedlikehold', 20, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const systematisk = 'I henhold til NS 3960 skal brannalarmanlegg underlegges årlig kontroll utført av kvalifisert personell. Kontrollen skal verifisere at anlegget fungerer som forutsatt, og omfatter blant annet:'
      const systematiskLines = doc.splitTextToSize(systematisk, 170)
      doc.text(systematiskLines, 20, yPos)
      yPos += systematiskLines.length * 4 + 3

      const faktorer = ['Funksjon av deteksjon, alarmorganer og styringer', 'Gjennomgang av hendelser, feil og tidligere avvik', 'Kontroll av dokumentasjon og tegninger']
      faktorer.forEach(faktor => {
        doc.text('- ' + faktor, 25, yPos)
        yPos += 4
      })
      yPos += 4

      // Eiers ansvar for kontroll
      const eierAnsvarKontroll = 'Eier er ansvarlig for at kontroll og vedlikehold gjennomføres og dokumenteres i samsvar med gjeldende krav.'
      const eierAnsvarKontrollLines = doc.splitTextToSize(eierAnsvarKontroll, 170)
      doc.text(eierAnsvarKontrollLines, 20, yPos)
      yPos += eierAnsvarKontrollLines.length * 4 + 10

      // Kommentarer vedrørende byggtekniske forhold
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Kommentarer vedrørende byggtekniske og driftsmessige forhold', 20, yPos)
      yPos += 6

      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(80, 80, 80)
      doc.text('(Ref. krav til eksisterende byggverk og endringer som påvirker brannsikkerhet)', 20, yPos)
      doc.setTextColor(0)
      yPos += 6

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const vurdering = 'Det er gjennomført en vurdering av hvorvidt bygget og dets tekniske installasjoner er i samsvar med de forutsetninger som lå til grunn ved prosjektering av brannalarmanlegget.'
      const vurderingLines = doc.splitTextToSize(vurdering, 170)
      doc.text(vurderingLines, 20, yPos)
      yPos += vurderingLines.length * 4 + 4

      const dokumentasjon = 'Dersom det ikke foreligger tilstrekkelig dokumentasjon, er kontrollen utført basert på:'
      const dokumentasjonLines = doc.splitTextToSize(dokumentasjon, 170)
      doc.text(dokumentasjonLines, 20, yPos)
      yPos += dokumentasjonLines.length * 4 + 2

      const basertPa = ['Visuell befaring', 'Gjeldende standarder og normer', 'Erfaringstall og beste praksis']
      basertPa.forEach(punkt => {
        doc.text('- ' + punkt, 25, yPos)
        yPos += 4
      })
      yPos += 4

      // Følgende legges til grunn
      doc.setFont('helvetica', 'bold')
      doc.text('Følgende legges til grunn:', 20, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const grunnlag = [
        'For bygg oppført før gjeldende teknisk forskrift (TEK), kan enkelte forhold vurderes som avvik eller forbedringspunkter uten at dette nødvendigvis innebærer regelverksbrudd',
        'Endringer i bruk, planløsning eller tekniske installasjoner kan påvirke anleggets funksjon og må vurderes særskilt'
      ]

      grunnlag.forEach(punkt => {
        const punktLines = doc.splitTextToSize('- ' + punkt, 165)
        doc.text(punktLines, 25, yPos)
        yPos += punktLines.length * 4 + 2
      })
      yPos += 4

      // Anbefaling
      doc.setFillColor(240, 248, 255)
      doc.rect(15, yPos - 2, 180, 14, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const anbefaling = 'Det anbefales at identifiserte avvik og forbedringspunkter utbedres i henhold til gjeldende standarder for å sikre optimal funksjon og økt personsikkerhet.'
      const anbefalingLines = doc.splitTextToSize(anbefaling, 170)
      doc.text(anbefalingLines, 20, yPos + 2)

      addFooter(forskrifterPage)

      const pdfBlob = doc.output('blob')
      const datoForFilnavn = kontrollData.dato ? new Date(kontrollData.dato) : new Date()
      const year = datoForFilnavn.getFullYear()
      // Konverter norske bokstaver til vanlige for storage (Supabase støtter ikke æøå i filnavn)
      const anleggsnavnForStorage = anleggData.anleggsnavn
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')  // Erstatt mellomrom med underscore
        .replace(/[^a-zA-Z0-9._-]/g, '_')  // Fjern alle spesialtegn utenom punktum og bindestrek
      const fileName = `Rapport_Brannalarm_NS3960_${year}_${anleggsnavnForStorage}.pdf`

      if (preview) {
        // Forhåndsvisning
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til storage i anlegg.dokumenter bucket
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
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

        // Upsert record into dokumenter table (oppdater hvis finnes, ellers insert)
        const { error: dbError } = await supabase
          .from('dokumenter')
          .upsert({
            anlegg_id: anleggId,
            filnavn: fileName,
            url: urlData?.signedUrl || null,
            type: 'NS3960 Rapport',
            opplastet_dato: new Date().toISOString(),
            storage_path: storagePath
          }, {
            onConflict: 'anlegg_id,filnavn'
          })

        if (dbError) {
          console.error('⚠️ Feil ved lagring til dokumenter-tabell:', dbError)
          // Fortsett likevel - rapporten er lagret i storage
        }

        // Oppdater kontroll status til 'ferdig'
        const { error: statusError } = await supabase
          .from('anleggsdata_kontroll')
          .update({ 
            kontroll_status: 'ferdig',
            dato: new Date().toISOString(),
          })
          .eq('id', kontrollId)

        if (statusError) {
          console.error('Feil ved oppdatering av status:', statusError)
          // Fortsett likevel - rapporten er lagret
        }

        // Last opp til Dropbox hvis aktivert
        if (dropboxAvailable) {
          try {
            // Hent kundedata for Dropbox-sti
            const { data: kundeInfo } = await supabase
              .from('customer')
              .select('kunde_nummer, navn')
              .eq('id', anleggData.kundenr)
              .single()

            if (kundeInfo?.kunde_nummer && kundeInfo?.navn) {
              console.log('📤 Laster opp NS3960-rapport til Dropbox...')
              const dropboxResult = await uploadKontrollrapportToDropbox(
                kundeInfo.kunde_nummer,
                kundeInfo.navn,
                anleggData.anleggsnavn,
                fileName,
                pdfBlob
              )

              if (dropboxResult.success) {
                console.log('✅ NS3960-rapport lastet opp til Dropbox:', dropboxResult.path)
              } else {
                console.warn('⚠️ Dropbox-opplasting feilet:', dropboxResult.error)
              }
            } else {
              console.warn('⚠️ Kundenummer mangler - kan ikke laste opp til Dropbox')
            }
          } catch (dropboxError) {
            console.error('❌ Feil ved Dropbox-opplasting:', dropboxError)
            // Ikke stopp prosessen hvis Dropbox feiler
          }
        }

        // Vis dialog for å sette tjeneste til fullført
        setShowFullfortDialog(true)
      }
    } catch (error: any) {
      console.error('Feil ved generering av PDF:', error)
      console.error('Error stack:', error?.stack)
      alert(`Kunne ikke generere PDF: ${error?.message || 'Ukjent feil'}. Sjekk console for detaljer.`)
    } finally {
      setGenerating(false)
    }
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med brannalarm_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ brannalarm_fullfort: true })
        .eq('id', anleggId)

      if (error) throw error

      // Lukk fullført-dialogen og vis send rapport-dialogen
      setShowFullfortDialog(false)
      setShowSendRapportDialog(true)
    } catch (error) {
      console.error('Feil ved oppdatering av tjenestestatus:', error)
      alert('Rapport lagret, men kunne ikke oppdatere status')
      setShowFullfortDialog(false)
      setGenerating(false)
    }
  }

  function handleSendRapportConfirm() {
    // Naviger til Send Rapporter med kunde og anlegg pre-valgt
    setShowSendRapportDialog(false)
    setGenerating(false)
    
    // Hent kundeId fra anleggData
    if (anleggData) {
      navigate('/send-rapporter', { 
        state: { 
          kundeId: anleggData.kundenr, 
          anleggId: anleggId 
        } 
      })
    }
  }

  function handleSendRapportCancel() {
    // Lukk dialogen uten å navigere
    setShowSendRapportDialog(false)
    setGenerating(false)
  }

  function handleTjenesteAvbryt() {
    alert('Rapport generert og lagret! Kontroll fullført ✓')
    onBack()
    setShowFullfortDialog(false)
    setGenerating(false)
  }

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannalarmPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        rapportType="NS3960"
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

          // Upsert record into dokumenter table (oppdater hvis finnes, ellers insert)
          await supabase
            .from('dokumenter')
            .upsert({
              anlegg_id: anleggId,
              filnavn: previewPdf.fileName,
              url: urlData?.signedUrl || null,
              type: 'NS3960 Rapport',
              opplastet_dato: new Date().toISOString(),
              storage_path: storagePath
            }, {
              onConflict: 'anlegg_id,filnavn'
            })

          // Oppdater kontroll status til 'ferdig'
          await supabase
            .from('anleggsdata_kontroll')
            .update({ 
              kontroll_status: 'ferdig',
              dato: new Date().toISOString(),
            })
            .eq('id', kontrollId)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generer rapport</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{anleggData?.anleggsnavn}</p>
          </div>
        </div>
      </div>

      {/* Forhåndsvisning */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rapportinnhold</h2>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Anleggsinformasjon</h3>
            <p className="text-gray-600 dark:text-gray-400">{anleggData?.anleggsnavn}</p>
            {kundeData && <p className="text-gray-600 dark:text-gray-400">Kunde: {kundeData.navn}</p>}
          </div>

          {(brannalarmData?.leverandor || brannalarmData?.sentraltype) && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Teknisk informasjon</h3>
              {brannalarmData.leverandor && <p className="text-gray-600 dark:text-gray-400">Leverandør: {brannalarmData.leverandor}</p>}
              {brannalarmData.sentraltype && <p className="text-gray-600 dark:text-gray-400">Sentraltype: {brannalarmData.sentraltype}</p>}
            </div>
          )}

          {enheter.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Enheter</h3>
              <p className="text-gray-600 dark:text-gray-400">{enheter.length} aktive enheter</p>
            </div>
          )}

          {styringer.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Styringer</h3>
              <p className="text-gray-600 dark:text-gray-400">{styringer.length} aktive styringer</p>
            </div>
          )}

          {nettverk.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Nettverk</h3>
              <p className="text-gray-600 dark:text-gray-400">{nettverk.length} nettverksenheter</p>
            </div>
          )}

          {kontrollpunkter.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Kontrollpunkter</h3>
              <p className="text-gray-600 dark:text-gray-400">{kontrollpunkter.length} kontrollpunkter</p>
              <p className="text-gray-600 dark:text-gray-400">Avvik: {kontrollpunkter.filter(p => p.avvik).length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Kontrolldato velger */}
      <div className="card">
        <KontrolldatoVelger
          kontrolldato={kontrolldato}
          onDatoChange={setKontrolldato}
          label="Kontrolldato for rapport"
        />
        <p className="text-xs text-gray-500 mt-2">
          Standard er dagens dato. Velg en annen dato hvis du trenger å tilbakedatere rapporten.
        </p>
      </div>

      {/* Action buttons - med left offset for sidebar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 z-40">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <button
            onClick={() => generatePDF(true)}
            disabled={generating}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Forhåndsvis
          </button>
          <button
            onClick={() => generatePDF(false)}
            disabled={generating}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Genererer...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generer og lagre rapport
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dialog for å sette tjeneste til fullført */}
      <TjenesteFullfortDialog
        tjeneste="Brannalarm"
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
