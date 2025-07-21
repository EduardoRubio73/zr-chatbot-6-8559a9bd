
const CACHE_NAME = 'zrchat-v2.1.0';
const OFFLINE_URL = '/offline.html';
const STATIC_CACHE = 'zrchat-static-v2.1.0';
const DYNAMIC_CACHE = 'zrchat-dynamic-v2.1.0';

// Assets críticos para cache
const CRITICAL_ASSETS = [
  '/',
  '/chat',
  '/login',
  '/offline.html',
  'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
  'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/back%20whsats.jpg'
];

// Assets estáticos
const STATIC_ASSETS = [
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache recursos críticos
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[ServiceWorker] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[ServiceWorker] Some static assets failed to cache:', err);
        });
      })
    ]).then(() => {
      console.log('[ServiceWorker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - estratégia cache-first para assets, network-first para API
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar chrome-extension e outras extensões
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  // Navegação - Network first com fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigations
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // API calls (Supabase) - Network first
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses (GET only)
          if (response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for GET requests
          if (request.method === 'GET') {
            return caches.match(request);
          }
          throw error;
        })
    );
    return;
  }

  // Static assets - Cache first
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(response => {
            // Não cachear se não for uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Background sync para mensagens offline
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-messages') {
    console.log('[ServiceWorker] Background sync for messages');
    event.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  try {
    console.log('[ServiceWorker] Syncing offline messages...');
    
    // Recuperar mensagens offline do IndexedDB
    const offlineMessages = await getOfflineMessages();
    
    for (const message of offlineMessages) {
      try {
        // Tentar enviar mensagem
        const response = await fetch('https://bwplxdikxtnsoavmijpi.supabase.co/rest/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cGx4ZGlreHRuc29hdm1panBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MzQwMDAsImV4cCI6MjA2ODUxMDAwMH0.-p_Jb_fEHr1biucRvBPuWArgMF0libGNlk5aqppZCHQ'
          },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          // Remover mensagem do storage offline
          await removeOfflineMessage(message.id);
          console.log('[ServiceWorker] Offline message synced:', message.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

async function getOfflineMessages() {
  // Implementar recuperação de mensagens offline do IndexedDB
  return [];
}

async function removeOfflineMessage(messageId) {
  // Implementar remoção de mensagem offline do IndexedDB
  console.log('[ServiceWorker] Removing offline message:', messageId);
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push received');
  
  let notificationData = {
    title: 'ZRChat',
    body: 'Nova mensagem recebida!',
    icon: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
    badge: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: '/chat'
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir Chat',
        icon: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  // Parse notification data if provided
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.warn('[ServiceWorker] Invalid push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/chat';

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(clientList => {
        // Se já existe uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Caso contrário, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Message handling para comunicação com a aplicação
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[ServiceWorker] Service Worker registered successfully');
