/**
 * Minimal SSR Fix - Just define self to prevent errors
 */

// Define self if it doesn't exist
if (typeof self === 'undefined') {
  global.self = global;
}

module.exports = global;