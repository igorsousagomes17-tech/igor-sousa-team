// Rodada 14/11 (Júlia, Carla, Márcia, Renata, Bia): W=360 OUT=/tmp node tests/rodada-1411.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 360);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHOU ') + m); if (!c) errs.push(m); };
async function nova({ w = W, h = 780, locale = 'pt-BR' } = {}) {
  const ctx = await b.newContext({ locale, timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f.split('?')[0] }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const w = (p, ms = 400) => p.waitForTimeout(ms);
let n = 0; const shot = (p, t) => p.screenshot({ path: `${D}/1411-${String(++n).padStart(2, '0')}-${t}.png` });
const entrar = async (p, email = 'ana@demo.com') => { await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await w(p, 1000); };
const treino = async (p, l) => { await p.click('.tabs [data-go="treino"]'); await w(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await w(p); await p.click('#ini'); await w(p, 700); if (await p.locator('#m [data-o]').count()) { await p.locator('#m [data-o]').last().click(); await w(p, 500); } };
const sess = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao') || 'null'));
const mudaSess = (p, fn) => p.evaluate(f => { const s = JSON.parse(localStorage.getItem('demo:sessao')); new Function('s', f)(s); localStorage.setItem('demo:sessao', JSON.stringify(s)); }, fn);
const estado = (p, fn) => p.evaluate(f => { const s = JSON.parse(localStorage.getItem('demo:state')); new Function('s', f)(s); localStorage.setItem('demo:state', JSON.stringify(s)); }, fn);

// 1. Carla: pirâmide sem sinal usa as séries guardadas; kg com 2 vírgulas; última da série visível ao digitar; "Descartar" sem destaque
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A'); await p.click('#pular'); await w(p, 500);
  await mudaSess(p, 's.exs[1].porSerie = null'); await p.reload(); await w(p, 1200);
  const ph = await p.getAttribute('.set[data-i="1"][data-k="1"] input[data-f="kg"]', 'placeholder'); ok(ph === '25', `pirâmide sem a resposta do servidor: série 2 sugere 25 das séries guardadas (${ph})`);
  await p.fill('.set[data-i="1"][data-k="0"] input[data-f="kg"]', '22,5,5'); await w(p, 200); ok(await p.inputValue('.set[data-i="1"][data-k="0"] input[data-f="kg"]') === '22,5', 'kg "22,5,5" vira "22,5" (uma vírgula só)');
  ok(await p.locator('.set[data-i="1"][data-k="0"] + .ult-serie').count() === 1, 'digitando: "última vez" da série continua visível embaixo');
  await shot(p, 'piramide');
  // Leg Press (10-12): ✓ sem digitar grava e avisa
  const lp = (await sess(p)).exs.findIndex(e => /Leg Press/.test(e.nome)); await p.click(`[data-passo] >> nth=${(await sess(p)).passos.findIndex(g => g.includes(lp))}`); await w(p, 500);
  await p.click(`.set[data-i="${lp}"][data-k="0"] .rest`); await w(p, 600); ok(/Gravei 10 reps/.test(await p.innerText('#toast')), 'faixa 10-12: ✓ sem digitar avisa "Gravei 10 reps. Fez mais?"');
  if (await p.$('#rest-x')) await p.click('#rest-x'); await w(p, 300);
  await p.click('#sair'); await w(p, 600); await p.click('#desc'); await w(p, 300);
  ok(/manter/i.test(await p.innerText('#q-s')) && /descartar/i.test(await p.innerText('#q-n')), 'Descartar treino: "Manter" em destaque, "Descartar" embaixo');
  await p.click('#q-s'); await w(p, 400); ok(!!(await sess(p)), 'tocar no destaque (Manter) não apaga o treino'); await ctx.close(); }

// 2. Júlia: dica do Goblet sem "anilhas"; dica do ⏱ volta no Leg Press; "Trocado só hoje" com voltar à vista; timer "Pausar tempo"
{ const { ctx, p } = await nova({ w: 390, h: 844 }); await entrar(p);
  await estado(p, 's.series = []'); await p.evaluate(() => localStorage.removeItem('demo:cargas')); await p.reload(); await w(p, 1000);
  await treino(p, 'A');
  await p.click('.rest.tm'); await w(p, 700); ok(/pausar tempo/i.test(await p.innerText('#rest-pausa')) && /sair e pausar o treino/i.test(await p.innerText('#rest-pt')), 'timer: "Pausar tempo" e "Sair e pausar o treino" (antes "Parar" e "Pausar treino")');
  await shot(p, 'timer'); await p.click('#rest-skip'); await w(p, 500); if (await p.$('#q-s')) { await p.click('#q-s'); await w(p, 600); }
  await p.fill('.set[data-i="1"][data-k="0"] input[data-f="kg"]', '20'); await p.click('.set[data-i="1"][data-k="0"] .rest'); await w(p, 600);
  const a2 = await p.innerText('.bloco[data-i="2"]').catch(() => ''); ok(!/soma das anilhas/.test(a2), 'Goblet com anilha no calcanhar: não manda somar anilhas');
  const lp = (await sess(p)).exs.findIndex(e => /Leg Press/.test(e.nome)); await p.click(`[data-passo] >> nth=${(await sess(p)).passos.findIndex(g => g.includes(lp))}`); await w(p, 500);
  ok(/Toca no ⏱ da linha/.test(await p.innerText('.restHint').catch(() => '')), 'Leg Press depois do bi-set: dica do ⏱ ainda aparece');
  await p.evaluate(() => document.querySelectorAll('details.mais').forEach(d => d.open = true));
  const ocup = p.locator('.ocup'); if (await ocup.count()) { await ocup.first().click(); await w(p, 400); await p.click('#m [data-o="0"]'); await w(p, 700); }
  else { await p.click('.swap'); await w(p, 700); }
  ok(await p.locator('.trocado-hoje .swap').isVisible(), 'trocou: "Trocado só hoje · ↺ Voltar pro…" à vista, fora do Dica e opções'); await shot(p, 'trocado');
  await p.click('.trocado-hoje .swap'); await w(p, 600); ok(/LEG PRESS/i.test(await p.innerText('.bloco h1')), 'voltar pro original funciona');
  await ctx.close(); }

// 3. HIIT de 35 s não conta como feito; chip do opcional ♥ (não "+") e todos cabem em uma linha
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A');
  const s0 = await sess(p), h = s0.exs.findIndex(e => /hiit/i.test(e.nome));
  if (h >= 0) { await mudaSess(p, `s.sets[${h}] = s.sets[${h}] || [{kg:'',reps:''}]; s.sets[${h}][0] = { ...s.sets[${h}][0], done: true, seg: 35 }`); await p.reload(); await w(p, 1200);
    const chip = await p.$eval(`[data-passo]:last-child`, e => e.className + '|' + e.textContent); ok(!/\bok\b/.test(chip) && /♥/.test(chip) && /chopc/.test(chip), `HIIT 0:35 de 20:00 não fica ✓ e o chip é ♥ tracejado (${chip})`); }
  const tops = await p.$$eval('[data-passo]', l => [...new Set(l.map(e => Math.round(e.getBoundingClientRect().top)))]); ok(tops.length === 1, `chips dos exercícios numa linha só em ${W}px (${tops.length})`);
  // "Boa! 0 de 7" só com exercício completo (Márcia marcou 1 série e encerrou)
  await p.click('[data-passo="1"]'); await w(p, 400); await p.fill('.set[data-i="1"][data-k="0"] input[data-f="kg"]', '20'); await p.click('.set[data-i="1"][data-k="0"] .rest'); await w(p, 500); if (await p.$('#m #q-n')) { await p.click('#m #q-n'); await w(p, 300); }
  await p.click('#fim'); await w(p, 400); await p.click('#enc'); await w(p, 600); const h1 = await p.innerText('h1'); ok(!/^Boa/i.test(h1), `fim sem exercício completo não diz "Boa!" (${h1})`); await shot(p, 'fim-0'); await ctx.close(); }

// 4. Renata: recado do Igor no treino em que vale; véu da pausa de 10 min; descanso pausado 25 min não volta
{ const T0 = new Date('2026-11-16T09:00:00-03:00').getTime(); const { ctx, p } = await nova(); await ctx.clock.install({ time: T0 }); await entrar(p);
  await treino(p, 'B'); ok(/Do Igor sobre o último Treino B/.test(await p.innerText('.view')), 'Treino B mostra o último recado do Igor sobre o Treino B'); await shot(p, 'recado');
  await p.click('#recOk'); await w(p, 300); ok(!(await p.$('.recado-igor')), 'recado fecha no ✕');
  await ctx.close(); }
{ const T0 = new Date('2026-11-16T09:00:00-03:00').getTime(); const { ctx, p } = await nova(); await ctx.clock.install({ time: T0 }); await entrar(p); await treino(p, 'C');
  const j = await p.$$eval('[data-passo]', bs => bs.findIndex(x => /crucifixo/i.test(x.getAttribute('aria-label') || ''))); await p.click(`[data-passo="${j}"]`); await w(p, 500);
  await p.click('.set[data-k="0"] .rest'); await w(p, 700);
  if (await p.$('#m #q-s')) { await p.click('#m #q-s'); await w(p, 500); }
  await p.click('#rest-pt'); await w(p, 600); await p.clock.fastForward('25:00'); await w(p, 300);
  await p.click('[data-go="sessao"]'); await w(p, 900); ok(!(await p.$('#rest.on, #rest:not(.mini) #rest-p')) && !((await sess(p)).descansoAte > Date.now() + 1000 * 0), 'pausa de 25 min no descanso: volta sem descanso pendurado');
  const av = await p.innerText('#toast'); ok(/Pausa de 25\smin/i.test(av), `aviso fala "Pausa de 25 min" (foi ela que pausou) [${av}]`); await ctx.close(); }

// 5. Márcia: Aa na entrada/login; erro de senha em "letras ou números"; tema claro com erro legível; anamnese com "mais opções"; revisão sem "Confere"
{ const { ctx, p } = await nova(); await p.goto('http://app.local/?demo'); await w(p, 600);
  ok(!!(await p.$('.topo-bts [data-aa]')), 'entrada tem o botão "Aa"'); await p.click('[data-aa]'); await w(p, 300);
  ok(await p.evaluate(() => document.documentElement.classList.contains('letra-g')), 'Aa aumenta a letra (Grande)'); await shot(p, 'entrada-aa');
  await p.click('[data-aa]'); await p.click('[data-aa]'); await w(p, 200);
  await p.click('text=ENTRAR'); await w(p, 300); ok(!!(await p.$('.topbar [data-aa]')), 'login também tem "Aa"');
  await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await w(p, 1000);
  await estado(p, 's.perfil.senha_trocada = false'); await p.reload(); await w(p, 1200);
  await p.fill('#n1', '12345'); await p.fill('#n2', '12345'); await p.click('#s'); await w(p, 400);
  ok(/6 letras ou números \(você digitou 5\)/.test(await p.innerText('#e')), '1º acesso: erro fala "letras ou números (você digitou 5)"');
  await p.evaluate(() => { localStorage.setItem('tema', '"claro"'); window.aplicarTema(); }); await w(p, 200);
  const cor = await p.$eval('#e', e => getComputedStyle(e).color); ok(cor === 'rgb(179, 38, 30)', `tema claro: erro em vermelho escuro (${cor})`); await shot(p, 'senha-claro');
  await p.evaluate(() => { localStorage.setItem('tema', '"escuro"'); window.aplicarTema(); });
  await estado(p, 's.perfil.senha_trocada = true'); await p.reload(); await w(p, 1200);
  await p.click('.tabs [data-go="perfil"]'); await w(p, 700); ok(/Num dia sem treino, seu corpo gasta/.test(await p.innerText('.view')) || !/calorias por dia/.test(await p.innerText('.view')), 'Perfil: gasto do dia sem treino com o rótulo certo');
  await p.click('#ed'); await w(p, 600); ok(!/\bConfere\b/.test(await p.innerText('#m')), 'revisão da ficha sem o selo "Confere"');
  const lin = p.locator('[data-j]').filter({ hasText: 'Alguma dessas se aplica' }); if (await lin.count()) { await lin.first().click(); await w(p, 600);
    const pill = await p.$('.maisops'); ok(!!pill && await pill.isVisible(), 'pergunta de saúde: "↓ mais opções" quando tem opção atrás do rodapé'); await shot(p, 'saude-mais'); }
  await ctx.close(); }

// 6. Painel do Igor: Responder mostra as cargas dela
{ const { ctx, p } = await nova({ w: 390 }); await entrar(p); await treino(p, 'A'); await p.click('#pular'); await w(p, 400);
  await p.fill('.set[data-i="1"][data-k="0"] input[data-f="kg"]', '20'); await p.click('.set[data-i="1"][data-k="0"] .rest'); await w(p, 500);
  await p.click('#fim'); await w(p, 400); await p.click('#enc'); await w(p, 500); await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.fill('#fb', 'senti o smith').catch(() => {}); await p.click('#env'); await w(p, 900);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.logado = false; localStorage.setItem('demo:state', JSON.stringify(s)); });
  await entrar(p, 'igor@demo.com'); await w(p, 800);
  if (await p.$('#a-fb')) { await p.click('#a-fb'); await w(p, 600); } else if (await p.$('#t-fb')) { await p.click('#t-fb'); await w(p, 600); }
  const sid = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).sessoes.find(x => x.titulo === 'Treino A' && x.finalizada_em)?.id);
  const r = p.locator(`[data-resp="${sid}"]`).first(); if (await r.count()) { await r.click(); await w(p, 700); await p.click('#sers summary'); await w(p, 400);
    { const sl = await p.innerText('#sersL'); ok(/kg ×/.test(sl), `Responder: "Ver as cargas dela" lista kg × reps [${sl.slice(0, 80)}]`); }; await shot(p, 'painel-cargas'); }
  else ok(false, 'painel: achei o Responder');
  await ctx.close(); }

// 7. Bia: busca "casa" sem máquina; Vídeos fala "antes de treinar" pra quem é de casa; água com "hoje"; i18n só baixa o idioma dela
{ const { ctx, p } = await nova(); const pedidos = []; p.on('request', r => pedidos.push(new URL(r.url()).pathname)); await entrar(p);
  ok(!pedidos.some(x => /\/js\/i18n\/\w+\.js/.test(x)), 'português: nenhum arquivo de tradução baixado');
  await estado(p, "s.perfil.local_treino = 'casa'"); await p.reload(); await w(p, 1200);
  await p.click('.tabs [data-go="videos"]'); await w(p, 900); ok(/antes de treinar/.test(await p.innerText('.view')), 'Vídeos de quem treina em casa: "antes de treinar"');
  const q = await p.$('#q, input[type="search"]'); if (q) { await q.fill('casa'); await w(p, 600); const prim = await p.locator('.ex .t b, .ex b').first().innerText().catch(() => ''); ok(!/m[aá]quina|banco|polia|smith/i.test(prim), `busca "casa": 1º resultado sem aparelho (${prim})`); }
  await p.click('.tabs [data-go="home"]'); await w(p, 700); if (await p.$('#agua')) ok(/hoje/i.test(await p.innerText('#agua')), 'água: dia de hoje escrito'); await ctx.close(); }
{ const { ctx, p } = await nova({ locale: 'en-US' }); const pedidos = []; p.on('request', r => pedidos.push(new URL(r.url()).pathname)); await p.goto('http://app.local/?demo'); await w(p, 900);
  ok(pedidos.includes('/js/i18n/en.js') && !pedidos.includes('/js/i18n/fr.js'), 'inglês: baixa só o en.js'); ok(/Log in|Sign in|LOG IN/i.test(await p.innerText('body')), 'inglês: entrada traduzida'); await ctx.close(); }

console.log(errs.length ? `\n${errs.length} FALHA(S)` : '\ntudo certo'); await b.close(); process.exit(errs.length ? 1 : 0);
