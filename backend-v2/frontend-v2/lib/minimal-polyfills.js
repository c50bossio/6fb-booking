/**
 * Minimal polyfills for Vercel deployment
 * Only define what's absolutely necessary
 */

if (typeof global !== 'undefined' && typeof self === 'undefined') {
  global.self = global;
}

// Export global as default for webpack.ProvidePlugin
module.exports = typeof global !== 'undefined' ? global : {};
module.exports.default = module.exports;