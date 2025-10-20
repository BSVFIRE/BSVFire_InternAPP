import { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to database
    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      name: error.name
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-50 p-4">
          <div className="card max-w-lg w-full text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Noe gikk galt
            </h1>
            <p className="text-gray-400 dark:text-gray-400 mb-6">
              En uventet feil oppstod. Feilen har blitt logget og vil bli undersøkt.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Last siden på nytt
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Tekniske detaljer
                </summary>
                <pre className="mt-2 p-3 bg-dark-200 rounded text-xs text-red-400 overflow-x-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
