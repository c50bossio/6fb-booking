// Add polyfills for Node.js global object
if (typeof global !== 'undefined' && typeof self === 'undefined') {
  global.self = global;
}