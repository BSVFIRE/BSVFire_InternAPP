/**
 * Delte felter og hjelpere for «Nytt anlegg»-dialogen og redigeringssiden.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Check, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { KONTROLLTYPER, MAANEDER } from '@/lib/constants'
import { Combobox } from '@/components/ui/Combobox'
import { GoogleMapsAddressAutocomplete } from '@/components/GoogleMapsAddressAutocomplete'

export interface KundeValg {
  id: string
  navn: string | null
  kunde_nummer: string | null
  organisasjonsnummer: string | null
}

export interface AnsattValg {
  id: string
  navn: string | null
}

export interface EksternKontaktValg {
  id: string
  navn: string
  firma: string | null
  ekstern_type: string | null
  telefon: string | null
  epost: string | null
}

/** Feltene som redigeres. Speiler kolonnene på `anlegg` som skjemaet eier. */
export interface AnleggSkjemaVerdier {
  anleggsnavn: string
  kundenr: string
  adresse: string
  postnummer: string
  poststed: string
  kontroll_type: string[]
  kontroll_maaned: string
  ansvarlig_tekniker_id: string
  er_leilighetsbygg: boolean
  antall_etasjer: string
  ekstern_kontaktperson_id: string
  ekstern_type: string
  unik_kode: string
  kontrollportal_url: string
  fg_database_registrert: boolean
  skjult: boolean
}

export const TOMT_SKJEMA: AnleggSkjemaVerdier = {
  anleggsnavn: '', kundenr: '', adresse: '', postnummer: '', poststed: '',
  kontroll_type: [], kontroll_maaned: '', ansvarlig_tekniker_id: '',
  er_leilighetsbygg: false, antall_etasjer: '',
  ekstern_kontaktperson_id: '', ekstern_type: '',
  unik_kode: '', kontrollportal_url: '', fg_database_registrert: false, skjult: false,
}

export function validerAnlegg(v: AnleggSkjemaVerdier): Partial<Record<keyof AnleggSkjemaVerdier, string>> {
  const feil: Partial<Record<keyof AnleggSkjemaVerdier, string>> = {}
  if (!v.anleggsnavn.trim()) feil.anleggsnavn = 'Anleggsnavn må fylles ut'
  if (!v.kundenr) feil.kundenr = 'Velg en kunde'
  if (v.postnummer && !/^\d{4}$/.test(v.postnummer.trim())) feil.postnummer = 'Postnummer er fire siffer'
  if (v.antall_etasjer && (!/^\d+$/.test(v.antall_etasjer) || Number(v.antall_etasjer) < 1)) feil.antall_etasjer = 'Oppgi et tall'
  if (v.kontrollportal_url && !/^https?:\/\//.test(v.kontrollportal_url)) feil.kontrollportal_url = 'Må starte med http:// eller https://'
  return feil
}

/** Bygger update/insert-payload til `anlegg` fra skjemaverdiene. */
export function tilAnleggRad(v: AnleggSkjemaVerdier, ekstern?: EksternKontaktValg | null) {
  const harEkstern = v.kontroll_type.includes('Ekstern')
  return {
    anleggsnavn: v.anleggsnavn.trim(),
    kundenr: v.kundenr,
    adresse: v.adresse.trim() || null,
    postnummer: v.postnummer.trim() || null,
    poststed: v.poststed.trim() || null,
    kontroll_type: v.kontroll_type.length ? v.kontroll_type : null,
    kontroll_maaned: v.kontroll_maaned || null,
    ansvarlig_tekniker_id: v.ansvarlig_tekniker_id || null,
    er_leilighetsbygg: v.er_leilighetsbygg,
    antall_etasjer: v.er_leilighetsbygg && v.antall_etasjer ? Number(v.antall_etasjer) : null,
    ekstern_kontaktperson_id: harEkstern ? v.ekstern_kontaktperson_id || null : null,
    ekstern_type: harEkstern ? (ekstern?.ekstern_type ?? v.ekstern_type) || null : null,
    ekstern_firma: harEkstern ? ekstern?.firma ?? null : null,
    ekstern_kontaktperson: harEkstern ? ekstern?.navn ?? null : null,
    ekstern_telefon: harEkstern ? ekstern?.telefon ?? null : null,
    ekstern_epost: harEkstern ? ekstern?.epost ?? null : null,
    unik_kode: v.unik_kode.trim() || null,
    kontrollportal_url: v.kontrollportal_url.trim() || null,
    fg_database_registrert: v.fg_database_registrert,
    skjult: v.skjult,
  }
}

/** Henter valglistene skjemaet trenger (kunder, ansatte, eksterne kontakter) i én runde. */
export function useSkjemaValg() {
  const [kunder, setKunder] = useState<KundeValg[]>([])
  const [ansatte, setAnsatte] = useState<AnsattValg[]>([])
  const [eksterne, setEksterne] = useState<EksternKontaktValg[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([
      db.from('customer').select('id, navn, kunde_nummer, organisasjonsnummer').or('skjult.is.null,skjult.eq.false').order('navn'),
      db.from('ansatte').select('id, navn').order('navn'),
      db.from('kontaktperson_ekstern').select('id, navn, firma, ekstern_type, telefon, epost').order('navn'),
    ]).then(([k, a, e]) => {
      setKunder(k.data ?? []); setAnsatte(a.data ?? []); setEksterne(e.data ?? [])
      setLoading(false)
    })
  }, [])
  return { kunder, ansatte, eksterne, loading }
}

// ---------- Felt-primitiver ----------

export function Felt({ id, label, pakrevd, feil, hint, children }: { id?: string; label: string; pakrevd?: boolean; feil?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>{pakrevd && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {feil ? <p className="text-xs text-red-600 dark:text-red-400">{feil}</p> : hint ? <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  )
}

export function KontrolltypeChips({ valgt, onChange }: { valgt: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Kontrolltyper">
      {KONTROLLTYPER.map(t => {
        const on = valgt.includes(t)
        return (
          <button key={t} type="button" aria-pressed={on} onClick={() => onChange(on ? valgt.filter(x => x !== t) : [...valgt, t])}
            className={cn('inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full border text-sm transition-colors',
              on ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>
            {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}{t}
          </button>
        )
      })}
    </div>
  )
}

export function KundeVelger({ verdi, kunder, onChange, feil }: { verdi: string; kunder: KundeValg[]; onChange: (id: string) => void; feil?: string }) {
  const [bytter, setBytter] = useState(!verdi)
  const valgt = kunder.find(k => k.id === verdi)
  useEffect(() => { if (!verdi) setBytter(true) }, [verdi])

  if (valgt && !bytter) {
    return (
      <Felt label="Kunde" pakrevd hint={<>Kundenummer og org.nr. hentes fra kunden. <Link to="/kunder" state={{ viewKundeId: valgt.id }} className="text-primary hover:underline">Rediger kunde</Link></>}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-dark-100">
          <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-900 dark:text-white truncate">{valgt.navn}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
              {[valgt.kunde_nummer ? `Kundenr. ${valgt.kunde_nummer}` : 'Mangler kundenummer', valgt.organisasjonsnummer ? `Org.nr. ${valgt.organisasjonsnummer}` : null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <button type="button" onClick={() => setBytter(true)} className="text-sm text-primary hover:underline">Bytt kunde</button>
        </div>
      </Felt>
    )
  }

  return (
    <Felt label="Kunde" pakrevd feil={feil} hint={<>Finner du ikke kunden? <Link to="/kunder?new=true" className="text-primary hover:underline">Opprett ny kunde</Link></>}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <Combobox
            options={kunder.map(k => ({ id: k.id, label: k.navn ?? '(uten navn)', sublabel: [k.kunde_nummer, k.organisasjonsnummer].filter(Boolean).join(' · ') || undefined }))}
            value={verdi}
            onChange={id => { onChange(id); setBytter(false) }}
            placeholder="Velg kunde…"
            searchPlaceholder="Søk på navn, kundenr. eller org.nr…"
          />
        </div>
        {valgt && <button type="button" onClick={() => setBytter(false)} aria-label="Avbryt kundebytte" className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-500 flex items-center justify-center"><X className="w-4 h-4" /></button>}
      </div>
    </Felt>
  )
}

export function AdresseFelter({ verdier, feil, onChange }: { verdier: AnleggSkjemaVerdier; feil: Partial<Record<keyof AnleggSkjemaVerdier, string>>; onChange: (patch: Partial<AnleggSkjemaVerdier>) => void }) {
  return (
    <>
      <Felt id="anlegg-adresse" label="Adresse" hint="Begynn å skrive – postnummer og sted fylles ut automatisk">
        <GoogleMapsAddressAutocomplete
          value={verdier.adresse}
          onChange={adresse => onChange({ adresse })}
          onAddressSelect={c => onChange({ adresse: c.adresse, postnummer: c.postnummer, poststed: c.poststed })}
          placeholder="Søk adresse…"
        />
      </Felt>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Felt id="anlegg-postnr" label="Postnr." feil={feil.postnummer}>
          <input id="anlegg-postnr" value={verdier.postnummer} onChange={e => onChange({ postnummer: e.target.value })} inputMode="numeric" maxLength={4} className="input" />
        </Felt>
        <Felt id="anlegg-poststed" label="Poststed">
          <input id="anlegg-poststed" value={verdier.poststed} onChange={e => onChange({ poststed: e.target.value })} className="input" />
        </Felt>
      </div>
    </>
  )
}

export function KontrollFelter({ verdier, ansatte, onChange, visStatusHint }: { verdier: AnleggSkjemaVerdier; ansatte: AnsattValg[]; onChange: (patch: Partial<AnleggSkjemaVerdier>) => void; visStatusHint?: boolean }) {
  return (
    <>
      <Felt label="Kontrolltyper">
        <KontrolltypeChips valgt={verdier.kontroll_type} onChange={kontroll_type => onChange({ kontroll_type })} />
      </Felt>
      <div className="grid sm:grid-cols-2 gap-3">
        <Felt id="anlegg-maaned" label="Kontrollmåned">
          <select id="anlegg-maaned" value={verdier.kontroll_maaned} onChange={e => onChange({ kontroll_maaned: e.target.value })} className="input">
            <option value="">Velg…</option>
            {MAANEDER.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Felt>
        <Felt id="anlegg-tekniker" label="Ansvarlig tekniker">
          <select id="anlegg-tekniker" value={verdier.ansvarlig_tekniker_id} onChange={e => onChange({ ansvarlig_tekniker_id: e.target.value })} className="input">
            <option value="">Ikke satt</option>
            {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        </Felt>
      </div>
      {visStatusHint && <p className="text-xs text-gray-500 dark:text-gray-400">Kontrollstatus og «utført» per type settes på anleggets side, ikke her.</p>}
    </>
  )
}

export function EksternFelter({ verdier, eksterne, onChange }: { verdier: AnleggSkjemaVerdier; eksterne: EksternKontaktValg[]; onChange: (patch: Partial<AnleggSkjemaVerdier>) => void }) {
  const valgt = eksterne.find(e => e.id === verdier.ekstern_kontaktperson_id)
  return (
    <>
      <Felt label="Ekstern kontakt" hint={<><Link to="/ekstern-kontaktpersoner" className="text-primary hover:underline">Administrer eksterne kontaktpersoner</Link></>}>
        <Combobox
          options={eksterne.map(e => ({ id: e.id, label: e.navn, sublabel: [e.firma, e.ekstern_type].filter(Boolean).join(' · ') || undefined }))}
          value={verdier.ekstern_kontaktperson_id}
          onChange={id => onChange({ ekstern_kontaktperson_id: id, ekstern_type: eksterne.find(e => e.id === id)?.ekstern_type ?? verdier.ekstern_type })}
          placeholder="Velg ekstern kontakt…"
          searchPlaceholder="Søk på navn, firma eller type…"
        />
      </Felt>
      {valgt ? (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
          <div><span className="text-gray-900 dark:text-white font-medium">{valgt.navn}</span>{valgt.firma ? ` · ${valgt.firma}` : ''}</div>
          <div>{[valgt.ekstern_type, valgt.telefon, valgt.epost].filter(Boolean).join(' · ')}</div>
        </div>
      ) : (
        <Felt id="anlegg-ekstern-type" label="Type tjeneste" hint="Fylles automatisk fra kontakten hvis du velger en">
          <input id="anlegg-ekstern-type" value={verdier.ekstern_type} onChange={e => onChange({ ekstern_type: e.target.value })} className="input" placeholder="Sprinkler, heis, …" />
        </Felt>
      )}
    </>
  )
}
