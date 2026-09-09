// Deliberately does no caching — a business CRM's data must always be
// current, and caching JS bundles risks silently serving a stale build
// after a deploy. This exists only so PWA install criteria that check for
// a registered service worker (with a fetch handler) are satisfied.
//
// The fetch listener below intentionally never calls event.respondWith():
// Chrome's install criteria only require the listener to exist, not that
// it actually handle anything, and actually wrapping every request in a
// manual `fetch(event.request)` re-issue (as this used to) risked that
// re-issued fetch itself failing ("Failed to fetch", seen in devtools on
// crm.gotka.com — most likely from Cloudflare's auto-injected Speculation
// Rules prerendering interacting badly with the SW intercepting the
// prerendered navigation). When that re-issued fetch failed, the browser
// had nothing but a broken response to fall back on for that navigation —
// which read as a stale/inconsistent page (e.g. /system vs /business
// session state looking "mixed") even though the server and cookies were
// never actually wrong. Leaving every request untouched here means the
// browser handles it exactly as if there were no service worker at all.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});
