import { useState } from 'react'
import { X, Download, Save } from 'lucide-react'
import { PDFViewer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'
import { generateAlarmorganiseringPDF } from './AlarmorganiseringPDF'

interface AlarmorganiseringPreviewProps {
  data: any
  onClose: () => void
}

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
    width: 200,
    height: 80,
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0066cc',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  infoSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    width: 100,
    fontWeight: 'bold',
    color: '#333',
    fontSize: 9,
  },
  infoValue: {
    flex: 1,
    color: '#666',
    fontSize: 9,
  },
  divider: {
    borderBottom: '2px solid #0066cc',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#0066cc',
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    color: '#333',
  },
  text: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#333',
    marginBottom: 8,
  },
  alarmBox: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderLeft: '3px solid #ffc107',
    borderRadius: 3,
  },
  alarmTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  styringBox: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#e7f3ff',
    borderRadius: 3,
  },
  styringHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 4,
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
  footerCompany: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#0066cc',
  },
  footerInfo: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#666',
  },
})

function AlarmorganiseringPDFDocument({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={BSV_LOGO} style={styles.logo} />
          <Text style={styles.mainTitle}>Alarmorganisering</Text>
          <Text style={styles.subtitle}>Revisjon {data.revisjon} - {new Date(data.dato).toLocaleDateString('nb-NO')}</Text>
        </View>

        <View style={styles.infoSection}>
          {data.kunde_navn && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kunde:</Text>
              <Text style={styles.infoValue}>{data.kunde_navn}</Text>
            </View>
          )}
          {data.anlegg_navn && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Anlegg:</Text>
              <Text style={styles.infoValue}>{data.anlegg_navn}</Text>
            </View>
          )}
          {data.kundeadresse && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse:</Text>
              <Text style={styles.infoValue}>{data.kundeadresse}</Text>
            </View>
          )}
          {data.kontakt_person && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kontaktperson:</Text>
              <Text style={styles.infoValue}>{data.kontakt_person}</Text>
            </View>
          )}
          {data.mobil && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobil:</Text>
              <Text style={styles.infoValue}>{data.mobil}</Text>
            </View>
          )}
          {data.e_post && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-post:</Text>
              <Text style={styles.infoValue}>{data.e_post}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Ingeniør:</Text>
            <Text style={styles.infoValue}>{data.service_ingeniør}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>1. Deteksjon</Text>
        {data.detektortyper && (
          <View>
            <Text style={styles.subsectionTitle}>Detektortyper:</Text>
            <Text style={styles.text}>{data.detektortyper}</Text>
          </View>
        )}
        {data.detektorplassering && (
          <View>
            <Text style={styles.subsectionTitle}>Detektorplassering:</Text>
            <Text style={styles.text}>{data.detektorplassering}</Text>
          </View>
        )}
        {data.alarmnivaa_forvarsel && (
          <View style={styles.alarmBox}>
            <Text style={styles.alarmTitle}>Alarmnivå - Forvarsel</Text>
            <Text style={styles.text}>{data.alarmnivaa_forvarsel}</Text>
          </View>
        )}
        {data.alarmnivaa_stille && (
          <View style={styles.alarmBox}>
            <Text style={styles.alarmTitle}>Alarmnivå - Stille alarm</Text>
            <Text style={styles.text}>{data.alarmnivaa_stille}</Text>
          </View>
        )}
        {data.alarmnivaa_stor && (
          <View style={styles.alarmBox}>
            <Text style={styles.alarmTitle}>Alarmnivå - Stor alarm</Text>
            <Text style={styles.text}>{data.alarmnivaa_stor}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerCompany}>Brannteknisk Service og Vedlikehold AS</Text>
          <Text style={styles.footerInfo}>
            Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600
          </Text>
          <Text style={styles.footerInfo}>
            Adresse: Sælenveien 44, 5151 Straumsgrend
          </Text>
          <Text style={{ fontSize: 7, color: '#999', marginTop: 5 }}>
            Generert: {new Date().toLocaleDateString('nb-NO')} {new Date().toLocaleTimeString('nb-NO')}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>2. Melding</Text>
        {data.hvem_faar_melding && (
          <View>
            <Text style={styles.subsectionTitle}>Hvem får melding:</Text>
            <Text style={styles.text}>{data.hvem_faar_melding}</Text>
          </View>
        )}
        {data.hvordan_melding_mottas && (
          <View>
            <Text style={styles.subsectionTitle}>Hvordan melding mottas:</Text>
            <Text style={styles.text}>{data.hvordan_melding_mottas}</Text>
          </View>
        )}
        {data.verifikasjonsmetoder && (
          <View>
            <Text style={styles.subsectionTitle}>Verifikasjonsmetoder:</Text>
            <Text style={styles.text}>{data.verifikasjonsmetoder}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>3. Oppkobling/Integrasjon</Text>
        {data.integrasjon_andre_systemer && (
          <View>
            <Text style={styles.subsectionTitle}>Integrasjon med andre systemer:</Text>
            <Text style={styles.text}>{data.integrasjon_andre_systemer}</Text>
          </View>
        )}
        {data.forriglinger && (
          <View>
            <Text style={styles.subsectionTitle}>Forriglinger:</Text>
            <Text style={styles.text}>{data.forriglinger}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerCompany}>Brannteknisk Service og Vedlikehold AS</Text>
          <Text style={styles.footerInfo}>
            Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600
          </Text>
          <Text style={styles.footerInfo}>
            Adresse: Sælenveien 44, 5151 Straumsgrend
          </Text>
          <Text style={{ fontSize: 7, color: '#999', marginTop: 5 }}>
            Side 2 av 3
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>4. Tiltak</Text>
        {data.organisatoriske_prosesser && (
          <View>
            <Text style={styles.subsectionTitle}>Organisatoriske prosesser:</Text>
            <Text style={styles.text}>{data.organisatoriske_prosesser}</Text>
          </View>
        )}
        {data.evakueringsprosedyrer && (
          <View>
            <Text style={styles.subsectionTitle}>Evakueringsprosedyrer:</Text>
            <Text style={styles.text}>{data.evakueringsprosedyrer}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Alarmorganisering</Text>
        {data.styringer_data && data.styringer_data.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>Styringer:</Text>
            {data.styringer_data.map((styring: any, index: number) => (
              <View key={index} style={styles.styringBox}>
                <Text style={styles.styringHeader}>
                  {styring.type} - {styring.alarmnivaa}
                </Text>
                {styring.beskrivelse && <Text style={styles.text}>{styring.beskrivelse}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerCompany}>Brannteknisk Service og Vedlikehold AS</Text>
          <Text style={styles.footerInfo}>
            Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600
          </Text>
          <Text style={styles.footerInfo}>
            Adresse: Sælenveien 44, 5151 Straumsgrend
          </Text>
          <Text style={{ fontSize: 7, color: '#999', marginTop: 5 }}>
            Side 3 av 3
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export function AlarmorganiseringPreview({ data, onClose }: AlarmorganiseringPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await generateAlarmorganiseringPDF(data, false)
    } catch (error) {
      console.error('Feil ved nedlasting:', error)
      alert('Feil ved nedlasting av PDF')
    } finally {
      setDownloading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await generateAlarmorganiseringPDF(data, true)
      if (result.success) {
        alert(`PDF lagret som ${result.fileName}`)
        onClose()
      }
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av PDF')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-dark rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Forhåndsvisning - Alarmorganisering</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Laster ned...' : 'Last ned'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Lagrer...' : 'Lagre til anlegg'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <PDFViewer width="100%" height="100%" className="border-0">
            <AlarmorganiseringPDFDocument data={data} />
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}
