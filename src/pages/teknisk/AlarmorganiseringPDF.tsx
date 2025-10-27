import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'

interface AlarmorganiseringData {
  id: string
  kunde_id?: string
  anlegg_id?: string
  dato: string
  revisjon: string
  service_ingeniør: string
  status: string
  kundeadresse?: string
  kontakt_person?: string
  mobil?: string
  e_post?: string
  annet?: string
  detektortyper?: string
  detektorplassering?: string
  alarmnivaa_forvarsel?: string
  alarmnivaa_stille?: string
  alarmnivaa_stor?: string
  tekniske_tiltak_unodige_alarmer?: string
  hvem_faar_melding?: string
  hvordan_melding_mottas?: string
  verifikasjonsmetoder?: string
  kommunikasjonskanaler?: string
  meldingsrutiner?: string
  integrasjon_andre_systemer?: string
  forriglinger?: string
  automatiske_funksjoner?: string
  organisatoriske_prosesser?: string
  evakueringsprosedyrer?: string
  beredskapsplaner?: string
  ansvarlige_personer?: string
  opplaering_rutiner?: string
  samspill_teknisk_organisatorisk?: string
  styringsmatrise?: string
  type_overforing?: string
  overvakingstid?: string
  innstallasjon?: string
  gjeldende_teknisk_forskrift?: string
  antall_styringer?: string
  brannklokker_aktivering?: string
  visuell_varsling_aktivering?: string
  alarm_aktivering?: string
  seksjoneringsoppsett?: string
  styringer_data?: Array<{ type: string; alarmnivaa: string; beskrivelse: string }>
  kunde_navn?: string
  anlegg_navn?: string
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
  bulletPoint: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#333',
    marginBottom: 4,
    marginLeft: 15,
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

interface AlarmorganiseringPDFDocumentProps {
  data: AlarmorganiseringData
}

function AlarmorganiseringPDFDocument({ data }: AlarmorganiseringPDFDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image src={BSV_LOGO} style={styles.logo} />
          <Text style={styles.mainTitle}>Alarmorganisering</Text>
          <Text style={styles.subtitle}>Revisjon {data.revisjon} - {new Date(data.dato).toLocaleDateString('nb-NO')}</Text>
        </View>

        {/* Info Section */}
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
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{data.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 1. Deteksjon */}
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
        {data.tekniske_tiltak_unodige_alarmer && (
          <View>
            <Text style={styles.subsectionTitle}>Tekniske tiltak mot unødige alarmer:</Text>
            <Text style={styles.text}>{data.tekniske_tiltak_unodige_alarmer}</Text>
          </View>
        )}

        {/* Footer */}
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

      {/* Page 2 - Melding og Oppkobling */}
      <Page size="A4" style={styles.page}>
        {/* 2. Melding */}
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
        {data.kommunikasjonskanaler && (
          <View>
            <Text style={styles.subsectionTitle}>Kommunikasjonskanaler:</Text>
            <Text style={styles.text}>{data.kommunikasjonskanaler}</Text>
          </View>
        )}
        {data.meldingsrutiner && (
          <View>
            <Text style={styles.subsectionTitle}>Meldingsrutiner:</Text>
            <Text style={styles.text}>{data.meldingsrutiner}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* 3. Oppkobling */}
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
        {data.automatiske_funksjoner && (
          <View>
            <Text style={styles.subsectionTitle}>Automatiske funksjoner:</Text>
            <Text style={styles.text}>{data.automatiske_funksjoner}</Text>
          </View>
        )}

        {/* Footer */}
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

      {/* Page 3 - Tiltak og Alarmorganisering */}
      <Page size="A4" style={styles.page}>
        {/* 4. Tiltak */}
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
        {data.beredskapsplaner && (
          <View>
            <Text style={styles.subsectionTitle}>Beredskapsplaner:</Text>
            <Text style={styles.text}>{data.beredskapsplaner}</Text>
          </View>
        )}
        {data.ansvarlige_personer && (
          <View>
            <Text style={styles.subsectionTitle}>Ansvarlige personer:</Text>
            <Text style={styles.text}>{data.ansvarlige_personer}</Text>
          </View>
        )}
        {data.opplaering_rutiner && (
          <View>
            <Text style={styles.subsectionTitle}>Opplæringsrutiner:</Text>
            <Text style={styles.text}>{data.opplaering_rutiner}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Alarmorganisering */}
        <Text style={styles.sectionTitle}>Alarmorganisering</Text>
        {data.samspill_teknisk_organisatorisk && (
          <View>
            <Text style={styles.subsectionTitle}>Samspill teknisk/organisatorisk:</Text>
            <Text style={styles.text}>{data.samspill_teknisk_organisatorisk}</Text>
          </View>
        )}
        {data.styringsmatrise && (
          <View>
            <Text style={styles.subsectionTitle}>Styringsmatrise:</Text>
            <Text style={styles.text}>{data.styringsmatrise}</Text>
          </View>
        )}
        {data.styringer_data && data.styringer_data.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>Styringer:</Text>
            {data.styringer_data.map((styring, index) => (
              <View key={index} style={styles.styringBox}>
                <Text style={styles.styringHeader}>
                  {styring.type} - {styring.alarmnivaa}
                </Text>
                {styring.beskrivelse && <Text style={styles.text}>{styring.beskrivelse}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
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

export async function generateAlarmorganiseringPDF(data: AlarmorganiseringData, saveToStorage: boolean = false) {
  try {
    const blob = await pdf(<AlarmorganiseringPDFDocument data={data} />).toBlob()
    
    if (saveToStorage && data.anlegg_id) {
      const { supabase } = await import('@/lib/supabase')
      
      const year = new Date(data.dato).getFullYear()
      const anleggName = data.anlegg_navn?.replace(/[^a-zA-Z0-9]/g, '_') || 'Anlegg'
      const fileName = `Alarmorganisering_${year}_${anleggName}.pdf`
      
      const filePath = `anlegg/${data.anlegg_id}/dokumenter/${fileName}`
      
      console.log('📤 Laster opp Alarmorganisering PDF til storage...')
      console.log('   Bucket: anlegg.dokumenter')
      console.log('   Path:', filePath)
      
      const { error: uploadError } = await supabase.storage
        .from('anlegg.dokumenter')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true
        })
      
      if (uploadError) {
        console.error('❌ Feil ved opplasting til storage:', uploadError)
        throw new Error(`Kunne ikke lagre til storage: ${uploadError.message}`)
      }
      
      console.log('✅ Alarmorganisering PDF lagret til storage!')
      return { success: true, filePath, fileName }
    } else {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const year = new Date(data.dato).getFullYear()
      const anleggName = data.anlegg_navn?.replace(/[^a-zA-Z0-9]/g, '_') || 'Anlegg'
      link.download = `Alarmorganisering_${year}_${anleggName}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
  } catch (error) {
    console.error('Feil ved generering av Alarmorganisering PDF:', error)
    throw error
  }
}
