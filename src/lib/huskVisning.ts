/**
 * Husker hvordan en kontrolliste sto satt – hvilke grupper som er åpne og hvilket
 * filter som er valgt.
 *
 * Listene avmonteres når du går til forhåndsvisningen eller et redigeringsskjema.
 * Uten dette sto alt åpent igjen når du kom tilbake, og på et anlegg med mange
 * bygg måtte du finne fram på nytt hver gang.
 *
 * Lagres per anlegg og per modul, så brannslukkere og brannslanger på samme
 * anlegg ikke deler oppsett. Dette er en huskelapp for den som står i felt, ikke
 * data – derfor localStorage og ikke database.
 */

export interface Visning {
  /** Valgt chip. Ukjent verdi ignoreres, så gamle lagringer ikke låser visningen. */
  chip?: string
  /** Nøklene til gruppene som er lukket */
  lukkede: string[]
}

const TOM: Visning = { lukkede: [] }

export function visningsNokkel(modul: string, anleggId: string): string {
  return `visning_${modul}_${anleggId}`
}

export function lesVisning(nokkel: string): Visning {
  try {
    const rå = localStorage.getItem(nokkel)
    if (!rå) return TOM
    const x = JSON.parse(rå) as Visning
    return {
      chip: typeof x.chip === 'string' ? x.chip : undefined,
      lukkede: Array.isArray(x.lukkede) ? x.lukkede.filter(k => typeof k === 'string') : [],
    }
  } catch {
    return TOM
  }
}

export function skrivVisning(nokkel: string, v: Visning): void {
  try {
    localStorage.setItem(nokkel, JSON.stringify(v))
  } catch {
    // Full lagring skal ikke stoppe en kontroll
  }
}
