/**
 * Minimal polyfills for Vercel deployment
 * Only define what's absolutely necessary
 */

if (typeof global !== 'undefined' && typeof self === 'undefined') {
  global.self = global;
}

module.exports = {};