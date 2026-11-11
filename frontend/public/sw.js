/* =========================================================
   BHAGAVAD GITA - PRODUCTION SERVICE WORKER (PWA)
   AUTO-UPDATE • OFFLINE CAPABLE • FAST CACHE • ZERO LATENCY
   ========================================================= */

const CACHE_NAME = "bhagavad-gita-cache-v18";

// Essential core shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/pwa-icon.svg",
  "/favicon.ico"
];

// 1. INSTALL — Precache shell and skip waiting immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("SW precache partial fail:", err);
      });
    })
  );
  // Auto activate new service worker without waiting for tab close
  self.skipWaiting();
});

// 2. ACTIVATE — Purge old cache versions and claim all open tabs
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. FETCH — Smart Network-First for HTML, Stale-While-Revalidate for Assets
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions / external analytics
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Chapter Shlokas API: Network-first with automatic offline cache
  if (url.pathname.includes("/api/shloks/chapter/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other API calls: Network first (bypass cache to always get latest data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // HTML Navigation (Page Loads): Network-First
  // Guarantees that any new deployment is seen immediately by users!
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request).then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate
  // Instant load from cache + silent background update from network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. MESSAGE — Manual skipWaiting trigger if requested by client
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// 5. PUSH — Background push notifications for App users
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "શ્રીમદ્ ભગવદ્ ગીતા APP", body: event.data.text() };
    }
  }

  // Strictly ignore silent pings or empty/null payloads
  if (!data || data.type === "silent-ping" || (!data.title && !data.body)) {
    return;
  }

  const title = data.title || "શ્રીમદ્ ભગવદ્ ગીતા APP";
  const origin = self.location.origin;

  const iconUrl = data.icon || `${origin}/icons/icon-192x192.png`;
  const badgeUrl = data.badge || `${origin}/icons/icon-192x192.png`;

  const options = {
    body: data.body || "આજનું પવિત્ર ગીતા વાંચન અને ક્વિઝ લક્ષ્ય પૂર્ણ કરવા અહીં ક્લિક કરો.",
    icon: iconUrl,
    badge: badgeUrl,
    vibrate: [300, 150, 300, 150, 300],
    data: {
      url: data.url || `${origin}/`,
      dateOfArrival: Date.now(),
    },
    tag: data.tag ? `${data.tag}-${Date.now()}` : `gita-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch((err) => {
        console.warn("Primary notification failed, showing minimal fallback:", err);
        return self.registration.showNotification(title, {
          body: options.body,
          data: options.data,
        });
      })
  );
});

// 6. NOTIFICATION CLICK — Focus existing window or open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      // 1. Record open on backend
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub && sub.endpoint) {
          const apiBase =
            self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1"
              ? "http://localhost:5000"
              : "https://bhagavad-gita-backend-jy1a.onrender.com";
          await fetch(`${apiBase}/api/notifications/record-open`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
      } catch (err) {
        console.debug("Failed to record open from SW:", err);
      }

      // 2. Focus existing open client or open new window
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

