import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { Forside, Sidefot } from '@/lib/rapportPdfReact'

interface DetektorItem {
  adresse: string
  type: string
  plassering: string
  kart: string
  akse: string
  etasje: string
  kommentar: string
}

interface DetektorlistePDFProps {
  kundeNavn: string
  anleggNavn: string
  anleggAdresse?: string
  revisjon: string
  dato: string
  servicetekniker: string
  kontaktperson?: string
  mobil?: string
  epost?: string
  annet?: string
  detektorer: DetektorItem[]
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066cc',
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontWeight: 'bold',
    color: '#333',
  },
  infoValue: {
    flex: 1,
    color: '#666',
  },
  divider: {
    borderBottom: '2px solid #0066cc',
    marginVertical: 20,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e0e0e0',
    padding: 6,
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    padding: 6,
    fontSize: 9,
  },
  colAdresse: {
    width: '10%',
  },
  colType: {
    width: '18%',
  },
  colPlassering: {
    width: '25%',
  },
  colKart: {
    width: '10%',
  },
  colAkse: {
    width: '10%',
  },
  colEtasje: {
    width: '10%',
  },
  colKommentar: {
    width: '17%',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTop: '1px solid #e0e0e0',
    paddingTop: 10,
  },
})

export function DetektorlistePDF({
  kundeNavn,
  anleggNavn,
  anleggAdresse,
  revisjon,
  dato,
  servicetekniker,
  kontaktperson,
  mobil,
  epost,
  annet,
  detektorer,
}: DetektorlistePDFProps) {
  // Sorter detektorer etter adresse (numerisk)
  const sortedDetektorer = [...detektorer].sort((a, b) => {
    const numA = parseInt(a.adresse) || 0
    const numB = parseInt(b.adresse) || 0
    return numA - numB
  })

  // Beregn oppsummering av typer
  const typeSummary = sortedDetektorer.reduce((acc, detektor) => {
    const type = detektor.type || 'Ukjent'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Document>
      <Forside
        tittel="Adresseliste"
        anleggNavn={anleggNavn}
        undertittel={`Adresseliste for brannalarmanlegget, revisjon ${revisjon}.`}
        venstre={[
          { navn: 'Kunde', verdi: kundeNavn },
          { navn: 'Anlegg', verdi: anleggNavn },
          ...(anleggAdresse ? [{ navn: 'Adresse', verdi: anleggAdresse }] : []),
          ...(kontaktperson ? [{ navn: 'Kontaktperson', verdi: kontaktperson }] : []),
          ...(mobil ? [{ navn: 'Telefon', verdi: mobil }] : []),
          ...(epost ? [{ navn: 'E-post', verdi: epost }] : []),
        ]}
        hoyre={[
          { navn: 'Utført av', verdi: servicetekniker },
          { navn: 'Dato', verdi: new Date(dato).toLocaleDateString('nb-NO') },
          { navn: 'Revisjon', verdi: revisjon },
          { navn: 'Antall enheter', verdi: String(sortedDetektorer.length) },
        ]}
      />

      {/* Side 2+: Adresseliste - Chunk per 25 rader for å sikre header på hver side */}
      {Array.from({ length: Math.ceil(sortedDetektorer.length / 25) }, (_, pageIndex) => {
        const startIndex = pageIndex * 25
        const endIndex = Math.min(startIndex + 25, sortedDetektorer.length)
        const pageDetektorer = sortedDetektorer.slice(startIndex, endIndex)
        
        return (
          <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold' }}>
                Adresseliste – {anleggNavn}
              </Text>
              <Text style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
                Revisjon {revisjon} · {new Date(dato).toLocaleDateString('nb-NO')}
              </Text>
            </View>

            {/* Oppsummering og merknader sto på forsiden før; de hører til innholdet */}
            {pageIndex === 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>Oppsummering</Text>
                <Text style={{ fontSize: 9, color: '#333', marginBottom: 2 }}>
                  {sortedDetektorer.length} enheter totalt
                </Text>
                {Object.entries(typeSummary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <Text key={type} style={{ fontSize: 9, color: '#333' }}>{type}: {count}</Text>
                  ))}
                {annet ? (
                  <>
                    <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4 }}>Merknader</Text>
                    <Text style={{ fontSize: 9, color: '#333' }}>{annet}</Text>
                  </>
                ) : null}
              </View>
            )}

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.colAdresse}>Adresse</Text>
              <Text style={styles.colType}>Type</Text>
              <Text style={styles.colPlassering}>Plassering</Text>
              <Text style={styles.colKart}>Kart</Text>
              <Text style={styles.colAkse}>Akse</Text>
              <Text style={styles.colEtasje}>Etasje</Text>
              <Text style={styles.colKommentar}>Kommentar</Text>
            </View>

            {/* Table Rows */}
            {pageDetektorer.map((detektor, index) => {
              const globalIndex = startIndex + index
              return (
                <View
                  key={globalIndex}
                  style={globalIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={styles.colAdresse}>{detektor.adresse || ' '}</Text>
                  <Text style={styles.colType}>{detektor.type || ' '}</Text>
                  <Text style={styles.colPlassering}>{detektor.plassering || ' '}</Text>
                  <Text style={styles.colKart}>{detektor.kart || ' '}</Text>
                  <Text style={styles.colAkse}>{detektor.akse || ' '}</Text>
                  <Text style={styles.colEtasje}>{detektor.etasje || ' '}</Text>
                  <Text style={styles.colKommentar}>{detektor.kommentar || ' '}</Text>
                </View>
              )
            })}

            <Sidefot />
          </Page>
        )
      })}
    </Document>
  )
}
