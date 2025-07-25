/**
 * Docker-Aware Authentication Manager for BookedBarber V2
 * Handles auth consistency and browser cache issues in containerized environments
 */

interface ContainerInfo {
  containerId?: string;
  startTime?: string;
  isContainer: boolean;
}

interface AuthState {
  token?: string;
  refreshToken?: string;
  user?: any;
  sessionId?: string;
  containerInfo?: ContainerInfo;
  lastSync?: string;
}

interface AuthCacheManager {
  clear: () => void;
  invalidate: () => void;
  isStale: () => boolean;
  setContainerRestart: () => void;
}

class DockerAuthManager {
  private static instance: DockerAuthManager;
  private containerInfo: ContainerInfo;
  private authState: AuthState = {};
  private cacheManager: AuthCacheManager;
  private syncInterval?: NodeJS.Timeout;
  private readonly STORAGE_KEY = 'bookedbarber_auth_v2';
  private readonly CONTAINER_KEY = 'bookedbarber_container_info';
  
  private constructor() {
    this.containerInfo = this.detectContainerEnvironment();
    this.cacheManager = this.createCacheManager();
    this.initializeAuth();
    this.setupPeriodicSync();
  }

  static getInstance(): DockerAuthManager {
    if (!DockerAuthManager.instance) {
      DockerAuthManager.instance = new DockerAuthManager();
    }
    return DockerAuthManager.instance;
  }

  /**
   * Detect if running in container and get container info
   */
  private detectContainerEnvironment(): ContainerInfo {
    // Check if we're in a container environment
    const isContainer = 
      typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        process.env.NEXT_PUBLIC_CONTAINER_MODE === 'true' ||
        process.env.CONTAINER_MODE === 'true'
      );

    const containerInfo: ContainerInfo = {
      isContainer,
      startTime: new Date().toISOString(),
    };

    // Try to get container ID from environment or generate one
    if (isContainer) {
      containerInfo.containerId = this.getContainerId();
    }

    return containerInfo;
  }

  /**
   * Get or generate a container ID for tracking restarts
   */
  private getContainerId(): string {
    if (typeof window === 'undefined') return 'ssr-container';
    
    // Try to get existing container ID
    const stored = localStorage.getItem(this.CONTAINER_KEY);
    if (stored) {
      try {
        const containerData = JSON.parse(stored);
        // Check if container might have restarted (simple heuristic)
        const timeSinceStart = Date.now() - new Date(containerData.startTime).getTime();
        if (timeSinceStart < 5 * 60 * 1000) { // Less than 5 minutes ago
          return containerData.containerId;
        }
      } catch (e) {
        console.warn('Failed to parse container info:', e);
      }
    }

    // Generate new container ID
    const newId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const containerData = {
      containerId: newId,
      startTime: this.containerInfo.startTime,
      lastUpdate: new Date().toISOString(),
    };

    try {
      localStorage.setItem(this.CONTAINER_KEY, JSON.stringify(containerData));
    } catch (e) {
      console.warn('Failed to store container info:', e);
    }

    return newId;
  }

  /**
   * Create cache manager for handling browser cache invalidation
   */
  private createCacheManager(): AuthCacheManager {
    return {
      clear: () => {
        if (typeof window === 'undefined') return;
        
        try {
          // Clear auth-related localStorage
          const authKeys = Object.keys(localStorage).filter(key =>
            key.includes('auth') ||
            key.includes('token') ||
            key.includes('session') ||
            key.includes('bookedbarber') ||
            key.includes('6fb')
          );
          
          authKeys.forEach(key => localStorage.removeItem(key));
          
          // Clear auth-related sessionStorage
          const sessionKeys = Object.keys(sessionStorage).filter(key =>
            key.includes('auth') ||
            key.includes('token') ||
            key.includes('session') ||
            key.includes('bookedbarber') ||
            key.includes('6fb')
          );
          
          sessionKeys.forEach(key => sessionStorage.removeItem(key));
          
          console.log('🧹 Docker Auth Manager: Cache cleared');
        } catch (e) {
          console.warn('Failed to clear cache:', e);
        }
      },

      invalidate: () => {
        // Mark current auth state as invalid
        this.authState = {};
        
        // Set cache buster
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('auth_cache_buster', Date.now().toString());
          } catch (e) {
            console.warn('Failed to set cache buster:', e);
          }
        }
      },

      isStale: () => {
        if (typeof window === 'undefined') return false;
        
        try {
          const lastBuster = localStorage.getItem('auth_cache_buster');
          const authData = localStorage.getItem(this.STORAGE_KEY);
          
          if (!authData) return true;
          
          const parsed = JSON.parse(authData);
          const authTime = new Date(parsed.lastSync || 0).getTime();
          const busterTime = lastBuster ? parseInt(lastBuster) : 0;
          
          return busterTime > authTime;
        } catch (e) {
          return true;
        }
      },

      setContainerRestart: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('container_restart_detected', Date.now().toString());
        }
      }
    };
  }

  /**
   * Initialize authentication state
   */
  private initializeAuth(): void {
    if (typeof window === 'undefined') return;

    try {
      // Check for container restart
      const restartDetected = localStorage.getItem('container_restart_detected');
      if (restartDetected) {
        console.log('🐳 Container restart detected, clearing auth cache');
        this.cacheManager.clear();
        localStorage.removeItem('container_restart_detected');
      }

      // Load existing auth state
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && !this.cacheManager.isStale()) {
        this.authState = JSON.parse(stored);
        this.authState.containerInfo = this.containerInfo;
      } else {
        this.authState = {
          containerInfo: this.containerInfo,
          lastSync: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('Failed to initialize auth state:', e);
      this.authState = {
        containerInfo: this.containerInfo,
        lastSync: new Date().toISOString(),
      };
    }
  }

  /**
   * Setup periodic sync to detect container restarts
   */
  private setupPeriodicSync(): void {
    if (typeof window === 'undefined') return;

    this.syncInterval = setInterval(() => {
      this.syncContainerState();
    }, 30000); // Check every 30 seconds

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
    });
  }

  /**
   * Sync container state and detect restarts
   */
  private async syncContainerState(): Promise<void> {
    if (!this.containerInfo.isContainer) return;

    try {
      // Simple health check to detect if backend restarted
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
      });

      const healthData = await response.json();
      
      // Check if server start time changed (indicating restart)
      const currentStartTime = healthData?.startTime || healthData?.timestamp;
      const storedStartTime = this.authState.containerInfo?.startTime;

      if (currentStartTime && storedStartTime && currentStartTime !== storedStartTime) {
        console.log('🔄 Backend restart detected, invalidating auth cache');
        this.handleContainerRestart();
      }
    } catch (e) {
      console.debug('Container sync failed (expected during startup):', e.message);
    }
  }

  /**
   * Handle detected container restart
   */
  private handleContainerRestart(): void {
    this.cacheManager.setContainerRestart();
    this.cacheManager.invalidate();
    
    // Update container info
    this.containerInfo = this.detectContainerEnvironment();
    this.authState.containerInfo = this.containerInfo;
    
    // Emit custom event for components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('containerRestart', {
        detail: { containerId: this.containerInfo.containerId }
      }));
    }
  }

  /**
   * Set authentication state
   */
  setAuth(authData: {
    token?: string;
    refreshToken?: string;
    user?: any;
    sessionId?: string;
  }): void {
    this.authState = {
      ...authData,
      containerInfo: this.containerInfo,
      lastSync: new Date().toISOString(),
    };

    this.persistAuthState();
  }

  /**
   * Get current authentication state
   */
  getAuth(): AuthState {
    // Check if cache is stale
    if (this.cacheManager.isStale()) {
      console.log('🐳 Auth cache is stale, clearing...');
      this.clearAuth();
      return { containerInfo: this.containerInfo };
    }

    return this.authState;
  }

  /**
   * Clear authentication state
   */
  clearAuth(): void {
    this.authState = {
      containerInfo: this.containerInfo,
      lastSync: new Date().toISOString(),
    };
    
    this.cacheManager.clear();
    this.persistAuthState();
  }

  /**
   * Persist auth state to localStorage
   */
  private persistAuthState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.authState));
    } catch (e) {
      console.warn('Failed to persist auth state:', e);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const auth = this.getAuth();
    return !!(auth.token && auth.user);
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const auth = this.getAuth();
    const headers: Record<string, string> = {};

    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    if (auth.sessionId) {
      headers['X-Session-ID'] = auth.sessionId;
    }

    if (this.containerInfo.containerId) {
      headers['X-Container-ID'] = this.containerInfo.containerId;
    }

    // Add cache busting for auth requests
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';

    return headers;
  }

  /**
   * Create fetch wrapper with auth headers
   */
  authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeaders = this.getAuthHeaders();
    
    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      // Handle auth errors
      if (response.status === 401) {
        console.log('🔐 Authentication failed, clearing cache');
        this.clearAuth();
        
        // Emit auth error event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('authError', {
            detail: { status: 401, url }
          }));
        }
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch failed:', error);
      throw error;
    }
  };

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Export singleton instance
export const dockerAuthManager = DockerAuthManager.getInstance();

// Export types
export type { AuthState, ContainerInfo, AuthCacheManager };

// Export utility functions
export const useDockerAuth = () => {
  const manager = DockerAuthManager.getInstance();
  
  return {
    auth: manager.getAuth(),
    setAuth: manager.setAuth.bind(manager),
    clearAuth: manager.clearAuth.bind(manager),
    isAuthenticated: manager.isAuthenticated.bind(manager),
    fetch: manager.authenticatedFetch,
    headers: manager.getAuthHeaders(),
  };
};

// Browser cache reset utility
export const resetBrowserAuthCache = () => {
  if (typeof window === 'undefined') return;
  
  const manager = DockerAuthManager.getInstance();
  manager.clearAuth();
  
  // Force page reload
  setTimeout(() => {
    window.location.reload();
  }, 100);
};

export default DockerAuthManager;