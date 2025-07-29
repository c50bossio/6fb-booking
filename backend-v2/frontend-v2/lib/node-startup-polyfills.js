/**
 * Node.js Startup Polyfills
 * Loads IMMEDIATELY when Node.js starts, before any modules are loaded
 * Specifically handles styled-jsx and other early-loading issues
 */

// Immediately define critical globals in the global scope
(function() {
  'use strict';
  
  // Only apply in server environments
  if (typeof window !== 'undefined') return;
  
  // Ensure global object exists
  const globalScope = global || globalThis || {};
  
  // Define document IMMEDIATELY for styled-jsx
  if (!globalScope.document) {
    Object.defineProperty(globalScope, 'document', {
      value: {
        // Minimal document for styled-jsx StyleSheet constructor
        createElement: function(tag) {
          return {
            tagName: (tag || '').toUpperCase(),
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
        head: {
          appendChild: function(child) { return child; },
          removeChild: function(child) { return child; }
        },
        body: {
          appendChild: function(child) { return child; },
          removeChild: function(child) { return child; }
        },
        documentElement: {
          style: {}
        },
        querySelector: function() { return null; },
        querySelectorAll: function() { return []; },
        getElementById: function() { return null; },
        getElementsByTagName: function() { return []; },
        getElementsByClassName: function() { return []; },
        styleSheets: [],
        implementation: {
          createHTMLDocument: function() { return globalScope.document; }
        }
      },
      writable: true,
      configurable: true
    });
  }
  
  // Define self pointing to global
  if (!globalScope.self) {
    Object.defineProperty(globalScope, 'self', {
      value: globalScope,
      writable: true,
      configurable: true
    });
  }
  
  // Define window pointing to global
  if (!globalScope.window) {
    Object.defineProperty(globalScope, 'window', {
      value: globalScope,
      writable: true,
      configurable: true
    });
  }
  
  // Ensure globalThis compatibility
  if (!globalScope.globalThis) {
    Object.defineProperty(globalScope, 'globalThis', {
      value: globalScope,
      writable: true,
      configurable: true
    });
  }
  
})();

module.exports = global;