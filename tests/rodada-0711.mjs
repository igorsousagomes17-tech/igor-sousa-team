// Rodada 07/11 (Júlia, Carla, Márcia, Renata, Bia): W=360 OUT=/tmp node tests/rodada-0711.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 360);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHOU ') + m); if (!c) errs.push(m); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
async function nova({ w = W, h = 780, android = false } = {}) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: true, isMobile: true, ...(android ? { userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-A105M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' } : {}) });
  const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f.split('?')[0] }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const w = (p, ms = 400) => p.waitForTimeout(ms);
let n = 0; const shot = (p, t) => p.screenshot({ path: `${D}/0711-${String(++n).padStart(2, '0')}-${t}.png` });
const entrar = async (p, email = 'ana@demo.com', senha) => { await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', email); if (senha) await p.fill('#pw', senha); await p.press('#pw', 'Enter'); await w(p, 1000); };
const treino = async (p, l) => { await p.click('.tabs [data-go="treino"]'); await w(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await w(p); await p.click('#ini'); await w(p, 700); if (await p.locator('#m [data-o]').count()) { await p.locator('#m [data-o]').last().click(); await w(p, 500); } };
const sess = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao') || 'null'));
const pularMob = async p => { await p.click('#pular'); await w(p, 400); }; // mobilidade → bi-set (Smith A1 + Goblet A2)

// 1. Bi-set: toque duplo no "✓ → A2" não marca o A2; Enter das reps do A1 vai pro kg do A2; abas com "sua vez"
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A'); await pularMob(p);
  await p.evaluate(() => new Promise(r => { document.querySelector('.set[data-i="1"][data-k="0"] .rest').click(); setTimeout(() => { document.querySelector('.set[data-i="2"][data-k="0"] .rest')?.click(); r(); }, 150); })); await w(p, 600); // 2º toque 150 ms depois, no mesmo lugar (o ✓ do A2 que deslizou pra baixo do dedo)
  const s1 = await sess(p); ok(s1.sets[1][0].done && !s1.sets[2][0].done && !(await p.$('#rest:not(.mini) #rest-p')), 'toque duplo: o 2º toque (150 ms) não marca o A2 nem abre descanso');
  await shot(p, 'biset-a2');
  await p.click('[data-biv="1"]'); await w(p, 400); ok(/sua vez/i.test(await p.innerText('.bitabs')), 'espiando o A1: a aba do A2 diz "sua vez"');
  await p.fill('.set[data-i="1"][data-k="1"] input[data-f="kg"]', '25'); await p.press('.set[data-i="1"][data-k="1"] input[data-f="kg"]', 'Enter'); await p.press('.set[data-i="1"][data-k="1"] input[data-f="reps"]', 'Enter'); await w(p, 500);
  ok(await p.evaluate(() => { const a = document.activeElement; return a?.closest('.set')?.dataset.i === '2' && a.closest('.set').dataset.k === '1' && a.dataset.f === 'kg'; }), 'Enter nas reps do A1 série 2 vai pro kg do A2 série 2');
  // − série tira dos dois
  await p.click('[data-mais] >> nth=0'); await w(p, 300); const nA = (await sess(p)).sets[1].length; await p.click('[data-menos] >> nth=0'); await w(p, 300); const s2 = await sess(p);
  ok(nA === 4 && s2.sets[1].length === 3 && s2.sets[2].length === 3, '− série no bi-set tira do A1 e do A2 juntos');
  await ctx.close(); }

// 2. Começou pelo A2: sem descanso no meio do par; fechou o par → descanso
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A'); await pularMob(p);
  await p.click('[data-biv="2"]'); await w(p, 400); await p.click('.set[data-i="2"][data-k="0"] .rest'); await w(p, 700);
  ok(!(await p.$('#rest:not(.mini) #rest-p')), 'A2 primeiro: não abre descanso no meio do par');
  await p.click('.set[data-i="1"][data-k="0"] .rest'); await w(p, 800);
  ok(!!(await p.$('#rest:not(.mini) #rest-p')), 'A1 depois: o par fechou e o descanso abre');
  await ctx.close(); }

// 3. Reps absurdas perguntam; encerrar com < 10 min diz que não pontua
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A'); await pularMob(p); await p.click('#pular'); await w(p, 400); // Leg press (sem bi-set)
  const i = await p.$eval('.bloco', b => b.dataset.i); await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="kg"]`, '40'); await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="reps"]`, '1120'); const limpa = async () => { await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="reps"]`, ''); await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="kg"]`, ''); };
  await p.click(`.set[data-i="${i}"][data-k="0"] .rest`); await w(p, 500); ok(/Confere as repeti/i.test(await p.innerText('#overlay')), '"1120" repetições pergunta antes de marcar');
  await p.click('#q-s'); await w(p, 300); ok(!(await sess(p)).sets[i][0].done, '"Corrigir" não marca a série');
  await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="reps"]`, '10'); await p.click(`.set[data-i="${i}"][data-k="0"] .rest`); await w(p, 600); if (await p.$('#rest-skip')) { await p.click('#rest-skip'); await w(p, 400); }
  await p.click('#fim'); await w(p, 500); const tx = await p.innerText('#overlay'); ok(/menos de 10\s*min não pontua/i.test(tx) && !/ganha pontos pelo que fez/.test(tx), `encerrar cedo diz que não pontua (${tx.replace(/\s+/g, ' ').slice(30, 200)})`);
  await shot(p, 'encerrar'); await ctx.close(); }

// 4. Pontos: incompleto aparece como "Treino (3 de 7)"; regras com o proporcional e o presencial; Início não diz "feito ✓"
{ const { ctx, p } = await nova(); await entrar(p);
  await p.evaluate(async () => { const db = await import('/js/db-mock.js'); const s = await db.iniciarSessao('x', { titulo: 'Treino A', total: 7 }); await db.finalizarSessao(s.id, { exercicios_feitos: 4, exercicios_total: 7, duracao_s: 900 }); });
  await p.click('.tabs [data-go="pontos"]'); await w(p, 900); const v = await p.innerText('.view');
  ok(/Treino \(4 de 7\)/.test(v), 'histórico: "Treino (4 de 7)" em vez de "Treino completo"'); ok(/Treino presencial com o Igor/.test(v) && /3 de 7 = \+20/.test(v), 'como ganhar: proporcional e presencial');
  await shot(p, 'pontos');
  await p.click('.tabs [data-go="home"]'); await w(p, 900); const h = await p.innerText('.view');
  ok(!/Treino de hoje feito/.test(h) && /registrado \(4 de 7\)/.test(h), 'Início: treino pela metade não vira "feito ✓"');
  await ctx.close(); }

// 5. Presencial: explica o botão apagado; sem sinal guarda a foto e manda depois
{ const { ctx, p } = await nova(); await entrar(p); await p.click('.tabs [data-go="treino"]'); await w(p); await p.click('#presencial'); await w(p, 400);
  ok(/Primeiro tira a foto/.test(await p.innerText('#pAviso')), 'presencial: diz por que o Registrar está apagado');
  await p.setInputFiles('#pFoto', { name: 'a.png', mimeType: 'image/png', buffer: PNG }); await w(p, 600);
  await ctx.setOffline(true); await p.click('#pOk'); await w(p, 900);
  ok(/#card/.test(p.url()) && /internet voltar/i.test(await p.innerText('.view')), 'sem sinal: registra no card com "pontos quando a internet voltar"');
  ok(await p.evaluate(() => (JSON.parse(localStorage.getItem('demo:fila') || '[]')).some(x => x.tipo === 'presencial')), 'foto do presencial na fila');
  await ctx.setOffline(false); await p.evaluate(() => dispatchEvent(new Event('online'))); await w(p, 2500);
  ok(await p.evaluate(() => !(JSON.parse(localStorage.getItem('demo:fila') || '[]')).some(x => x.tipo === 'presencial')), 'voltou o sinal: o presencial subiu sozinho');
  await ctx.close(); }

// 6. Login: senha errada 2x oferece "Esqueci" em destaque e WhatsApp; servidor bloqueado não culpa a senha
{ const { ctx, p } = await nova(); await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR');
  await p.fill('#pw', 'errada'); await p.press('#pw', 'Enter'); await w(p, 700); await p.press('#pw', 'Enter'); await w(p, 700);
  ok(/ainda não confere/.test(await p.innerText('#err')) && !(await p.getAttribute('#esq', 'class')).includes('ghost') && !!(await p.$('#zapIgor')), 'senha errada 2x: "Esqueci" em destaque e WhatsApp do Igor');
  await p.fill('#pw', 'limite'); await p.press('#pw', 'Enter'); await w(p, 700); ok(/Muitas tentativas/.test(await p.innerText('#err')), 'bloqueio do servidor: "muitas tentativas", não "senha errada"');
  await shot(p, 'login'); await ctx.close(); }

// 7. Letra grande no Perfil; abas com nome inteiro
{ const { ctx, p } = await nova(); await entrar(p); await p.click('.tabs [data-go="perfil"]'); await w(p, 700);
  await p.click('[data-letra="gg"]'); await w(p, 400); ok(await p.evaluate(() => document.documentElement.classList.contains('letra-gg')), 'Perfil: "Maior" aumenta a letra do app');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'letra maior não estoura a tela'); await shot(p, 'letra');
  await p.reload(); await w(p, 1000); ok(await p.evaluate(() => document.documentElement.classList.contains('letra-gg')), 'letra escolhida continua depois de reabrir');
  await p.click('.tabs [data-go="treino"]').catch(() => {}); await w(p); await p.click('[data-go="treino"][data-arg="A"]'); await w(p); await p.click('#ini'); await w(p, 700); await pularMob(p);
  ok(await p.$$eval('.bitab b', bs => bs.every(b => b.scrollHeight <= b.clientHeight + 6)), 'abas A1/A2 com o nome inteiro (até 3 linhas, sem cortar)'); await shot(p, 'biset-letra');
  await p.click('[data-letra]').catch(() => {}); await p.evaluate(() => localStorage.removeItem('isteam:letra')); await ctx.close(); }

// 8. Vídeos: trocar exercício troca o vídeo; aba Vídeos separa vídeo do Igor de animação; lista do bi-set sem "descanso" no A1
{ const { ctx, p } = await nova(); await entrar(p); await p.click('.tabs [data-go="videos"]'); await w(p, 800);
  ok(/com vídeo do Igor/.test(await p.innerText('.view')) && !/já gravados/.test(await p.innerText('.view')), 'Vídeos: conta vídeo do Igor e animação separados');
  await p.click('.tabs [data-go="treino"]'); await w(p); await p.click('[data-go="treino"][data-arg="A"]'); await w(p, 500);
  const l = await p.$$eval('.ex .t > span:first-of-type', s => s.slice(1, 3).map(x => x.textContent)); ok(!/descanso/.test(l[0]) && /depois do par/.test(l[1]), `lista: A1 sem descanso, A2 "descanso depois do par" (${l.join(' | ').slice(0, 120)})`);
  await p.click('#ini'); await w(p, 700); await pularMob(p);
  const s0 = await sess(p), i = s0.exs.findIndex(e => e.alternativa); const v0 = s0.exs[i].video_url;
  if (i >= 0) { if (s0.passos[s0.p].includes(i) || true) { await p.evaluate(j => { const s = JSON.parse(localStorage.getItem('demo:sessao')); const k = s.passos.findIndex(g => g.includes(j)); s.p = k; s.biVer = j; localStorage.setItem('demo:sessao', JSON.stringify(s)); }, i); await p.reload(); await w(p, 1200); }
    await p.evaluate(() => document.querySelectorAll('details.mais').forEach(d => d.open = true)); await p.click(`.swap[data-i="${i}"]`); await w(p, 600); const s1 = await sess(p);
    ok(s1.exs[i].video_url !== v0 || !v0, `trocar ${s0.exs[i].nome} → ${s1.exs[i].nome}: o vídeo acompanha (${v0} → ${s1.exs[i].video_url})`);
    await p.evaluate(() => document.querySelectorAll('details.mais').forEach(d => d.open = true)); await p.click(`.swap[data-i="${i}"]`); await w(p, 600); ok((await sess(p)).exs[i].video_url === v0, 'voltar pro original devolve o vídeo dele'); }
  await ctx.close(); }

// 9. Registro do mês com 1 foto só: o peso é salvo
{ const { ctx, p } = await nova(); await entrar(p);
  await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('demo:state')); const m = new Date().toISOString().slice(0, 7); st.evolucao = (st.evolucao || []).filter(e => !String(e.data).startsWith(m)); st.pontos = (st.pontos || []).filter(x => x.motivo !== 'evolucao'); localStorage.setItem('demo:state', JSON.stringify(st)); });
  await p.reload(); await w(p, 1000); await p.click('.tabs [data-go="evolucao"]'); await w(p, 800); await p.click('#add'); await w(p, 400);
  await p.setInputFiles('#f-frente', { name: 'a.png', mimeType: 'image/png', buffer: PNG }); await w(p, 300); await p.fill('#pk', '63,5'); await p.click('#s'); await w(p, 1500);
  const ev = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).evolucao || []);
  ok(ev.some(e => +e.peso_kg === 63.5), 'só a foto de frente + peso: o peso é salvo'); ok(/falta/i.test(await p.innerText('#toast')), `avisa as fotos que faltam (${(await p.innerText('#toast')).slice(0, 80)})`);
  await ctx.close(); }

// 10. Android: salvar a arte do story mostra um aviso só (figurinha), sem mandar escolher a imagem como fundo
{ const { ctx, p } = await nova({ android: true }); await entrar(p);
  await p.evaluate(() => { history.pushState({ name: 'card', arg: JSON.stringify({ titulo: 'Treino A', min: 40, seg: 2400, ex: 7, total: 7, series: 20, completo: true, kcal: 200 }) }, '', '#card'); dispatchEvent(new PopStateEvent('popstate', { state: history.state })); }); await w(p, 1500);
  const bt = await p.$('#arte, [data-arte], button:has-text("foto de fundo")'); if (bt) { await bt.click(); await w(p, 1500); }
  if (await p.$('#salvaArte')) { await p.click('#salvaArte'); await w(p, 2200); const tt = await p.innerText('#toast'); ok(/figurinha/.test(tt) && !/escolhe ela/.test(tt), `aviso da arte salva fala da figurinha (${tt.slice(0, 80)})`); ok(!(await p.getAttribute('#toast', 'class')).includes('topo'), 'aviso embaixo, sem cobrir a arte'); await shot(p, 'arte'); }
  else ok(false, 'abriu a tela da arte do story');
  await ctx.close(); }

console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'tudo ok'); await b.close(); if (errs.length) process.exit(1);
