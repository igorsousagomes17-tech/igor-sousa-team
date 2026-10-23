// Service worker: cache do app (casca) + treino salvo pra abrir sem sinal. Vídeo nunca é cacheado.
const CACHE = 'isteam-v10';
const SHELL = ['./','./index.html','./css/app.css','./js/app.js','./js/db.js','./js/ui.js','./js/admin.js','./js/pdf.js','./js/vendor/supabase.js','./js/db-mock.js','./js/config.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/igor_s.jpg','./icons/corrida_s.jpg','./icons/abdomen_s.jpg','./icons/mobilidade_s.jpg','./icons/casa_s.jpg','./icons/guia-frente.jpg','./icons/guia-lado.jpg','./icons/guia-costas.jpg'];

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
        // arquivos do app (inclui o gerador de PDF, guardado no 1º uso) e as fontes: ficam pra abrir sem sinal
        if (res.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
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

// Aviso de fim do descanso com o app em segundo plano / tela apagada.
// A página manda {tipo:'agendar', em: horário de término}; o SW segura a espera (até 5 min) e só avisa
// se nenhuma tela do app estiver visível (com o app aberto, quem apita é a própria página).
let agendado = null;
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo === 'cancelar') { if (agendado) { clearTimeout(agendado.t); agendado.ok(); agendado = null; } return; }
  if (d.tipo !== 'agendar') return;
  if (agendado) { clearTimeout(agendado.t); agendado.ok(); }
  const espera = Math.max(0, Math.min(300000, d.em - Date.now()));
  e.waitUntil(new Promise(ok => {
    const t = setTimeout(async () => {
      agendado = null;
      const telas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (d.forcar || !telas.some(c => c.visibilityState === 'visible')) {
        await self.registration.showNotification(d.titulo || 'Descanso acabou! 💪', { body: d.corpo || 'Bora a próxima série.', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'descanso', renotify: true, vibrate: [200, 100, 300] });
      }
      ok();
    }, espera);
    agendado = { t, ok };
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./#sessao')));
});
