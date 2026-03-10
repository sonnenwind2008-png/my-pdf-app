self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('pwa-cache').then(c => c.addAll(['index.html', 'style.css', 'app.js'])));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});