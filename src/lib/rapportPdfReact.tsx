/**
 * Felles forside og sidefot for rapportene som bygges med @react-pdf/renderer.
 * Samme uttrykk som `src/lib/rapportPdf.ts` gir jsPDF-rapportene, slik at kunden får
 * samme førsteinntrykk uansett hvilken modul rapporten kommer fra.
 */
import { Fragment } from 'react'
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { BSV_LOGO } from '@/assets/logoBase64'

export const FIRMA = {
  navn: 'Brannteknisk Service og Vedlikehold AS',
  orgnr: '921 044 879',
  adresse: 'Sælenveien 44, 5151 Straumsgrend',
  telefon: '900 46 600',
  epost: 'mail@bsvfire.no',
}

const s = StyleSheet.create({
  side: { padding: 40, paddingBottom: 70, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  logo: { width: 130, marginBottom: 60 },
  tittel: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  anlegg: { fontSize: 14, color: '#555', marginBottom: 100 },
  tabell: { borderWidth: 1, borderColor: '#d0d0d0' },
  rad: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d0d0d0' },
  sisteRad: { flexDirection: 'row' },
  navn: { width: '22%', padding: 6, fontFamily: 'Helvetica-Bold', backgroundColor: '#f6f6f6', fontSize: 9 },
  verdi: { width: '28%', padding: 6, fontSize: 9 },
  sidefot: { position: 'absolute', bottom: 28, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  sidefotTekst: { fontSize: 7, color: '#888' },
})

export interface ForsideFelt { navn: string; verdi: string }

/** Forside: logo, tittel, anleggsnavn og en faktatabell. Brukes som første <Page> i dokumentet. */
export function Forside({ tittel, anleggNavn, felt }: { tittel: string; anleggNavn: string; felt: ForsideFelt[] }) {
  // To kolonner med navn/verdi per rad
  const rader: ForsideFelt[][] = []
  for (let i = 0; i < felt.length; i += 2) rader.push(felt.slice(i, i + 2))

  return (
    <Page size="A4" style={s.side}>
      <Image src={BSV_LOGO} style={s.logo} />
      <Text style={s.tittel}>{tittel}</Text>
      <Text style={s.anlegg}>{anleggNavn}</Text>
      <View style={s.tabell}>
        {rader.map((rad, i) => (
          <View key={i} style={i === rader.length - 1 ? s.sisteRad : s.rad}>
            {rad.map(f => (
              <Fragment key={f.navn}>
                <Text style={s.navn}>{f.navn}</Text>
                <Text style={s.verdi}>{f.verdi || '-'}</Text>
              </Fragment>
            ))}
            {rad.length === 1 && <><Text style={s.navn}> </Text><Text style={s.verdi}> </Text></>}
          </View>
        ))}
      </View>
      <Sidefot />
    </Page>
  )
}

/** Sidefot med firmaopplysninger og sidetall. Legges nederst i hver <Page>. */
export function Sidefot() {
  return (
    <View style={s.sidefot} fixed>
      <Text style={s.sidefotTekst}>{`${FIRMA.navn} · ${FIRMA.adresse} · ${FIRMA.telefon} · ${FIRMA.epost}`}</Text>
      <Text style={s.sidefotTekst} render={({ pageNumber, totalPages }) => `Side ${pageNumber} av ${totalPages}`} />
    </View>
  )
}
