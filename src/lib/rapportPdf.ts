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
import autoTable from 'jspdf-autotable'

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

export const MARG = 15
export const INNHOLDSBREDDE = 180

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
  /** F.eks. FG-sertifikatnummer – viktig dokumentasjon for kunden */
  teknikerSertifikat?: string | null
  kontaktEpost?: string | null
  dato?: Date
  /** Linjen rett under tittelen, f.eks. hvilken forskrift kontrollen er utført etter */
  undertittel?: string
  /** Når neste kontroll skal utføres. Vises framhevet – det er ofte det kunden ser etter. */
  nesteKontroll?: string
  /** Ekstra rader nederst i tabellen, f.eks. «Standard: NS 3960» */
  ekstra?: [string, string][]
}

function norskDato(d: Date): string {
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

  try {
    const logo = new Image()
    logo.src = '/bsv-logo.png'
    await new Promise((ok, feil) => { logo.onload = ok; logo.onerror = feil })
    doc.addImage(logo, 'PNG', MARG, 18, 45, 17)
  } catch {
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
  const rader: string[][] = [
    ['Kunde', d.kundeNavn || '-', 'Kundenr.', d.kundeNummer || '-'],
    ['Anlegg', d.anleggNavn || '-', 'Dato', norskDato(dato)],
    ['Adresse', adresse || '-', 'Utført av', d.tekniker || '-'],
  ]
  if (d.teknikerSertifikat) rader.push(['Sertifikat', d.teknikerSertifikat, 'Telefon', d.teknikerTelefon || '-'])
  if (d.kontaktNavn || d.kontaktTelefon || d.kontaktEpost) {
    rader.push(['Kontaktperson', d.kontaktNavn || '-', 'Telefon', d.kontaktTelefon || '-'])
    if (d.kontaktEpost) rader.push(['E-post', d.kontaktEpost, '', ''])
  }
  if (d.nesteKontroll) rader.push(['Neste kontroll', d.nesteKontroll.toUpperCase(), '', ''])
  for (const [navn, verdi] of d.ekstra ?? []) rader.push([navn, verdi || '-', '', ''])

  // Bredde settes per kolonne, ikke per celle: ellers regner autoTable feil og kutter innhold
  autoTable(doc, {
    startY: 200,
    margin: { left: MARG, right: MARG },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold', fillColor: [246, 246, 246] },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, fontStyle: 'bold', fillColor: [246, 246, 246] },
      3: { cellWidth: 60 },
    },
    body: rader,
    // “Neste kontroll” framheves i gult, som i de gamle rapportene
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.raw && (data.row.raw as string[])[0] === 'Neste kontroll') {
        data.cell.styles.fillColor = [254, 249, 195]
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [146, 100, 0]
      }
    },
  })
  return sisteY(doc)
}

/**
 * Sidefot med firmaopplysninger og sidetall på alle sider. Kalles helt til slutt,
 * etter at alt innholdet er lagt inn.
 */
export function settSidefot(doc: jsPDF): void {
  const sider = doc.getNumberOfPages()
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i)
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(130)
    doc.text(`${FIRMA.navn} · ${FIRMA.adresse} · ${FIRMA.telefon} · ${FIRMA.epost}`, MARG, 288)
    doc.text(`Side ${i} av ${sider}`, MARG + INNHOLDSBREDDE, 288, { align: 'right' })
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
