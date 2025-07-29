/**
 * SSR Polyfills for browser globals
 * Provides safe fallbacks for window, self, navigator, and global objects during server-side rendering
 */

// Create a safe global object that works in both server and browser environments
const createSafeGlobal = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  if (typeof self !== 'undefined') return self;
  
  // Fallback: create minimal global
  return {};
};

// Safe window object for SSR
const safeWindow = createSafeGlobal();
safeWindow.window = safeWindow;
safeWindow.self = safeWindow;
safeWindow.global = safeWindow;

// Safe navigator object for SSR
safeWindow.navigator = safeWindow.navigator || {
  userAgent: 'Mozilla/5.0 (Server-Side Rendering)',
  platform: 'SSR',
  language: 'en-US',
  languages: ['en-US'],
  onLine: true,
  cookieEnabled: false,
  doNotTrack: null,
  maxTouchPoints: 0,
  hardwareConcurrency: 1,
  deviceMemory: 4,
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  }
};

// Safe location object for SSR
safeWindow.location = safeWindow.location || {
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

// Safe document object for SSR
safeWindow.document = safeWindow.document || {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      setAttribute: function(name, value) { this[name] = value; },
      getAttribute: function(name) { return this[name] || null; },
      addEventListener: () => {},
      removeEventListener: () => {},
      style: {},
      innerHTML: '',
      textContent: '',
      appendChild: () => {},
      removeChild: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      getElementsByTagName: () => [],
      getElementsByClassName: () => [],
      click: () => {},
      focus: () => {},
      blur: () => {},
      dispatchEvent: () => true,
      nodeType: 1, // ELEMENT_NODE
      nodeName: tag.toUpperCase()
    };
    return element;
  },
  createTextNode: (text) => ({ textContent: text, nodeType: 3 }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => false
    }
  },
  head: {
    appendChild: () => {},
    removeChild: () => {}
  },
  documentElement: {
    style: {},
    setAttribute: () => {},
    getAttribute: () => null
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  cookie: '',
  title: 'BookedBarber',
  readyState: 'complete',
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  getElementsByTagName: () => [],
  getElementsByClassName: () => []
};

// Safe screen object for SSR
safeWindow.screen = safeWindow.screen || {
  width: 1920,
  height: 1080,
  availWidth: 1920,
  availHeight: 1040,
  colorDepth: 24,
  pixelDepth: 24,
  orientation: {
    type: 'landscape-primary',
    angle: 0
  }
};

// Safe localStorage/sessionStorage for SSR
const createSafeStorage = () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0
});

safeWindow.localStorage = safeWindow.localStorage || createSafeStorage();
safeWindow.sessionStorage = safeWindow.sessionStorage || createSafeStorage();

// Safe console for SSR (usually available but just in case)
safeWindow.console = safeWindow.console || {
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
  group: () => {},
  groupEnd: () => {},
  time: () => {},
  timeEnd: () => {}
};

// Safe fetch for SSR
safeWindow.fetch = safeWindow.fetch || (() => 
  Promise.reject(new Error('fetch not available in SSR'))
);

// Safe WebSocket for SSR - check if property is writable first
if (!safeWindow.WebSocket) {
  try {
    // Try to define WebSocket if it doesn't exist
    Object.defineProperty(safeWindow, 'WebSocket', {
      value: class WebSocket {
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
      },
      writable: true,
      configurable: true
    });
  } catch (e) {
    // If we can't define WebSocket, it might already exist as a read-only property
    // In that case, just skip it since the browser already has WebSocket
    console.warn('Could not polyfill WebSocket, using existing implementation:', e.message);
  }
}

// Safe requestAnimationFrame/cancelAnimationFrame for SSR
safeWindow.requestAnimationFrame = safeWindow.requestAnimationFrame || 
  ((callback) => setTimeout(callback, 16));
safeWindow.cancelAnimationFrame = safeWindow.cancelAnimationFrame || 
  ((id) => clearTimeout(id));

// Safe requestIdleCallback/cancelIdleCallback for SSR
safeWindow.requestIdleCallback = safeWindow.requestIdleCallback || 
  ((callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1));
safeWindow.cancelIdleCallback = safeWindow.cancelIdleCallback || 
  ((id) => clearTimeout(id));

// Safe intersection observer for SSR
safeWindow.IntersectionObserver = safeWindow.IntersectionObserver || class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Safe mutation observer for SSR
safeWindow.MutationObserver = safeWindow.MutationObserver || class MutationObserver {
  constructor() {}
  observe() {}
  disconnect() {}
};

// Safe resize observer for SSR
safeWindow.ResizeObserver = safeWindow.ResizeObserver || class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Safe crypto for SSR
safeWindow.crypto = safeWindow.crypto || {
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

// Export the safe global for use in webpack aliases
module.exports = safeWindow;

// Also set as global for direct access
if (typeof global !== 'undefined') {
  global.window = global.window || safeWindow;
  global.self = global.self || safeWindow;
  global.navigator = global.navigator || safeWindow.navigator;
  global.document = global.document || safeWindow.document;
  global.location = global.location || safeWindow.location;
  global.screen = global.screen || safeWindow.screen;
  global.localStorage = global.localStorage || safeWindow.localStorage;
  global.sessionStorage = global.sessionStorage || safeWindow.sessionStorage;
  global.console = global.console || safeWindow.console;
  global.fetch = global.fetch || safeWindow.fetch;
  if (!global.WebSocket) {
    try {
      global.WebSocket = safeWindow.WebSocket;
    } catch (e) {
      // WebSocket might be read-only, skip if it exists
      console.warn('Could not assign global WebSocket:', e.message);
    }
  }
  global.requestAnimationFrame = global.requestAnimationFrame || safeWindow.requestAnimationFrame;
  global.cancelAnimationFrame = global.cancelAnimationFrame || safeWindow.cancelAnimationFrame;
  global.requestIdleCallback = global.requestIdleCallback || safeWindow.requestIdleCallback;
  global.cancelIdleCallback = global.cancelIdleCallback || safeWindow.cancelIdleCallback;
  global.IntersectionObserver = global.IntersectionObserver || safeWindow.IntersectionObserver;
  global.MutationObserver = global.MutationObserver || safeWindow.MutationObserver;
  global.ResizeObserver = global.ResizeObserver || safeWindow.ResizeObserver;
  global.crypto = global.crypto || safeWindow.crypto;
}