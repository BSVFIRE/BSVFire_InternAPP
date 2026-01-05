import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Mottaker {
  navn: string
  telefon: string
  epost: string
}

interface AlarmoverforingPDFData {
  // Kunde/Anlegg info
  kunde_navn: string
  kunde_organisasjonsnummer?: string
  anlegg_navn: string
  anlegg_adresse?: string
  anlegg_postnummer?: string
  anlegg_poststed?: string
  
  // Alarm info
  alarm_type: string
  beskrivelse?: string
  
  // Priser
  fast_pris: number
  inkluderer_simkort: boolean
  simkort_pris: number
  rabatt_prosent: number
  rabatt_belop: number
  pris_eks_mva: number
  mva_belop: number
  pris_ink_mva: number
  fakturering: 'kvartal' | 'aar'
  
  // Mottakere
  mottakere: Mottaker[]
  
  // Metadata
  opprettet: string
  tilbudsnummer?: string
  opprettet_av_navn?: string
}

const VEKTER_UTRYKNING_PRIS = 1950

export async function generateAlarmoverforingPDF(data: AlarmoverforingPDFData) {
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
  doc.setTextColor(220, 53, 69) // Rød farge for alarm
  doc.text('TILBUD ALARMOVERFØRING 24/7', 20, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  
  yPos += 20

  // Tilbudsnummer og dato
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  if (data.tilbudsnummer) {
    doc.text(`Tilbudsnummer: ${data.tilbudsnummer}`, 20, yPos)
    yPos += 6
  }
  doc.text(`Dato: ${new Date(data.opprettet).toLocaleDateString('nb-NO')}`, 20, yPos)
  yPos += 6
  doc.text(`Gyldig til: ${new Date(new Date(data.opprettet).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('nb-NO')}`, 20, yPos)
  
  yPos += 12

  // Customer section
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('KUNDE', 22, yPos + 5.5)
  
  yPos += 12
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(data.kunde_navn, 20, yPos)
  yPos += 5
  
  if (data.kunde_organisasjonsnummer) {
    doc.text(`Org.nr: ${data.kunde_organisasjonsnummer}`, 20, yPos)
    yPos += 5
  }
  
  yPos += 5

  // Anlegg section
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('ANLEGG', 22, yPos + 5.5)
  
  yPos += 12
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(data.anlegg_navn, 20, yPos)
  yPos += 5
  
  if (data.anlegg_adresse) {
    const adresse = [data.anlegg_adresse, data.anlegg_postnummer, data.anlegg_poststed]
      .filter(Boolean)
      .join(', ')
    doc.text(adresse, 20, yPos)
    yPos += 5
  }
  
  yPos += 5

  // Alarm info section
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('ALARMOVERFØRING', 22, yPos + 5.5)
  
  yPos += 12
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`Alarmtype: ${data.alarm_type}`, 20, yPos)
  yPos += 5
  
  if (data.beskrivelse) {
    const beskLines = doc.splitTextToSize(data.beskrivelse, 160)
    doc.text(beskLines, 20, yPos)
    yPos += beskLines.length * 5
  }
  
  yPos += 8

  // Tjenester tabell
  const tableData: any[] = [
    ['Alarmoverføring 24/7 til godkjent alarmstasjon', `${data.fast_pris} kr/mnd`]
  ]
  
  if (data.inkluderer_simkort) {
    tableData.push(['Simkort for alarmoverføring', `${data.simkort_pris} kr/mnd`])
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Tjeneste', 'Pris eks. mva']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 53, 69],
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

  // Prissammendrag
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  
  const basispris = data.fast_pris + (data.inkluderer_simkort ? data.simkort_pris : 0)
  doc.text('Sum per måned:', 130, yPos)
  doc.text(`${basispris} kr`, 190, yPos, { align: 'right' })
  yPos += 7

  if (data.rabatt_prosent > 0) {
    doc.setTextColor(0, 150, 0)
    doc.text(`Rabatt (${data.rabatt_prosent}%):`, 130, yPos)
    doc.text(`-${data.rabatt_belop.toFixed(0)} kr`, 190, yPos, { align: 'right' })
    yPos += 7
    doc.setTextColor(60, 60, 60)
  }

  doc.text('Pris eks. mva/mnd:', 130, yPos)
  doc.text(`${data.pris_eks_mva.toFixed(0)} kr`, 190, yPos, { align: 'right' })
  yPos += 7

  doc.text('MVA (25%):', 130, yPos)
  doc.text(`${data.mva_belop.toFixed(0)} kr`, 190, yPos, { align: 'right' })
  yPos += 10

  // Total
  doc.setFontSize(14)
  doc.setTextColor(220, 53, 69)
  doc.text('TOTALT/MND:', 130, yPos)
  doc.text(`${data.pris_ink_mva.toFixed(0)} kr`, 190, yPos, { align: 'right' })
  yPos += 10

  // Fakturering
  doc.setFontSize(12)
  doc.setTextColor(0, 102, 204)
  const faktureringTekst = data.fakturering === 'kvartal' 
    ? `Faktureres kvartalsvis: ${(data.pris_ink_mva * 3).toFixed(0)} kr ink. mva`
    : `Faktureres årlig: ${(data.pris_ink_mva * 12).toFixed(0)} kr ink. mva`
  doc.text(faktureringTekst, 130, yPos)
  
  yPos += 15

  // Vekterutrykning info
  doc.setFillColor(255, 243, 224)
  doc.rect(20, yPos, 170, 12, 'F')
  doc.setFontSize(10)
  doc.setTextColor(180, 83, 9)
  doc.text(`Vekterutrykning: Fastpris ${VEKTER_UTRYKNING_PRIS} kr eks. mva. Faktureres separat ved utrykning.`, 25, yPos + 7.5)
  
  yPos += 18

  // Vilkår på side 1
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Vilkår:', 20, yPos)
  yPos += 5
  
  const vilkar = [
    '• Avtalen løper fra oppstartsdato og fornyes automatisk årlig.',
    '• 3 måneders oppsigelsestid.',
    '• Priser indeksreguleres årlig.',
    '• Tilbudet er gyldig i 30 dager fra dato.'
  ]
  
  vilkar.forEach(v => {
    doc.text(v, 20, yPos)
    yPos += 4
  })

  // PAGE 2 - Mottakere og Signeringsfelt
  doc.addPage()
  yPos = 20

  // Mottakere section - alltid på side 2
  if (data.mottakere && data.mottakere.length > 0) {
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos, 170, 8, 'F')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('ALARMMOTTAKERE', 22, yPos + 5.5)
    
    yPos += 12

    const mottakerData = data.mottakere.map((m, i) => [
      `${i + 1}`,
      m.navn,
      m.telefon || '-',
      m.epost || '-'
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Navn', 'Telefon', 'E-post']],
      body: mottakerData,
      theme: 'grid',
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        3: { cellWidth: 70 }
      },
      margin: { left: 20, right: 20 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15
  }

  // Avslutning
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  const avslutning = 'Brannteknisk Service og Vedlikehold AS har valgt å inngå avtale med Alarm 24 for å kunne tilby våre kunder alarmstasjon med 24 timers beredskap. Alarm 24 AS er godkjente som alarmstasjon iht. Norsk Standard EN50518.'
  const avslutningLines = doc.splitTextToSize(avslutning, 170)
  doc.text(avslutningLines, 20, yPos)
  yPos += avslutningLines.length * 5 + 15

  // Avsluttende hilsen
  doc.text('Med vennlig hilsen', 20, yPos)
  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Brannteknisk Service og Vedlikehold AS', 20, yPos)
  doc.setFont('helvetica', 'normal')

  yPos += 20

  // Signeringsfelt
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPos, 170, 8, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(220, 53, 69)
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
  yPos -= 28
  doc.setFont('helvetica', 'bold')
  doc.text('BSV FIRE', rightCol, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 8

  if (data.opprettet_av_navn) {
    doc.text('Navn:', rightCol, yPos)
    doc.text(data.opprettet_av_navn, rightCol + 15, yPos)
  } else {
    doc.text('Navn:', rightCol, yPos)
    doc.line(rightCol + 15, yPos, rightCol + 80, yPos)
  }
  yPos += 10

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

export async function downloadAlarmoverforingPDF(data: AlarmoverforingPDFData, filename?: string) {
  const doc = await generateAlarmoverforingPDF(data)
  const defaultFilename = `Tilbud_Alarmoverforing_${data.kunde_navn.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename || defaultFilename)
}

export async function getAlarmoverforingPDFBlob(data: AlarmoverforingPDFData): Promise<Blob> {
  const doc = await generateAlarmoverforingPDF(data)
  return doc.output('blob')
}

export async function previewAlarmoverforingPDF(data: AlarmoverforingPDFData) {
  const doc = await generateAlarmoverforingPDF(data)
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, '_blank')
}
