/**
 * Delte felter for «Ny kunde»-dialogen og redigeringssiden.
 */
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Building2, Loader2, Plus, Search } from 'lucide-react'
import { db } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { searchCompaniesByName, getCompanyByOrgNumber, formatOrgNumber, type BrregEnhet } from '@/lib/brregApi'
import { Combobox } from '@/components/ui/Combobox'
import { Button } from '@/components/ui/Button'

export interface KundeSkjemaVerdier {
  navn: string
  organisasjonsnummer: string
  kunde_nummer: string
  kontaktperson_id: string
}

export const TOMT_KUNDESKJEMA: KundeSkjemaVerdier = { navn: '', organisasjonsnummer: '', kunde_nummer: '', kontaktperson_id: '' }

export function validerKunde(v: KundeSkjemaVerdier): Partial<Record<keyof KundeSkjemaVerdier, string>> {
  const feil: Partial<Record<keyof KundeSkjemaVerdier, string>> = {}
  if (!v.navn.trim()) feil.navn = 'Kundenavn må fylles ut'
  const org = v.organisasjonsnummer.replace(/\s/g, '')
  if (org && !/^\d{9}$/.test(org)) feil.organisasjonsnummer = 'Organisasjonsnummer er 9 siffer'
  return feil
}

export function tilKundeRad(v: KundeSkjemaVerdier) {
  return {
    navn: v.navn.trim(),
    organisasjonsnummer: v.organisasjonsnummer.replace(/\s/g, '') || null,
    kunde_nummer: v.kunde_nummer.trim() || null,
    kontaktperson_id: v.kontaktperson_id || null,
  }
}

export interface KontaktValg { id: string; navn: string | null; epost: string | null; telefon: string | null }

export function useKontaktpersoner() {
  const [kontakter, setKontakter] = useState<KontaktValg[]>([])
  const last = () => db.from('kontaktpersoner').select('id, navn, epost, telefon').order('navn').then(({ data }) => setKontakter(data ?? []))
  useEffect(() => { last() }, [])
  return { kontakter, last }
}

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

/** Søk i Brønnøysundregistrene på navn eller org.nr. Fyller navn + org.nr ved valg. */
export function BrregSok({ onValgt }: { onValgt: (e: BrregEnhet) => void }) {
  const [sok, setSok] = useState('')
  const [treff, setTreff] = useState<BrregEnhet[]>([])
  const [soker, setSoker] = useState(false)
  const [apen, setApen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = sok.trim()
    if (q.length < 2) { setTreff([]); return }
    const t = setTimeout(async () => {
      setSoker(true)
      try {
        const bareTall = q.replace(/\s/g, '')
        if (/^\d{9}$/.test(bareTall)) {
          const e = await getCompanyByOrgNumber(bareTall)
          setTreff(e ? [e] : [])
        } else {
          setTreff(await searchCompaniesByName(q, 8))
        }
        setApen(true)
      } catch { setTreff([]) } finally { setSoker(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [sok])

  useEffect(() => {
    function utenfor(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setApen(false) }
    document.addEventListener('mousedown', utenfor)
    return () => document.removeEventListener('mousedown', utenfor)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label htmlFor="brreg-sok" className="sr-only">Søk i Brønnøysundregistrene</label>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input id="brreg-sok" value={sok} onChange={e => setSok(e.target.value)} onFocus={() => treff.length && setApen(true)}
        placeholder="Søk i Brønnøysund på firmanavn eller org.nr…" className="input pl-9 pr-9" autoComplete="off" />
      {soker && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
      {apen && treff.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-800 shadow-xl py-1">
          {treff.map(e => (
            <li key={e.organisasjonsnummer}>
              <button type="button" onClick={() => { onValgt(e); setSok(''); setApen(false) }} className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-100">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{e.navn}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{formatOrgNumber(e.organisasjonsnummer)}{e.forretningsadresse?.poststed ? ` · ${e.forretningsadresse.poststed}` : ''}{e.organisasjonsform?.kode ? ` · ${e.organisasjonsform.kode}` : ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function KundeFelter({ verdier, feil, onChange, opprinneligKundenummer, kontakter, onKontaktOpprettet }: {
  verdier: KundeSkjemaVerdier
  feil: Partial<Record<keyof KundeSkjemaVerdier, string>>
  onChange: (patch: Partial<KundeSkjemaVerdier>) => void
  /** Ved redigering: for å advare når kundenummer endres (Dropbox-mappe) */
  opprinneligKundenummer?: string | null
  kontakter: KontaktValg[]
  onKontaktOpprettet: () => void
}) {
  const [nyKontakt, setNyKontakt] = useState<{ navn: string; epost: string; telefon: string } | null>(null)
  const [lagrerKontakt, setLagrerKontakt] = useState(false)
  const kundenummerEndret = opprinneligKundenummer && verdier.kunde_nummer.trim() !== opprinneligKundenummer

  async function opprettKontakt() {
    if (!nyKontakt?.navn.trim()) { toast.warning('Navn er påkrevd'); return }
    setLagrerKontakt(true)
    const { data, error } = await db.from('kontaktpersoner').insert({ navn: nyKontakt.navn.trim(), epost: nyKontakt.epost || null, telefon: nyKontakt.telefon || null }).select('id').single()
    setLagrerKontakt(false)
    if (error || !data) { toast.error('Kunne ikke opprette kontaktperson', error); return }
    onKontaktOpprettet()
    onChange({ kontaktperson_id: data.id })
    setNyKontakt(null)
    toast.success('Kontaktperson opprettet')
  }

  return (
    <>
      <BrregSok onValgt={e => onChange({ navn: e.navn, organisasjonsnummer: e.organisasjonsnummer })} />
      <Felt id="kunde-navn" label="Kundenavn" pakrevd feil={feil.navn}>
        <input id="kunde-navn" value={verdier.navn} onChange={e => onChange({ navn: e.target.value })} className={cn('input', feil.navn && 'border-red-500')} />
      </Felt>
      <div className="grid sm:grid-cols-2 gap-3">
        <Felt id="kunde-orgnr" label="Organisasjonsnummer" feil={feil.organisasjonsnummer}>
          <input id="kunde-orgnr" value={verdier.organisasjonsnummer} onChange={e => onChange({ organisasjonsnummer: e.target.value })} inputMode="numeric" placeholder="9 siffer" className={cn('input', feil.organisasjonsnummer && 'border-red-500')} />
        </Felt>
        <Felt id="kunde-nr" label="Kundenummer" hint="Brukes som mappenavn i Dropbox">
          <input id="kunde-nr" value={verdier.kunde_nummer} onChange={e => onChange({ kunde_nummer: e.target.value })} className="input" />
        </Felt>
      </div>
      {kundenummerEndret && (
        <div className="flex gap-2.5 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
          <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <span>Endrer du kundenummer, må Dropbox-mappen <span className="font-mono">{opprinneligKundenummer}_{verdier.navn}</span> døpes om manuelt til <span className="font-mono">{verdier.kunde_nummer.trim()}_{verdier.navn}</span>.</span>
        </div>
      )}
      <Felt label="Primær kontaktperson">
        {nyKontakt ? (
          <div className="space-y-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <input value={nyKontakt.navn} onChange={e => setNyKontakt({ ...nyKontakt, navn: e.target.value })} placeholder="Navn *" className="input" autoFocus aria-label="Navn" />
            <div className="grid sm:grid-cols-2 gap-2">
              <input type="tel" value={nyKontakt.telefon} onChange={e => setNyKontakt({ ...nyKontakt, telefon: e.target.value })} placeholder="Telefon" className="input" aria-label="Telefon" />
              <input type="email" value={nyKontakt.epost} onChange={e => setNyKontakt({ ...nyKontakt, epost: e.target.value })} placeholder="E-post" className="input" aria-label="E-post" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNyKontakt(null)}>Avbryt</Button>
              <Button variant="primary" loading={lagrerKontakt} onClick={opprettKontakt}>Opprett</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <Combobox
                options={kontakter.map(k => ({ id: k.id, label: k.navn ?? '(uten navn)', sublabel: [k.epost, k.telefon].filter(Boolean).join(' · ') || undefined }))}
                value={verdier.kontaktperson_id} onChange={id => onChange({ kontaktperson_id: id })}
                placeholder="Ingen valgt" searchPlaceholder="Søk på navn, e-post eller telefon…"
              />
            </div>
            <Button variant="outline" icon={<Plus />} onClick={() => setNyKontakt({ navn: '', epost: '', telefon: '' })} title="Opprett ny kontaktperson"><span className="hidden sm:inline">Ny</span></Button>
          </div>
        )}
      </Felt>
    </>
  )
}
