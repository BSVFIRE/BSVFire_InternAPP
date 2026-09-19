/**
 * Felles skjemafelter for ordre («Ny ordre» og Rediger).
 * Anlegg velges med søk på tvers av alle anlegg (kunde følger med), kontrolltyper hentes fra anlegget.
 */
import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ORDRE_STATUSER } from '@/lib/constants'
import { Combobox } from '@/components/ui/Combobox'

export const ORDRETYPER = ['Service', 'Kontroll', 'Reparasjon', 'Installasjon', 'Befaring'] as const

export interface OrdreSkjemaVerdier { type: string; anlegg_id: string; kundenr: string; tekniker_id: string; kontrolltype: string[]; kommentar: string; status: string }
export const TOMT_ORDRESKJEMA: OrdreSkjemaVerdier = { type: '', anlegg_id: '', kundenr: '', tekniker_id: '', kontrolltype: [], kommentar: '', status: ORDRE_STATUSER.NY }

export function validerOrdre(v: OrdreSkjemaVerdier): Partial<Record<keyof OrdreSkjemaVerdier, string>> {
  const feil: Partial<Record<keyof OrdreSkjemaVerdier, string>> = {}
  if (!v.type) feil.type = 'Velg ordretype'
  if (!v.anlegg_id) feil.anlegg_id = 'Velg anlegg'
  return feil
}

export function tilOrdreRad(v: OrdreSkjemaVerdier) {
  return { type: v.type, anlegg_id: v.anlegg_id || null, kundenr: v.kundenr || null, tekniker_id: v.tekniker_id || null, kontrolltype: v.kontrolltype.length ? v.kontrolltype : null, kommentar: v.kommentar.trim() || null, status: v.status }
}

export interface AnleggValg { id: string; anleggsnavn: string | null; kundenr: string | null; kunde: string; adresse: string | null; poststed: string | null; kontroll_type: string[] | null }
export interface AnsattValg { id: string; navn: string | null }

/** Anlegg (med kundenavn) og ansatte – grunnlaget begge skjemaene trenger. */
export function useOrdreGrunnlag() {
  const [anlegg, setAnlegg] = useState<AnleggValg[]>([])
  const [ansatte, setAnsatte] = useState<AnsattValg[]>([])
  const [klar, setKlar] = useState(false)
  useEffect(() => {
    Promise.all([
      db.from('anlegg').select('id, anleggsnavn, kundenr, adresse, poststed, kontroll_type, customer:kundenr(navn)').or('skjult.is.null,skjult.eq.false').order('anleggsnavn'),
      db.from('ansatte').select('id, navn').order('navn'),
    ]).then(([a, an]) => {
      setAnlegg((a.data ?? []).map(x => ({ ...x, kunde: (x.customer as { navn: string | null } | null)?.navn ?? 'Ukjent kunde' })))
      setAnsatte(an.data ?? [])
      setKlar(true)
    })
  }, [])
  return { anlegg, ansatte, klar }
}

export function OrdreFelter({ verdier, feil, onChange, anlegg, ansatte, laasAnlegg }: {
  verdier: OrdreSkjemaVerdier
  feil: Partial<Record<keyof OrdreSkjemaVerdier, string>>
  onChange: (patch: Partial<OrdreSkjemaVerdier>) => void
  anlegg: AnleggValg[]
  ansatte: AnsattValg[]
  /** Ved redigering: anlegg kan ikke byttes uten å låse opp */
  laasAnlegg?: boolean
}) {
  const [laast, setLaast] = useState(Boolean(laasAnlegg))
  const valgt = anlegg.find(a => a.id === verdier.anlegg_id)
  const typer = valgt?.kontroll_type ?? []

  function velgAnlegg(id: string) {
    const a = anlegg.find(x => x.id === id)
    onChange({ anlegg_id: id, kundenr: a?.kundenr ?? '', kontrolltype: a?.kontroll_type ?? [] })
  }

  return (
    <>
      <Felt label="Ordretype" feil={feil.type}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ordretype">
          {ORDRETYPER.map(t => (
            <button key={t} type="button" role="radio" aria-checked={verdier.type === t} onClick={() => onChange({ type: t })}
              className={cn('h-9 px-3.5 rounded-full border text-sm transition-colors', verdier.type === t ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400', feil.type && !verdier.type && 'border-red-400')}>{t}</button>
          ))}
        </div>
      </Felt>

      <Felt label="Anlegg" feil={feil.anlegg_id} hjelp={valgt ? [valgt.kunde, [valgt.adresse, valgt.poststed].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : 'Søk på anleggsnavn eller kunde.'}>
        {laast && valgt ? (
          <div className="flex items-center justify-between gap-3 input !h-auto py-2">
            <span className="text-sm text-gray-900 dark:text-white truncate">{valgt.anleggsnavn}</span>
            <button type="button" onClick={() => setLaast(false)} className="text-xs text-primary hover:underline flex-shrink-0">Bytt anlegg</button>
          </div>
        ) : (
          <Combobox options={anlegg.map(a => ({ id: a.id, label: a.anleggsnavn ?? '(uten navn)', sublabel: [a.kunde, a.poststed].filter(Boolean).join(' · ') }))} value={verdier.anlegg_id} onChange={velgAnlegg} placeholder="Velg anlegg…" searchPlaceholder="Søk anlegg eller kunde…" />
        )}
      </Felt>

      {typer.length > 0 && (
        <Felt label="Kontrolltyper" hjelp="Forhåndsvalgt fra anlegget – fjern det som ikke gjelder denne ordren.">
          <div className="flex flex-wrap gap-2">
            {typer.map(t => {
              const paa = verdier.kontrolltype.includes(t)
              return <button key={t} type="button" aria-pressed={paa} onClick={() => onChange({ kontrolltype: paa ? verdier.kontrolltype.filter(x => x !== t) : [...verdier.kontrolltype, t] })} className={cn('h-8 px-3 rounded-full border text-sm', paa ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 line-through')}>{t}</button>
            })}
          </div>
        </Felt>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Felt label="Tekniker" hjelp="Tekniker får Telegram-varsel når ordren tildeles.">
          <select value={verdier.tekniker_id} onChange={e => onChange({ tekniker_id: e.target.value })} className="input" aria-label="Tekniker">
            <option value="">Ikke tildelt</option>
            {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        </Felt>
        <Felt label="Status">
          <select value={verdier.status} onChange={e => onChange({ status: e.target.value })} className="input" aria-label="Status">
            {Object.values(ORDRE_STATUSER).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Felt>
      </div>

      <Felt label="Kommentar">
        <textarea value={verdier.kommentar} onChange={e => onChange({ kommentar: e.target.value })} rows={4} className="input !h-auto" placeholder="Hva skal gjøres, hvem har meldt inn, avtalt tid …" />
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
