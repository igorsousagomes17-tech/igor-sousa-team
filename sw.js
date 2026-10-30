// Service worker: cache do app (casca) + treino salvo pra abrir sem sinal. Vídeo nunca é cacheado.
const CACHE = 'isteam-v47';
const DADOS = 'isteam-dados'; // o que o lembrete precisa saber (não apaga quando o app atualiza)
// Gerador de PDF, capas, fotos e fontes: não mudam com a versão do app, então ficam de uma versão pra outra
// (antes cada atualização apagava e o PDF/capas paravam de abrir sem sinal até baixar tudo de novo)
const EXTRAS = 'isteam-extras';
const ehExtra = u => /\/js\/vendor\/|\/icons\/|\.(png|jpe?g|webp|gif|svg|woff2?)$/i.test(u.pathname) || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
// Só o que a aluna usa ao abrir (painel do Igor, demo e fotos-guia entram no cache no 1º uso).
const SHELL = ['./','./index.html','./css/app.css','./js/app.js','./js/i18n.js','./js/conteudo.js','./js/db.js','./js/ui.js','./js/pdf.js','./js/acolhe.js','./js/kcal.js','./js/spin.js','./js/spin-aulas.js','./js/vendor/supabase.js','./js/config.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/igor_s.jpg']; // capas dos programas entram no cache no 1º uso

self.addEventListener('install', e => {
  // 1ª instalação: reaproveita o que a página acabou de baixar (não gasta o pacote de dados 2x).
  // Atualização (já tinha cache): confere cada arquivo com o servidor (no-cache = pergunta "mudou?"); o que não mudou volta
  // como 304 sem baixar de novo (antes cada versão baixava ~300 KB, até o que não tinha mudado).
  e.waitUntil(caches.keys().then(ks => caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: ks.length ? 'no-cache' : 'force-cache' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = (await caches.keys()).filter(k => k !== CACHE && k !== DADOS && k !== EXTRAS && k !== 'isteam-fotos'), novo = await caches.open(CACHE), ex = await caches.open(EXTRAS);
    const shell = new Set(SHELL.map(u => new URL(u, self.location).href));
    for (const k of keys) { // o que ela já tinha usado (PDF, demo, capas) continua guardado na versão nova
      const c = await caches.open(k);
      for (const req of await c.keys()) {
        if (shell.has(req.url)) continue; const u = new URL(req.url);
        try { if (ehExtra(u)) { if (!(await ex.match(req))) { const r = await c.match(req); if (r) await ex.put(req, r); } } else if (u.origin === location.origin) { const r = await fetch(req, { cache: 'no-cache' }); if (r.ok) await novo.put(req, r); } } catch {}
      }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Supabase e vídeos: sempre rede.
  if (url.hostname.includes('supabase') || url.hostname.includes('youtube') || url.hostname.includes('ytimg')) return;
  // Casca do app: cache primeiro, sem baixar de novo a cada abertura (economiza o pacote de dados).
  // Versão nova chega quando o sw.js muda (CACHE novo baixa tudo uma vez). Página com ?demo usa a mesma casca.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(cached => cached || fetch(e.request).then(res => {
      // arquivos do app (inclui o gerador de PDF, guardado no 1º uso) e as fontes: ficam pra abrir sem sinal
      if (res.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))) { const cp = res.clone(); caches.open(ehExtra(url) ? EXTRAS : CACHE).then(c => c.put(e.request, cp)); }
      return res;
    }))
  );
});
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'Igor Sousa Team', body: 'Bora treinar hoje?' };
  e.waitUntil((async () => {
    // Alarme do descanso: se o próprio celular já avisou (Android), só troca o aviso sem tocar de novo.
    // (O iPhone exige mostrar um aviso a cada push, então sempre mostra alguma coisa.)
    let repetido = false;
    if (d.alarme) { try { const ja = await self.registration.getNotifications({ tag: 'descanso' }); repetido = ja.some(n => Date.now() - (n.timestamp || 0) < 20000); } catch {} }
    await self.registration.showNotification(d.title, { body: d.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: d.tag || 'aviso', renotify: !repetido, silent: repetido, ...(d.alarme ? { vibrate: [350, 120, 350, 120, 600], requireInteraction: false } : {}), data: { url: d.url || './#home' } });
  })());
});

// Aviso de fim do descanso com o app em segundo plano / tela apagada.
// A página manda {tipo:'agendar', em: horário de término}; o SW segura a espera (até 5 min) e só avisa
// se nenhuma tela do app estiver visível (com o app aberto, quem apita é a própria página).
let agendado = null;
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo === 'lembreteDados') { e.waitUntil(lerDados().then(old => gravarDados({ ...old, ultimo: d.ultimo, nome: d.nome, proximo: d.proximo, textos: d.textos }))); return; }
  // A página manda o que já baixou antes do SW assumir (1ª abertura: demo, capas): guarda sem baixar de novo
  if (d.tipo === 'guardar') { e.waitUntil(Promise.all((d.urls || []).slice(0, 60).map(async x => { try { const u = new URL(x); if (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return; if (await caches.match(x, { ignoreSearch: false })) return; const r = await fetch(x, { cache: 'force-cache', mode: u.origin === location.origin ? 'same-origin' : 'cors' }); if (r.ok) await (await caches.open(ehExtra(u) ? EXTRAS : CACHE)).put(x, r); } catch {} }))); return; }
  if (d.tipo === 'cancelar') { if (agendado) { clearTimeout(agendado.t); agendado.ok(); agendado = null; } return; }
  if (d.tipo !== 'agendar') return;
  if (agendado) { clearTimeout(agendado.t); agendado.ok(); }
  const espera = Math.max(0, Math.min(300000, d.em - Date.now()));
  e.waitUntil(new Promise(ok => {
    const t = setTimeout(async () => {
      agendado = null;
      const telas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (d.forcar || !telas.some(c => c.visibilityState === 'visible')) {
        await self.registration.showNotification(d.titulo || 'Descanso acabou! 💪', { body: d.corpo || 'Bora a próxima série.', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'descanso', renotify: true, vibrate: [350, 120, 350, 120, 600], silent: false });
      }
      ok();
    }, espera);
    agendado = { t, ok };
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? (e.notification.data?.url ? cs[0].navigate(e.notification.data.url).catch(() => null).then(() => cs[0].focus()) : cs[0].focus()) : self.clients.openWindow(e.notification.data?.url || './#sessao')));
});

// LEMBRETE de dias sem treinar (Android com o app instalado): o celular acorda o SW de tempos em tempos (periodic sync).
// 3+ dias sem treinar → um aviso carinhoso por dia no máximo, entre 7h e 21h.
const lerDados = () => caches.open(DADOS).then(c => c.match('./_lembrete')).then(r => r ? r.json() : {}).catch(() => ({}));
const gravarDados = d => caches.open(DADOS).then(c => c.put('./_lembrete', new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } })));
async function talvezLembrar() {
  const d = await lerDados(); if (!d.ultimo || !d.textos) return;
  const dias = Math.floor((Date.now() - new Date(d.ultimo)) / 86400000), h = new Date().getHours(), hoje = new Date().toDateString();
  if (![3, 5, 8, 14].includes(dias) || h < 7 || h >= 21 || d.avisadoEm === hoje) return; // não vira cobrança diária
  const telas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); if (telas.some(c => c.visibilityState === 'visible')) return;
  const troca = s => String(s || '').replace('{n}', dias).replace('{x}', d.proximo || '').replace('{nome}', d.nome || '');
  await self.registration.showNotification(troca(d.textos.titulo), { body: troca(d.textos.corpo), icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'lembrete', data: { url: './#home' } });
  await gravarDados({ ...d, avisadoEm: hoje });
}
self.addEventListener('periodicsync', e => { if (e.tag === 'lembrete') e.waitUntil(talvezLembrar()); });
