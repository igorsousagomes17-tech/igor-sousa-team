// Testes das correções da rodada 24/10 (5 alunas críticas). Uso: W=360 OUT=/tmp/shots node tests/rodada-2410.mjs
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 375);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const falhas = [], errs = []; let n = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FALHOU ') + msg); if (!cond) falhas.push(msg); };
const rota = p => p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
async function nova(t0) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: W, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); if (t0) await p.clock.install({ time: t0 });
  await rota(p); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const shot = (p, t) => p.screenshot({ path: `${D}/z${String(++n).padStart(2, '0')}-${t}.png` });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');
const estado = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')));
async function login(p, email = 'ana@demo.com') { await p.goto('http://app.local/?demo'); await espera(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await espera(p, 1000); }
async function abrirTreino(p, l = 'A') { await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await espera(p); await p.click('#ini'); await espera(p, 700); }
async function encerrar(p) { if (await p.$('#rest:not(.mini) #rest-x')) await p.click('#rest-x'); if (await p.$('#toast.on')) await p.click('#toast'); await p.click('#fim'); await espera(p); if (await p.$('#enc')) { await p.click('#enc'); await espera(p, 500); } await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900); }

// 1. Treino esquecido: "Registrar" → "Voltar pro treino" não vira 840 min e fica no dia em que ela parou; tem "Continuar"
{ const T = new Date('2026-10-23T19:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'B');
  await p.click('.set[data-k="0"] .rest'); await espera(p, 500); if (await p.$('#rest:not(.mini) #rest-x')) await p.click('#rest-x'); await p.click('#sair'); await espera(p, 500);
  await p.clock.fastForward('13:10:00'); await p.reload(); await espera(p, 1200);
  const ov = await p.innerText('#overlay'); ok(/Continuar o treino/i.test(ov), 'treino esquecido oferece "Continuar o treino"');
  await p.click('[data-o="0"]'); await espera(p, 600); await p.click('#volta'); await espera(p, 500);
  const rel = await p.innerText('#clock'); ok(/^\d:\d\d$/.test(rel), `voltar pro treino depois de registrar não soma a noite (${rel})`);
  await encerrar(p); const s = (await estado(p)).sessoes.find(x => x.titulo === 'Treino B' && x.duracao_s != null && x.esforco === 6);
  ok(s && s.duracao_s < 3600 && new Date(s.finalizada_em).getDate() === 23, `treino fica no dia em que ela parou (${s?.finalizada_em}, ${s?.duracao_s}s)`); await ctx.close(); }

// 2. Começar outro treino com um pausado: dá pra registrar o pausado (não some)
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A'); await p.click('#pular'); await espera(p);
  await p.click('.set[data-k="0"] .rest'); await espera(p, 500); await p.click('#sair'); await espera(p, 500);
  await p.click('[data-go="programa"][data-arg="abdomen"]'); await espera(p, 500); await p.click('[data-pt]'); await espera(p, 500);
  const ov = await p.innerText('#overlay'); ok(/Registrar .*e começar este|Voltar pra ele/i.test(ov) && /Treino A pela metade/i.test(ov) && /Descartar/.test(ov), 'pop-up oferece registrar / voltar / descartar'); await shot(p, 'pausado-3-opcoes');
  await p.click('#m [data-o]:has-text("Registrar")'); await espera(p, 900);
  const st = await estado(p); ok(st.sessoes.some(x => x.titulo === 'Treino A' && x.finalizada_em && x.exercicios_feitos >= 1 && new Date(x.finalizada_em).toDateString() === new Date().toDateString()), 'Treino A pausado foi registrado');
  ok(/Abdômen/i.test(await txt(p, '.view')), 'programa começou'); await ctx.close(); }

// 3. App escondido 40 min (criança chamou): não conta no tempo do treino
{ const T = new Date('2026-10-24T10:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'B');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis || 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__vis === 'hidden' }); window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.fastForward('40:00'); await p.evaluate(() => { window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); }); await espera(p, 600);
  const rel = await p.innerText('#clock'); ok(/^[0-2]:\d\d$/.test(rel), `40 min fora não contam (${rel})`); ok(/fora/i.test(await p.innerText('#toast')), 'avisa que não contou o tempo fora'); await ctx.close(); }

// 4. Treino às 22h30 do dia 31 não conta no desafio de novembro
{ const T = new Date('2026-10-31T22:30:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'B');
  await p.click('.set[data-k="0"] .rest'); await espera(p, 500); await encerrar(p);
  await p.clock.fastForward('10:30:00'); await p.goto('http://app.local/?demo#home'); await espera(p, 1200);
  const d = await p.innerText('.grid2 .card .big >> nth=0'); ok(/^0/.test(d.trim()), `desafio de novembro começa zerado (${d.replace(/\s+/g, '')})`);
  ok(/Batido! 🎉|Faltam/.test(await txt(p, '.grid2')), 'desafio não promete pontos que não entraram'); await ctx.close(); }

// 5. Duas abas no mesmo treino: nenhuma apaga a série da outra
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A'); await p.click('#pular'); await espera(p);
  const p2 = await ctx.newPage(); await rota(p2); await p2.goto('http://app.local/?demo#sessao'); await espera(p2, 1200);
  await p.click('.set[data-i="1"][data-k="0"] .rest'); await espera(p, 500);
  await p2.click('.set[data-i="1"][data-k="1"] .rest'); await espera(p2, 600);
  await p.click('.set[data-i="1"][data-k="2"] .rest'); await espera(p, 600);
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao')).sets[1].map(x => x.done));
  ok(s.every(Boolean), `as 3 séries ficaram marcadas (${s})`); await ctx.close(); }

// 6. Painel: responder vazio não "responde"
{ const { ctx, p } = await nova(); await login(p, 'igor@demo.com'); await espera(p, 600); await p.click('[data-resp] >> nth=0'); await espera(p); await p.click('#s'); await espera(p, 400);
  ok(await p.$('#t') !== null && /Escreve a resposta/i.test(await p.innerText('#toast')), 'resposta vazia é barrada'); await ctx.close(); }

// 7. Bi-set: ✓ sem digitar salva o número que aparece; carga absurda pergunta; toque duplo não desfaz; Início "treino de hoje feito"
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A'); await p.click('#pular'); await espera(p);
  await p.click('.set[data-i="1"][data-k="0"] .rest'); await espera(p, 400);
  ok(await p.inputValue('.set[data-i="1"][data-k="0"] input[data-f="kg"]') === '22', 'pirâmide: ✓ sem digitar grava a sugestão (22 kg) à vista');
  await p.dblclick('.set[data-i="1"][data-k="1"] .rest'); await espera(p, 500);
  ok(await p.$eval('.set[data-i="1"][data-k="1"]', e => e.classList.contains('done')), 'toque duplo não desmarca a série');
  await p.fill('.set[data-i="2"][data-k="0"] input[data-f="kg"]', '1122'); await p.click('.set[data-i="2"][data-k="0"] .rest'); await espera(p, 400);
  ok(/Confere a carga/i.test(await p.innerText('#overlay')), 'carga absurda (1122 kg) pergunta antes de salvar'); await shot(p, 'carga-absurda');
  await p.click('#q-n'); await espera(p, 300); ok(!(await p.$eval('.set[data-i="2"][data-k="0"]', e => e.classList.contains('done'))), '"Corrigir" não marca a série');
  await p.fill('.set[data-i="2"][data-k="0"] input[data-f="kg"]', '80'); await p.click('.set[data-i="2"][data-k="0"] .rest'); await espera(p, 600); if (await p.$('#rest-x')) await p.click('#rest-x');
  await encerrar(p); const st = await estado(p); const sm = st.series.filter(x => x.exercicio_nome === 'Agachamento Smith');
  ok(sm.length >= 2 && sm.every(x => x.kg != null), `séries da pirâmide salvas com kg (${sm.map(x => x.kg)})`);
  await p.click('.tabs [data-go="home"]'); await espera(p, 700); ok(/Treino de hoje feito|ficou pela metade/i.test(await txt(p, '.view')), 'Início mostra "Treino de hoje feito ✓" (ou, se parou bem no começo, oferece repetir)'); await shot(p, 'home-feito'); await ctx.close(); }

// 8. Prancha (tempo): depois da série abre o descanso
{ const { ctx, p } = await nova(); await login(p); await p.click('[data-go="programa"][data-arg="abdomen"]'); await espera(p, 500); await p.click('[data-pt]'); await espera(p, 700);
  await p.click('#pular'); await espera(p); await p.click('.set[data-k="0"] .rest.tm'); await espera(p, 400); await p.click('#rest-skip'); await espera(p, 600); if (await p.$('#q-s')) { await p.click('#q-s'); await espera(p, 600); }
  ok(/Descanso/i.test(await p.innerText('#rest-t').catch(() => '')), 'prancha 30s → descanso 20s abre'); await ctx.close(); }

// 9. Vídeo sem internet explica em vez da tela cinza; busca entende "bumbum"; ficha do exercício
{ const { ctx, p } = await nova(); await login(p); await ctx.setOffline(true);
  await p.evaluate(() => { const x = document.createElement('button'); x.dataset.vid = 'Agachamento'; x.dataset.url = 'https://youtu.be/abcdefghijk'; x.dataset.dica = 'desce devagar'; document.body.append(x); x.click(); }); await espera(p, 400);
  ok(/precisa de sinal/i.test(await p.innerText('#overlay')), 'vídeo sem sinal mostra aviso e a dica'); await shot(p, 'video-offline'); await p.click('#vm-close'); await ctx.setOffline(false);
  await p.click('.tabs [data-go="videos"]'); await espera(p, 500); await p.fill('#busca', 'bumbum'); await espera(p, 300); ok((await p.$$('#lv .vid')).length > 0, 'busca "bumbum" acha exercícios');
  await p.fill('#busca', 'barriga'); await espera(p, 300); ok((await p.$$('#lv .vid')).length > 0, 'busca "barriga" acha exercícios');
  await p.click('.tabs [data-go="treino"]'); await espera(p, 500); await p.click('[data-ficha="2"]'); await espera(p, 600);
  ok(/Ver como fazer|Tirar dúvida da execução/i.test(await p.innerText("#overlay")) && /Suas cargas/i.test(await p.innerText('#overlay')), 'tocar no exercício abre a ficha (como fazer + cargas)'); await shot(p, 'ficha'); await p.click('#hc');
  const bx = await p.$eval('#ini', e => e.getBoundingClientRect().bottom); ok(bx <= 800, `"Iniciar treino" visível sem rolar (${Math.round(bx)})`); await ctx.close(); }

// 10. Perfil: editar anamnese abre na revisão; Sair pergunta; Pontos diz quanto falta
{ const { ctx, p } = await nova(); await login(p); await p.click('.tabs [data-go="perfil"]'); await espera(p, 600);
  await p.click('#ed'); await espera(p, 400); ok(/Tá tudo certo/i.test(await p.innerText('#overlay')), 'editar anamnese abre na tela de conferir'); await shot(p, 'anamnese-revisao');
  await p.goBack(); await espera(p, 400); ok(!(await p.innerText('#overlay')).trim(), 'voltar do celular fecha a revisão');
  await p.click('#out'); await espera(p, 400); ok(/Sair do app/i.test(await p.innerText('#overlay')), 'Sair pergunta antes'); await p.click('#q-n'); await espera(p, 300);
  ok(/Perfil/i.test(await txt(p, '.view')), '"Ficar" continua logada');
  await p.click('.tabs [data-go="pontos"]'); await espera(p, 600); ok(/Faltam .* pts pra /i.test(await txt(p, '.view')) && !/print/i.test(await txt(p, '.view')), 'Pontos: quanto falta e sem contradição do print'); await shot(p, 'pontos'); await ctx.close(); }

// 11. Tira-dúvidas mostra a conversa guardada na hora; login: e-mail incompleto no "esqueci"
{ const { ctx, p } = await nova(); await login(p); await p.evaluate(() => localStorage.setItem('demo:chat', JSON.stringify([{ papel: 'user', texto: 'pergunta velha' }, { papel: 'assistant', texto: 'resposta velha' }])));
  await p.click('[data-go="assistente"]'); await espera(p, 150); ok(/resposta velha/.test(await txt(p, '#msgs')), 'conversa guardada aparece na hora');
  await p.click('.tabs [data-go="perfil"]'); await espera(p, 500); await p.click('#out'); await espera(p, 300); await p.click('#q-s'); await espera(p, 500);
  await p.click('text=ENTRAR'); await p.fill('#em', 'marcia@gmail'); await p.click('#esq'); await espera(p, 300);
  ok(/Confere o e-mail/i.test(await p.innerText('#err')), 'esqueci a senha com e-mail incompleto avisa embaixo do campo'); await shot(p, 'login'); await ctx.close(); }

console.log('erros de página:', errs); await b.close();
if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); }
console.log('tudo ok');
