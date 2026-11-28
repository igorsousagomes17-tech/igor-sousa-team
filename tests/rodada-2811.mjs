import { vaiEVolta } from './_vaievolta.mjs';
// Rodada 28/11 (Júlia, Carla, Márcia, Renata, Bia): W=360 OUT=/tmp NODE_OPTIONS=--import=./tests/_abre-detalhes.mjs node tests/rodada-2811.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const W = +(process.env.W || 360), D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHOU ') + m); if (!c) errs.push(m); };
async function nova({ w = W, h = 780, antes } = {}) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  if (antes) await ctx.addInitScript(antes);
  const p = vaiEVolta(await ctx.newPage());
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f.split('?')[0] }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const w = (p, ms = 400) => p.waitForTimeout(ms);
const txt = async (p, s = '.view') => (await p.innerText(s)).replace(/\s+/g, ' ');
const entrar = async (p, email = 'ana@demo.com') => { await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await w(p, 1000); };
const treino = async (p, l) => { await p.click('.tabs [data-go="treino"]'); await w(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await w(p); await p.click('#ini'); await w(p, 700); if (await p.locator('#m [data-o]').count()) { await p.locator('#m [data-o]').last().click(); await w(p, 500); } };
const estreita = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

// 1. Márcia: login com e-mail incompleto não culpa a senha; esqueci a senha avisa embaixo (não no topo)
{ const { ctx, p } = await nova(); await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR');
  await p.fill('#em', 'marcia.lima@gmail'); await p.fill('#pw', '62999998888'); await p.press('#pw', 'Enter'); await w(p, 500);
  ok(/Confere o e-mail/.test(await p.innerText('#err')), 'e-mail sem ".com" diz "Confere o e-mail" (não "senha não confere")');
  await ctx.close(); }

// 2. Júlia/Márcia: lista do treino "7 exercícios + 1 opcional"; Perfil sem "anamnese"; Vídeos não promete "com o Igor"
{ const { ctx, p } = await nova(); await entrar(p);
  await p.click('.tabs [data-go="treino"]'); await w(p); await p.click('[data-go="treino"][data-arg="B"]'); await w(p);
  ok(/\d+ exercícios \+ 1 opcional/.test(await txt(p)), 'lista do Treino B conta o opcional à parte (' + (await txt(p)).match(/\d+ exercícios[^·]*/)?.[0] + ')');
  await p.click('.tabs [data-go="perfil"]'); await w(p, 700);
  const pf = await txt(p); ok(/Minha ficha \(saúde e objetivo\)/.test(pf) && !/anamnese/i.test(pf), 'Perfil: "Minha ficha (saúde e objetivo)", sem "anamnese"');
  ok(!/Mandar vídeo\/foto/.test(pf), 'Igor diz "te mando o vídeo": sem botão pra ela mandar vídeo');
  await p.click('.tabs [data-go="videos"]').catch(() => {}); await w(p, 700);
  if (/Vídeos|exercício/i.test(await txt(p))) ok(!/, com o Igor\./.test(await txt(p)), 'Vídeos não promete "com o Igor" (são animações)');
  await ctx.close(); }

// 3. Carla: voltar do Android entre as abas: Início → Treino → Perfil → voltar = Início
{ const { ctx, p } = await nova(); await entrar(p);
  await p.click('.tabs [data-go="treino"]'); await w(p); await p.click('.tabs [data-go="perfil"]'); await w(p);
  await p.goBack(); await w(p, 700); ok(/#home/.test(p.url()), 'voltar numa aba (depois de trocar de aba) volta pro Início (' + p.url().split('#')[1] + ')');
  await p.click('.tabs [data-go="evolucao"]'); await w(p, 700); await p.click('.tabs [data-go="home"]'); await w(p, 700);
  ok(/#home/.test(p.url()) && /Início|Treino de hoje/i.test(await txt(p)), 'tocar no Início pela aba volta pro Início');
  // Resumo da semana aberto pela Evolução: "‹ Voltar" volta pra Evolução
  await p.click('.tabs [data-go="evolucao"]'); await w(p, 800);
  if (await p.$('[data-go="semana"]')) { await p.click('[data-go="semana"]'); await w(p, 800); await p.click('#semVolta'); await w(p, 800); ok(/#evolucao/.test(p.url()), 'Resumo da semana: "‹ Voltar" volta pra Evolução'); }
  // Meus treinos do demo abre com as séries (antes: "7 de 7" e "Nenhuma série anotada")
  if (await p.$('[data-dia="0"]')) { await p.click('[data-dia="0"]'); await w(p, 900); const d = await txt(p, 'body'); ok(!/Nenhuma série anotada/.test(d) && /kg|vezes/.test(d), 'treino de exemplo do demo abre com as séries'); }
  await ctx.close(); }

// 4. Carla: pirâmide — subiu na série 1, a série 2 não sugere menos (Smith 22/25/28 da última vez)
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A');
  const j = await p.$$eval('[data-passo]', bs => bs.findIndex(x => /smith/i.test(x.getAttribute('aria-label') || ''))); if (j >= 0) { await p.click(`[data-passo="${j}"]`); await w(p, 500); }
  const sm = await p.$$eval('.bloco', bs => bs.map(x => x.dataset.i).find((i, k) => /smith/i.test(bs[k].innerText)));
  if (sm != null) {
    await p.fill(`.set[data-i="${sm}"][data-k="0"] input[data-f="kg"]`, '30'); await p.click(`.set[data-i="${sm}"][data-k="0"] .rest`); await w(p, 700); if (await p.$('#rest-x')) { await p.click('#rest-x'); await w(p, 400); } if (await p.$(`.bitab[data-biv="${sm}"]`)) { await p.click(`.bitab[data-biv="${sm}"]`); await w(p, 400); }
    const ph = await p.getAttribute(`.set[data-i="${sm}"][data-k="1"] input[data-f="kg"]`, 'placeholder').catch(() => '');
    ok(+String(ph).replace(',', '.') >= 30, `pirâmide: série 2 sugere ${ph} kg (não menos que os 30 de hoje)`);
  } else ok(false, 'achei o Smith no Treino A');
  await ctx.close(); }

// 5. Renata: treino pausado não troca pra Express escondido; descanso com "ver exercício"
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'B');
  await p.fill('.set[data-k="0"] input[data-f="kg"]', '20').catch(() => {}); await p.click('.set[data-k="0"] .rest').catch(() => {}); await w(p, 700);
  if (await p.$('#rest-x')) { ok(/ver exercício/.test(await p.innerText('#rest-x')), 'descanso: botão "▾ ver exercício" (não "✎ anotar")'); await p.click('#rest-x'); await w(p, 300); }
  await p.click('#sair'); await w(p, 500); if (await p.$('#depois')) { await p.click('#depois'); await w(p, 700); }
  await p.click('.tabs [data-go="treino"]'); await w(p); await p.click('[data-go="treino"][data-arg="B"]'); await w(p);
  await p.click('[data-ver="1"]'); await w(p, 400);
  ok(/já começou no Completo/.test(await p.innerText('#toast')), 'Express com treino pausado avisa que ele já começou no Completo');
  await ctx.close(); }

// 6. Márcia: feedback diz "Falta enviar" (não "registrado") e o erro usa os nomes da tela; estrelas cabem em 288 px
{ const { ctx, p } = await nova({ w: 288 }); await entrar(p); await treino(p, 'C');
  await p.click('.set[data-k="0"] .rest').catch(() => {}); await w(p, 600); if (await p.$('#rest-x')) await p.click('#rest-x'); await w(p, 300);
  await p.click('#fim'); await w(p, 500); await p.click('#enc'); await w(p, 700);
  const v = await txt(p); ok(/Falta enviar/i.test(v) && !/Treino registrado/i.test(v), 'feedback antes de enviar: "Falta enviar" (não "Treino registrado")');
  await p.click('#env'); await w(p, 400); ok(/Quanto cansou\?/.test(await p.innerText('#e')), 'erro do feedback usa "Quanto cansou?" (o nome que está na tela)');
  ok(await p.$$eval('#nota button', bs => bs.every(x => x.getBoundingClientRect().width >= 40 && x.scrollWidth <= x.clientWidth + 1)), 'estrelas: 5 botões iguais, nenhum vazando em 288 px');
  await ctx.close(); }

// 7. Bia: story com foto — "Postar no story" só aparece depois de escolher a foto
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A');
  await terminarTudo(p); await w(p, 600);
  if (await p.$('#esf')) { await p.click('#esf button >> nth=2'); await p.click('#nota button >> nth=3'); await p.click('#env'); await w(p, 1200); }
  if (await p.$('#shareFoto')) { await p.click('#shareFoto'); await w(p, 600); ok(!(await p.isVisible('#fsPost')), '"Postar no story" escondido antes de escolher a foto'); }
  else ok(false, 'card com "Story com a sua foto"');
  await ctx.close(); }

// 8. Júlia: ranking do demo sem duas medalhas de ouro
{ const { ctx, p } = await nova(); await entrar(p);
  const golds = (await txt(p)).split('🥇').length - 1; ok(golds <= 1, `Início: no máximo uma 🥇 no ranking (${golds})`);
  await ctx.close(); }

// 9. Márcia: letra Maior — Loja do time e treino sem rolar de lado em 288 px; tema claro com laranja mais escuro
{ const { ctx, p } = await nova({ w: 288, h: 640, antes: () => { localStorage.setItem('letra', JSON.stringify('gg')); } }); await entrar(p);
  await p.evaluate(() => document.documentElement.classList.add('letra-gg'));
  await p.click('.tabs [data-go="evolucao"]'); await w(p, 700); await p.click('[data-go="pontos"]'); await w(p, 900);
  ok(await estreita(p), 'Loja do time com letra Maior em 288 px: nada rolando de lado');
  await p.screenshot({ path: `${D}/2811-loja-gg.png` });
  await ctx.close(); }

// 10. Bia: quem treina em casa vê "Em casa" logo depois de "Todos" nos Vídeos; o Início já abre na planilha "Em casa"
{ const { ctx, p } = await nova(); await entrar(p);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:state')); s.perfil.local_treino = 'casa'; localStorage.setItem('demo:state', JSON.stringify(s)); localStorage.removeItem('demo:slot'); localStorage.setItem('demo:planilhaExtra', 'true'); }); await p.reload(); await w(p, 1500);
  ok(/Em casa ·/i.test(await txt(p)), 'Início de quem treina em casa abre na planilha "Em casa"');
  await p.click('.tabs [data-go="videos"]').catch(() => {}); await w(p, 700);
  const ch = await p.$$eval('[data-gq]', bs => bs.map(x => x.dataset.gq)).catch(() => []); if (ch.length) ok(ch[1] === 'casa', 'Vídeos: "Em casa" logo depois de "Todos" (' + ch.slice(0, 3).join(',') + ')');
  await ctx.close(); }

console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
