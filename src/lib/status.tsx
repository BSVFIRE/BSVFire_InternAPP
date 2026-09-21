/**
 * Status på kunde og anlegg: aktiv → pauset → deaktivert.
 *
 * Databasen holder `skjult` i synk (skjult = status ≠ aktiv), så lister som filtrerer på skjult
 * skjuler både pausede og deaktiverte. Reglene om at en kunde ikke kan pauses med aktive anlegg
 * ligger som triggere i databasen (se 20260921_kunde_anlegg_status.sql); `statusFeil` oversetter dem.
 */
import { CheckCircle2, PauseCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Status = 'aktiv' | 'pauset' | 'deaktivert'
export const STATUSER: Status[] = ['aktiv', 'pauset', 'deaktivert']

export const STATUS_TEKST: Record<Status, string> = { aktiv: 'Aktiv', pauset: 'Pauset', deaktivert: 'Deaktivert' }

export const STATUS_BESKRIVELSE: Record<Status, { kunde: string; anlegg: string }> = {
  aktiv: { kunde: 'Vises i lister, tas med i kontrollplan og ukesplaner.', anlegg: 'Vises i lister og tas med i kontrollplanen.' },
  pauset: { kunde: 'Midlertidig ute – skjult fra lister og kontrollplan, men lett å aktivere igjen.', anlegg: 'Midlertidig ute av kontrollplanen – lett å aktivere igjen.' },
  deaktivert: { kunde: 'Avsluttet kundeforhold. Data beholdes, men kunden er skjult.', anlegg: 'Anlegget er ute av drift / avsluttet. Data beholdes.' },
}

const FARGE: Record<Status, string> = {
  aktiv: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  pauset: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  deaktivert: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
}

export const STATUS_IKON: Record<Status, typeof CheckCircle2> = { aktiv: CheckCircle2, pauset: PauseCircle, deaktivert: XCircle }

export function somStatus(v: string | null | undefined): Status {
  return v === 'pauset' || v === 'deaktivert' ? v : 'aktiv'
}

/** Liten status-pille. Skjules for «aktiv» med mindre `visAktiv` er satt. */
export function StatusBadge({ status, visAktiv, className }: { status: string | null | undefined; visAktiv?: boolean; className?: string }) {
  const s = somStatus(status)
  if (s === 'aktiv' && !visAktiv) return null
  const Ikon = STATUS_IKON[s]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap', FARGE[s], className)}>
      <Ikon className="w-3 h-3" />{STATUS_TEKST[s]}
    </span>
  )
}

/** Oversetter trigger-feilene fra databasen til meldinger som kan vises direkte. */
export function statusFeil(err: unknown): string {
  const m = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
  return m.replace(/^.*?(Kunden (har|er) .*)$/s, '$1')
}
