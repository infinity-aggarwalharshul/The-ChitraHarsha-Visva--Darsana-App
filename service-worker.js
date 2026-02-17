/**
 * ChitraHarsha VisvaDarsana - Service Worker
 * Version: 2.0.0
 *
 * Features:
 * - Offline functionality
 * - Automatic caching strategy
 * - Background sync
 * - Auto-update detection
 * - Push notifications support
 *
 * Copyright (c) 2026 The ChitraHarsha VPK Ventures
 * All Rights Reserved
 */

const CACHE_VERSION = "chitraharsha-v2.0.0";
const CACHE_ASSETS = [
  "/",
  "/index.html",
  "/encryption-module.js",
  "/cloud-storage.js",
  "/blog-system.js",
  "/scholar-integration.js",
  "/auto-updater.js",
  "https://cdn.tailwindcss.com",
];

// Install event - cache assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => {
        console.log("[SW] Caching app assets");
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log("[SW] Service worker installed successfully");
        return self.skipWaiting();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_VERSION)
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {
            // Network unavailable, cached version is fine
          });

        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // Cache new resources
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.log("[SW] Fetch failed:", error);
          // Return offline page if available
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    }),
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log("[SW] Syncing offline data...");

  // Get sync queue from IndexedDB
  const db = await openDatabase();
  const syncQueue = await getSyncQueue(db);

  // Process queue
  for (const item of syncQueue) {
    try {
      await uploadToServer(item);
      await removefromSyncQueue(db, item.id);
    } catch (error) {
      console.error("[SW] Sync failed for item:", item.id, error);
    }
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "ChitraHarsha Update";
  const options = {
    body: data.body || "New update available",
    icon: "/assets/icon-192x192.png",
    badge: "/assets/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: data.url || "/",
    actions: [
      { action: "open", title: "Open" },
      { action: "close", title: "Close" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});

// Message handling from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CACHE_URLS") {
    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) => {
        return cache.addAll(event.data.urls);
      }),
    );
  }
});

// Helper functions
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ChitraHarshaVisvaDarsana", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSyncQueue(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["syncQueue"], "readonly");
    const store = transaction.objectStore("syncQueue");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removefromSyncQueue(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["syncQueue"], "readwrite");
    const store = transaction.objectStore("syncQueue");
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function uploadToServer(item) {
  // Simulate server upload
  return new Promise((resolve) => setTimeout(resolve, 100));
}

console.log("[SW] Service Worker script loaded");
