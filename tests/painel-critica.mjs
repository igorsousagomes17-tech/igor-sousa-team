// Painel do Igor, itens da crítica: 3 (editor descarta/✕), 8 (renovar a partir do vencimento), 9 (filtros da lista),
// 10 (enviar treino da biblioteca pra várias), 19 ("falta 1 dia") + 17, 21, 28, 29, 30, 34 de carona.
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [], falhas = [];
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
const p = await ctx.newPage();
// conta listeners de input/change postos no document (item 34)
await p.addInitScript(() => { window.__docL = 0; const o = document.addEventListener.bind(document); document.addEventListener = (t, ...r) => { if (t === 'input' || t === 'change') window.__docL++; return o(t, ...r); }; });
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ');
const w = ms => p.waitForTimeout(ms);
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const altura = async s => (await p.locator(s).first().boundingBox())?.height || 0;
await p.goto('http://app.local/?demo'); await w(400); await p.click('text=ENTRAR'); await p.fill('#em', 'igor@demo.com'); await p.press('#pw', 'Enter'); await w(1200);

// 28 e 29: pílula "pra responder" dentro do card; Sair no fim
const tile = await p.locator('#t-fb').boundingBox(), pil = await p.locator('#t-fb .pill').boundingBox();
ok(pil.x + pil.width <= tile.x + tile.width + 0.5, `pílula "pra responder" dentro do card (${Math.round(pil.x + pil.width)} ≤ ${Math.round(tile.x + tile.width)})`);
const out = await p.locator('#out').boundingBox(), ult = await p.locator('section.bloco').last().boundingBox();
ok(out.y > ult.y + ult.height - 1, 'Sair fica no fim do painel');
await p.screenshot({ path: `${D}/pc-home.png`, fullPage: true });

// 9: filtros da lista e "vence dd/mm"
await p.click('#ir-alunas'); await w(300);
ok((await p.$$('[data-fa]')).length >= 4, 'pílulas de filtro na lista de alunas');
await p.click('[data-fa="vencendo"]'); await w(200);
let l = await txt('#lista'); ok(/Marcela/.test(l) && /Ludimila/.test(l) && /Lorena/.test(l) && !/Patrícia|Fabiana|Ana Paula/.test(l), 'Vencendo: só quem vence em até 7 dias (ou venceu)');
ok(/vence \d\d\/\d\d/.test(l) && /venceu \d\d\/\d\d/.test(l), '"vence dd/mm" na linha');
await p.screenshot({ path: `${D}/pc-alunas-vencendo.png` });
await p.click('[data-fa="parada"]'); await w(200); l = await txt('#lista'); ok(/Fabiana/.test(l) && /Nova aluna/.test(l) && !/Marcela/.test(l), 'Sem treinar 7+ dias');
await p.click('[data-fa="personalizado"]'); await w(200); l = await txt('#lista'); ok(/Ana Paula/.test(l) && (await p.$$('#lista .aluna')).length === 1, 'Personalizado');
await p.fill('#busca', 'zzz'); await p.click('[data-fa="todas"]'); await w(200); ok(await p.inputValue('#busca') === 'zzz' && (await p.$$('#lista .aluna:not([hidden])')).length === 0, 'trocar o filtro mantém a busca');
ok(await altura('[data-fa]') >= 40, 'pílulas de filtro com 40px+');
await p.click('#volta'); await w(300);
await p.click('#ir-semplano'); await w(300); l = await txt('#lista');
ok(/Nova aluna/.test(l) && (await p.$$('#lista .aluna')).length === 1 && !!(await p.$('#lista [data-treino]')), 'aviso "sem plano" abre a lista filtrada (pronta pra montar)');
await p.click('#volta'); await w(300);

// 19, 20, 21: Atualizações
await p.click('#a-upd'); await w(400); const up = await txt('.view');
ok(/falta 1 dia/.test(up) && !/faltam 1 dia/.test(up), '"falta 1 dia" no singular');
ok(/já resolvi/i.test(up) && !/marcar como lida/i.test(up), '"Já resolvi"');
ok(await altura('[data-vtab]') >= 40, 'pílulas Pendentes/Resolvidas com 40px+');
await p.screenshot({ path: `${D}/pc-atualizacoes.png` });

// 8: renovar começa no dia seguinte ao vencimento (Ludimila vence amanhã; Marcela venceu há 2 dias)
await p.click('[data-renova][data-n="Ludimila M."]'); await w(600);
ok(await p.inputValue('#ini') === dia(2), `renovar (vence amanhã): início = dia seguinte ao vencimento (${await p.inputValue('#ini')})`);
const v1 = await txt('#venceEm'); await p.selectOption('#sem', '6'); await w(100); ok(await txt('#venceEm') !== v1, 'Vence em atualiza ao trocar a duração');
// 21: botões do editor
for (const s of ['#usarLib', '#pAlib', '#modoTexto']) ok(await altura(s) >= 40, `${s} com 40px+`);
// 17: reps largo e reconhecimento dentro do "dica, alternativa e vídeo"
const rw = (await p.locator('[data-f="reps"]').first().boundingBox()).width; ok(rw >= 200, `campo reps largo (${Math.round(rw)}px)`);
ok(await p.locator('details [data-f="aq"]').count() === await p.locator('[data-f="aq"]').count(), 'reconhecimento dentro do details');
await p.screenshot({ path: `${D}/pc-editor.png` });
await p.click('#mtS'); await w(900);
if (await p.$('#a-upd')) { await p.click('#a-upd'); await w(400); } ok(!/Ludimila/.test(await txt('.view')), 'publicou: Ludimila sai das Atualizações');
await p.click('[data-renova][data-n="Marcela D."]'); await w(600);
ok(await p.inputValue('#ini') === dia(-1), `renovar (venceu há 2 dias): início = dia seguinte ao vencimento (${await p.inputValue('#ini')})`);

// 3: Fechar sem mudar fecha direto; com mudança pergunta
await p.click('#mtC'); await w(200); ok(!(await p.isVisible('#mt')), 'Fechar sem mudança fecha direto');
const l0 = await p.evaluate(() => window.__docL);
await p.click('[data-renova]'); await w(600);
await p.fill('[data-f="reps"][data-j="1"]', '15'); await p.click('#mtC'); await w(200);
ok(/Descartar alterações/i.test(await txt('#overlay')), 'Fechar com mudança pergunta "Descartar alterações?"');
await p.screenshot({ path: `${D}/pc-descartar.png` });
await p.click('#dsN'); await w(200); ok(await p.isVisible('#mt') && await p.inputValue('[data-f="reps"][data-j="1"]') === '15', 'Continuar editando mantém o que foi digitado');
const n0 = await p.locator('.exc').count(), nome1 = await txt('.exc[data-j="1"] .exn');
await p.click('[data-del="1"]'); await w(200); ok(await p.locator('.exc').count() === n0 - 1, '✕ tira o exercício');
ok(await p.isVisible('#desfazer') && /Exercício removido/i.test(await txt('#desfazer')), 'aviso "Exercício removido · Desfazer"');
await p.screenshot({ path: `${D}/pc-desfazer.png` });
await p.click('#desfazer button'); await w(200);
ok(await p.locator('.exc').count() === n0 && (await txt('.exc[data-j="1"] .exn')) === nome1 && await p.inputValue('[data-f="reps"][data-j="1"]') === '15', 'Desfazer devolve o exercício no lugar (com o que foi editado)');
await p.click('#modoTexto'); await w(200); await p.fill('#t', (await p.inputValue('#t')) + '\nPrancha | 3 | 30s | 30'); await p.click('#mtC'); await w(200);
ok(/Descartar alterações/i.test(await txt('#overlay')), 'modo texto: mudança também pergunta');
await p.click('#dsS'); await w(200); ok(!(await p.isVisible('#mt')), 'Descartar fecha');
// 34: abrir o editor de novo não soma listener no document
await p.click('[data-renova]'); await w(600); await p.click('#mtC'); await w(200);
ok(await p.evaluate(() => window.__docL) === l0, 'editor não soma listener de input/change no document');
await p.click('#volta'); await w(300);

// 10: enviar treino da biblioteca pra várias alunas
await p.click('#t-modelos'); await w(500);
await p.click('[data-env] >> nth=0'); await w(500);
ok((await p.$$('[data-ea]')).length >= 5, 'lista de alunas pra escolher');
await p.fill('#ini', dia(3)); await p.selectOption('#sem', '8'); await w(100);
await p.fill('#eaQ', 'patr'); await w(100); ok((await p.$$('[data-ea]:not([hidden])')).length === 1, 'busca filtra');
await p.click('#eaT'); await p.fill('#eaQ', 'fab'); await w(100); await p.click('[data-ea]:not([hidden]) input'); await p.fill('#eaQ', ''); await w(100);
ok(/2 selecionadas/.test(await txt('#eaN')) && /Enviar pra 2 alunas/i.test(await txt('#eaS')), 'contador: 2 selecionadas');
await p.screenshot({ path: `${D}/pc-enviar.png` });
await p.click('#eaS'); await w(200); const cf = await txt('#ea');
ok(/Enviar pra 2 alunas\?/i.test(cf) && /Patrícia/.test(cf) && /Fabiana/.test(cf), 'confirma "Enviar pra 2 alunas?" com os nomes');
await p.click('#eaOk'); await w(1200); const rs = await txt('#ea');
ok(/Enviado pra 2 alunas/i.test(rs), 'resultado: enviado pra 2');
await p.screenshot({ path: `${D}/pc-enviado.png` });
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')));
const fimEsp = dia(3 + 8 * 7 - 1);
ok(['a4', 'a5'].every(a => st.planos?.[a]?.treinos?.length === 3 && st.planos[a].inicio === dia(3) && st.planos[a].fim === fimEsp), 'salvarPlano pra cada uma com início e vencimento');
ok(st.planos.a4.treinos[0].exercicios.some(e => e.biset_com), 'bi-set do modelo vai junto');
await p.click('#eaF'); await w(200); await p.click('#volta'); await w(800);
await p.click('#ir-alunas'); await w(300); ok(new RegExp(`Patrícia.*vence ${fimEsp.slice(8, 10)}/${fimEsp.slice(5, 7)}`).test(await txt('#lista')), 'painel recarregado com o vencimento novo');
await p.click('#volta'); await w(300);

// 30: goblet em Quadríceps; acentos ao salvar
await p.click('#t-exercicios'); await w(500); await p.click('[data-g="Quadríceps"]'); await w(200);
ok(/Goblet com anilha no calcanhar/.test(await txt('.lista')), 'goblet em Quadríceps');
await p.click('#novoEx'); await w(200); await p.fill('#fxN', 'Elevaçao lateral na maquina'); await p.click('#fxS'); await w(400);
await p.click('[data-g=""]'); await w(100); ok(/Elevação lateral na máquina/.test(await txt('.lista')), 'acentos corrigidos ao salvar');

const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 360, `não estoura a largura (${sw})`);
console.log('erros:', errs); await b.close(); if (errs.length || falhas.length) process.exit(1);
