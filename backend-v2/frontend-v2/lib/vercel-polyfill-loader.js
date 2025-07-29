/**
 * Webpack loader that injects Vercel polyfills at the top of every module
 * This ensures polyfills are available before any code executes
 */

module.exports = function(source) {
  // Only apply to server-side code
  if (this.target !== 'node') {
    return source;
  }

  // Skip if already polyfilled (avoid double injection)
  if (source.includes('// Vercel Polyfill Injected')) {
    return source;
  }

  // Polyfill injection that runs before any other code
  const polyfillCode = `
// Vercel Polyfill Injected
(function() {
  if (typeof global !== 'undefined') {
    if (typeof self === 'undefined') global.self = global;
    if (typeof window === 'undefined') global.window = global;
    if (typeof globalThis === 'undefined') global.globalThis = global;
    if (typeof document === 'undefined') {
      global.document = {
        createElement: function(tag) {
          return {
            tagName: tag ? tag.toUpperCase() : 'DIV',
            style: {},
            setAttribute: function() {},
            getAttribute: function() { return null; },
            appendChild: function(child) { return child; },
            removeChild: function(child) { return child; }
          };
        },
        createTextNode: function(text) {
          return { textContent: text || '', nodeType: 3 };
        },
        querySelector: function() { return null; },
        querySelectorAll: function() { return []; },
        getElementById: function() { return null; },
        getElementsByTagName: function() { return []; },
        getElementsByClassName: function() { return []; },
        head: { appendChild: function(child) { return child; } },
        body: { appendChild: function(child) { return child; } },
        documentElement: { style: {} },
        styleSheets: []
      };
    }
    if (typeof navigator === 'undefined') {
      global.navigator = {
        userAgent: 'Node.js SSR',
        platform: 'server',
        language: 'en-US'
      };
    }
  }
})();
`;

  // Inject polyfills at the very beginning
  return polyfillCode + '\n' + source;
};