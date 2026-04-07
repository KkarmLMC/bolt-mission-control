/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// ─── PRECACHING ───────────────────────────────────────────────
// vite-plugin-pwa injects the manifest at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── SPA NAVIGATION FALLBACK ──────────────────────────────────
if (import.meta.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//, /^\/auth\//],
    })
  );
}

// ─── RUNTIME CACHING ──────────────────────────────────────────

// RULE: Never cache Supabase API responses in the service worker.
// RLS is evaluated server-side using the JWT. Caching authenticated
// responses risks serving User A's data to User B.
registerRoute(
  ({ url }) =>
    url.hostname.includes('supabase') ||
    url.hostname === '137.220.48.180',
  new NetworkOnly()
);

// Static assets from CDN (fonts, etc.)
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
);

// User-uploaded images from Supabase Storage (public bucket only)
registerRoute(
  ({ url }) => url.pathname.startsWith('/storage/v1/object/public/'),
  new StaleWhileRevalidate({
    cacheName: 'public-storage',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// ─── BACKGROUND SYNC ─────────────────────────────────────────
// Queue failed POST/PATCH/DELETE to Supabase (Android/Chrome only)
const bgSync = new BackgroundSyncPlugin('tendara-offline-mutations', {
  maxRetentionTime: 24 * 60, // 24 hours
});

for (const method of ['POST', 'PATCH', 'DELETE']) {
  registerRoute(
    ({ url }) =>
      url.hostname.includes('supabase') ||
      url.hostname === '137.220.48.180',
    new NetworkOnly({ plugins: [bgSync] }),
    method
  );
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────

self.addEventListener('push', (event) => {
  // ALWAYS show a notification — iOS revokes subscriptions after ~3
  // push events that don't produce a visible notification.
  const fallback = { title: 'Tendara', body: 'You have a new notification.' };
  let data = fallback;

  try {
    data = event.data?.json() ?? fallback;
  } catch {
    data = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag ?? 'default',
      renotify: !!data.tag,
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        const existing = clients.find(
          (c) => new URL(c.url).origin === self.location.origin
        );
        if (existing) {
          await existing.navigate(targetUrl);
          await existing.focus();
        } else {
          await self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── UPDATE FLOW ──────────────────────────────────────────────
// registerType: 'prompt' — user decides when to reload
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

clientsClaim();
