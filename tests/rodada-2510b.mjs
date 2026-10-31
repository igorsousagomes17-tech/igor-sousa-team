// Testes das correções da rodada extra 25/10 (tira-dúvidas, cardio de 20 min, idiomas). Uso: W=360 OUT=/tmp/shots node tests/rodada-2510b.mjs
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 375);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const falhas = [], errs = []; let n = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FALHOU ') + msg); if (!cond) falhas.push(msg); };
const rota = p => p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
async function nova(t0, w = W) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  const p = await ctx.newPage(); if (t0) await p.clock.install({ time: t0 });
  await rota(p); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const shot = (p, t) => p.screenshot({ path: `${D}/x${String(++n).padStart(2, '0')}-${t}.png` });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');
const sessao = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao')));
async function login(p, email = 'ana@demo.com') { await p.goto('http://app.local/?demo'); await espera(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await espera(p, 1000); }
async function abrirTreino(p, l = 'A') { await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await espera(p); await p.click('#ini'); await espera(p, 700); }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function terminar(p, { nota = 8 } = {}) { if (await p.$('#rest:not(.mini) #rest-x')) await p.click('#rest-x'); await p.click('#fim'); await espera(p); if (await p.$('#enc')) { await p.click('#enc'); await espera(p, 500); } await p.click('#esf button >> nth=6'); await p.click(`#nota button >> nth=${nota}`); await p.click('#env'); await espera(p, 900); }
const perguntaIA = async (p, q) => { await p.fill('#tx', q); await p.click('#env'); await espera(p, 1600); return txt(p, '#msgs'); };

// 1. Respostas do demo: emergência manda parar e ligar 192; "dormi mal" não vira resposta de dor; pergunta não some
{ const { ctx, p } = await nova(); await login(p); await p.click('[data-go="assistente"]'); await espera(p, 600);
  ok(/robô, não sou o Igor/.test(await txt(p, '#msgs')), 'saudação diz que é uma IA (robô), não o Igor');
  let m = await perguntaIA(p, 'to com dor no peito e falta de ar'); ok(/192/.test(m) && /Para o treino agora/.test(m), 'dor no peito: "Para o treino agora" + 192');
  m = await perguntaIA(p, 'dormi mal essa noite'); ok(!/Se doeu durante o exercício/.test(m.split('dormi mal')[1] || ''), '"dormi mal" não recebe a resposta de dor');
  await p.fill('#tx', 'Como faço o búlgaro do jeito certo?'); await p.click('#env'); await espera(p, 150); await p.click('.tabs [data-go="home"]'); await espera(p, 1500);
  await p.click('[data-go="assistente"]'); await espera(p, 600); ok(/búlgaro do jeito certo/.test(await txt(p, '#msgs')) && /pé de trás apoiado/.test(await txt(p, '#msgs')), 'saiu antes da resposta: pergunta e resposta aparecem ao voltar');
  await p.click('.tabs [data-go="perfil"]'); await espera(p, 600); await p.click('#out'); await espera(p, 300); await p.click('#q-n'); await espera(p, 600);
  ok(!(await p.evaluate(() => localStorage.getItem('demo:chat'))), 'sair da conta apaga a conversa guardada no celular');
  await ctx.close(); }

// 2. Botão de cardio do fim do treino: envia sozinho e oferece "Começar cardio de 20 min" com cronômetro
{ const T = new Date('2026-10-25T09:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'C');
  // treino completo (sem o HIIT opcional): só treino completo oferece o cardio de 20 min no card
  for (let k = 0; k < 14; k++) { if (await p.$('#rest:not(.mini) #rest-x')) await p.click('#rest-x'); if (!(await p.$('#sw'))) break; if (/opcional/i.test(await txt(p, '.bloco h1'))) { await p.click('#fin'); await espera(p, 600); break; } await p.click('#sw'); await espera(p, 450); if (await p.$('#q-s')) { await p.click('#q-s'); await espera(p, 800); } }
  if (await p.$('#enc')) { await p.click('#enc'); await espera(p, 500); }
  await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900);
  await p.click('[data-go="assistente"]:has-text("cardio")'); await espera(p, 1800);
  const m = await txt(p, '.view'); ok(/cardio de 20 minutos pra fazer agora/.test(m) && /30s forte/.test(m), 'botão do card envia sozinho e a resposta traz o cardio');
  ok(!!(await p.$('#cardioJa')), 'resposta tem "▶ Começar cardio de 20 min"');
  await p.click('#cardioJa'); await espera(p, 700); ok(/Cardio 20 min/i.test(await txt(p, '.view')) && !!(await p.$('.rest.tm')), 'abre o treino de cardio com cronômetro');
  // 3. recarregar no meio do cardio não perde: volta minimizado com o tempo que falta
  await p.click('.rest.tm'); await espera(p, 300); await p.clock.fastForward('03:00'); await p.reload(); await espera(p, 1400);
  ok(!!(await p.$('#rest.mini')) && /⏱/.test(await txt(p, '.rest.tm')), 'recarregou no meio do cardio: continua rodando (minimizado)');
  const f0 = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao')).trab?.ini);
  await p.click('.rest.tm'); await espera(p, 300); const f1 = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao')).trab?.ini);
  ok(f0 && f0 === f1 && !!(await p.$('#rest:not(.mini)')), 'tocar de novo no ⏱ só abre o cronômetro (não recomeça)');
  ok(/Forte!|Leve/i.test(await p.innerText('#rest-t')), 'cronômetro mostra a fase (Forte/Leve) com os segundos');
  await p.click('#rest-x'); await p.clock.fastForward('02:00'); await p.click('#fim'); await espera(p, 800);
  const v = await txt(p, '.view'); ok(/1 de 1/.test(v), `finalizar com o cardio rodando registra os minutos (${v.slice(0, 80)})`);
  await ctx.close(); }

// 4. "Senti dor" sem nenhuma série: dá pra avisar o Igor; chega no painel com selo
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'C');
  await p.locator('details.mais summary').first().click(); // bi-set: Ver execução/Dúvida/Senti dor ficam no "Dica e opções" (crítica 30/10)
  await p.click('[data-dor]'); await espera(p, 300); await p.click('#d-m'); await espera(p, 300); ok(/Anotei: dor em/.test(await p.innerText('#toast')), 'aviso "Anotei: dor em …"');
  await p.click('#fim'); await espera(p); ok(/Avisar o Igor da dor/i.test(await txt(p, '#m')), 'encerrar sem série oferece "Avisar o Igor da dor e encerrar"');
  await p.click('#enc'); await espera(p, 500); ok(/Você anotou dor em/.test(await txt(p, '.view')), 'feedback mostra a dor anotada em cima');
  await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=6'); await p.click('#env'); await espera(p, 900);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.logado = false; localStorage.setItem('demo:state', JSON.stringify(s)); });
  await login(p, 'igor@demo.com'); await p.click('#a-fb'); await espera(p, 300); const pv = await txt(p, '.view'); ok(/⚠ dor: Dead Bug/i.test(pv) && /\bDOR\b/.test(pv), 'painel do Igor recebe a dor com selo');
  await ctx.close(); }

// 5. Semana flexível com zoom (288 px) não estoura; francês sem "?" sozinho na linha
{ const { ctx, p } = await nova(new Date('2026-10-26T10:00:00-03:00').getTime(), 288); await login(p);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(/Por qual treino/.test(await txt(p, '.view')) && sw <= 289, `escolha da semana cabe em 288 px (${sw}px)`);
  await p.click('.semop >> nth=2'); await espera(p, 500); ok(/Semana começa pelo Treino C/.test(await p.innerText('#toast')) && !!(await p.$('#semTroca')), 'escolher mostra confirmação e dá pra trocar');
  await p.evaluate(() => localStorage.setItem('idioma', 'fr')); await p.reload(); await espera(p, 1200);
  const fr = await p.evaluate(() => document.body.innerText); ok(!/ [?!:]/.test(fr), 'francês: ? ! : grudados com espaço que não quebra');
  await ctx.close(); }

console.log('erros de página:', errs); await b.close();
if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); } else console.log('tudo ok');
