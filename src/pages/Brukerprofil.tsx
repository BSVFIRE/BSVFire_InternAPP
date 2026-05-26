import { useState, useEffect } from 'react'
import { User, Mail, Phone, Save, Loader2, Camera, Award, MessageCircle, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface AnsattProfil {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
  rolle: string | null
  fg_sertifikat_nr: string | null
  gronn_sertifikat_nummer: string | null
  telegram_chat_id: string | null
  onesignal_id: string | null
  bilde_url?: string | null
}

export function Brukerprofil() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profil, setProfil] = useState<AnsattProfil | null>(null)
  const [formData, setFormData] = useState({
    navn: '',
    telefon: '',
    fg_sertifikat_nr: '',
    gronn_sertifikat_nummer: '',
    telegram_chat_id: '',
  })

  useEffect(() => {
    if (user?.email) {
      loadProfil()
    }
  }, [user])

  async function loadProfil() {
    try {
      setLoading(true)
      
      // Finn ansatt basert på innlogget brukers e-post
      const { data, error } = await supabase
        .from('ansatte')
        .select('*')
        .eq('epost', user?.email)
        .single()

      if (error) {
        console.error('Feil ved lasting av profil:', error)
        return
      }

      if (data) {
        setProfil(data)
        setFormData({
          navn: data.navn || '',
          telefon: data.telefon || '',
          fg_sertifikat_nr: data.fg_sertifikat_nr || '',
          gronn_sertifikat_nummer: data.gronn_sertifikat_nummer || '',
          telegram_chat_id: data.telegram_chat_id || '',
        })
      }
    } catch (error) {
      console.error('Feil ved lasting av profil:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!profil) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('ansatte')
        .update({
          navn: formData.navn,
          telefon: formData.telefon,
          fg_sertifikat_nr: formData.fg_sertifikat_nr || null,
          gronn_sertifikat_nummer: formData.gronn_sertifikat_nummer || null,
          telegram_chat_id: formData.telegram_chat_id || null,
        })
        .eq('id', profil.id)

      if (error) throw error

      // Oppdater lokal state
      setProfil(prev => prev ? { ...prev, ...formData } : null)
      
      alert('Profil oppdatert!')
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre endringer')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profil) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Min profil</h1>
        <div className="card">
          <div className="text-center py-8">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Ingen ansattprofil funnet for {user?.email}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Kontakt administrator for å få opprettet din profil.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Min profil</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Rediger din brukerinformasjon
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profilkort */}
        <div className="card text-center">
          <div className="relative inline-block">
            {profil.bilde_url ? (
              <img 
                src={profil.bilde_url} 
                alt={profil.navn}
                className="w-32 h-32 rounded-full mx-auto object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto bg-primary/20 flex items-center justify-center">
                <User className="w-16 h-16 text-primary" />
              </div>
            )}
            <button className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 p-2 bg-primary rounded-full text-white hover:bg-primary/80 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-6">
            {profil.navn}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">{profil.rolle || 'Ansatt'}</p>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Mail className="w-4 h-4" />
              {profil.epost}
            </div>
          </div>
        </div>

        {/* Redigeringsskjema */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Rediger informasjon
          </h3>

          <div className="space-y-4">
            {/* Navn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fullt navn
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.navn}
                  onChange={(e) => setFormData(prev => ({ ...prev, navn: e.target.value }))}
                  className="input pl-10"
                  placeholder="Ditt fulle navn"
                />
              </div>
            </div>

            {/* E-post (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-post
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={profil.epost || ''}
                  disabled
                  className="input pl-10 bg-gray-100 dark:bg-dark-100 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">E-post kan ikke endres</p>
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                  className="input pl-10"
                  placeholder="Ditt telefonnummer"
                />
              </div>
            </div>

            {/* FG Sertifikat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                FG Sertifikat nr.
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.fg_sertifikat_nr}
                  onChange={(e) => setFormData(prev => ({ ...prev, fg_sertifikat_nr: e.target.value }))}
                  className="input pl-10"
                  placeholder="FG sertifikatnummer"
                />
              </div>
            </div>

            {/* Grønn Sertifikat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grønn Sertifikat nr.
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.gronn_sertifikat_nummer}
                  onChange={(e) => setFormData(prev => ({ ...prev, gronn_sertifikat_nummer: e.target.value }))}
                  className="input pl-10"
                  placeholder="Grønn sertifikatnummer"
                />
              </div>
            </div>

            {/* Telegram Chat ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telegram Chat ID
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.telegram_chat_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
                  className="input pl-10"
                  placeholder="Din Telegram Chat ID"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Brukes for varsler via Telegram</p>
            </div>

            {/* Rolle (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rolle
              </label>
              <input
                type="text"
                value={profil.rolle || 'Ikke satt'}
                disabled
                className="input bg-gray-100 dark:bg-dark-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Rolle settes av administrator</p>
            </div>

            {/* Lagre-knapp */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Lagrer...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Lagre endringer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Brukerprofil
