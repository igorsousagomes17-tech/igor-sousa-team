// Animações provisórias dos exercícios + foto/vídeo enviado na Biblioteca de exercícios (31/10)
import { chromium } from 'playwright';
import path from 'path'; import fs from 'fs';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 375);
const { animDe } = await import(APP + '/js/animacoes.js');
const falhas = [], errs = [], ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };

// 1. Nome do exercício → animação certa (e nada pros parecidos)
const casos = { 'Cadeira Extensora': 'cadeira-extensora', 'Cadeira extensora unilateral': null, 'Agachamento Hack': 'agachamento-hack', 'Panturrilha Hack': null,
  'Agachamento livre com barra': 'agachamento-livre', 'Agachamento Smith': 'agachamento-smith', 'Agachamento no Smith': 'agachamento-smith', 'Leg Press 45°': 'leg-press-45',
  'Leg Press 45 pés mais fechados': 'leg-press-45', 'Leg press horizontal': 'leg-press-horizontal', 'Afundo no Smith': 'afundo-smith', 'Afundo alternado no smith': 'afundo-alternado-smith',
  'Afundo com Halteres entre Steps': null, 'Rosca direta com halter': 'rosca-direta-halter', 'Rosca Direta com Halteres': 'rosca-direta-halter', 'Rosca Scott maquina': null,
  'Agachamento Pêndulo': 'agachamento-pendulo', 'Búlgaro no Smith': 'bulgaro-smith', 'Agachamento búlgaro com halter': 'bulgaro-halter', 'Búlgaro com halteres': 'bulgaro-halter',
  'Búlgaro com barra livre': 'bulgaro-barra', 'Búlgaro goblet': 'bulgaro-goblet', 'Búlgaro segurando o halter em cima': 'bulgaro-goblet', 'Agachamento Goblet': 'agachamento-goblet',
  'Goblet com anilha no calcanhar': null, 'Agachamento Frontal com Barra Livre': 'agachamento-frontal', 'Agachamento Frontal Smith': null,
  'Afundo com step atrás no Smith': 'afundo-step-smith', 'Afundo com step atrás com halter': 'afundo-step-halter', 'Afundo com stept atrás com halteres': 'afundo-step-halter' };
for (const [n, a] of Object.entries(casos)) ok(animDe(n) === (a && `./anim/${a}.mp4`), `"${n}" → ${a || 'sem animação'}`);
for (const a of new Set(Object.values(casos).filter(Boolean))) ok(fs.existsSync(`${APP}/anim/${a}.mp4`), `arquivo anim/${a}.mp4 existe`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
async function nova() {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: W, height: 800 }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f.split('?')[0] }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const w = (p, ms = 400) => p.waitForTimeout(ms);
const entrar = async (p, em) => { await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', em); await p.press('#pw', 'Enter'); await w(p, 1200); };

// 2. Aluna: exercício sem vídeo do Igor mostra a animação (play), os outros continuam com a dica
{ const { ctx, p } = await nova(); await entrar(p, 'ana@demo.com');
  await p.click('.tabs [data-go="treino"]'); await w(p); await p.click('[data-go="treino"][data-arg="A"]'); await w(p);
  const url = await p.getAttribute('.ex:has-text("Agachamento Smith") .play', 'data-url').catch(() => null);
  ok(url === './anim/agachamento-smith.mp4', `Agachamento Smith no treino tem play com a animação (${url})`);
  ok(await p.locator('.ex:has-text("Goblet") .play.info').count() === 1, 'exercício sem animação continua com o "i" da dica');
  await p.click('.ex:has-text("Agachamento Smith") .play'); await w(p, 600);
  ok(await p.locator('#vm .area.anim video[src="./anim/agachamento-smith.mp4"]').count() === 1, 'abre a animação em loop');
  ok(/Animação de como fazer/.test(await p.innerText('#vm')), 'avisa que é animação e o vídeo do Igor tá chegando');
  await p.screenshot({ path: `${D}/anim-1-aluna.png` });
  await ctx.close(); }

// 3. Igor: os exercícios animados entram na biblioteca; editar mostra a prévia e o botão de foto/vídeo
{ const { ctx, p } = await nova(); await entrar(p, 'igor@demo.com');
  await p.click('#t-exercicios'); await w(p, 800);
  const lista = await p.innerText('.lista');
  for (const n of ['Leg press horizontal', 'Afundo alternado no smith', 'Rosca direta com halter', 'Agachamento hack']) ok(lista.includes(n), `biblioteca tem "${n}"`);
  ok(/animação provisória/.test(await p.innerText('#bib')), 'contador mostra quantos estão com animação');
  await p.fill('#bq', 'leg press horizontal'); await w(p, 300); await p.click('[data-ex] >> nth=0'); await w(p, 500);
  ok(await p.locator('#fxP video[src="./anim/leg-press-horizontal.mp4"]').count() === 1, 'editar mostra a animação atual');
  ok(await p.locator('#fxU', { hasText: 'Adicionar foto/vídeo' }).count() === 1, 'botão "Adicionar foto/vídeo"');
  await p.screenshot({ path: `${D}/anim-2-editar.png` });
  await p.fill('#fxN', 'Leg press horizontal (máquina do Igor)');
  await p.setInputFiles('#fxF', { name: 'teste.mp4', mimeType: 'video/mp4', buffer: fs.readFileSync(`${APP}/anim/leg-press-horizontal.mp4`) }); await w(p, 600);
  ok((await p.inputValue('#fxV')).startsWith('blob:'), 'arquivo enviado vira o vídeo do exercício');
  ok(/Vídeo atual/.test(await p.innerText('#fxP')), 'prévia troca pro vídeo enviado');
  await p.click('#fxS'); await w(p, 600);
  const lib = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).lib);
  const x = lib.find(e => e.nome === 'Leg press horizontal (máquina do Igor)');
  ok(x && x.video_url?.startsWith('blob:'), 'salvou nome novo + vídeo novo');
  await p.fill('#bq', ''); await p.fill('#bq', 'cadeira extensora'); await w(p, 300); await p.click('[data-ex] >> nth=0'); await w(p, 500);
  await p.fill('#fxV', 'https://youtube.com/shorts/abc123XYZ00'); await p.dispatchEvent('#fxV', 'change'); await w(p, 300);
  ok(await p.locator('#fxP iframe').count() === 1, 'link do YouTube mostra a prévia do YouTube');
  await ctx.close(); }

await b.close();
if (errs.length) { console.log('ERROS NA PÁGINA:', errs); falhas.push(...errs); }
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK'); process.exit(falhas.length ? 1 : 0);
