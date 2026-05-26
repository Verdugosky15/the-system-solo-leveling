const CACHE = 'system-v2';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './audio.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'NAG') {
    self.registration.showNotification(e.data.title || '\u10DC THE SYSTEM', {
      body: e.data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'system-nag',
      renotify: true,
      vibrate: [100, 50, 100]
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
