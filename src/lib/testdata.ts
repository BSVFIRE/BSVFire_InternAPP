/**
 * Testdata: en kunde med fire anlegg som til sammen dekker alle kontrollmodulene.
 *
 * Testdataene oppfører seg som ekte data med vilje. Skulle de vært skjult fra
 * kontrollplan, ukesplan og dashbord, kunne man ikke testet nettopp de sidene.
 * Det som skiller dem er navnet, flagget `er_testdata` og at de kan fjernes helt
 * med ett kall – se `slett_testdata()` i 20260927_testdata.sql.
 *
 * Anleggene er valgt for å dekke ulike tilfeller, ikke for å være mange:
 *   1. Brannalarm NS 3960 + nødlys + slukkeutstyr – det vanligste anlegget
 *   2. FG-790 + røykluker – den andre brannalarmstandarden
 *   3. Leilighetsbygg med førstehjelp – egen visning og egne kontroller
 *   4. Tomt anlegg – tomme tilstander, import og førstegangsregistrering
 */
import { supabase } from '@/lib/supabase'

export const TEST_KUNDENUMMER = '9999'
export const TEST_KUNDENAVN = 'TEST – Systemtest'

export type ModulNokkel = 'brannalarm' | 'nodlys' | 'slukkeutstyr' | 'roykluker' | 'forstehjelp' | 'kontaktpersoner'

export const MODULER: { nokkel: ModulNokkel; navn: string; beskrivelse: string }[] = [
  { nokkel: 'kontaktpersoner', navn: 'Kontaktpersoner', beskrivelse: 'Én primærkontakt per anlegg – trengs for rapportforsiden og e-post' },
  { nokkel: 'brannalarm', navn: 'Brannalarm', beskrivelse: 'Enheter, sløyfer og sentraldata for NS 3960- og FG-790-kontroll' },
  { nokkel: 'nodlys', navn: 'Nødlys', beskrivelse: '24 armaturer over tre etasjer, noen med avvik' },
  { nokkel: 'slukkeutstyr', navn: 'Slukkeutstyr', beskrivelse: '8 brannslukkere og 4 brannslanger, én med trykktest forfalt' },
  { nokkel: 'roykluker', navn: 'Røykluker', beskrivelse: '2 sentraler med luker og kretser' },
  { nokkel: 'forstehjelp', navn: 'Førstehjelp', beskrivelse: '6 enheter, to med utløpsdato som er passert' },
]

interface Testanlegg {
  navn: string
  adresse: string
  postnummer: string
  poststed: string
  kontrollMaaned: string
  erLeilighetsbygg: boolean
  kontaktNavn: string
  moduler: ModulNokkel[]
  kontrollType: 'NS3960' | 'FG790' | null
}

export const TESTANLEGG: Testanlegg[] = [
  {
    navn: 'TEST – Kontorbygg Nord',
    adresse: 'Testveien 1',
    postnummer: '5006',
    poststed: 'Bergen',
    kontrollMaaned: 'Mars',
    erLeilighetsbygg: false,
    kontaktNavn: 'Kari Testesen',
    moduler: ['kontaktpersoner', 'brannalarm', 'nodlys', 'slukkeutstyr'],
    kontrollType: 'NS3960',
  },
  {
    navn: 'TEST – Lagerhall Sør',
    adresse: 'Testveien 2',
    postnummer: '5162',
    poststed: 'Laksevåg',
    kontrollMaaned: 'Juni',
    erLeilighetsbygg: false,
    kontaktNavn: 'Ola Testmann',
    moduler: ['kontaktpersoner', 'brannalarm', 'roykluker', 'slukkeutstyr'],
    kontrollType: 'FG790',
  },
  {
    navn: 'TEST – Leilighetsbygg Vest',
    adresse: 'Testveien 3',
    postnummer: '5145',
    poststed: 'Fyllingsdalen',
    kontrollMaaned: 'September',
    erLeilighetsbygg: true,
    kontaktNavn: 'Styreleder Test',
    moduler: ['kontaktpersoner', 'nodlys', 'forstehjelp'],
    kontrollType: null,
  },
  {
    navn: 'TEST – Tomt anlegg Øst',
    adresse: 'Testveien 4',
    postnummer: '5221',
    poststed: 'Nesttun',
    kontrollMaaned: 'November',
    erLeilighetsbygg: false,
    kontaktNavn: 'Ingen kontakt',
    moduler: [],
    kontrollType: null,
  },
]

export interface Framdrift {
  (melding: string): void
}

export interface Testdatastatus {
  kundeId: string | null
  anlegg: { id: string; navn: string }[]
}

/** Finnes testdataene allerede? Brukes til å vise status og hindre dobbelt oppsett. */
export async function hentTestdatastatus(): Promise<Testdatastatus> {
  const { data: kunde } = await supabase.from('customer').select('id').eq('er_testdata', true).maybeSingle()
  const { data: anlegg } = await supabase.from('anlegg').select('id, anleggsnavn').eq('er_testdata', true).order('anleggsnavn')
  return {
    kundeId: kunde?.id ?? null,
    anlegg: (anlegg ?? []).map(a => ({ id: a.id, navn: a.anleggsnavn ?? 'Uten navn' })),
  }
}

const ETASJER = ['1. etasje', '2. etasje', '3. etasje']

function nodlysrader(anleggId: string, kundeNavn: string) {
  // 24 armaturer. Fire har avvik, så avviksliste og rapport har noe å vise.
  return Array.from({ length: 24 }, (_, i) => {
    const nr = i + 1
    const medAvvik = nr % 6 === 0
    return {
      anlegg_id: anleggId,
      kundenavn: kundeNavn,
      internnummer: `N${String(nr).padStart(3, '0')}`,
      etasje: ETASJER[i % 3],
      plassering: `Korridor ${Math.floor(i / 3) + 1}`,
      type: nr % 4 === 0 ? 'Markeringslys' : 'Ledelys',
      produsent: nr % 2 === 0 ? 'Glamox' : 'Teknoware',
      batteritype: 'NiMH',
      kurs: `Kurs ${(i % 4) + 1}`,
      status: medAvvik ? 'Avvik' : 'OK',
      notat: medAvvik ? 'Lyser ikke ved nettbortfall – batteri må byttes' : null,
      kontrollert: true,
    }
  })
}

function slukkerader(anleggId: string) {
  return Array.from({ length: 8 }, (_, i) => {
    const nr = i + 1
    return {
      anlegg_id: anleggId,
      apparat_nr: `S${String(nr).padStart(3, '0')}`,
      etasje: ETASJER[i % 3],
      plassering: `Ved rømningsvei ${nr}`,
      produsent: 'Housegard',
      modell: nr % 3 === 0 ? 'CO2 5 kg' : 'Pulver 6 kg',
      brannklasse: nr % 3 === 0 ? 'BC' : 'ABC',
      produksjonsaar: String(2014 + (i % 8)),
      status: nr === 3 ? 'Avvik' : 'OK',
      service: nr % 5 === 0,
    }
  })
}

function slangerader(anleggId: string, kundeNavn: string) {
  return Array.from({ length: 4 }, (_, i) => {
    const nr = i + 1
    return {
      anlegg_id: anleggId,
      kunde: kundeNavn,
      slangenummer: `B${String(nr).padStart(3, '0')}`,
      etasje: ETASJER[i % 3],
      plassering: `Trapperom ${nr}`,
      produsent: 'Falck',
      modell: '30 m / 19 mm',
      produksjonsaar: String(2010 + i),
      // Trykktest hvert femte år – den eldste er forfalt, så varselet kan testes
      trykktest: i === 0 ? '2018' : String(2022 + i),
      status: i === 0 ? 'Avvik' : 'OK',
      type_avvik: i === 0 ? 'Trykktest forfalt' : null,
    }
  })
}

function forstehjelprader(anleggId: string, kundeNavn: string) {
  const idag = new Date()
  const om = (maaneder: number) => {
    const d = new Date(idag)
    d.setMonth(d.getMonth() + maaneder)
    return d.toISOString().slice(0, 10)
  }
  return [
    { type: 'Førstehjelpsskap', utlop: om(14), plassering: 'Resepsjon' },
    { type: 'Førstehjelpsskap', utlop: om(-2), plassering: 'Kantine' },
    { type: 'Øyeskyll', utlop: om(2), plassering: 'Verksted' },
    { type: 'Øyeskyll', utlop: om(-6), plassering: 'Lager' },
    { type: 'Hjertestarter', utlop: om(20), plassering: 'Hovedinngang' },
    { type: 'Brannteppe', utlop: om(30), plassering: 'Kjøkken' },
  ].map((e, i) => ({
    anlegg_id: anleggId,
    kundenavn: kundeNavn,
    internnummer: `F${String(i + 1).padStart(3, '0')}`,
    etasje: ETASJER[i % 3],
    plassering: e.plassering,
    type: e.type,
    produsent: 'Cederroth',
    utlopsdato: e.utlop,
    status: new Date(e.utlop) < idag ? 'Avvik' : 'OK',
    kontrollert: true,
  }))
}

async function lagRoykluker(anleggId: string) {
  const sentraler = [
    { sentral_nr: 1, anlegg_type: 'Røykluker', plassering: 'Trapperom A', motor_type: 'D+H ZA 85', motor_antall: 4, roykluke_type: 'Velux GGL', roykluke_antall: 4 },
    { sentral_nr: 2, anlegg_type: 'Branngardin', plassering: 'Lagerhall', motor_type: 'D+H CDC', motor_antall: 2, roykluke_type: 'Stöbich', roykluke_antall: 2 },
  ]

  const { data, error } = await supabase
    .from('roykluke_sentraler')
    .insert(sentraler.map(s => ({
      ...s,
      anlegg_id: anleggId,
      sentral_produsent: 'D+H',
      batteri_type: '12V 7Ah',
      batteri_alder: '2022',
      krets_nr: '1',
      status: 'Ikke kontrollert',
    })))
    .select('id, sentral_nr')
  if (error) throw error

  const luker = (data ?? []).flatMap(s =>
    Array.from({ length: 3 }, (_, i) => ({
      sentral_id: s.id,
      luke_type: s.sentral_nr === 1 ? 'Takluke' : 'Branngardin',
      plassering: `Luke ${s.sentral_nr}.${i + 1}`,
      status: i === 0 && s.sentral_nr === 1 ? 'Avvik' : 'OK',
      skader: i === 0 && s.sentral_nr === 1 ? 'Skadet ledeskinne' : null,
    })),
  )
  const { error: lukeFeil } = await supabase.from('roykluke_luker').insert(luker)
  if (lukeFeil) throw lukeFeil
}

async function lagBrannalarm(anleggId: string) {
  const { error } = await supabase.from('anleggsdata_brannalarm').upsert({
    anlegg_id: anleggId,
    leverandor: 'Autronica',
    sentraltype: 'BS-420',
    brannsentral_aktiv: true, brannsentral_antall: 1, brannsentral_type: 'BS-420',
    sloyfer_aktiv: true, sloyfer_antall: 4, sloyfer_type: 'BSD-340',
    optisk_aktiv: true, optisk_antall: 62, optisk_type: 'BH-300',
    vd_aktiv: true, vd_antall: 4, vd_type: 'BV-300',
    mm_aktiv: true, mm_antall: 8, mm_type: 'BF-300',
    klokke_aktiv: true, klokke_antall: 12, klokke_status: 'OK',
    batteri_aktiv: true, batteri_antall: 2, batteri_type: '24Ah',
    kraftforsyning_aktiv: true, kraftforsyning_antall: 1,
    dorstyring_aktiv: true, dorstyring_antall: 6, dorstyring_status: 'OK',
    heis_aktiv: true, heis_antall: 1, heis_status: 'OK',
    vent_aktiv: true, vent_antall: 2, vent_status: 'OK',
  }, { onConflict: 'anlegg_id' })
  if (error) throw error
}

/**
 * Oppretter kunden og de valgte anleggene. Finnes testdataene fra før må de slettes
 * først – to sett ville gjort det uklart hva man faktisk tester mot.
 */
export async function opprettTestdata(valgteModuler: ModulNokkel[], si: Framdrift): Promise<Testdatastatus> {
  const finnes = await hentTestdatastatus()
  if (finnes.kundeId || finnes.anlegg.length > 0) {
    throw new Error('Det finnes testdata fra før. Slett dem først.')
  }

  si('Oppretter testkunde …')
  const { data: kunde, error: kundeFeil } = await supabase
    .from('customer')
    .insert({
      navn: TEST_KUNDENAVN,
      kunde_nummer: TEST_KUNDENUMMER,
      organisasjonsnummer: '999 999 999',
      type: 'Bedrift',
      status: 'aktiv',
      er_testdata: true,
    })
    .select('id')
    .single()
  if (kundeFeil) throw kundeFeil

  const opprettede: { id: string; navn: string }[] = []

  for (const mal of TESTANLEGG) {
    si(`Oppretter ${mal.navn} …`)
    const { data: anlegg, error } = await supabase
      .from('anlegg')
      .insert({
        anleggsnavn: mal.navn,
        kundenr: kunde.id,
        kunde_nummer: TEST_KUNDENUMMER,
        adresse: mal.adresse,
        postnummer: mal.postnummer,
        poststed: mal.poststed,
        kontroll_maaned: mal.kontrollMaaned,
        kontroll_type: mal.kontrollType,
        er_leilighetsbygg: mal.erLeilighetsbygg,
        status: 'aktiv',
        er_testdata: true,
      })
      .select('id')
      .single()
    if (error) throw error
    opprettede.push({ id: anlegg.id, navn: mal.navn })

    const skalHa = (m: ModulNokkel) => mal.moduler.includes(m) && valgteModuler.includes(m)

    if (skalHa('kontaktpersoner')) {
      const { data: bruker } = await supabase.auth.getUser()
      const { data: kontakt, error: kFeil } = await supabase
        .from('kontaktpersoner')
        .insert({
          navn: mal.kontaktNavn,
          // Går post ut under test, skal den til den som tester – ikke til en fremmed
          epost: bruker.user?.email ?? null,
          telefon: '99 99 99 99',
          rolle: 'Driftsansvarlig',
          anlegg_id: anlegg.id,
          primar: true,
        })
        .select('id')
        .single()
      if (kFeil) throw kFeil
      await supabase.from('anlegg_kontaktpersoner').insert({ anlegg_id: anlegg.id, kontaktperson_id: kontakt.id, primar: true })
    }

    if (skalHa('brannalarm')) await lagBrannalarm(anlegg.id)

    if (skalHa('nodlys')) {
      const { error: e } = await supabase.from('anleggsdata_nodlys').insert(nodlysrader(anlegg.id, TEST_KUNDENAVN))
      if (e) throw e
    }

    if (skalHa('slukkeutstyr')) {
      const { error: e1 } = await supabase.from('anleggsdata_brannslukkere').insert(slukkerader(anlegg.id))
      if (e1) throw e1
      const { error: e2 } = await supabase.from('anleggsdata_brannslanger').insert(slangerader(anlegg.id, TEST_KUNDENAVN))
      if (e2) throw e2
    }

    if (skalHa('roykluker')) await lagRoykluker(anlegg.id)

    if (skalHa('forstehjelp')) {
      const { error: e } = await supabase.from('anleggsdata_forstehjelp').insert(forstehjelprader(anlegg.id, TEST_KUNDENAVN))
      if (e) throw e
    }
  }

  si('Ferdig.')
  return { kundeId: kunde.id, anlegg: opprettede }
}

export interface Slettresultat {
  anlegg: number
  kunder: number
  tabeller: Record<string, number>
  filer: number
}

/**
 * Sletter alt som er merket som testdata – rader via databasefunksjonen, og filene
 * i storage her, siden Postgres ikke når dem.
 *
 * Dropbox-mappen står igjen med vilje. Å slette en mappe med innhold er ikke noe
 * en app skal gjøre på eget initiativ; stien vises i stedet, så den kan fjernes
 * manuelt hvis testen har lagt igjen filer der.
 */
export async function slettTestdata(si: Framdrift): Promise<Slettresultat> {
  const status = await hentTestdatastatus()

  si('Fjerner filer fra lagring …')
  let filer = 0
  for (const a of status.anlegg) {
    for (const mappe of ['dokumenter', 'bilder', 'servicerapporter']) {
      const { data } = await supabase.storage.from('anlegg.dokumenter').list(`anlegg/${a.id}/${mappe}`, { limit: 1000 })
      const stier = (data ?? []).filter(f => f.name && !f.name.startsWith('.')).map(f => `anlegg/${a.id}/${mappe}/${f.name}`)
      if (stier.length > 0) {
        await supabase.storage.from('anlegg.dokumenter').remove(stier)
        filer += stier.length
      }
    }
  }

  si('Sletter rader …')
  const { data, error } = await supabase.rpc('slett_testdata')
  if (error) throw error

  const res = data as unknown as { anlegg: number; kunder: number; tabeller: Record<string, number> }
  si('Ferdig.')
  return { ...res, filer }
}

/** Dropbox-mappen testdataene eventuelt har lagt filer i. Slettes manuelt. */
export const TEST_DROPBOX_MAPPE = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${TEST_KUNDENUMMER}_${TEST_KUNDENAVN}`
