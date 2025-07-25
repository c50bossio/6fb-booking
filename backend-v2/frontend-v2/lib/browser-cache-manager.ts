/**
 * Browser Cache Management for Docker Development
 * Handles cache invalidation and consistency issues in containerized environments
 */

export interface CacheConfig {
  prefix: string;
  ttl: number; // Time to live in milliseconds
  version: string;
  containerMode: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  version: string;
  containerId?: string;
  expires: number;
}

export class BrowserCacheManager {
  private config: CacheConfig;
  private containerId: string;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      prefix: 'bb_cache_',
      ttl: 5 * 60 * 1000, // 5 minutes default
      version: '1.0.0',
      containerMode: this.isContainerMode(),
      ...config
    };

    this.containerId = this.getContainerId();
    this.setupContainerDetection();
    this.setupStorageListener();
    this.cleanupExpiredEntries();
  }

  /**
   * Detect if running in container mode
   */
  private isContainerMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      process.env.NEXT_PUBLIC_CONTAINER_MODE === 'true' ||
      process.env.CONTAINER_MODE === 'true' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }

  /**
   * Get or generate container ID for tracking restarts
   */
  private getContainerId(): string {
    if (typeof window === 'undefined') return 'ssr';

    const stored = localStorage.getItem(`${this.config.prefix}container_id`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Check if container might have restarted (simple heuristic)
        const age = Date.now() - data.timestamp;
        if (age < 10 * 60 * 1000) { // Less than 10 minutes
          return data.id;
        }
      } catch (e) {
        console.warn('Failed to parse container ID:', e);
      }
    }

    // Generate new container ID
    const newId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const containerData = {
      id: newId,
      timestamp: Date.now(),
      version: this.config.version
    };

    try {
      localStorage.setItem(`${this.config.prefix}container_id`, JSON.stringify(containerData));
    } catch (e) {
      console.warn('Failed to store container ID:', e);
    }

    return newId;
  }

  /**
   * Setup container restart detection
   */
  private setupContainerDetection(): void {
    if (!this.config.containerMode || typeof window === 'undefined') return;

    // Periodic check for container changes
    setInterval(() => {
      this.checkContainerRestart();
    }, 30000); // Check every 30 seconds

    // Check on visibility change (when user switches back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkContainerRestart();
      }
    });

    // Check on focus
    window.addEventListener('focus', () => {
      this.checkContainerRestart();
    });
  }

  /**
   * Check if container has restarted
   */
  private async checkContainerRestart(): Promise<void> {
    try {
      // Simple health check to detect backend restart
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const health = await response.json();
        const serverStartTime = health.startTime || health.timestamp;
        
        // Check if server start time changed
        const lastKnownStart = localStorage.getItem(`${this.config.prefix}server_start`);
        
        if (lastKnownStart && lastKnownStart !== serverStartTime) {
          console.log('🔄 Container restart detected, invalidating caches');
          this.handleContainerRestart();
        } else if (serverStartTime) {
          localStorage.setItem(`${this.config.prefix}server_start`, serverStartTime);
        }
      }
    } catch (error) {
      // Ignore network errors during development
      console.debug('Container health check failed:', error.message);
    }
  }

  /**
   * Handle detected container restart
   */
  private handleContainerRestart(): void {
    // Clear all cache entries
    this.clearAll();
    
    // Generate new container ID
    this.containerId = this.getContainerId();
    
    // Emit restart event
    this.emit('containerRestart', { containerId: this.containerId });
    
    // Force auth re-validation by clearing auth-related storage
    this.clearAuthCache();
  }

  /**
   * Clear authentication-related cache
   */
  private clearAuthCache(): void {
    if (typeof window === 'undefined') return;

    const authKeys = [
      'bookedbarber_auth_v2',
      'auth_cache_buster',
      'container_restart_detected'
    ];

    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to clear ${key}:`, e);
      }
    });

    // Clear auth cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      const trimmedName = name.trim();
      
      if (trimmedName.includes('token') || 
          trimmedName.includes('auth') || 
          trimmedName.includes('session')) {
        document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  }

  /**
   * Setup storage event listener for cross-tab communication
   */
  private setupStorageListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(this.config.prefix)) {
        const key = event.key.replace(this.config.prefix, '');
        this.emit('storageChange', { key, oldValue: event.oldValue, newValue: event.newValue });
      }
    });
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): boolean {
    if (typeof window === 'undefined') return false;

    const actualTtl = ttl || this.config.ttl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: this.config.version,
      containerId: this.containerId,
      expires: Date.now() + actualTtl
    };

    try {
      const storageKey = `${this.config.prefix}${key}`;
      localStorage.setItem(storageKey, JSON.stringify(entry));
      
      // Emit cache set event
      this.emit('set', { key, data, ttl: actualTtl });
      
      return true;
    } catch (error) {
      console.warn(`Failed to set cache entry ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const storageKey = `${this.config.prefix}${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if entry is expired
      if (Date.now() > entry.expires) {
        this.remove(key);
        return null;
      }

      // Check if entry is from different container
      if (this.config.containerMode && 
          entry.containerId && 
          entry.containerId !== this.containerId) {
        console.log(`Cache entry ${key} from different container, invalidating`);
        this.remove(key);
        return null;
      }

      // Check version compatibility
      if (entry.version !== this.config.version) {
        console.log(`Cache entry ${key} version mismatch, invalidating`);
        this.remove(key);
        return null;
      }

      // Emit cache hit event
      this.emit('get', { key, hit: true });

      return entry.data;
    } catch (error) {
      console.warn(`Failed to get cache entry ${key}:`, error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Remove cache entry
   */
  remove(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const storageKey = `${this.config.prefix}${key}`;
      localStorage.removeItem(storageKey);
      
      // Emit cache remove event
      this.emit('remove', { key });
      
      return true;
    } catch (error) {
      console.warn(`Failed to remove cache entry ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const keysToRemove: string[] = [];
      
      // Find all keys with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.config.prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Emit clear event
      this.emit('clear', { count: keysToRemove.length });

      return true;
    } catch (error) {
      console.warn('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpiredEntries(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      const now = Date.now();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.config.prefix)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry: CacheEntry = JSON.parse(stored);
              if (now > entry.expires) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // Invalid entry, remove it
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        console.log(`🧹 Cleaned up ${keysToRemove.length} expired cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired entries:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
    containerEntries: number;
  } {
    if (typeof window === 'undefined') {
      return { totalEntries: 0, totalSize: 0, expiredEntries: 0, containerEntries: 0 };
    }

    let totalEntries = 0;
    let totalSize = 0;
    let expiredEntries = 0;
    let containerEntries = 0;
    const now = Date.now();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.config.prefix)) {
          totalEntries++;
          
          const stored = localStorage.getItem(key);
          if (stored) {
            totalSize += stored.length;
            
            try {
              const entry: CacheEntry = JSON.parse(stored);
              
              if (now > entry.expires) {
                expiredEntries++;
              }
              
              if (entry.containerId === this.containerId) {
                containerEntries++;
              }
            } catch (e) {
              expiredEntries++; // Count invalid entries as expired
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return { totalEntries, totalSize, expiredEntries, containerEntries };
  }

  /**
   * Event handling
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`Error in cache event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Force invalidate all cache (for manual cache busting)
   */
  invalidateAll(): void {
    // Clear all cache
    this.clearAll();
    
    // Set cache buster
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${this.config.prefix}cache_buster`, Date.now().toString());
    }
    
    // Emit invalidation event
    this.emit('invalidateAll', { timestamp: Date.now() });
  }

  /**
   * Create cache-aware fetch wrapper
   */
  createCachedFetch = (defaultTtl: number = this.config.ttl) => {
    return async (url: string, options: RequestInit & { cacheTtl?: number } = {}): Promise<Response> => {
      const { cacheTtl, ...fetchOptions } = options;
      const method = (fetchOptions.method || 'GET').toUpperCase();
      
      // Only cache GET requests
      if (method !== 'GET') {
        return fetch(url, fetchOptions);
      }

      const cacheKey = `fetch_${url}_${JSON.stringify(fetchOptions)}`;
      const actualTtl = cacheTtl !== undefined ? cacheTtl : defaultTtl;

      // Try to get from cache first
      const cached = this.get<{ response: string; headers: Record<string, string>; status: number }>(cacheKey);
      
      if (cached) {
        console.debug(`Cache hit for ${url}`);
        return new Response(cached.response, {
          status: cached.status,
          headers: cached.headers
        });
      }

      // Fetch from network
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Cache-Control': 'no-cache',
            ...fetchOptions.headers
          }
        });

        // Cache successful responses
        if (response.ok && actualTtl > 0) {
          const responseText = await response.text();
          const headers: Record<string, string> = {};
          
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });

          this.set(cacheKey, {
            response: responseText,
            headers,
            status: response.status
          }, actualTtl);

          // Return new response with cached data
          return new Response(responseText, {
            status: response.status,
            headers: response.headers
          });
        }

        return response;
      } catch (error) {
        console.error(`Cached fetch failed for ${url}:`, error);
        throw error;
      }
    };
  };
}

// Export singleton instance for Docker development
export const dockerCacheManager = new BrowserCacheManager({
  containerMode: true,
  ttl: 2 * 60 * 1000, // 2 minutes for development
  version: '2.0.0'
});

// Export React hook for easy usage
export const useDockerCache = () => {
  return {
    set: dockerCacheManager.set.bind(dockerCacheManager),
    get: dockerCacheManager.get.bind(dockerCacheManager),
    remove: dockerCacheManager.remove.bind(dockerCacheManager),
    clear: dockerCacheManager.clearAll.bind(dockerCacheManager),
    invalidate: dockerCacheManager.invalidateAll.bind(dockerCacheManager),
    stats: dockerCacheManager.getStats.bind(dockerCacheManager),
    fetch: dockerCacheManager.createCachedFetch()
  };
};

export default BrowserCacheManager;