import { useMemo } from 'react'
import { formatDate } from '@/lib/utils'

interface GanttMilepel {
  id: string
  tittel: string
  planlagt_dato: string | null
  estimert_ferdig: string | null
  utfort_dato: string | null
  status: 'planlagt' | 'pagaende' | 'utfort' | 'utsatt'
  er_ekstern?: boolean
}

interface GanttChartProps {
  milepeler: GanttMilepel[]
}

const STATUS_COLORS = {
  planlagt: 'bg-gray-500',
  pagaende: 'bg-blue-500',
  utfort: 'bg-green-500',
  utsatt: 'bg-yellow-500',
}

export function GanttChart({ milepeler }: GanttChartProps) {
  // Filtrer milepæler med datoer og sorter
  const sortedMilepeler = useMemo(() => {
    return milepeler
      .filter(m => m.planlagt_dato)
      .sort((a, b) => {
        const dateA = new Date(a.planlagt_dato!).getTime()
        const dateB = new Date(b.planlagt_dato!).getTime()
        return dateA - dateB
      })
  }, [milepeler])

  // Beregn tidslinje-range
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (sortedMilepeler.length === 0) {
      const today = new Date()
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalDays: 30
      }
    }

    const dates = sortedMilepeler.flatMap(m => [
      m.planlagt_dato ? new Date(m.planlagt_dato) : null,
      m.estimert_ferdig ? new Date(m.estimert_ferdig) : null,
      m.utfort_dato ? new Date(m.utfort_dato) : null,
    ]).filter(Boolean) as Date[]

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    
    // Legg til litt padding
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 14)
    
    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000))
    
    return {
      startDate: minDate,
      endDate: maxDate,
      totalDays: Math.max(days, 30)
    }
  }, [sortedMilepeler])

  // Generer måneder for header
  const months = useMemo(() => {
    const result: { label: string; width: number; start: number }[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      
      const visibleStart = Math.max(monthStart.getTime(), startDate.getTime())
      const visibleEnd = Math.min(monthEnd.getTime(), endDate.getTime())
      
      const startOffset = (visibleStart - startDate.getTime()) / (24 * 60 * 60 * 1000)
      const duration = (visibleEnd - visibleStart) / (24 * 60 * 60 * 1000) + 1
      
      result.push({
        label: current.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' }),
        width: (duration / totalDays) * 100,
        start: (startOffset / totalDays) * 100
      })
      
      current.setMonth(current.getMonth() + 1)
      current.setDate(1)
    }
    
    return result
  }, [startDate, endDate, totalDays])

  // Beregn posisjon for en milepæl
  function getBarPosition(milepel: GanttMilepel) {
    const start = new Date(milepel.planlagt_dato!)
    const end = milepel.estimert_ferdig 
      ? new Date(milepel.estimert_ferdig)
      : milepel.utfort_dato 
        ? new Date(milepel.utfort_dato)
        : start

    const startOffset = (start.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    const duration = Math.max((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000), 1)
    
    return {
      left: (startOffset / totalDays) * 100,
      width: (duration / totalDays) * 100
    }
  }

  // Dagens dato markør
  const todayPosition = useMemo(() => {
    const today = new Date()
    if (today < startDate || today > endDate) return null
    const offset = (today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    return (offset / totalDays) * 100
  }, [startDate, endDate, totalDays])

  if (sortedMilepeler.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Legg til milepæler med datoer for å se Gantt-diagram</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-100 rounded-lg p-4 overflow-x-auto">
      <h4 className="text-white font-medium mb-4">Tidslinje</h4>
      
      <div className="min-w-[600px]">
        {/* Måneder header */}
        <div className="flex h-8 border-b border-gray-700 relative">
          {months.map((month, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-400 px-2 border-l border-gray-700"
              style={{ left: `${month.start}%`, width: `${month.width}%` }}
            >
              {month.label}
            </div>
          ))}
        </div>

        {/* Milepæler */}
        <div className="relative">
          {/* Dagens dato linje */}
          {todayPosition !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${todayPosition}%` }}
              title="I dag"
            />
          )}

          {sortedMilepeler.map((milepel) => {
            const pos = getBarPosition(milepel)
            const color = STATUS_COLORS[milepel.status]
            
            return (
              <div 
                key={milepel.id}
                className="flex items-center h-10 border-b border-gray-800"
              >
                {/* Tittel */}
                <div className="w-40 flex-shrink-0 pr-2 truncate text-sm text-gray-300" title={milepel.tittel}>
                  {milepel.er_ekstern && <span className="text-orange-400 mr-1">●</span>}
                  {milepel.tittel}
                </div>
                
                {/* Bar */}
                <div className="flex-1 relative h-full">
                  <div
                    className={`absolute top-2 h-6 rounded ${color} ${
                      milepel.status === 'utfort' ? 'opacity-60' : ''
                    }`}
                    style={{ 
                      left: `${pos.left}%`, 
                      width: `${Math.max(pos.width, 1)}%`,
                      minWidth: '8px'
                    }}
                    title={`${milepel.tittel}\n${formatDate(milepel.planlagt_dato!)}${milepel.estimert_ferdig ? ' → ' + formatDate(milepel.estimert_ferdig) : ''}`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Legende */}
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-500" /> Planlagt
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500" /> Pågående
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500 opacity-60" /> Utført
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500" /> Utsatt
          </span>
          <span className="flex items-center gap-1">
            <span className="w-0.5 h-3 bg-red-500" /> I dag
          </span>
          <span className="flex items-center gap-1">
            <span className="text-orange-400">●</span> Ekstern
          </span>
        </div>
      </div>
    </div>
  )
}
