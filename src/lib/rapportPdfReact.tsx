/**
 * Felles forside og sidefot for rapportene som bygges med @react-pdf/renderer.
 * Samme uttrykk som `src/lib/rapportPdf.ts` gir jsPDF-rapportene, slik at kunden får
 * samme førsteinntrykk uansett hvilken modul rapporten kommer fra.
 */
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
  anlegg: { fontSize: 14, color: '#555' },
  undertittel: { fontSize: 10, color: '#6e6e6e', marginTop: 10, lineHeight: 1.4 },
  tabell: { marginTop: 100, borderWidth: 1, borderColor: '#d0d0d0' },
  overskriftRad: { flexDirection: 'row', backgroundColor: '#2980b9' },
  overskrift: { width: '50%', padding: 6, fontSize: 8.5, color: '#fff', fontFamily: 'Helvetica-Bold' },
  rad: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#d0d0d0' },
  navn: { width: '22%', padding: 6, fontFamily: 'Helvetica-Bold', backgroundColor: '#f6f6f6', fontSize: 9 },
  verdi: { width: '28%', padding: 6, fontSize: 9 },
  tomNavn: { width: '22%', padding: 6, fontSize: 9 },
  nesteNavn: { width: '22%', padding: 6, fontFamily: 'Helvetica-Bold', backgroundColor: '#fef9c3', fontSize: 9, color: '#926400' },
  nesteVerdi: { width: '78%', padding: 6, fontFamily: 'Helvetica-Bold', backgroundColor: '#fef9c3', fontSize: 9, color: '#926400' },
  sidefot: { position: 'absolute', bottom: 28, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  sidefotTekst: { fontSize: 7, color: '#888' },
})

export interface ForsideFelt { navn: string; verdi: string }

/**
 * Forside: logo, tittel, anleggsnavn og en faktatabell delt i to – kunden til venstre,
 * vi som har utført kontrollen til høyre. Brukes som første <Page> i dokumentet.
 */
export function Forside({ tittel, anleggNavn, undertittel, venstre, hoyre, nesteKontroll }: {
  tittel: string
  anleggNavn: string
  /** Linjen under anleggsnavnet, f.eks. hvilken forskrift kontrollen er utført etter */
  undertittel?: string
  venstre: ForsideFelt[]
  hoyre: ForsideFelt[]
  nesteKontroll?: string
}) {
  const antall = Math.max(venstre.length, hoyre.length)
  const rader = Array.from({ length: antall }, (_, i) => [venstre[i], hoyre[i]] as const)

  return (
    <Page size="A4" style={s.side}>
      <Image src={BSV_LOGO} style={s.logo} />
      <Text style={s.tittel}>{tittel}</Text>
      <Text style={s.anlegg}>{anleggNavn}</Text>
      {undertittel ? <Text style={s.undertittel}>{undertittel}</Text> : null}
      <View style={s.tabell}>
        <View style={s.overskriftRad}>
          <Text style={s.overskrift}>Kunde og anlegg</Text>
          <Text style={s.overskrift}>Kontrollen er utført av</Text>
        </View>
        {rader.map(([v, h], i) => (
          <View key={i} style={s.rad}>
            <Text style={v ? s.navn : s.tomNavn}>{v?.navn ?? ' '}</Text>
            <Text style={s.verdi}>{v ? v.verdi || '-' : ' '}</Text>
            <Text style={h ? s.navn : s.tomNavn}>{h?.navn ?? ' '}</Text>
            <Text style={s.verdi}>{h ? h.verdi || '-' : ' '}</Text>
          </View>
        ))}
        {nesteKontroll ? (
          <View style={s.rad}>
            <Text style={s.nesteNavn}>Neste kontroll</Text>
            <Text style={s.nesteVerdi}>{nesteKontroll.toUpperCase()}</Text>
          </View>
        ) : null}
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
