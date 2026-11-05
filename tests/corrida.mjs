// Plano de corrida (estilo Runna): motor do plano e ritmos + telas da aluna (montar plano, plano da semana,
// treino guiado por blocos, registro, teste que recalcula o ritmo) em 375 e 360 px, e as telas em inglês sem texto faltando.
// Uso: OUT=/tmp/shots node tests/corrida.mjs
import { chromium } from 'playwright';
import path from 'path';
const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const errs = []; const ok = (c, m) => { console.log((c ? '  ok  ' : '  FALHOU ') + m); if (!c) errs.push(m); };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

async function abrir(vw, lingua = 'pt') {
  const ctx = await b.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: vw, height: 800 }, deviceScaleFactor: 2, serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname.replace(/\?.*$/, ''); return r.fulfill({ path: APP + f }); } return r.abort(); });
  p.on('pageerror', e => errs.push(vw + ' pageerror ' + e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push(vw + ' console ' + m.text()); });
  if (lingua !== 'pt') await p.addInitScript(l => { try { localStorage.setItem('idioma', l); } catch {} }, lingua);
  await p.goto('http://app.local/?demo'); await p.waitForTimeout(400); if (!(await p.$('#em'))) await p.click('.btn >> nth=0'); await p.waitForTimeout(300); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await p.waitForTimeout(900);
  return { ctx, p };
}
const larg = async (p, vw, n) => ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${vw} sem estouro de largura em ${n}`);

// 1) MOTOR ---------------------------------------------------------------------------------
{
  const { ctx, p } = await abrir(375);
  const r = await p.evaluate(async () => {
    const C = await import('./js/corrida.js'), v = C.vdotDe(5, 20 * 60), v30 = C.vdotDe(5, 30 * 60);
    const planos = [['5k', 2], ['5k', 3], ['10k', 3], ['10k', 4], ['21k', 3], ['21k', 4]].map(([m, d]) => C.gerarPlano({ meta: m, dias: d, vdot: v30 }));
    const comeco = C.gerarPlano({ meta: '5k', dias: 3, comeco: true });
    const curto = C.gerarPlano({ meta: '21k', dias: 3, semanas: 6, vdot: v30 });
    const longos = planos.map(P => Math.max(...P.semanas.flatMap(s => s.sessoes.filter(x => x.tipo === 'longao').map(x => x.min))));
    return {
      v, v30, prev10: C.previsao(v, 10), leve: C.ritmo(v30, 'leve'), limiar: C.ritmo(v30, 'limiar'),
      diasOk: planos.every(P => P.semanas.slice(0, -1).every(s => s.sessoes.length === P.dias)),
      ultimaProva: planos.every(P => P.semanas.at(-1).sessoes.at(-1).tipo === 'prova'),
      teste4: planos.filter(P => P.n >= 8).every(P => P.semanas[3].sessoes[0].tipo === 'teste'),
      longos, idsUnicos: planos.every(P => { const ids = P.semanas.flatMap(s => s.sessoes.map(x => x.id)); return new Set(ids).size === ids.length; }),
      comecoSem1: comeco.semanas[0].sessoes[0].nome, comecoNv: comeco.semanas[0].sessoes[0].nv, comecoN: comeco.n,
      degrau: comeco.semanas.every((s, i) => !i || s.sessoes[0].blocos.filter(b => b.zona === 'leve')[0].seg - comeco.semanas[i - 1].sessoes[0].blocos.filter(b => b.zona === 'leve')[0].seg <= 5 * 60),
      curtoN: curto.n, ruim: C.vdotDe(5, 60), lerT: [C.lerTempo('28:30'), C.lerTempo('1:58:00'), C.lerTempo('30')],
      nomePt: C.nomePt(comeco.semanas.at(-1).sessoes.at(-1)),
      kcal: C.kcalSessao({ peso_kg: 62, altura_m: 1.64, nascimento: '1994-03-01', sexo: 'F' }, planos[2].semanas[5].sessoes[0], v30, 10),
      kcalSem: C.kcalSessao({}, planos[2].semanas[5].sessoes[0], v30, 10)
    };
  });
  console.log(JSON.stringify(r));
  ok(Math.abs(r.v - 49.8) < 0.6, 'VDOT de 5 km em 20:00 ≈ 49,8 (tabela de Daniels)');
  ok(Math.abs(r.prev10 - 41.4 * 60) < 60, '10 km previsto ≈ 41:20 pra quem faz 5 km em 20:00');
  ok(r.leve[0] > r.limiar[1], 'ritmo leve mais lento que o limiar');
  ok(r.diasOk, 'cada semana tem os dias que ela escolheu');
  ok(r.ultimaProva, 'última sessão do plano é a prova');
  ok(r.teste4, 'teste de 3 km na semana 4');
  ok(r.longos[4] <= 120 && r.longos[4] >= 100 && r.longos[0] <= 50, 'longão: até 50 min no 5 km e 100–120 min na meia');
  ok(r.idsUnicos, 'sessões com id único');
  ok(r.comecoSem1 === 'Corre {a} min / caminha {b} min' && r.comecoNv.a === 1, 'do zero começa correndo 1 min / caminhando');
  ok(r.degrau, 'do zero sobe no máximo um degrau por semana');
  ok(r.curtoN === 6, 'prazo curto gera plano curto');
  ok(r.ruim === null, 'tempo impossível (5 km em 1 min) recusado');
  ok(r.lerT.join() === '1710,7080,1800', 'leitura de tempo 28:30, 1:58:00 e 30');
  ok(r.nomePt === 'Prova: 5 km', 'título em português pro histórico');
  ok(r.kcal > 200 && r.kcal < 600 && r.kcalSem === null, 'kcal pelo peso dela (sem peso: não mostra)');
  await ctx.close();
}

// 2) TELAS ---------------------------------------------------------------------------------
for (const vw of [375, 360]) {
  const { ctx, p } = await abrir(vw);
  ok(!!(await p.$('.hscroll [data-go="corrida"]')), `${vw} card Corrida no Início`);
  await p.click('[data-go="lib"]'); await p.waitForTimeout(500);
  ok(!!(await p.$('.grid2 [data-go="corrida"]')), `${vw} card Corrida em Programas`);
  await p.click('.grid2 [data-go="corrida"]'); await p.waitForTimeout(700);
  ok(await p.isVisible('#cGerar'), `${vw} abre a montagem do plano`); await larg(p, vw, 'montagem'); await p.screenshot({ path: `${D}/corrida-montar-${vw}.png`, fullPage: true });
  // tempo errado avisa e não monta
  await p.click('[data-k="meta"][data-v="10k"]'); await p.click('[data-k="dias"][data-v="3"]'); await p.fill('#cTempo', '0:40'); await p.click('#cGerar'); await p.waitForTimeout(300);
  ok(await p.isVisible('#cGerar'), `${vw} tempo absurdo não monta o plano`);
  // data da prova daqui a 10 semanas
  const prova = await p.evaluate(() => { const d = new Date(Date.now() + 70 * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await p.fill('#cTempo', '30:00'); await p.fill('#cProva', prova); await p.click('#cGerar'); await p.waitForTimeout(800);
  const txt = (await p.innerText('.view')).replace(/\s+/g, ' ');
  ok(/Semana 1 de 1[01]/i.test(txt), `${vw} plano até a prova (${txt.match(/Semana \d+ de \d+/i)?.[0]})`);
  ok(/Limiar .*\/km/.test(txt) && /Previsão|previsão/.test(txt), `${vw} mostra ritmos e previsão`);
  ok((await p.$$eval('.spin-lista [data-cs]', x => x.length)) === 3, `${vw} 3 treinos na semana`);
  await larg(p, vw, 'plano'); await p.screenshot({ path: `${D}/corrida-plano-${vw}.png`, fullPage: true });
  // treino guiado
  await p.click('.btn[data-cs]'); await p.waitForTimeout(700);
  ok(await p.isVisible('#cGo'), `${vw} abre o treino guiado`); await larg(p, vw, 'treino');
  await p.click('#cGo'); await p.waitForTimeout(1500);
  const z = await p.innerText('#cZona'), alvo = await p.innerText('#cAlvo'), t1 = await p.innerText('#cTot');
  ok(/Leve/i.test(z) && /\/km/.test(alvo), `${vw} bloco mostra a zona e o ritmo alvo (${z} · ${alvo})`);
  ok(t1 !== '0:00', `${vw} cronômetro andando (${t1})`);
  await p.screenshot({ path: `${D}/corrida-treino-${vw}.png` });
  // voltar do celular no meio pergunta (não perde o treino)
  await p.goBack(); await p.waitForTimeout(400);
  ok(await p.isVisible('#m'), `${vw} voltar no meio pergunta antes de sair`);
  await p.click('#m [data-o="0"]'); await p.waitForTimeout(300);
  // correu 70 s (relógio adiantado) e pula o resto → termina e registra como incompleto
  await p.evaluate(() => { const r = Date.now; Date.now = () => r() + 70000; });
  for (let k = 0; k < 40 && await p.$('#cGo'); k++) { await p.click('#cGo').catch(() => {}); await p.waitForTimeout(80); }
  await p.waitForTimeout(500);
  const fim = (await p.innerText('.view')).replace(/\s+/g, ' ');
  ok(/Boa, registrado/i.test(fim), `${vw} tela do fim (${fim.slice(0, 60)})`);
  await p.screenshot({ path: `${D}/corrida-fim-${vw}.png` });
  await p.waitForTimeout(2200); // a fila sincroniza em 1,5 s (no demo vai pro estado do demo)
  const reg = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('demo:state') || '{}'), f = JSON.parse(localStorage.getItem('demo:fila') || '[]'); return [...(st.sessoes || []).map(x => x.titulo + '|' + x.exercicios_feitos), ...f.map(x => x.s?.titulo + '|fila')].filter(x => /Corrida/.test(x)); });
  ok(reg.some(x => /^Corrida · Leve \+ acelerações\|(0|fila)$/.test(x)), `${vw} treino incompleto vai pro histórico sem pontuar (${reg.join(' | ')})`);
  // corrida inteira (sem pular): marca feito no plano
  await p.evaluate(() => { const k = Object.keys(localStorage).find(x => /corridaPlano/.test(x)); const c = JSON.parse(localStorage.getItem(k)); c.feitos = { 'c0-0': true }; localStorage.setItem(k, JSON.stringify(c)); });
  await p.click('[data-go="corrida"]'); await p.waitForTimeout(600);
  ok(/✓/.test(await p.innerText('.spin-lista')), `${vw} treino feito aparece com ✓ e o próximo avança`);
  // atualizar ritmo com tempo melhor → ritmos mais rápidos
  const antes = await p.innerText('.view');
  await p.click('#cRit'); await p.waitForTimeout(300); await p.click('#m [data-o="1"]'); await p.waitForTimeout(300); await p.fill('#cT', '27:00'); await p.click('#cOk'); await p.waitForTimeout(700);
  const depois = await p.innerText('.view');
  ok(antes !== depois && /Evoluiu/.test(await p.innerText('#toast').catch(() => '')), `${vw} tempo novo recalcula os ritmos`);
  // do zero (corre/caminha), sem tempo
  await p.click('text=Trocar meta / refazer plano'); await p.waitForTimeout(500);
  await p.click('[data-k="meta"][data-v="5k"]'); await p.click('[data-k="comeco"][data-v="1"]'); await p.waitForTimeout(200);
  ok(!(await p.$('#cTempo')), `${vw} do zero não pede tempo`);
  await p.click('#cGerar'); await p.waitForTimeout(700);
  const z2 = (await p.innerText('.view')).replace(/\s+/g, ' ');
  ok(/Corre 1 min \/ caminha 2 min/.test(z2) && /Semana 1 de 10/i.test(z2), `${vw} plano do zero com corre/caminha`);
  await larg(p, vw, 'plano do zero'); await p.screenshot({ path: `${D}/corrida-zero-${vw}.png`, fullPage: true });
  await ctx.close();
}

// 3) INGLÊS: nenhuma frase das telas de corrida sem tradução ---------------------------------
{
  const { ctx, p } = await abrir(360, 'en');
  await p.evaluate(() => location.hash = '#corrida'); await p.waitForTimeout(200);
  await p.click('[data-go="lib"]').catch(() => {}); await p.waitForTimeout(400); await p.click('.grid2 [data-go="corrida"]'); await p.waitForTimeout(700);
  await p.fill('#cTempo', '30:00'); await p.click('#cGerar'); await p.waitForTimeout(700);
  await p.click('.btn[data-cs]'); await p.waitForTimeout(500); await p.click('#cGo'); await p.waitForTimeout(400);
  const falta = await p.evaluate(() => [...(window.__i18nFaltando || [])]);
  ok(!falta.length, 'inglês sem texto faltando: ' + falta.join(' | '));
  await p.screenshot({ path: `${D}/corrida-en-360.png` }); await ctx.close();
}
console.log('\nerros:', errs); await b.close(); if (errs.length) process.exit(1);
