/*
 * P14.9 — the admin panel's service worker: what makes it installable, and what shows an alert
 * when the panel is closed (docs/02-architecture.md "Push"). The API sends
 * { title, body, url, tag } (AdminAlertsService) and never customer details.
 *
 * Paths are resolved against this worker's scope, so the panel works wherever it is served
 * (at /admin/ on GitHub Pages, at / in development). No caching: the panel always loads fresh.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let alert = { title: 'Sunil Store', body: '', url: '/', tag: 'admin' };
  try {
    alert = { ...alert, ...event.data.json() };
  } catch {
    // An empty or unreadable push still says something arrived, rather than nothing.
  }
  event.waitUntil(
    self.registration.showNotification(alert.title, {
      body: alert.body,
      tag: alert.tag,
      // A newer alert about the same order replaces the older one, and still rings.
      renotify: true,
      icon: new URL('icons/icon-192.png', self.registration.scope).href,
      badge: new URL('icons/icon-192.png', self.registration.scope).href,
      data: { url: alert.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = String(event.notification.data?.url ?? '/').replace(/^\//, '');
  const target = new URL(path, self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // An open panel goes to the order; otherwise the installed app (or a tab) opens on it.
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && 'navigate' in client) {
          await client.focus();
          return client.navigate(target);
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
