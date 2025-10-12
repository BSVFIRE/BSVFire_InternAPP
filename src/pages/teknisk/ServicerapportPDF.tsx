import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  created_at: string
  updated_at: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0066cc',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  infoSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
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
  contentSection: {
    marginTop: 20,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0066cc',
  },
  contentText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#333',
    whiteSpace: 'pre-wrap',
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

interface ServicerapportPDFDocumentProps {
  rapport: Servicerapport
}

function ServicerapportPDFDocument({ rapport }: ServicerapportPDFDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image src={BSV_LOGO} style={styles.logo} />
          <Text style={styles.mainTitle}>Servicerapport</Text>
          <Text style={styles.title}>{rapport.header}</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Anlegg:</Text>
            <Text style={styles.infoValue}>{rapport.anlegg_navn || 'Ikke tilknyttet anlegg'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dato:</Text>
            <Text style={styles.infoValue}>
              {new Date(rapport.rapport_dato).toLocaleDateString('nb-NO')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tekniker:</Text>
            <Text style={styles.infoValue}>{rapport.tekniker_navn}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rapport ID:</Text>
            <Text style={styles.infoValue}>{rapport.id.substring(0, 8)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.contentTitle}>Rapportinnhold</Text>
          <Text style={styles.contentText}>{rapport.rapport_innhold}</Text>
        </View>

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
    </Document>
  )
}

export async function generateServicerapportPDF(rapport: Servicerapport, saveToStorage: boolean = false) {
  try {
    const blob = await pdf(<ServicerapportPDFDocument rapport={rapport} />).toBlob()
    
    if (saveToStorage && rapport.anlegg_id) {
      // Importer supabase dynamisk for å unngå sirkulære avhengigheter
      const { supabase } = await import('@/lib/supabase')
      
      // Lag filnavn
      const year = new Date(rapport.rapport_dato).getFullYear()
      const safeHeader = rapport.header.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `Servicerapport_${safeHeader}_${year}.pdf`
      
      // Last opp til storage: anlegg/{anlegg_id}/dokumenter/{filename}
      const filePath = `anlegg/${rapport.anlegg_id}/dokumenter/${fileName}`
      
      console.log('📤 Laster opp PDF til storage...')
      console.log('   Bucket: anlegg.dokumenter')
      console.log('   Path:', filePath)
      console.log('   Blob size:', blob.size, 'bytes')
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('anlegg.dokumenter')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true
        })
      
      if (uploadError) {
        console.error('❌ Feil ved opplasting til storage:', uploadError)
        throw new Error(`Kunne ikke lagre til storage: ${uploadError.message}`)
      }
      
      console.log('✅ PDF lagret til storage!')
      console.log('   Upload data:', uploadData)
      console.log('   Full path:', filePath)
      return { success: true, filePath }
    } else {
      // Last ned lokalt
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Servicerapport_${rapport.header.replace(/[^a-z0-9]/gi, '_')}_${rapport.rapport_dato}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
  } catch (error) {
    console.error('Feil ved generering av PDF:', error)
    throw error
  }
}
