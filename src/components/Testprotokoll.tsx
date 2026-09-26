/**
 * Sjekklisten for en testrunde, med avhuking som overlever at siden lastes på nytt.
 *
 * Avhukingen ligger i localStorage på enheten. Den er en huskelapp for den som
 * tester akkurat nå, ikke en logg – derfor ingen database.
 */
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANTALL_TESTPUNKTER, TESTPROTOKOLL } from '@/lib/testprotokoll'

const LAGRINGSNOKKEL = 'testprotokoll_avhuket'

function les(): Set<string> {
  try {
    const lagret = localStorage.getItem(LAGRINGSNOKKEL)
    return new Set(lagret ? (JSON.parse(lagret) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function Testprotokoll() {
  const [avhuket, setAvhuket] = useState<Set<string>>(les)
  const [apne, setApne] = useState<Set<string>>(new Set(['alltid']))

  useEffect(() => {
    try {
      localStorage.setItem(LAGRINGSNOKKEL, JSON.stringify([...avhuket]))
    } catch {
      // Full lagring skal ikke stoppe testingen
    }
  }, [avhuket])

  function vipp(id: string) {
    setAvhuket(f => {
      const ny = new Set(f)
      if (ny.has(id)) ny.delete(id); else ny.add(id)
      return ny
    })
  }

  const ferdig = avhuket.size

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sjekkliste</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Ta «Alltid» først. Resten etter hva du har endret.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{ferdig} av {ANTALL_TESTPUNKTER}</span>
          {ferdig > 0 && (
            <button
              type="button"
              onClick={() => setAvhuket(new Set())}
              className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />Nullstill
            </button>
          )}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${(ferdig / ANTALL_TESTPUNKTER) * 100}%` }} />
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg">
        {TESTPROTOKOLL.map(gruppe => {
          const apen = apne.has(gruppe.id)
          const gjort = gruppe.punkter.filter((_, i) => avhuket.has(`${gruppe.id}:${i}`)).length
          const alt = gjort === gruppe.punkter.length

          return (
            <li key={gruppe.id}>
              <button
                type="button"
                onClick={() => setApne(f => { const ny = new Set(f); if (ny.has(gruppe.id)) ny.delete(gruppe.id); else ny.add(gruppe.id); return ny })}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100"
                aria-expanded={apen}
              >
                {apen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <span className={cn('text-sm flex-1', alt ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white font-medium')}>
                  {gruppe.navn}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{gjort}/{gruppe.punkter.length}</span>
              </button>

              {apen && (
                <div className="px-3 pb-3 space-y-2">
                  {gruppe.anlegg && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">{gruppe.anlegg}</p>
                  )}
                  {gruppe.innledning && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">{gruppe.innledning}</p>
                  )}
                  <ul className="space-y-1.5">
                    {gruppe.punkter.map((p, i) => {
                      const id = `${gruppe.id}:${i}`
                      const kryss = avhuket.has(id)
                      return (
                        <li key={id} className="flex items-start gap-2.5 ml-6">
                          <input
                            id={`test-${id}`}
                            type="checkbox"
                            checked={kryss}
                            onChange={() => vipp(id)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                          />
                          <label htmlFor={`test-${id}`} className="flex-1 cursor-pointer">
                            <span className={cn('block text-sm', kryss ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200')}>
                              {p.tekst}
                            </span>
                            {p.hvorfor && !kryss && (
                              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.hvorfor}</span>
                            )}
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
