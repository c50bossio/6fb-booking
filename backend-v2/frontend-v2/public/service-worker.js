// Service Worker - Cleanup Only
// This service worker immediately cleans up and unregisters itself
// Purpose: Remove any existing service worker registrations and caches

self.addEventListener('install', (event) => {
  console.log('🧹 Service Worker: Final cleanup install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🧹 Service Worker: Final cleanup activate');
  
  event.waitUntil(
    (async () => {
      // Clean up all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Take control and unregister immediately
      await self.clients.claim();
      
      console.log('🧹 Service Worker: Cleanup complete, unregistering');
      self.registration.unregister();
    })()
  );
});

// Minimal fetch handler during cleanup
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});