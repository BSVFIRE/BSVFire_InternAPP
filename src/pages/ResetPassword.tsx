import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Lock, AlertCircle, CheckCircle } from 'lucide-react'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    // Hvis bruker ikke er logget inn via reset-link, redirect til login
    if (!user) {
      const timer = setTimeout(() => {
        navigate('/login')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn')
      return
    }

    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens')
      return
    }

    setLoading(true)

    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      setError('Kunne ikke oppdatere passordet. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">B</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">BSV Fire</h1>
          <p className="text-gray-400">Intern bedriftsapp</p>
        </div>

        {/* Reset Card */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-2">Nytt passord</h2>
          <p className="text-gray-400 mb-6">
            Velg et nytt passord for kontoen din.
          </p>

          {success ? (
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-400 font-medium">Passord oppdatert!</p>
                <p className="text-sm text-green-400/80 mt-1">
                  Du blir nå sendt til dashboardet...
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Nytt passord
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="Minst 8 tegn"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
                    Bekreft passord
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="Skriv passordet på nytt"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Oppdaterer...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Oppdater passord
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2025 BSV Fire AS. Alle rettigheter reservert.
        </p>
      </div>
    </div>
  )
}
