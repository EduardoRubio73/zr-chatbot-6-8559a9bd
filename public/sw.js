
const CACHE_NAME = 'zrchat-online-only-v1.0.0';

// Force online-only behavior
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install - Online Only Mode');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate - Online Only Mode');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[ServiceWorker] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Force all requests to go through network - NO CACHING
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignore chrome extensions
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  // Force network-only for ALL requests
  event.respondWith(
    fetch(request)
      .then(response => {
        // Always return fresh network response
        return response;
      })
      .catch(error => {
        console.error('[ServiceWorker] Network request failed:', error);
        
        // If network fails, force reload instead of showing cached content
        if (request.mode === 'navigate') {
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>ZRChat - Sem Conexão</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  margin: 0; 
                  background: #dc2626; 
                  color: white; 
                  text-align: center; 
                }
                .container { max-width: 400px; padding: 20px; }
                h1 { margin-bottom: 20px; }
                button { 
                  padding: 10px 20px; 
                  font-size: 16px; 
                  background: white; 
                  color: #dc2626; 
                  border: none; 
                  border-radius: 5px; 
                  cursor: pointer; 
                  margin: 10px; 
                }
                button:hover { background: #f3f4f6; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>❌ Sem Conexão com Internet</h1>
                <p>O ZRChat precisa de conexão com internet para funcionar.</p>
                <p>Verifique sua conexão e tente novamente.</p>
                <button onclick="window.location.reload()">Tentar Novamente</button>
                <button onclick="window.location.href='/login'">Ir para Login</button>
              </div>
              <script>
                // Auto-retry when online
                window.addEventListener('online', () => {
                  window.location.reload();
                });
                
                // Check connection every 5 seconds
                setInterval(() => {
                  if (navigator.onLine) {
                    window.location.reload();
                  }
                }, 5000);
              </script>
            </body>
            </html>`,
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
        
        // For other requests, throw the error to force app reload
        throw error;
      })
  );
});

// Remove all background sync - force online only
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Background sync disabled - Online only mode');
});

// Disable push notifications for offline mode
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push notifications require online connection');
});

// Force reload on notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/chat')
  );
});

// Force online check message handling
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FORCE_ONLINE_CHECK') {
    // Force clients to check online status
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'CHECK_ONLINE_STATUS' });
      });
    });
  }
});

console.log('[ServiceWorker] Online-only mode activated');
