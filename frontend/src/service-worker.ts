/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `tanteemma-${version}`;

// App shell: SvelteKit build output + static files
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle same-origin GET requests
	if (request.method !== 'GET' || url.origin !== self.location.origin) return;

	// API and WebSocket requests: network only, no caching
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return;

	// Auth routes: network only (must not serve stale)
	if (url.pathname.startsWith('/auth/')) return;

	event.respondWith(
		caches.match(request).then((cached) => {
			// Cache-first for known assets (versioned filenames)
			if (cached && ASSETS.includes(url.pathname)) {
				return cached;
			}

			// Network-first for navigation (HTML pages)
			return fetch(request)
				.then((response) => {
					if (response.ok && request.mode === 'navigate') {
						const clone = response.clone();
						caches.open(CACHE).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => {
					// Offline fallback: serve cached page or app root
					return cached ?? caches.match('/') ?? Response.error();
				});
		})
	);
});
