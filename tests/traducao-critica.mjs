// Tradução do que o Igor digita, em inglês e francês (crítica de 30/10, item 4 e vizinhos).
// Falha se aparecer frase misturada (palavra a palavra): "&amp;", " on búlgaro", "TREINO ON", "PRA RUN", "each side" junto de palavra portuguesa,
// recado/resposta do Igor alterados, "workout·" sem espaço. Confere também as abas (pílulas numa linha, interruptor, busca, prêmios).
// Uso: APP=/caminho/do/app OUT=/tmp/shots node tests/traducao-critica.mjs
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = process.env.OUT || '/tmp'; const W = 360;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const falhas = []; const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
// Misturas que já apareceram na tela (e as parecidas)
const RUINS = [/&amp;/, /\bon búlgaro\b/i, /\bTREINO ON\b/i, /\bPRA RUN\b/i, /\bLat pulldown Pronada\b/i, /\bFrom Igor: Mês carga/i, /\bMês carga\b/, /workout·|séances?·|\S·\s\d+\s?min/,
  /\bwith a leg\b/i, /\bsur bulgare\b/i, /\bet carga\b/i, /\b(on|with|sur|avec) (próxima|perna|carga|búlgaro|casa)\b/i];
const PT = /\b(passos|cada|com|pra|na|no|da|do|de|sem|mais)\b/i; // palavra portuguesa solta numa linha que também tem tradução
const TRAD = /\b(each side|each leg|de chaque côté|chaque jambe|to failure|jusqu’à l’échec)\b/i;
const RECADO = 'Essa semana é de carga. Anota tudo!', RESP = 'senti a lombar no búlgaro', OBS = 'Mês de carga. Anota tudo!';

for (const L of ['en', 'fr']) {
  console.log(`\n== ${L} ==`);
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: W, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  const espera = (ms = 600) => p.waitForTimeout(ms);
  await p.goto('http://app.local/?demo'); await espera(700);
  await p.click('#lang'); await espera(300); await p.click(`[data-l="${L}"]`); await espera(400);
  await p.click('[data-go="login"]'); await espera(400); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await espera(1300);
  // O Igor respondeu o feedback (resposta nova aparece no Início e no Perfil)
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); const x = s.sessoes.find(v => v.comentario); x.resposta_igor = 'Vi que sentiu a lombar no búlgaro. Na próxima faz com a perna de trás mais baixa'; x.respondida_em = new Date().toISOString(); localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('respLidas'); });
  await p.reload(); await espera(1300);
  async function confere(nome) {
    const txt = await p.innerText('body');
    const ruins = RUINS.filter(r => r.test(txt)).map(String);
    const mistas = txt.split('\n').filter(l => TRAD.test(l) && PT.test(l.replace(TRAD, '')));
    ok(!ruins.length && !mistas.length, `${L}/${nome}: sem frase misturada ${ruins.length || mistas.length ? JSON.stringify([...ruins, ...mistas].slice(0, 5)) : ''}`);
    await p.screenshot({ path: `${D}/tc-${L}-${nome}.png`, fullPage: true });
    return txt;
  }
  let txt = await confere('inicio');
  ok(txt.includes('Vi que sentiu a lombar no búlgaro. Na próxima faz com a perna de trás mais baixa'), `${L}/inicio: resposta do Igor inteira, em português`);
  ok(txt.includes(RECADO), `${L}/inicio: recado do Igor inteiro, em português`);
  ok(!/[^.]\.\.(?!\.)/.test(txt), `${L}/inicio: aviso de vencimento sem ponto duplo`);
  for (const l of ['A', 'B', 'C', 'D']) {
    await p.click('.tabs [data-go="treino"]'); await espera(500); await p.click(`[data-go="treino"][data-arg="${l}"]`); await espera(600);
    txt = await confere('treino-' + l);
    if (l === 'A') {
      ok(txt.includes(OBS), `${L}/treino: observação do plano em português (não palavra a palavra)`);
      const tops = await p.$$eval('[data-go="treino"][data-arg]', bs => bs.map(x => Math.round(x.getBoundingClientRect().top)));
      ok(new Set(tops).size === 1, `${L}/treino: pílulas dos treinos numa linha só (${tops})`);
      const mes = await p.$eval('.topbar .pill:last-child', e => e.textContent);
      ok(/\d/.test(mes), `${L}/treino: pílula mostra até quando vale ("${mes}")`);
    }
  }
  await p.click('.tabs [data-go="videos"]'); await espera(700); txt = await confere('videos');
  ok(!/Mobilidade|Costas e bíceps|em gravação/.test(txt), `${L}/videos: subtítulos traduzidos e sem "em gravação"`);
  const ph = await p.getAttribute('#busca', 'placeholder'); const cabe = await p.$eval('#busca', e => { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(e).font; return c.measureText(e.placeholder).width < e.clientWidth - 20; });
  ok(cabe, `${L}/videos: placeholder da busca cabe ("${ph}")`);
  await p.fill('#busca', 'bulg'); await espera(300); ok((await p.$$('.vid')).length > 0, `${L}/videos: busca acha`); await p.fill('#busca', ''); await espera(200);
  await p.click('.tabs [data-go="pontos"]'); await espera(800); await confere('pontos');
  ok(await p.$$eval('.pontos-premios .lib', ls => ls.every(l => l.querySelector('span[aria-hidden]')?.textContent.trim())), `${L}/pontos: prêmios com ícone`);
  await p.click('.tabs [data-go="perfil"]'); await espera(900); txt = await confere('perfil');
  ok(txt.includes(RESP) && txt.includes('Vi que sentiu a lombar no búlgaro'), `${L}/perfil: feedback e resposta em português`);
  ok(!/atenção/.test(txt), `${L}/perfil: anamnese sem "atenção" em português`);
  const sw = await p.$eval('#chipOn', e => ({ sw: e.classList.contains('sw'), on: e.classList.contains('on'), h: e.getBoundingClientRect().height }));
  ok(sw.sw && sw.on && sw.h >= 40, `${L}/perfil: cronômetro na tela de bloqueio é interruptor (${JSON.stringify(sw)})`);
  await p.click('#chipOn'); ok(await p.evaluate(() => localStorage.getItem('chip_off')) === '1', `${L}/perfil: interruptor desliga`); await p.click('#chipOn');
  ok(await p.evaluate(() => localStorage.getItem('chip_off')) === null, `${L}/perfil: interruptor liga de novo`);
  // com o campo "Responder o Igor" (migração 020) o link do WhatsApp sai do card; sem ele, o link continua com alvo ≥ 40px
  if (await p.$('a[href*="wa.me"]:not(.btn)')) { const wa = await p.$eval('a[href*="wa.me"]:not(.btn)', e => e.getBoundingClientRect().height); ok(wa >= 40, `${L}/perfil: link do WhatsApp com alvo de toque ≥ 40px (${Math.round(wa)})`); }
  else { const ri = await p.$eval('[data-rsend]', e => e.getBoundingClientRect().height).catch(() => 0); ok(ri >= 40, `${L}/perfil: botão de responder o Igor com alvo ≥ 40px (${Math.round(ri)})`); }
  await p.click('.tabs [data-go="home"]'); await espera(800); await p.click('[data-go="lib"]'); await espera(700); await confere('programas');
  await p.click('[data-go="programa"][data-arg="corrida"]'); await espera(700); await confere('programa-corrida');
  ok(!errs.length, `${L}: sem erro de página/console ${errs.length ? JSON.stringify(errs.slice(0, 4)) : ''}`);
  await ctx.close();
}
await b.close();
if (falhas.length) { console.log('\nFALHAS:', falhas.length); process.exit(1); }
console.log('\ntudo ok');
