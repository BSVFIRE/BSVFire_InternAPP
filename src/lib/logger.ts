/**
 * Logger utility for BSV Fire App
 * 
 * Provides environment-aware logging that:
 * - Only logs debug messages in development
 * - Always logs errors (for production monitoring)
 * - Saves important logs to database for admin review
 * - Can be extended to send logs to external services (Sentry, LogRocket, etc.)
 */

import { supabase } from './supabase'

const isDev = import.meta.env.DEV
const isTest = import.meta.env.MODE === 'test'

/**
 * Serialize a value for logging, handling Error objects specially
 */
function serializeForLog(value: any): any {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }
  if (typeof value === 'object' && value !== null) {
    const result: any = Array.isArray(value) ? [] : {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = serializeForLog(value[key])
      }
    }
    return result
  }
  return value
}

// Store original console methods before they might be overridden
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
}

// Log levels that should be saved to database
const DB_LOG_LEVELS = ['warn', 'error'] as const
type DbLogLevel = typeof DB_LOG_LEVELS[number]

/**
 * Save log to database for admin review
 * Only saves warnings and errors to avoid cluttering the database
 */
async function saveLogToDatabase(
  level: DbLogLevel,
  namespace: string | undefined,
  message: string,
  data?: any
) {
  try {
    // Don't save logs in test mode
    if (isTest) return

    // Get current user info (but don't wait for it to avoid blocking)
    let user_id: string | null = null
    let user_email: string | null = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      user_id = user?.id || null
      user_email = user?.email || null
    } catch (err) {
      // If we can't get user info, continue without it
      originalConsole.debug('Could not get user info for logging:', err)
    }
    
    // Prepare log entry
    const logEntry = {
      level,
      message,
      data: data ? JSON.stringify(data) : null,
      namespace: namespace || 'unknown',
      page_url: window.location.href,
      user_id,
      user_email,
      user_agent: navigator.userAgent,
      browser_info: {
        language: navigator.language,
        platform: navigator.platform,
        online: navigator.onLine,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      },
      timestamp: new Date().toISOString()
    }

    // Save to database (fire and forget - don't wait for response)
    supabase.from('system_logs').insert([logEntry]).then(({ error }) => {
      if (error && isDev) {
        originalConsole.error('Failed to save log to database:', error)
      }
    })
  } catch (error) {
    // Silently fail - we don't want logging to break the app
    if (isDev) {
      originalConsole.error('Error in saveLogToDatabase:', error)
    }
  }
}

export const logger = {
  /**
   * Log debug information (only in development)
   * Use for general debugging, data inspection, etc.
   */
  log: (...args: any[]) => {
    if (isDev && !isTest) {
      originalConsole.log(...args)
    }
  },

  /**
   * Log debug information (only in development)
   * Alias for log()
   */
  debug: (...args: any[]) => {
    if (isDev && !isTest) {
      originalConsole.debug(...args)
    }
  },

  /**
   * Log informational messages (only in development)
   * Use for important state changes, successful operations, etc.
   */
  info: (...args: any[]) => {
    if (isDev && !isTest) {
      originalConsole.info(...args)
    }
  },

  /**
   * Log warnings (only in development)
   * Use for deprecated features, potential issues, etc.
   * Warnings are saved to database for admin review
   */
  warn: (...args: any[]) => {
    if (isDev && !isTest) {
      originalConsole.warn(...args)
    }
    
    // Save to database for admin review
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(serializeForLog(arg)) : String(arg)
    ).join(' ')
    saveLogToDatabase('warn', undefined, message, args.length > 1 ? serializeForLog(args.slice(1)) : undefined)
  },

  /**
   * Log errors (always logged, even in production)
   * Use for exceptions, failed operations, etc.
   * Errors are saved to database for admin review
   */
  error: (...args: any[]) => {
    originalConsole.error(...args)
    
    // Save to database for admin review
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(serializeForLog(arg)) : String(arg)
    ).join(' ')
    saveLogToDatabase('error', undefined, message, args.length > 1 ? serializeForLog(args.slice(1)) : undefined)
  },

  /**
   * Log a group of related messages (only in development)
   * Useful for organizing complex debugging output
   */
  group: (label: string, fn: () => void) => {
    if (isDev && !isTest) {
      console.group(label)
      fn()
      console.groupEnd()
    }
  },

  /**
   * Log a collapsed group (only in development)
   */
  groupCollapsed: (label: string, fn: () => void) => {
    if (isDev && !isTest) {
      console.groupCollapsed(label)
      fn()
      console.groupEnd()
    }
  },

  /**
   * Log a table (only in development)
   * Useful for displaying arrays of objects
   */
  table: (data: any) => {
    if (isDev && !isTest) {
      console.table(data)
    }
  },

  /**
   * Start a timer (only in development)
   */
  time: (label: string) => {
    if (isDev && !isTest) {
      console.time(label)
    }
  },

  /**
   * End a timer and log the elapsed time (only in development)
   */
  timeEnd: (label: string) => {
    if (isDev && !isTest) {
      console.timeEnd(label)
    }
  }
}

/**
 * Create a namespaced logger for a specific module
 * Example: const log = createLogger('Anlegg')
 */
export function createLogger(namespace: string) {
  return {
    log: (...args: any[]) => logger.log(`[${namespace}]`, ...args),
    debug: (...args: any[]) => logger.debug(`[${namespace}]`, ...args),
    info: (...args: any[]) => logger.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => {
      if (isDev && !isTest) {
        originalConsole.warn(`[${namespace}]`, ...args)
      }
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(serializeForLog(arg)) : String(arg)
      ).join(' ')
      saveLogToDatabase('warn', namespace, message, args.length > 1 ? serializeForLog(args.slice(1)) : undefined)
    },
    error: (...args: any[]) => {
      originalConsole.error(`[${namespace}]`, ...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(serializeForLog(arg)) : String(arg)
      ).join(' ')
      saveLogToDatabase('error', namespace, message, args.length > 1 ? serializeForLog(args.slice(1)) : undefined)
    },
    group: (label: string, fn: () => void) => logger.group(`[${namespace}] ${label}`, fn),
    groupCollapsed: (label: string, fn: () => void) => logger.groupCollapsed(`[${namespace}] ${label}`, fn),
    table: (data: any) => logger.table(data),
    time: (label: string) => logger.time(`[${namespace}] ${label}`),
    timeEnd: (label: string) => logger.timeEnd(`[${namespace}] ${label}`)
  }
}
