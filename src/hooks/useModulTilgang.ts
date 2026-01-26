import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Admin-brukere som alltid har full tilgang
const SUPER_ADMIN_EMAILS = ['erik.skille@bsvfire.no']

export interface Modul {
  id: string
  modul_key: string
  navn: string
  beskrivelse: string | null
  kategori: string
  ikon: string | null
  sortering: number
  aktiv: boolean
}

export interface ModulTilgang {
  id: string
  ansatt_id: string
  modul_id: string
  kan_se: boolean
  kan_redigere: boolean
  modul?: Modul
}

export interface AnsattMedTilganger {
  id: string
  navn: string
  epost: string
  tilganger: ModulTilgang[]
}

export function useModulTilgang() {
  const { user } = useAuthStore()
  const [tilganger, setTilganger] = useState<Map<string, { kanSe: boolean; kanRediger: boolean }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    if (!user?.email) {
      setLoading(false)
      return
    }

    // Sjekk om bruker er super admin
    const superAdmin = SUPER_ADMIN_EMAILS.includes(user.email)
    setIsSuperAdmin(superAdmin)

    if (superAdmin) {
      // Super admin har alltid full tilgang
      setLoading(false)
      return
    }

    // Hent tilganger fra database
    async function loadTilganger() {
      try {
        const { data: ansatt } = await supabase
          .from('ansatte')
          .select('id')
          .eq('epost', user!.email)
          .single()

        if (!ansatt) {
          setLoading(false)
          return
        }

        const { data: modulTilganger, error } = await supabase
          .from('modul_tilganger')
          .select(`
            *,
            modul:moduler(*)
          `)
          .eq('ansatt_id', ansatt.id)

        if (error) {
          // Hvis tabellen ikke finnes ennå, ignorer feilen
          if (error.code === '42P01') {
            console.log('modul_tilganger tabell finnes ikke ennå')
            setLoading(false)
            return
          }
          throw error
        }

        const tilgangMap = new Map<string, { kanSe: boolean; kanRediger: boolean }>()
        modulTilganger?.forEach((mt: any) => {
          if (mt.modul?.modul_key) {
            tilgangMap.set(mt.modul.modul_key, {
              kanSe: mt.kan_se,
              kanRediger: mt.kan_redigere
            })
          }
        })

        setTilganger(tilgangMap)
      } catch (error) {
        console.error('Feil ved lasting av modul-tilganger:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTilganger()
  }, [user])

  const harTilgang = useCallback((modulKey: string, type: 'se' | 'rediger' = 'se'): boolean => {
    // Super admin har alltid tilgang
    if (isSuperAdmin) return true

    const tilgang = tilganger.get(modulKey)
    if (!tilgang) return false

    return type === 'rediger' ? tilgang.kanRediger : tilgang.kanSe
  }, [tilganger, isSuperAdmin])

  const harAdminTilgang = useCallback((): boolean => {
    // Super admin har alltid admin-tilgang
    if (isSuperAdmin) return true

    // Sjekk om bruker har tilgang til minst én admin-modul
    for (const [key, tilgang] of tilganger) {
      if (key.startsWith('admin_') && tilgang.kanSe) {
        return true
      }
    }
    return false
  }, [tilganger, isSuperAdmin])

  return {
    harTilgang,
    harAdminTilgang,
    isSuperAdmin,
    loading,
    tilganger
  }
}

// Hook for admin-siden - henter alle ansatte med tilganger
export function useModulTilgangAdmin() {
  const [moduler, setModuler] = useState<Modul[]>([])
  const [ansatte, setAnsatte] = useState<AnsattMedTilganger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Hent alle moduler
      const { data: modulerData, error: modulerError } = await supabase
        .from('moduler')
        .select('*')
        .eq('aktiv', true)
        .order('sortering')

      if (modulerError) throw modulerError

      // Hent alle ansatte
      const { data: ansatteData, error: ansatteError } = await supabase
        .from('ansatte')
        .select('id, navn, epost')
        .order('navn')

      if (ansatteError) throw ansatteError

      // Hent alle tilganger
      const { data: tilgangerData, error: tilgangerError } = await supabase
        .from('modul_tilganger')
        .select('*')

      if (tilgangerError) throw tilgangerError

      // Kombiner data
      const ansatteMedTilganger: AnsattMedTilganger[] = ansatteData?.map(ansatt => ({
        ...ansatt,
        tilganger: tilgangerData?.filter(t => t.ansatt_id === ansatt.id) || []
      })) || []

      setModuler(modulerData || [])
      setAnsatte(ansatteMedTilganger)
    } catch (err: any) {
      console.error('Feil ved lasting av modul-tilganger:', err)
      setError(err.message || 'Kunne ikke laste data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const oppdaterTilgang = async (
    ansattId: string,
    modulId: string,
    kanSe: boolean,
    kanRediger: boolean
  ) => {
    try {
      // Sjekk om tilgang allerede finnes
      const { data: existing } = await supabase
        .from('modul_tilganger')
        .select('id')
        .eq('ansatt_id', ansattId)
        .eq('modul_id', modulId)
        .single()

      if (existing) {
        // Oppdater eksisterende
        const { error } = await supabase
          .from('modul_tilganger')
          .update({ kan_se: kanSe, kan_redigere: kanRediger })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Opprett ny
        const { error } = await supabase
          .from('modul_tilganger')
          .insert({
            ansatt_id: ansattId,
            modul_id: modulId,
            kan_se: kanSe,
            kan_redigere: kanRediger
          })

        if (error) throw error
      }

      // Oppdater lokal state
      await loadData()
      return true
    } catch (err: any) {
      console.error('Feil ved oppdatering av tilgang:', err)
      setError(err.message || 'Kunne ikke oppdatere tilgang')
      return false
    }
  }

  const fjernTilgang = async (ansattId: string, modulId: string) => {
    try {
      const { error } = await supabase
        .from('modul_tilganger')
        .delete()
        .eq('ansatt_id', ansattId)
        .eq('modul_id', modulId)

      if (error) throw error

      await loadData()
      return true
    } catch (err: any) {
      console.error('Feil ved fjerning av tilgang:', err)
      setError(err.message || 'Kunne ikke fjerne tilgang')
      return false
    }
  }

  const giFullTilgang = async (ansattId: string) => {
    try {
      // Gi tilgang til alle moduler
      for (const modul of moduler) {
        await oppdaterTilgang(ansattId, modul.id, true, true)
      }
      return true
    } catch (err: any) {
      console.error('Feil ved gi full tilgang:', err)
      setError(err.message || 'Kunne ikke gi full tilgang')
      return false
    }
  }

  const fjernAlleTilganger = async (ansattId: string) => {
    try {
      const { error } = await supabase
        .from('modul_tilganger')
        .delete()
        .eq('ansatt_id', ansattId)

      if (error) throw error

      await loadData()
      return true
    } catch (err: any) {
      console.error('Feil ved fjerning av alle tilganger:', err)
      setError(err.message || 'Kunne ikke fjerne tilganger')
      return false
    }
  }

  return {
    moduler,
    ansatte,
    loading,
    error,
    oppdaterTilgang,
    fjernTilgang,
    giFullTilgang,
    fjernAlleTilganger,
    refresh: loadData
  }
}
