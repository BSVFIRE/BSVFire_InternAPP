import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'

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
      {/* Side 1: Forside med informasjon */}
      <Page size="A4" style={styles.page}>
        {/* Logo */}
        <View style={styles.header}>
          <Image
            src={BSV_LOGO}
            style={styles.logo}
          />
          <View style={styles.divider} />
        </View>

        <Text style={styles.title}>Detektorliste</Text>
        <Text style={styles.subtitle}>Revisjon {revisjon}</Text>

        {/* Kunde og anlegg informasjon */}
        <View style={styles.infoSection}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
            Anleggsinformasjon
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kunde:</Text>
            <Text style={styles.infoValue}>{kundeNavn}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Anlegg:</Text>
            <Text style={styles.infoValue}>{anleggNavn}</Text>
          </View>
          {anleggAdresse && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse:</Text>
              <Text style={styles.infoValue}>{anleggAdresse}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Kontrollinformasjon */}
        <View style={styles.infoSection}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
            Kontrollinformasjon
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dato:</Text>
            <Text style={styles.infoValue}>
              {new Date(dato).toLocaleDateString('nb-NO')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Servicetekniker:</Text>
            <Text style={styles.infoValue}>{servicetekniker}</Text>
          </View>
          {kontaktperson && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kontaktperson:</Text>
              <Text style={styles.infoValue}>{kontaktperson}</Text>
            </View>
          )}
          {mobil && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobil:</Text>
              <Text style={styles.infoValue}>{mobil}</Text>
            </View>
          )}
          {epost && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-post:</Text>
              <Text style={styles.infoValue}>{epost}</Text>
            </View>
          )}
        </View>

        {annet && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoSection}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
                Merknader
              </Text>
              <Text style={styles.infoValue}>{annet}</Text>
            </View>
          </>
        )}

        {/* Oppsummering */}
        <View style={styles.divider} />
        <View style={styles.infoSection}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
            Oppsummering
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Antall enheter:</Text>
            <Text style={styles.infoValue}>{sortedDetektorer.length}</Text>
          </View>
          {Object.entries(typeSummary)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <View key={type} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{type}:</Text>
                <Text style={styles.infoValue}>{count}</Text>
              </View>
            ))}
        </View>

        <Text style={styles.footer}>
          BSV Fire - Detektorliste - Side 1
        </Text>
      </Page>

      {/* Side 2+: Detektorliste - Chunk per 25 rader for å sikre header på hver side */}
      {Array.from({ length: Math.ceil(sortedDetektorer.length / 25) }, (_, pageIndex) => {
        const startIndex = pageIndex * 25
        const endIndex = Math.min(startIndex + 25, sortedDetektorer.length)
        const pageDetektorer = sortedDetektorer.slice(startIndex, endIndex)
        
        return (
          <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                Detektorliste - {kundeNavn} - {anleggNavn}
              </Text>
              <Text style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
                Revisjon {revisjon} - {new Date(dato).toLocaleDateString('nb-NO')}
              </Text>
            </View>

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

            <Text
              style={styles.footer}
              render={({ pageNumber, totalPages }) =>
                `BSV Fire - Detektorliste - Side ${pageNumber} av ${totalPages}`
              }
              fixed
            />
          </Page>
        )
      })}
    </Document>
  )
}
