// Testes da rodada 28/10 (carga de treino descartado não fica; pirâmide na 1ª vez herda o peso; 30 → 300 pergunta e "Corrigir" em destaque;
// "Ficar" em destaque no Sair; voltar não pula a troca de senha; aviso fixo antigo some; pausar o treino no descanso; corrigir série de treino passado;
// IA do demo: execução, 12/10/8, descanso, saldo de pontos; aba com nome inteiro quando cabe; card "<1 min" e plural; tira-dúvidas estreito; senha atual pra trocar).
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 375);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const falhas = [], errs = []; let n = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FALHOU ') + msg); if (!cond) falhas.push(msg); };
const rota = p => p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
async function nova(w = W) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); await rota(p); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  return { ctx, p };
}
const shot = (p, t) => p.screenshot({ path: `${D}/y${String(++n).padStart(2, '0')}-${t}.png` });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const txt = async (p, s) => (await p.innerText(s)).replace(/\s+/g, ' ');
const sessao = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao')));
const cargas = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:cargas') || '{}'));
async function login(p, email = 'ana@demo.com') { await p.goto('http://app.local/?demo'); await espera(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await espera(p, 1000); }
async function abrirTreino(p, l = 'A') { await p.click('.tabs [data-go="treino"]'); await espera(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await espera(p); await p.click('#ini'); await espera(p, 700); }
const idx = async (p, re) => (await sessao(p)).exs.findIndex(e => re.test(e.nome));
const irPara = async (p, i) => { for (let k = 0; k < 12; k++) { if (await p.$(`.bloco[data-i="${i}"]`)) return true; if (!(await p.$('#pular'))) return false; await p.click('#pular'); await espera(p, 300); } return false; };
const fechaDescanso = async p => { await espera(p, 250); if (await p.$('#rest:not(.mini) #rest-x')) { await p.click('#rest-x'); await espera(p, 200); } };
const pergunta = async (p, q) => { await p.fill('#tx', q); await p.click('#env'); await espera(p, 1600); return txt(p, '#msgs'); };

// 1) Treino descartado não deixa "Última" fantasma
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A');
  const s0 = await sessao(p); const i = s0.exs.findIndex((e, j) => j > 0 && !e.biset_com && !s0.exs.some(x => x.biset_com === j + 1) && !/mobilidade|alonga|prancha|hiit|cardio/i.test(e.nome) && !/s$/.test(String(e.reps).trim()) && e.carga !== false); const nome = s0.exs[i].nome, antes = (await cargas(p))[nome]?.kg ?? null;
  await irPara(p, i); await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="kg"]`, '77');
  for (let k = 0; k < s0.exs[i].series; k++) { if (!(await p.$(`.set[data-i="${i}"][data-k="${k}"] input[data-f="kg"]`))) break; await p.fill(`.set[data-i="${i}"][data-k="${k}"] input[data-f="kg"]`, '77'); await p.click(`.set[data-i="${i}"][data-k="${k}"] .rest`); await espera(p, 400); if (await p.$('#m #q-n')) { await p.click('#q-n'); await espera(p, 300); } await fechaDescanso(p); }
  if (await p.$('#sw:not(.on)')) { await p.click('#sw'); await espera(p, 500); } if (await p.$('#m #q-s')) { await p.click('#q-s'); await espera(p, 400); } await fechaDescanso(p);
  ok(+(await cargas(p))[nome]?.kg === 77, 'carga do treino aberto fica guardada (' + nome + ')');
  await p.click('#sair'); await espera(p, 600); await p.click('#desc'); await espera(p, 300); await p.click('#q-s'); await espera(p, 600);
  const depois = (await cargas(p))[nome]?.kg ?? null; ok(depois === antes, `descartar volta a "Última" pra de antes (${antes} → ${depois})`); await ctx.close(); }

// 2) Pirâmide na 1ª vez herda o peso da série anterior; 3) 30 → 300 pergunta com "Corrigir" em destaque
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'B'); const s0 = await sessao(p);
  const i = s0.exs.findIndex(e => /\d+\/\d+/.test(e.reps) && !e.ultima && !e.porSerie && e.carga !== false && !/mobilidade/i.test(e.nome));
  if (i < 0) ok(true, '(sem pirâmide sem histórico no Treino B: pula)'); else {
    await irPara(p, i); await p.fill(`.set[data-i="${i}"][data-k="0"] input[data-f="kg"]`, '40'); await p.click(`.set[data-i="${i}"][data-k="0"] .rest`); await espera(p, 400); if (await p.$('#m #q-n')) await p.click('#q-n'); await fechaDescanso(p);
    await p.click(`.set[data-i="${i}"][data-k="1"] .rest`); await espera(p, 400); await fechaDescanso(p);
    ok((await sessao(p)).sets[i][1].kg === '40', 'pirâmide sem histórico: série 2 sem digitar herda 40 kg');
    await p.fill(`.set[data-i="${i}"][data-k="2"] input[data-f="kg"]`, '400'); await p.click(`.set[data-i="${i}"][data-k="2"] .rest`); await espera(p, 800);
    ok(/Confere a carga/i.test(await txt(p, '#overlay')), '400 depois de 40 no mesmo treino pergunta'); ok(/Corrigir/i.test(await txt(p, '#q-s')), '"Corrigir" é o botão em destaque'); await shot(p, 'confere');
    await p.click('#q-s'); await espera(p, 300); ok(!(await sessao(p)).sets[i][2].done, '"Corrigir" não marca a série'); }
  await ctx.close(); }

// 4) Sair do app: "Ficar" em destaque; 5) trocar senha pede a de agora; 13) tira-dúvidas estreito; 9) IA do demo
{ const { ctx, p } = await nova(); await login(p);
  await p.click('.tabs [data-go="perfil"]'); await espera(p, 600); await p.click('#out'); await espera(p, 300); ok(/Ficar/i.test(await txt(p, '#q-s')), 'Sair: "Ficar" é o botão em destaque'); await p.click('#q-s'); await espera(p, 300);
  await p.click('#pw'); await espera(p, 300); ok(!!(await p.$('#n0')), 'trocar senha tem o campo da senha de agora');
  await p.fill('#n1', 'nova123'); await p.fill('#n2', 'nova123'); await p.click('#s'); await espera(p, 300); ok(/senha de agora/i.test(await txt(p, '#e')), 'sem a senha de agora não troca'); await p.click('#c'); await espera(p, 200);
  const abas = await p.$$eval('.tabs .tab', bs => bs.map(b => { const l = b.querySelector('span.l'); return { c: b.classList.contains('curto'), corta: !b.classList.contains('curto') && l.scrollWidth > l.clientWidth + 1 }; }));
  ok(!abas[3].c, `aba Pontos com nome inteiro em ${W}px`); ok(abas.every(x => !x.corta), 'nenhuma aba com nome cortado ("Evoluç…")');
  await p.goto('http://app.local/?demo#assistente'); await espera(p, 1200); if (!(await p.$('#tx'))) { await p.click('.tabs [data-go="home"]'); await espera(p, 500); await p.click('.home-ia'); await espera(p, 800); }
  let r = await pergunta(p, 'como faço elevação de quadril?'); ok(/Pra pegar o movimento/.test(r), 'IA demo: "como faço" explica o passo a passo');
  r = await pergunta(p, 'o que significa 12/10/8?'); ok(/Pirâmide \(ex\. 12\/10\/8\)/.test(r), 'IA demo: 12/10/8 explica a pirâmide');
  r = await pergunta(p, 'quanto tempo descansar entre as séries?'); ok(/botão laranja/.test(r), 'IA demo: descanso explica o botão laranja');
  r = await pergunta(p, 'quantos pontos eu tenho?'); ok(/Você tem [\d.]+ pts agora/.test(r), 'IA demo: pontos diz o saldo');
  await shot(p, 'ia'); await ctx.close(); }
{ const { ctx, p } = await nova(300); await login(p); await p.goto('http://app.local/?demo#assistente'); await espera(p, 1200); if (!(await p.$('#tx'))) { await p.click('.home-ia'); await espera(p, 800); }
  ok(!(await p.isVisible('.chatbar .envTxt')), 'tira-dúvidas em 300px: botão só com a seta'); const lw = await p.$eval('#tx', e => e.getBoundingClientRect().width); ok(lw > 180, 'campo de texto largo em 300px (' + Math.round(lw) + 'px)'); await shot(p, 'chat-300'); await ctx.close(); }

// 6) 1º acesso: voltar não pula a troca de senha
{ const { ctx, p } = await nova(); await login(p);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.senha_trocada = false; localStorage.setItem('demo:state', JSON.stringify(s)); });
  await p.reload(); await espera(p, 1200); ok(!!(await p.$('#n1')), '1º acesso abre a troca de senha');
  await p.goBack(); await espera(p, 600); ok(!!(await p.$('#n1')) && !(await p.$('.tabs')), 'voltar do celular não pula a troca de senha');
  await p.evaluate(() => { location.hash = '#treino'; }); await espera(p, 600); ok(!!(await p.$('#n1')), 'mudar pra #treino também não pula'); await ctx.close(); }

// 7) Aviso fixo antigo ("olha no spam") some quando ela entra
{ const { ctx, p } = await nova(); await p.goto('http://app.local/?demo'); await espera(p, 600); await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com');
  await p.click('#esq'); await espera(p, 4600); await p.press('#pw', 'Enter'); await espera(p, 1200);
  ok(!(await p.$eval('#toast', e => e.classList.contains('on') && e.classList.contains('fixo'))), 'aviso fixo do "esqueci" não atravessa o Início'); await ctx.close(); }

// 8) Pausar o treino direto do descanso
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A'); const i = await idx(p, /./); const s0 = await sessao(p);
  const j = s0.exs.findIndex((e, k) => k > 0 && e.descanso_s && !/s$/.test(String(e.reps).trim())); await irPara(p, j);
  const alvo = (await p.$(`.set[data-i="${j + 1}"][data-k="0"] .rest`)) && s0.exs[j].biset_com ? j + 1 : j; await p.fill(`.set[data-i="${j}"][data-k="0"] input[data-f="kg"]`, '20'); await p.click(`.set[data-i="${j}"][data-k="0"] .rest`); await espera(p, 400);
  if (alvo !== j) { if (await p.$('#m #q-n')) await p.click('#q-n'); await p.click(`.set[data-i="${alvo}"][data-k="0"] .rest`); await espera(p, 500); }
  ok(!!(await p.$('#rest-pt')), 'descanso tem "Pausar o treino"'); await shot(p, 'descanso-pausar');
  if (await p.$('#rest-pt')) { await p.click('#rest-pt'); await espera(p, 600); ok(/#home/.test(p.url()) && !!(await sessao(p))?.pausadoEm, 'tocar pausa o treino e volta pro Início'); }
  await ctx.close(); }

// 9) Corrigir uma série de um treino que já passou; 11) card "<1 min" e "1/N exercícios"
{ const { ctx, p } = await nova(); await login(p); await abrirTreino(p, 'A'); const s0 = await sessao(p);
  const j = s0.exs.findIndex((e, k) => k > 0 && !/s$/.test(String(e.reps).trim()) && e.carga !== false && !/mobilidade/i.test(e.nome)); await irPara(p, j);
  await p.fill(`.set[data-i="${j}"][data-k="0"] input[data-f="kg"]`, '21'); await p.click(`.set[data-i="${j}"][data-k="0"] .rest`); await espera(p, 400); if (await p.$('#m #q-n')) await p.click('#q-n'); await fechaDescanso(p);
  await p.click('#fim'); await espera(p, 400); await p.click('#enc'); await espera(p, 500); await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await espera(p, 900);
  const card = await txt(p, '.view'); ok(/<1/.test(card) || /&lt;1/.test(card), 'card de treino de segundos mostra "<1 min"'); ok(!/\d\/\d+ exercício\b/i.test(card), "card sem \"1/N exercício\" no singular"); await shot(p, 'card');
  await p.click('.tabs [data-go="evolucao"], [data-go="home"]').catch(() => {}); await p.goto('http://app.local/?demo#evolucao'); await espera(p, 1200);
  if (!(await p.$('[data-dia="0"]'))) { await p.click('.tabs [data-go="evolucao"]'); await espera(p, 900); }
  await p.click('[data-dia="0"]'); await espera(p, 800); const b0 = await p.$('#dl [data-sr]'); ok(!!b0, 'dia do histórico deixa tocar na série pra corrigir');
  if (b0) { await b0.click(); await espera(p, 200); await p.fill('#ekg', '23'); await p.click('#es'); await espera(p, 800); ok(/23 kg/.test(await txt(p, '#dl')), 'série corrigida aparece com o peso novo'); await shot(p, 'corrige'); }
  await ctx.close(); }

console.log('erros de página:', errs); await b.close(); if (falhas.length || errs.length) { console.log('FALHAS:', falhas); process.exit(1); }
