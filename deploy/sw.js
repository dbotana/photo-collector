// Service Worker for Photo Collector PWA
// Version 1.0.0

const CACHE_NAME = 'photo-collector-v1.0.0';
const RUNTIME_CACHE = 'photo-collector-runtime-v1.0.0';
const UPLOAD_QUEUE_NAME = 'photo-collector-uploads';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/config.js',
  '/manifest.json',
  // AWS SDK will be cached from CDN
  'https://sdk.amazonaws.com/js/aws-sdk-2.1563.0.min.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_FILES.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle AWS S3 uploads specially
  if (url.hostname.includes('s3.amazonaws.com') || url.hostname.includes('amazonaws.com')) {
    event.respondWith(handleS3Request(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (STATIC_CACHE_FILES.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle other requests with network-first strategy
  event.respondWith(networkFirstStrategy(request));
});

// Cache-first strategy for static files
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline - content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network-first strategy for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Offline - content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle S3 upload requests
async function handleS3Request(request) {
  try {
    // Try network first for S3 uploads
    const response = await fetch(request);
    return response;
  } catch (error) {
    // If offline, queue the upload for later
    if (request.method === 'PUT' || request.method === 'POST') {
      await queueUpload(request);

      // Return a custom response indicating queued upload
      return new Response(
        JSON.stringify({
          success: false,
          queued: true,
          message: 'Upload queued for when connection is restored'
        }),
        {
          status: 202,
          statusText: 'Accepted - Queued for Upload',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    throw error;
  }
}

// Queue uploads for offline processing
async function queueUpload(request) {
  try {
    const uploadData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.arrayBuffer(),
      timestamp: Date.now(),
      retryCount: 0
    };

    // Store in IndexedDB for persistence
    const db = await openUploadDB();
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    await store.add(uploadData);

    console.log('Upload queued for offline processing');

    // Notify the main thread about queued upload
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPLOAD_QUEUED',
          message: 'Upload saved for when connection is restored'
        });
      });
    });
  } catch (error) {
    console.error('Failed to queue upload:', error);
  }
}

// Process queued uploads when back online
async function processQueuedUploads() {
  try {
    const db = await openUploadDB();
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    const uploads = await store.getAll();

    for (const upload of uploads) {
      try {
        const response = await fetch(upload.url, {
          method: upload.method,
          headers: upload.headers,
          body: upload.body
        });

        if (response.ok) {
          // Upload successful, remove from queue
          await store.delete(upload.id);

          // Notify main thread
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'UPLOAD_COMPLETED',
                message: 'Queued upload completed successfully'
              });
            });
          });
        } else {
          // Update retry count
          upload.retryCount = (upload.retryCount || 0) + 1;
          if (upload.retryCount < 3) {
            await store.put(upload);
          } else {
            // Max retries reached, remove from queue
            await store.delete(upload.id);

            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'UPLOAD_FAILED',
                  message: 'Upload failed after maximum retries'
                });
              });
            });
          }
        }
      } catch (error) {
        console.error('Error processing queued upload:', error);
        upload.retryCount = (upload.retryCount || 0) + 1;
        await store.put(upload);
      }
    }
  } catch (error) {
    console.error('Error processing upload queue:', error);
  }
}

// IndexedDB helper for upload queue
function openUploadDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PhotoCollectorUploads', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('uploads')) {
        const store = db.createObjectStore('uploads', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('Service Worker: Back online, processing queued uploads');
  processQueuedUploads();
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'PROCESS_QUEUE') {
    processQueuedUploads();
  }
});

// Background sync for upload queue (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-queue') {
    event.waitUntil(processQueuedUploads());
  }
});

// Push notification support (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification('Photo Collector', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});