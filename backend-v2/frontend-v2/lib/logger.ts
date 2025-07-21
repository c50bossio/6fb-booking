/**
 * Simple logger utility for the application
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
  timestamp: Date
}

class Logger {
  private logs: LogEntry[] = []
  
  private log(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date()
    }
    
    this.logs.push(entry)
    
    // Also log to console for development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[logMethod](`[${level.toUpperCase()}] ${message}`, data ? data : '')
    }
  }
  
  info(message: string, data?: any) {
    this.log('info', message, data)
  }
  
  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }
  
  error(message: string, data?: any) {
    this.log('error', message, data)
  }
  
  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs]
  }
  
  clearLogs() {
    this.logs = []
  }
}

// Create a singleton logger instance
const logger = new Logger()

// Create specialized loggers for different domains
export const loggers = {
  booking: {
    step: (step: number, message: string, data?: any) => 
      logger.info(`Booking Step ${step}: ${message}`, data),
    error: (step: number, message: string, error?: any, context?: any) => 
      logger.error(`Booking Step ${step} Error: ${message}`, { error, context }),
    info: (message: string, data?: any) => 
      logger.info(`Booking: ${message}`, data)
  },
  api: {
    request: (endpoint: string, method: string, data?: any) =>
      logger.debug(`API ${method} ${endpoint}`, data),
    response: (endpoint: string, status: number, data?: any) =>
      logger.debug(`API Response ${status} ${endpoint}`, data),
    error: (endpoint: string, error: any) =>
      logger.error(`API Error ${endpoint}`, error)
  },
  auth: {
    login: (email: string) => 
      logger.info('User login attempt', { email }),
    logout: (email?: string) => 
      logger.info('User logout', { email }),
    error: (message: string, error?: any) => 
      logger.error(`Auth Error: ${message}`, error)
  }
}

export { logger }
export default logger