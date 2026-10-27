// Testes das correções das críticas (rodada 23/10). Uso: W=360 OUT=/tmp/shots node tests/regressao.mjs
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 375);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const falhas = [], errs = []; let n = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FALHOU ') + msg); if (!cond) falhas.push(msg); };
async function nova(t0) {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: W, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  if (t0) await p.clock.install({ time: t0 });
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const shot = (p, t) => p.screenshot({ path: `${D}/r${String(++n).padStart(2, '0')}-${t}.png` });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
async function login(p) { await p.goto('http://app.local/?demo'); await espera(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await espera(p, 1000); }
async function abrirTreinoA(p) { await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click('[data-go="treino"][data-arg="A"]'); await espera(p); await p.click('#ini'); await espera(p, 700); }
const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');

// 1. Pausar para o relógio; home com treino pausado não diz "tá chegando"; 12h depois pergunta em vez de apagar
{ const T = new Date('2026-10-23T18:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreinoA(p);
  await p.click('#pular'); await espera(p); await p.click('.set[data-k="0"] .rest'); await espera(p, 500); // série 1 do leg press
  await p.click('#sair'); await espera(p, 600);
  const home = await txt(p, '.view'); ok(/pausado/i.test(home) && !/tá chegando/.test(home), 'home mostra treino pausado sem "treino tá chegando"'); await shot(p, 'home-pausado');
  await p.clock.fastForward('10:00'); await p.click('[data-go="sessao"]'); await espera(p);
  const rel = await p.innerText('#clock'); ok(/^0:\d\d$/.test(rel), 'pausa de 10 min não conta no relógio (' + rel + ')');
  await p.click('#sair'); await espera(p); await p.clock.fastForward('13:00:00'); await p.reload(); await espera(p, 1200);
  ok(/pela metade/i.test(await p.innerText('#overlay')), '13h depois pergunta "Treino pela metade" (não apaga)'); await shot(p, 'treino-velho');
  await p.click('[data-o="0"]'); await espera(p, 600); ok(/esforço/i.test(await txt(p, '.view')), 'registrar o que fiz abre o feedback'); await ctx.close(); }

// 2. Feedback: voltar pro treino funciona e o texto não some; chave sem série pergunta
{ const { ctx, p } = await nova(); await login(p); await abrirTreinoA(p);
  await p.click('#pular'); await espera(p); await p.click('#sw'); await espera(p, 500);
  ok(/Nenhuma série marcada/i.test(await p.innerText('#overlay')), 'chave sem série marcada pergunta antes de contar'); await p.click('#q-n'); await espera(p, 400);
  await p.click('.set[data-k="0"] .rest'); await espera(p, 500); await p.click('#rest-x'); await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500);
  await p.fill('#fb', 'meu filho chamou no meio'); await p.click('#esf button >> nth=6'); await p.click('#volta'); await espera(p, 500);
  ok(await p.$('#sw') !== null, 'voltar pro treino volta pra sessão');
  await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500);
  ok(await p.inputValue('#fb') === 'meu filho chamou no meio' && await p.$('#esf .on') !== null, 'texto e esforço continuam lá');
  await p.goBack(); await espera(p, 500); ok(await p.$('#sw') !== null, 'voltar do celular no feedback volta pro treino'); await ctx.close(); }

// 3. Um descanso só: voltar minimiza, novo descanso substitui o antigo
{ const { ctx, p } = await nova(); await login(p); await abrirTreinoA(p); await p.click('#pular'); await espera(p); await p.click('#pular'); await espera(p);
  await p.click('.set[data-k="0"] .rest'); await espera(p, 600); ok(await p.$('#rest') !== null, 'descanso abriu');
  await p.goBack(); await espera(p, 400); ok(await p.$('#rest.mini') !== null, 'voltar do celular minimiza o descanso (não mata)');
  await p.click('.set[data-k="1"] .rest'); await espera(p, 600); ok((await p.$$('#rest')).length === 1, 'só um cronômetro na tela');
  await p.reload(); await espera(p, 1500); ok(await p.$('#rest:not(.mini)') !== null, 'recarregou: descanso volta (em tela cheia, como estava)'); await shot(p, 'descanso-volta');
  await p.click('#rest-x'); await espera(p, 300); await p.click('#sair'); await espera(p, 500); ok(await p.$('#rest') === null, 'pausar encerra o descanso (não cobre as abas)'); await ctx.close(); }

// 4. Anamnese: múltipla escolha mantém marcado, altura em cm vira metro, rascunho sobrevive ao recarregar
{ const { ctx, p } = await nova(); await p.addInitScript(() => { const s = JSON.parse(localStorage.getItem('demo:state') || 'null'); if (s && !sessionStorage.x) { s.perfil.objetivo = null; localStorage.setItem('demo:state', JSON.stringify(s)); sessionStorage.x = 1; } });
  await login(p); await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.objetivo = null; s.perfil.foco = []; localStorage.setItem('demo:state', JSON.stringify(s)); }); await p.reload(); await espera(p, 1000);
  ok(/Antes do primeiro treino/i.test(await p.innerText('#overlay')), 'anamnese abre com boas-vindas'); await p.click('#next'); await espera(p, 300);
  for (let i = 0; i < 5; i++) { await p.click('#ops button >> nth=0'); await espera(p, 250); ok(await p.$('#ops .on') !== null && /próxima/i.test(await p.innerText('#next')), `pergunta ${i + 1} não pula sozinha`); await p.click('#next'); await espera(p, 250); }
  for (let k = 0; k < 6 && !(await p.$('#ops.multi')); k++) { await p.click('#ops button >> nth=0'); await p.click('#next'); await espera(p, 250); } // até a de foco (múltipla)
  await p.click('#ops button >> nth=0'); await p.click('#ops button >> nth=2'); await p.click('#next'); await espera(p, 250); await p.goBack(); await espera(p, 400);
  ok((await p.$$('#ops .opc.on')).length === 2, 'voltar do celular volta 1 pergunta e mantém as 2 marcadas'); await shot(p, 'anamnese-multi');
  await p.reload(); await espera(p, 1000); ok(/\d+ de \d+/.test(await p.innerText('#overlay')) && !/Antes do primeiro/.test(await p.innerText('#overlay')), 'recarregou: continua de onde parou');
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('demo:anamnese')); a.i = 19; /* peso e altura */ localStorage.setItem('demo:anamnese', JSON.stringify(a)); }); await p.reload(); await espera(p, 1000);
  await p.fill('#pk', '64,5 kg'); await p.fill('#al', '165'); await p.click('#next'); await espera(p, 300);
  const an = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:anamnese')).r); ok(an.altura_m === 1.65 && an.peso_kg === 64.5, 'altura 165 vira 1,65 e "64,5 kg" vira 64,5');
  await ctx.close(); }

// 5. Evolução: peso com "kg" é aceito; +80 não aparece se já contou no mês
{ const { ctx, p } = await nova(); await login(p); await p.click('.tabs [data-go="evolucao"]'); await espera(p, 600);
  await p.click('#add'); await espera(p); await p.fill('#pk', '72,5 kg'); await p.click('#s'); await espera(p, 700);
  const pe = await txt(p, '.view'); ok(/72,5/.test(pe), 'peso "72,5 kg" salvo e mostrado com vírgula'); await shot(p, 'evolucao');
  ok(/Minhas cargas/i.test(pe), 'Evolução tem "Minhas cargas"'); await ctx.close(); }

// 6. Fila offline não duplica com a internet voltando 2x; programa extra não muda o treino de hoje
{ const { ctx, p } = await nova(); await login(p);
  const antes = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).sessoes.filter(s => s.finalizada_em).length);
  await p.evaluate(() => localStorage.setItem('demo:fila', JSON.stringify([{ uid: 'x1', s: { titulo: 'Abdômen 10 min · Abdômen 1', total: 3 }, series: [], patch: { duracao_s: 600, exercicios_feitos: 3, esforco: 6, nota: 8, finalizada_em: new Date().toISOString() } }])));
  await p.evaluate(() => { dispatchEvent(new Event('online')); dispatchEvent(new Event('online')); }); await espera(p, 1500);
  const depois = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).sessoes.filter(s => s.finalizada_em).length);
  ok(depois === antes + 1, `treino offline enviado 1 vez só (${antes}→${depois})`);
  await p.click('.tabs [data-go="home"]'); await espera(p, 600); if (await p.$('#semPula')) { await p.click('#semPula'); await espera(p, 500); } /* segunda-feira: pergunta da semana */ ok(/Treino B/i.test(await txt(p, '.card.hero')), 'programa extra não muda o "Treino de hoje"');
  await p.goBack(); await espera(p, 600); ok(!/Sou nova/.test(await txt(p, 'body')), 'voltar do celular logada não cai na tela de entrada');
  await ctx.close(); }

// 7. Story: sem compartilhar, avisa onde ficou a imagem; exercício "cada lado" de tempo conta 2x
{ const { ctx, p } = await nova(); await login(p); await abrirTreinoA(p);
  ok(/1.min cada lado/i.test(await p.innerText('.rest.tm')), 'mobilidade "1 min cada lado" mostra "1 min cada lado" (não 2×1:00)');
  await p.click('#sw'); await espera(p, 300); await p.click('#q-s'); await espera(p, 800); await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500);
  await p.click('#esf button >> nth=5'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900);
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.click('#share'); await dl; await espera(p, 700);
  ok(/Downloads|Galeria/.test(await p.innerText('#toast')), 'story sem compartilhar diz onde a imagem ficou'); await shot(p, 'story');
  await ctx.close(); }

console.log('erros de página:', errs); await b.close();
if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); }
console.log('tudo ok');
