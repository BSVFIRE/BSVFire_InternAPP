import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Download, Eye, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannalarmPreview } from './BrannalarmPreview'

interface FG790RapportViewProps {
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
  kontrollor_vurdering_sum?: number
  kontrollor_vurdering_kommentar?: string
  ingen_anleggsvurdering?: boolean
  ingen_anleggsvurdering_kommentar?: string
  kritisk_feil?: boolean
  kritisk_feil_kommentar?: string
}

interface AnsattData {
  navn: string
  epost?: string
  telefon?: string
  fg_sertifikat_nr?: string
}

interface Kontrollpunkt {
  posisjon: string
  kategori: string
  tittel: string
  status: string
  avvik_type?: string
  feilkode?: string
  ag_verdi?: string
  poeng_trekk: number
  antall_avvik: number
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

export function FG790RapportView({ kontrollId, anleggId, kundeNavn, onBack }: FG790RapportViewProps) {
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

  useEffect(() => {
    loadData()
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
        .select('dato, kontrollor_id, merknader, har_feil, feil_kommentar, har_utkoblinger, utkobling_kommentar, kontrollor_vurdering_sum, kontrollor_vurdering_kommentar, ingen_anleggsvurdering, ingen_anleggsvurdering_kommentar, kritisk_feil, kritisk_feil_kommentar')
        .eq('id', kontrollId)
        .single()

      if (kontroll) {
        setKontrollData(kontroll)
        
        // Hent kontrollør-informasjon hvis kontrollor_id finnes
        if (kontroll.kontrollor_id) {
          const { data: ansatt } = await supabase
            .from('ansatte')
            .select('navn, epost, telefon, fg_sertifikat_nr')
            .eq('id', kontroll.kontrollor_id)
            .maybeSingle()
          
          if (ansatt) setKontrollorData(ansatt)
        }
      }

      // Hent kontrollpunkter
      const { data: punkter, error: punkterError } = await supabase
        .from('kontrollsjekkpunkter_brannalarm')
        .select('*')
        .eq('kontroll_id', kontrollId)
        .order('posisjon')
        .order('kategori')

      console.log('FG790 Kontrollpunkter:', punkter, 'Error:', punkterError)
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
            enheterArray.push({
              type: label,
              antall: brannalarm[`${key}_antall`] || 0,
              typeModell: brannalarm[`${key}_type`] || '',
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
            styringerArray.push({
              type: label,
              antall: brannalarm[`${key}_antall`] || 0,
              status: brannalarm[`${key}_status`] || '',
              note: brannalarm[`${key}_note`] || '',
            })
          }
        })

        setStyringer(styringerArray)
      }

      // Hent nettverk
      const { data: nettverkData, error: nettverkError } = await supabase
        .from('nettverk_brannalarm')
        .select('nettverk_id, plassering, type, sw_id, spenning, ah, batterialder')
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

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
doc.text('BRANNALARM KONTROLLRAPPORT FG790', pageWidth / 2, yPos, { align: 'center' })
      yPos += 20

      // Anleggsinformasjon - enkel layout
      doc.setFontSize(11)
      const labelWidth = 35
      
      // Kunde
      doc.setFont('helvetica', 'bold')
      doc.text('Kunde:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(kundeData?.navn || '-', 20 + labelWidth, yPos)
      yPos += 6

      // Anlegg
      doc.setFont('helvetica', 'bold')
      doc.text('Anlegg:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(anleggData.anleggsnavn, 20 + labelWidth, yPos)
      yPos += 6

      // Adresse
      if (anleggData.adresse) {
        doc.setFont('helvetica', 'bold')
        doc.text('Adresse:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        const adresseText = `${anleggData.adresse}, ${anleggData.postnummer || ''} ${anleggData.poststed || ''}`
        doc.text(adresseText, 20 + labelWidth, yPos)
        yPos += 6
      }

      yPos += 2

      // Dato
      doc.setFont('helvetica', 'bold')
      doc.text('Dato:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      const kontrollDato = new Date(kontrollData.dato)
      doc.text(kontrollDato.toLocaleDateString('nb-NO'), 20 + labelWidth, yPos)
      yPos += 6

      // Neste kontroll (12 måneder frem)
      const nesteKontroll = new Date(kontrollDato)
      nesteKontroll.setFullYear(nesteKontroll.getFullYear() + 1)
      const nesteKontrollText = nesteKontroll.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })
      
      doc.setFont('helvetica', 'bold')
      doc.text('Neste kontroll:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(nesteKontrollText.charAt(0).toUpperCase() + nesteKontrollText.slice(1), 20 + labelWidth, yPos)
      yPos += 8

      // Kontaktperson
      if (primaerKontakt?.navn) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Kontaktperson:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
        doc.text(primaerKontakt.navn, 20, yPos)
        yPos += 4
        if (primaerKontakt.telefon) {
          doc.text(`Tlf: ${primaerKontakt.telefon}`, 20, yPos)
          yPos += 4
        }
        if (primaerKontakt.epost) {
          doc.text(`E-post: ${primaerKontakt.epost}`, 20, yPos)
          yPos += 4
        }
        yPos += 4
      }

      // Utført av (kontrollør)
      if (kontrollorData?.navn) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Utført av:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
        doc.text(kontrollorData.navn, 20, yPos)
        yPos += 4
        if (kontrollorData.telefon) {
          doc.text(`Tlf: ${kontrollorData.telefon}`, 20, yPos)
          yPos += 4
        }
        if (kontrollorData.epost) {
          doc.text(`E-post: ${kontrollorData.epost}`, 20, yPos)
          yPos += 4
        }
        if (kontrollorData.fg_sertifikat_nr) {
          doc.text(`FG-sertifikat: ${kontrollorData.fg_sertifikat_nr}`, 20, yPos)
          yPos += 4
        }
        yPos += 4
      }

      yPos += 6

      // Teknisk informasjon
      if (brannalarmData?.leverandor || brannalarmData?.sentraltype) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Teknisk informasjon', 20, yPos)
        yPos += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        if (brannalarmData.leverandor) {
          doc.text(`Leverandør: ${brannalarmData.leverandor}`, 20, yPos)
          yPos += 5
        }
        if (brannalarmData.sentraltype) {
          doc.text(`Sentraltype: ${brannalarmData.sentraltype}`, 20, yPos)
          yPos += 5
        }
        yPos += 5
      }

      // Tilleggsinformasjon (merknader, feil, utkoblinger) - på side 1
      if (kontrollData.merknader || kontrollData.har_feil || kontrollData.har_utkoblinger) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Tilleggsinformasjon', 20, yPos)
        yPos += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        if (kontrollData.merknader) {
          doc.setFont('helvetica', 'bold')
          doc.text('Merknader:', 20, yPos)
          yPos += 5
          doc.setFont('helvetica', 'normal')
          const merknadLines = doc.splitTextToSize(kontrollData.merknader, 170)
          doc.text(merknadLines, 20, yPos)
          yPos += merknadLines.length * 5 + 5
        }

        if (kontrollData.har_feil) {
          doc.setFont('helvetica', 'bold')
          doc.text('Feil registrert:', 20, yPos)
          yPos += 5
          doc.setFont('helvetica', 'normal')
          if (kontrollData.feil_kommentar) {
            const feilLines = doc.splitTextToSize(kontrollData.feil_kommentar, 170)
            doc.text(feilLines, 20, yPos)
            yPos += feilLines.length * 5 + 5
          }
        }

        if (kontrollData.har_utkoblinger) {
          doc.setFont('helvetica', 'bold')
          doc.text('Utkoblinger registrert:', 20, yPos)
          yPos += 5
          doc.setFont('helvetica', 'normal')
          if (kontrollData.utkobling_kommentar) {
            const utkoblingLines = doc.splitTextToSize(kontrollData.utkobling_kommentar, 170)
            doc.text(utkoblingLines, 20, yPos)
            yPos += utkoblingLines.length * 5 + 5
          }
        }

        yPos += 5
      }

      // Legg til footer på første side
      addFooter(1)

      // Start side 2 for enheter
      doc.addPage()
      yPos = 20

      // Enheter
      if (enheter.length > 0) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Enheter', 20, yPos)
        yPos += 7

        const enheterRows = enheter.map(e => [
          e.type,
          e.antall.toString(),
          e.typeModell || '-',
          e.kommentar || '-'
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Type', 'Antall', 'Type/Modell', 'Kommentar']],
          body: enheterRows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 },
          margin: { left: 10, right: 10, bottom: 25 },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // Styringer
      if (styringer.length > 0) {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Styringer', 20, yPos)
        yPos += 7

        const styringerRows = styringer.map(s => [
          s.type,
          s.antall.toString(),
          s.status,
          s.note || '-'
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Type', 'Antall', 'Status', 'Notat']],
          body: styringerRows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 },
          margin: { left: 10, right: 10, bottom: 25 },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
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
          n.spenning ? `${n.spenning}V` : '-',
          n.ah ? `${n.ah}Ah` : '-',
          n.batterialder ? n.batterialder.toString() : '-'
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

      // Poeng-oppsummering før kontrollpunkter
      const totalPoengTrekk = kontrollpunkter.reduce((sum, p) => 
        sum + ((p.poeng_trekk || 0) * (p.antall_avvik || 1)), 0
      )
      const sluttScore = Math.max(0, 100 - totalPoengTrekk)

      // Beregn AG-verdier for anleggsvurdering
      const agCounts = { AG0: 0, AG1: 0, AG2: 0, AG3: 0, AGIU: 0 }
      kontrollpunkter.forEach(p => {
        if (p.avvik_type && p.ag_verdi) {
          const ag = p.ag_verdi.toUpperCase()
          if (ag in agCounts) {
            agCounts[ag as keyof typeof agCounts] += (p.antall_avvik || 1)
          }
        }
      })

      // Beregn anleggsvurdering
      const agFaktorer = { AG0: 0, AG1: 0.5, AG2: 0.8, AG3: 2, AGIU: 0 }
      const totalTrekk = 
        agCounts.AG0 * agFaktorer.AG0 +
        agCounts.AG1 * agFaktorer.AG1 +
        agCounts.AG2 * agFaktorer.AG2 +
        agCounts.AG3 * agFaktorer.AG3 +
        agCounts.AGIU * agFaktorer.AGIU
      
      const anleggsVurdering = Math.max(0, 100 - totalTrekk)
      
      // Bruk verdier fra kontrollData hvis de finnes, ellers bruk beregnede verdier
      const kontrollorVurdering = kontrollData.kontrollor_vurdering_sum ?? anleggsVurdering
      const kontrollorVurderingKommentar = kontrollData.kontrollor_vurdering_kommentar || 'Avvikene vil alene ikke representere vesentlig reduksjon av anleggets funksjon.'
      const harKritiskeFeil = kontrollData.kritisk_feil ?? (agCounts.AG3 > 0)
      const kritiskFeilKommentar = kontrollData.kritisk_feil_kommentar || (harKritiskeFeil ? 'Ikke-funksjonelt anlegg. Feil må utbedres umiddelbart.' : '')
      const ingenAnleggsvurdering = kontrollData.ingen_anleggsvurdering ?? (anleggsVurdering < 80)
      const ingenAnleggsvurderingKommentar = kontrollData.ingen_anleggsvurdering_kommentar || (ingenAnleggsvurdering ? 'Ikke fulldekkende anlegg. Mangler brannskille.' : '')

      doc.addPage()
      yPos = 20

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Totalsum', 20, yPos)
      yPos += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Score: ${sluttScore.toFixed(1)} / 100`, 20, yPos)
      yPos += 6
      doc.text(`Poeng trekk: ${totalPoengTrekk.toFixed(1)}`, 20, yPos)
      yPos += 6
      doc.text(`Antall avvik: ${kontrollpunkter.filter(p => p.avvik_type).length}`, 20, yPos)
      yPos += 20

      // Anleggsvurdering tabell (FG790 Tabell 3.5.2-1)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Tabell 3.5.2-1: Anleggsvurdering', 20, yPos)
      yPos += 10

      const anleggsvurderingData = [
        ['AG0', agCounts.AG0.toString(), agFaktorer.AG0.toString(), (agCounts.AG0 * agFaktorer.AG0).toFixed(1), ''],
        ['AG1', agCounts.AG1.toString(), agFaktorer.AG1.toString(), (agCounts.AG1 * agFaktorer.AG1).toFixed(1), ''],
        ['AG2', agCounts.AG2.toString(), agFaktorer.AG2.toString(), (agCounts.AG2 * agFaktorer.AG2).toFixed(1), ''],
        ['AG3', agCounts.AG3.toString(), agFaktorer.AG3.toString(), (agCounts.AG3 * agFaktorer.AG3).toFixed(1), ''],
        ['AGIU', agCounts.AGIU.toString(), agFaktorer.AGIU.toString(), (agCounts.AGIU * agFaktorer.AGIU).toFixed(1), ''],
        ['Totalt trekk (× -1)', '', '', (-totalTrekk).toFixed(1), ''],
        ['Maksimalt tilgjengelige poeng', '', '', '100', ''],
        ['Anleggets totalsum', '', '', anleggsVurdering.toFixed(1), ''],
        ['Kontrollørens vurdering', '', '', kontrollorVurdering.toFixed(0), kontrollorVurderingKommentar],
        ['Ingen anleggsvurdering\n(Se 3.5.3.2)', '', '', ingenAnleggsvurdering ? 'X' : '', ingenAnleggsvurderingKommentar],
        ['Kritisk funksjonsfeil\n(Se 3.5.3.3)', '', '', harKritiskeFeil ? 'RØD' : '', kritiskFeilKommentar]
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Avviksgrad (AG)', 'Antall\nfunn', 'Faktor', 'Sum', 'Kommentar/begrunnelse']],
        body: anleggsvurderingData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 85 }
        },
        didParseCell: (data) => {
          // Fremhev viktige rader
          if (data.row.index === 7) { // Kontrollørens vurdering
            data.cell.styles.fillColor = [255, 255, 200]
          }
          if (data.row.index === 8) { // Ingen anleggsvurdering
            data.cell.styles.fillColor = ingenAnleggsvurdering ? [255, 200, 200] : [240, 240, 240]
          }
          if (data.row.index === 9) { // Kritisk funksjonsfeil
            data.cell.styles.fillColor = harKritiskeFeil ? [255, 100, 100] : [240, 240, 240]
            if (harKritiskeFeil && data.column.index === 3) {
              data.cell.styles.textColor = [255, 0, 0]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        },
        margin: { left: 10, right: 10, bottom: 25 },
        didDrawPage: () => {
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
          addFooter(currentPage)
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Kontrollpunkter per posisjon
      const posisjoner = ['POS.1 - Dokumentasjon', 'POS.2 - Visuell kontroll', 'POS.3 - Funksjonstest']
      
      posisjoner.forEach((posisjon, index) => {
        const punkter = kontrollpunkter.filter(p => p.posisjon === posisjon)
        if (punkter.length === 0) return

        // Start alltid på ny side for hver posisjon
        if (index > 0 || yPos > 100) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(posisjon, 20, yPos)
        yPos += 7

        const tableData = punkter.map(p => [
          p.tittel,
          p.status || '-',
          p.avvik_type || '-',
          p.ag_verdi || '-',
          p.poeng_trekk ? `${p.poeng_trekk} × ${p.antall_avvik}` : '-',
          p.kommentar || '-'
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Kontrollpunkt', 'Status', 'Avvik', 'AG-verdi', 'Poeng', 'Kommentar']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 40 }
          },
          margin: { left: 10, right: 10, bottom: 25 },
          didDrawPage: () => {
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      })

      // Talevarsling, Nøkkelsafe, Alarmsender - start på ny side
      if (brannalarmData?.talevarsling || brannalarmData?.nokkelsafe || brannalarmData?.alarmsender_i_anlegg) {
        doc.addPage()
        const tilleggsutstyrPage = (doc as any).internal.getCurrentPageInfo().pageNumber
        addFooter(tilleggsutstyrPage)
        yPos = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Tilleggsutstyr', 20, yPos)
        yPos += 10

        // Talevarsling
        if (brannalarmData.talevarsling) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Talevarsling:', 20, yPos)
          yPos += 7

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          
          if (brannalarmData.talevarsling_leverandor) {
            doc.text(`Leverandør: ${brannalarmData.talevarsling_leverandor}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.talevarsling_batteri_type) {
            doc.text(`Batteri type: ${brannalarmData.talevarsling_batteri_type}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.talevarsling_batteri_alder) {
            doc.text(`Batteri alder: ${brannalarmData.talevarsling_batteri_alder} år`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.talevarsling_plassering) {
            doc.text(`Plassering: ${brannalarmData.talevarsling_plassering}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.talevarsling_kommentar) {
            doc.text('Kommentar:', 25, yPos)
            yPos += 5
            const talevarslingLines = doc.splitTextToSize(brannalarmData.talevarsling_kommentar, 165)
            doc.text(talevarslingLines, 25, yPos)
            yPos += talevarslingLines.length * 5
          }
          yPos += 5
        }

        // Nøkkelsafe
        if (brannalarmData.nokkelsafe) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Nøkkelsafe:', 20, yPos)
          yPos += 7

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          
          if (brannalarmData.nokkelsafe_type) {
            doc.text(`Type: ${brannalarmData.nokkelsafe_type}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.nokkelsafe_plassering) {
            doc.text(`Plassering: ${brannalarmData.nokkelsafe_plassering}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.nokkelsafe_innhold) {
            doc.text(`Innhold: ${brannalarmData.nokkelsafe_innhold}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.nokkelsafe_kommentar) {
            doc.text('Kommentar:', 25, yPos)
            yPos += 5
            const nokkelLines = doc.splitTextToSize(brannalarmData.nokkelsafe_kommentar, 165)
            doc.text(nokkelLines, 25, yPos)
            yPos += nokkelLines.length * 5
          }
          yPos += 5
        }

        // Alarmsender
        if (brannalarmData.alarmsender_i_anlegg) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Alarmsender:', 20, yPos)
          yPos += 7

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          
          if (brannalarmData.mottaker && brannalarmData.mottaker.length > 0) {
            doc.text(`Mottaker: ${brannalarmData.mottaker.join(', ')}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.sender_2G_4G) {
            doc.text(`Sender type: ${brannalarmData.sender_2G_4G}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.gsm_nummer) {
            doc.text(`GSM-nummer: ${brannalarmData.gsm_nummer}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.plassering) {
            doc.text(`Plassering: ${brannalarmData.plassering}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.batterialder) {
            doc.text(`Batterialder: ${brannalarmData.batterialder} år`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.batteritype) {
            doc.text(`Batteritype: ${brannalarmData.batteritype}`, 25, yPos)
            yPos += 5
          }
          if (brannalarmData.forsynet_fra_brannsentral) {
            doc.text('Forsynt fra brannsentral: Ja', 25, yPos)
            yPos += 5
          }
          
          // Eksterne mottakere
          if (brannalarmData.ekstern_mottaker_aktiv && brannalarmData.ekstern_mottaker_info) {
            yPos += 3
            doc.setFont('helvetica', 'bold')
            doc.text('Eksterne mottakere:', 25, yPos)
            yPos += 5
            doc.setFont('helvetica', 'normal')
            
            const eksternLines = doc.splitTextToSize(brannalarmData.ekstern_mottaker_info, 165)
            doc.text(eksternLines, 25, yPos)
            yPos += eksternLines.length * 5
          }
          
          if (brannalarmData.mottaker_kommentar) {
            yPos += 3
            doc.text('Kommentar:', 25, yPos)
            yPos += 5
            const alarmLines = doc.splitTextToSize(brannalarmData.mottaker_kommentar, 165)
            doc.text(alarmLines, 25, yPos)
            yPos += alarmLines.length * 5
          }
          yPos += 5
        }
      }

      // Avvik-oppsummering - etter tilleggsutstyr
      const avvikPunkter = kontrollpunkter.filter(p => p.avvik_type)
      console.log('Avvik-punkter for PDF:', avvikPunkter)
      console.log('Alle kontrollpunkter:', kontrollpunkter)
      if (avvikPunkter.length > 0) {
        // Start på ny side hvis ikke nok plass
        if (yPos > 200 || !brannalarmData?.talevarsling && !brannalarmData?.nokkelsafe && !brannalarmData?.alarmsender_i_anlegg) {
          doc.addPage()
          yPos = 20
        } else if (yPos > 100) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Oppsummering av avvik', 20, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        avvikPunkter.forEach((punkt, index) => {
          // Sjekk om vi trenger ny side
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          // Avvik nummer og kontrollpunkt
          doc.setFont('helvetica', 'bold')
          const tittelLines = doc.splitTextToSize(`${index + 1}. ${punkt.tittel}`, 170)
          doc.text(tittelLines, 20, yPos)
          yPos += tittelLines.length * 6

          // Avvik type
          doc.setFont('helvetica', 'normal')
          if (punkt.avvik_type) {
            doc.text(`Avvik: ${punkt.avvik_type}`, 25, yPos)
            yPos += 5
          }

          // AG-verdi og poeng
          if (punkt.ag_verdi) {
            doc.text(`AG-verdi: ${punkt.ag_verdi} (${punkt.poeng_trekk} poeng × ${punkt.antall_avvik})`, 25, yPos)
            yPos += 5
          }

          // Feilkode
          if (punkt.feilkode) {
            doc.text(`Feilkode: ${punkt.feilkode}`, 25, yPos)
            yPos += 5
          }

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

          // Sjekk igjen om vi trenger ny side for neste avvik
          if (yPos > 250 && index < avvikPunkter.length - 1) {
            doc.addPage()
            yPos = 20
          }
        })

        // Legg til footer på siste side
        const totalPages = (doc as any).internal.getNumberOfPages()
        addFooter(totalPages)
      }

      const pdfBlob = doc.output('blob')
      const year = new Date(kontrollData.dato).getFullYear()
      const fileName = `Rapport_Brannalarm_${year}_${anleggData.anleggsnavn.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

      if (preview) {
        // Forhåndsvisning
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til storage
        const { error: uploadError } = await supabase.storage
          .from('rapporter')
          .upload(`brannalarm/${anleggId}/${fileName}`, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (uploadError) throw uploadError

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

        alert('Rapport generert og lagret! Kontroll fullført ✓')
        onBack()
      }
    } catch (error: any) {
      console.error('Feil ved generering av PDF:', error)
      console.error('Error stack:', error?.stack)
      alert(`Kunne ikke generere PDF: ${error?.message || 'Ukjent feil'}. Sjekk console for detaljer.`)
    } finally {
      setGenerating(false)
    }
  }

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannalarmPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        rapportType="FG790"
        onBack={() => setPreviewPdf(null)}
        onSave={async () => {
          const { error: uploadError } = await supabase.storage
            .from('rapporter')
            .upload(`brannalarm/${anleggId}/${previewPdf.fileName}`, previewPdf.blob, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (uploadError) throw uploadError

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
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Generer rapport</h1>
            <p className="text-gray-400 mt-1">{anleggData?.anleggsnavn}</p>
          </div>
        </div>
      </div>

      {/* Forhåndsvisning */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-white">Rapportinnhold</h2>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-white mb-2">Anleggsinformasjon</h3>
            <p className="text-gray-400">{anleggData?.anleggsnavn}</p>
            {kundeData && <p className="text-gray-400">Kunde: {kundeData.navn}</p>}
          </div>

          {(brannalarmData?.leverandor || brannalarmData?.sentraltype) && (
            <div>
              <h3 className="font-semibold text-white mb-2">Teknisk informasjon</h3>
              {brannalarmData.leverandor && <p className="text-gray-400">Leverandør: {brannalarmData.leverandor}</p>}
              {brannalarmData.sentraltype && <p className="text-gray-400">Sentraltype: {brannalarmData.sentraltype}</p>}
            </div>
          )}

          {enheter.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Enheter</h3>
              <p className="text-gray-400">{enheter.length} aktive enheter</p>
            </div>
          )}

          {styringer.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Styringer</h3>
              <p className="text-gray-400">{styringer.length} aktive styringer</p>
            </div>
          )}

          {nettverk.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Nettverk</h3>
              <p className="text-gray-400">{nettverk.length} nettverksenheter</p>
            </div>
          )}

          {kontrollpunkter.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Kontrollpunkter</h3>
              <p className="text-gray-400">{kontrollpunkter.length} kontrollpunkter</p>
              <p className="text-gray-400">Avvik: {kontrollpunkter.filter(p => p.avvik_type).length}</p>
              <p className="text-gray-400">Score: {Math.max(0, 100 - kontrollpunkter.reduce((sum, p) => sum + ((p.poeng_trekk || 0) * (p.antall_avvik || 1)), 0)).toFixed(1)} / 100</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => generatePDF(true)}
            disabled={generating}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Forhåndsvis
          </button>
          <button
            onClick={() => generatePDF(false)}
            disabled={generating}
            className="btn-primary flex items-center justify-center gap-2"
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
    </div>
  )
}
