import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getDaysAgo(date: string | Date | null): number {
  if (!date) return 0
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = now.getTime() - d.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function formatDaysAgo(date: string | Date | null): string {
  const days = getDaysAgo(date)
  if (days === 0) return 'I dag'
  if (days === 1) return '1 dag'
  return `${days} dager`
}

/** ISO-ukenummer for en dato */
export function isoUke(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** ISO-ukeår (kan avvike fra kalenderår rundt nyttår) */
export function isoUkeAar(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

/** De sju datoene (man–søn) i en ISO-uke */
export function ukeDatoer(aar: number, uke: number): Date[] {
  const enkel = new Date(aar, 0, 1 + (uke - 1) * 7)
  const dow = enkel.getDay()
  const start = new Date(enkel)
  if (dow <= 4) start.setDate(enkel.getDate() - enkel.getDay() + 1)
  else start.setDate(enkel.getDate() + 8 - enkel.getDay())
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
}

export const UKEDAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'] as const
