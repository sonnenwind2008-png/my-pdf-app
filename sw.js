const CACHE_NAME = 'pdf-toolbox-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Installieren & Dateien in den Cache laden
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Aktivieren & alten Cache löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// WICHTIG: Der Fetch-Handler (ohne diesen kein Install-Button!)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
