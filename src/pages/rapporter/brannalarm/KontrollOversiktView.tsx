import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, AlertTriangle, Clock, CheckCircle, Edit, Eye, Plus, Trash2, ClipboardCheck, Shield } from 'lucide-react'

interface Kontroll {
  id: string
  dato: string
  kontrollaar: number
  kontroll_status: 'utkast' | 'ferdig' | 'sendt'
  rapport_type: 'FG790' | 'NS3960'
  kontrollor_id?: string
  har_feil?: boolean
  har_utkoblinger?: boolean
}

interface Avvik {
  kategori: string
  tittel: string
  avvik_type: string
  feilkode?: string
  kommentar: string
  rapport_type: 'FG790' | 'NS3960'
  kontroll_dato?: string
}

interface KontrollOversiktViewProps {
  anleggId: string
  anleggsNavn: string
  onBack: () => void
  onStartNy: () => void
  onOpenKontroll: (kontrollId: string, type: 'FG790' | 'NS3960') => void
}

export function KontrollOversiktView({ 
  anleggId, 
  anleggsNavn, 
  onBack, 
  onStartNy,
  onOpenKontroll 
}: KontrollOversiktViewProps) {
  const [kontroller, setKontroller] = useState<Kontroll[]>([])
  const [forrigeAvvik, setForrigeAvvik] = useState<Avvik[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [leverandor, setLeverandor] = useState<string>('')
  const [sentraltype, setSentraltype] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [sisteKontrollDato, setSisteKontrollDato] = useState<string | null>(null)

  useEffect(() => {
    if (anleggId) {
      loadKontroller()
    }
  }, [anleggId])

  async function loadKontroller() {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Henter kontroller for anlegg:', anleggId)
      
      // Hent alle kontroller for anlegget
      const { data: kontrollerData, error } = await supabase
        .from('anleggsdata_kontroll')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('dato', { ascending: false })

      if (error) {
        console.error('Feil ved henting av kontroller:', error)
        // Don't set error if table doesn't exist - just show empty state
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('Tabell finnes ikke ennå, viser tom liste')
          setKontroller([])
          setLoading(false)
          return
        }
        setError('Kunne ikke laste kontroller. Kontroller at du har tilgang til dataene.')
        setKontroller([])
        setLoading(false)
        return
      }
      
      console.log('Hentet kontroller:', kontrollerData?.length || 0)

      const typedKontroller = (kontrollerData || []).map(k => ({
        id: k.id,
        dato: k.dato || new Date().toISOString(),
        kontrollaar: k.dato ? new Date(k.dato).getFullYear() : new Date().getFullYear(),
        kontroll_status: k.kontroll_status || 'ferdig',
        rapport_type: k.rapport_type || 'FG790',
        kontrollor_id: k.kontrollor_id,
        har_feil: k.har_feil,
        har_utkoblinger: k.har_utkoblinger,
      }))

      setKontroller(typedKontroller)
      
      // Hent brannalarmdata (leverandør og sentraltype)
      const { data: brannalarmData, error: brannalarmError } = await supabase
        .from('anleggsdata_brannalarm')
        .select('leverandor, sentraltype')
        .eq('anlegg_id', anleggId)
        .maybeSingle()
      
      console.log('Brannalarmdata:', brannalarmData, 'Error:', brannalarmError)
      
      if (!brannalarmError && brannalarmData) {
        console.log('Setter leverandør:', brannalarmData.leverandor, 'Sentraltype:', brannalarmData.sentraltype)
        setLeverandor(brannalarmData.leverandor || '')
        setSentraltype(brannalarmData.sentraltype || '')
      }

      // Hent avvik fra forrige år
      await loadForrigeAvvik(typedKontroller)
    } catch (error: any) {
      console.error('Feil ved lasting av kontroller:', error)
      setError(error?.message || 'En ukjent feil oppstod')
      setKontroller([])
    } finally {
      setLoading(false)
    }
  }

  async function loadForrigeAvvik(kontrollerData: Kontroll[]) {
    // Finn siste utførte kontroller (både FG790 og NS3960)
    const ferdigeKontroller = kontrollerData.filter(k => k.kontroll_status === 'ferdig')
    
    if (ferdigeKontroller.length === 0) {
      setForrigeAvvik([])
      setSisteKontrollDato(null)
      return
    }

    // Finn siste FG790 og NS3960 kontroll
    const sisteFG790 = ferdigeKontroller
      .filter(k => k.rapport_type === 'FG790')
      .sort((a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime())[0]
    
    const sisteNS3960 = ferdigeKontroller
      .filter(k => k.rapport_type === 'NS3960')
      .sort((a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime())[0]

    const alleAvvik: Avvik[] = []

    try {
      // Hent FG790 avvik hvis det finnes en siste FG790 kontroll
      if (sisteFG790) {
        console.log('Henter FG790 avvik fra kontroll:', sisteFG790.id, 'Dato:', sisteFG790.dato)
        const { data, error } = await supabase
          .from('kontrollsjekkpunkter_brannalarm')
          .select('*')
          .eq('kontroll_id', sisteFG790.id)
          .not('avvik_type', 'is', null)

        if (error) {
          console.error('Feil ved henting av FG790 avvik:', error)
        } else if (data && data.length > 0) {
          console.log('Fant', data.length, 'FG790 avvik')
          const fg790Avvik = data.map(d => ({
            kategori: d.kategori,
            tittel: d.tittel,
            avvik_type: d.avvik_type,
            feilkode: d.feilkode,
            kommentar: d.kommentar || '',
            rapport_type: 'FG790' as const,
            kontroll_dato: sisteFG790.dato,
          }))
          alleAvvik.push(...fg790Avvik)
        }
      }

      // Hent NS3960 avvik hvis det finnes en siste NS3960 kontroll
      if (sisteNS3960) {
        console.log('Henter NS3960 avvik fra kontroll:', sisteNS3960.id, 'Dato:', sisteNS3960.dato)
        const { data, error } = await supabase
          .from('ns3960_kontrollpunkter')
          .select('*')
          .eq('kontroll_id', sisteNS3960.id)
          .eq('avvik', true)

        if (error) {
          console.error('Feil ved henting av NS3960 avvik:', error)
        } else if (data && data.length > 0) {
          console.log('Fant', data.length, 'NS3960 avvik')
          const ns3960Avvik = data.map(d => ({
            kategori: 'NS3960',
            tittel: d.kontrollpunkt_navn,
            avvik_type: 'Avvik',
            kommentar: d.kommentar || '',
            rapport_type: 'NS3960' as const,
            kontroll_dato: sisteNS3960.dato,
          }))
          alleAvvik.push(...ns3960Avvik)
        }
      }

      // Sett siste kontroll dato (den nyeste av de to)
      const sisteDato = [sisteFG790?.dato, sisteNS3960?.dato]
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
      
      setSisteKontrollDato(sisteDato || null)
      setForrigeAvvik(alleAvvik)
      console.log('Totalt', alleAvvik.length, 'avvik lastet')
    } catch (error) {
      console.error('Feil ved lasting av avvik:', error)
      setForrigeAvvik([])
      setSisteKontrollDato(null)
    }
  }

  const utkast = kontroller.filter(k => k.kontroll_status === 'utkast')
  const ferdigeKontroller = kontroller.filter(k => k.kontroll_status !== 'utkast')
  const years = [...new Set(ferdigeKontroller.map(k => k.kontrollaar))].sort((a, b) => b - a)

  async function handleDeleteUtkast(utkastId: string, rapportType: 'FG790' | 'NS3960') {
    if (isDeleting) {
      console.log('Sletting pågår allerede, avbryter')
      return
    }

    const confirm = window.confirm('Er du sikker på at du vil slette dette utkastet? Dette kan ikke angres.')
    if (!confirm) return

    console.log('Sletter utkast:', utkastId, 'Type:', rapportType)
    setIsDeleting(true)

    try {
      // Slett kontrollpunkter først (hvis NS3960)
      if (rapportType === 'NS3960') {
        console.log('Sletter NS3960 kontrollpunkter for kontroll_id:', utkastId)
        const { error: punkterError } = await supabase
          .from('ns3960_kontrollpunkter')
          .delete()
          .eq('kontroll_id', utkastId)
        
        if (punkterError) {
          console.error('Feil ved sletting av kontrollpunkter:', punkterError)
          throw punkterError
        }
        console.log('Kontrollpunkter slettet')
      }

      // Slett kontrollen
      console.log('Sletter kontroll fra anleggsdata_kontroll:', utkastId)
      const { error } = await supabase
        .from('anleggsdata_kontroll')
        .delete()
        .eq('id', utkastId)

      if (error) {
        console.error('Feil ved sletting av kontroll:', error)
        throw error
      }

      console.log('Kontroll slettet, refresher listen')
      // Refresh listen
      await loadKontroller()
      console.log('Listen refreshet')
    } catch (error) {
      console.error('Feil ved sletting av utkast:', error)
      alert('Kunne ikke slette utkast. Prøv igjen.')
    } finally {
      setIsDeleting(false)
    }
  }


  function getStatusColor(status: string) {
    switch (status) {
      case 'utkast': return 'text-yellow-400 bg-yellow-500/10'
      case 'ferdig': return 'text-green-400 bg-green-500/10'
      case 'sendt': return 'text-blue-400 bg-blue-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'utkast': return <Clock className="w-4 h-4" />
      case 'ferdig': return <CheckCircle className="w-4 h-4" />
      case 'sendt': return <CheckCircle className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Kontroller</h1>
            <p className="text-gray-400 mt-1">{anleggsNavn}</p>
          </div>
        </div>

        <div className="card bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-2">Kunne ikke laste kontroller</h3>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              <button onClick={onStartNy} className="btn-primary">
                Start ny kontroll likevel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Kontroller</h1>
            <p className="text-gray-400 mt-1">{anleggsNavn}</p>
            {(leverandor || sentraltype) && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                {leverandor && <span>Leverandør: {leverandor}</span>}
                {sentraltype && <span>Sentraltype: {sentraltype}</span>}
              </div>
            )}
          </div>
        </div>
        <button onClick={onStartNy} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Start ny kontroll
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Utkast */}
          {utkast.length > 0 && (
            <div className="space-y-4">
              {utkast.map((u) => (
                <div key={u.id} className="card border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Pågående utkast</h3>
                        <p className="text-sm text-gray-400">
                          {u.rapport_type} • Opprettet {new Date(u.dato).toLocaleDateString('nb-NO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteUtkast(u.id, u.rapport_type)}
                        className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        Slett
                      </button>
                      <button
                        onClick={() => onOpenKontroll(u.id, u.rapport_type)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Fortsett
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    Du har et utkast som ikke er fullført. Fortsett arbeidet eller start en ny kontroll.
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tidligere kontroller */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Tidligere kontroller</h3>
              {years.length > 0 && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="input py-1 px-3 text-sm"
                >
                  <option value={new Date().getFullYear()}>Alle år</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
            </div>

            {ferdigeKontroller.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Ingen kontroller funnet</p>
                <p className="text-xs text-gray-500 mt-2">Start en ny kontroll for å komme i gang</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ferdigeKontroller
                  .filter(k => selectedYear === new Date().getFullYear() || k.kontrollaar === selectedYear)
                  .map(kontroll => (
                    <div
                      key={kontroll.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">
                              {kontroll.rapport_type} Kontroll
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${getStatusColor(kontroll.kontroll_status)}`}>
                              {getStatusIcon(kontroll.kontroll_status)}
                              {kontroll.kontroll_status === 'utkast' ? 'Utkast' : 
                               kontroll.kontroll_status === 'sendt' ? 'Sendt' : 'Ferdig'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{new Date(kontroll.dato).toLocaleDateString('nb-NO')}</span>
                            {kontroll.har_feil && (
                              <span className="flex items-center gap-1 text-red-400">
                                <AlertTriangle className="w-3 h-3" />
                                Feil
                              </span>
                            )}
                            {kontroll.har_utkoblinger && (
                              <span className="flex items-center gap-1 text-orange-400">
                                <AlertTriangle className="w-3 h-3" />
                                Utkoblinger
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenKontroll(kontroll.id, kontroll.rapport_type)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Åpne
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Avvik fra siste kontroll */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Avvik fra siste kontroll</h3>
              </div>
              {sisteKontrollDato && (
                <p className="text-xs text-gray-500 ml-7">
                  {new Date(sisteKontrollDato).toLocaleDateString('nb-NO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>

            {forrigeAvvik.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Ingen avvik registrert</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {forrigeAvvik.map((avvik, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      avvik.rapport_type === 'FG790'
                        ? 'bg-blue-500/5 border-blue-500/20'
                        : 'bg-purple-500/5 border-purple-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                            avvik.rapport_type === 'FG790' 
                              ? 'bg-blue-500/30 text-blue-300 border border-blue-400/30' 
                              : 'bg-purple-500/30 text-purple-300 border border-purple-400/30'
                          }`}>
                            {avvik.rapport_type === 'FG790' ? (
                              <ClipboardCheck className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            {avvik.rapport_type}
                          </span>
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                            {avvik.avvik_type}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-white mb-1">
                          {avvik.tittel}
                        </div>
                        {avvik.kategori && avvik.kategori !== 'NS3960' && (
                          <div className="text-xs text-gray-500 mb-1">
                            {avvik.kategori}
                          </div>
                        )}
                        {avvik.feilkode && (
                          <div className="text-xs text-gray-500 mb-1">
                            {avvik.feilkode}
                          </div>
                        )}
                        {avvik.kommentar && (
                          <div className="text-xs text-gray-400 mt-2 p-2 bg-black/20 rounded">
                            {avvik.kommentar}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
