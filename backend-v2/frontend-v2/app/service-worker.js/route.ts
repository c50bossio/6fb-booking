// Route handler to return 404 for service worker requests
// This prevents any service worker from being served
export async function GET() {
  return new Response('Service Worker disabled', { 
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}

export async function HEAD() {
  return new Response(null, { 
    status: 404,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}