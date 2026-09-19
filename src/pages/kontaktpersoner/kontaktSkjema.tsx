/**
 * Felles skjemafelter for kontaktperson (brukes av «Ny kontaktperson» og Rediger).
 */
import { Building2, Mail, Phone, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface KontaktSkjemaVerdier { navn: string; epost: string; telefon: string; rolle: string }
export const TOMT_KONTAKTSKJEMA: KontaktSkjemaVerdier = { navn: '', epost: '', telefon: '', rolle: '' }

export function validerKontakt(v: KontaktSkjemaVerdier): Partial<Record<keyof KontaktSkjemaVerdier, string>> {
  const feil: Partial<Record<keyof KontaktSkjemaVerdier, string>> = {}
  if (!v.navn.trim()) feil.navn = 'Navn er påkrevd'
  if (v.epost.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.epost.trim())) feil.epost = 'Ugyldig e-postadresse'
  return feil
}

export function tilKontaktRad(v: KontaktSkjemaVerdier) {
  return { navn: v.navn.trim(), epost: v.epost.trim() || null, telefon: v.telefon.trim() || null, rolle: v.rolle.trim() || null }
}

/** Forbokstaver til avatar («Ola Nordmann» → «ON») */
export function initialer(navn: string | null | undefined): string {
  return (navn ?? '?').split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 3).toUpperCase() || '?'
}

const ROLLER = ['Daglig leder', 'Vaktmester', 'Driftsleder', 'Styreleder', 'Brannvernleder', 'Eier', 'Resepsjon']

export function KontaktFelter({ verdier, feil, onChange, autoFocus }: {
  verdier: KontaktSkjemaVerdier
  feil: Partial<Record<keyof KontaktSkjemaVerdier, string>>
  onChange: (patch: Partial<KontaktSkjemaVerdier>) => void
  autoFocus?: boolean
}) {
  return (
    <>
      <Felt id="kp-navn" label="Navn" feil={feil.navn} ikon={<User />}>
        <input id="kp-navn" value={verdier.navn} onChange={e => onChange({ navn: e.target.value })} className={cn('input pl-9', feil.navn && '!border-red-500')} placeholder="Fornavn Etternavn" autoFocus={autoFocus} required autoComplete="off" />
      </Felt>
      <div className="grid sm:grid-cols-2 gap-4">
        <Felt id="kp-telefon" label="Telefon" feil={feil.telefon} ikon={<Phone />}>
          <input id="kp-telefon" type="tel" value={verdier.telefon} onChange={e => onChange({ telefon: e.target.value })} className="input pl-9" placeholder="900 00 000" autoComplete="off" />
        </Felt>
        <Felt id="kp-epost" label="E-post" feil={feil.epost} ikon={<Mail />}>
          <input id="kp-epost" type="email" value={verdier.epost} onChange={e => onChange({ epost: e.target.value })} className={cn('input pl-9', feil.epost && '!border-red-500')} placeholder="navn@firma.no" autoComplete="off" />
        </Felt>
      </div>
      <Felt id="kp-rolle" label="Rolle" feil={feil.rolle} ikon={<Building2 />} hjelp="Hva personen er hos kunden – vises i lister og på anlegget.">
        <input id="kp-rolle" list="kp-roller" value={verdier.rolle} onChange={e => onChange({ rolle: e.target.value })} className="input pl-9" placeholder="F.eks. Vaktmester" autoComplete="off" />
        <datalist id="kp-roller">{ROLLER.map(r => <option key={r} value={r} />)}</datalist>
      </Felt>
    </>
  )
}

function Felt({ id, label, feil, hjelp, ikon, children }: { id: string; label: string; feil?: string; hjelp?: string; ikon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-white">{label}</label>
      <div className="relative [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-gray-400 [&>svg]:pointer-events-none">{ikon}{children}</div>
      {feil ? <p className="text-xs text-red-600 dark:text-red-400">{feil}</p> : hjelp ? <p className="text-xs text-gray-500 dark:text-gray-400">{hjelp}</p> : null}
    </div>
  )
}
