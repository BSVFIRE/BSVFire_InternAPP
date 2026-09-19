/**
 * Felles skjemafelter for oppgave («Ny oppgave» og Rediger).
 */
import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { OPPGAVE_STATUSER, PRIORITETER } from '@/lib/constants'
import { Combobox } from '@/components/ui/Combobox'
import { useOrdreGrunnlag, type AnleggValg, type AnsattValg } from '@/pages/ordre/ordreSkjema'

export const OPPGAVETYPER = ['Faktura', 'Regnskap', 'Internt', 'Bestilling', 'Befaring', 'FG-Registrering', 'Dokumentasjon', 'DAC Underlag', 'Oppfølging'] as const

export interface OppgaveSkjemaVerdier { type: string; tittel: string; anlegg_id: string; kunde_id: string; tekniker_id: string; kontaktperson: string; prioritet: string; status: string; forfallsdato: string; beskrivelse: string }

export function standardForfall(dager = 14): string { const d = new Date(); d.setDate(d.getDate() + dager); return d.toISOString().slice(0, 10) }
export const TOMT_OPPGAVESKJEMA: OppgaveSkjemaVerdier = { type: '', tittel: '', anlegg_id: '', kunde_id: '', tekniker_id: '', kontaktperson: '', prioritet: PRIORITETER.MEDIUM, status: OPPGAVE_STATUSER.IKKE_PABEGYNT, forfallsdato: standardForfall(), beskrivelse: '' }

export function validerOppgave(v: OppgaveSkjemaVerdier): Partial<Record<keyof OppgaveSkjemaVerdier, string>> {
  const feil: Partial<Record<keyof OppgaveSkjemaVerdier, string>> = {}
  if (!v.type) feil.type = 'Velg type'
  if (!v.tittel.trim() && !v.beskrivelse.trim()) feil.tittel = 'Skriv en tittel eller beskrivelse'
  return feil
}

export function tilOppgaveRad(v: OppgaveSkjemaVerdier) {
  return {
    type: v.type, tittel: v.tittel.trim() || null, anlegg_id: v.anlegg_id || null, kunde_id: v.kunde_id || null, tekniker_id: v.tekniker_id || null,
    kontaktperson: v.kontaktperson || null, prioritet: v.prioritet || null, status: v.status, beskrivelse: v.beskrivelse.trim() || null,
    forfallsdato: v.forfallsdato ? new Date(v.forfallsdato + 'T12:00:00').toISOString() : null,
  }
}

export { useOrdreGrunnlag as useOppgaveGrunnlag }

const PRI: Record<string, string> = { [PRIORITETER.HOY]: 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', [PRIORITETER.MEDIUM]: 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', [PRIORITETER.LAV]: 'border-gray-400 bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-300' }

export function OppgaveFelter({ verdier, feil, onChange, anlegg, ansatte, autoFocus }: {
  verdier: OppgaveSkjemaVerdier
  feil: Partial<Record<keyof OppgaveSkjemaVerdier, string>>
  onChange: (patch: Partial<OppgaveSkjemaVerdier>) => void
  anlegg: AnleggValg[]
  ansatte: AnsattValg[]
  autoFocus?: boolean
}) {
  const [kontakter, setKontakter] = useState<{ id: string; navn: string | null; rolle: string | null }[]>([])
  const valgtAnlegg = anlegg.find(a => a.id === verdier.anlegg_id)
  const intern = verdier.type === 'Internt'

  useEffect(() => {
    if (!verdier.anlegg_id) { setKontakter([]); return }
    db.from('anlegg_kontaktpersoner').select('kontaktpersoner(id, navn, rolle)').eq('anlegg_id', verdier.anlegg_id)
      .then(({ data }) => setKontakter((data ?? []).map(x => x.kontaktpersoner as unknown as { id: string; navn: string | null; rolle: string | null } | null).filter((k): k is { id: string; navn: string | null; rolle: string | null } => Boolean(k))))
  }, [verdier.anlegg_id])

  return (
    <>
      <Felt label="Type" feil={feil.type}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Oppgavetype">
          {OPPGAVETYPER.map(t => (
            <button key={t} type="button" role="radio" aria-checked={verdier.type === t} onClick={() => onChange({ type: t, ...(t === 'Internt' ? { anlegg_id: '', kunde_id: '', kontaktperson: '' } : {}) })}
              className={cn('h-9 px-3.5 rounded-full border text-sm transition-colors', verdier.type === t ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{t}</button>
          ))}
        </div>
      </Felt>

      <Felt label="Tittel" feil={feil.tittel}>
        <input value={verdier.tittel} onChange={e => onChange({ tittel: e.target.value })} className="input" placeholder="Kort hva som skal gjøres" autoFocus={autoFocus} aria-label="Tittel" />
      </Felt>

      {!intern && (
        <Felt label="Anlegg" hjelp={valgtAnlegg ? `${valgtAnlegg.kunde}${valgtAnlegg.poststed ? ` · ${valgtAnlegg.poststed}` : ''}` : 'Valgfritt. Søk på anleggsnavn eller kunde.'}>
          <Combobox options={anlegg.map(a => ({ id: a.id, label: a.anleggsnavn ?? '(uten navn)', sublabel: [a.kunde, a.poststed].filter(Boolean).join(' · ') }))} value={verdier.anlegg_id} onChange={id => onChange({ anlegg_id: id, kunde_id: anlegg.find(a => a.id === id)?.kundenr ?? '', kontaktperson: '' })} placeholder="Ingen anlegg" searchPlaceholder="Søk anlegg eller kunde…" />
        </Felt>
      )}

      {!intern && kontakter.length > 0 && (
        <Felt label="Kontaktperson">
          <select value={verdier.kontaktperson} onChange={e => onChange({ kontaktperson: e.target.value })} className="input" aria-label="Kontaktperson">
            <option value="">Ingen</option>
            {kontakter.map(k => <option key={k.id} value={k.id}>{k.navn}{k.rolle ? ` (${k.rolle})` : ''}</option>)}
          </select>
        </Felt>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Felt label="Ansvarlig" hjelp="Får Telegram-varsel når oppgaven tildeles.">
          <select value={verdier.tekniker_id} onChange={e => onChange({ tekniker_id: e.target.value })} className="input" aria-label="Ansvarlig">
            <option value="">Ikke tildelt</option>
            {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        </Felt>
        <Felt label="Prioritet">
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Prioritet">
            {[PRIORITETER.HOY, PRIORITETER.MEDIUM, PRIORITETER.LAV].map(p => (
              <button key={p} type="button" role="radio" aria-checked={verdier.prioritet === p} onClick={() => onChange({ prioritet: p })} className={cn('h-10 rounded-lg border text-sm font-medium transition-colors', verdier.prioritet === p ? PRI[p] : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400')}>{p}</button>
            ))}
          </div>
        </Felt>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Felt label="Frist">
          <input type="date" value={verdier.forfallsdato} onChange={e => onChange({ forfallsdato: e.target.value })} className="input" aria-label="Frist" />
          <div className="flex gap-1.5 mt-1.5">
            {[['I dag', 0], ['+1 uke', 7], ['+2 uker', 14], ['+1 mnd', 30]].map(([t, d]) => <button key={t} type="button" onClick={() => onChange({ forfallsdato: standardForfall(d as number) })} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary">{t}</button>)}
          </div>
        </Felt>
        <Felt label="Status">
          <select value={verdier.status} onChange={e => onChange({ status: e.target.value })} className="input" aria-label="Status">
            {Object.values(OPPGAVE_STATUSER).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Felt>
      </div>

      <Felt label="Beskrivelse">
        <textarea value={verdier.beskrivelse} onChange={e => onChange({ beskrivelse: e.target.value })} rows={4} className="input !h-auto" placeholder="Detaljer, hva som er avtalt, referanser …" />
      </Felt>
    </>
  )
}

function Felt({ label, feil, hjelp, children }: { label: string; feil?: string; hjelp?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      {children}
      {feil ? <p className="text-xs text-red-600 dark:text-red-400">{feil}</p> : hjelp ? <p className="text-xs text-gray-500 dark:text-gray-400">{hjelp}</p> : null}
    </div>
  )
}
