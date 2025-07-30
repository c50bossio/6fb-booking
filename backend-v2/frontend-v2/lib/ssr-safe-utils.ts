/**
 * SSR-Safe Utilities for Next.js
 * 
 * These utilities provide safe access to browser APIs that are not available
 * during server-side rendering. All functions check for the availability of
 * browser APIs before attempting to use them.
 */

/**
 * SSR-safe localStorage wrapper
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
  
  clear: (): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.clear();
    } catch {
      // Ignore storage errors
    }
  }
};

/**
 * SSR-safe sessionStorage wrapper
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

/**
 * SSR-safe cookie utilities
 */
export const safeCookie = {
  set: (name: string, value: string, options: string = ''): void => {
    if (typeof document === 'undefined') {
      return;
    }
    document.cookie = `${name}=${value}; ${options}`;
  },
  
  get: (name: string): string | null => {
    if (typeof document === 'undefined') {
      return null;
    }
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },
  
  remove: (name: string): void => {
    if (typeof document === 'undefined') {
      return;
    }
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict`;
  }
};

/**
 * SSR-safe window utilities
 */
export const safeWindow = {
  location: {
    href: (url?: string): string | void => {
      if (typeof window === 'undefined') {
        return '';
      }
      if (url) {
        window.location.href = url;
      } else {
        return window.location.href;
      }
    },
    
    pathname: (): string => {
      if (typeof window === 'undefined') {
        return '';
      }
      return window.location.pathname;
    },
    
    search: (): string => {
      if (typeof window === 'undefined') {
        return '';
      }
      return window.location.search;
    },
    
    reload: (): void => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    
    replace: (url: string): void => {
      if (typeof window !== 'undefined') {
        window.location.replace(url);
      }
    }
  },
  
  matchMedia: (query: string): MediaQueryList | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.matchMedia(query);
  },
  
  addEventListener: (event: string, handler: EventListener, options?: any): void => {
    if (typeof window !== 'undefined') {
      window.addEventListener(event, handler, options);
    }
  },
  
  removeEventListener: (event: string, handler: EventListener, options?: any): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(event, handler, options);
    }
  },
  
  scrollTo: (options: ScrollToOptions | number, y?: number): void => {
    if (typeof window !== 'undefined') {
      if (typeof options === 'number') {
        window.scrollTo(options, y || 0);
      } else {
        window.scrollTo(options);
      }
    }
  }
};

/**
 * SSR-safe document utilities
 */
export const safeDocument = {
  createElement: <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] | null => {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.createElement(tagName);
  },
  
  getElementById: (id: string): HTMLElement | null => {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById(id);
  },
  
  querySelector: <E extends Element = Element>(selector: string): E | null => {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.querySelector<E>(selector);
  },
  
  querySelectorAll: <E extends Element = Element>(selector: string): NodeListOf<E> | [] => {
    if (typeof document === 'undefined') {
      return [] as any;
    }
    return document.querySelectorAll<E>(selector);
  },
  
  body: (): HTMLElement | null => {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.body;
  }
};

/**
 * SSR-safe navigator utilities
 */
export const safeNavigator = {
  userAgent: (): string => {
    if (typeof navigator === 'undefined') {
      return '';
    }
    return navigator.userAgent;
  },
  
  platform: (): string => {
    if (typeof navigator === 'undefined') {
      return '';
    }
    return navigator.platform;
  },
  
  language: (): string => {
    if (typeof navigator === 'undefined') {
      return 'en-US';
    }
    return navigator.language;
  },
  
  onLine: (): boolean => {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  }
};

/**
 * Check if code is running in browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Check if code is running on server
 */
export const isServer = (): boolean => {
  return !isBrowser();
};

/**
 * Run function only in browser
 */
export const runInBrowser = <T>(fn: () => T, fallback?: T): T | undefined => {
  if (isBrowser()) {
    return fn();
  }
  return fallback;
};

/**
 * Create download link for blob
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  if (!isBrowser()) return;
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};