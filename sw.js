// ============================================================
// sw.js — Offline Support
// ------------------------------------------------------------
// Precaches the app shell on install, then opportunistically
// caches everything else it sees fetched (including cross-origin
// CDN assets like Tailwind, FontAwesome and Google Fonts) so that
// after the first successful online visit, the whole site —
// storefront and admin panel — keeps working with no connection.
// ============================================================

const CACHE_VERSION = 'thilda-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core local files needed to render the site with zero network access.
const SHELL_FILES = [
    './',
    './index.html',
    './admin.html',
    './style.css',
    './main.js',
    './app.js',
    './admin.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    // Page navigations: try the network first (to pick up edits saved
    // by admin.html), fall back to the cached shell when offline.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    // Everything else (CSS, JS, fonts, images — including CDN
    // resources): cache-first, refresh the cache in the background.
    event.respondWith(
        caches.match(request).then((cached) => {
            const networkFetch = fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || networkFetch;
        })
    );
});
