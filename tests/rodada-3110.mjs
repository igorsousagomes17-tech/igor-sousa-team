// Rodada 31/10 (Júlia, Carla, Márcia, Renata, Bia): W=360 OUT=/tmp node tests/rodada-3110.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp'; const W = +(process.env.W || 360);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHOU ') + m); if (!c) errs.push(m); };
async function nova({ w = W, h = 780, iphone = false } = {}) {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: true, isMobile: true, ...(iphone ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } : {}) });
  const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f.split('?')[0] }).catch(() => r.abort()); } return r.abort(); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  return { ctx, p };
}
const w = (p, ms = 400) => p.waitForTimeout(ms);
const entrar = async (p, email = 'ana@demo.com') => { await p.goto('http://app.local/?demo'); await w(p, 500); await p.click('text=ENTRAR'); await p.fill('#em', email); await p.press('#pw', 'Enter'); await w(p, 1000); };
const treino = async (p, l) => { await p.click('.tabs [data-go="treino"]'); await w(p); await p.click(`[data-go="treino"][data-arg="${l}"]`); await w(p); await p.click('#ini'); await w(p, 700); if (await p.locator('#m [data-o]').count()) { await p.locator('#m [data-o]').last().click(); await w(p, 500); } };
const passo = async (p, rx) => { const j = await p.$$eval('[data-passo]', (bs, s) => bs.findIndex(x => new RegExp(s, 'i').test(x.getAttribute('aria-label') || '')), rx); await p.click(`[data-passo="${j}"]`); await w(p, 500); return j; };
const estado = p => p.evaluate(() => JSON.parse(localStorage.getItem('demo:state') || '{}'));
const fechar = async p => { if (await p.locator('#rest-skip').count()) { await p.click('#rest-skip'); await w(p, 300); } await p.click('#fim'); await w(p); if (await p.locator('#enc').count()) { await p.click('#enc'); await w(p, 600); } await p.click('#esf button >> nth=6'); await p.click('#nota button >> nth=8'); await p.click('#env'); await w(p, 1200); };

// 1. Drop (Carla): "12+4+4" nas reps + quedas anotadas não conta as reps em dobro; quedas já aparecem com as reps do Igor
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'B'); await passo(p, 'Abdu');
  ok(await p.locator('.dl[data-k="0"]').count() === 2, 'drop: quedas prescritas já aparecem');
  ok(await p.getAttribute('.dl[data-k="0"][data-d="0"] input[data-df="reps"]', 'placeholder') === '4', 'drop: reps da queda com o "4" do Igor de exemplo');
  ok(/tira um pouco de peso e já faz mais 4 \+ 4/.test(await p.innerText('.bloco')), 'drop: explica o que é na própria tela');
  await p.fill('.set[data-k="0"] input[data-f="kg"]', '40'); await p.fill('.set[data-k="0"] input[data-f="reps"]', '12+4+4');
  await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="kg"]', '30'); await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="reps"]', '4');
  await p.fill('.dl[data-k="0"][data-d="1"] input[data-df="kg"]', '20'); await p.fill('.dl[data-k="0"][data-d="1"] input[data-df="reps"]', '4');
  // Enter na queda vai pro próximo campo
  await p.focus('.dl[data-k="0"][data-d="0"] input[data-df="kg"]'); await p.keyboard.press('Enter'); ok(await p.evaluate(() => document.activeElement?.matches('.dl[data-d="0"] input[data-df="reps"]')), 'drop: Enter no kg da queda vai pras reps');
  await p.click('.set[data-k="0"] .rest'); await w(p, 600); await fechar(p);
  const r = (await estado(p)).series.filter(x => /Abdu/.test(x.exercicio_nome) && x.n === 1).pop();
  ok(r && r.reps === 20 && r.kg === 40, `drop: salva 12 + quedas 4+4 = 20, não 28 (${r?.reps})`);
  // Meus treinos mostra as quedas
  await p.click('.tabs [data-go="evolucao"]'); await w(p, 900); const bt = p.locator('[data-dia], .card button').filter({ hasText: /Treino B/ }).first(); if (await bt.count()) { await bt.click(); await w(p, 900); ok(/40×12 → 30×4 → 20×4/.test(await p.innerText('#dl')), 'Meus treinos mostra 40×12 → 30×4 → 20×4'); } else ok(false, 'achou o treino em Meus treinos');
  await ctx.close(); }

// 2. Drop sem a palavra "drop" (Treino D, "10 + (4+4+4)") e queda absurda pergunta; "4O" vira 40
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'D'); await passo(p, 'Supinada');
  ok(await p.locator('.dl[data-k="0"]').count() === 3, 'drop "10 + (4+4+4)" tem as 3 quedas');
  await p.fill('.set[data-k="0"] input[data-f="kg"]', '4O'); ok(await p.inputValue('.set[data-k="0"] input[data-f="kg"]') === '40', '"4O" (letra O) vira 40');
  await p.fill('.dl[data-k="0"][data-d="0"] input[data-df="kg"]', '300'); await p.click('.set[data-k="0"] .rest'); await w(p, 500);
  ok(/Confere a carga/i.test(await p.innerText('#overlay')), 'queda de 300 kg pergunta "Confere a carga"');
  await ctx.close(); }

// 3. Bi-set (Júlia/Carla): Execução, Dúvida e Senti dor à vista; dor no peito orienta parar e 192; Enter segue A1 → A2
{ const { ctx, p } = await nova(); await entrar(p); await treino(p, 'A'); await p.click('.rest.tm'); await w(p, 800); await p.click('#rest-skip'); await w(p, 500); if (await p.locator('#q-s').count()) { await p.click('#q-s'); await w(p, 600); }
  ok(await p.locator('.bloco [data-dor]').first().isVisible(), 'bi-set: "Senti dor" visível sem abrir "Dica e opções"');
  await p.focus('.set[data-i="1"][data-k="0"] input[data-f="kg"]'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => { const a = document.activeElement?.closest('.set'); return a && a.dataset.k === '0' && a.dataset.i === '2'; }), 'bi-set: Enter vai do A1 série 1 pro A2 série 1');
  await p.locator('.bloco [data-dor]').first().click(); await w(p); ok(await p.locator('#d-p').count() === 1, 'Senti dor pergunta onde é');
  await p.click('#d-p'); await w(p, 600); ok(/192/.test(await p.innerText('#overlay')), 'dor no peito: para o treino e liga 192');
  await p.click('#q-s'); await w(p);
  // encerrar pela metade oferece pausar e terminar depois
  await p.click('.set[data-i="1"][data-k="0"] .rest'); await w(p, 400); await p.click('.set[data-i="2"][data-k="0"] .rest'); await w(p, 600); if (await p.locator('#rest-x').count()) { await p.click('#rest-x'); await w(p); }
  await p.click('#fim'); await w(p); ok(await p.locator('#depois').count() === 1, 'encerrar incompleto oferece "Pausar e terminar depois"');
  await p.click('#depois'); await w(p, 600); ok(await p.evaluate(() => !!JSON.parse(localStorage.getItem('demo:sessao') || 'null')?.pausadoEm), 'pausou (não registrou)');
  await ctx.close(); }

// 4. Pausar no meio do descanso (Renata): volta 20 min depois com o descanso que faltava
{ const { ctx, p } = await nova(); await p.clock.install(); await entrar(p); await treino(p, 'C'); await passo(p, 'Crucifixo');
  await p.click('.set[data-k="0"] .rest'); await w(p, 700); ok(await p.locator('#rest-pt').count() === 1, 'descanso tem "Pausar treino"');
  await p.click('#rest-pt'); await w(p, 600); await p.clock.fastForward('20:00'); await w(p);
  await p.click('[data-go="sessao"]'); await w(p, 900);
  ok(await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('demo:sessao')); return s.descansoAte && s.descansoAte > Date.now() + 10000; }), 'descanso congelado na pausa volta com o que faltava');
  await ctx.close(); }

// 5. Responder o Igor (Renata/Márcia/Carla): caixa grande, Enter não envia, rascunho volta depois de recarregar; Igor responde ela de novo
{ const { ctx, p } = await nova(); await entrar(p); await p.click('.tabs [data-go="perfil"]'); await w(p, 1000);
  const rin = p.locator('[data-rin]').first(); ok(await rin.evaluate(e => e.tagName === 'TEXTAREA' && e.getBoundingClientRect().width > 250), 'resposta: caixa de texto larga');
  await rin.fill('dá pra trocar o búlgaro'); await rin.press('Enter'); await w(p, 500); ok(await p.locator('[data-rin]').count() >= 1, 'Enter não envia pela metade');
  await p.reload(); await w(p, 1500); await p.click('.tabs [data-go="perfil"]'); await w(p, 1000); ok(/búlgaro/.test(await p.locator('[data-rin]').first().inputValue()), 'rascunho da resposta volta depois de recarregar');
  await p.locator('[data-rin]').first().fill('dá pra trocar o búlgaro por afundo?'); await p.locator('[data-rsend]').first().click(); await w(p, 1500);
  ok(/Você:.*afundo/.test(await p.innerText('#perfil-respostas')), 'resposta enviada aparece como "Você:"');
  const st = await p.evaluate(() => localStorage.getItem('demo:state'));
  const c2 = await nova(); await c2.p.goto('http://app.local/?demo'); await c2.p.evaluate(s => localStorage.setItem('demo:state', JSON.stringify({ ...JSON.parse(s), logado: false })), st); await entrar(c2.p, 'igor@demo.com'); await c2.p.click('#a-fb'); await w(c2.p, 600);
  ok(await c2.p.locator('[data-resp2]').count() >= 1, 'painel: botão "responder ela"'); await c2.p.locator('[data-resp2]').first().click(); await w(c2.p);
  ok(/afundo/.test(await c2.p.innerText('#overlay')), 'painel: o pop-up mostra o que ela escreveu'); await c2.p.fill('#t', 'Pode sim, afundo com halter.'); await c2.p.click('#s'); await w(c2.p, 800);
  const st2 = await c2.p.evaluate(() => localStorage.getItem('demo:state')); await c2.ctx.close();
  await p.evaluate(s => { const o = JSON.parse(s); localStorage.setItem('demo:state', JSON.stringify({ ...o, logado: true, perfil: JSON.parse(localStorage.getItem('demo:state')).perfil })); }, st2); await p.goto('http://app.local/?demo'); await w(p, 1500);
  ok(/O Igor te respondeu/.test(await p.innerText('.view')), 'nova resposta do Igor aparece de novo no Início');
  await p.click('#resp'); await w(p, 1200); const pr = await p.innerText('#perfil-respostas');
  ok(/afundo com halter/.test(pr) && await p.locator('[data-rin]').count() >= 1, 'Perfil: conversa inteira e dá pra responder de novo');
  await ctx.close(); }

// 6. Hyrox (Bia/Márcia): começa na Base, distância não vira reps, tem PDF, aviso de saúde
{ const { ctx, p } = await nova(); await entrar(p); await p.evaluate(() => localStorage.removeItem('demo:hyroxNivel')); await p.click('[data-go="lib"]'); await w(p, 500); await p.click('.grid2 [data-go="hyrox"]'); await w(p, 1000);
  ok(/Hyrox é uma prova/.test(await p.innerText('.view')), 'Hyrox explica o que é');
  await p.click('[data-nv="ini"]'); await w(p, 800); const v = await p.innerText('.view');
  ok(/1 de 3/i.test(v) && /Base/i.test(v), 'quem começa agora cai na Base (1 de 3)'); ok(await p.locator('#hpdf').count() === 1, 'Hyrox tem PDF');
  ok(/Dica e opções/.test(v), 'rodapé diz onde trocar o aparelho');
  await p.locator('[data-ht]').first().click(); await w(p, 900);
  await passo(p, 'Corrida');
  const b2 = await p.innerText('.view'); ok(/VOLTAS?|voltas ×/i.test(b2), 'circuito fala em voltas');
  ok(await p.locator('.set .dist').count() >= 1 && await p.locator('.bloco:has(.dist) input[data-f="reps"]').count() === 0, 'remo "250 m": mostra a distância, sem campo de reps');
  await ctx.close(); }

// 7. Registro do mês (Renata): peso/cintura não vêm preenchidos com o antigo
{ const { ctx, p } = await nova(); await entrar(p); await p.click('.tabs [data-go="evolucao"]'); await w(p, 900); await p.click('#add'); await w(p, 600);
  ok(await p.inputValue('#pk') === '' && /última/.test(await p.getAttribute('#pk', 'placeholder')), 'registro: peso vazio com "última: …" de exemplo'); await ctx.close(); }

// 8. Busca (Júlia/Bia): pergunta em frase e exercícios do Hyrox
{ const { ctx, p } = await nova(); await entrar(p); await p.click('.tabs [data-go="videos"]'); await w(p, 1000);
  await p.fill('#busca', 'como usar leg press'); await w(p, 500); ok(/Leg Press/i.test(await p.innerText('#lv')), 'busca "como usar leg press" acha o Leg press');
  await p.fill('#busca', 'wall ball'); await w(p, 500); ok(/Wall ball/i.test(await p.innerText('#lv')), 'busca "wall ball" acha o do Hyrox');
  await ctx.close(); }

// 9. Letra grande em 300 px (Márcia): descanso cabe, esforço/nota em 2 linhas, atalhos sem estourar
{ const { ctx, p } = await nova({ w: 300, h: 650 }); await entrar(p); await p.addStyleTag({ content: 'html{font-size:130%}' }); await treino(p, 'C'); await passo(p, 'Crucifixo');
  await p.click('.set[data-k="0"] .rest'); await w(p, 700);
  const fora = await p.$$eval('#rest-layer button', bs => bs.filter(x => x.offsetParent && (x.getBoundingClientRect().left < -1 || x.getBoundingClientRect().right > innerWidth + 1)).map(x => x.textContent));
  ok(!fora.length, `descanso: nenhum botão sai da tela (${fora})`); await p.screenshot({ path: path.join(D, '3110-descanso-300.png') });
  await p.click('#rest-skip'); await w(p);
  const rap = await p.$$eval('.rapidos .btn', bs => bs.filter(x => x.scrollWidth > x.clientWidth + 2).map(x => x.textContent)); ok(!rap.length, `atalhos não estouram (${rap})`);
  await p.click('#fim'); await w(p); if (await p.locator('#enc').count()) { await p.click('#enc'); await w(p, 600); }
  const larg = await p.$eval('#esf button', e => e.getBoundingClientRect().width); ok(larg >= 36, `esforço: botões largos em 300 px (${Math.round(larg)} px)`);
  await p.screenshot({ path: path.join(D, '3110-feedback-300.png') }); await ctx.close(); }

// 10. Perfil no iPhone não se contradiz sobre o apito
{ const { ctx, p } = await nova({ iphone: true, w: 390 }); await entrar(p); await p.click('.tabs [data-go="perfil"]'); await w(p, 1000); const v = await p.innerText('.view');
  ok(!/apita quando acaba/.test(v) && (v.match(/não apita|só toca com o app aberto/g) || []).length === 1, 'iPhone: um aviso só sobre o apito'); await ctx.close(); }

console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'tudo ok'); await b.close(); if (errs.length) process.exit(1);
