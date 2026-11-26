// Crítica "sem dó" de 25/11/2026: tela do exercício enxuta, sem interruptor "concluído", feedback com 5 opções,
// card sem story quando não pontua, 5 abas, Configurações fechada no Perfil, "Quero esse" nos prêmios.
// Rodar SEM a pré-carga _abre-detalhes.mjs: OUT=/tmp/shots node tests/ux-2511.mjs
import { chromium } from 'playwright';
import path from 'path'; const APP = process.env.APP || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); const D = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: Number(process.env.W) || 375, height: 812 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === 'app.local') { const f = u.pathname === '/' ? '/index.html' : u.pathname; return r.fulfill({ path: APP + f }); } return r.abort(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) errs.push(m); };
const w = (ms = 600) => p.waitForTimeout(ms); const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ');
const go = async (name, arg) => { await p.evaluate(([name, arg]) => { history.pushState({ name, arg }, '', '#' + name); dispatchEvent(new PopStateEvent('popstate', { state: { name, arg } })); }, [name, arg]); await w(800); };

await p.goto('http://app.local/?demo'); await w(800);
await p.click('text=ENTRAR'); await p.fill('#em', 'ana@demo.com'); await p.press('#pw', 'Enter'); await w(1500);
// Abas: 5, sem Pontos; nomes inteiros
const abas = await p.$$eval('.tabs .tab', bs => bs.map(x => x.dataset.go));
ok(abas.length === 5 && !abas.includes('pontos'), `5 abas sem Pontos (${abas.join(',')})`);
ok(!/···|…/.test(await txt('.tabs')), 'nome das abas inteiro');
// Início: um card do Igor por vez
const v = await txt('.view');
ok(!(/O Igor te respondeu/.test(v) && /Recado do Igor/.test(v)), 'Início: resposta e recado do Igor não aparecem juntos');
ok(!!(await p.$('.home-atalhos .home-ia')) && !!(await p.$('.home-atalhos .home-time')), 'Tira-dúvidas e O time lado a lado');
await p.screenshot({ path: `${D}/ux-home.png`, fullPage: true });

// Treino A: tela do exercício
await go('treino'); await p.click('[data-go="treino"][data-arg="A"]'); await w(500); await p.click('#ini'); await w(900);
ok(!(await p.$('#sw')), 'sem o interruptor "Exercício concluído?"');
await p.click('.rest.tm'); await w(700); await p.click('#rest-skip'); await w(500); if (await p.$('#q-s')) { await p.click('#q-s'); await w(600); }
// bi-set A1/A2: opções escondidas no "⋯"
const det = await p.$('details.mais.opc');
ok(!!det && !(await det.evaluate(d => d.open)), '"⋯ Mais opções" existe e começa fechado');
ok(!(await p.isVisible('.ocup')), 'Aparelho ocupado escondido dentro do "⋯"');
ok(await p.isVisible('[data-vid]') && await p.isVisible('[data-dor]'), 'Execução e Senti dor continuam à vista');
await p.click('details.mais.opc > summary'); await w(300); ok(await p.isVisible('.ocup') && await p.isVisible('[data-mais]'), 'abrindo o "⋯": aparelho ocupado e + série');
ok(/Bi-set: faz uma série/.test(await txt('.view')), 'explicação do bi-set aparece na 1ª vez');
// aviso da sessão não fica em cima do "1 de 7"
await p.evaluate(() => window.scrollTo(0, 0)); await w(200); await p.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = 'Mobilidade ✓'; t.className = 'toast on topo sess'; });
const [tb, info] = await Promise.all([p.$eval('#toast', e => e.getBoundingClientRect().bottom), p.$eval('.sess-info', e => e.getBoundingClientRect().top)]);
ok(tb <= info + 1, `aviso termina antes da linha "x de 7" (${Math.round(tb)} ≤ ${Math.round(info)})`);
await p.evaluate(() => document.querySelector('#toast').classList.remove('on'));
// marca uma série do A1 e vai pro A2; "Próximo exercício" pergunta se esqueceu de marcar
await p.fill('.set[data-k="0"] input[data-f="kg"] >> nth=0', '20'); await p.click('.set[data-k="0"] .rest >> nth=0'); await w(800);
if (await p.$('#rest:not(.mini) #rest-x')) { await p.click('#rest-x'); await w(300); }
ok(/Próximo exercício/i.test(await txt('#pular')), 'fez parte: botão vira "Próximo exercício"');
await p.click('#pular'); await w(600); ok(/Falta marcar/i.test(await txt('#overlay')), '"Próximo" pergunta das séries que faltam');
await p.click('#m [data-o="1"]'); await w(700);
// 3º bi-set em diante: sem a explicação (já viu 2)
await p.evaluate(() => localStorage.setItem('demo:dicaBi', '2')); await go('sessao');
ok(/Bi-set: faz uma série/.test(await txt('.view')) === false || await p.evaluate(() => JSON.parse(localStorage.getItem('demo:sessao') || '{}').dicaBiP != null), 'explicação do bi-set não volta depois de 2');
await p.screenshot({ path: `${D}/ux-sessao.png`, fullPage: true });

// Parar cedo: feedback com 5 opções, card sem story
await p.click('#fim'); await w(500); if (await p.$('#enc')) { await p.click('#enc'); await w(600); }
ok((await p.$$('#esf button')).length === 5 && (await p.$$('#nota button')).length === 5, 'feedback: 5 opções de esforço e 5 de nota');
await p.click('#env'); await w(300); ok(await p.isVisible('#e'), 'sem marcar: pede o esforço e a nota');
await p.click('#esf button >> nth=3'); await p.click('#nota button >> nth=4'); await p.screenshot({ path: `${D}/ux-feedback.png`, fullPage: true });
await p.click('#env'); await w(1200);
const ses = await p.evaluate(() => JSON.parse(localStorage.getItem('demo:state') || '{}').sessoes || []);
const ult = ses.filter(x => x.titulo === 'Treino A').sort((a, b) => String(b.finalizada_em).localeCompare(String(a.finalizada_em)))[0];
ok(ult?.esforco === 8 && ult?.nota === 10, `grava esforço 8 e nota 10 (${ult?.esforco}/${ult?.nota})`);
ok(!(await p.$('#share')) && !(await p.$('#shareFoto')) && /Voltar pro início/i.test(await txt('.view')), 'treino que não pontua: sem story, com "Voltar pro início"');
await p.screenshot({ path: `${D}/ux-card.png`, fullPage: true });

// Evolução leva pros pontos; pontos volta pra Evolução e tem "Quero esse"
await go('evolucao'); ok(!!(await p.$('.topbar [data-go="pontos"]')), 'Evolução tem o atalho dos pontos');
await p.click('.topbar [data-go="pontos"]'); await w(900);
ok(await p.$eval('.tabs .tab.on', e => e.dataset.go) === 'evolucao', 'em Pontos a aba Evolução fica acesa');
const q = await p.$$('.premio-quero'); ok(q.length >= 1 && /Strap/.test(decodeURIComponent(await q[0].getAttribute('href'))), `"Quero esse" com o nome do prêmio (${q.length})`);
// Perfil: Configurações fechada; abre e continua aberta depois de mudar a letra
await go('perfil'); ok(!(await p.$eval('#cfg', d => d.open)) && !(await p.isVisible('#out')), 'Perfil: Configurações começa fechada');
await p.click('#cfg > summary'); await w(300); await p.click('[data-letra="g"]'); await w(900);
ok(await p.$eval('#cfg', d => d.open), 'mudar a letra não fecha as Configurações'); await p.click('[data-letra=""]'); await w(600);
// Vídeos: sem "0 com vídeo do Igor"
await go('videos'); ok(!/0 com vídeo do Igor/.test(await txt('.view')), 'Vídeos sem "0 com vídeo do Igor"');
console.log('erros:', errs); await b.close(); if (errs.length) process.exit(1);
