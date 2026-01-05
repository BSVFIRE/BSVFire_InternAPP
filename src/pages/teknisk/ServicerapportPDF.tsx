import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  ordre_id?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  image_urls?: string[]
  opprettet_dato?: string
  sist_oppdatert?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  imagePage: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '48%',
    marginBottom: 15,
    border: '1px solid #e0e0e0',
    padding: 5,
  },
  image: {
    width: '100%',
    maxHeight: 200,
  },
  imageCaption: {
    fontSize: 8,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
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
  imageDataUrls?: string[]
}

function ServicerapportPDFDocument({ rapport, imageDataUrls = [] }: ServicerapportPDFDocumentProps) {
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

      {/* Image Pages - 4 bilder per side */}
      {imageDataUrls.length > 0 && (() => {
        const imagesPerPage = 4
        const totalPages = Math.ceil(imageDataUrls.length / imagesPerPage)
        
        return Array.from({ length: totalPages }, (_, pageIndex) => {
          const startIndex = pageIndex * imagesPerPage
          const endIndex = Math.min(startIndex + imagesPerPage, imageDataUrls.length)
          const pageImages = imageDataUrls.slice(startIndex, endIndex)
          
          return (
            <Page key={`image-page-${pageIndex}`} size="A4" style={styles.imagePage}>
              {/* Header */}
              <View style={styles.header}>
                <Image src={BSV_LOGO} style={styles.logo} />
                <Text style={styles.mainTitle}>Servicerapport - Bilder</Text>
                <Text style={styles.title}>{rapport.header}</Text>
                {totalPages > 1 && (
                  <Text style={{ fontSize: 9, color: '#666', marginTop: 5 }}>
                    Side {pageIndex + 1} av {totalPages}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              {/* Images Grid */}
              <View style={styles.imageGrid}>
                {pageImages.map((dataUrl, imageIndex) => {
                  const globalIndex = startIndex + imageIndex
                  console.log(`🖼️ Rendering bilde ${globalIndex + 1} i PDF, data URL lengde:`, dataUrl?.length || 0)
                  return (
                    <View key={globalIndex} style={styles.imageContainer}>
                      {dataUrl && dataUrl.length > 0 ? (
                        <Image src={dataUrl} style={styles.image} />
                      ) : (
                        <View style={{ ...styles.image, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#999' }}>Bilde kunne ikke lastes</Text>
                        </View>
                      )}
                      <Text style={styles.imageCaption}>Bilde {globalIndex + 1}</Text>
                    </View>
                  )
                })}
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
          )
        })
      })()}
    </Document>
  )
}

export async function generateServicerapportPDF(
  rapport: Servicerapport, 
  saveToStorage: boolean = false,
  saveToDropbox: boolean = false
): Promise<{ success: boolean; filePath?: string; dropboxPath?: string; dropboxError?: string }> {
  try {
    console.log('📄 Genererer PDF for rapport:', rapport.id)
    console.log('   Anlegg:', rapport.anlegg_navn)
    console.log('   Bilder:', rapport.image_urls?.length || 0)
    
    // Importer supabase
    const { supabase } = await import('@/lib/supabase')
    
    // Hent bilder fra storage hvis de finnes
    let imageDataUrls: string[] = []
    if (rapport.image_urls && rapport.image_urls.length > 0) {
      
      console.log('🖼️ Laster ned bilder fra storage...')
      for (const imagePath of rapport.image_urls) {
        try {
          console.log('   Laster ned:', imagePath)
          
          // Prøv først å laste ned bildet
          const { data: blob, error: downloadError } = await supabase.storage
            .from('anlegg.dokumenter')
            .download(imagePath)
          
          if (downloadError) {
            console.error('❌ Feil ved nedlasting av bilde:', downloadError)
            console.log('   Prøver signed URL i stedet...')
            
            // Fallback: Bruk signed URL
            const { data: signedData, error: signedError } = await supabase.storage
              .from('anlegg.dokumenter')
              .createSignedUrl(imagePath, 60 * 60) // 1 time
            
            if (signedError || !signedData?.signedUrl) {
              console.error('❌ Kunne ikke lage signed URL:', signedError)
              continue
            }
            
            console.log('   ✅ Signed URL opprettet')
            
            // Last ned via signed URL
            const response = await fetch(signedData.signedUrl)
            if (!response.ok) {
              console.error('❌ Kunne ikke laste ned via signed URL:', response.status)
              continue
            }
            
            const arrayBuffer = await response.arrayBuffer()
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
            const mimeType = response.headers.get('content-type') || 'image/jpeg'
            const dataUrl = `data:${mimeType};base64,${base64}`
            
            console.log('   ✅ Konvertert til data URL via signed URL, lengde:', dataUrl.length)
            imageDataUrls.push(dataUrl)
            continue
          }
          
          console.log('   ✅ Lastet ned, størrelse:', blob.size, 'bytes')
          
          // Komprimer bildet hvis det er for stort (over 500KB)
          let finalBlob = blob
          if (blob.size > 500000) {
            console.log('   🔄 Komprimerer bilde (for stort)...')
            try {
              // Last bilde til canvas for komprimering
              const imageBitmap = await createImageBitmap(blob)
              const canvas = document.createElement('canvas')
              
              // Beregn ny størrelse (maks 1200px bredde)
              const maxWidth = 1200
              const scale = Math.min(1, maxWidth / imageBitmap.width)
              canvas.width = imageBitmap.width * scale
              canvas.height = imageBitmap.height * scale
              
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height)
                
                // Konverter til blob med kvalitet 0.7
                finalBlob = await new Promise<Blob>((resolve) => {
                  canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.7)
                })
                
                console.log('   ✅ Komprimert fra', blob.size, 'til', finalBlob.size, 'bytes')
              }
            } catch (error) {
              console.error('   ⚠️ Kunne ikke komprimere, bruker original:', error)
            }
          }
          
          // Konverter blob til data URL
          const reader = new FileReader()
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string
              console.log('   📊 Data URL starter med:', result.substring(0, 30))
              resolve(result)
            }
            reader.onerror = (error) => {
              console.error('   ❌ FileReader error:', error)
              reject(error)
            }
            reader.readAsDataURL(finalBlob)
          })
          
          console.log('   ✅ Konvertert til data URL, lengde:', dataUrl.length)
          imageDataUrls.push(dataUrl)
        } catch (error) {
          console.error('❌ Feil ved konvertering av bilde:', error)
        }
      }
      console.log('✅ Totalt', imageDataUrls.length, 'bilder lastet')
      console.log('📊 Data URL info:')
      imageDataUrls.forEach((url, i) => {
        console.log(`   Bilde ${i + 1}: ${url.substring(0, 50)}... (${url.length} tegn)`)
      })
    }
    
    console.log('🎨 Genererer PDF-dokument med', imageDataUrls.length, 'bilder...')
    const blob = await pdf(<ServicerapportPDFDocument rapport={rapport} imageDataUrls={imageDataUrls} />).toBlob()
    console.log('✅ PDF generert, størrelse:', blob.size, 'bytes')
    
    // Lag filnavn
    const year = new Date(rapport.rapport_dato).getFullYear()
    const safeHeader = rapport.header.replace(/[^a-zA-Z0-9æøåÆØÅ\s]/g, '_').replace(/\s+/g, '_')
    const fileName = `Servicerapport_${safeHeader}_${year}.pdf`
    
    let result: { success: boolean; filePath?: string; dropboxPath?: string; dropboxError?: string } = { success: true }
    
    if (saveToStorage && rapport.anlegg_id) {
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
      result.filePath = filePath
    }
    
    // Last opp til Dropbox hvis aktivert
    if (saveToDropbox && rapport.anlegg_id) {
      try {
        const { uploadRapportToDropbox, isDropboxConfigured } = await import('@/services/dropboxServiceV2')
        
        const dropboxConfigured = await isDropboxConfigured()
        if (!dropboxConfigured) {
          console.warn('⚠️ Dropbox er ikke konfigurert - hopper over Dropbox-opplasting')
          result.dropboxError = 'Dropbox er ikke konfigurert'
        } else {
          // Hent kundenummer fra anlegg
          const { data: anleggData, error: anleggError } = await supabase
            .from('anlegg')
            .select(`
              anleggsnavn,
              kundenr,
              customer:kundenr (
                kunde_nummer,
                navn
              )
            `)
            .eq('id', rapport.anlegg_id)
            .single()
          
          if (anleggError || !anleggData) {
            console.error('❌ Kunne ikke hente anleggsdata:', anleggError)
            result.dropboxError = 'Kunne ikke hente anleggsdata'
          } else {
            const kundeNummer = (anleggData.customer as any)?.kunde_nummer
            const kundeNavn = (anleggData.customer as any)?.navn
            const anleggNavn = anleggData.anleggsnavn || rapport.anlegg_navn || 'Ukjent_anlegg'
            
            if (!kundeNummer) {
              console.warn('⚠️ Kundenummer mangler - kan ikke laste opp til Dropbox')
              result.dropboxError = 'Kundenummer mangler på kunden'
            } else if (!kundeNavn) {
              console.warn('⚠️ Kundenavn mangler - kan ikke laste opp til Dropbox')
              result.dropboxError = 'Kundenavn mangler på kunden'
            } else {
              console.log('📤 Laster opp til Dropbox...')
              console.log('   Kundenummer:', kundeNummer)
              console.log('   Kundenavn:', kundeNavn)
              console.log('   Anlegg:', anleggNavn)
              console.log('   Filnavn:', fileName)
              
              const dropboxResult = await uploadRapportToDropbox(
                kundeNummer,
                kundeNavn,
                anleggNavn,
                fileName,
                blob
              )
              
              if (dropboxResult.success) {
                console.log('✅ PDF lastet opp til Dropbox:', dropboxResult.path)
                result.dropboxPath = dropboxResult.path
              } else {
                console.error('❌ Dropbox-opplasting feilet:', dropboxResult.error)
                result.dropboxError = dropboxResult.error
              }
            }
          }
        }
      } catch (dropboxError) {
        console.error('❌ Feil ved Dropbox-opplasting:', dropboxError)
        result.dropboxError = dropboxError instanceof Error ? dropboxError.message : 'Ukjent feil'
      }
    }
    
    // Hvis ingen lagring er valgt, last ned lokalt
    if (!saveToStorage && !saveToDropbox) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Servicerapport_${rapport.header.replace(/[^a-z0-9]/gi, '_')}_${rapport.rapport_dato}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    }
    
    return result
  } catch (error) {
    console.error('Feil ved generering av PDF:', error)
    throw error
  }
}
