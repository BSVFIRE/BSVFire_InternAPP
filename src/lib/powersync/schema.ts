/**
 * Lokalt SQLite-skjema for PowerSync. Kolonnenavnene må matche Postgres.
 * Typer: text / integer / real. Booleans lagres som 0/1, arrays og json som tekst.
 * Tabeller legges til her etter hvert som moduler bygges om (pilot: nødlys).
 */
import { column, Schema, Table } from '@powersync/web'

const customer = new Table({
  navn: column.text,
  kunde_nummer: column.text,
  organisasjonsnummer: column.text,
  type: column.text,
  status: column.text,
  skjult: column.integer,
  kontaktperson_id: column.text,
  primaer_kontaktperson_id: column.text,
  opprettet: column.text,
  sist_oppdatert: column.text,
})

const anlegg = new Table({
  anleggsnavn: column.text,
  kundenr: column.text,
  adresse: column.text,
  postnummer: column.text,
  poststed: column.text,
  kontroll_maaned: column.text,
  kontroll_status: column.text,
  kontroll_type: column.text, // json-array
  ansvarlig_tekniker_id: column.text,
  status: column.text,
  skjult: column.integer,
  nodlys_fullfort: column.integer,
  brannalarm_fullfort: column.integer,
  slukkeutstyr_fullfort: column.integer,
  roykluker_fullfort: column.integer,
  forstehjelp_fullfort: column.integer,
  ekstern_fullfort: column.integer,
  antall_etasjer: column.integer,
  unik_kode: column.text,
  sist_oppdatert: column.text,
}, { indexes: { kunde: ['kundenr'] } })

const anleggsdata_nodlys = new Table({
  anlegg_id: column.text,
  internnummer: column.text,
  amatur_id: column.text,
  fordeling: column.text,
  kurs: column.text,
  bygg: column.text,
  etasje: column.text,
  type: column.text,
  produsent: column.text,
  plassering: column.text,
  status: column.text,
  kontrollert: column.integer,
  batteritype: column.text,
  notat: column.text,
  kundenavn: column.text,
  opprettet_dato: column.text,
  sist_oppdatert: column.text,
}, { indexes: { anlegg: ['anlegg_id'] } })

export const AppSchema = new Schema({ customer, anlegg, anleggsdata_nodlys })
export type Database = (typeof AppSchema)['types']
