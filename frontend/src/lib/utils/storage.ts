/**
 * Safe localStorage wrapper that handles browser extension conflicts
 * and other edge cases where localStorage might be blocked or unavailable
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null
      return localStorage.getItem(key)
    } catch (e) {
      console.warn(`Failed to get ${key} from localStorage:`, e)
      return null
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') return false
      localStorage.setItem(key, value)
      return true
    } catch (e) {
      console.warn(`Failed to set ${key} in localStorage:`, e)
      return false
    }
  },

  removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false
      localStorage.removeItem(key)
      return true
    } catch (e) {
      console.warn(`Failed to remove ${key} from localStorage:`, e)
      return false
    }
  },

  clear(): boolean {
    try {
      if (typeof window === 'undefined') return false
      localStorage.clear()
      return true
    } catch (e) {
      console.warn('Failed to clear localStorage:', e)
      return false
    }
  }
}

// Session storage fallback for when localStorage is blocked
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null
      return sessionStorage.getItem(key)
    } catch (e) {
      console.warn(`Failed to get ${key} from sessionStorage:`, e)
      return null
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') return false
      sessionStorage.setItem(key, value)
      return true
    } catch (e) {
      console.warn(`Failed to set ${key} in sessionStorage:`, e)
      return false
    }
  },

  removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false
      sessionStorage.removeItem(key)
      return true
    } catch (e) {
      console.warn(`Failed to remove ${key} from sessionStorage:`, e)
      return false
    }
  }
}

// In-memory storage as a last resort fallback
class InMemoryStorage {
  private storage: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.storage.get(key) || null
  }

  setItem(key: string, value: string): boolean {
    this.storage.set(key, value)
    return true
  }

  removeItem(key: string): boolean {
    return this.storage.delete(key)
  }

  clear(): boolean {
    this.storage.clear()
    return true
  }
}

export const memoryStorage = new InMemoryStorage()

// Smart storage that tries localStorage, falls back to sessionStorage, then memory
export const smartStorage = {
  getItem(key: string): string | null {
    // Try localStorage first
    let value = safeStorage.getItem(key)
    if (value !== null) return value

    // Try sessionStorage
    value = safeSessionStorage.getItem(key)
    if (value !== null) return value

    // Fall back to memory
    return memoryStorage.getItem(key)
  },

  setItem(key: string, value: string): boolean {
    // Try to set in all available storages
    const localSuccess = safeStorage.setItem(key, value)
    const sessionSuccess = safeSessionStorage.setItem(key, value)
    const memorySuccess = memoryStorage.setItem(key, value)

    // Return true if at least one succeeded
    return localSuccess || sessionSuccess || memorySuccess
  },

  removeItem(key: string): boolean {
    // Remove from all storages
    const localSuccess = safeStorage.removeItem(key)
    const sessionSuccess = safeSessionStorage.removeItem(key)
    const memorySuccess = memoryStorage.removeItem(key)

    // Return true if at least one succeeded
    return localSuccess || sessionSuccess || memorySuccess
  }
}
