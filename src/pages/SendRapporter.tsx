import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Mail, Building2, User, FileText, Send, Loader2, ArrowLeft } from 'lucide-react'
import { sendEmail, getDocumentAsBase64, EmailAttachment, getKundeEmailTemplate, getTeknikerEmailTemplate, generateEmailSubject } from '@/lib/emailService'

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
}

interface Kontaktperson {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
  rolle: string | null
  primar: boolean
}

interface Dokument {
  id: string
  anlegg_id: string
  filnavn: string
  storage_path: string
  type: string | null
  opplastet_dato: string
}

export function SendRapporter() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [dokumenter, setDokumenter] = useState<Dokument[]>([])
  
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [valgteKontakter, setValgteKontakter] = useState<Set<string>>(new Set())
  const [valgteDokumenter, setValgteDokumenter] = useState<Set<string>>(new Set())
  const [sendTilTekniker, setSendTilTekniker] = useState(false)
  const [ekstraEpost, setEkstraEpost] = useState('')
  const [ekstraEposter, setEkstraEposter] = useState<string[]>([])
  
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [kontaktSok, setKontaktSok] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [teknikerInfo, setTeknikerInfo] = useState<{ navn: string; epost: string; telefon: string } | null>(null)

  useEffect(() => {
    loadKunder()
    loadTeknikerInfo()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
    }
  }, [selectedKunde])

  useEffect(() => {
    if (selectedAnlegg) {
      loadKontaktpersoner(selectedAnlegg)
      loadDokumenter(selectedAnlegg)
    } else {
      setKontaktpersoner([])
      setDokumenter([])
      setValgteKontakter(new Set())
      setValgteDokumenter(new Set())
    }
  }, [selectedAnlegg])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('anlegg')
        .select('*')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadKontaktpersoner(anleggId: string) {
    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select(`
          *,
          anlegg_kontaktpersoner!inner(anlegg_id, primar)
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)

      if (error) throw error
      setKontaktpersoner(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadDokumenter(anleggId: string) {
    try {
      setLoadingData(true)
      console.log('🔍 Laster dokumenter for anlegg:', anleggId)
      
      // Hent fra dokumenter-tabellen
      const { data: dbDocs, error: dbError } = await supabase
        .from('dokumenter')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('opplastet_dato', { ascending: false })

      if (dbError) {
        console.error('❌ Feil ved henting fra dokumenter-tabell:', dbError)
      }

      // Hent fra Storage som fallback
      const storagePath = `anlegg/${anleggId}/dokumenter`
      const { data: storageDocs, error: storageError } = await supabase
        .storage
        .from('anlegg.dokumenter')
        .list(storagePath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (storageError) {
        console.error('❌ Feil ved henting fra storage:', storageError)
      }

      // Kombiner dokumenter fra tabell og storage
      const docs: Dokument[] = []

      // Legg til dokumenter fra tabell
      if (dbDocs) {
        docs.push(...dbDocs)
      }

      // Legg til dokumenter fra storage som ikke finnes i tabellen
      if (storageDocs) {
        for (const file of storageDocs) {
          const existsInDb = dbDocs?.some(doc => doc.filnavn === file.name)
          
          if (!existsInDb) {
            const filePath = `anlegg/${anleggId}/dokumenter/${file.name}`
            docs.push({
              id: file.id || file.name,
              anlegg_id: anleggId,
              filnavn: file.name,
              storage_path: filePath,
              type: null,
              opplastet_dato: file.created_at || new Date().toISOString()
            })
          }
        }
      }

      console.log('📊 Totalt dokumenter:', docs.length, docs)
      setDokumenter(docs)
    } catch (error) {
      console.error('💥 Feil ved lasting av dokumenter:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadTeknikerInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('ansatte')
        .select('navn, epost, telefon')
        .eq('auth_id', user.id)
        .single()

      if (error) throw error
      setTeknikerInfo(data)
    } catch (error) {
      console.error('Feil ved lasting av tekniker info:', error)
    }
  }

  function toggleKontakt(id: string) {
    const newSet = new Set(valgteKontakter)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setValgteKontakter(newSet)
  }

  function toggleDokument(id: string) {
    const newSet = new Set(valgteDokumenter)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setValgteDokumenter(newSet)
  }

  function leggTilEkstraEpost() {
    const epost = ekstraEpost.trim()
    if (epost && epost.includes('@') && !ekstraEposter.includes(epost)) {
      setEkstraEposter([...ekstraEposter, epost])
      setEkstraEpost('')
    }
  }

  function fjernEkstraEpost(epost: string) {
    setEkstraEposter(ekstraEposter.filter(e => e !== epost))
  }

  async function loggEpostUtsendelse(
    anleggId: string,
    dokumentNavn: string,
    dokumentPath: string,
    mottakerEpost: string,
    mottakerNavn: string | null,
    mottakerType: 'kunde' | 'tekniker' | 'ekstra',
    emne: string,
    status: 'sendt' | 'feilet',
    feilmelding?: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: ansatt } = await supabase
        .from('ansatte')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      await supabase.from('epost_logg').insert({
        anlegg_id: anleggId,
        dokument_navn: dokumentNavn,
        dokument_storage_path: dokumentPath,
        mottaker_epost: mottakerEpost,
        mottaker_navn: mottakerNavn,
        mottaker_type: mottakerType,
        sendt_av_ansatt_id: ansatt?.id,
        emne: emne,
        status: status,
        feilmelding: feilmelding
      })
    } catch (error) {
      console.error('Feil ved logging av e-post:', error)
    }
  }

  async function handleSend() {
    if (valgteKontakter.size === 0 && !sendTilTekniker && ekstraEposter.length === 0) {
      alert('Velg minst én mottaker')
      return
    }

    if (valgteDokumenter.size === 0) {
      alert('Velg minst ett dokument')
      return
    }

    if (!selectedAnlegg) {
      alert('Velg et anlegg')
      return
    }

    setLoading(true)

    try {
      const anleggData = anlegg.find(a => a.id === selectedAnlegg)
      if (!anleggData) throw new Error('Fant ikke anleggsdata')

      // Forbered vedlegg
      const attachments: EmailAttachment[] = []
      const valgteDokListe = dokumenter.filter(d => valgteDokumenter.has(d.id))

      for (const dok of valgteDokListe) {
        const base64Content = await getDocumentAsBase64(dok.storage_path)
        attachments.push({
          content: base64Content,
          filename: dok.filnavn,
          contentType: 'application/pdf'
        })
      }

      // Send til valgte kontaktpersoner
      for (const kontaktId of valgteKontakter) {
        const kontakt = kontaktpersoner.find(k => k.id === kontaktId)
        if (!kontakt?.epost) continue

        const subject = generateEmailSubject({
          anleggsnavn: anleggData.anleggsnavn,
          rapportType: 'Rapport',
          type: 'kunde',
          date: new Date()
        })

        try {
          await sendEmail({
            to: kontakt.epost,
            subject: subject,
            body: getKundeEmailTemplate({
              anleggsnavn: anleggData.anleggsnavn,
              rapportType: 'Rapport',
              teknikerNavn: teknikerInfo?.navn || '',
              teknikerTelefon: teknikerInfo?.telefon || '',
              teknikerEpost: teknikerInfo?.epost || ''
            }),
            attachments
          })

          // Logg hver sendte dokument
          for (const dok of valgteDokListe) {
            await loggEpostUtsendelse(
              selectedAnlegg,
              dok.filnavn,
              dok.storage_path,
              kontakt.epost,
              kontakt.navn,
              'kunde',
              subject,
              'sendt'
            )
          }
        } catch (error) {
          for (const dok of valgteDokListe) {
            await loggEpostUtsendelse(
              selectedAnlegg,
              dok.filnavn,
              dok.storage_path,
              kontakt.epost,
              kontakt.navn,
              'kunde',
              subject,
              'feilet',
              error instanceof Error ? error.message : 'Ukjent feil'
            )
          }
          throw error
        }
      }

      // Send til tekniker
      if (sendTilTekniker && teknikerInfo?.epost) {
        const subject = generateEmailSubject({
          anleggsnavn: anleggData.anleggsnavn,
          rapportType: 'Rapport',
          type: 'intern',
          date: new Date()
        })

        try {
          await sendEmail({
            to: teknikerInfo.epost,
            subject: subject,
            body: getTeknikerEmailTemplate({
              anleggsnavn: anleggData.anleggsnavn,
              rapportType: 'Rapport',
              teknikerNavn: teknikerInfo.navn,
              teknikerTelefon: teknikerInfo.telefon,
              teknikerEpost: teknikerInfo.epost
            }),
            attachments
          })

          for (const dok of valgteDokListe) {
            await loggEpostUtsendelse(
              selectedAnlegg,
              dok.filnavn,
              dok.storage_path,
              teknikerInfo.epost,
              teknikerInfo.navn,
              'tekniker',
              subject,
              'sendt'
            )
          }
        } catch (error) {
          for (const dok of valgteDokListe) {
            await loggEpostUtsendelse(
              selectedAnlegg,
              dok.filnavn,
              dok.storage_path,
              teknikerInfo.epost,
              teknikerInfo.navn,
              'tekniker',
              subject,
              'feilet',
              error instanceof Error ? error.message : 'Ukjent feil'
            )
          }
          throw error
        }
      }

      // Send til ekstra e-poster
      for (const epost of ekstraEposter) {
        const subject = generateEmailSubject({
          anleggsnavn: anleggData.anleggsnavn,
          rapportType: 'Rapport',
          type: 'ekstra',
          date: new Date()
        })

        try {
          await sendEmail({
            to: epost,
            subject: subject,
            body: getKundeEmailTemplate({
              anleggsnavn: anleggData.anleggsnavn,
              rapportType: 'Rapport',
              teknikerNavn: teknikerInfo?.navn || '',
              teknikerTelefon: teknikerInfo?.telefon || '',
              teknikerEpost: teknikerInfo?.epost || ''
            }),
            attachments
          })

          for (const dok of valgteDokListe) {
            await loggEpostUtsendelse(
              selectedAnlegg,
              dok.filnavn,
              dok.storage_path,
              epost,
              null,
              'ekstra',
              subject,
              'sendt'
            )
          }
        } catch (error) {
          for (const dok of valgteDokListe) {
            await loggEpostUtsendelse(
              selectedAnlegg,
              dok.filnavn,
              dok.storage_path,
              epost,
              null,
              'ekstra',
              subject,
              'feilet',
              error instanceof Error ? error.message : 'Ukjent feil'
            )
          }
          throw error
        }
      }

      alert('✅ E-post sendt til alle mottakere!')
      
      // Reset valg
      setValgteKontakter(new Set())
      setValgteDokumenter(new Set())
      setEkstraEposter([])
      setSendTilTekniker(false)
    } catch (error) {
      console.error('Feil ved sending av e-post:', error)
      alert('❌ Kunne ikke sende e-post. Se konsoll for detaljer.')
    } finally {
      setLoading(false)
    }
  }

  const filteredKunder = kunder.filter(k =>
    k.navn.toLowerCase().includes(kundeSok.toLowerCase())
  )

  const filteredAnlegg = anlegg.filter(a =>
    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
  )

  const filteredKontakter = kontaktpersoner.filter(k =>
    k.navn.toLowerCase().includes(kontaktSok.toLowerCase()) ||
    k.epost?.toLowerCase().includes(kontaktSok.toLowerCase()) ||
    k.rolle?.toLowerCase().includes(kontaktSok.toLowerCase())
  )

  const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)
  const totalMottakere = valgteKontakter.size + (sendTilTekniker ? 1 : 0) + ekstraEposter.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dokumentasjon')}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Send rapporter
          </h1>
          <p className="text-gray-400 dark:text-gray-400">Velg dokumenter og mottakere for å sende rapporter via e-post</p>
        </div>
      </div>

      {/* Velg kunde og anlegg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Velg kunde</label>
          <input
            type="text"
            placeholder="Søk kunde..."
            value={kundeSok}
            onChange={(e) => setKundeSok(e.target.value)}
            className="input mb-2"
          />
          <select
            value={selectedKunde}
            onChange={(e) => setSelectedKunde(e.target.value)}
            className="input"
          >
            <option value="">-- Velg kunde --</option>
            {filteredKunder.map((kunde) => (
              <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
            ))}
          </select>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Velg anlegg</label>
          <input
            type="text"
            placeholder="Søk anlegg..."
            value={anleggSok}
            onChange={(e) => setAnleggSok(e.target.value)}
            className="input mb-2"
            disabled={!selectedKunde}
          />
          <select
            value={selectedAnlegg}
            onChange={(e) => setSelectedAnlegg(e.target.value)}
            className="input"
            disabled={!selectedKunde}
          >
            <option value="">-- Velg anlegg --</option>
            {filteredAnlegg.map((a) => (
              <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Anleggsinformasjon */}
      {selectedAnleggData && (
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Building2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{selectedAnleggData.anleggsnavn}</h3>
              {selectedAnleggData.adresse && (
                <p className="text-sm text-gray-400 dark:text-gray-400">
                  {selectedAnleggData.adresse}
                  {selectedAnleggData.postnummer && selectedAnleggData.poststed &&
                    `, ${selectedAnleggData.postnummer} ${selectedAnleggData.poststed}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAnlegg && (
        <>
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dokumenter */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Velg dokumenter ({valgteDokumenter.size} valgt)
                </h3>
                {dokumenter.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-400 text-center py-8">Ingen dokumenter tilgjengelig</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dokumenter.map(dok => (
                      <label
                        key={dok.id}
                        className="flex items-center gap-3 p-3 bg-dark-100 rounded-lg hover:bg-dark-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={valgteDokumenter.has(dok.id)}
                          onChange={() => toggleDokument(dok.id)}
                          className="w-4 h-4 text-primary bg-dark-200 border-gray-600 rounded focus:ring-primary"
                        />
                        <FileText className="w-4 h-4 text-gray-400 dark:text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 dark:text-white text-sm truncate">{dok.filnavn}</p>
                            {dok.type && (
                              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs flex-shrink-0">
                                {dok.type}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">{new Date(dok.opplastet_dato).toLocaleDateString('nb-NO')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Mottakere */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Mottakere ({totalMottakere} valgt)
                </h3>

                {/* Tekniker */}
                {teknikerInfo && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendTilTekniker}
                        onChange={(e) => setSendTilTekniker(e.target.checked)}
                        className="w-4 h-4 text-primary bg-dark-200 border-gray-600 rounded focus:ring-primary"
                      />
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">Send til meg (tekniker)</p>
                        <p className="text-gray-400 dark:text-gray-400 text-sm">{teknikerInfo.epost}</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Kontaktpersoner */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Søk kontaktpersoner..."
                    value={kontaktSok}
                    onChange={(e) => setKontaktSok(e.target.value)}
                    className="input"
                  />
                </div>

                {filteredKontakter.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-400 text-center py-4">Ingen kontaktpersoner funnet</p>
                ) : (
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {filteredKontakter.map(kontakt => {
                      const harGyldigEpost = kontakt.epost && kontakt.epost.includes('@')
                      return (
                        <label
                          key={kontakt.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            harGyldigEpost
                              ? 'bg-dark-100 hover:bg-dark-50'
                              : 'bg-red-900/20 border border-red-800/50 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={valgteKontakter.has(kontakt.id)}
                            onChange={() => toggleKontakt(kontakt.id)}
                            disabled={!harGyldigEpost}
                            className="w-4 h-4 text-primary bg-dark-200 border-gray-600 rounded focus:ring-primary disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white font-medium truncate">{kontakt.navn}</p>
                            {kontakt.rolle && <p className="text-primary text-xs">{kontakt.rolle}</p>}
                            <p className={`text-sm truncate ${harGyldigEpost ? 'text-gray-400 dark:text-gray-400' : 'text-red-400'}`}>
                              {kontakt.epost || 'Ingen e-postadresse'}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                {/* Ekstra e-poster */}
                <div className="border-t border-dark-100 pt-4">
                  <p className="text-gray-900 dark:text-white font-medium mb-2">Ekstra e-postadresser</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      placeholder="epost@eksempel.no"
                      value={ekstraEpost}
                      onChange={(e) => setEkstraEpost(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && leggTilEkstraEpost()}
                      className="flex-1 input"
                    />
                    <button
                      onClick={leggTilEkstraEpost}
                      className="btn-primary px-4"
                    >
                      Legg til
                    </button>
                  </div>
                  {ekstraEposter.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ekstraEposter.map(epost => (
                        <div
                          key={epost}
                          className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                        >
                          <span>{epost}</span>
                          <button
                            onClick={() => fjernEkstraEpost(epost)}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Send knapp */}
          <div className="flex items-center justify-between card bg-primary/5 border-primary/20">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">
                {totalMottakere} mottaker(e) • {valgteDokumenter.size} dokument(er)
              </p>
              <p className="text-gray-400 dark:text-gray-400 text-sm">
                Klar til å sende rapporter via e-post
              </p>
            </div>
            <button
              onClick={handleSend}
              disabled={loading || totalMottakere === 0 || valgteDokumenter.size === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send e-post
                </>
              )}
            </button>
          </div>
        </>
      )}

      {!selectedAnlegg && (
        <div className="card text-center py-12">
          <Mail className="w-16 h-16 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Velg kunde og anlegg for å starte</h3>
          <p className="text-gray-400 dark:text-gray-400">Velg en kunde og et anlegg fra dropdownene over for å sende rapporter</p>
        </div>
      )}
    </div>
  )
}
