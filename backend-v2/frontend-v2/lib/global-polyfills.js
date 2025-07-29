/**
 * Global SSR Polyfills - Loaded before all other code
 * Defines critical browser globals to prevent "self is not defined" errors
 * MUST RUN BEFORE ANY OTHER CODE
 */

// Immediately define self in the global scope - this MUST be first
(function() {
  'use strict';
  
  // Get the global object
  const globalScope = (function() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof global !== 'undefined') return global;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    // Last resort - create one
    return (function() { return this; })();
  })();
  
  // Define self immediately 
  if (!globalScope.self) {
    globalScope.self = globalScope;
  }
  
  // Also define on global specifically for Node.js
  if (typeof global !== 'undefined' && !global.self) {
    global.self = global;
  }
})();

// Define window for server-side rendering
if (typeof window === 'undefined') {
  global.window = global;
}

// Define document for server-side rendering
if (typeof document === 'undefined') {
  global.document = {
    createElement: () => ({}),
    createTextNode: () => ({}),
    body: {},
    head: {},
    documentElement: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    cookie: '',
    title: 'BookedBarber',
    readyState: 'complete'
  };
}

// Define navigator for server-side rendering
if (typeof navigator === 'undefined') {
  global.navigator = {
    userAgent: 'Mozilla/5.0 (Server-Side Rendering)',
    platform: 'SSR',
    language: 'en-US',
    languages: ['en-US'],
    onLine: true,
    cookieEnabled: false,
    doNotTrack: null
  };
}

// Define location for server-side rendering
if (typeof location === 'undefined') {
  global.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: () => {},
    replace: () => {},
    reload: () => {},
    toString: () => 'http://localhost:3000'
  };
}

// Define localStorage for server-side rendering
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  };
}

// Define sessionStorage for server-side rendering
if (typeof sessionStorage === 'undefined') {
  global.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  };
}

// Define screen for server-side rendering
if (typeof screen === 'undefined') {
  global.screen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24
  };
}

// Define crypto for server-side rendering
if (typeof crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  };
}

// Define animation frame functions for server-side rendering
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
}

if (typeof cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Define fetch for server-side rendering
if (typeof fetch === 'undefined') {
  global.fetch = () => Promise.reject(new Error('fetch not available in SSR'));
}

// Define WebSocket for server-side rendering
if (typeof WebSocket === 'undefined') {
  global.WebSocket = class WebSocket {
    constructor() {
      this.readyState = 3; // CLOSED
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSING = 2;
      this.CLOSED = 3;
    }
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

// Define IntersectionObserver for server-side rendering
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Define MutationObserver for server-side rendering
if (typeof MutationObserver === 'undefined') {
  global.MutationObserver = class MutationObserver {
    constructor() {}
    observe() {}
    disconnect() {}
  };
}

// Define ResizeObserver for server-side rendering
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

module.exports = global;