// Revisão 9: passeio por TODAS as telas (aluna e Igor) no modo demo, tocando nos botões de cada uma (2 níveis),
// trocando de idioma, e caçando erro de JavaScript / console. Depois: abre e fecha o treino 20x e confere se
// timers e "escutas" (listeners) não ficam acumulando. Uso: W=375 OUT=/tmp/shots node tests/passeio-r9.mjs
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const W = +(process.env.W || 375);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], falhas = []; let tela = '?';
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
// Conta timers e escutas vivas (antes de qualquer script do app)
const CONTADOR = () => {
  const c = window.__c = { iv: 0, lis: 0, raf: 0 }; const ivs = new Set(), ls = new Set();
  const si = window.setInterval, ci = window.clearInterval;
  window.setInterval = (...a) => { const id = si(...a); ivs.add(id); c.iv = ivs.size; return id; };
  window.clearInterval = id => { ivs.delete(id); c.iv = ivs.size; return ci(id); };
  const raf = window.requestAnimationFrame; window.requestAnimationFrame = f => { c.raf++; return raf(t => { c.raf--; f(t); }); };
  const caf = window.cancelAnimationFrame; window.cancelAnimationFrame = id => { c.raf = Math.max(0, c.raf - 1); return caf(id); };
  for (const alvo of [window, document]) {
    const ad = alvo.addEventListener.bind(alvo), rm = alvo.removeEventListener.bind(alvo), nome = alvo === window ? 'w' : 'd';
    const k = (t, f, o) => nome + t + ':' + (typeof o === 'object' ? !!o.capture : !!o) + ':' + (f && (f.__id ||= Math.random()));
    alvo.addEventListener = (t, f, o) => { if (!(o && o.once)) { ls.add(k(t, f, o)); c.lis = ls.size; } return ad(t, f, o); };
    alvo.removeEventListener = (t, f, o) => { ls.delete(k(t, f, o)); c.lis = ls.size; return rm(t, f, o); };
  }
};
async function nova(email, idioma) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: W, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); await p.addInitScript(CONTADOR);
  if (idioma) await p.addInitScript(l => { try { localStorage.setItem('idioma', l); } catch {} }, idioma);
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }).catch(() => {}); } return r.abort().catch(() => {}); });
  p.on('pageerror', e => errs.push(`[${email} ${tela}] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(`[${email} ${tela}] console: ${m.text().slice(0, 200)}`); });
  p.on('dialog', d => d.dismiss().catch(() => {}));
  p.on('popup', x => x.close().catch(() => {}));
  const t0 = Date.now();
  await p.goto('http://app.local/?demo'); await p.waitForSelector('[data-go="login"]', { timeout: 8000 });
  console.log(`  boot até a tela de entrada: ${Date.now() - t0} ms`);
  await p.click('[data-go="login"]'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await p.waitForTimeout(1300);
  await limpa(p);
  return { ctx, p };
}
// Fecha pop-ups, passeio, descanso: deixa a tela limpa
async function limpa(p) {
  await p.evaluate(() => { document.querySelector('.tour')?._fim?.(); document.querySelector('.tour')?.remove(); document.documentElement.style.overflow = ''; }).catch(() => {});
  for (let i = 0; i < 3; i++) { const tem = await p.evaluate(() => !!document.querySelector('#overlay')?.innerHTML).catch(() => false); if (!tem) break; const x = await p.$('#overlay #lc, #overlay #vm-close, #overlay #hc, #overlay #q-n, #overlay .fechar, #overlay [data-fechar]'); if (x && await x.isVisible().catch(() => false)) await x.click({ timeout: 1500 }).catch(() => {}); else await p.evaluate(() => { document.querySelector('#overlay').innerHTML = ''; }); await p.waitForTimeout(150); }
}
// Vai pra uma tela pelo próprio roteador (um [data-go] de mentira)
const nav = (p, name, arg) => p.evaluate(([n, a]) => { const x = document.createElement('a'); x.dataset.go = n; if (a != null) x.dataset.arg = a; x.style.display = 'none'; document.body.appendChild(x); x.click(); x.remove(); }, [name, arg]);
// stvOn: no demo o Strava volta pra "?strava=ok" sem o "?demo" (sai do modo demo, não é bug do app)
const PERIGO = /^(out|delConta|o|desc|stvOn)$|sair|excluir|apagar|remover|descartar|desativar|log ?out|delete|resetar|zerar|cancelar assinatura/i;
// Lista o que dá pra tocar na tela (fora as abas, que viram telas próprias)
const tocaveis = p => p.evaluate(PER => {
  const re = new RegExp(PER.src, PER.fl); const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  return [...document.querySelectorAll('#app button, #app [data-go], #app a[href^="#"], #app .opc, #app [role=button], #app summary, #overlay button, #rest-layer button')]
    .filter(e => vis(e) && !e.disabled && !e.closest('.tabs') && !(e.tagName === 'A' && /^https?:|^mailto|^tel/.test(e.getAttribute('href') || '')))
    .map(e => ({ id: e.id, go: e.dataset.go || '', arg: e.dataset.arg || '', txt: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) }))
    .filter(d => !re.test(d.id) && !re.test(d.txt));
}, { src: PERIGO.source, fl: PERIGO.flags });
async function toca(p, d) {
  const h = await p.evaluateHandle(d => [...document.querySelectorAll('#app button, #app [data-go], #app a[href^="#"], #app .opc, #app [role=button], #app summary, #overlay button, #rest-layer button')].find(e => e.id === d.id && (e.dataset.go || '') === d.go && (e.dataset.arg || '') === d.arg && (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) === d.txt), d);
  const el = h.asElement(); if (!el) return false;
  await el.click({ timeout: 1500 }).catch(() => el.evaluate(e => e.click()).catch(() => {})); return true;
}
const voltaApp = async p => { if (!p.url().startsWith('http://app.local')) { await p.goto('http://app.local/?demo#home').catch(() => {}); await p.waitForTimeout(1200); } };
// Passeio de 2 níveis a partir de uma tela: toca em cada botão; se abriu pop-up, toca também nos botões dele
async function passeia(p, quem, name, arg, { nivel2 = true, max = 18, recarrega = false } = {}) {
  const onde = () => p.evaluate(() => location.hash.slice(1) + '|' + !!document.querySelector('#overlay')?.innerHTML + '|' + !!document.querySelector('#rest-layer')?.innerHTML).catch(() => '');
  const abre = async () => { await voltaApp(p); if (recarrega) { await p.reload(); await p.waitForTimeout(1200); } /* painel guarda a seção aberta: recarrega pra voltar ao começo */ await limpa(p); await nav(p, name, arg); await p.waitForTimeout(450); await limpa(p); };
  tela = name + (arg ? '/' + arg : ''); const t0 = Date.now(); await abre(); const base = await onde();
  const n1 = (await tocaveis(p)).slice(0, max); let toques = 0;
  for (const d of n1) {
    tela = `${name}${arg ? '/' + arg : ''} > ${d.go || d.id || d.txt}`;
    await abre(); // cada botão parte da tela limpa (seções do painel trocam sem mudar o endereço)
    if (await p.evaluate(() => location.hash) === '#entrada') { console.log('  !! saiu da conta antes de', tela); break; }
    if (!await toca(p, d)) continue; toques++; await p.waitForTimeout(350);
    const popup = await p.evaluate(() => !!document.querySelector('#overlay')?.innerHTML).catch(() => false);
    // mesma tela, botões novos (seção do painel, lista aberta): toca em até 6 deles
    if (nivel2 && !popup && (await onde()).split('|')[0] === base.split('|')[0]) {
      const antes = new Set(n1.map(x => JSON.stringify(x))), n2 = (await tocaveis(p)).filter(x => !antes.has(JSON.stringify(x))).slice(0, 6);
      for (const d2 of n2) { tela = `${name} > ${d.go || d.id || d.txt} > ${d2.go || d2.id || d2.txt}`; await abre(); if (!await toca(p, d)) break; await p.waitForTimeout(300); if (await toca(p, d2)) { toques++; await p.waitForTimeout(350); } }
    }
    if (nivel2 && popup) {
      const n2 = (await p.evaluate(() => [...document.querySelectorAll('#overlay button, #overlay .opc')].map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)))).filter(x => x && !PERIGO.test(x)).slice(0, 5);
      for (const x of n2) { tela = `${name} > ${d.go || d.id || d.txt} > ${x}`; if (!await p.evaluate(() => !!document.querySelector('#overlay')?.innerHTML)) { await abre(); if (!await toca(p, d)) break; await p.waitForTimeout(300); }
        const h = await p.evaluateHandle(x => [...document.querySelectorAll('#overlay button, #overlay .opc')].find(e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) === x), x); const el = h.asElement(); if (el) { await el.click({ timeout: 1500 }).catch(() => {}); toques++; await p.waitForTimeout(300); } }
    }
  }
  console.log(`  ${quem} ${name}${arg ? '/' + arg : ''}: ${n1.length} botões, ${toques} toques, ${Math.round((Date.now() - t0) / 1000)} s, termina em ${await p.evaluate(() => location.hash).catch(() => '?')}`);
}

// 1) ALUNA ------------------------------------------------------------------------------------
console.log('— aluna');
{ const { ctx, p } = await nova('ana@demo.com');
  for (const r of ['home', 'treino', 'videos', 'lib', 'hyrox', 'spin', 'comunidade', 'semana', 'pontos', 'evolucao', 'perfil', 'assistente']) await passeia(p, 'aluna', r);
  // telas com argumento: treinos, programas, aulas de spinning
  const extras = await p.evaluate(() => [...document.querySelectorAll('[data-go]')].map(e => [e.dataset.go, e.dataset.arg]).filter(([g, a]) => a));
  await nav(p, 'lib'); await p.waitForTimeout(700); const progs = await p.evaluate(() => [...document.querySelectorAll('[data-go="programa"]')].map(e => e.dataset.arg).filter(Boolean));
  await nav(p, 'spin'); await p.waitForTimeout(700); const aulas = await p.evaluate(() => [...document.querySelectorAll('[data-go="spinAula"], [data-aula]')].map(e => e.dataset.arg || e.dataset.aula).filter(Boolean));
  for (const s of [...new Set(progs)].slice(0, 3)) await passeia(p, 'aluna', 'programa', s, { max: 12 });
  for (const a of [...new Set(aulas)].slice(0, 1)) await passeia(p, 'aluna', 'spinAula', a, { nivel2: false, max: 8 });
  // treino aberto (sessão), tela de fim e card — começa sem treino pausado de antes
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/sessao/.test(k)) localStorage.removeItem(k); }); await p.reload(); await p.waitForTimeout(1300); await limpa(p);
  for (const l of ['A', 'B']) await passeia(p, 'aluna', 'treino', l);
  tela = 'sessao'; await nav(p, 'treino', 'A'); await p.waitForTimeout(600); await p.click('#ini').catch(() => {}); await p.waitForTimeout(900); console.log('  abriu o treino?', await p.evaluate(() => location.hash + ' ' + (document.querySelector('#overlay')?.innerText || '').slice(0, 80))); await limpa(p);
  if (await p.$('#rest-skip')) await p.click('#rest-skip').catch(() => {});
  console.log('  treino aberto?', await p.evaluate(() => location.hash));
  await passeia(p, 'aluna', 'sessao', null, { nivel2: false, max: 20 });
  await nav(p, 'sessao'); await p.waitForTimeout(500); await passeia(p, 'aluna', 'fim', null, { nivel2: false, max: 15 });
  await passeia(p, 'aluna', 'card', null, { nivel2: false, max: 10 });
  // voltar do celular em sequência não quebra
  tela = 'voltar'; for (let i = 0; i < 8; i++) { await p.goBack().catch(() => {}); await p.waitForTimeout(250); } await voltaApp(p);
  // 2) VAZAMENTO: abre e fecha o treino 20x -----------------------------------------------------
  tela = 'vazamento'; await limpa(p); await nav(p, 'home'); await p.waitForTimeout(800);
  const conta = () => p.evaluate(() => ({ ...window.__c, nos: document.getElementsByTagName('*').length }));
  const ciclo = async () => { await nav(p, 'treino', 'A'); await p.waitForTimeout(350); const ini = await p.$('#ini'); if (ini) await ini.click().catch(() => {}); await p.waitForTimeout(450); await limpa(p); if (await p.$('#rest-skip')) await p.click('#rest-skip').catch(() => {}); await p.waitForTimeout(150); const s = await p.$('.set .rest:not(.tm)'); if (s) await s.click().catch(() => {}); await p.waitForTimeout(300); if (await p.$('#rest-skip')) await p.click('#rest-skip').catch(() => {}); await p.waitForTimeout(150); await nav(p, 'home'); await p.waitForTimeout(450); await limpa(p); await nav(p, 'perfil'); await p.waitForTimeout(300); await nav(p, 'home'); await p.waitForTimeout(400); };
  for (let i = 0; i < 3; i++) await ciclo(); const c0 = await conta();
  for (let i = 0; i < 20; i++) await ciclo(); const c1 = await conta();
  console.log('  contador depois de 3 voltas:', JSON.stringify(c0), '| depois de +20:', JSON.stringify(c1));
  ok(c1.iv - c0.iv <= 1, `timers (setInterval) não acumulam: ${c0.iv} → ${c1.iv}`);
  ok(c1.lis - c0.lis <= 2, `escutas em window/document não acumulam: ${c0.lis} → ${c1.lis}`);
  ok(c1.raf <= 3, `requestAnimationFrame sem laço sobrando: ${c1.raf}`);
  ok(c1.nos - c0.nos < 200, `elementos na página não crescem: ${c0.nos} → ${c1.nos}`);
  await ctx.close(); }

// 3) IDIOMAS: telas principais em cada idioma --------------------------------------------------
for (const l of ['en', 'es', 'zh', 'hi', 'fr']) {
  console.log('— aluna em', l);
  const { ctx, p } = await nova('ana@demo.com', l);
  for (const r of ['home', 'treino', 'pontos', 'evolucao', 'perfil', 'lib', 'spin', 'semana']) { tela = l + ' ' + r; await nav(p, r); await p.waitForTimeout(500); await limpa(p); }
  tela = l + ' sessao'; await nav(p, 'treino', 'A'); await p.waitForTimeout(500); await p.click('#ini').catch(() => {}); await p.waitForTimeout(600); await limpa(p); await nav(p, 'home'); await p.waitForTimeout(500);
  // troca de idioma pelo seletor do Perfil
  tela = l + ' troca idioma'; await nav(p, 'perfil'); await p.waitForTimeout(500); const bt = await p.$('#lang, [data-idioma], #idioma'); if (bt) { await bt.click(); await p.waitForTimeout(300); const o = await p.$('[data-l="pt"]'); if (o) { await o.click(); await p.waitForTimeout(500); } }
  await ctx.close();
}

// 4) PAINEL DO IGOR ------------------------------------------------------------------------------
console.log('— Igor');
{ const { ctx, p } = await nova('igor@demo.com');
  await passeia(p, 'igor', 'admin', null, { max: 40, recarrega: true });
  await passeia(p, 'igor', 'perfil', null, { nivel2: false });
  // Toque duplo (celular lento) no "Salvar na biblioteca" não cria 2 modelos iguais
  tela = 'salvar modelo 2x'; await p.reload(); await p.waitForTimeout(1300); await limpa(p); await p.click('#t-treino'); await p.waitForTimeout(500); await p.click('#app .aluna'); await p.waitForTimeout(1000);
  const nMod = () => p.evaluate(() => (JSON.parse(localStorage.getItem('demo:state') || '{}').modelos || []).filter(m => m.nome === 'Teste toque duplo').length); const m0 = await nMod();
  await p.click('#pAlib'); await p.fill('#smN', 'Teste toque duplo'); await p.waitForTimeout(300); await p.evaluate(() => { const b = document.querySelector('#smS'); b.click(); b.click(); }); await p.waitForTimeout(900);
  // Toque duplo no "Criar exercício" da busca não põe o exercício 2x no treino
  await p.click('#addE'); await p.waitForTimeout(400); await p.fill('#sxQ', 'Exercicio teste duplo'); await p.waitForTimeout(300);
  await p.evaluate(() => { const b = document.querySelector('#sxNovo'); b.click(); b.click(); }); await p.waitForTimeout(900); await p.click('#sxC'); await p.waitForTimeout(300);
  const nEx = await p.evaluate(() => [...document.querySelectorAll('#overlay b')].filter(e => /teste duplo/i.test(e.innerText)).length);
  ok(nEx === 1, `toque duplo em "Criar exercício" põe 1 só no treino: ${nEx}`);
  ok(await nMod() === m0 + 1, `toque duplo em "Salvar na biblioteca" salva 1 modelo só: ${m0} → ${await nMod()}`);
  await ctx.close(); }

// 5) Entrada sem login (idioma, login) -----------------------------------------------------------
{ const ctx = await b.newContext({ viewport: { width: W, height: 800 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }).catch(() => {}); } return r.abort().catch(() => {}); });
  p.on('pageerror', e => errs.push('[entrada] ' + e.message));
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(500); await p.click('#lang').catch(() => {}); await p.waitForTimeout(300); await p.click('[data-l="en"]').catch(() => {}); await p.waitForTimeout(300);
  await p.click('text=/ENTRAR|SIGN IN|LOG IN/i').catch(() => {}); await p.waitForTimeout(300); await p.fill('#em', 'ana@demo.com').catch(() => {}); await p.fill('#pw', 'errada').catch(() => {}); await p.press('#pw', 'Enter').catch(() => {}); await p.waitForTimeout(800);
  await ctx.close(); }

const unicos = [...new Set(errs)];
console.log('\nerros de JS/console:', unicos.length ? '\n  ' + unicos.join('\n  ') : 'nenhum');
console.log('falhas:', falhas);
await b.close(); if (unicos.length || falhas.length) process.exit(1);
