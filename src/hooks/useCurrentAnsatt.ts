import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface CurrentAnsatt {
  id: string
  navn: string | null
  epost: string | null
  rolle: string | null
  telefon: string | null
}

// Én delt cache per auth-bruker, så hver komponent som trenger ansatten ikke spør databasen på nytt
let cache: { userId: string; promise: Promise<CurrentAnsatt | null> } | null = null

function hentAnsatt(userId: string): Promise<CurrentAnsatt | null> {
  if (cache?.userId === userId) return cache.promise
  const promise = (async () => {
    const { data } = await db
      .from('ansatte')
      .select('id, navn, epost, rolle, telefon')
      .eq('auth_user_id', userId)
      .maybeSingle()
    return data ?? null
  })()
  cache = { userId, promise }
  return promise
}

/**
 * Innlogget brukers rad i ansatte-tabellen (via ansatte.auth_user_id).
 * Erstatter det gjentatte mønsteret `from('ansatte').eq('epost', user.email)`.
 */
export function useCurrentAnsatt() {
  const user = useAuthStore((s) => s.user)
  const [ansatt, setAnsatt] = useState<CurrentAnsatt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let aktiv = true
    if (!user) {
      setAnsatt(null)
      setLoading(false)
      return
    }
    setLoading(true)
    hentAnsatt(user.id).then((a) => {
      if (!aktiv) return
      setAnsatt(a)
      setLoading(false)
    })
    return () => { aktiv = false }
  }, [user])

  return { ansatt, loading }
}
