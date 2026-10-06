const CACHE = 'progress-v9';
const EXERCISE_IMAGES = [
  'barbell-bench-press.png', 'ez-bar-overhead-press.png', 'incline-dumbbell-bench-press.png',
  'dumbbell-shoulder-fly.png', 'ski-machine-triceps.png', 'single-arm-dumbbell-row.png',
  'dumbbell-lat-pullover.png', 'reverse-grip-ez-bar-row.png', 'reverse-fly.png',
  'ez-bar-barbell-shrug.png', 'dumbbell-bicep-curl.png', 'romanian-deadlift.png',
  'weighted-lunge.png', 'standing-calf-raise.png', 'plank.png'
];
const ASSETS = [
  './', './index.html', './styles.css?v=9', './app.js?v=9', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  ...EXERCISE_IMAGES.map(file => `./icons/exercises/${file}`)
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
