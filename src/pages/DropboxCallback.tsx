import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleDropboxCallback } from '@/services/dropboxServiceV2'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export function DropboxCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function processCallback() {
      // Code kommer i URL query params (?code=...)
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        setStatus('error')
        setError(`Dropbox avviste tilkoblingen: ${errorDescription || errorParam}`)
        return
      }
      
      if (!code) {
        setStatus('error')
        setError('Ingen autorisasjonskode mottatt fra Dropbox')
        return
      }

      try {
        const success = await handleDropboxCallback(code)
        
        if (success) {
          setStatus('success')
          // Redirect tilbake etter 2 sekunder
          setTimeout(() => {
            navigate('/teknisk')
          }, 2000)
        } else {
          setStatus('error')
          setError('Kunne ikke fullføre Dropbox-tilkoblingen')
        }
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Ukjent feil')
      }
    }

    processCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="card max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-white mb-2">Kobler til Dropbox...</h1>
            <p className="text-gray-400">Vennligst vent</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Tilkoblet!</h1>
            <p className="text-gray-400">Dropbox er nå koblet til. Du blir sendt tilbake...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Feil</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/teknisk')}
              className="btn-primary"
            >
              Gå tilbake
            </button>
          </>
        )}
      </div>
    </div>
  )
}
