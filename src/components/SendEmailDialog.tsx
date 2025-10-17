import { useState, useEffect } from 'react'
import { X, User, Plus, Trash2, FileText, Send, Loader2, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sendEmail, getDocumentAsBase64, EmailAttachment, getKundeEmailTemplate, getTeknikerEmailTemplate, generateEmailSubject } from '@/lib/emailService'

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

interface SendEmailDialogProps {
  anleggId: string
  anleggsnavn: string
  rapportType: string
  onClose: () => void
  onSuccess: () => void
}

export function SendEmailDialog({ anleggId, anleggsnavn, rapportType, onClose, onSuccess }: SendEmailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [dokumenter, setDokumenter] = useState<Dokument[]>([])
  const [valgteKontakter, setValgteKontakter] = useState<Set<string>>(new Set())
  const [valgteDokumenter, setValgteDokumenter] = useState<Set<string>>(new Set())
  const [sendTilTekniker, setSendTilTekniker] = useState(false)
  const [ekstraEpost, setEkstraEpost] = useState('')
  const [ekstraEposter, setEkstraEposter] = useState<string[]>([])
  const [teknikerInfo, setTeknikerInfo] = useState<{ navn: string; epost: string; telefon: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [anleggId])

  async function loadData() {
    try {
      setLoadingData(true)

      // Hent kontaktpersoner
      const { data: kontakter, error: kontakterError } = await supabase
        .from('kontaktpersoner')
        .select(`
          *,
          anlegg_kontaktpersoner!inner(anlegg_id, primar)
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)

      if (kontakterError) throw kontakterError

      // Hent dokumenter
      const { data: docs, error: docsError } = await supabase
        .from('dokumenter')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('opplastet_dato', { ascending: false })

      if (docsError) throw docsError

      // Hent tekniker info
      const { data: ansatt, error: ansattError } = await supabase
        .from('ansatte')
        .select('navn, epost, telefon')
        .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (ansattError) console.error('Kunne ikke hente tekniker info:', ansattError)

      setKontaktpersoner(kontakter || [])
      setDokumenter(docs || [])
      setTeknikerInfo(ansatt || null)
    } catch (error) {
      console.error('Feil ved lasting av data:', error)
    } finally {
      setLoadingData(false)
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

  async function handleSend() {
    if (valgteKontakter.size === 0 && !sendTilTekniker && ekstraEposter.length === 0) {
      alert('Velg minst én mottaker')
      return
    }

    if (valgteDokumenter.size === 0) {
      alert('Velg minst ett dokument')
      return
    }

    setLoading(true)

    try {
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

        await sendEmail({
          to: kontakt.epost,
          subject: generateEmailSubject({
            anleggsnavn,
            rapportType,
            type: 'kunde',
            date: new Date()
          }),
          body: getKundeEmailTemplate({
            anleggsnavn,
            rapportType,
            teknikerNavn: teknikerInfo?.navn || '',
            teknikerTelefon: teknikerInfo?.telefon || '',
            teknikerEpost: teknikerInfo?.epost || ''
          }),
          attachments
        })
      }

      // Send til tekniker
      if (sendTilTekniker && teknikerInfo?.epost) {
        await sendEmail({
          to: teknikerInfo.epost,
          subject: generateEmailSubject({
            anleggsnavn,
            rapportType,
            type: 'intern',
            date: new Date()
          }),
          body: getTeknikerEmailTemplate({
            anleggsnavn,
            rapportType,
            teknikerNavn: teknikerInfo.navn,
            teknikerTelefon: teknikerInfo.telefon,
            teknikerEpost: teknikerInfo.epost
          }),
          attachments
        })
      }

      // Send til ekstra e-poster
      for (const epost of ekstraEposter) {
        await sendEmail({
          to: epost,
          subject: generateEmailSubject({
            anleggsnavn,
            rapportType,
            type: 'ekstra',
            date: new Date()
          }),
          body: getKundeEmailTemplate({
            anleggsnavn,
            rapportType,
            teknikerNavn: teknikerInfo?.navn || '',
            teknikerTelefon: teknikerInfo?.telefon || '',
            teknikerEpost: teknikerInfo?.epost || ''
          }),
          attachments
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Feil ved sending av e-post:', error)
      alert('Kunne ikke sende e-post. Se konsoll for detaljer.')
    } finally {
      setLoading(false)
    }
  }

  const filtrerteKontakter = kontaktpersoner.filter(k =>
    k.navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.epost?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.rolle?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-200 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-100">
          <div>
            <h2 className="text-2xl font-bold text-white">Send e-post</h2>
            <p className="text-gray-400 text-sm mt-1">{anleggsnavn} - {rapportType}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Dokumenter */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Velg dokumenter ({valgteDokumenter.size} valgt)
                </h3>
                {dokumenter.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Ingen dokumenter tilgjengelig</p>
                ) : (
                  <div className="space-y-2">
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
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-white text-sm">{dok.filnavn}</p>
                          <p className="text-gray-500 text-xs">{new Date(dok.opplastet_dato).toLocaleDateString('nb-NO')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Mottakere */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Mottakere
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
                        <p className="text-white font-medium">Send til meg (tekniker)</p>
                        <p className="text-gray-400 text-sm">{teknikerInfo.epost}</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Kontaktpersoner */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Søk kontaktpersoner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-100 border border-dark-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>

                {filtrerteKontakter.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Ingen kontaktpersoner funnet</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {filtrerteKontakter.map(kontakt => {
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{kontakt.navn}</p>
                              {kontakt.primar && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                            </div>
                            {kontakt.rolle && <p className="text-primary text-xs">{kontakt.rolle}</p>}
                            <p className={`text-sm ${harGyldigEpost ? 'text-gray-400' : 'text-red-400'}`}>
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
                  <p className="text-white font-medium mb-2">Ekstra e-postadresser</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      placeholder="epost@eksempel.no"
                      value={ekstraEpost}
                      onChange={(e) => setEkstraEpost(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && leggTilEkstraEpost()}
                      className="flex-1 px-4 py-2 bg-dark-100 border border-dark-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={leggTilEkstraEpost}
                      className="btn-primary px-4"
                    >
                      <Plus className="w-4 h-4" />
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
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-dark-100">
          <p className="text-gray-400 text-sm">
            {valgteKontakter.size + (sendTilTekniker ? 1 : 0) + ekstraEposter.length} mottaker(e) • {valgteDokumenter.size} dokument(er)
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Avbryt
            </button>
            <button
              onClick={handleSend}
              disabled={loading || loadingData}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send e-post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
