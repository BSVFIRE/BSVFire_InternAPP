import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'
import { 
  FileText, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  Building2,
  Loader2,
  RotateCcw
} from 'lucide-react'
import { ANLEGG_STATUSER, ANLEGG_STATUS_COLORS } from '@/lib/constants'

const log = createLogger('AdminAarsavslutning')

interface Anlegg {
  id: string
  kundenr: string
  anleggsnavn: string
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontroll_maaned: string | null
  kontroll_status: string | null
  kontroll_type: string[] | null
  skjult: boolean | null
  brannalarm_fullfort: boolean | null
  nodlys_fullfort: boolean | null
  slukkeutstyr_fullfort: boolean | null
  roykluker_fullfort: boolean | null
  ekstern_fullfort: boolean | null
}

interface Kunde {
  id: string
  navn: string
}

interface AarsStatistikk {
  utforteAnlegg: number
  brannalarmAnlegg: number
  nodlysAnlegg: number
  slukkeutstyrAnlegg: number
  royklukerAnlegg: number
  eksternAnlegg: number
  totalPris: number
  prisBrannalarm: number
  prisNodlys: number
  prisSlukkeutstyr: number
  prisRoykluker: number
  prisEkstern: number
  antallBrannslukkere: number
  antallBrannslanger: number
  antallNodlys: number
  antallRoykdetektorer: number
  antallManuelleMeldere: number
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 60,
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#0066cc',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    borderBottom: '1px solid #e0e0e0',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0066cc',
    marginTop: 15,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e0e0e0',
    padding: 6,
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e0e0e0',
    padding: 6,
    backgroundColor: '#f9f9f9',
  },
  tableCell: {
    fontSize: 8,
    color: '#333',
  },
  colAnlegg: { width: '25%' },
  colKunde: { width: '20%' },
  colAdresse: { width: '25%' },
  colMaaned: { width: '10%' },
  colStatus: { width: '12%' },
  colType: { width: '8%' },
  statusBadge: {
    fontSize: 7,
    padding: '2 4',
    borderRadius: 2,
  },
  statusIkkeUtfort: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  statusPlanlagt: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
  },
  statusUtsatt: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e0e0e0',
    paddingTop: 10,
    fontSize: 8,
    color: '#666',
  },
  footerText: {
    fontSize: 7,
    color: '#999',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#666',
  },
})

interface AarsavslutningPDFProps {
  anlegg: Anlegg[]
  kunder: Kunde[]
  year: number
  aarsStatistikk?: AarsStatistikk
}

function AarsavslutningPDFDocument({ anlegg, kunder, year, aarsStatistikk }: AarsavslutningPDFProps) {
  const getKundeNavn = (kundenr: string) => {
    const kunde = kunder.find(k => k.id === kundenr)
    return kunde?.navn || 'Ukjent kunde'
  }

  // Grupper etter status
  const ikkeUtfort = anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.IKKE_UTFORT)
  const planlagt = anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.PLANLAGT)
  const utsatt = anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.UTSATT)
  const blank = anlegg.filter(a => !a.kontroll_status || a.kontroll_status === '')

  // Funksjon for å dele opp anlegg i sider (ca 25 per side)
  const itemsPerPage = 25

  const renderTable = (items: Anlegg[], title: string, statusStyle: any) => {
    if (items.length === 0) return null

    const pages = []
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage))
    }

    return pages.map((pageItems, pageIndex) => (
      <Page key={`${title}-${pageIndex}`} size="A4" style={styles.page}>
        {pageIndex === 0 && (
          <Text style={styles.sectionTitle}>{title} ({items.length} anlegg)</Text>
        )}
        {pageIndex > 0 && (
          <Text style={[styles.sectionTitle, { fontSize: 10 }]}>{title} (fortsettelse)</Text>
        )}
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colAnlegg]}>Anlegg</Text>
            <Text style={[styles.tableHeaderText, styles.colKunde]}>Kunde</Text>
            <Text style={[styles.tableHeaderText, styles.colAdresse]}>Adresse</Text>
            <Text style={[styles.tableHeaderText, styles.colMaaned]}>Måned</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
            <Text style={[styles.tableHeaderText, styles.colType]}>Type</Text>
          </View>
          
          {pageItems.map((a, idx) => (
            <View key={a.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, styles.colAnlegg]}>{a.anleggsnavn}</Text>
              <Text style={[styles.tableCell, styles.colKunde]}>{getKundeNavn(a.kundenr)}</Text>
              <Text style={[styles.tableCell, styles.colAdresse]}>
                {a.adresse ? `${a.adresse}${a.poststed ? `, ${a.poststed}` : ''}` : '-'}
              </Text>
              <Text style={[styles.tableCell, styles.colMaaned]}>{a.kontroll_maaned || '-'}</Text>
              <Text style={[styles.tableCell, styles.colStatus, styles.statusBadge, statusStyle]}>
                {a.kontroll_status || 'Blank'}
              </Text>
              <Text style={[styles.tableCell, styles.colType]}>
                {a.kontroll_type?.length || 0}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Side ${pageNumber} av ${totalPages}`
        )} fixed />
      </Page>
    ))
  }

  return (
    <Document>
      {/* Forside */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={BSV_LOGO} style={styles.logo} />
          <Text style={styles.mainTitle}>Årsavslutning {year}</Text>
          <Text style={styles.subtitle}>
            Oversikt over anlegg som ikke er utført eller oppsagt
          </Text>
          <Text style={styles.subtitle}>
            Generert: {new Date().toLocaleDateString('nb-NO')} kl. {new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Statistikk */}
        <Text style={styles.sectionTitle}>Oppsummering</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Totalt anlegg i rapporten</Text>
            <Text style={styles.statValue}>{anlegg.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ikke utført</Text>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>{ikkeUtfort.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Planlagt</Text>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{planlagt.length}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Utsatt</Text>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{utsatt.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Blank (ingen status)</Text>
            <Text style={[styles.statValue, { color: '#666' }]}>{blank.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>&nbsp;</Text>
            <Text style={styles.statValue}>&nbsp;</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            BSV Fire AS | Org.nr: 921044879 | mail@bsvfire.no | 900 46 600
          </Text>
        </View>
      </Page>

      {/* Ikke utført */}
      {renderTable(ikkeUtfort, 'Ikke utført', styles.statusIkkeUtfort)}
      
      {/* Planlagt */}
      {renderTable(planlagt, 'Planlagt', styles.statusPlanlagt)}
      
      {/* Utsatt */}
      {renderTable(utsatt, 'Utsatt', styles.statusUtsatt)}
      
      {/* Blank */}
      {renderTable(blank, 'Blank (ingen status)', {})}

      {/* Årsoppsummering - siste side */}
      {aarsStatistikk && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Image src={BSV_LOGO} style={styles.logo} />
            <Text style={styles.mainTitle}>Årsoppsummering {year}</Text>
            <Text style={styles.subtitle}>
              Statistikk for utførte kontroller
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Utførte anlegg per fagområde */}
          <Text style={styles.sectionTitle}>Utførte kontroller per fagområde</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Totalt utførte anlegg</Text>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{aarsStatistikk.utforteAnlegg}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Brannalarm</Text>
              <Text style={styles.statValue}>{aarsStatistikk.brannalarmAnlegg}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Nødlys</Text>
              <Text style={styles.statValue}>{aarsStatistikk.nodlysAnlegg}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Slukkeutstyr</Text>
              <Text style={styles.statValue}>{aarsStatistikk.slukkeutstyrAnlegg}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Røykluker</Text>
              <Text style={styles.statValue}>{aarsStatistikk.royklukerAnlegg}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Ekstern</Text>
              <Text style={styles.statValue}>{aarsStatistikk.eksternAnlegg}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Priser */}
          <Text style={styles.sectionTitle}>Omsetning fra utførte kontroller</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.statLabel}>Total omsetning</Text>
              <Text style={[styles.statValue, { color: '#16a34a', fontSize: 20 }]}>
                {aarsStatistikk.totalPris.toLocaleString('nb-NO')} kr
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Brannalarm</Text>
              <Text style={styles.statValue}>{aarsStatistikk.prisBrannalarm.toLocaleString('nb-NO')} kr</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Nødlys</Text>
              <Text style={styles.statValue}>{aarsStatistikk.prisNodlys.toLocaleString('nb-NO')} kr</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Slukkeutstyr</Text>
              <Text style={styles.statValue}>{aarsStatistikk.prisSlukkeutstyr.toLocaleString('nb-NO')} kr</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Røykluker</Text>
              <Text style={styles.statValue}>{aarsStatistikk.prisRoykluker.toLocaleString('nb-NO')} kr</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Ekstern</Text>
              <Text style={styles.statValue}>{aarsStatistikk.prisEkstern.toLocaleString('nb-NO')} kr</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>&nbsp;</Text>
              <Text style={styles.statValue}>&nbsp;</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Antall enheter */}
          <Text style={styles.sectionTitle}>Totalt antall kontrollerte enheter</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Brannslukkere</Text>
              <Text style={styles.statValue}>{aarsStatistikk.antallBrannslukkere.toLocaleString('nb-NO')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Brannslanger</Text>
              <Text style={styles.statValue}>{aarsStatistikk.antallBrannslanger.toLocaleString('nb-NO')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Nødlys</Text>
              <Text style={styles.statValue}>{aarsStatistikk.antallNodlys.toLocaleString('nb-NO')}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Røykdetektorer</Text>
              <Text style={styles.statValue}>{aarsStatistikk.antallRoykdetektorer.toLocaleString('nb-NO')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Manuelle meldere</Text>
              <Text style={styles.statValue}>{aarsStatistikk.antallManuelleMeldere.toLocaleString('nb-NO')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>&nbsp;</Text>
              <Text style={styles.statValue}>&nbsp;</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              BSV Fire AS | Org.nr: 921044879 | mail@bsvfire.no | 900 46 600
            </Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

export function AdminAarsavslutning() {
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resettingOther, setResettingOther] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [anleggResponse, kunderResponse] = await Promise.all([
        supabase.from('anlegg').select('*').order('anleggsnavn', { ascending: true }),
        supabase.from('customer').select('id, navn')
      ])

      if (anleggResponse.error) throw new Error(anleggResponse.error.message)
      if (kunderResponse.error) throw new Error(kunderResponse.error.message)

      setAnlegg(anleggResponse.data || [])
      setKunder(kunderResponse.data || [])
    } catch (err) {
      log.error('Feil ved lasting av data', { error: err })
      setError(err instanceof Error ? err.message : 'Kunne ikke laste data')
    } finally {
      setLoading(false)
    }
  }

  // Filtrer anlegg som ikke er Utført eller Oppsagt (og ikke skjult)
  const anleggForPDF = anlegg.filter(a => 
    !a.skjult && 
    a.kontroll_status !== ANLEGG_STATUSER.UTFORT && 
    a.kontroll_status !== ANLEGG_STATUSER.OPPSAGT &&
    a.kontroll_maaned !== 'NA' // Ekskluder ikke-kontraktskunder
  )

  // Anlegg som er Utført (for reset)
  const utforteAnlegg = anlegg.filter(a => 
    !a.skjult && 
    a.kontroll_status === ANLEGG_STATUSER.UTFORT &&
    a.kontroll_maaned !== 'NA'
  )

  // Anlegg som er Utsatt, Ikke utført eller Planlagt (for separat reset)
  const andreStatusAnlegg = anlegg.filter(a => 
    !a.skjult && 
    a.kontroll_maaned !== 'NA' &&
    (a.kontroll_status === ANLEGG_STATUSER.UTSATT ||
     a.kontroll_status === ANLEGG_STATUSER.IKKE_UTFORT ||
     a.kontroll_status === ANLEGG_STATUSER.PLANLAGT)
  )

  // Statistikk
  const stats = {
    total: anlegg.filter(a => !a.skjult && a.kontroll_maaned !== 'NA').length,
    utfort: utforteAnlegg.length,
    ikkeUtfort: anlegg.filter(a => !a.skjult && a.kontroll_status === ANLEGG_STATUSER.IKKE_UTFORT).length,
    planlagt: anlegg.filter(a => !a.skjult && a.kontroll_status === ANLEGG_STATUSER.PLANLAGT).length,
    utsatt: anlegg.filter(a => !a.skjult && a.kontroll_status === ANLEGG_STATUSER.UTSATT).length,
    oppsagt: anlegg.filter(a => !a.skjult && a.kontroll_status === ANLEGG_STATUSER.OPPSAGT).length,
    blank: anlegg.filter(a => !a.skjult && (!a.kontroll_status || a.kontroll_status === '') && a.kontroll_maaned !== 'NA').length,
  }

  async function generatePDF() {
    try {
      setGenerating(true)
      setError(null)

      // Hent statistikk for utførte anlegg - kjør alle spørringer parallelt
      const utforteIds = utforteAnlegg.map(a => a.id)
      
      let aarsStatistikk: AarsStatistikk = {
        utforteAnlegg: utforteAnlegg.length,
        brannalarmAnlegg: utforteAnlegg.filter(a => a.brannalarm_fullfort).length,
        nodlysAnlegg: utforteAnlegg.filter(a => a.nodlys_fullfort).length,
        slukkeutstyrAnlegg: utforteAnlegg.filter(a => a.slukkeutstyr_fullfort).length,
        royklukerAnlegg: utforteAnlegg.filter(a => a.roykluker_fullfort).length,
        eksternAnlegg: utforteAnlegg.filter(a => a.ekstern_fullfort).length,
        prisBrannalarm: 0,
        prisNodlys: 0,
        prisSlukkeutstyr: 0,
        prisRoykluker: 0,
        prisEkstern: 0,
        totalPris: 0,
        antallBrannslukkere: 0,
        antallBrannslanger: 0,
        antallNodlys: 0,
        antallRoykdetektorer: 0,
        antallManuelleMeldere: 0,
      }

      // Kun hent ekstra data hvis det finnes utførte anlegg
      if (utforteIds.length > 0) {
        const utforteIdsSet = new Set(utforteIds)
        
        // Hent ALL data og filtrer lokalt (mye raskere enn .in() med mange IDs)
        const [priserRes, brannslukkereRes, brannslangerRes, nodlysRes, styringerRes] = await Promise.all([
          supabase.from('priser_kundenummer').select('anlegg_id, prisbrannalarm, prisnodlys, prisslukkeutstyr, prisroykluker, prisekstern'),
          supabase.from('anleggsdata_brannslukkere').select('anlegg_id'),
          supabase.from('anleggsdata_brannslanger').select('anlegg_id'),
          supabase.from('anleggsdata_nodlys').select('anlegg_id'),
          supabase.from('brannalarm_styringer').select('anlegg_id, rd_antall, mm_antall')
        ])

        // Filtrer lokalt
        const priserData = (priserRes.data || []).filter(p => utforteIdsSet.has(p.anlegg_id))
        const brannslukkereData = (brannslukkereRes.data || []).filter(b => utforteIdsSet.has(b.anlegg_id))
        const brannslangerData = (brannslangerRes.data || []).filter(b => utforteIdsSet.has(b.anlegg_id))
        const nodlysData = (nodlysRes.data || []).filter(n => utforteIdsSet.has(n.anlegg_id))
        const styringerData = (styringerRes.data || []).filter(s => utforteIdsSet.has(s.anlegg_id))

        aarsStatistikk = {
          ...aarsStatistikk,
          prisBrannalarm: priserData.reduce((sum, p) => sum + (p.prisbrannalarm || 0), 0),
          prisNodlys: priserData.reduce((sum, p) => sum + (p.prisnodlys || 0), 0),
          prisSlukkeutstyr: priserData.reduce((sum, p) => sum + (p.prisslukkeutstyr || 0), 0),
          prisRoykluker: priserData.reduce((sum, p) => sum + (p.prisroykluker || 0), 0),
          prisEkstern: priserData.reduce((sum, p) => sum + (p.prisekstern || 0), 0),
          totalPris: priserData.reduce((sum, p) => 
            sum + (p.prisbrannalarm || 0) + (p.prisnodlys || 0) + (p.prisslukkeutstyr || 0) + (p.prisroykluker || 0) + (p.prisekstern || 0), 0),
          antallBrannslukkere: brannslukkereData.length,
          antallBrannslanger: brannslangerData.length,
          antallNodlys: nodlysData.length,
          antallRoykdetektorer: styringerData.reduce((sum, s) => sum + (s.rd_antall || 0), 0),
          antallManuelleMeldere: styringerData.reduce((sum, s) => sum + (s.mm_antall || 0), 0),
        }
      }

      const blob = await pdf(
        <AarsavslutningPDFDocument 
          anlegg={anleggForPDF} 
          kunder={kunder} 
          year={currentYear}
          aarsStatistikk={aarsStatistikk}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Aarsavslutning_${currentYear}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      log.info('Årsavslutning PDF generert', { year: currentYear, anleggCount: anleggForPDF.length, aarsStatistikk })
      setSuccessMessage(`PDF generert med ${anleggForPDF.length} anlegg + årsoppsummering`)
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      log.error('Feil ved generering av PDF', { error: err })
      setError('Kunne ikke generere PDF')
    } finally {
      setGenerating(false)
    }
  }

  async function resetUtforteAnlegg() {
    if (!confirm(`Er du sikker på at du vil resette ${utforteAnlegg.length} anlegg fra "Utført" til blank status?\n\nDette vil også nullstille tjenestestatus (Brannalarm, Nødlys, Slukkeutstyr, Røykluker, Ekstern).\n\nDette kan ikke angres!`)) {
      return
    }

    try {
      setResetting(true)
      setError(null)

      const ids = utforteAnlegg.map(a => a.id)
      
      // Del opp i batches på 100 for å unngå Supabase-begrensninger
      const batchSize = 100
      let updatedCount = 0
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        const { error } = await supabase
          .from('anlegg')
          .update({ 
            kontroll_status: null,
            brannalarm_fullfort: false,
            nodlys_fullfort: false,
            slukkeutstyr_fullfort: false,
            roykluker_fullfort: false,
            ekstern_fullfort: false
          })
          .in('id', batch)

        if (error) throw error
        updatedCount += batch.length
        log.info(`Batch ${Math.floor(i / batchSize) + 1} fullført`, { count: batch.length, total: updatedCount })
      }

      log.info('Utførte anlegg resatt til blank', { count: ids.length })
      setSuccessMessage(`${ids.length} anlegg resatt til blank status (inkl. tjenestestatus)`)
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Last inn data på nytt
      await loadData()
    } catch (err) {
      log.error('Feil ved resetting av anlegg', { error: err })
      setError('Kunne ikke resette anlegg')
    } finally {
      setResetting(false)
    }
  }

  async function resetAndreStatusAnlegg() {
    const statusListe = []
    if (stats.ikkeUtfort > 0) statusListe.push(`Ikke utført (${stats.ikkeUtfort})`)
    if (stats.planlagt > 0) statusListe.push(`Planlagt (${stats.planlagt})`)
    if (stats.utsatt > 0) statusListe.push(`Utsatt (${stats.utsatt})`)

    if (!confirm(`Er du sikker på at du vil resette ${andreStatusAnlegg.length} anlegg til blank status?\n\nDette gjelder:\n${statusListe.join('\n')}\n\nTjenestestatus vil IKKE endres.\n\nDette kan ikke angres!`)) {
      return
    }

    try {
      setResettingOther(true)
      setError(null)

      const ids = andreStatusAnlegg.map(a => a.id)
      
      // Del opp i batches på 100 for å unngå Supabase-begrensninger
      const batchSize = 100
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        const { error } = await supabase
          .from('anlegg')
          .update({ kontroll_status: null })
          .in('id', batch)

        if (error) throw error
      }

      log.info('Andre status-anlegg resatt til blank', { count: ids.length })
      setSuccessMessage(`${ids.length} anlegg resatt til blank status`)
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Last inn data på nytt
      await loadData()
    } catch (err) {
      log.error('Feil ved resetting av andre anlegg', { error: err })
      setError('Kunne ikke resette anlegg')
    } finally {
      setResettingOther(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Laster data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Årsavslutning {currentYear}
          </h1>
          <p className="text-gray-400">
            Generer rapport og klargjør for nytt år
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Oppdater
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="card bg-green-900/20 border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-400">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Totalt</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Utført</p>
              <p className="text-xl font-bold text-green-500">{stats.utfort}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Ikke utført</p>
              <p className="text-xl font-bold text-red-500">{stats.ikkeUtfort}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Planlagt</p>
              <p className="text-xl font-bold text-blue-500">{stats.planlagt}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Utsatt</p>
              <p className="text-xl font-bold text-yellow-500">{stats.utsatt}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500/10 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Oppsagt</p>
              <p className="text-xl font-bold text-gray-500">{stats.oppsagt}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500/10 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Blank</p>
              <p className="text-xl font-bold text-gray-400">{stats.blank}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Rapport */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                1. Generer årsrapport (PDF)
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Lager en PDF med alle anlegg som <strong>ikke</strong> er satt til "Utført" eller "Oppsagt".
                Inkluderer anlegg med status: Ikke utført, Planlagt, Utsatt, eller blank.
              </p>
              <div className="bg-gray-100 dark:bg-dark-100 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>{anleggForPDF.length}</strong> anlegg vil inkluderes i rapporten
                </p>
              </div>
              <button
                onClick={generatePDF}
                disabled={generating || anleggForPDF.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Last ned PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Utførte */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <RotateCcw className="w-8 h-8 text-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                2. Resett "Utført" til blank
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Setter alle anlegg med status "Utført" tilbake til blank status for nytt år.
                Anlegg som er "Oppsagt" vil <strong>ikke</strong> endres.
              </p>
              <div className="bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  <strong>{utforteAnlegg.length}</strong> anlegg vil bli resatt
                </p>
              </div>
              <button
                onClick={resetUtforteAnlegg}
                disabled={resetting || utforteAnlegg.length === 0}
                className="btn-secondary flex items-center gap-2 text-orange-500 hover:text-orange-400 border-orange-500/30 hover:border-orange-500/50"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetter...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Resett til blank
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Andre Statuser */}
      <div className="card border-red-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              3. Resett andre statuser til blank (valgfritt)
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Setter anlegg med status "Utsatt", "Ikke utført" eller "Planlagt" tilbake til blank.
              <br />
              <strong className="text-red-400">OBS:</strong> Tjenestestatus (Brannalarm, Nødlys, etc.) vil <strong>ikke</strong> endres.
            </p>
            <div className="bg-red-100 dark:bg-red-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                <strong>{andreStatusAnlegg.length}</strong> anlegg vil bli resatt:
              </p>
              <ul className="text-xs text-red-500 dark:text-red-400 space-y-1">
                {stats.ikkeUtfort > 0 && <li>• Ikke utført: {stats.ikkeUtfort}</li>}
                {stats.planlagt > 0 && <li>• Planlagt: {stats.planlagt}</li>}
                {stats.utsatt > 0 && <li>• Utsatt: {stats.utsatt}</li>}
              </ul>
            </div>
            <button
              onClick={resetAndreStatusAnlegg}
              disabled={resettingOther || andreStatusAnlegg.length === 0}
              className="btn-secondary flex items-center gap-2 text-red-500 hover:text-red-400 border-red-500/30 hover:border-red-500/50"
            >
              {resettingOther ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetter...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Resett til blank
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Anlegg Liste Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Anlegg i årsrapport
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({anleggForPDF.length} anlegg)
            </span>
          </h2>
        </div>

        {anleggForPDF.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">
              Alle anlegg er enten utført eller oppsagt. Flott jobbet!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Kunde</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Måned</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {anleggForPDF.slice(0, 20).map((a) => (
                  <tr key={a.id} className="border-b border-gray-200 dark:border-gray-800">
                    <td className="py-3 px-4">
                      <p className="text-gray-900 dark:text-white font-medium">{a.anleggsnavn}</p>
                      {a.adresse && (
                        <p className="text-sm text-gray-400">{a.adresse}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {kunder.find(k => k.id === a.kundenr)?.navn || 'Ukjent'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {a.kontroll_maaned || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {a.kontroll_status ? (
                        <span className={`badge ${ANLEGG_STATUS_COLORS[a.kontroll_status] || 'badge-info'}`}>
                          {a.kontroll_status}
                        </span>
                      ) : (
                        <span className="text-gray-400">Blank</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {anleggForPDF.length > 20 && (
              <p className="text-center py-4 text-gray-400 text-sm">
                ...og {anleggForPDF.length - 20} flere anlegg
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
