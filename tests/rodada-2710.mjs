// Testes da rodada 27/10 (IA do demo: "peito"/peso inicial/vídeo/pressão; Express 12/8 com a carga certa e só no dia; desmarcar série; série preenchida sem ✓; volta depois de 40 min fora; spinning que pergunta no voltar, retoma e não pontua incompleto; login vazio; abas com letra grande; treino pausado sem pop-up de pontos).
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

const st = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')));

// Clica numa série mesmo se um descanso abrir em tela cheia por cima (fecha e tenta de novo)
async function clica(p, sel) { for (let t = 0; t < 3; t++) { if (await p.$('#rest:not(.mini) #rest-x')) { await p.click('#rest-x'); await espera(p, 300); } try { await p.click(sel, { timeout: 3000 }); return; } catch {} } await p.click(sel); }

// 1) IA do demo
{ const { ctx, p } = await nova(); await login(p);
  await p.goto('http://app.local/?demo#assistente'); await espera(p, 300); await p.evaluate(() => document.querySelector('[data-go="assistente"]')?.click()); await espera(p, 800);
  if (!(await p.$('#tx'))) { await p.click('.tabs [data-go="home"]'); await espera(p); }
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.go = 'assistente'; document.body.appendChild(b); b.click(); }); await espera(p, 900);
  let r = await perguntaIA(p, 'O crucifixo trabalha o peito?'); ok(!/192/.test(r.split('crucifixo').pop()), 'peito (músculo) não manda ligar 192');
  r = await perguntaIA(p, 'Qual peso eu coloco no primeiro dia?'); ok(/escolhe um peso que dá pra fazer todas/.test(r.split('primeiro dia?').pop()), 'peso do 1º dia tem resposta certa');
  r = await perguntaIA(p, 'Não consigo ver o vídeo do exercício'); ok(/vídeo de alguns exercícios/.test(r.split('ver o vídeo do exercício').pop()), 'vídeo tem resposta própria');
  r = await perguntaIA(p, 'minha pressão é alta posso fazer o hiit?'); ok(/liberação do seu médico/.test(r.split('fazer o hiit?').pop()), 'pressão "é alta" freia o HIIT');
  r = await perguntaIA(p, 'dor no peito e falta de ar'); ok(/192/.test(r.split('falta de ar').pop()), 'dor no peito continua emergência');
  await shot(p, 'ia'); await ctx.close(); }

// 2) Express: pirâmide 12/8 com a carga das séries 1 e 3; Início mostra Express; amanhã volta o Completo
{ const { ctx, p } = await nova(); await login(p);
  await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click('[data-go="treino"][data-arg="A"]'); await espera(p); await p.click('[data-ver="1"]'); await espera(p);
  const lista = await txt(p, '.view'); ok(/12\/8/.test(lista) && !/× 10\/8/.test(lista), 'Express da pirâmide fica 12/8');
  await p.click('.tabs [data-go="home"]'); await espera(p, 700); ok(/⚡ Express ~/.test(await txt(p, '.view')), 'Início mostra "⚡ Express" quando ligado');
  await abrirTreino(p, 'A'); if (await p.$('#q-s')) { await p.click('#q-n'); await espera(p); }
  ok(/⚡ Express/.test(await txt(p, '.sessao')), 'sessão diz que é Express');
  await p.click('#pular'); await espera(p, 500);
  const ph = await p.$$eval('.set[data-i="1"] input[data-f="kg"]', xs => xs.map(x => x.placeholder)); console.log('placeholders Smith express', ph);
  ok(ph[0] === '22' && ph[1] === '28', 'Express: sugestão 22 (12 reps) e 28 (8 reps)');
  await p.evaluate(() => localStorage.setItem('demo:versaoExpress', JSON.stringify('2020-01-01'))); await p.click('#sair'); await espera(p, 500);
  await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click('[data-go="treino"][data-arg="B"]'); await espera(p);
  ok(await p.$eval('[data-ver="0"]', b => b.classList.contains('on')), 'Express de outro dia volta pro Completo');
  await ctx.close(); }

// 3) Desmarcar série tira o ✓ do exercício; série preenchida sem ✓ é perguntada no fim
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A');
  // vai pro Leg Press (passo sem bi-set) pela lista
  const passos = await p.$$eval('.passos button', bs => bs.map(b => b.textContent)); const j = passos.findIndex(x => x === '4'); await p.click(`.passos button >> nth=${j}`); await espera(p);
  const i = await p.$eval('.bloco', b => b.dataset.i); const nS = await p.$$eval(`.set[data-i="${i}"] .rest`, x => x.length);
  for (let k = 0; k < nS; k++) { await p.click(`.set[data-i="${i}"][data-k="${k}"] .rest`); await espera(p, 300); if (await p.$('#rest:not(.mini) #rest-skip')) { await p.click('#rest-skip'); await espera(p, 300); } }
  await espera(p, 800); if (await p.$('#rest:not(.mini) #rest-skip')) { await p.click('#rest-skip'); await espera(p, 300); }
  ok(await p.$('#corr') !== null, 'logo depois de fechar o exercício aparece "‹ Corrigir"');
  await p.click('#corr'); await espera(p, 400); await espera(p, 1100); if (await p.$('#rest:not(.mini) #rest-x')) { await p.click('#rest-x'); await espera(p, 300); }
  await clica(p, `.set[data-i="${i}"][data-k="1"] .rest`); await espera(p, 500);
  const s = await sessao(p); ok(!s.feito[i], 'série desmarcada: exercício volta a faltar');
  ok(!(await p.$eval('#sw', b => b.classList.contains('on'))), 'chave desligada depois de desmarcar');
  await p.fill(`.set[data-i="${i}"][data-k="1"] input[data-f="reps"]`, '12'); await p.click('#fim'); await espera(p, 500);
  ok(/preenchida sem marcar/i.test(await txt(p, '#m')), 'fim pergunta da série preenchida sem ✓');
  await p.click('#m [data-o="0"]'); await espera(p, 600); const s2 = await sessao(p); ok(s2.sets[i][1].done, 'marcou a série preenchida');
  await shot(p, 'preenchida'); await ctx.close(); }

// 4) Fora 40 min com o app escondido: volta sem relógio negativo e sem ser expulsa
{ const { ctx, p } = await nova(new Date('2026-10-27T10:00:00-03:00')); await login(p); await abrirTreino(p, 'B'); if (await p.$('#q-s')) { await p.click('#q-n'); await espera(p); }
  await p.clock.fastForward(4 * 60000); await p.mouse.click(5, 300); await espera(p);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.fastForward(40 * 60000);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.fastForward(3000); await espera(p, 500);
  ok(/#sessao/.test(p.url()), 'voltou e continua no treino (não foi pausada na hora)');
  const rel = await p.textContent('#clock'); console.log('relógio', rel); ok(!/-/.test(rel) && /^[4-6]:/.test(rel), 'relógio com os ~4 min reais, nunca negativo');
  await ctx.close(); }

// 5) Spinning: voltar pergunta, recarregar oferece continuar, aula curta não pontua
{ const { ctx, p } = await nova(new Date('2026-10-27T10:00:00-03:00')); await login(p);
  const pts0 = (await st(p)).perfil.pontos;
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.go = 'spin'; document.body.appendChild(b); b.click(); }); await espera(p, 800);
  await p.click('[data-spin] >> nth=0'); await espera(p, 600); await p.click('#sGo'); await p.click('#sGo'); await espera(p, 300);
  ok(/aquec/i.test(await txt(p, '#sNome')), 'toque duplo no Começar não pula o aquecimento');
  await p.clock.fastForward(70000); await espera(p, 300);
  await p.goBack(); await espera(p, 500); ok(/Sair da aula/i.test(await txt(p, '#m')), 'voltar do celular pergunta antes de sair');
  await p.click('#m [data-o="0"]'); await espera(p, 400); ok(await p.$('#sPausa') !== null && !(await p.$('#m')), 'continuar pedalando volta pra aula');
  await p.clock.fastForward(6000); await p.reload(); await espera(p, 1500);
  ok(/Aula pela metade/i.test(await txt(p, 'body')), 'recarregou: oferece continuar a aula');
  await p.click('#m [data-o="0"]'); await espera(p, 900); ok(/Seguir/i.test(await txt(p, '#sPausa')), 'aula volta pausada de onde estava');
  await p.click('#sSair'); await espera(p, 400); await p.click('#m [data-o="1"]'); await espera(p, 600);
  const tela = await txt(p, '.view'); ok(/Boa, registrado/i.test(tela) && /não pontua/.test(tela), 'aula incompleta registrada sem prometer');
  ok(await p.$('#spStory') !== null, 'aula tem "Postar no story"');
  await espera(p, 2500); const pts1 = (await st(p)).perfil.pontos; ok(pts1 === pts0, `aula de 1 min não deu +50 (${pts0} → ${pts1})`);
  await shot(p, 'spin'); await ctx.close(); }

// 6) Login vazio: aviso do app; abas com letra grande; treino pausado não pergunta "Terminou?"
{ const { ctx, p } = await nova(); await p.goto('http://app.local/?demo'); await espera(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', ''); await p.click('#bt'); await espera(p, 300);
  ok(/Digita seu e-mail/.test(await txt(p, '#err')), 'login vazio: aviso do app embaixo');
  await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await espera(p, 1000);
  await p.addStyleTag({ content: 'html{font-size:130%}' }); await espera(p, 300);
  const abas = await p.$$eval('.tabs .tab', bs => bs.map(b => [...b.querySelectorAll('span')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.textContent).join('')));
  console.log('abas 130%', abas); ok(abas.includes('Pts') && !abas.some(a => a.includes('…')), 'abas com letra grande: nome curto inteiro');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:sessao') || 'null'); }); await shot(p, 'abas130');
  await ctx.close(); }
{ const t0 = new Date('2026-10-27T10:00:00-03:00'); const { ctx, p } = await nova(t0); await login(p); await abrirTreino(p, 'B'); if (await p.$('#q-s')) { await p.click('#q-n'); await espera(p); }
  await p.click('#sair'); await espera(p); await p.clock.fastForward(2 * 3600000); await p.reload(); await espera(p, 1500);
  ok(!/Terminou o treino/.test(await txt(p, 'body')), 'treino pausado não empurra "Terminou? ganhar os pontos"');
  await ctx.close(); }

console.log('erros de página:', errs); await b.close();
if (falhas.length || errs.length) { console.log('\nFALHAS:', falhas.length); process.exit(1); }
