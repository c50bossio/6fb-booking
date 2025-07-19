// BookedBarber V2 Service Worker
const CACHE_NAME = 'bookedbarber-v2-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/calendar',
  '/login',
  '/offline',
  '/_next/static/css/',
  '/_next/static/js/',
  '/favicon.ico',
  '/logo.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache only the base URLs, not the full static paths
        return cache.addAll(urlsToCache.filter(url => !url.includes('_next/static')));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-HTTP(S) requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // API calls - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Only cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Try to return cached response for API calls
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets and pages - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Update cache in background
          fetch(request).then(fetchResponse => {
            if (fetchResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, fetchResponse.clone());
              });
            }
          });
          return response;
        }

        // Not in cache, fetch from network
        return fetch(request).then(fetchResponse => {
          // Don't cache non-successful responses
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clone the response for caching
          const responseToCache = fetchResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return fetchResponse;
        });
      })
      .catch(() => {
        // Offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline');
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'BookedBarber';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/logo-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      id: data.id
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if there's already a window/tab open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Helper function to sync appointments
async function syncAppointments() {
  try {
    // Get pending appointments from IndexedDB or localStorage
    const pendingData = await getPendingAppointments();
    
    if (pendingData && pendingData.length > 0) {
      // Send to server
      const response = await fetch('/api/v2/appointments/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appointments: pendingData })
      });

      if (response.ok) {
        // Clear pending appointments
        await clearPendingAppointments();
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Placeholder functions for appointment sync
async function getPendingAppointments() {
  // Implementation would retrieve from IndexedDB
  return [];
}

async function clearPendingAppointments() {
  // Implementation would clear from IndexedDB
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-appointments') {
    event.waitUntil(checkUpcomingAppointments());
  }
});

async function checkUpcomingAppointments() {
  try {
    const response = await fetch('/api/v2/appointments/upcoming');
    if (response.ok) {
      const appointments = await response.json();
      // Process and potentially show notifications for upcoming appointments
      console.log('Checked upcoming appointments:', appointments.length);
    }
  } catch (error) {
    console.error('Failed to check appointments:', error);
  }
}