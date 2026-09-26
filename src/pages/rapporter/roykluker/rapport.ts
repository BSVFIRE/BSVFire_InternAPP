/**
 * Kontrollrapport for røykventilasjon.
 *
 * Bygget opp som bransjens rapporter (jf. Firesafe): forside, et sammendrag med omfang,
 * tilstand per plassering, avvik, anbefalinger og byttet utstyr – og deretter én side per sentral.
 *
 * Omfanget regnes ut fra sentralene, ikke skrives inn manuelt. Avviks- og anbefalingslistene
 * kommer fra sjekkpunktene, der «Avvik» = må utbedres og «Anbefaling» = bør utbedres.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FARGE, MARG, lagForside, rapportFilnavn, settSidefot } from '@/lib/rapportPdf'
import { punkterFor, relevanteFunn, tilstandFor, type Krets, type Luke, type Sentral } from './typer'

export interface RapportData {
  kundeNavn: string
  kundeNummer: string | null
  anleggNavn: string
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontaktNavn: string | null
  kontaktTelefon: string | null
  kontaktEpost: string | null
  tekniker: string | null
  kontrolldato: Date
  sentraler: Sentral[]
  luker: Luke[]
  kommentarer: string[]
}

const { bla: BLA, gra: GRA, gronn: GRONN, rod: ROD, gul: GUL } = FARGE


/** Teller opp sentraltyper, motortyper og luketyper på tvers av anlegget */
function omfang(sentraler: Sentral[], luker: Luke[]): string[] {
  const tell = (par: [string, number][]) => {
    const m = new Map<string, number>()
    for (const [navn, antall] of par) {
      if (!navn?.trim()) continue
      m.set(navn.trim(), (m.get(navn.trim()) ?? 0) + (antall || 0))
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb-NO'))
  }
  const linjer: string[] = []
  for (const [navn, n] of tell(sentraler.map(s => [s.sentral_produsent || s.anlegg_type || 'Sentral', 1]))) linjer.push(`Sentral: ${navn}, antall: ${n}`)
  for (const [navn, n] of tell(sentraler.map(s => [s.motor_type ?? '', s.motor_antall ?? 0]))) linjer.push(`Motor: ${navn}, antall: ${n}`)
  const lukeRader: [string, number][] = [
    ...sentraler.map(s => [s.roykluke_type ?? '', s.roykluke_antall ?? 0] as [string, number]),
    ...luker.map(l => [l.luke_type ?? '', 1] as [string, number]),
  ]
  for (const [navn, n] of tell(lukeRader)) linjer.push(`Luke: ${navn}, antall: ${n}`)
  return linjer
}

function janei(v: boolean | string | null | undefined): 'Ja' | 'Nei' | '' {
  if (v === true || v === 'Ja') return 'Ja'
  if (v === false || v === 'Nei') return 'Nei'
  return ''
}

export async function lagRoyklukeRapport(d: RapportData): Promise<{ blob: Blob; fileName: string }> {
  const doc = new jsPDF()
  const nesteKontroll = new Date(d.kontrolldato)
  nesteKontroll.setFullYear(nesteKontroll.getFullYear() + 1)
  const sentraler = [...d.sentraler].sort((a, b) => (a.sentral_nr ?? 999) - (b.sentral_nr ?? 999))

  await lagForside(doc, {
    tittel: 'Kontrollrapport røykventilasjon',
    anleggNavn: d.anleggNavn,
    kundeNavn: d.kundeNavn,
    kundeNummer: d.kundeNummer,
    adresse: d.adresse,
    postnummer: d.postnummer,
    poststed: d.poststed,
    kontaktNavn: d.kontaktNavn,
    kontaktTelefon: d.kontaktTelefon,
    tekniker: d.tekniker,
    kontaktEpost: d.kontaktEpost,
    dato: d.kontrolldato,
    undertittel: 'Kontrollen er utført i henhold til gjeldende forebyggendeforskrift (FOB).',
    nesteKontroll: nesteKontroll.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }),
  })
  let y = 20

  // ---------- Sammendrag ----------
  doc.addPage()
  y = 20
  doc.setFontSize(14).setFont('helvetica', 'bold').text('Sammendrag', MARG, y)
  y += 6

  const omfangLinjer = omfang(sentraler, d.luker)
  if (omfangLinjer.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARG, right: MARG },
      theme: 'grid',
      head: [['Omfang']],
      headStyles: { fillColor: BLA, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      body: omfangLinjer.map(l => [l]),
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // Tilstand per plassering, fargelagt som i bransjerapportene
  autoTable(doc, {
    startY: y,
    margin: { left: MARG, right: MARG },
    theme: 'grid',
    head: [['Plassering', 'I forskriftsmessig stand', 'Anbefalte utbedringer', 'Merknad']],
    headStyles: { fillColor: BLA, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 32, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 'auto' } },
    body: sentraler.map(s => {
      const ok = janei(s.kontroll_forskriftsmessig)
      const anb = (s.kontroll_anbefalte_utbedringer ?? '').trim() ? 'Ja' : 'Nei'
      return [s.plassering || `Sentral ${s.sentral_nr ?? ''}`.trim(), ok || '-', anb, s.anleggsinfo ?? '']
    }),
    didParseCell: (data) => {
      if (data.section !== 'body') return
      if (data.column.index === 1) data.cell.styles.fillColor = data.cell.text[0] === 'Ja' ? GRONN : data.cell.text[0] === 'Nei' ? ROD : GRA
      if (data.column.index === 2 && data.cell.text[0] === 'Ja') data.cell.styles.fillColor = GUL
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Avvik og anbefalinger, hentet fra sjekkpunktene
  const funn = (tilstand: 'Avvik' | 'Anbefaling') => sentraler.flatMap(s =>
    relevanteFunn(s, tilstand)
      .map(p => [s.plassering || `Sentral ${s.sentral_nr ?? ''}`.trim(), tilstand, p.punkt, p.merknad || '']))

  for (const [tittel, tilstand, farge] of [
    ['Avvik – må utbedres', 'Avvik', ROD],
    ['Anbefalinger – bør utbedres', 'Anbefaling', GUL],
  ] as const) {
    const rader = funn(tilstand)
    if (rader.length === 0) continue
    if (y > 240) { doc.addPage(); y = 20 }
    autoTable(doc, {
      startY: y,
      margin: { left: MARG, right: MARG },
      theme: 'grid',
      head: [[tittel, 'Status', 'Type', 'Melding']],
      headStyles: { fillColor: BLA, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 22 }, 2: { cellWidth: 30 }, 3: { cellWidth: 'auto' } },
      body: rader,
      didParseCell: (data) => { if (data.section === 'body' && data.column.index === 1) data.cell.styles.fillColor = farge },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // Byttet utstyr samlet
  const utstyr = sentraler.flatMap(s => (s.byttet_utstyr_liste ?? []).filter(u => u.materiell?.trim())
    .map(u => [s.plassering || `Sentral ${s.sentral_nr ?? ''}`.trim(), u.materiell, String(u.antall ?? '')]))
  if (utstyr.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    autoTable(doc, {
      startY: y,
      margin: { left: MARG, right: MARG },
      theme: 'grid',
      head: [['Plassering', 'Byttet utstyr', 'Antall']],
      headStyles: { fillColor: BLA, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: { 2: { cellWidth: 20, halign: 'right' } },
      body: utstyr,
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  if (d.kommentarer.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    autoTable(doc, {
      startY: y,
      margin: { left: MARG, right: MARG },
      theme: 'grid',
      head: [['Kommentarer']],
      headStyles: { fillColor: BLA, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      body: d.kommentarer.map(k => [k]),
    })
  }

  // ---------- Én side per sentral ----------
  for (const s of sentraler) {
    doc.addPage()
    y = 20
    const mine = d.luker.filter(l => l.sentral_id === s.id)

    autoTable(doc, {
      startY: y,
      margin: { left: MARG, right: MARG },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      body: [[
        { content: 'Plassering', styles: { fontStyle: 'bold' as const, cellWidth: 28 } }, s.plassering || '-',
        { content: 'Anleggstype', styles: { fontStyle: 'bold' as const, cellWidth: 28 } }, s.anlegg_type || '-',
      ]],
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

    const seksjon = (head: string[][], body: (string | number)[][], kolonner?: Record<number, { cellWidth: number }>) => {
      if (body.length === 0) return
      if (y > 250) { doc.addPage(); y = 20 }
      autoTable(doc, {
        startY: y, margin: { left: MARG, right: MARG }, theme: 'grid',
        head, headStyles: { fillColor: BLA, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: kolonner,
        body,
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
    }

    seksjon([['Sentral', 'Signaltype']], [[s.sentral_produsent || '-', s.signaltype || '-']])
    if (s.motor_type || s.motor_antall) seksjon([['Motortype', 'Antall']], [[s.motor_type || '-', s.motor_antall ?? '-']], { 1: { cellWidth: 25 } })
    if (s.roykluke_type || s.roykluke_antall || mine.length) {
      const rader: (string | number)[][] = []
      if (s.roykluke_type || s.roykluke_antall) rader.push([s.roykluke_type || '-', s.roykluke_luketype || '-', s.roykluke_storrelse || '-', s.roykluke_antall ?? '-', s.roykluke_merknad || ''])
      for (const l of mine) rader.push([l.luke_type || '-', l.plassering || '-', '', 1, [l.status, l.skader].filter(Boolean).join(' – ')])
      seksjon([[s.anlegg_type === 'Branngardin' ? 'Branngardin' : 'Luke', 'Luketype / plassering', 'Størrelse', 'Antall', 'Merknad']], rader, { 3: { cellWidth: 18 } })
    }
    if (s.batteri_type || s.batteri_spenning || s.ladespenning || s.batteri_alder) {
      seksjon([['Batteritype', 'Batterispenning', 'Ladespenning', 'Batteri årstall']],
        [[s.batteri_type || '-', s.batteri_spenning || s.batteri_v || '-', s.ladespenning || '-', s.batteri_alder ?? '-']])
    }
    const kretser: Krets[] = s.kretser ?? []
    if (kretser.length > 0) {
      seksjon([['Krets', 'Aktiveringsspenning', 'Hvilespenning', 'Motstand']],
        kretser.map((k, i) => [k.nr || String(i + 1), k.aktivering || '-', k.hvile || '-', k.motstand || '-']), { 0: { cellWidth: 18 } })
    }

    const punkter = punkterFor(s).map(p => {
      const sp = tilstandFor(s, p)
      return [p, sp.tilstand || '-', sp.merknad || '']
    }).filter(r => r[1] !== '-' || r[2])
    if (punkter.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      autoTable(doc, {
        startY: y, margin: { left: MARG, right: MARG }, theme: 'grid',
        head: [['Sjekkpunkt', 'Tilstand', 'Merknad']],
        headStyles: { fillColor: BLA, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 25 } },
        body: punkter,
        didParseCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 1) return
          const t = data.cell.text[0]
          if (t === 'Ok') data.cell.styles.fillColor = GRONN
          else if (t === 'Avvik') data.cell.styles.fillColor = ROD
          else if (t === 'Anbefaling') data.cell.styles.fillColor = GUL
        },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
    }

    seksjon([['Kontroll', 'Status', 'Merknad']], [
      ['Funksjonstestet anlegg', janei(s.funksjonsteste) || '-', ''],
      ['Er anlegget i forskriftsmessig stand', janei(s.kontroll_forskriftsmessig) || '-', s.anleggsinfo ?? ''],
      ['Anbefalte utbedringer', (s.kontroll_anbefalte_utbedringer ?? '').trim() ? 'Ja' : 'Nei', s.kontroll_anbefalte_utbedringer ?? ''],
    ], { 0: { cellWidth: 60 }, 1: { cellWidth: 22 } })

    const eget = (s.byttet_utstyr_liste ?? []).filter(u => u.materiell?.trim())
    if (eget.length > 0) seksjon([['Byttet utstyr', 'Antall']], eget.map(u => [u.materiell, u.antall ?? '']), { 1: { cellWidth: 20 } })
  }

  settSidefot(doc)

  const fileName = rapportFilnavn('Roykluker', d.anleggNavn, d.kontrolldato)
  return { blob: doc.output('blob'), fileName }
}
