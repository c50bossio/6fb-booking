/**
 * Server-side globals for Next.js SSR
 * Provides browser globals in Node.js environment
 */

// Only apply in server environment
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  // Define self
  if (typeof self === 'undefined') {
    global.self = global;
  }
  
  // Define window
  if (typeof window === 'undefined') {
    global.window = global;
  }
  
  // Define document
  if (typeof document === 'undefined') {
    global.document = {
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
    };
  }
  
  // Define navigator
  if (typeof navigator === 'undefined') {
    global.navigator = {
      userAgent: 'Node.js SSR',
      platform: 'server',
      language: 'en-US'
    };
  }
  
  // Define globalThis
  if (typeof globalThis === 'undefined') {
    global.globalThis = global;
  }
}

// Export globals for webpack ProvidePlugin
module.exports = {
  self: global.self || global,
  window: global.window || global,
  document: global.document || {},
  navigator: global.navigator || {},
  globalThis: global.globalThis || global
};