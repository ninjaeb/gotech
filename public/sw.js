// Deliberately does no caching — a business CRM's data must always be
// current, and caching JS bundles risks silently serving a stale build
// after a deploy. This exists only so PWA install criteria that check for
// a registered service worker (with a fetch handler) are satisfied; every
// request still goes straight to the network exactly as it would without
// this file. Real offline support would be a separate, deliberate feature.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
