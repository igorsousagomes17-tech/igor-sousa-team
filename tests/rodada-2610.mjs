// Testes das correções da rodada 26/10 (fila com dono, contagens, chave com séries pela metade, kg com texto, "Já fiz" cedo, feedback não enviado, foto que não abre, treino pela metade, painel). Uso: W=360 OUT=/tmp/shots node tests/rodada-2610.mjs
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

// 1. Fila com dono: treino de outra conta guardado no celular não sobe nesta; treino pausado fica com a dona ao sair
{ const { ctx, p } = await nova(); await login(p); const antes = (await st(p)).sessoes.length;
  await p.evaluate(() => localStorage.setItem('demo:fila', JSON.stringify([{ uid: 'x1', dono: 'outra-conta', s: { titulo: 'Treino A', total: 7 }, series: [], patch: { exercicios_feitos: 3, finalizada_em: new Date().toISOString() } }])));
  await p.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(p, 1500);
  ok((await st(p)).sessoes.length === antes && JSON.parse(await p.evaluate(() => localStorage.getItem('demo:fila'))).length === 1, 'treino de outra conta na fila não sobe nesta conta (e não some)');
  await abrirTreino(p, 'C'); await p.click('#pular'); await espera(p, 300); await p.click('.set[data-k="0"] .rest'); await espera(p, 500); await fecharDescanso(p); await p.click('#sair'); await espera(p, 500);
  await p.click('.tabs [data-go="perfil"]'); await espera(p, 800); await p.click('#out'); await espera(p, 400); await p.click('#q-n'); await espera(p, 800);
  ok(!(await p.evaluate(() => localStorage.getItem('demo:sessao'))) && !!(await p.evaluate(() => localStorage.getItem('demo:sessao@demo'))), 'sair guarda o treino pausado só pra dona');
  await login(p); ok(/Treino pausado|Continuar de onde parei/i.test(await txt(p, '.view')), 'entrou de novo: o treino pausado volta'); await ctx.close(); }

// 2. Pular tudo e tocar em "Já fiz" logo no começo do último (HIIT opcional): pergunta, e não fecha sem avisar que faltou
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A');
  while (await p.$('#pular')) { await p.click('#pular'); await espera(p, 250); }
  await p.click('.rest.tm'); await espera(p, 600); await p.click('#rest-skip'); await espera(p, 500);
  ok(/Já tinha feito/i.test(await txt(p, '#overlay')), '"Já fiz" com o cronômetro começando pergunta se já tinha feito'); await shot(p, 'ja-fiz-cedo');
  await p.click('#q-s'); await espera(p, 900);
  ok(/Faltam 7 exercícios/i.test(await txt(p, '#overlay')), 'último feito com os outros pulados: pop-up "Faltam 7" (não vai direto pro fim)'); await shot(p, 'faltam-7'); await ctx.close(); }

// 3. Contagem igual em todo lugar + chave com séries pela metade pergunta + "40kg" e "12+4+4"
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'B');
  ok(/0 de 7 exercícios feitos · 1 opcional/.test(await txt(p, '.view')), 'topo do treino: "0 de 7 · 1 opcional" (opcional não parece feito)');
  const kgSel = '.set[data-k="0"] input[data-f="kg"]';
  if (await p.$(kgSel)) { await p.fill(kgSel, '40kg'); ok(await p.inputValue(kgSel) === '40', '"40kg" vira 40 no campo'); }
  const rp = '.set[data-k="0"] input[data-f="reps"]'; if (await p.$(rp)) { await p.fill(rp, '12+4+4'); }
  await p.click('.set[data-k="0"] .rest'); await espera(p, 500); await fecharDescanso(p);
  await p.click('#sw'); await espera(p, 500); ok(/Falta marcar \d séries?/i.test(await txt(p, '#overlay')), 'chave com séries pela metade pergunta se fez todas'); await shot(p, 'chave-metade');
  await p.click('#m [data-o="0"]'); await espera(p, 800);
  const s = await sessao(p); ok(s.sets[0].every(x => x.done) && s.p === 1, '"Fiz todas" marca as que faltavam e segue');
  await p.click('#fim'); await espera(p); ok(/Faltam 6 exercícios/i.test(await txt(p, '#overlay')), 'pop-up conta como o topo (Faltam 6 com 1 de 7 feito)');
  await p.click('#enc'); await espera(p, 600); ok(/Treino incompleto \(1 de 7\)/i.test(await txt(p, '.view')) && /Só fica registrado quando você tocar em Enviar/i.test(await txt(p, '.view')), 'feedback pela metade: "Treino incompleto (1 de 7)" e avisa que falta tocar em Enviar');
  await p.click('#esf button >> nth=5'); await p.click('.tabs [data-go="home"]').catch(() => {}); await p.goto('http://app.local/?demo#home'); await espera(p, 1200);
  ok(/Falta enviar/i.test(await txt(p, '.view')), 'saiu do feedback sem enviar: Início avisa "Falta enviar"'); await shot(p, 'falta-enviar');
  await p.click('[data-go="fim"]'); await espera(p, 600); await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 1000);
  const ab = (await st(p)).series.filter(x => x.reps === 20); ok(ab.length >= 1, `reps "12+4+4" salvas como 20 (${ab.length})`); await ctx.close(); }

// 4. Treino parado bem no começo: Início oferece repetir (não diz "feito" nem pula pro próximo)
{ const { ctx, p } = await nova(); await login(p); const pts0 = (await st(p)).perfil.pontos; await abrirTreino(p, 'B'); await p.click('.set[data-k="0"] .rest'); await espera(p, 500); await fecharDescanso(p);
  await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500); await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900);
  ok(/Treino registrado/i.test(await txt(p, '.view')), 'card com nada completo diz "Treino registrado" (não "1 exercício")');
  ok(/incompleto: sem pontos/i.test(await txt(p, '.view')) && (await st(p)).perfil.pontos === pts0, 'só treino completo pontua: incompleto não ganha +50 (decisão do Igor)');
  await p.click('.topbar [data-go="home"]'); await espera(p, 900); const v = await txt(p, '.view');
  ok(/ficou pela metade|ficou só no começo/i.test(v) && /TREINO B/i.test(v) && !/Treino de hoje feito/i.test(v), 'Início oferece repetir o B'); await shot(p, 'repetir-b');
  await p.click('#seguirMeia'); await espera(p, 600); ok(/TREINO C/i.test(await txt(p, '.view')), '"seguir pro próximo" vai pro C'); await ctx.close(); }

// 5. Descanso: "Pular descanso" é o botão principal; lista de exercícios leva direto; +/− série
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'C'); await p.click('#pular'); await espera(p, 300); await p.click('.set[data-k="0"] .rest'); await espera(p, 500);
  ok(await p.$eval('#rest-skip', e => !e.classList.contains('ghost')) && await p.$eval('#rest-add', e => e.classList.contains('ghost')), '"Pular descanso" em destaque e +15s discreto');
  await p.click('#rest-skip'); await espera(p, 500);
  await p.click('[data-passo="3"]'); await espera(p, 500); ok((await sessao(p)).p === 3, 'lista no topo vai direto pro exercício 4');
  const n0 = (await sessao(p)).sets[(await sessao(p)).passos[3][0]].length; await p.click('[data-mais]'); await espera(p, 300);
  ok((await sessao(p)).sets[(await sessao(p)).passos[3][0]].length === n0 + 1, '"+ série" acrescenta uma série'); await ctx.close(); }

// 6. Foto que não abre avisa na hora; vídeo em gravação tem saída (IA); diário de treinos abre
{ const { ctx, p } = await nova(); await login(p); await p.click('.tabs [data-go="evolucao"]'); await espera(p, 800); await p.click('#add'); await espera(p, 500);
  await p.setInputFiles('#f-frente', { name: 'foto.heic', mimeType: 'image/heic', buffer: Buffer.from('nao e imagem') }); await espera(p, 600);
  ok(/não abriu/i.test(await txt(p, '#overlay')), 'foto que o celular não abre avisa na hora'); await p.click('#c'); await espera(p, 300);
  if (await p.$('[data-dia]')) { await p.click('[data-dia="0"]'); await espera(p, 600); ok(/Fechar/i.test(await txt(p, '#overlay')), 'Meus treinos abre o treino do dia'); await p.click('#c'); }
  await p.click('.tabs [data-go="treino"]'); await espera(p, 600); const info = await p.$('.play.info');
  ok(!!info, 'exercício sem vídeo mostra "i" (não promete vídeo)'); if (info) { await info.click(); await espera(p, 500); ok(/Tirar dúvida/i.test(await txt(p, '#overlay')), 'ficha sem vídeo oferece a IA'); }
  await ctx.close(); }

// 7. Story: compartilhar que falha (não foi ela que cancelou) baixa a imagem
{ const { ctx, p } = await nova(); await p.addInitScript(() => { navigator.canShare = () => true; navigator.share = async () => { const e = new Error('x'); e.name = 'NotAllowedError'; throw e; }; });
  await login(p); await abrirTreino(p, 'C'); await p.click('#sw'); await espera(p, 400); await p.click('#q-s'); await espera(p, 700); await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500); await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900);
  const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null); await p.click('#share'); ok(!!(await dl), 'compartilhar falhou: a imagem é baixada'); await ctx.close(); }

// 8. Painel: responder mostra o que ela escreveu; parou no meio aparece; ficha da anamnese
{ const { ctx, p } = await nova(); await login(p, 'igor@demo.com'); await espera(p, 600); await p.click('#a-fb'); await espera(p, 300);
  await p.click('[data-resp]'); await espera(p, 400); ok(/"/.test(await txt(p, '#overlay')) && /esforço/i.test(await txt(p, '#overlay')), 'Responder mostra o comentário e a nota dela'); await p.click('#c'); await espera(p, 300);
  await p.click('#volta'); await p.click('#t-ficha'); await espera(p, 300); ok(!!(await p.$('[data-ficha]')), 'aluna com anamnese tem botão "ficha"'); await p.click('[data-ficha]'); await espera(p, 400); ok(/Objetivo/i.test(await txt(p, '#overlay')), 'ficha mostra as respostas'); await shot(p, 'ficha');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= W, `painel não estoura ${W}px (${sw})`); await ctx.close(); }

console.log('erros de página:', errs); await b.close();
if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); } else console.log('tudo ok');
