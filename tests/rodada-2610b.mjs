// Testes da 2ª rodada de 26/10 (cronômetro pausado no Pausar, lado 1:00, card incompleto sem "feito" nem cardio, sequência só com treino completo, recorde só com a meta de reps, próxima série fora de ordem, anamnese que não apaga no Voltar, senha com espaço, aviso que deixa o toque passar, recomeçar do zero, contagens "de 7 · 1 opcional", voltar na aba Treino, feedback que diz o que falta, pausa sozinha com 10 min parado, Evolução com letra grande, story do resumo pontua). Uso: W=360 OUT=/tmp/shots node tests/rodada-2610b.mjs
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
const fecharDescanso = async p => { if (await p.$('#rest:not(.mini) #rest-x')) { await p.click('#rest-x'); await espera(p, 400); } };

const vis = (p, v) => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v ? 'visible' : 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: !v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);

// 1. Pausar o treino com o cronômetro rodando: não marca a série; no Continuar o cronômetro volta parado onde estava. "Cada lado" mostra 1:00.
{ const T = new Date('2026-10-26T09:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'A');
  await p.click('.rest.tm'); await espera(p, 500);
  ok(/^1:00$|^60$|^59$/.test((await txt(p, '#rest-n')).trim()) && /Lado 1 de 2/i.test(await txt(p, '#rest-t')), `"1 min cada lado" começa em 1:00 no lado 1 (${await txt(p, '#rest-n')})`);
  await p.clock.fastForward('00:20'); await espera(p, 400);
  await p.click('#rest-pausa'); await espera(p, 200); await p.clock.fastForward('03:00'); await espera(p, 300);
  await p.click('#rest-x'); await espera(p, 200); await p.click('#sair'); await espera(p, 600);
  let s = await sessao(p); ok(!s.sets[0][0].done, 'Pausar com o cronômetro parado no ⏸ não marca a série como feita');
  ok(/0 de 7/.test(await txt(p, '.card.hero')), `Início conta "0 de 7" (sem o opcional): ${(await txt(p, '.card.hero')).slice(0, 90)}`);
  await p.click('[data-go="sessao"]'); await espera(p, 700);
  ok(!!(await p.$('#rest')) && /Pausado/i.test(await txt(p, '#rest-t')), 'Continuar: o cronômetro volta parado onde estava');
  await p.click('#rest-pausa'); await espera(p, 300); ok(/Lado 1 de 2/i.test(await txt(p, '#rest-t')), 'retomar volta a dizer "Lado 1 de 2" (não fica "Pausado")'); await shot(p, 'cronometro-retomado');
  ok(/· 1 opcional/.test(await txt(p, '.view')), 'topo do treino: "0 de 7 exercícios feitos · 1 opcional"');
  // pausar o treino com o cronômetro rodando (sem ⏸): também congela
  await p.click('#rest-x'); await espera(p, 200); await p.click('#sair'); await espera(p, 500); s = await sessao(p);
  ok(!s.sets[0][0].done && s.trab?.congelado >= 15, `Pausar com o cronômetro rodando congela (${s.trab?.congelado}s), não registra`);
  await ctx.close(); }

// 2. Card de treino incompleto: "registrado", sem cardio, a sequência não sobe; recorde só com as reps da meta
{ const T = new Date('2026-10-26T09:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p);
  const fogo0 = await txt(p, '.topbar'); await abrirTreino(p, 'A');
  await p.click('#pular'); await espera(p, 300); // bi-set Smith (pirâmide) + Goblet
  // fora de ordem: Goblet (A2) antes do Smith (A1) → o descanso diz que a próxima é o Smith série 1
  await p.click('.set[data-i="2"][data-k="0"] .rest'); await espera(p, 600);
  ok(/Agachamento Smith · série 1/i.test(await txt(p, '#rest-p')), `marcou o A2 antes: descanso aponta a série 1 do Smith (${await txt(p, '#rest-p')})`);
  await fecharDescanso(p);
  for (const [k, kg, r] of [[0, '22', '12'], [1, '25', '10'], [2, '29', '3']]) { await p.fill(`.set[data-i="1"][data-k="${k}"] input[data-f="kg"]`, kg); await p.fill(`.set[data-i="1"][data-k="${k}"] input[data-f="reps"]`, r); await p.click(`.set[data-i="1"][data-k="${k}"] .rest`); await espera(p, 500); await fecharDescanso(p); }
  await terminar(p); const v = await txt(p, '.view');
  ok(/Treino registrado/i.test(v) && !/Treino feito/i.test(v), 'card incompleto diz "Treino registrado" (não "feito")');
  ok(!/cardio de 20 min/i.test(v), 'card incompleto não oferece cardio de 20 min');
  ok(!/Recorde/i.test(v), '29 kg × 3 (meta 8) não vira recorde');
  ok((v.match(/🔥\s*(\d+)/) || [])[1] === (fogo0.match(/(\d+)\s*SEMANAS/i) || [])[1], `sequência não sobe com treino incompleto (${fogo0} → ${(v.match(/🔥\s*\d+/) || [])[0]})`);
  await shot(p, 'card-incompleto'); await p.click('.tabs [data-go="treino"]'); await espera(p, 400); await p.click('[data-go="treino"][data-arg="A"]'); await espera(p, 900);
  const u = await txt(p, '.ult[data-n="Agachamento Smith"]'); ok(/25 kg × 10/.test(u), `"Última" do Smith é a série que bateu a meta, não 29 kg × 3 (${u})`);
  await ctx.close(); }

// 3. Anamnese: Voltar não apaga o que ela digitou; senha só com espaço é recusada
{ const { ctx, p } = await nova(); await login(p);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.objetivo = null; localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('demo:anamnese'); });
  await p.reload(); await espera(p, 1200); if (!(await p.$('#overlay #m')) && await p.$('#anam')) { await p.click('#anam'); await espera(p, 500); }
  let achou = false;
  for (let k = 0; k < 20 && !achou; k++) {
    if (await p.$('#tx') && (await p.getAttribute('#tx', 'type')) !== 'date') { await p.fill('#tx', 'joelho direito dói na escada'); await p.click('#prev'); await espera(p, 300); await p.click('#next'); await espera(p, 300); achou = (await p.inputValue('#tx').catch(() => '')) === 'joelho direito dói na escada'; break; }
    if (await p.$('#tx')) await p.fill('#tx', '1995-05-10'); if (await p.$('#pk')) { await p.fill('#pk', '64'); await p.fill('#al', '1,65'); }
    const op = await p.$('#ops button:not(.on)'); if (op && !(await p.$('#ops button.on'))) await op.click();
    await p.click('#next'); await espera(p, 300);
  }
  ok(achou, 'anamnese: texto da dor continua depois de Voltar e Próxima');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.senha_trocada = false; s.perfil.objetivo = 'hipertrofia'; localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('demo:anamnese'); });
  await p.reload(); await espera(p, 1200);
  if (await p.$('#n1')) { await p.fill('#n1', '      '); await p.fill('#n2', '      '); await p.click('#fs button[type="submit"], #fs .btn:not(.ghost)'); await espera(p, 400); ok(/espaço/i.test(await txt(p, '#e')), 'senha só com espaços é recusada'); ok((await p.getAttribute('#n1', 'autocapitalize')) === 'none', 'campo de senha sem maiúscula automática'); }
  else ok(false, '1º acesso (troca de senha) não abriu');
  await ctx.close(); }

// 4. Aviso deixa o toque passar; recomeçar do zero não grava treino pela metade; voltar na aba Treino sai da aba; feedback diz o que falta
{ const { ctx, p } = await nova(); await login(p);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('#toast')).pointerEvents === 'none'), 'aviso não "come" o toque do botão de baixo');
  await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click('[data-go="treino"][data-arg="B"]'); await espera(p); await p.click('[data-go="treino"][data-arg="C"]'); await espera(p);
  await p.goBack(); await espera(p, 600); ok(/BORA/i.test(await txt(p, '.view')), 'voltar do celular na aba Treino volta pro Início (não passa pelo B)');
  await abrirTreino(p, 'A'); await p.click('#pular'); await espera(p, 300); await p.click('.set[data-i="1"][data-k="0"] .rest'); await espera(p, 500); await fecharDescanso(p);
  await p.click('#sair'); await espera(p, 400); await p.click('.tabs [data-go="treino"]'); await espera(p); const antes = (await st(p)).sessoes.filter(x => x.finalizada_em).length;
  ok(/\(0\/7\)/.test(await txt(p, '.cta')), `botão Continuar conta "0/7" (${await txt(p, '.cta')})`);
  await p.click('#ini'); await espera(p, 400); ok(/Recomeçar do zero/i.test(await txt(p, '#overlay')) && !/Registrar/i.test(await txt(p, '#overlay')), 'recomeçar o mesmo treino só pergunta se apaga (não oferece registrar)');
  await p.click('#m [data-o="1"]'); await espera(p, 700); ok((await st(p)).sessoes.filter(x => x.finalizada_em).length === antes && !(await sessao(p)).sets[1][0].done, 'apagou e recomeçou sem gravar treino pela metade');
  await p.click('#fim'); await espera(p); await p.click('#volta'); await espera(p, 200);
  await p.click('.set[data-i="0"] .rest').catch(() => {}); await espera(p, 300); if (await p.$('#rest-skip')) { await p.click('#rest-skip'); await espera(p, 300); if (await p.$('#q-s')) await p.click('#q-s'); await espera(p, 400); }
  await p.click('#fim'); await espera(p); if (await p.$('#enc')) { await p.click('#enc'); await espera(p, 500); }
  ok(/sem pontos|não soma pontos/i.test(await txt(p, '.view')), 'feedback incompleto avisa dos pontos em destaque');
  await p.click('#esf button >> nth=6'); await p.click('#env'); await espera(p, 400); ok(/Falta a nota/i.test(await txt(p, '#e')), 'feedback diz qual escala falta ("Falta a nota")');
  await ctx.close(); }

// 5. Celular largado 10 min sem toque: pausa sozinho e o tempo parado não conta
{ const T = new Date('2026-10-26T09:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'C');
  await p.clock.fastForward('12:00'); await espera(p, 1500);
  ok(/Pausei seu treino/i.test(await txt(p, '#toast')) && /BORA/i.test(await txt(p, '.view')), '10 min parado: pausa sozinho e avisa');
  await p.click('[data-go="sessao"]'); await espera(p, 600); const rel = await txt(p, '#clock'); ok(+rel.split(':')[0] <= 3, `tempo parado não conta (${rel})`);
  // app escondido 4 min sem descanso: desconta o que passou de 2 min
  await vis(p, false); await p.clock.fastForward('04:00'); await vis(p, true); await espera(p, 400);
  ok(/tirei 2 min/i.test(await txt(p, '#toast')), `escondido 4 min: tira 2 min (${await txt(p, '#toast')})`);
  await ctx.close(); }

// 6. Evolução com letra grande em 300 px não estoura a tela; story do resumo da semana pontua
{ const { ctx, p } = await nova(null, 300); await login(p); await p.evaluate(() => { document.documentElement.style.fontSize = '130%'; });
  for (const aba of ['evolucao', 'pontos', 'perfil', 'treino', 'home']) { await p.click(`.tabs [data-go="${aba}"]`); await espera(p, 700); const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 300, `${aba} cabe em 300 px com letra 130% (${w})`); }
  ok(await p.evaluate(() => [...document.querySelectorAll('.tabs .tab span')].every(s => getComputedStyle(s).display !== 'none')), 'abas com nome embaixo em 300 px');
  await shot(p, 'evolucao-300'); await ctx.close(); }
{ const { ctx, p } = await nova(); await login(p); const pts0 = (await st(p)).perfil.pontos;
  await p.evaluate(() => { navigator.canShare = () => false; }); await p.click('#resumoSem'); await espera(p, 900);
  if (await p.$('#shSem')) { await p.click('#shSem'); await espera(p, 2500); ok((await st(p)).perfil.pontos === pts0 + 30, `story do resumo da semana dá +30 (${pts0}→${(await st(p)).perfil.pontos})`); } else ok(false, 'resumo sem botão de story');
  await ctx.close(); }

console.log('erros de página:', errs); await b.close(); if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); }
