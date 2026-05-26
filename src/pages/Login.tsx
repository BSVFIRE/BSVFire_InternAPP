import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { LogIn, AlertCircle, ArrowLeft, CheckCircle, Mail } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()
  const signIn = useAuthStore((state) => state.signIn)
  const resetPassword = useAuthStore((state) => state.resetPassword)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError('Feil brukernavn eller passord')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (err) {
      setError('Kunne ikke sende tilbakestillingslenke. Sjekk at e-posten er riktig.')
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

        {/* Login Card */}
        <div className="card">
          {showForgotPassword ? (
            // Glemt passord-skjema
            <>
              <button
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetSent(false)
                  setError('')
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Tilbake til innlogging
              </button>

              <h2 className="text-2xl font-bold text-white mb-2">Glemt passord?</h2>
              <p className="text-gray-400 mb-6">
                Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
              </p>

              {resetSent ? (
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">E-post sendt!</p>
                    <p className="text-sm text-green-400/80 mt-1">
                      Sjekk innboksen din for en lenke til å tilbakestille passordet.
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

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-2">
                        E-post
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input"
                        placeholder="din.epost@bsvfire.no"
                        required
                        autoComplete="email"
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
                          Sender...
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          Send tilbakestillingslenke
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            // Vanlig innlogging
            <>
              <h2 className="text-2xl font-bold text-white mb-6">Logg inn</h2>
              
              {error && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    E-post
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="din.epost@bsvfire.no"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Passord
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
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
                      Logger inn...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Logg inn
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <button
                  onClick={() => {
                    setShowForgotPassword(true)
                    setError('')
                  }}
                  className="text-sm text-primary hover:text-primary-400 w-full text-center transition-colors"
                >
                  Glemt passord?
                </button>
              </div>
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
