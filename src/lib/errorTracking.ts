/**
 * Global error tracking setup
 * Catches unhandled errors and promise rejections
 */

import { logger } from './logger'

export function setupErrorTracking() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack || event.error
    })
  })

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: String(event.promise)
    })
  })

  // Override console.error to also log to database
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    // Call original console.error
    originalConsoleError(...args)
    
    // Also log to database
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    // Only log to database if it's not already a logger call
    const stack = new Error().stack || ''
    if (!stack.includes('logger.ts')) {
      logger.error(message, args.length > 1 ? args.slice(1) : undefined)
    }
  }
}
