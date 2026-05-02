// sw.js — minimal service worker
// Required for PWA install eligibility. Real offline caching can come later.

const CACHE_NAME = 'leaderboard-v1';

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
