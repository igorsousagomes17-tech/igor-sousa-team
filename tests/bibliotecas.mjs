// Biblioteca de exercícios, biblioteca de treinos e montador visual (Igor)
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [], falhas = [];
const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) falhas.push(m); };
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ');
const w = ms => p.waitForTimeout(ms);
await p.goto('http://app.local/?demo'); await w(400); await p.click('text=ENTRAR'); await p.fill('#em', 'igor@demo.com'); await p.press('#pw', 'Enter'); await w(1200);

// 1. Biblioteca de exercícios: lista, filtro, cria um novo
await p.click('#t-exercicios'); await w(500);
const n0 = (await p.$$('[data-ex]')).length; ok(n0 > 5, `biblioteca começa com os exercícios dos treinos (${n0})`);
await p.click('[data-g="Glúteo"]'); await w(200); const ng = (await p.$$('[data-ex]')).length; ok(ng > 0 && ng < n0, `filtro por grupo (${ng} de glúteo)`);
await p.screenshot({ path: `${D}/bib-1-exercicios.png` });
await p.click('#novoEx'); await w(200); await p.fill('#fxN', 'Agachamento sumô com halter'); ok(await p.inputValue('#fxG') === 'Quadríceps', 'grupo sugerido pelo nome');
await p.fill('#fxD', 'pés bem abertos'); await p.click('#fxS'); await w(400);
await p.click('[data-g=""]'); await w(100); await p.fill('#bq', 'sumô'); await w(200); ok(/Agachamento sumô com halter/.test(await txt('.lista')), 'novo exercício aparece na busca');
await p.click('#volta'); await w(300);

// 2. Biblioteca de treinos: monta um do zero no visual
await p.click('#t-modelos'); await w(500); ok((await p.$$('[data-m]')).length >= 1, 'biblioteca de treinos lista o modelo');
await p.click('#novoM'); await w(300); await p.fill('#mNome', 'Glúteo em casa 2x'); await p.fill('#trN', 'Inferior');
await p.click('#addE'); await w(300); await p.fill('#sxQ', 'sumô'); await w(200); await p.click('[data-lx] >> nth=0');
await p.fill('#sxQ', 'Ponte unilateral no sofá'); await w(200); ok(!!(await p.$('#sxNovo')), 'exercício que não existe: opção de criar');
await p.click('#sxNovo'); await w(300); await p.screenshot({ path: `${D}/bib-2-seletor.png` }); await p.click('#sxC'); await w(200);
ok((await p.$$('.exc')).length === 2, 'dois exercícios no treino A');
await p.fill('[data-f="series"][data-j="0"]', '4'); await p.fill('[data-f="reps"][data-j="0"]', '10');
await p.check('[data-bi="0"]'); await w(200); ok((await p.$$('.exc.bi')).length === 2, 'bi-set marca os dois');
await p.click('#addT'); await w(200); ok(/B/.test(await txt('.letra.on')), 'adiciona treino B');
await p.click('#addE'); await w(300); await p.click('[data-lx] >> nth=0'); await p.click('[data-lx] >> nth=1'); await p.click('#sxC'); await w(200);
await p.click('[data-dn="0"]'); await w(100);
await p.screenshot({ path: `${D}/bib-3-montador.png`, fullPage: true });
await p.click('#mtS'); await w(500);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state')).modelos);
const m = st.find(x => x.nome === 'Glúteo em casa 2x');
ok(m && m.treinos.length === 2 && m.treinos[0].exercicios[0].series === 4 && m.treinos[0].exercicios[0].reps === '10', 'salvou o modelo com séries e reps');
ok(m && m.treinos[0].exercicios[0].biset_com === 2 && m.treinos[0].exercicios[1].biset_com === 1, 'bi-set salvo nos dois lados');
ok(m && m.treinos[0].exercicios[0].dica === 'pés bem abertos', 'dica da biblioteca vem junto');
await p.click('#volta'); await w(300);

// 3. Treino da aluna: carrega da biblioteca, publica; modo texto continua lá
await p.click('#t-treino'); await w(300); await p.click('[data-treino] >> nth=0'); await w(600);
ok((await p.$$('.letra:not(.mais)')).length >= 3, 'abre o treino atual da aluna no visual');
await p.click('#usarLib'); await w(400); await p.click('[data-em] >> nth=0'); await w(300);
ok((await p.$$('.letra:not(.mais)')).length === 2 && /Agachamento sumô/.test(await txt('.exs')), 'usar da biblioteca carrega o modelo');
await p.click('#modoTexto'); await w(200); ok(/\| bi 2/.test(await p.inputValue('#t')), 'modo texto mostra o bi-set');
await p.click('#vis'); await w(200);
await p.click('#mtS'); await w(600); ok(!(await p.isVisible('#mt')), 'publicou e fechou');
const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 360, `não estoura a largura (${sw})`);
console.log('erros:', errs); await b.close(); if (errs.length || falhas.length) process.exit(1);
