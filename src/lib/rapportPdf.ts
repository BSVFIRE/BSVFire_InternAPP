/**
 * Felles utseende for rapportene som sendes til kunde (jsPDF).
 *
 * Alle kontrollrapporter skal se like ut: samme forside, samme sidefot, samme farger.
 * Det er dette kunden får i hånden, så det skal ikke variere fra modul til modul.
 *
 *   const doc = new jsPDF()
 *   await lagForside(doc, { tittel: 'Kontrollrapport nødlys', ... })
 *   // … innholdet ditt …
 *   settSidefot(doc)
 *
 * For rapporter bygget med @react-pdf/renderer, se `src/lib/rapportPdfReact.tsx`.
 */
import type jsPDF from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'

export const FIRMA = {
  navn: 'Brannteknisk Service og Vedlikehold AS',
  orgnr: '921 044 879',
  adresse: 'Sælenveien 44, 5151 Straumsgrend',
  telefon: '900 46 600',
  epost: 'mail@bsvfire.no',
  web: 'www.bsvfire.no',
}

/** Farger brukt i alle rapportene */
export const FARGE = {
  bla: [41, 128, 185] as [number, number, number],
  gronn: [214, 239, 220] as [number, number, number],
  rod: [250, 219, 216] as [number, number, number],
  gul: [252, 243, 207] as [number, number, number],
  gra: [240, 240, 240] as [number, number, number],
}

/** Venstre- og høyremarg i mm. Overskrifter, tabeller og sidefot bruker samme kant. */
export const MARG = 20
export const INNHOLDSBREDDE = 170

export interface Forsidedata {
  /** F.eks. «Kontrollrapport nødlys» */
  tittel: string
  anleggNavn: string
  kundeNavn: string
  kundeNummer?: string | null
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
  kontaktNavn?: string | null
  kontaktTelefon?: string | null
  tekniker?: string | null
  teknikerTelefon?: string | null
  teknikerEpost?: string | null
  /** F.eks. FG-sertifikatnummer – viktig dokumentasjon for kunden */
  teknikerSertifikat?: string | null
  kontaktEpost?: string | null
  dato?: Date
  /** Linjen rett under tittelen, f.eks. hvilken forskrift kontrollen er utført etter */
  undertittel?: string
  /** Når neste kontroll skal utføres. Vises framhevet – det er ofte det kunden ser etter. */
  nesteKontroll?: string
  /** Ekstra rader på høyre side av tabellen – opplysninger om selve kontrollen */
  ekstra?: [string, string][]
}

function norskDato(d: Date): string {
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Laster et bilde fra /public. Gir null i stedet for å kaste, så en manglende logo ikke velter PDF-en. */
async function lastBilde(sti: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image()
    img.src = sti
    await new Promise((ok, feil) => { img.onload = ok; img.onerror = feil; setTimeout(feil, 2000) })
    return img
  } catch {
    return null
  }
}

function sisteY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0
}

/**
 * Tegner forsiden: logo, tittel, anleggsnavn og en faktatabell.
 * Returnerer y-posisjonen under tabellen, i tilfelle du vil skrive mer på samme side.
 */
export async function lagForside(doc: jsPDF, d: Forsidedata): Promise<number> {
  const dato = d.dato ?? new Date()

  const logo = await lastBilde('/bsv-logo.png')
  if (logo) {
    doc.addImage(logo, 'PNG', MARG, 18, 45, 17)
  } else {
    doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(...FARGE.bla)
    doc.text('BSV FIRE', MARG, 30)
    doc.setTextColor(0)
  }

  doc.setFontSize(24).setFont('helvetica', 'bold').setTextColor(0)
  doc.text(d.tittel, MARG, 72)
  doc.setFontSize(14).setFont('helvetica', 'normal').setTextColor(80)
  doc.text(d.anleggNavn || '', MARG, 84)
  if (d.undertittel) {
    doc.setFontSize(10).setTextColor(110)
    doc.text(doc.splitTextToSize(d.undertittel, INNHOLDSBREDDE), MARG, 94)
  }
  doc.setTextColor(0)

  const adresse = [d.adresse, [d.postnummer, d.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  // Venstre side handler om kunden, høyre side om oss som har utført kontrollen
  const venstre: [string, string][] = [
    ['Kunde', d.kundeNavn || '-'],
    ['Kundenr.', d.kundeNummer || '-'],
    ['Anlegg', d.anleggNavn || '-'],
    ['Adresse', adresse || '-'],
  ]
  if (d.kontaktNavn || d.kontaktTelefon || d.kontaktEpost) {
    venstre.push(['Kontaktperson', d.kontaktNavn || '-'])
    if (d.kontaktTelefon) venstre.push(['Telefon', d.kontaktTelefon])
    if (d.kontaktEpost) venstre.push(['E-post', d.kontaktEpost])
  }

  const hoyre: [string, string][] = [['Kontrollør', d.tekniker || '-']]
  if (d.teknikerSertifikat) hoyre.push(['Sertifikat', d.teknikerSertifikat])
  if (d.teknikerTelefon) hoyre.push(['Telefon', d.teknikerTelefon])
  if (d.teknikerEpost) hoyre.push(['E-post', d.teknikerEpost])
  hoyre.push(['Kontrolldato', norskDato(dato)])
  for (const [navn, verdi] of d.ekstra ?? []) hoyre.push([navn, verdi || '-'])

  const rader: RowInput[] = []
  for (let i = 0; i < Math.max(venstre.length, hoyre.length); i++) {
    const v = venstre[i] ?? ['', '']
    const h = hoyre[i] ?? ['', '']
    rader.push([v[0], v[1], h[0], h[1]])
  }
  if (d.nesteKontroll) rader.push(['Neste kontroll', { content: d.nesteKontroll.toUpperCase(), colSpan: 3 }])

  // Bredde settes per kolonne, ikke per celle: ellers regner autoTable feil og kutter innhold
  autoTable(doc, {
    startY: 200,
    margin: { left: MARG, right: MARG },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: FARGE.bla, textColor: 255, fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold', fillColor: [246, 246, 246] },
      1: { cellWidth: 55 },
      2: { cellWidth: 30, fontStyle: 'bold', fillColor: [246, 246, 246] },
      3: { cellWidth: 55 },
    },
    head: [[{ content: 'Kunde og anlegg', colSpan: 2 }, { content: 'Kontrollen er utført av', colSpan: 2 }]],
    body: rader,
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const forste = (data.row.raw as unknown[])[0]
      // “Neste kontroll” framheves i gult, som i de gamle rapportene
      if (forste === 'Neste kontroll') {
        data.cell.styles.fillColor = [254, 249, 195]
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [146, 100, 0]
      } else if (!data.cell.text.join('')) {
        // Tomme felt skal ikke se ut som en ledetekst som mangler verdi
        data.cell.styles.fillColor = [255, 255, 255]
      }
    },
  })
  return sisteY(doc)
}

/**
 * Sidefot med firmaopplysninger og sidetall på alle sider. Kalles helt til slutt,
 * etter at alt innholdet er lagt inn – sidetallet trenger å vite hvor mange sider det ble.
 *
 * `merker` tegner FG- og Noralarm-logoen nederst på forsiden. Det gjelder bare
 * brannalarmkontrollene; på en førstehjelpsrapport ville de vært misvisende.
 */
export async function settSidefot(doc: jsPDF, valg: { merker?: boolean } = {}): Promise<void> {
  const fg = valg.merker ? await lastBilde('/fg_logo.png') : null
  const noralarm = valg.merker ? await lastBilde('/noralarm-logo.png') : null
  const sider = doc.getNumberOfPages()

  for (let i = 1; i <= sider; i++) {
    doc.setPage(i)
    // Målene hentes per side: nødlyslisten er liggende, resten stående
    const bredde = doc.internal.pageSize.getWidth()
    const y = doc.internal.pageSize.getHeight() - 20

    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.3)
    doc.line(MARG, y - 5, bredde - MARG, y - 5)

    doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(...FARGE.bla)
    doc.text(FIRMA.navn, MARG, y)
    doc.setFontSize(7.5).setFont('helvetica', 'normal').setTextColor(115)
    doc.text(`Org.nr ${FIRMA.orgnr} · ${FIRMA.adresse}`, MARG, y + 4)
    doc.text(`${FIRMA.telefon} · ${FIRMA.epost} · ${FIRMA.web}`, MARG, y + 8)

    doc.setFontSize(8).setTextColor(115)
    doc.text(`Side ${i} av ${sider}`, bredde - MARG, y, { align: 'right' })

    if (i === 1) {
      if (fg) {
        doc.addImage(fg, 'PNG', bredde - 70, y + 1, 10, 10)
        doc.setFontSize(5).setTextColor(115).text('FG-godkjent', bredde - 70, y)
      }
      if (noralarm) {
        doc.addImage(noralarm, 'PNG', bredde - 50, y + 1, 20, 10)
        doc.setFontSize(5).setTextColor(115).text('Medlem av', bredde - 50, y)
      }
    }
    doc.setTextColor(0)
  }
}

/** Filnavn uten norske tegn og mellomrom: Rapport_Nodlys_2026_Otta_Brygge.pdf */
export function rapportFilnavn(type: string, anleggNavn: string, dato = new Date()): string {
  const trygt = (t: string) => t
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[åÅ]/g, 'a')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  return `Rapport_${trygt(type)}_${dato.getFullYear()}_${trygt(anleggNavn || 'Anlegg')}.pdf`
}
