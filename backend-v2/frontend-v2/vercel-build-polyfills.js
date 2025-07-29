/**
 * Build-time polyfills for Vercel deployment
 * This file is loaded by Node.js before the build starts
 */

// Apply polyfills immediately when this file is loaded
if (typeof global !== 'undefined' && typeof window === 'undefined') {
  // Define self
  if (typeof self === 'undefined') {
    Object.defineProperty(global, 'self', {
      value: global,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
  
  // Define window
  if (typeof window === 'undefined') {
    Object.defineProperty(global, 'window', {
      value: global,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
  
  // Define document
  if (typeof document === 'undefined') {
    Object.defineProperty(global, 'document', {
      value: {
        createElement: (tag) => ({
          tagName: tag ? tag.toUpperCase() : 'DIV',
          style: {},
          setAttribute: () => {},
          getAttribute: () => null,
          appendChild: (child) => child,
          removeChild: (child) => child,
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
          }
        }),
        createTextNode: (text) => ({ textContent: text || '', nodeType: 3 }),
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        getElementsByTagName: () => [],
        getElementsByClassName: () => [],
        head: { appendChild: (child) => child },
        body: { appendChild: (child) => child },
        documentElement: { style: {} },
        styleSheets: [],
        implementation: {
          createHTMLDocument: () => global.document
        }
      },
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
  
  // Define navigator
  if (typeof navigator === 'undefined') {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Node.js/Vercel Build',
        platform: 'server',
        language: 'en-US'
      },
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
  
  // Define globalThis
  if (typeof globalThis === 'undefined') {
    Object.defineProperty(global, 'globalThis', {
      value: global,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
  
  // Patch process.env for webpack runtime compatibility
  if (typeof process !== 'undefined' && process.env) {
    // Ensure NODE_ENV is set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }
  }
  
  // Add minimal polyfill for potential undefined checks
  global.__webpack_require__ = global.__webpack_require__ || function(moduleId) {
    return require(moduleId);
  };
}

console.log('[Vercel Build] Polyfills applied successfully');