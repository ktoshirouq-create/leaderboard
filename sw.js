// sw.js — minimal service worker
// Required for PWA install eligibility. Real offline caching can come later.

const CACHE_NAME = 'leaderboard-v4';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Network-first for everything for now — keeps data fresh
    // Fallback to cache only if network fails
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// Let the page tell us to take over immediately when the user taps Reload.
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
