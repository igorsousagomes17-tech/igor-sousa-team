// Service worker: cache do app (casca) + treino salvo pra abrir sem sinal. Vídeo nunca é cacheado.
const CACHE = 'isteam-v1';
const SHELL = ['./','./index.html','./css/app.css','./js/app.js','./js/db.js','./js/ui.js','./js/admin.js','./js/db-mock.js','./js/config.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/igor_s.jpg','./icons/corrida_s.jpg','./icons/abdomen_s.jpg','./icons/mobilidade_s.jpg','./icons/casa_s.jpg','./icons/guia-frente.jpg','./icons/guia-lado.jpg','./icons/guia-costas.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Supabase e vídeos: sempre rede.
  if (url.hostname.includes('supabase') || url.hostname.includes('youtube') || url.hostname.includes('ytimg')) return;
  // Casca do app: cache primeiro, atualiza em segundo plano.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok && url.origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'Igor Sousa Team', body: 'Bora treinar hoje?' };
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png' }));
});
