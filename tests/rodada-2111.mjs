import { vaiEVolta } from './_vaievolta.mjs';
// Rodada 21/11 (Júlia, Carla, Márcia, Renata, Bia): W=360 OUT=/tmp node tests/rodada-2111.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const W = +(process.env.W || 360);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHOU ') + m); if (!c) errs.push(m); };
async function nova({ w = W, h = 780 } = {}) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  const p = vaiEVolta(await ctx.newPage());
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f.split('?')[0] }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const w = (p, ms = 400) => p.waitForTimeout(ms);
const entrar = async (p, email = 'ana@demo.com') => { await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await w(p, 1000); };
const treino = async (p, l) => { await p.click('.tabs [data-go="treino"]'); await w(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await w(p); await p.click('#ini'); await w(p, 700); if (await p.locator('#m [data-o]').count()) { await p.locator('#m [data-o]').last().click(); await w(p, 500); } };
const passo = async (p, rx) => { const j = await p.$$eval('[data-passo]', (bs, s) => bs.findIndex(x => new RegExp(s, 'i').test(x.getAttribute('aria-label') || '')), rx); await p.click(`[data-passo="${j}"]`); await w(p, 500); return j; };
const sessao = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao') || 'null'));

// 1. Márcia: "Aa" não apaga o que ela digitou; convite pede a senha 2 vezes; voltar do celular no convite volta pra entrada
{ const { ctx, p } = await nova(); await p.goto('http://app.local/?demo'); await w(p, 500);
  await p.click('text=Recebi o convite do Igor'); await w(p);
  await p.fill('#cn', 'Márcia Souza'); await p.fill('#cw', '62 98888-7777'); await p.click('[data-aa]'); await w(p);
  ok(await p.inputValue('#cn') === 'Márcia Souza' && await p.inputValue('#cw') === '62 98888-7777', '"Aa" não apaga o nome e o WhatsApp digitados');
  ok(/Toca de novo/.test(await p.innerText('#toast')), '"Aa" diz o que o próximo toque faz');
  ok(await p.locator('#cs2').count() === 1, 'convite pede "Repete a senha"');
  await p.goBack(); await w(p); ok(/ENTRAR/i.test(await p.innerText('body')), 'voltar do celular no convite volta pra entrada (não sai do app)');
  await ctx.close(); }

// 2. Carla: série de reconhecimento não conta como exercício (pular não deixa incompleto) e não vira "Outros" em Minhas cargas
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'D');
  const s = await sessao(p), n = s.exs.filter(e => e.aq !== true && !/opcional/i.test(e.nome)).length;
  ok(s.exs.some(e => e.aq === true), 'Treino D tem a série de reconhecimento');
  ok(new RegExp(`0 de ${n} exercícios`).test(await p.innerText('.view')), `contagem sem o reconhecimento (0 de ${n})`);
  const r = await p.evaluate(async () => { const m = await import('/js/conteudo.js'); return m.casaEx('Puxada Pronada', 'Puxada Pronada · reconhecimento'); });
  ok(r === 0, 'aquecimento não entra no histórico da Puxada');
  ok(await p.locator('.passos button.chR').count() === 1, 'chip R estreito');
  await ctx.close(); }

// 3. Carla: pirâmide sem histórico mostra o peso que vai ser gravado; Júlia: drop não abre o descanso antes das quedas
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'B'); await passo(p, 'Abdu');
  await p.fill('.set[data-k="0"] input[data-f="kg"]', '40'); await p.fill('.set[data-k="0"] input[data-f="reps"]', '12');
  await p.click('.set[data-k="0"] .rest'); await w(p, 500);
  ok(!(await p.$('#rest:not(.mini)')), 'drop: ⏱ antes das quedas não abre o descanso');
  ok(/quedas/i.test(await p.innerText('#toast')), 'drop: avisa "agora as quedas"');
  ok(/^\d/.test(await p.getAttribute('.dl[data-k="0"][data-d="0"] input[data-df="kg"]', 'placeholder') || ''), 'drop: queda mostra um peso de referência (última vez ou ~75%)');
  ok(/só depois da última queda/i.test(await p.innerText('.view')), 'dica do drop diz quando tocar no ⏱');
  await ctx.close(); }

// 4. Carla: "Outro exercício" no Aparelho ocupado; anotação de regulagem; último exercício só com "Finalizar"
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A'); if (await p.$('#q-s')) { await p.click('#q-s'); await w(p); }
  await passo(p, 'Smith');
  await p.click('.ocup'); await w(p); const ops = await p.locator('#m [data-o]').allInnerTexts(); ok(ops.some(x => /outro exerc/i.test(x)), 'Aparelho ocupado tem "Outro exercício"');
  await p.locator('#m [data-o]').filter({ hasText: /outro exerc/i }).click(); await w(p); await p.fill('#oxN', 'Búlgaro no Smith'); await p.click('#oxS'); await w(p, 600);
  ok(/búlgaro no smith/i.test(await p.innerText('h1')), 'trocou pelo exercício que ela escreveu');
  await p.click('[data-nota]'); await w(p); await p.fill('#ntx', 'banco no 4'); await p.click('#nts'); await w(p, 500);
  ok(/banco no 4/.test(await p.innerText('.notaEx')), 'anotação de regulagem aparece no exercício');
  const ult = (await p.$$('[data-passo]')).length - 1; await p.click(`[data-passo="${ult}"]`); await w(p, 500);
  ok(await p.locator('#fin').count() === 1 && await p.locator('#fim').count() === 0, 'último exercício: só "Finalizar" (sem "Encerrar")');
  ok(/forte \/ \d+s leve · eu apito/i.test(await p.innerText('.view')), 'HIIT mostra os tempos forte/leve à vista');
  await ctx.close(); }

// 5. Renata: pausa automática solta a tela e para o relógio; volta depois de 20 min pergunta (véu); voltar do celular = pausa dela
{ const { ctx, p } = await nova(); await p.clock.install({ time: new Date('2026-11-21T10:00:00-03:00') }); await entrar(p); await treino(p, 'C');
  await p.clock.fastForward(60000); await p.mouse.click(5, 300); await w(p);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.fastForward(20 * 60000);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await w(p, 500); ok(/Pausei seu treino/i.test(await p.innerText('#m')) && /\d+\s*min fora/.test(await p.innerText('#m')), '20 min fora: véu "Pausei" com aquecer de novo');
  const c1 = await p.textContent('#clock'); await p.clock.fastForward(5 * 60000); await w(p); ok(c1 === await p.textContent('#clock'), `relógio parado atrás do véu (${c1})`);
  await p.click('#veu-c'); await w(p, 500); ok(!(await p.$('#m')), 'Continuar volta pro treino');
  await ctx.close(); }

// 6. Júlia: Pontos explica a meta da semana e o desafio; Bia: Início com atalho pro Treino em casa
{ const { ctx, p } = await nova(); await entrar(p);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.local_treino = 'casa'; localStorage.setItem('demo:state', JSON.stringify(s)); }); await p.reload(); await w(p, 1200);
  ok(await p.locator('[data-go="programa"]').filter({ hasText: /Treino em casa/ }).count() >= 1, 'Início tem o atalho "Treino em casa"');
  await p.click('.tabs [data-go="evolucao"]'); await p.waitForTimeout(900); await p.click('.topbar [data-go="pontos"]').catch(() => p.evaluate(() => { location.hash = '#pontos'; })); await w(p, 900);
  await p.evaluate(() => document.querySelectorAll('details.ganhar').forEach(d => { d.open = true; })); await p.waitForTimeout(200); // "Como ganhar" fechado num botão (crítica 26/11)
  const v = await p.innerText('.view'); ok(/Meta da semana batida \(\d treinos completos na semana\)/.test(v) && /Desafio do mês \(\d+ treinos completos no mês\)/.test(v), 'Pontos diz quantos treinos valem a semana e o desafio');
  await ctx.close(); }

console.log(errs.length ? 'FALHAS: ' + JSON.stringify(errs) : 'tudo ok'); await b.close(); process.exit(errs.length ? 1 : 0);
