// Testes das correções da rodada 25/10 (5 alunas críticas). Uso: W=360 OUT=/tmp/shots node tests/rodada-2510.mjs
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
const shot = (p, t) => p.screenshot({ path: `${D}/y${String(++n).padStart(2, '0')}-${t}.png` });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');
const sessao = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao')));
async function login(p, email = 'ana@demo.com') { await p.goto('http://app.local/?demo'); await espera(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await espera(p, 1000); }
async function abrirTreino(p, l = 'A') { await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await espera(p); await p.click('#ini'); await espera(p, 700); }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// 1. Toque duplo na chave "concluído" não pula o exercício seguinte
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'C');
  await p.click('#pular'); await espera(p, 300); // passo 2 = Supino (o bi-set Dead bug + Abs é o 1)
  await p.click('.set[data-k="0"] .rest'); await espera(p, 500); if (await p.$('#rest:not(.mini)')) await p.click('#rest-skip'); await espera(p, 300);
  const p0 = (await sessao(p)).p; await p.dblclick('#sw'); await espera(p, 500); if (await p.$('#m [data-o="1"]')) { await p.click('#m [data-o="1"]'); await espera(p, 700); } // série pela metade: "Só as que marquei"
  const s = await sessao(p); ok(s.p === p0 + 1 && !s.feito[3], `toque duplo na chave avança 1 exercício só (${p0}→${s.p})`);
  await ctx.close(); }

// 2. Voltar do celular no pop-up "pela metade" não trava o Iniciar
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'C');
  await p.click('#pular'); await espera(p, 300); await p.click('.set[data-k="0"] .rest'); await espera(p, 400); if (await p.$('#rest:not(.mini)')) await p.click('#rest-x'); await p.click('#sair'); await espera(p, 500);
  ok(/Treino pausado/.test(await p.innerText('#toast')), 'aviso "Treino pausado" aparece ao pausar');
  await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click('[data-go="treino"][data-arg="D"]'); await espera(p);
  const rot = await p.innerText('#ini'); await p.click('#ini'); await espera(p, 500);
  ok(/pela metade/i.test(await p.innerText('#overlay')), 'pop-up do treino pela metade abre');
  await p.goBack(); await espera(p, 600);
  ok(!(await p.innerText('#overlay')).trim() && (await p.innerText('#ini')) === rot && !(await p.$eval('#ini', e => e.disabled)), `voltar fecha o pop-up e o botão volta ao normal ("${rot}")`);
  await p.click('#ini'); await espera(p, 500); ok(/pela metade/i.test(await p.innerText('#overlay')), 'Iniciar continua funcionando depois do voltar');
  await p.click('[data-o="1"]'); await espera(p, 600); ok((await p.evaluate(() => location.hash)) === '#sessao', '"Voltar pra ele" volta pro treino pausado');
  await ctx.close(); }

// 3. Cardio de 20 min: minimizar não apaga; "Já fiz" no meio registra os minutos feitos; tela apagada conta o tempo
{ const T = new Date('2026-10-25T09:00:00-03:00').getTime(); const { ctx, p } = await nova(T); await login(p); await abrirTreino(p, 'B');
  for (let i = 0; i < 7; i++) { await p.click('#pular'); await espera(p, 200); }
  ok(/HIIT/.test(await txt(p, 'h1')) && !!(await p.$('#fin')) && /É o último/.test(await txt(p, '.view')), 'último exercício mostra "Finalizar treino" e "marca que eu fecho"');
  await p.click('.rest.tm'); await espera(p, 400);
  ok(/Forte/i.test(await p.innerText('#rest-t')), 'HIIT 30s forte / 30s leve mostra "Forte!" no cronômetro');
  await p.goBack(); await espera(p, 400); ok(!!(await p.$('#rest.mini')), 'voltar do celular só minimiza o cardio');
  await p.click('#rest-x').catch(() => {}); await p.click('#rest'); await espera(p, 300); ok(!!(await p.$('#rest:not(.mini)')), 'toque na barra abre o cardio de novo');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.fastForward('12:00');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await espera(p, 400); const rel = await p.innerText('#clock'); ok(+rel.split(':')[0] >= 11, `12 min de cardio com a tela apagada contam no tempo (${rel})`);
  await p.click('#rest-skip'); await espera(p, 500);
  const s = await sessao(p), st = s.sets[7][0]; ok(st.done && st.seg >= 700 && st.seg <= 800, `"Já fiz" no meio registra os minutos (${st.seg}s)`);
  ok(/Registrei 1[23]:\d\d de 20:00/.test(await p.innerText('#toast')), 'avisa "Registrei 12 min de 20 min" (ou 13)');
  await espera(p, 800); if (await p.$('#fin')) await p.click('#fin'); await espera(p, 400); if (await p.$('#enc')) await p.click('#enc'); await espera(p, 500);
  ok(/de 7/.test(await txt(p, '.view')) && /\+ opcional/.test(await txt(p, '.view')), 'feedback conta só os obrigatórios ("de 7 + opcional")');
  await ctx.close(); }

// 4. "? Dúvida" no meio do descanso não mata o descanso
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'C');
  await p.click('#pular'); await espera(p, 300); await p.click('.set[data-k="0"] .rest'); await espera(p, 500);
  await p.click('#rest-x'); await espera(p, 200); await p.click('[data-duvida]'); await espera(p, 600);
  ok((await p.evaluate(() => location.hash)) === '#assistente' && !!(await p.$('#rest')), 'abre o tira-dúvidas com o descanso ainda rodando');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= W + 1, `tira-dúvidas não estoura a largura (${sw}px)`);
  await p.click('#volta'); await espera(p, 600);
  const s = await sessao(p); ok((await p.evaluate(() => location.hash)) === '#sessao' && !!(await p.$('#rest')) && !s.pausadoEm, 'voltando, o descanso continua e o treino não pausou');
  await ctx.close(); }

// 5. Fotos do mês: "voltar" enquanto salva não quebra nem perde as fotos; fotos escolhidas ficam guardadas
{ const { ctx, p } = await nova(); await login(p); await p.click('.tabs [data-go="evolucao"]'); await espera(p, 700);
  await p.click('#add'); await espera(p, 300);
  await p.setInputFiles('#f-frente', { name: 'a.png', mimeType: 'image/png', buffer: PNG }); await espera(p, 300);
  await p.click('#c'); await espera(p, 200); await p.click('#add'); await espera(p, 600);
  ok(/url\(/.test(await p.$eval('label[for="f-frente"]', e => e.style.backgroundImage)), 'foto escolhida continua lá depois de cancelar e abrir de novo');
  await p.setInputFiles('#f-lado', { name: 'b.png', mimeType: 'image/png', buffer: PNG }); await p.setInputFiles('#f-costas', { name: 'c.png', mimeType: 'image/png', buffer: PNG }); await espera(p, 300);
  await p.click('#s'); await p.goBack(); await espera(p, 1800);
  const ev = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).evolucao); const ult = ev[ev.length - 1];
  ok(errs.every(e => !/files/.test(e)) && ult?.foto_lado && ult?.foto_costas, 'voltar durante o "Salvando…" não perde as 3 fotos');
  await ctx.close(); }

// 6. Anamnese: data impossível barrada; gravidez começa sem resposta; sono com texto
{ const { ctx, p } = await nova(); await login(p);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.objetivo = null; s.perfil.anamnese_em = null; s.perfil.gestacao = null; s.perfil.nascimento = null; localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('demo:anamnese'); });
  await p.reload(); await espera(p, 1200);
  await p.click('#next'); await espera(p, 200); // boas-vindas → 1ª pergunta
  for (let i = 0; i < 25 && !/grávida/i.test(await txt(p, '#m')); i++) { if (await p.$('#ops .opc.on')) await p.click('#next'); else if (await p.$('#ops')) { await p.click('#ops .opc'); await p.click('#next'); } else await p.click('#next'); await espera(p, 150); }
  ok(/grávida/i.test(await txt(p, '#m')) && !(await p.$('#ops .opc.on')), 'pergunta de gravidez começa sem resposta marcada');
  await p.click('#ops .opc'); await p.click('#next'); await espera(p, 150);
  if (/ciclo/i.test(await txt(p, '#m'))) { await p.click('#ops .opc'); await p.click('#next'); await espera(p, 150); } // ciclo (nova, 27/10)
  ok(/durmo bem e tô tranquila/.test(await txt(p, '#m')), 'sono/estresse com o texto em cada opção');
  await p.click('#ops .opc'); await p.click('#next'); await espera(p, 150); await p.click('#ops .opc'); await p.click('#next'); await espera(p, 150);
  await p.fill('#tx', '2024-03-10'); await p.click('#next'); await espera(p, 200);
  ok(/Confere o ano/.test(await txt(p, '#m')), 'data de nascimento de 2 anos é barrada');
  await ctx.close(); }

// 7. Painel: nota baixa sem comentário chega pro Igor; bi-set aparece no editor; botões cabem com zoom
{ const { ctx, p } = await nova(null, 288); await login(p); await abrirTreino(p, 'C');
  await p.click('#pular'); await espera(p, 300); await p.click('.set[data-k="0"] .rest'); await espera(p, 400); if (await p.$('#rest:not(.mini)')) await p.click('#rest-x');
  await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500); await p.click('#esf button >> nth=9'); await p.click('#nota button >> nth=2'); await p.click('#env'); await espera(p, 900);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.logado = false; localStorage.setItem('demo:state', JSON.stringify(s)); });
  await p.goto('http://app.local/?demo'); await espera(p, 600); if (await p.$('text=ENTRAR')) { await p.click('text=ENTRAR'); await p.press('#pw', 'Enter'); await espera(p, 1200); }
  if (!/PAINEL/.test(await txt(p, '.view'))) { await login(p, 'igor@demo.com'); }
  const v = await txt(p, '.view'); ok(/nota baixa|esforço no limite/i.test(v) && /nota 2/.test(v), 'treino com nota 2 sem texto aparece no painel com selo');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 289, `painel com zoom não estoura a largura (${sw}px)`); await shot(p, 'painel-288');
  await p.click('[data-treino]'); await espera(p, 600); ok(/\| bi 3/.test(await p.inputValue('#t')), 'editor do treino mostra o bi-set (não some ao republicar)');
  await ctx.close(); }

// 8. Minhas cargas vem do banco (celular sem cache); programa mostra os exercícios; pontos sem contradição; story leve
{ const { ctx, p } = await nova(); await login(p); await p.evaluate(() => localStorage.removeItem('demo:cargas'));
  await p.click('.tabs [data-go="evolucao"]'); await espera(p, 900);
  ok(/Agachamento Smith 28 kg/.test(await txt(p, '.view')), 'Minhas cargas mostra o Smith (28 kg) mesmo sem nada guardado no celular');
  await p.click('.tabs [data-go="home"]'); await espera(p, 600); await p.click('[data-go="programa"][data-arg="corrida"]'); await espera(p, 500);
  ok(/Agachamento búlgaro/.test(await txt(p, '.view')), 'programa extra lista os exercícios antes de começar');
  await p.click('.tabs [data-go="pontos"]'); await espera(p, 600); const pv = await txt(p, '.view');
  ok(!/pode trocar!/.test(pv) && /pts pra/.test(pv), 'pontos dizem quanto falta pro próximo prêmio sem "pode trocar!" em todos');
  await abrirTreino(p, 'A'); await p.click('.rest.tm'); await espera(p, 500); await p.click('#rest-skip'); await espera(p, 600); if (await p.$('#q-s')) { await p.click('#q-s'); await espera(p, 600); } await p.click('#fim'); await espera(p); await p.click('#enc'); await espera(p, 500); await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900);
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.click('#share'); const d = await dl;
  ok(d && /\.jpg$/.test(d.suggestedFilename()), `imagem do story em JPEG (${d?.suggestedFilename()})`);
  await ctx.close(); }

console.log('erros de página:', errs); await b.close();
if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); } else console.log('tudo ok');
