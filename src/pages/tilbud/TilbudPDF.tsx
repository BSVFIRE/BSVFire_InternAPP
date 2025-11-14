import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TilbudData {
  // Customer info
  kunde_navn: string
  kunde_organisasjonsnummer?: string
  lokasjon?: string
  anlegg_navn?: string
  kontaktperson_navn?: string
  kontaktperson_epost?: string
  kontaktperson_telefon?: string
  
  // Signature info
  opprettet_av_navn?: string
  
  // Services
  tjeneste_brannalarm?: boolean
  tjeneste_nodlys?: boolean
  tjeneste_slukkeutstyr?: boolean
  tjeneste_rokluker?: boolean
  tjeneste_eksternt?: boolean
  ekstern_type?: string
  ekstern_type_annet?: string
  
  // Pricing
  pris_detaljer: any
  total_pris: number
  rabatt_prosent?: number
  timespris?: number
  betalingsbetingelser?: number
  
  // Metadata
  opprettet: string
  gyldig_til?: string
  tilbudsnummer?: string
}

export async function generateTilbudPDF(tilbudData: TilbudData) {
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
  } catch (error) {
    console.error('Kunne ikke laste logo:', error)
    // Fallback til tekst hvis logo ikke lastes
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(41, 128, 185)
    doc.text('BSV FIRE', 20, yPos)
    doc.setTextColor(0)
  }
  
  // Company info (right side)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Brannteknisk Service og Vedlikehold AS', 200, yPos, { align: 'right' })
  doc.text('Org.nr: 921 044 879', 200, yPos + 5, { align: 'right' })
  doc.text('Telefon: 900 46 600', 200, yPos + 10, { align: 'right' })
  doc.text('E-post: mail@bsvfire.no', 200, yPos + 15, { align: 'right' })
  
  yPos += 30

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 102, 204)
  doc.text('TILBUD SERVICEAVTALE', 20, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  
  yPos += 20

  // Tilbudsnummer og dato
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  if (tilbudData.tilbudsnummer) {
    doc.text(`Tilbudsnummer: ${tilbudData.tilbudsnummer}`, 20, yPos)
    yPos += 6
  }
  doc.text(`Dato: ${new Date(tilbudData.opprettet).toLocaleDateString('nb-NO')}`, 20, yPos)
  yPos += 6
  if (tilbudData.gyldig_til) {
    doc.text(`Gyldig til: ${new Date(tilbudData.gyldig_til).toLocaleDateString('nb-NO')}`, 20, yPos)
    yPos += 6
  }
  
  yPos += 8

  // Customer section
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('KUNDE', 22, yPos + 5.5)
  
  yPos += 12
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(tilbudData.kunde_navn, 20, yPos)
  yPos += 5
  
  if (tilbudData.kunde_organisasjonsnummer) {
    doc.text(`Org.nr: ${tilbudData.kunde_organisasjonsnummer}`, 20, yPos)
    yPos += 5
  }
  
  if (tilbudData.lokasjon) {
    doc.text(`Lokasjon: ${tilbudData.lokasjon}`, 20, yPos)
    yPos += 5
  }
  
  if (tilbudData.anlegg_navn) {
    doc.text(`Anlegg: ${tilbudData.anlegg_navn}`, 20, yPos)
    yPos += 5
  }
  
  yPos += 5

  // Contact person
  if (tilbudData.kontaktperson_navn) {
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos, 170, 8, 'F')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('KONTAKTPERSON', 22, yPos + 5.5)
    
    yPos += 12
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(tilbudData.kontaktperson_navn, 20, yPos)
    yPos += 5
    
    if (tilbudData.kontaktperson_epost) {
      doc.text(`E-post: ${tilbudData.kontaktperson_epost}`, 20, yPos)
      yPos += 5
    }
    
    if (tilbudData.kontaktperson_telefon) {
      doc.text(`Telefon: ${tilbudData.kontaktperson_telefon}`, 20, yPos)
      yPos += 5
    }
    
    yPos += 5
  }

  // Services section
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('TJENESTER', 22, yPos + 5.5)
  
  yPos += 12

  const tjenesteLabels: Record<string, string> = {
    brannalarm: 'Årskontroll Brannalarm',
    nodlys: 'Årskontroll Nødlys',
    slukkeutstyr: 'Årskontroll Slukkeutstyr',
    rokluker: 'Årskontroll Røykluker',
    eksternt: 'Eksternt'
  }

  const selectedServices: string[] = []
  Object.keys(tjenesteLabels).forEach(key => {
    if (tilbudData[`tjeneste_${key}` as keyof TilbudData]) {
      selectedServices.push(key)
    }
  })

  // Service details table
  const tableData: any[] = []
  let subtotal = 0

  selectedServices.forEach(tjeneste => {
    const detaljer = tilbudData.pris_detaljer?.[tjeneste]
    if (detaljer && detaljer.pris > 0) {
      let beskrivelse = tjenesteLabels[tjeneste]
      
      // Add ekstern type to description if it's an external service
      if (tjeneste === 'eksternt' && tilbudData.ekstern_type) {
        const typeText = tilbudData.ekstern_type === 'Annet' && tilbudData.ekstern_type_annet
          ? tilbudData.ekstern_type_annet
          : tilbudData.ekstern_type
        beskrivelse = `Eksternt - ${typeText}`
      }

      tableData.push([
        beskrivelse,
        `${detaljer.pris.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`
      ])
      
      subtotal += detaljer.pris
    }
  })

  autoTable(doc, {
    startY: yPos,
    head: [['Beskrivelse', 'Pris']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [60, 60, 60]
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // Pricing summary
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  
  // Subtotal
  doc.text('Sum eks. mva:', 130, yPos)
  doc.text(`${subtotal.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`, 190, yPos, { align: 'right' })
  yPos += 7

  // Discount if applicable
  let totalEksMva = subtotal
  if (selectedServices.length >= 2 && tilbudData.rabatt_prosent && tilbudData.rabatt_prosent > 0) {
    const rabattBelop = subtotal * (tilbudData.rabatt_prosent / 100)
    doc.setTextColor(0, 150, 0) // Green
    doc.text(`Kvantumsrabatt (${tilbudData.rabatt_prosent}%):`, 115, yPos)
    doc.text(`-${rabattBelop.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`, 190, yPos, { align: 'right' })
    yPos += 7
    
    totalEksMva = subtotal - rabattBelop
    doc.setTextColor(60, 60, 60)
    doc.text('Sum etter rabatt:', 130, yPos)
    doc.text(`${totalEksMva.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`, 190, yPos, { align: 'right' })
    yPos += 7
  }

  // MVA (25%)
  const mva = totalEksMva * 0.25
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text('MVA (25%):', 130, yPos)
  doc.text(`${mva.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`, 190, yPos, { align: 'right' })
  yPos += 10

  // Total inkl. MVA
  const totalInklMva = totalEksMva + mva
  doc.setFontSize(14)
  doc.setTextColor(0, 102, 204)
  doc.text('TOTALT:', 130, yPos)
  doc.text(`${totalInklMva.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`, 190, yPos, { align: 'right' })

  yPos += 15

  // Footer notes
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Tilbudet er gyldig i 30 dager fra dato.', 20, yPos)
  yPos += 5
  const betalingsdager = tilbudData.betalingsbetingelser || 20
  doc.text(`Betalingsbetingelser: ${betalingsdager} dager netto.`, 20, yPos)
  yPos += 5
  doc.text('Ved aksept, vennligst signer og returner tilbudet.', 20, yPos)

  // PAGE 2 - Vilkår og fordeler
  doc.addPage()
  yPos = 20

  // Vilkår og forutsetninger
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 102, 204)
  doc.text('VILKÅR OG FORUTSETNINGER', 22, yPos + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  
  yPos += 15

  const vilkar = [
    'Avtalen forutsetter tilgang til hele anlegget.',
    'Kunden stiller ved behov med representant som har kjennskap til anlegget.',
    'Ved førstegangskontroll tilstrebes kontroll av hele anlegget.',
    'Dokumentasjon bør være tilgjengelig ved kontroll (brannkonsept, prosjekteringsunderlag,\nanleggsbeskrivelse) for optimal gjennomføring og FG-790 sertifisering.',
    'Avtalen fornyes automatisk årlig, med 3 måneders oppsigelsestid.',
    'Avtalen indeksreguleres årlig.',
    `Timessats i ordinær arbeidstid 08.00 - 16.00: kr ${tilbudData.timespris || 925},-.`,
    'Transport oppmøte: kr 400,-.',
    'Arbeid utover ordinær arbeidstid faktureres med 50% tillegg eller 100% tillegg\n(Helligdager, Helg og Natt).',
    'Ved akutt utrykning på kveld, natt, helg eller helligdag tilkommer utrykningstillegg på kr 3000,-.',
    'Alle ovennevnte priser er eks. mva.'
  ]

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  
  vilkar.forEach(item => {
    const lines = doc.splitTextToSize(item, 160)
    doc.text('•', 20, yPos)
    doc.text(lines, 27, yPos)
    yPos += lines.length * 5
  })

  yPos += 10

  // Fordeler med serviceavtale
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 102, 204)
  doc.text('FORDELER MED VÅR SERVICEAVTALE', 22, yPos + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  
  yPos += 15

  const fordeler = [
    'Døgnbemannet vakttelefon for akutt assistanse.',
    'Digital loggbok for alle hendelser i anlegget.',
    'Digital rapportering og dokumentasjon.',
    'FG-750 og FG-790 sertifiserte teknikere.',
    'Leverandør-godkjente teknikere.',
    'Eget varelager for reservedeler og rask levering.',
    'Kvantumsrabatt ved flere tjenester utført samtidig ved kontroll.',
    'Vi tilbyr: brannalarm, nødlys, slukkeutstyr, røykluker, ekstern partner på sprinkler,\nekstern partner på el-kontroll.',
    'Bistand med oppdatering av dokumentasjon, som O-planer og rømningsplaner.',
    'Fast kontaktperson som koordinerer alle kontroller og oppfølging.'
  ]

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  
  fordeler.forEach(item => {
    const lines = doc.splitTextToSize(item, 160)
    doc.text('•', 20, yPos)
    doc.text(lines, 27, yPos)
    yPos += lines.length * 5
  })

  yPos += 10

  // Avslutning
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  const avslutning = 'Vi håper dere finner vårt tilbud interessant og takker for henvendelsen. Vi i BSV ser frem til et godt samarbeid og til å bistå dere med en trygg og brannsikker hverdag.'
  const avslutningLines = doc.splitTextToSize(avslutning, 170)
  doc.text(avslutningLines, 20, yPos)
  yPos += avslutningLines.length * 5 + 10

  // Avsluttende hilsen
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text('Med vennlig hilsen', 20, yPos)
  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Brannteknisk Service og Vedlikehold AS', 20, yPos)
  doc.setFont('helvetica', 'normal')

  yPos += 15

  // Signeringsfelt
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 102, 204)
  doc.text('GODKJENNING AV TILBUD', 22, yPos + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  
  yPos += 15

  // Two columns for signatures
  const leftCol = 20
  const rightCol = 110

  // Kunde signatur (venstre)
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'bold')
  doc.text('KUNDE', leftCol, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 8

  doc.text('Navn:', leftCol, yPos)
  doc.line(leftCol + 15, yPos, leftCol + 80, yPos)
  yPos += 10

  doc.text('Dato:', leftCol, yPos)
  doc.line(leftCol + 15, yPos, leftCol + 80, yPos)
  yPos += 10

  doc.text('Signatur:', leftCol, yPos)
  doc.line(leftCol + 20, yPos, leftCol + 80, yPos)

  // BSV Fire signatur (høyre)
  yPos -= 28 // Reset to same height as kunde
  doc.setFont('helvetica', 'bold')
  doc.text('BRANNTEKNISK SERVICE OG VEDLIKEHOLD AS', rightCol, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 8

  // Autofill name if available
  if (tilbudData.opprettet_av_navn) {
    doc.text('Navn:', rightCol, yPos)
    doc.text(tilbudData.opprettet_av_navn, rightCol + 15, yPos)
  } else {
    doc.text('Navn:', rightCol, yPos)
    doc.line(rightCol + 15, yPos, rightCol + 80, yPos)
  }
  yPos += 10

  // Autofill today's date
  const today = new Date().toLocaleDateString('nb-NO')
  doc.text('Dato:', rightCol, yPos)
  doc.text(today, rightCol + 15, yPos)
  yPos += 10

  doc.text('Signatur:', rightCol, yPos)
  doc.line(rightCol + 20, yPos, rightCol + 80, yPos)

  // Page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(`Side ${i} av ${pageCount}`, 105, 290, { align: 'center' })
  }

  return doc
}

export async function downloadTilbudPDF(tilbudData: TilbudData, filename?: string) {
  const doc = await generateTilbudPDF(tilbudData)
  const defaultFilename = `Tilbud_${tilbudData.kunde_navn.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename || defaultFilename)
}

export async function previewTilbudPDF(tilbudData: TilbudData) {
  const doc = await generateTilbudPDF(tilbudData)
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, '_blank')
}
