// Empty service worker that does nothing
console.log('✅ Empty Service Worker - No functionality');

// Immediately skip waiting
self.skipWaiting();

// No event listeners = no interference
// This service worker will not cache anything or intercept any requests